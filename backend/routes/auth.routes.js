const express = require("express");
const customerRoutes = require("./customer.routes");

// Export customer routes as auth routes
module.exports = customerRoutes;
