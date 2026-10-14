require("dotenv").config();
const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("./models/order.model");
const Customer = require("./models/customer.model");
const Product = require("./models/product.model");
const {
  createPaymentOrder,
  verifyPayment,
  getMyOrders,
  getOrderById,
  updateOrderStatus
} = require("./controllers/order.controller");

// Helper to create mock Express req & res
function createMockReqRes({ user, body = {}, params = {} }) {
  const req = {
    user: user || { _id: new mongoose.Types.ObjectId() },
    body,
    params
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      responseData = data;
      return res;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData
  };

  return { req, res };
}

async function runUnitTests() {
  console.log("==================================================");
  console.log("=== ShopKart Lab 06 - Controller Unit Tests ===");
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (!condition) {
      throw new Error(`FAIL: ${message}`);
    }
    console.log(`✓ PASS: ${message}`);
    passed++;
  }

  const userId = new mongoose.Types.ObjectId();
  const prodId = new mongoose.Types.ObjectId();

  // Test 1: Empty cart rejection
  {
    Customer.findById = () => ({
      _id: userId,
      cart: []
    });

    const { req, res } = createMockReqRes({
      user: { _id: userId },
      body: {
        shippingAddress: {
          fullName: "Aarav Sharma",
          phone: "9876543210",
          addressLine1: "22 MG Road",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001"
        }
      }
    });

    await createPaymentOrder(req, res);
    assert(
      res.getStatusCode() === 400 && res.getData().message === "Cart is empty",
      "Test 1 - Empty cart returns 400 Bad Request"
    );
  }

  // Test 2: Validation of shipping address (bad phone, bad pincode)
  {
    Customer.findById = () => ({
      _id: userId,
      cart: [{ product: prodId, quantity: 1 }]
    });

    const { req, res } = createMockReqRes({
      user: { _id: userId },
      body: {
        shippingAddress: {
          fullName: "Aarav",
          phone: "123", // invalid phone
          addressLine1: "Road",
          city: "City",
          state: "State",
          pincode: "123456"
        }
      }
    });

    await createPaymentOrder(req, res);
    assert(
      res.getStatusCode() === 400 && res.getData().message.includes("10-digit"),
      "Test 2a - Invalid phone format rejected with 400"
    );

    // Invalid pincode
    const { req: req2, res: res2 } = createMockReqRes({
      user: { _id: userId },
      body: {
        shippingAddress: {
          fullName: "Aarav",
          phone: "9876543210",
          addressLine1: "Road",
          city: "City",
          state: "State",
          pincode: "123" // not 6 digits
        }
      }
    });

    await createPaymentOrder(req2, res2);
    assert(
      res2.getStatusCode() === 400 && res2.getData().message.includes("6 digits"),
      "Test 2b - Invalid pincode format rejected with 400"
    );
  }

  // Test 3: Insufficient stock validation
  {
    Customer.findById = () => ({
      _id: userId,
      cart: [{ product: prodId, quantity: 5 }]
    });

    Product.findById = () => ({
      _id: prodId,
      name: "Mechanical Keyboard",
      price: 2999,
      stock: 2 // stock 2 < quantity 5
    });

    const { req, res } = createMockReqRes({
      user: { _id: userId },
      body: {
        shippingAddress: {
          fullName: "Aarav Sharma",
          phone: "9876543210",
          addressLine1: "22 MG Road",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001"
        }
      }
    });

    await createPaymentOrder(req, res);
    assert(
      res.getStatusCode() === 400 && res.getData().message.includes("Insufficient stock"),
      "Test 3 - Stock validation fails when requested quantity exceeds available stock"
    );
  }

  // Test 4: Server total calculation ignores fake frontend total
  {
    Customer.findById = () => ({
      _id: userId,
      cart: [{ product: prodId, quantity: 2 }]
    });

    Product.findById = () => ({
      _id: prodId,
      name: "Mechanical Keyboard",
      price: 2999,
      image: "https://example.com/keyboard.jpg",
      stock: 10
    });

    let savedOrderData = null;
    Order.prototype.save = function () {
      savedOrderData = this;
      this._id = new mongoose.Types.ObjectId("66d123abc456001000000001");
      return Promise.resolve(this);
    };

    const { req, res } = createMockReqRes({
      user: { _id: userId },
      body: {
        totalAmount: 1, // Fake total! Must be ignored
        shippingAddress: {
          fullName: "Aarav Sharma",
          phone: "9876543210",
          addressLine1: "22 MG Road",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001"
        }
      }
    });

    await createPaymentOrder(req, res);
    assert(res.getStatusCode() === 201, "Test 4a - Order created with 201 Created");
    assert(
      savedOrderData.totalAmount === 5998,
      "Test 4b - Server calculated true total: ₹2999 * 2 = ₹5998 (ignored fake total ₹1)"
    );
    assert(
      res.getData().amount === 599800,
      "Test 4c - Razorpay amount converted to paise: 599800"
    );
    assert(
      savedOrderData.status === "PENDING_PAYMENT" && savedOrderData.paymentStatus === "PENDING",
      "Test 4d - Order initially saved in PENDING_PAYMENT status"
    );
  }

  // Test 5: Verify payment signature
  {
    const orderDoc = {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      razorpayOrderId: "order_test_12345",
      items: [{ product: prodId, quantity: 2 }],
      paymentStatus: "PENDING",
      status: "PENDING_PAYMENT",
      save: function () {
        return Promise.resolve(this);
      }
    };

    Order.findById = () => orderDoc;
    Product.findByIdAndUpdate = () => Promise.resolve();
    let cartCleared = false;
    Customer.findById = () => ({
      _id: userId,
      cart: [{ product: prodId, quantity: 2 }],
      save: function () {
        if (this.cart.length === 0) cartCleared = true;
        return Promise.resolve(this);
      }
    });

    // Subtest: Fake signature fails
    {
      const { req, res } = createMockReqRes({
        user: { _id: userId },
        body: {
          shopKartOrderId: orderDoc._id.toString(),
          razorpay_order_id: "order_test_12345",
          razorpay_payment_id: "pay_test_001",
          razorpay_signature: "wrong_fake_signature"
        }
      });

      await verifyPayment(req, res);
      assert(
        res.getStatusCode() === 400 && res.getData().message === "Invalid payment signature",
        "Test 5a - Fake payment signature rejected with 400 Invalid payment signature"
      );
      assert(
        orderDoc.paymentStatus !== "PAID" && !cartCleared,
        "Test 5b - Order NOT marked PAID and Cart NOT cleared on signature failure"
      );
    }

    // Subtest: Valid HMAC signature succeeds
    {
      const paymentId = "pay_test_001";
      const secret = process.env.RAZORPAY_KEY_SECRET || "placeholder_secret";
      const validSig = crypto
        .createHmac("sha256", secret)
        .update(`order_test_12345|${paymentId}`)
        .digest("hex");

      const { req, res } = createMockReqRes({
        user: { _id: userId },
        body: {
          shopKartOrderId: orderDoc._id.toString(),
          razorpay_order_id: "order_test_12345",
          razorpay_payment_id: paymentId,
          razorpay_signature: validSig
        }
      });

      await verifyPayment(req, res);
      assert(res.getStatusCode() === 200, "Test 5c - Valid signature returns 200 OK");
      assert(
        orderDoc.paymentStatus === "PAID" && orderDoc.status === "PLACED",
        "Test 5d - Order marked PAID and PLACED upon signature verification"
      );
      assert(cartCleared === true, "Test 5e - User cart cleared in database after payment verified");
    }
  }

  // Test 6: Cross-user authorization guard
  {
    const otherUserId = new mongoose.Types.ObjectId();
    const otherUserOrder = {
      _id: new mongoose.Types.ObjectId(),
      user: otherUserId, // Owned by other user
      items: []
    };

    Order.findById = () => otherUserOrder;

    const { req, res } = createMockReqRes({
      user: { _id: userId }, // Requesting as user 1
      params: { id: otherUserOrder._id.toString() }
    });

    await getOrderById(req, res);
    assert(
      res.getStatusCode() === 403,
      "Test 6 - Accessing another user's order rejected with 403 Forbidden"
    );
  }

  // Test 7: Bonus challenge - Order status progression
  {
    const myOrder = {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      status: "PLACED",
      save: function () {
        return Promise.resolve(this);
      }
    };

    Order.findById = () => myOrder;

    const { req, res } = createMockReqRes({
      user: { _id: userId },
      params: { id: myOrder._id.toString() },
      body: { status: "SHIPPED" }
    });

    await updateOrderStatus(req, res);
    assert(
      res.getStatusCode() === 200 && myOrder.status === "SHIPPED",
      "Test 7 - Order status successfully advanced to SHIPPED"
    );
  }

  console.log("==================================================");
  console.log(`🎉 ALL ${passed}/${total} UNIT TESTS PASSED! (100%)`);
  console.log("==================================================");
}

runUnitTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
