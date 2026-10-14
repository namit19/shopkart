require("dotenv").config();
const mongoose = require("mongoose");
const Customer = require("./models/customer.model");
const Product = require("./models/product.model");
const jwt = require("jsonwebtoken");
const http = require("http");
const express = require("express");
const cookieParser = require("cookie-parser");
const wishlistRoutes = require("./routes/wishlist.routes");
const customerRoutes = require("./routes/customer.routes");

async function runTests() {
  console.log("--- Starting Backend Wishlist Tests ---");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Setup test express app
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/customers", customerRoutes);
  app.use("/wishlist", wishlistRoutes);

  const server = http.createServer(app);
  await new Promise((res) => server.listen(5001, res));
  console.log("Test server running on port 5001");

  const baseUrl = "http://localhost:5001";

  // Create a test customer
  const testEmail = `wishlist_tester_${Date.now()}@example.com`;
  const regRes = await fetch(`${baseUrl}/customers/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Wishlist Tester",
      email: testEmail,
      password: "password123",
      phone: "9876543210"
    })
  });
  const regData = await regRes.json();
  console.log("Customer registered:", regData.success);

  // Login to get token
  const loginRes = await fetch(`${baseUrl}/customers/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: "password123"
    })
  });
  const cookieHeader = loginRes.headers.get("set-cookie");
  const tokenMatch = cookieHeader && cookieHeader.match(/token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;
  console.log("Token obtained:", !!token);

  // Fetch a product
  const product = await Product.findOne({});
  if (!product) {
    throw new Error("No product found in DB to test with!");
  }
  const productId = product._id.toString();
  console.log("Testing with product:", product.name, "(ID:", productId, ")");

  // Test 5: Unauthenticated access
  console.log("\n[Test 5] Unauthenticated access to GET /wishlist");
  const unauthRes = await fetch(`${baseUrl}/wishlist`);
  console.log("Status:", unauthRes.status, "(Expected 401)");
  if (unauthRes.status !== 401) throw new Error("Test 5 failed: expected 401");

  // Test with Bearer token: Test 1: Add product
  console.log("\n[Test 1] Add product to wishlist (POST /wishlist/:productId) with Bearer token");
  const addRes = await fetch(`${baseUrl}/wishlist/${productId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const addData = await addRes.json();
  console.log("Status:", addRes.status, "Response:", addData);
  if (addRes.status !== 200 && addRes.status !== 201) throw new Error("Test 1 failed");

  // Test 2: Duplicate add -> 409 Conflict
  console.log("\n[Test 2] Duplicate add to wishlist (POST /wishlist/:productId)");
  const dupRes = await fetch(`${baseUrl}/wishlist/${productId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const dupData = await dupRes.json();
  console.log("Status:", dupRes.status, "(Expected 409) Response:", dupData);
  if (dupRes.status !== 409) throw new Error("Test 2 failed: expected 409");

  // Test 3: Get wishlist -> check populated data
  console.log("\n[Test 3] Get wishlist (GET /wishlist)");
  const getRes = await fetch(`${baseUrl}/wishlist`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const getData = await getRes.json();
  console.log("Status:", getRes.status, "Count:", getData.count, "Items:", getData.wishlist.length);
  if (getRes.status !== 200 || getData.count !== 1 || !getData.wishlist[0].name) {
    throw new Error("Test 3 failed: expected populated wishlist with count 1");
  }

  // Bonus: Wishlist Count
  console.log("\n[Bonus Test] Wishlist count (GET /wishlist/count)");
  const countRes = await fetch(`${baseUrl}/wishlist/count`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const countData = await countRes.json();
  console.log("Status:", countRes.status, "Count:", countData.count);
  if (countRes.status !== 200 || countData.count !== 1) throw new Error("Bonus Count failed");

  // Edge cases: Invalid product ID
  console.log("\n[Edge Case] Invalid product ID (POST /wishlist/invalid_id)");
  const invalidIdRes = await fetch(`${baseUrl}/wishlist/invalid_id`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Status:", invalidIdRes.status, "(Expected 400)");
  if (invalidIdRes.status !== 400) throw new Error("Invalid product ID test failed");

  // Edge cases: Non-existent product ID
  const fakeId = new mongoose.Types.ObjectId().toString();
  console.log("\n[Edge Case] Non-existent product ID (POST /wishlist/" + fakeId + ")");
  const notFoundRes = await fetch(`${baseUrl}/wishlist/${fakeId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Status:", notFoundRes.status, "(Expected 404)");
  if (notFoundRes.status !== 404) throw new Error("Non-existent product ID test failed");

  // Test 4: Remove product from wishlist
  console.log("\n[Test 4] Remove product from wishlist (DELETE /wishlist/:productId)");
  const delRes = await fetch(`${baseUrl}/wishlist/${productId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const delData = await delRes.json();
  console.log("Status:", delRes.status, "Response:", delData);
  if (delRes.status !== 200) throw new Error("Test 4 failed");

  // Test 4b: Remove again -> 404 not in wishlist
  console.log("\n[Test 4b] Remove again (DELETE /wishlist/:productId) -> Expect 404");
  const delAgainRes = await fetch(`${baseUrl}/wishlist/${productId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Status:", delAgainRes.status, "(Expected 404)");
  if (delAgainRes.status !== 404) throw new Error("Test 4b failed: expected 404");

  // Bonus: Toggle endpoint
  console.log("\n[Bonus Test] Toggle product (PATCH /wishlist/:productId/toggle)");
  const toggle1 = await fetch(`${baseUrl}/wishlist/${productId}/toggle`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` }
  });
  const tData1 = await toggle1.json();
  console.log("Toggle 1 (Add):", tData1);
  if (!tData1.saved) throw new Error("Toggle 1 expected saved=true");

  const toggle2 = await fetch(`${baseUrl}/wishlist/${productId}/toggle`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` }
  });
  const tData2 = await toggle2.json();
  console.log("Toggle 2 (Remove):", tData2);
  if (tData2.saved) throw new Error("Toggle 2 expected saved=false");

  // Clean up test customer
  await Customer.deleteOne({ email: testEmail });
  console.log("\nCleaned up test customer.");

  server.close();
  await mongoose.disconnect();
  console.log("\nALL BACKEND TESTS PASSED SUCCESSFULLY! ✅");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
