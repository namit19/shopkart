require("dotenv").config();
const mongoose = require("mongoose");
const Customer = require("./models/customer.model");
const Product = require("./models/product.model");
const http = require("http");
const express = require("express");
const cookieParser = require("cookie-parser");
const cartRoutes = require("./routes/cart.routes");
const customerRoutes = require("./routes/customer.routes");

async function runTests() {
  console.log("=== Starting Backend Cart Tests (Lab 05) ===");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ Connected to MongoDB");

  // Setup test express app on port 5002
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/customers", customerRoutes);
  app.use("/cart", cartRoutes);

  const server = http.createServer(app);
  await new Promise((res) => server.listen(5002, res));
  console.log("✓ Test server running on port 5002");

  const baseUrl = "http://localhost:5002";

  try {
    // 1. Create a test customer
    const testEmail = `cart_tester_${Date.now()}@example.com`;
    const regRes = await fetch(`${baseUrl}/customers/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Cart Tester",
        email: testEmail,
        password: "password123",
        phone: "9876543210"
      })
    });
    const regData = await regRes.json();
    if (!regData.success) throw new Error("Registration failed: " + JSON.stringify(regData));
    console.log("✓ Test customer registered");

    // 2. Login to get cookie/token
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
    if (!token) throw new Error("No token returned in set-cookie");
    console.log("✓ Authenticated token obtained");

    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    };

    // 3. Find or create a test product
    let product = await Product.findOne({ stock: { $gte: 5 } });
    if (!product) {
      product = await Product.create({
        name: "Test Mechanical Keyboard",
        description: "Test description",
        price: 2999,
        category: "Electronics",
        image: "https://example.com/test.jpg",
        stock: 5
      });
    }
    const productId = product._id.toString();
    console.log(`✓ Using test product: ${product.name} (ID: ${productId}, Stock: ${product.stock})`);

    // TEST 7: Unauthenticated request -> 401
    const unauthRes = await fetch(`${baseUrl}/cart`);
    console.log(`Test 7 - Unauthenticated GET /cart status: ${unauthRes.status} (Expected: 401)`);
    if (unauthRes.status !== 401) throw new Error("Expected 401 for unauthenticated request");

    // TEST 1: Add new item -> POST /cart/:productId
    const addRes1 = await fetch(`${baseUrl}/cart/${productId}`, {
      method: "POST",
      headers: authHeaders
    });
    const addData1 = await addRes1.json();
    console.log(`Test 1 - Add item status: ${addRes1.status}, success: ${addData1.success}`);
    if (addRes1.status !== 200 || !addData1.success) throw new Error("Add item failed");
    const item1 = addData1.cart.find((i) => (i.product._id || i.product).toString() === productId);
    if (!item1 || item1.quantity !== 1) throw new Error(`Expected quantity 1, got ${item1?.quantity}`);
    console.log(`✓ Test 1 Passed: Product added with quantity = 1`);

    // TEST 2: Add same item again -> quantity should become 2
    const addRes2 = await fetch(`${baseUrl}/cart/${productId}`, {
      method: "POST",
      headers: authHeaders
    });
    const addData2 = await addRes2.json();
    console.log(`Test 2 - Add same item status: ${addRes2.status}, success: ${addData2.success}`);
    const item2 = addData2.cart.find((i) => (i.product._id || i.product).toString() === productId);
    if (!item2 || item2.quantity !== 2) throw new Error(`Expected quantity 2, got ${item2?.quantity}`);
    console.log(`✓ Test 2 Passed: Quantity incremented to 2`);

    // TEST 3: Get Cart -> GET /cart
    const getRes = await fetch(`${baseUrl}/cart`, {
      headers: authHeaders
    });
    const getData = await getRes.json();
    console.log(`Test 3 - GET /cart status: ${getRes.status}, items: ${getData.cart?.length}`);
    if (getRes.status !== 200 || !getData.cart || getData.cart.length === 0) {
      throw new Error("Failed to fetch populated cart");
    }
    const populatedProduct = getData.cart[0].product;
    if (!populatedProduct.name || populatedProduct.price === undefined) {
      throw new Error("Product was not properly populated");
    }
    console.log(`✓ Test 3 Passed: Cart returned populated product (${populatedProduct.name}, ₹${populatedProduct.price})`);

    // TEST 4: Update quantity -> PATCH /cart/:productId { quantity: 3 }
    const patchRes = await fetch(`${baseUrl}/cart/${productId}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ quantity: 3 })
    });
    const patchData = await patchRes.json();
    console.log(`Test 4 - PATCH quantity 3 status: ${patchRes.status}, success: ${patchData.success}`);
    const item4 = patchData.cart.find((i) => (i.product._id || i.product).toString() === productId);
    if (!item4 || item4.quantity !== 3) throw new Error(`Expected quantity 3, got ${item4?.quantity}`);
    console.log(`✓ Test 4 Passed: Quantity successfully updated to 3`);

    // TEST 5: Exceed stock -> PATCH /cart/:productId { quantity: 9999 } -> 400
    const exceedRes = await fetch(`${baseUrl}/cart/${productId}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ quantity: 9999 })
    });
    console.log(`Test 5 - Exceed stock status: ${exceedRes.status} (Expected: 400)`);
    if (exceedRes.status !== 400) throw new Error("Expected 400 when exceeding stock");
    console.log(`✓ Test 5 Passed: Exceeding stock properly rejected with 400`);

    // TEST 8: Quantity below 1 -> PATCH /cart/:productId { quantity: 0 } -> 400
    const zeroRes = await fetch(`${baseUrl}/cart/${productId}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ quantity: 0 })
    });
    console.log(`Test 8 - Quantity 0 status: ${zeroRes.status} (Expected: 400)`);
    if (zeroRes.status !== 400) throw new Error("Expected 400 for quantity < 1");
    console.log(`✓ Test 8 Passed: Quantity < 1 rejected with 400`);

    // TEST 6: Remove item -> DELETE /cart/:productId
    const delRes = await fetch(`${baseUrl}/cart/${productId}`, {
      method: "DELETE",
      headers: authHeaders
    });
    const delData = await delRes.json();
    console.log(`Test 6 - DELETE status: ${delRes.status}, success: ${delData.success}`);
    if (delRes.status !== 200 || !delData.success) throw new Error("Delete failed");
    const existsInCart = delData.cart.some((i) => (i.product._id || i.product).toString() === productId);
    if (existsInCart) throw new Error("Product still exists in cart after removal");
    console.log(`✓ Test 6 Passed: Product successfully removed from cart`);

    // TEST 9: Delete already removed product -> 404
    const delAgainRes = await fetch(`${baseUrl}/cart/${productId}`, {
      method: "DELETE",
      headers: authHeaders
    });
    console.log(`Test 9 - DELETE non-existent item status: ${delAgainRes.status} (Expected: 404)`);
    if (delAgainRes.status !== 404) throw new Error("Expected 404 for product not in cart");
    console.log(`✓ Test 9 Passed: Removing non-existent cart item returned 404`);

    console.log("\n==========================================");
    console.log("🎉 ALL BACKEND CART TESTS PASSED SUCCESSFULLY!");
    console.log("==========================================");
  } finally {
    server.close();
    await Customer.deleteOne({ email: { $regex: /^cart_tester_/ } });
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
