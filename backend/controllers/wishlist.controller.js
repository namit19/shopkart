const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");

// POST /wishlist/:productId - Add a product to the user's wishlist
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    // Check if the product exists in the catalog
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Find the authenticated customer
    const user = await Customer.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Ensure wishlist array exists
    if (!user.wishlist) {
      user.wishlist = [];
    }

    // Check for duplicate entry (Task 2 & Edge Cases)
    const isAlreadyWishlisted = user.wishlist.some(
      (id) => id.toString() === productId
    );

    if (isAlreadyWishlisted) {
      return res.status(409).json({
        success: false,
        message: "Product already in wishlist"
      });
    }

    // Add product reference
    user.wishlist.push(product._id);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Product added to wishlist"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while adding to wishlist"
    });
  }
};


const getWishlist = async (req, res) => {
  try {
    const user = await Customer.findById(req.user._id).populate({
      path: "wishlist",
      select: "name description price category image stock"
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Filter out null items in case a referenced product was removed from catalog
    const wishlistItems = (user.wishlist || []).filter((item) => item !== null);

    return res.status(200).json({
      success: true,
      count: wishlistItems.length,
      wishlist: wishlistItems
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while fetching wishlist"
    });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const user = await Customer.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Check if the product is in the user's wishlist
    const exists = (user.wishlist || []).some(
      (id) => id.toString() === productId
    );

    if (!exists) {
      return res.status(404).json({
        success: false,
        message: "Product not in wishlist"
      });
    }

    // Remove product reference
    user.wishlist = user.wishlist.filter(
      (id) => id.toString() !== productId
    );
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while removing from wishlist"
    });
  }
};

// PATCH /wishlist/:productId/toggle - Bonus: Toggle product in wishlist
const toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const user = await Customer.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    if (!user.wishlist) {
      user.wishlist = [];
    }

    const isSaved = user.wishlist.some(
      (id) => id.toString() === productId
    );

    if (isSaved) {
      user.wishlist = user.wishlist.filter(
        (id) => id.toString() !== productId
      );
      await user.save();
      return res.status(200).json({
        success: true,
        saved: false,
        message: "Product removed from wishlist"
      });
    } else {
      user.wishlist.push(product._id);
      await user.save();
      return res.status(200).json({
        success: true,
        saved: true,
        message: "Product added to wishlist"
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while toggling wishlist"
    });
  }
};

// GET /wishlist/count - Bonus: Get wishlist item count for current user
const getWishlistCount = async (req, res) => {
  try {
    const user = await Customer.findById(req.user._id).select("wishlist");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    return res.status(200).json({
      success: true,
      count: user.wishlist ? user.wishlist.length : 0
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while getting wishlist count"
    });
  }
};

module.exports = {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  toggleWishlist,
  getWishlistCount
};
