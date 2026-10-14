const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  toggleWishlist,
  getWishlistCount
} = require("../controllers/wishlist.controller");

const router = express.Router();

// All wishlist routes are protected by authMiddleware
router.use(authMiddleware);

// Bonus: Get wishlist items count
router.get("/count", getWishlistCount);

// Core: Get current user's wishlist
router.get("/", getWishlist);

// Core: Add product to wishlist
router.post("/:productId", addToWishlist);

// Core: Remove product from wishlist
router.delete("/:productId", removeFromWishlist);

// Bonus: Toggle product in wishlist
router.patch("/:productId/toggle", toggleWishlist);

module.exports = router;
