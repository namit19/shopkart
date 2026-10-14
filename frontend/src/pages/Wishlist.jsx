import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import WishlistCard from "../components/WishlistCard";
import { getWishlist } from "../services/api";

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWishlist = () => {
    setLoading(true);
    setError("");

    getWishlist()
      .then((data) => {
        setWishlist(data.wishlist || []);
      })
      .catch((err) => {
        setError(err.message || "We couldn't load your wishlist.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  // Remove item locally upon successful backend removal without full-page refresh
  const handleItemRemoved = (removedProductId) => {
    setWishlist((prev) => prev.filter((item) => item._id !== removedProductId));
  };

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="container wishlist-page">
        {/* Header - shown when loaded or during normal render */}
        <header className="page-header wishlist-header">
          <div>
            <h1 className="page-title">My Wishlist</h1>
            {!loading && !error && (
              <p className="page-subtitle" id="wishlist-count-subtitle">
                {wishlist.length} {wishlist.length === 1 ? "product" : "products"} saved
              </p>
            )}
          </div>
          {!loading && !error && wishlist.length > 0 && (
            <Link to="/products" className="button button-secondary button-small">
              Continue Shopping
            </Link>
          )}
        </header>

        {/* 1. Loading State */}
        {loading && (
          <div className="state-box wishlist-state-box" role="status" id="wishlist-loading-state">
            <div className="state-spinner" aria-hidden="true">⏳</div>
            <p className="state-message">Loading your wishlist...</p>
            <p className="state-submessage">Fetching your saved products from ShopKart</p>
          </div>
        )}

        {/* 2. Error State */}
        {!loading && error && (
          <div className="state-box error-box wishlist-state-box" role="alert" id="wishlist-error-state">
            <span className="state-icon" aria-hidden="true">⚠️</span>
            <p className="state-message">Something went wrong.</p>
            <p className="state-submessage">We couldn't load your wishlist.</p>
            <button
              type="button"
              className="button button-primary button-small state-action-btn"
              onClick={fetchWishlist}
              id="wishlist-retry-btn"
            >
              Try Again
            </button>
          </div>
        )}

        {/* 3. Empty State */}
        {!loading && !error && wishlist.length === 0 && (
          <div className="state-box empty-box wishlist-state-box wishlist-empty-state" id="wishlist-empty-state">
            <div className="empty-heart-icon" aria-hidden="true">❤️</div>
            <h2 className="empty-state-title">Your wishlist is empty</h2>
            <p className="state-submessage">
              Save products you love and find them here later.
            </p>
            <Link
              to="/products"
              className="button button-primary button-small empty-state-browse-btn"
              id="browse-products-btn"
            >
              Browse Products
            </Link>
          </div>
        )}

        {/* 4. Populated Wishlist Grid */}
        {!loading && !error && wishlist.length > 0 && (
          <div className="products-grid wishlist-grid" id="wishlist-grid">
            {wishlist.map((product) => (
              <WishlistCard
                key={product._id}
                product={product}
                onRemove={handleItemRemoved}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
