const bcrypt = require("bcrypt");
const Customer = require("../models/customer.model");
const { generateToken, cookieOptions } = require("../utils/generateToken");

const publicCustomer = (customer) => ({
  _id: customer._id,
  fullName: customer.fullName,
  email: customer.email,
  phone: customer.phone
});

const registerCustomer = async (req, res) => {
  try {
    const { fullName, email, password, phone } = req.body;
    if (![fullName, email, password, phone].every((value) => typeof value === "string" && value.trim())) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must contain at least 6 characters" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingCustomer = await Customer.findOne({ email: normalizedEmail });
    if (existingCustomer) {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }

    const customer = await Customer.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      phone: phone.trim()
    });

    return res.status(201).json({
      success: true,
      message: "Customer registered successfully",
      customer: publicCustomer(customer)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const customer = await Customer.findOne({ email: email.trim().toLowerCase() });
    if (!customer || !(await bcrypt.compare(password, customer.password))) {
      return res.status(401).json({ success: false, message: "Invalid Credentials" });
    }

    generateToken(res, customer._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      customer: publicCustomer(customer)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getMyProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    return res.status(200).json(publicCustomer(req.user));
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const logoutCustomer = (req, res) => {
  const { httpOnly, secure, sameSite, path } = cookieOptions();
  res.clearCookie("token", { httpOnly, secure, sameSite, path });
  return res.status(200).json({ success: true, message: "Logged out successfully" });
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Old and new passwords are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must contain at least 6 characters" });
    }

    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, customer.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid old password" });
    }

    customer.password = await bcrypt.hash(newPassword, 10);
    await customer.save();

    return res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  registerCustomer,
  loginCustomer,
  getMyProfile,
  logoutCustomer,
  changePassword
};