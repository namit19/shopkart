import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import CartItem from "../components/CartItem";
import { useCart } from "../context/CartContext";

export default function Cart() {
  const { cart, loading, error, totalCount, subtotal, fetchCart } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    navigate("/checkout");
  };

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="container cart-page">
        {/* Header */}
        <header className="page-header cart-header">
          <div>
            <h1 className="page-title">My Cart</h1>
            {!loading && !error && cart.length > 0 && (
              <p className="page-subtitle" id="cart-item-count-subtitle">
                {totalCount} {totalCount === 1 ? "item" : "items"} in your shopping bag
              </p>
            )}
          </div>
          {!loading && !error && cart.length > 0 && (
            <Link to="/products" className="button button-secondary button-small">
              ← Continue Shopping
            </Link>
          )}
        </header>

        {/* 1. Loading State */}
        {loading && (
          <div className="state-box cart-state-box" role="status" id="cart-loading-state">
            <div className="state-spinner" aria-hidden="true">🛒</div>
            <p className="state-message">Loading your cart...</p>
            <p className="state-submessage">Calculating subtotal and syncing latest stock</p>
          </div>
        )}

        {/* 2. Error State */}
        {!loading && error && (
          <div className="state-box error-box cart-state-box" role="alert" id="cart-error-state">
            <span className="state-icon" aria-hidden="true">⚠️</span>
            <p className="state-message">Unable to load your cart.</p>
            <p className="state-submessage">{error}</p>
            <button
              type="button"
              className="button button-primary button-small state-action-btn"
              onClick={fetchCart}
              id="cart-retry-btn"
            >
              Try Again
            </button>
          </div>
        )}

        {/* 3. Empty State */}
        {!loading && !error && cart.length === 0 && (
          <div className="state-box empty-box cart-state-box cart-empty-state" id="cart-empty-state">
            <div className="empty-cart-icon" aria-hidden="true">🛒</div>
            <h2 className="empty-state-title">Your cart is empty</h2>
            <p className="state-submessage">
              Looks like you haven't added anything yet.
            </p>
            <Link
              to="/products"
              className="button button-primary button-small empty-state-browse-btn"
              id="browse-products-cart-btn"
            >
              Browse Products
            </Link>
          </div>
        )}

        {/* 4. Populated Cart Layout */}
        {!loading && !error && cart.length > 0 && (
          <div className="cart-layout" id="cart-content">
            {/* Left: Cart Items List */}
            <section className="cart-items-section" aria-label="Cart Items">
              <div className="cart-items-list" id="cart-items-list">
                {cart.map((item) => (
                  <CartItem
                    key={item.product?._id || item._id}
                    item={item}
                  />
                ))}
              </div>
            </section>

            {/* Right: Order Summary Sidebar */}
            <aside className="order-summary-sidebar" aria-label="Order Summary">
              <div className="order-summary-card" id="order-summary-card">
                <h2 className="order-summary-title">Order Summary</h2>

                <div className="summary-row">
                  <span className="summary-label">Items ({totalCount} units)</span>
                  <span className="summary-value" id="summary-items-count">
                    ₹{subtotal.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="summary-row">
                  <span className="summary-label">Shipping & Handling</span>
                  <span className="summary-value text-success">FREE</span>
                </div>

                <div className="summary-row">
                  <span className="summary-label">Estimated Tax (GST included)</span>
                  <span className="summary-value">₹0</span>
                </div>

                <hr className="summary-divider" />

                <div className="summary-row summary-total-row">
                  <span className="summary-total-label">Subtotal</span>
                  <span className="summary-total-value" id="summary-subtotal">
                    ₹{subtotal.toLocaleString("en-IN")}
                  </span>
                </div>


                <button
                  type="button"
                  className="button button-primary button-large button-block checkout-btn"
                  onClick={handleCheckout}
                  id="proceed-checkout-btn"
                >
                  Proceed to Checkout →
                </button>

                <div className="summary-assurance">
                  <div className="assurance-item">
                    <span>🛡️</span>
                    <span>100% Secure Checkout</span>
                  </div>
                  <div className="assurance-item">
                    <span>⚡</span>
                    <span>Fast Dispatch & Delivery</span>
                  </div>
                  <div className="assurance-item">
                    <span>🔄</span>
                    <span>7-Day Easy Replacement</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
