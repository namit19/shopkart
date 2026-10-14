const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const {
  createPaymentOrder,
  verifyPayment,
  getMyOrders,
  getOrderById,
  updateOrderStatus
} = require("../controllers/order.controller");

const router = express.Router();

// All order endpoints require authentication
router.use(authMiddleware);

// POST /orders/create-payment-order (and POST /orders fallback)
router.post("/create-payment-order", createPaymentOrder);
router.post("/", createPaymentOrder);

// POST /orders/verify-payment
router.post("/verify-payment", verifyPayment);

// GET /orders
router.get("/", getMyOrders);

// GET /orders/:id
router.get("/:id", getOrderById);

// PATCH /orders/:id/status (Bonus challenge)
router.patch("/:id/status", updateOrderStatus);

module.exports = router;
