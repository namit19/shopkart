import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useCart } from "../context/CartContext";
import { createPaymentOrder, verifyPayment } from "../services/api";

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function Checkout() {
  const { cart, loading: cartLoading, totalCount, subtotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [shippingAddress, setShippingAddress] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    city: "",
    state: "",
    pincode: ""
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusText, setStatusText] = useState("");

  // Simulated modal state for when Razorpay test keys are placeholder
  const [simulatedOrder, setSimulatedOrder] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress((prev) => ({
      ...prev,
      [name]: value
    }));
    // Clear specific error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (serverError) {
      setServerError("");
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!shippingAddress.fullName || !shippingAddress.fullName.trim()) {
      newErrors.fullName = "Full Name is required";
    }

    const cleanPhone = (shippingAddress.phone || "").trim().replace(/[-\s]/g, "");
    if (!cleanPhone) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[0-9]{10}$/.test(cleanPhone)) {
      newErrors.phone = "Phone number must be a valid 10-digit number";
    }

    if (!shippingAddress.addressLine1 || !shippingAddress.addressLine1.trim()) {
      newErrors.addressLine1 = "Address line is required";
    }

    if (!shippingAddress.city || !shippingAddress.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!shippingAddress.state || !shippingAddress.state.trim()) {
      newErrors.state = "State is required";
    }

    const cleanPincode = (shippingAddress.pincode || "").trim();
    if (!cleanPincode) {
      newErrors.pincode = "Pincode is required";
    } else if (!/^[0-9]{6}$/.test(cleanPincode)) {
      newErrors.pincode = "Pincode must contain 6 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validateForm()) {
      return;
    }

    if (cart.length === 0) {
      setServerError("Your cart is empty. Add products to proceed.");
      return;
    }

    setSubmitting(true);
    setStatusText("Verifying stock & creating order...");

    try {
      // 1. Create order on backend (server calculates total & checks stock)
      const data = await createPaymentOrder(shippingAddress);

      if (!data || !data.success) {
        throw new Error(data?.message || "Failed to initiate payment order");
      }

      setStatusText("Initializing Razorpay checkout...");

      // 2. Load Razorpay script dynamically
      const isScriptLoaded = await loadRazorpayScript();

      // Check if real key is present
      const isRealKey =
        data.key &&
        data.key.startsWith("rzp_test_") &&
        data.key !== "rzp_test_placeholder";

      if (isScriptLoaded && window.Razorpay && isRealKey) {
        // Open standard Razorpay Checkout Modal
        const options = {
          key: data.key,
          amount: data.amount,
          currency: data.currency || "INR",
          name: "ShopKart",
          description: "ShopKart Order Payment",
          order_id: data.razorpayOrderId,
          handler: async function (response) {
            try {
              setStatusText("Verifying payment signature with backend...");
              const verifyRes = await verifyPayment({
                shopKartOrderId: data.shopKartOrderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });

              if (verifyRes.success) {
                // Clear cart global state
                clearCart();
                navigate(`/order-success/${data.shopKartOrderId}`);
              } else {
                setServerError(verifyRes.message || "Payment verification failed.");
                setSubmitting(false);
              }
            } catch (vErr) {
              setServerError(vErr.message || "Payment verification failed.");
              setSubmitting(false);
            }
          },
          prefill: {
            name: shippingAddress.fullName,
            contact: shippingAddress.phone
          },
          theme: {
            color: "#4f46e5"
          },
          modal: {
            ondismiss: function () {
              setSubmitting(false);
              setStatusText("");
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (errResp) {
          setServerError(
            `Payment failed: ${errResp.error?.description || "Payment cancelled or rejected."}. Your cart has not been cleared.`
          );
          setSubmitting(false);
          setStatusText("");
        });
        rzp.open();
      } else {
        // Fallback simulator modal for local/test mode before user configures keys
        setSimulatedOrder(data);
        setStatusText("");
      }
    } catch (err) {
      setServerError(err.message || "Unable to place order. Please try again.");
      setSubmitting(false);
      setStatusText("");
    }
  };

  const handleSimulatedSuccess = async () => {
    if (!simulatedOrder) return;
    setStatusText("Verifying payment signature with backend...");
    try {
      const verifyRes = await verifyPayment({
        shopKartOrderId: simulatedOrder.shopKartOrderId,
        razorpay_order_id: simulatedOrder.razorpayOrderId,
        razorpay_payment_id: "pay_simulated_" + Date.now(),
        razorpay_signature: "simulated_test_signature"
      });

      if (verifyRes.success) {
        clearCart();
        setSimulatedOrder(null);
        navigate(`/order-success/${simulatedOrder.shopKartOrderId}`);
      } else {
        setServerError(verifyRes.message || "Payment verification failed.");
        setSimulatedOrder(null);
        setSubmitting(false);
      }
    } catch (err) {
      setServerError(err.message || "Verification failed.");
      setSimulatedOrder(null);
      setSubmitting(false);
    }
  };

  const handleSimulatedFailure = () => {
    setSimulatedOrder(null);
    setSubmitting(false);
    setServerError(
      "Payment simulation cancelled or failed. Your cart has NOT been cleared."
    );
  };

  if (!cartLoading && cart.length === 0 && !simulatedOrder) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <main className="container checkout-page">
          <div className="state-box empty-box checkout-empty-state">
            <span className="state-icon">🛒</span>
            <h2>Your cart is empty</h2>
            <p className="state-submessage">
              You need items in your cart to proceed with checkout.
            </p>
            <Link
              to="/products"
              className="button button-primary button-small"
              style={{ marginTop: "1rem" }}
            >
              Browse Products
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="container checkout-page">
        <header className="page-header">
          <div>
            <h1 className="page-title">Checkout</h1>
            <p className="page-subtitle">
              Enter shipping address and complete your purchase
            </p>
          </div>
          <Link to="/cart" className="button button-secondary button-small">
            ← Back to Cart
          </Link>
        </header>

        {serverError && (
          <div className="checkout-alert error-alert" role="alert">
            <span className="alert-icon">⚠️</span>
            <div>
              <strong>Error placing order:</strong> {serverError}
            </div>
          </div>
        )}

        <div className="checkout-grid">
          {/* Left Column: Shipping Details Form */}
          <section className="checkout-form-section" aria-label="Shipping Address">
            <div className="checkout-card">
              <h2 className="card-section-title">📍 1. Shipping Details</h2>
              <p className="card-section-desc">
                Where should we deliver your order?
              </p>

              <form onSubmit={handlePlaceOrder} noValidate id="checkout-form">
                <div className="form-group">
                  <label htmlFor="fullName" className="form-label">
                    Full Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    className={`form-input ${errors.fullName ? "input-error" : ""}`}
                    placeholder="e.g. Aarav Sharma"
                    value={shippingAddress.fullName}
                    onChange={handleInputChange}
                    disabled={submitting}
                  />
                  {errors.fullName && (
                    <span className="form-error-msg">{errors.fullName}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="phone" className="form-label">
                    Phone Number <span className="text-danger">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className={`form-input ${errors.phone ? "input-error" : ""}`}
                    placeholder="10-digit mobile number"
                    value={shippingAddress.phone}
                    onChange={handleInputChange}
                    disabled={submitting}
                  />
                  {errors.phone && (
                    <span className="form-error-msg">{errors.phone}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="addressLine1" className="form-label">
                    Address Line <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="addressLine1"
                    name="addressLine1"
                    className={`form-input ${errors.addressLine1 ? "input-error" : ""}`}
                    placeholder="Flat/House No., Street, Area"
                    value={shippingAddress.addressLine1}
                    onChange={handleInputChange}
                    disabled={submitting}
                  />
                  {errors.addressLine1 && (
                    <span className="form-error-msg">{errors.addressLine1}</span>
                  )}
                </div>

                <div className="form-row-grid">
                  <div className="form-group">
                    <label htmlFor="city" className="form-label">
                      City <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      className={`form-input ${errors.city ? "input-error" : ""}`}
                      placeholder="e.g. Bengaluru"
                      value={shippingAddress.city}
                      onChange={handleInputChange}
                      disabled={submitting}
                    />
                    {errors.city && (
                      <span className="form-error-msg">{errors.city}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="state" className="form-label">
                      State <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      className={`form-input ${errors.state ? "input-error" : ""}`}
                      placeholder="e.g. Karnataka"
                      value={shippingAddress.state}
                      onChange={handleInputChange}
                      disabled={submitting}
                    />
                    {errors.state && (
                      <span className="form-error-msg">{errors.state}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="pincode" className="form-label">
                      Pincode <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="pincode"
                      name="pincode"
                      maxLength={6}
                      className={`form-input ${errors.pincode ? "input-error" : ""}`}
                      placeholder="6-digit pincode"
                      value={shippingAddress.pincode}
                      onChange={handleInputChange}
                      disabled={submitting}
                    />
                    {errors.pincode && (
                      <span className="form-error-msg">{errors.pincode}</span>
                    )}
                  </div>
                </div>

                <div className="form-actions-bottom">
                  <button
                    type="submit"
                    className="button button-primary button-large button-block"
                    disabled={submitting}
                    id="place-order-submit-btn"
                  >
                    {submitting ? (
                      <span className="btn-loading-flex">
                        <span className="spinner-dot"></span>
                        {statusText || "Processing Order..."}
                      </span>
                    ) : (
                      `Pay ₹${subtotal.toLocaleString("en-IN")} with Razorpay 💳`
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* Right Column: Final Cart Review & Summary */}
          <aside className="checkout-summary-section" aria-label="Order Summary">
            <div className="checkout-card order-summary-card">
              <h2 className="card-section-title">🛍️ 2. Order Summary</h2>
              <p className="card-section-desc">
                Review your items ({totalCount} units)
              </p>

              <div className="checkout-items-list">
                {cart.map((item) => {
                  const product = item.product || {};
                  return (
                    <div
                      key={product._id || item._id}
                      className="checkout-item-row"
                    >
                      <div className="checkout-item-thumb">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="checkout-item-img"
                          />
                        ) : (
                          <div className="checkout-item-noimg">📦</div>
                        )}
                      </div>
                      <div className="checkout-item-details">
                        <div className="checkout-item-name">{product.name}</div>
                        <div className="checkout-item-qty">
                          Qty: <strong>{item.quantity}</strong> × ₹
                          {(product.price || 0).toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div className="checkout-item-price">
                        ₹{((product.price || 0) * item.quantity).toLocaleString(
                          "en-IN"
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <hr className="summary-divider" />

              <div className="summary-row">
                <span className="summary-label">Items Subtotal</span>
                <span className="summary-value">
                  ₹{subtotal.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Delivery Fee</span>
                <span className="summary-value text-success font-semibold">
                  FREE
                </span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Taxes & GST</span>
                <span className="summary-value">Included</span>
              </div>

              <hr className="summary-divider" />

              <div className="summary-row summary-total-row">
                <span className="summary-total-label">Total to Pay</span>
                <span className="summary-total-value text-primary font-bold">
                  ₹{subtotal.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="razorpay-badge-banner">
                <span className="rzp-shield-icon">🔒</span>
                <span>
                  Secured by <strong>Razorpay Test Mode</strong>
                </span>
              </div>
            </div>
          </aside>
        </div>

        {/* Razorpay Test Mode Simulator Modal (shown if API keys are still in placeholder test mode) */}
        {simulatedOrder && (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <div className="simulated-payment-modal">
              <div className="sim-modal-header">
                <h3>💳 Razorpay Test Mode Simulator</h3>
                <span className="sim-badge">Test Gateway</span>
              </div>

              <p className="sim-modal-desc">
                Your backend order is pending (Order ID:{" "}
                <code>{simulatedOrder.shopKartOrderId}</code>). You can test the
                full payment verification and cart-clearing flow below:
              </p>

              <div className="sim-order-info">
                <div>
                  Amount: <strong>₹{(simulatedOrder.amount / 100).toLocaleString("en-IN")}</strong>
                </div>
                <div>
                  Razorpay Order ID: <code>{simulatedOrder.razorpayOrderId}</code>
                </div>
              </div>

              <div className="sim-modal-actions">
                <button
                  type="button"
                  className="button button-primary"
                  onClick={handleSimulatedSuccess}
                  id="sim-payment-success-btn"
                >
                  ✓ Complete Test Payment (Success)
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={handleSimulatedFailure}
                  id="sim-payment-fail-btn"
                >
                  ✕ Simulate Payment Failure (Preserve Cart)
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
