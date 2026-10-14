const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");
const razorpay = require("../config/razorpay");

/**
 * Validate shipping address input
 */
const validateShippingAddress = (shippingAddress) => {
  if (!shippingAddress || typeof shippingAddress !== "object") {
    return "Shipping address is required";
  }

  const { fullName, phone, addressLine1, city, state, pincode } = shippingAddress;

  if (!fullName || !fullName.trim()) return "Full Name is required";
  if (!phone || !phone.trim()) return "Phone number is required";

  // Clean phone string (remove hyphens and spaces) and validate 10 digits
  const cleanPhone = phone.trim().replace(/[-\s]/g, "");
  if (!/^[0-9]{10}$/.test(cleanPhone)) {
    return "Phone number must be a valid 10-digit number";
  }

  if (!addressLine1 || !addressLine1.trim()) return "Address line is required";
  if (!city || !city.trim()) return "City is required";
  if (!state || !state.trim()) return "State is required";
  if (!pincode || !pincode.trim()) return "Pincode is required";

  const cleanPincode = pincode.trim();
  if (!/^[0-9]{6}$/.test(cleanPincode)) {
    return "Pincode must contain 6 digits";
  }

  return null;
};

/**
 * POST /orders/create-payment-order (and POST /orders)
 * Validates cart, stock, prices; creates ShopKart Order (PENDING_PAYMENT) & Razorpay Order
 */
const createPaymentOrder = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Rule: Cart cannot be empty
    if (!customer.cart || customer.cart.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty"
      });
    }

    // Validate shipping address
    const addressError = validateShippingAddress(req.body.shippingAddress);
    if (addressError) {
      return res.status(400).json({
        success: false,
        message: addressError
      });
    }

    const { shippingAddress } = req.body;

    // Load latest product data and verify stock
    const orderItems = [];
    for (const cartItem of customer.cart) {
      const product = await Product.findById(cartItem.product);

      // Rule: Product deleted or unavailable
      if (!product) {
        return res.status(400).json({
          success: false,
          message: "One or more products in your cart are no longer available in the catalog"
        });
      }

      // Rule: Stock verification
      if (product.stock < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. (${product.stock} available).`
        });
      }

      // Build purchase-time snapshot
      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: cartItem.quantity,
        image: product.image
      });
    }

    // Server-side total calculation (NEVER trust frontend total)
    const totalAmount = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Create pending ShopKart order
    const shopKartOrder = new Order({
      user: customer._id,
      items: orderItems,
      shippingAddress: {
        fullName: shippingAddress.fullName.trim(),
        phone: shippingAddress.phone.trim().replace(/[-\s]/g, ""),
        addressLine1: shippingAddress.addressLine1.trim(),
        city: shippingAddress.city.trim(),
        state: shippingAddress.state.trim(),
        pincode: shippingAddress.pincode.trim()
      },
      totalAmount,
      paymentStatus: "PENDING",
      status: "PENDING_PAYMENT"
    });

    await shopKartOrder.save();

    // Create Razorpay Order in paise
    const amountInPaise = Math.round(totalAmount * 100);

    let razorpayOrder;
    try {
      if (
        !process.env.RAZORPAY_KEY_ID ||
        process.env.RAZORPAY_KEY_ID === "rzp_test_placeholder" ||
        process.env.RAZORPAY_KEY_SECRET === "placeholder_secret"
      ) {
        // Simulated test order if keys are still placeholder
        razorpayOrder = {
          id: "order_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7)
        };
      } else {
        razorpayOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: "INR",
          receipt: shopKartOrder._id.toString()
        });
      }
    } catch (rzpError) {
      console.error("Razorpay order creation failed:", rzpError);
      return res.status(500).json({
        success: false,
        message:
          rzpError.error?.description ||
          rzpError.message ||
          "Payment gateway service error while creating order"
      });
    }

    // Save razorpayOrderId in order document
    shopKartOrder.razorpayOrderId = razorpayOrder.id;
    await shopKartOrder.save();

    // Return safe checkout data (Notice: Secret is NEVER sent)
    return res.status(201).json({
      success: true,
      shopKartOrderId: shopKartOrder._id,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID || ""
    });
  } catch (error) {
    console.error("Error creating payment order:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while creating payment order"
    });
  }
};

/**
 * POST /orders/verify-payment
 * Verifies Razorpay HMAC SHA256 signature, marks order PAID and PLACED, clears cart
 */
const verifyPayment = async (req, res) => {
  try {
    const {
      shopKartOrderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!shopKartOrderId || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are incomplete"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(shopKartOrderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID"
      });
    }

    const order = await Order.findById(shopKartOrderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Verify ownership
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to access this order"
      });
    }

    // HMAC SHA256 Signature Verification
    // Use the database's trusted razorpayOrderId
    const trustedRazorpayOrderId = order.razorpayOrderId || razorpay_order_id;
    const body = `${trustedRazorpayOrderId}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(body)
      .digest("hex");

    const isPlaceholderMode =
      (!process.env.RAZORPAY_KEY_SECRET ||
        process.env.RAZORPAY_KEY_SECRET === "placeholder_secret") &&
      razorpay_signature === "simulated_test_signature";

    if (expectedSignature !== razorpay_signature && !isPlaceholderMode) {
      order.paymentStatus = "FAILED";
      await order.save();
      // Cart is NOT cleared on failure!
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature"
      });
    }

    // Payment Signature Verified Successfully!
    order.paymentStatus = "PAID";
    order.status = "PLACED";
    order.razorpayPaymentId = razorpay_payment_id;
    await order.save();

    // Deduct stock for each purchased item
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }

    // Clear user cart in database
    const customer = await Customer.findById(req.user._id);
    if (customer) {
      customer.cart = [];
      await customer.save();
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified and order placed successfully",
      order
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while verifying payment"
    });
  }
};

/**
 * GET /orders
 * Returns all orders belonging to authenticated user, sorted newest first
 */
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({
      createdAt: -1
    });

    return res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while fetching orders"
    });
  }
};

/**
 * GET /orders/:id
 * Returns a single order by ID for the authenticated owner
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID"
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Verify ownership: prevent accessing another user's order
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to view this order"
      });
    }

    return res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while fetching order"
    });
  }
};

/**
 * PATCH /orders/:id/status
 * Bonus challenge: Update order progression status
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "PENDING_PAYMENT",
      "PLACED",
      "CONFIRMED",
      "SHIPPED",
      "DELIVERED"
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID"
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Enforce ownership
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Cannot update this order"
      });
    }

    order.status = status;
    await order.save();

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating order status"
    });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  getMyOrders,
  getOrderById,
  updateOrderStatus
};
