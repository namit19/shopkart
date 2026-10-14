const jwt = require("jsonwebtoken");

const cookieOptions = () => {
  const production = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true" || production,
    sameSite: process.env.COOKIE_SAME_SITE || (production ? "none" : "lax"),
    path: "/"
  };
};

const generateToken = (res, customerId) => {
  const token = jwt.sign({ id: customerId.toString() }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });

  res.cookie("token", token, {
    ...cookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return token;
};

module.exports = { generateToken, cookieOptions };
