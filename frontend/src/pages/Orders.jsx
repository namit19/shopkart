import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getOrders, updateOrderStatus } from "../services/api";

const STATUS_STEPS = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOrders();
      if (data && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAdvanceStatus = async (orderId, currentStatus) => {
    const currentIndex = STATUS_STEPS.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex >= STATUS_STEPS.length - 1) return;

    const nextStatus = STATUS_STEPS[currentIndex + 1];
    setUpdatingId(orderId);
    try {
      const res = await updateOrderStatus(orderId, nextStatus);
      if (res && res.order) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, status: nextStatus } : o))
        );
      }
    } catch (err) {
      console.error("Status update error:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "DELIVERED":
        return "badge-delivered";
      case "SHIPPED":
        return "badge-shipped";
      case "CONFIRMED":
        return "badge-confirmed";
      case "PLACED":
      default:
        return "badge-placed";
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="container orders-page">
        <header className="page-header">
          <div>
            <h1 className="page-title">My Orders</h1>
            {!loading && !error && (
              <p className="page-subtitle">
                {orders.length} {orders.length === 1 ? "order" : "orders"} placed
              </p>
            )}
          </div>
          <Link to="/products" className="button button-secondary button-small">
            Browse Products
          </Link>
        </header>

        {/* 1. Loading State */}
        {loading && (
          <div className="state-box" role="status" id="orders-loading-state">
            <span className="state-spinner">📦</span>
            <h2>Loading your orders...</h2>
            <p className="state-submessage">Fetching purchase history from database</p>
          </div>
        )}

        {/* 2. Error State */}
        {!loading && error && (
          <div className="state-box error-box" role="alert" id="orders-error-state">
            <span className="state-icon">⚠️</span>
            <h2>Unable to load orders</h2>
            <p className="state-submessage">{error}</p>
            <button
              type="button"
              className="button button-primary button-small state-action-btn"
              onClick={fetchOrders}
              id="retry-orders-btn"
            >
              Try Again
            </button>
          </div>
        )}

        {/* 3. Empty State */}
        {!loading && !error && orders.length === 0 && (
          <div className="state-box empty-box" id="orders-empty-state">
            <div className="empty-cart-icon">🛍️</div>
            <h2>You have not placed any orders yet.</h2>
            <p className="state-submessage">
              Once you checkout and pay, your orders and tracking details will appear here.
            </p>
            <Link
              to="/products"
              className="button button-primary button-small"
              style={{ marginTop: "1rem" }}
              id="start-shopping-btn"
            >
              Start Shopping
            </Link>
          </div>
        )}

        {/* 4. Populated Orders List */}
        {!loading && !error && orders.length > 0 && (
          <div className="orders-list-grid" id="orders-list">
            {orders.map((order) => {
              const currentStepIndex = STATUS_STEPS.indexOf(order.status);
              return (
                <article key={order._id} className="order-history-card">
                  {/* Card Header */}
                  <div className="order-card-header">
                    <div className="order-header-meta">
                      <span className="order-id-label">Order #{order._id}</span>
                      <span className="order-date-text">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </span>
                    </div>

                    <div className="order-header-badges">
                      <span
                        className={`status-pill ${
                          order.paymentStatus === "PAID"
                            ? "pill-paid"
                            : "pill-pending"
                        }`}
                      >
                        ● {order.paymentStatus || "PAID"}
                      </span>
                      <span
                        className={`status-pill ${getStatusBadgeClass(
                          order.status
                        )}`}
                      >
                        {order.status || "PLACED"}
                      </span>
                    </div>
                  </div>

                  {/* Progress Tracker (Bonus Challenge) */}
                  <div className="status-progression-bar" aria-label="Order Status Progress">
                    {STATUS_STEPS.map((step, idx) => {
                      const isComplete = currentStepIndex >= idx;
                      const isCurrent = currentStepIndex === idx;
                      return (
                        <div
                          key={step}
                          className={`prog-step ${
                            isComplete ? "step-active" : ""
                          } ${isCurrent ? "step-current" : ""}`}
                        >
                          <div className="step-circle">
                            {isComplete ? "✓" : idx + 1}
                          </div>
                          <span className="step-label">{step}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Order Items Snapshots */}
                  <div className="order-items-compact-list">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="order-item-compact-row">
                        <div className="item-compact-thumb">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="thumb-img"
                            />
                          ) : (
                            <span>📦</span>
                          )}
                        </div>
                        <div className="item-compact-info">
                          <span className="item-compact-title">{item.name}</span>
                          <span className="item-compact-sub">
                            Qty: {item.quantity} × ₹{item.price.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="item-compact-price">
                          ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Card Footer */}
                  <div className="order-card-footer">
                    <div className="order-total-block">
                      <span className="total-label">Total Amount:</span>
                      <span className="total-amount-val">
                        ₹{order.totalAmount?.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="order-footer-actions">
                      {/* Bonus Challenge: Status Progression Button */}
                      {currentStepIndex > -1 &&
                        currentStepIndex < STATUS_STEPS.length - 1 && (
                          <button
                            type="button"
                            className="button button-outline-small"
                            onClick={() =>
                              handleAdvanceStatus(order._id, order.status)
                            }
                            disabled={updatingId === order._id}
                            title="Bonus Feature: Simulate order lifecycle"
                          >
                            {updatingId === order._id
                              ? "Updating..."
                              : `Advance to ${STATUS_STEPS[currentStepIndex + 1]} →`}
                          </button>
                        )}

                      <Link
                        to={`/orders/${order._id}`}
                        className="button button-secondary button-small"
                        id={`view-order-${order._id}-btn`}
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
