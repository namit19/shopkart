const jwt = require("jsonwebtoken");
const Customer = require("../models/customer.model");
const authMiddleware = async (req, res, next) => {
  let token = req.cookies?.token;
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const customer = await Customer.findById(payload.id).select("-password");
    if (!customer) {
      return res.status(401).json({ success: false, message: "Customer not found" });
    }

    req.user = customer;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }
};

module.exports = authMiddleware;