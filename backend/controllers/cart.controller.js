const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");

/**
 * POST /cart/:productId
 * Add a product to the authenticated user's cart or increment quantity if already present.
 */
const addToCart = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    // Check if product exists in catalog
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Find authenticated customer
    const user = await Customer.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    if (!user.cart) {
      user.cart = [];
    }

    // Check if product is already in user's cart
    const existingItemIndex = user.cart.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Product exists in cart -> increment quantity
      const targetQuantity = user.cart[existingItemIndex].quantity + 1;

      // Validate against stock
      if (targetQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more. Requested quantity exceeds available stock (${product.stock} available).`
        });
      }

      user.cart[existingItemIndex].quantity = targetQuantity;
    } else {
      // Product not in cart -> add with quantity = 1
      if (product.stock < 1) {
        return res.status(400).json({
          success: false,
          message: "Product is out of stock"
        });
      }

      user.cart.push({
        product: product._id,
        quantity: 1
      });
    }

    await user.save();

    await user.populate({
      path: "cart.product",
      select: "name description price category image stock"
    });

    const activeCart = user.cart.filter((item) => item.product !== null);

    return res.status(200).json({
      success: true,
      message: "Cart updated",
      cart: activeCart
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while adding product to cart"
    });
  }
};

/**
 * GET /cart
 * Fetch the current authenticated user's cart with populated product details.
 */
const getCart = async (req, res) => {
  try {
    const user = await Customer.findById(req.user._id).populate({
      path: "cart.product",
      select: "name description price category image stock"
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Filter out null products in case a referenced product was removed
    const activeCart = (user.cart || []).filter((item) => item.product !== null);

    return res.status(200).json({
      success: true,
      cart: activeCart
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while fetching cart"
    });
  }
};

/**
 * PATCH /cart/:productId
 * Update quantity for a specific product in the user's cart.
 */
const updateCartItemQuantity = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    // Validate quantity is an integer >= 1
    if (
      quantity === undefined ||
      quantity === null ||
      typeof quantity !== "number" ||
      !Number.isInteger(quantity)
    ) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a valid integer"
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1"
      });
    }

    // Verify product exists in catalog
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Validate quantity against product stock
    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Requested quantity exceeds available stock (${product.stock} available).`
      });
    }

    // Find authenticated customer
    const user = await Customer.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Check if product exists in cart
    const itemIndex = (user.cart || []).findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Product not in cart"
      });
    }

    user.cart[itemIndex].quantity = quantity;
    await user.save();

    await user.populate({
      path: "cart.product",
      select: "name description price category image stock"
    });

    const activeCart = user.cart.filter((item) => item.product !== null);

    return res.status(200).json({
      success: true,
      message: "Cart item quantity updated",
      cart: activeCart
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating cart quantity"
    });
  }
};

/**
 * DELETE /cart/:productId
 * Remove a product from the user's cart.
 */
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate productId format
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

    // Check if product is in cart
    const exists = (user.cart || []).some(
      (item) => item.product.toString() === productId
    );

    if (!exists) {
      return res.status(404).json({
        success: false,
        message: "Product not in cart"
      });
    }

    // Remove from cart
    user.cart = user.cart.filter(
      (item) => item.product.toString() !== productId
    );

    await user.save();

    await user.populate({
      path: "cart.product",
      select: "name description price category image stock"
    });

    const activeCart = user.cart.filter((item) => item.product !== null);

    return res.status(200).json({
      success: true,
      message: "Product removed from cart",
      cart: activeCart
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while removing product from cart"
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItemQuantity,
  removeFromCart
};
