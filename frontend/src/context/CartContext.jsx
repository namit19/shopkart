import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import {
  getCart,
  addToCart as apiAddToCart,
  updateCartQuantity as apiUpdateCartQuantity,
  removeFromCart as apiRemoveFromCart
} from "../services/api";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Track per-item loading state for snappy, targeted UI feedback
  const [itemLoading, setItemLoading] = useState({});

  const setItemLoadingState = (productId, isLoading) => {
    setItemLoading((prev) => ({
      ...prev,
      [productId]: isLoading
    }));
  };

  // Fetch current user's cart from backend
  const fetchCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCart();
      if (data && Array.isArray(data.cart)) {
        setCart(data.cart);
      } else {
        setCart([]);
      }
    } catch (err) {
      // If 401 Unauthorized, user is not logged in - reset cart silently
      if (err.status === 401) {
        setCart([]);
        setError(null);
      } else {
        setError(err.message || "Unable to load your cart.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Add product to cart (or increment if already exists)
  const addToCart = useCallback(async (productId) => {
    setItemLoadingState(productId, true);
    try {
      const data = await apiAddToCart(productId);
      if (data && data.cart) {
        setCart(data.cart);
      } else {
        await fetchCart();
      }
      return { success: true, message: data.message || "Added to cart" };
    } catch (err) {
      const message = err.message || "Failed to add product to cart.";
      return { success: false, message };
    } finally {
      setItemLoadingState(productId, false);
    }
  }, [fetchCart]);

  // Update item quantity in cart
  const updateQuantity = useCallback(async (productId, quantity) => {
    setItemLoadingState(productId, true);
    try {
      const data = await apiUpdateCartQuantity(productId, quantity);
      if (data && data.cart) {
        setCart(data.cart);
      } else {
        await fetchCart();
      }
      return { success: true, message: data.message || "Cart updated" };
    } catch (err) {
      const message = err.message || "Failed to update quantity.";
      return { success: false, message };
    } finally {
      setItemLoadingState(productId, false);
    }
  }, [fetchCart]);

  // Remove item from cart
  const removeFromCart = useCallback(async (productId) => {
    setItemLoadingState(productId, true);
    try {
      const data = await apiRemoveFromCart(productId);
      if (data && data.cart) {
        setCart(data.cart);
      } else {
        setCart((prev) =>
          prev.filter((item) => (item.product?._id || item.product) !== productId)
        );
      }
      return { success: true, message: data.message || "Item removed" };
    } catch (err) {
      const message = err.message || "Failed to remove item from cart.";
      return { success: false, message };
    } finally {
      setItemLoadingState(productId, false);
    }
  }, [fetchCart]);

  // Derived values — calculated dynamically from state, never stored in DB
  const derivedValues = useMemo(() => {
    // Total number of units (e.g. Keyboard x 2 + Mouse x 1 = 3)
    const totalCount = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    // Number of distinct product lines in cart
    const uniqueCount = cart.length;

    // Subtotal = Σ(product.price * quantity)
    const subtotal = cart.reduce((sum, item) => {
      const price = Number(item.product?.price) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + price * qty;
    }, 0);

    return { totalCount, uniqueCount, subtotal };
  }, [cart]);

  // Check if a specific product is already in the cart
  const isInCart = useCallback((productId) => {
    return cart.some((item) => (item.product?._id || item.product) === productId);
  }, [cart]);

  // Get quantity of a specific product in the cart
  const getItemQuantity = useCallback((productId) => {
    const item = cart.find((item) => (item.product?._id || item.product) === productId);
    return item ? item.quantity : 0;
  }, [cart]);

  // Clear cart immediately in client state after successful payment verification
  const clearCartState = useCallback(() => {
    setCart([]);
  }, []);

  const value = {
    cart,
    cartItems: cart,
    loading,
    error,
    itemLoading,
    totalCount: derivedValues.totalCount,
    uniqueCount: derivedValues.uniqueCount,
    subtotal: derivedValues.subtotal,
    fetchCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart: clearCartState,
    clearCartState,
    isInCart,
    getItemQuantity
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
