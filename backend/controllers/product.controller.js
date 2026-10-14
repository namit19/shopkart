const mongoose = require("mongoose");
const Product = require("../models/product.model");

// POST /products - Create a new product
const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, image, stock } = req.body;

    // Check for missing required fields
    if (
      !name ||
      !description ||
      price === undefined ||
      price === null ||
      !category ||
      !image ||
      stock === undefined ||
      stock === null
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields (name, description, price, category, image, stock) are required"
      });
    }

    const numericPrice = Number(price);
    const numericStock = Number(stock);

    // Validate price
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a number greater than 0"
      });
    }

    // Validate stock
    if (isNaN(numericStock) || numericStock < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock must be a number and cannot be negative"
      });
    }

    const product = await Product.create({
      name: name.trim(),
      description: description.trim(),
      price: numericPrice,
      category: category.trim(),
      image: image.trim(),
      stock: numericStock
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error creating product"
    });
  }
};

// GET /products - Get all products with search, category filter, and sorting
const getAllProducts = async (req, res) => {
  try {
    const { search, category, sort } = req.query;

    // Build query dynamically
    const filterQuery = {};

    // Search by name (case-insensitive)
    if (search && search.trim()) {
      filterQuery.name = { $regex: search.trim(), $options: "i" };
    }

    // Filter by category
    if (category && category.trim() && category.trim() !== "All" && category.trim() !== "All Categories") {
      filterQuery.category = category.trim();
    }

    // Dynamic sorting (Bonus Challenge)
    let sortOption = { createdAt: -1 }; // default: newest first
    if (sort === "price_asc") {
      sortOption = { price: 1 };
    } else if (sort === "price_desc") {
      sortOption = { price: -1 };
    }

    const products = await Product.find(filterQuery).sort(sortOption);

    return res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching products"
    });
  }
};

// GET /products/:id - Get a single product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format"
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching product"
    });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById
};
