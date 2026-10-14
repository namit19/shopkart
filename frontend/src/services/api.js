const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

if (typeof window !== "undefined" && window.sessionStorage) {
  sessionStorage.removeItem("shopkart_demo_user");
}

// Built-in mock data for preview/testing when backend or MongoDB is not yet running
const MOCK_PRODUCTS = [
  {
    _id: "66d123abc456001",
    name: "Mechanical Keyboard",
    description: "RGB mechanical keyboard with tactile blue switches and detachable USB-C cable.",
    price: 2999,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80",
    stock: 10
  },
  {
    _id: "66d123abc456002",
    name: "Noise Cancelling Headphones",
    description: "Wireless over-ear headphones with active noise cancellation and 30-hour battery life.",
    price: 4999,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    stock: 25
  },
  {
    _id: "66d123abc456003",
    name: "Ergonomic Wireless Mouse",
    description: "Precision wireless mouse with customizable DPI buttons and ergonomic thumb rest.",
    price: 1499,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80",
    stock: 18
  },
  {
    _id: "66d123abc456004",
    name: "Classic Denim Jacket",
    description: "Timeless button-front denim jacket made from 100% durable cotton.",
    price: 2499,
    category: "Fashion",
    image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&auto=format&fit=crop&q=80",
    stock: 15
  },
  {
    _id: "66d123abc456005",
    name: "Running Shoes",
    description: "Lightweight breathable running sneakers with cushioned soles for maximum comfort.",
    price: 3499,
    category: "Fashion",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
    stock: 8
  },
  {
    _id: "66d123abc456006",
    name: "Clean Code",
    description: "A handbook of agile software craftsmanship by Robert C. Martin.",
    price: 899,
    category: "Books",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    stock: 30
  },
  {
    _id: "66d123abc456007",
    name: "The Pragmatic Programmer",
    description: "Your journey to mastery: 20th Anniversary Edition by David Thomas and Andrew Hunt.",
    price: 1199,
    category: "Books",
    image: "https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=600&auto=format&fit=crop&q=80",
    stock: 20
  },
  {
    _id: "66d123abc456008",
    name: "Modern Desk Lamp",
    description: "Dimmable LED desk lamp with flexible neck and touch brightness controls.",
    price: 1299,
    category: "Home",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80",
    stock: 12
  },
  {
    _id: "66d123abc456009",
    name: "Minimalist Coffee Maker",
    description: "Compact pour-over drip coffee maker with thermal glass carafe.",
    price: 3999,
    category: "Home",
    image: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600&auto=format&fit=crop&q=80",
    stock: 5
  }
];

// Handles live API requests with graceful local mock fallback when backend/MongoDB is offline
async function request(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || "Something went wrong. Please try again.");
      error.status = response.status;
      throw error;
    }

    return data;
  } catch (error) {
    // If it's an HTTP error with a known status (e.g. 401, 400), rethrow it
    if (error.status) {
      throw error;
    }

    // Never mock authentication, wishlist, cart, or order endpoints - all must be validated by the database
    if (path.startsWith("/customers") || path.startsWith("/wishlist") || path.startsWith("/cart") || path.startsWith("/orders")) {
      throw new Error(
        "Unable to connect to server. Please ensure the backend is running on http://localhost:5000 and connected to MongoDB."
      );
    }

    // Backend is offline: provide sample products catalog fallback
    return handleProductsMockFallback(path);
  }
}

function handleProductsMockFallback(path) {
  // Mock Single Product
  const productMatch = path.match(/^\/products\/([^?]+)/);
  if (productMatch) {
    const id = productMatch[1];
    const found = MOCK_PRODUCTS.find((p) => p._id === id) || MOCK_PRODUCTS[0];
    return { success: true, product: found };
  }

  // Mock Get Products (with Search & Category filter & Sort)
  if (path.startsWith("/products")) {
    const url = new URL(`http://localhost${path}`);
    const search = url.searchParams.get("search")?.toLowerCase();
    const category = url.searchParams.get("category");
    const sort = url.searchParams.get("sort");

    let filtered = [...MOCK_PRODUCTS];

    if (search) {
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(search));
    }
    if (category && category !== "All") {
      filtered = filtered.filter((p) => p.category === category);
    }
    if (sort === "price_asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sort === "price_desc") {
      filtered.sort((a, b) => b.price - a.price);
    }

    return {
      success: true,
      count: filtered.length,
      products: filtered
    };
  }

  throw new Error("Cannot connect to server. Please check backend connection.");
}

export const registerCustomer = (customer) =>
  request("/customers/register", {
    method: "POST",
    body: JSON.stringify(customer)
  });

export const loginCustomer = (credentials) =>
  request("/customers/login", {
    method: "POST",
    body: JSON.stringify(credentials)
  });

export const getMyProfile = () => request("/customers/me");

export const logoutCustomer = () =>
  request("/customers/logout", { method: "POST" });

export const getProducts = (params = {}) => {
  const query = new URLSearchParams();
  if (params.search && params.search.trim()) {
    query.append("search", params.search.trim());
  }
  if (params.category && params.category !== "All" && params.category !== "All Categories") {
    query.append("category", params.category);
  }
  if (params.sort) {
    query.append("sort", params.sort);
  }
  const queryString = query.toString();
  return request(`/products${queryString ? `?${queryString}` : ""}`);
};

export const getProductById = (id) => request(`/products/${id}`);

export const createProduct = (product) =>
  request("/products", {
    method: "POST",
    body: JSON.stringify(product)
  });

export const getWishlist = () => request("/wishlist");

export const addToWishlist = (productId) =>
  request(`/wishlist/${productId}`, {
    method: "POST"
  });

export const removeFromWishlist = (productId) =>
  request(`/wishlist/${productId}`, {
    method: "DELETE"
  });

export const toggleWishlist = (productId) =>
  request(`/wishlist/${productId}/toggle`, {
    method: "PATCH"
  });

export const getWishlistCount = () => request("/wishlist/count");

export const getCart = () => request("/cart");

export const addToCart = (productId) =>
  request(`/cart/${productId}`, {
    method: "POST"
  });

export const updateCartQuantity = (productId, quantity) =>
  request(`/cart/${productId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity })
  });

export const removeFromCart = (productId) =>
  request(`/cart/${productId}`, {
    method: "DELETE"
  });

export const createPaymentOrder = (shippingAddress) =>
  request("/orders/create-payment-order", {
    method: "POST",
    body: JSON.stringify({ shippingAddress })
  });

export const verifyPayment = (paymentData) =>
  request("/orders/verify-payment", {
    method: "POST",
    body: JSON.stringify(paymentData)
  });

export const getOrders = () => request("/orders");

export const getOrderById = (orderId) => request(`/orders/${orderId}`);

export const updateOrderStatus = (orderId, status) =>
  request(`/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });