const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const {
  addToCart,
  getCart,
  updateCartItemQuantity,
  removeFromCart
} = require("../controllers/cart.controller");

const router = express.Router();

// All cart routes require authentication
router.use(authMiddleware);

// GET /cart - Get authenticated user's cart
router.get("/", getCart);

// POST /cart/:productId - Add product to cart / increment quantity
router.post("/:productId", addToCart);

// PATCH /cart/:productId - Update product quantity in cart
router.patch("/:productId", updateCartItemQuantity);

// DELETE /cart/:productId - Remove product from cart
router.delete("/:productId", removeFromCart);

module.exports = router;
