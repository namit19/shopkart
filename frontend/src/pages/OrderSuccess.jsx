import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getOrderById } from "../services/api";

export default function OrderSuccess() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchOrder() {
      setLoading(true);
      setError(null);
      try {
        const data = await getOrderById(id);
        if (isMounted) {
          if (data && data.order) {
            setOrder(data.order);
          } else {
            setError("Order details not found.");
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load order details.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (id) {
      fetchOrder();
    }
    return () => {
      isMounted = false;
    };
  }, [id]);

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="container order-confirmation-page">
        {loading && (
          <div className="state-box">
            <span className="state-spinner">⏳</span>
            <h2>Loading order details...</h2>
            <p className="state-submessage">Retrieving order snapshot from database</p>
          </div>
        )}

        {!loading && error && (
          <div className="state-box error-box">
            <span className="state-icon">⚠️</span>
            <h2>Unable to view order</h2>
            <p className="state-submessage">{error}</p>
            <div style={{ marginTop: "1rem" }}>
              <Link to="/orders" className="button button-primary button-small">
                Go to My Orders
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && order && (
          <div className="order-confirmation-card">
            <div className="confirmation-header">
              <div className="success-icon-badge">✅</div>
              <h1 className="confirmation-title">Order Placed Successfully!</h1>
              <p className="confirmation-subtitle">
                Thank you for your purchase. Your payment was verified and your order is confirmed.
              </p>
            </div>

            <div className="confirmation-meta-grid">
              <div className="meta-item">
                <span className="meta-label">Order ID</span>
                <span className="meta-value font-mono">{order._id}</span>
              </div>

              <div className="meta-item">
                <span className="meta-label">Date & Time</span>
                <span className="meta-value">
                  {new Date(order.createdAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short"
                  })}
                </span>
              </div>

              <div className="meta-item">
                <span className="meta-label">Payment Status</span>
                <span className={`status-badge status-paid`}>
                  {order.paymentStatus || "PAID"}
                </span>
              </div>

              <div className="meta-item">
                <span className="meta-label">Order Status</span>
                <span className={`status-badge status-placed`}>
                  {order.status || "PLACED"}
                </span>
              </div>
            </div>

            {/* Items Snapshot Breakdown */}
            <div className="confirmation-section">
              <h2 className="section-title">Items Ordered ({order.items?.length || 0})</h2>
              <div className="confirmation-items-list">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="confirmation-item-row">
                    <div className="item-thumb">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="item-img" />
                      ) : (
                        <div className="item-noimg">📦</div>
                      )}
                    </div>
                    <div className="item-info">
                      <h4 className="item-name">{item.name}</h4>
                      <p className="item-qty">
                        Qty: {item.quantity} × ₹{item.price.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="item-total">
                      ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total and Shipping Address */}
            <div className="confirmation-details-grid">
              <div className="details-col">
                <h3 className="col-title">📍 Delivery Address</h3>
                <div className="address-box">
                  <p className="font-semibold">{order.shippingAddress?.fullName}</p>
                  <p>{order.shippingAddress?.addressLine1}</p>
                  <p>
                    {order.shippingAddress?.city}, {order.shippingAddress?.state} -{" "}
                    {order.shippingAddress?.pincode}
                  </p>
                  <p>📞 Phone: {order.shippingAddress?.phone}</p>
                </div>
              </div>

              <div className="details-col">
                <h3 className="col-title">💳 Payment Details</h3>
                <div className="payment-summary-box">
                  <div className="summary-line">
                    <span>Payment Gateway</span>
                    <span>Razorpay Test Mode</span>
                  </div>
                  {order.razorpayPaymentId && (
                    <div className="summary-line">
                      <span>Payment ID</span>
                      <code className="payment-id-code">{order.razorpayPaymentId}</code>
                    </div>
                  )}
                  <div className="summary-line font-bold total-line">
                    <span>Total Amount Paid</span>
                    <span className="text-primary">
                      ₹{order.totalAmount?.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="confirmation-actions">
              <Link to="/orders" className="button button-primary button-large" id="view-orders-btn">
                View My Orders
              </Link>
              <Link to="/products" className="button button-secondary button-large" id="continue-shopping-btn">
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
