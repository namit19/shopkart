const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Product = require("./models/product.model");

dotenv.config();

const sampleProducts = [
  {
    name: "Mechanical Keyboard",
    description: "RGB mechanical keyboard with tactile blue switches and detachable USB-C cable.",
    price: 2999,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80",
    stock: 10
  },
  {
    name: "Noise Cancelling Headphones",
    description: "Wireless over-ear headphones with active noise cancellation and 30-hour battery life.",
    price: 4999,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    stock: 25
  },
  {
    name: "Ergonomic Wireless Mouse",
    description: "Precision wireless mouse with customizable DPI buttons and ergonomic thumb rest.",
    price: 1499,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80",
    stock: 18
  },
  {
    name: "Classic Denim Jacket",
    description: "Timeless button-front denim jacket made from 100% durable cotton.",
    price: 2499,
    category: "Fashion",
    image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&auto=format&fit=crop&q=80",
    stock: 15
  },
  {
    name: "Running Shoes",
    description: "Lightweight breathable running sneakers with cushioned soles for maximum comfort.",
    price: 3499,
    category: "Fashion",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
    stock: 8
  },
  {
    name: "Clean Code",
    description: "A handbook of agile software craftsmanship by Robert C. Martin.",
    price: 899,
    category: "Books",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    stock: 30
  },
  {
    name: "The Pragmatic Programmer",
    description: "Your journey to mastery: 20th Anniversary Edition by David Thomas and Andrew Hunt.",
    price: 1199,
    category: "Books",
    image: "https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=600&auto=format&fit=crop&q=80",
    stock: 20
  },
  {
    name: "Modern Desk Lamp",
    description: "Dimmable LED desk lamp with flexible neck and touch brightness controls.",
    price: 1299,
    category: "Home",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80",
    stock: 12
  },
  {
    name: "Minimalist Coffee Maker",
    description: "Compact pour-over drip coffee maker with thermal glass carafe.",
    price: 3999,
    category: "Home",
    image: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600&auto=format&fit=crop&q=80",
    stock: 5
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    await Product.deleteMany({});
    console.log("Cleared existing products.");

    await Product.insertMany(sampleProducts);
    console.log(`Successfully seeded ${sampleProducts.length} sample products!`);

    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
