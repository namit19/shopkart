import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { logoutCustomer, getWishlistCount } from "../services/api";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { totalCount } = useCart();
  const [loggingOut, setLoggingOut] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const navigate = useNavigate();

  const loadCount = () => {
    getWishlistCount()
      .then((data) => {
        if (typeof data.count === "number") {
          setWishlistCount(data.count);
        }
      })
      .catch(() => {
        // Silently ignore if not logged in or in preview
      });
  };

  useEffect(() => {
    loadCount();

    // Listen to custom wishlist updates from anywhere in the app
    const handleWishlistChange = () => {
      loadCount();
    };

    window.addEventListener("shopkart:wishlist_changed", handleWishlistChange);
    return () => {
      window.removeEventListener("shopkart:wishlist_changed", handleWishlistChange);
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logoutCustomer();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <header className="navbar">
      <div className="navbar-left">
        <Link className="brand" to="/products" aria-label="ShopKart home">
          <span className="brand-mark">S</span> ShopKart
        </Link>
        <nav className="nav-links">
          <NavLink
            to="/products"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Products
          </NavLink>
          <NavLink
            to="/wishlist"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            id="nav-wishlist-link"
          >
            Wishlist {wishlistCount > 0 ? `(${wishlistCount})` : ""}
          </NavLink>
          <NavLink
            to="/cart"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            id="nav-cart-link"
          >
            Cart ({totalCount || 0})
          </NavLink>
          <NavLink
            to="/orders"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            id="nav-orders-link"
          >
            My Orders
          </NavLink>
          <NavLink
            to="/home"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            My Profile
          </NavLink>
        </nav>
      </div>

      <div className="navbar-right">
        <button
          className="button button-secondary button-small"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? "Signing out..." : "Log out"}
        </button>
      </div>
    </header>
  );
}