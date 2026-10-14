require("dotenv").config();
const crypto = require("crypto");
const mongoose = require("mongoose");
const http = require("http");
const express = require("express");
const cookieParser = require("cookie-parser");
const Customer = require("./models/customer.model");
const Product = require("./models/product.model");
const Order = require("./models/order.model");
const customerRoutes = require("./routes/customer.routes");
const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/order.routes");

async function runOrderTests() {
  console.log("==================================================");
  console.log("=== Testing ShopKart Lab 06 - Orders & Payments ===");
  console.log("==================================================");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ Connected to MongoDB");

  // Setup test express server on port 5003
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/customers", customerRoutes);
  app.use("/cart", cartRoutes);
  app.use("/orders", orderRoutes);

  const server = http.createServer(app);
  await new Promise((res) => server.listen(5003, res));
  console.log("✓ Test server running on port 5003");

  const baseUrl = "http://localhost:5003";

  try {
    // 1. Create a primary test product with stock
    const testProduct = await Product.create({
      name: "Test Mechanical Keyboard " + Date.now(),
      description: "Tactile RGB switch keyboard for testing",
      price: 2999,
      category: "Electronics",
      image: "https://example.com/keyboard.jpg",
      stock: 5
    });
    console.log(`✓ Created test product: ${testProduct.name} (stock: 5, price: ₹2999)`);

    // 2. Create User 1
    const user1Email = `order_user1_${Date.now()}@example.com`;
    const regRes1 = await fetch(`${baseUrl}/customers/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Aarav Sharma",
        email: user1Email,
        password: "password123",
        phone: "9876543210"
      })
    });
    const regData1 = await regRes1.json();
    if (!regData1.success) throw new Error("User 1 registration failed");

    const loginRes1 = await fetch(`${baseUrl}/customers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user1Email,
        password: "password123"
      })
    });
    const cookieHeader1 = loginRes1.headers.get("set-cookie");
    const tokenMatch1 = cookieHeader1 && cookieHeader1.match(/token=([^;]+)/);
    const token1 = tokenMatch1 ? tokenMatch1[1] : null;
    const authHeaders1 = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token1}`
    };
    console.log("✓ User 1 authenticated");

    // TEST 1 — Empty cart checkout
    console.log("\n[Test 1] POST /orders with empty cart...");
    const emptyOrderRes = await fetch(`${baseUrl}/orders/create-payment-order`, {
      method: "POST",
      headers: authHeaders1,
      body: JSON.stringify({
        shippingAddress: {
          fullName: "Aarav Sharma",
          phone: "9876543210",
          addressLine1: "22 MG Road",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001"
        }
      })
    });
    const emptyOrderData = await emptyOrderRes.json();
    if (emptyOrderRes.status === 400 && !emptyOrderData.success) {
      console.log("✓ PASS: Empty cart rejected with 400 Bad Request");
    } else {
      throw new Error(`Expected 400 on empty cart, got ${emptyOrderRes.status}`);
    }

    // Add item to cart for User 1 (quantity = 2)
    await fetch(`${baseUrl}/cart/${testProduct._id}`, {
      method: "POST",
      headers: authHeaders1
    });
    await fetch(`${baseUrl}/cart/${testProduct._id}`, {
      method: "POST",
      headers: authHeaders1
    });
    console.log("✓ Added 2 units of test product to User 1 cart");

    // TEST 8 — Fake total sent from frontend is ignored
    console.log("\n[Test 8] Send fake total amount from frontend...");
    const createOrderRes = await fetch(`${baseUrl}/orders/create-payment-order`, {
      method: "POST",
      headers: authHeaders1,
      body: JSON.stringify({
        totalAmount: 1, // Fake total! Must be ignored
        shippingAddress: {
          fullName: "Aarav Sharma",
          phone: "9876543210",
          addressLine1: "22 MG Road",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001"
        }
      })
    });
    const createOrderData = await createOrderRes.json();
    if (!createOrderData.success) {
      throw new Error("Create payment order failed: " + JSON.stringify(createOrderData));
    }
    // Expected total: 2999 * 2 = 5998 -> in paise: 599800
    if (createOrderData.amount !== 599800) {
      throw new Error(`Expected server total 599800 paise, got ${createOrderData.amount}`);
    }
    console.log("✓ PASS: Server correctly ignored frontend fake total and calculated 599800 paise");

    // TEST 2 — Payment order creation fields
    console.log("\n[Test 2] Verify ShopKart and Razorpay order response fields...");
    if (
      createOrderData.shopKartOrderId &&
      createOrderData.razorpayOrderId &&
      createOrderData.currency === "INR"
    ) {
      console.log(`✓ PASS: Order created (ShopKart: ${createOrderData.shopKartOrderId}, Razorpay: ${createOrderData.razorpayOrderId})`);
    } else {
      throw new Error("Missing required order creation fields");
    }

    // TEST 3 — Cart before payment verification should still be intact
    console.log("\n[Test 3] Check cart before payment verification...");
    const cartBeforeRes = await fetch(`${baseUrl}/cart`, {
      method: "GET",
      headers: authHeaders1
    });
    const cartBeforeData = await cartBeforeRes.json();
    if (cartBeforeData.cart && cartBeforeData.cart.length > 0) {
      console.log("✓ PASS: Cart is still populated before payment verification");
    } else {
      throw new Error("Cart was prematurely cleared before payment verification!");
    }

    // TEST: Invalid payment signature verification
    console.log("\n[Test B / Security] Verify invalid payment signature...");
    const badVerifyRes = await fetch(`${baseUrl}/orders/verify-payment`, {
      method: "POST",
      headers: authHeaders1,
      body: JSON.stringify({
        shopKartOrderId: createOrderData.shopKartOrderId,
        razorpay_order_id: createOrderData.razorpayOrderId,
        razorpay_payment_id: "pay_test_bad_123",
        razorpay_signature: "invalid_fake_signature"
      })
    });
    const badVerifyData = await badVerifyRes.json();
    if (badVerifyRes.status === 400 && !badVerifyData.success) {
      console.log("✓ PASS: Invalid signature rejected with 400 Bad Request");
    } else {
      throw new Error("Invalid signature was not rejected!");
    }

    // Verify cart still not cleared after failed payment
    const cartStillThereRes = await fetch(`${baseUrl}/cart`, {
      method: "GET",
      headers: authHeaders1
    });
    const cartStillThereData = await cartStillThereRes.json();
    if (!cartStillThereData.cart || cartStillThereData.cart.length === 0) {
      throw new Error("Cart was cleared on payment failure!");
    }
    console.log("✓ PASS: Cart preserved on payment failure");

    // TEST 4 — Valid payment verification
    console.log("\n[Test 4] Verify valid payment signature...");
    const paymentId = "pay_test_" + Date.now();
    const secret = process.env.RAZORPAY_KEY_SECRET || "placeholder_secret";
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${createOrderData.razorpayOrderId}|${paymentId}`)
      .digest("hex");

    const goodVerifyRes = await fetch(`${baseUrl}/orders/verify-payment`, {
      method: "POST",
      headers: authHeaders1,
      body: JSON.stringify({
        shopKartOrderId: createOrderData.shopKartOrderId,
        razorpay_order_id: createOrderData.razorpayOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: expectedSig
      })
    });
    const goodVerifyData = await goodVerifyRes.json();
    if (
      goodVerifyRes.status === 200 &&
      goodVerifyData.success &&
      goodVerifyData.order.paymentStatus === "PAID" &&
      goodVerifyData.order.status === "PLACED"
    ) {
      console.log("✓ PASS: Payment verified, order marked PAID and PLACED");
    } else {
      throw new Error("Valid payment verification failed: " + JSON.stringify(goodVerifyData));
    }

    // TEST 5 — Confirm cart is cleared after verified payment
    console.log("\n[Test 5] Verify cart is now empty after payment...");
    const cartAfterRes = await fetch(`${baseUrl}/cart`, {
      method: "GET",
      headers: authHeaders1
    });
    const cartAfterData = await cartAfterRes.json();
    if (cartAfterData.cart && cartAfterData.cart.length === 0) {
      console.log("✓ PASS: User cart is now empty (0 items)");
    } else {
      throw new Error("Cart was NOT cleared after successful payment!");
    }

    // TEST 6 — Get My Orders
    console.log("\n[Test 6] GET /orders returns confirmed order...");
    const getOrdersRes = await fetch(`${baseUrl}/orders`, {
      method: "GET",
      headers: authHeaders1
    });
    const getOrdersData = await getOrdersRes.json();
    if (
      getOrdersData.success &&
      Array.isArray(getOrdersData.orders) &&
      getOrdersData.orders.length > 0 &&
      getOrdersData.orders[0]._id === createOrderData.shopKartOrderId
    ) {
      console.log(`✓ PASS: GET /orders returned ${getOrdersData.orders.length} order(s) for User 1`);
    } else {
      throw new Error("GET /orders failed or did not return newly created order");
    }

    // TEST 9 — Unauthenticated request
    console.log("\n[Test 9] Test unauthenticated access to /orders...");
    const unauthRes = await fetch(`${baseUrl}/orders`, {
      method: "GET"
    });
    if (unauthRes.status === 401) {
      console.log("✓ PASS: Unauthenticated request rejected with 401 Unauthorized");
    } else {
      throw new Error(`Expected 401, got ${unauthRes.status}`);
    }

    // TEST 10 — Access another user's order
    console.log("\n[Test 10] Access another user's order from User 2...");
    const user2Email = `order_user2_${Date.now()}@example.com`;
    await fetch(`${baseUrl}/customers/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Pooja Patel",
        email: user2Email,
        password: "password123",
        phone: "9123456780"
      })
    });
    const loginRes2 = await fetch(`${baseUrl}/customers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user2Email,
        password: "password123"
      })
    });
    const cookieHeader2 = loginRes2.headers.get("set-cookie");
    const tokenMatch2 = cookieHeader2 && cookieHeader2.match(/token=([^;]+)/);
    const token2 = tokenMatch2 ? tokenMatch2[1] : null;

    const crossUserRes = await fetch(`${baseUrl}/orders/${createOrderData.shopKartOrderId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token2}`
      }
    });
    if (crossUserRes.status === 403 || crossUserRes.status === 404) {
      console.log(`✓ PASS: Forbidden access rejected with ${crossUserRes.status}`);
    } else {
      throw new Error(`Expected 403/404 for cross-user order access, got ${crossUserRes.status}`);
    }

    // TEST 7 — Insufficient stock validation
    console.log("\n[Test 7] Insufficient stock check during checkout...");
    // Create product with only 1 in stock
    const lowStockProduct = await Product.create({
      name: "Low Stock Item " + Date.now(),
      description: "Only 1 in stock",
      price: 999,
      category: "Books",
      image: "https://example.com/book.jpg",
      stock: 1
    });
    // Add to cart with quantity = 1
    await fetch(`${baseUrl}/cart/${lowStockProduct._id}`, {
      method: "POST",
      headers: authHeaders1
    });
    // Now artificially drop product stock to 0
    await Product.findByIdAndUpdate(lowStockProduct._id, { stock: 0 });

    const stockCheckRes = await fetch(`${baseUrl}/orders/create-payment-order`, {
      method: "POST",
      headers: authHeaders1,
      body: JSON.stringify({
        shippingAddress: {
          fullName: "Aarav Sharma",
          phone: "9876543210",
          addressLine1: "22 MG Road",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001"
        }
      })
    });
    const stockCheckData = await stockCheckRes.json();
    if (stockCheckRes.status === 400 && !stockCheckData.success && stockCheckData.message.includes("stock")) {
      console.log("✓ PASS: Insufficient stock correctly rejected with 400:", stockCheckData.message);
    } else {
      throw new Error(`Expected 400 with insufficient stock error, got ${stockCheckRes.status}: ${JSON.stringify(stockCheckData)}`);
    }

    // Cleanup test products
    await Product.findByIdAndDelete(testProduct._id);
    await Product.findByIdAndDelete(lowStockProduct._id);
    await Customer.deleteOne({ email: user1Email });
    await Customer.deleteOne({ email: user2Email });
    await Order.findByIdAndDelete(createOrderData.shopKartOrderId);

    console.log("\n==================================================");
    console.log("🎉 ALL BACKEND TESTS PASSED SUCCESSFULLY! (100%)");
    console.log("==================================================");
  } catch (error) {
    console.error("\n❌ Test Failed:", error.message);
    process.exitCode = 1;
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runOrderTests();
