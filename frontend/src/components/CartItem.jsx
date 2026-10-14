import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function CartItem({ item }) {
  const { updateQuantity, removeFromCart, itemLoading } = useCart();
  const [localError, setLocalError] = useState("");

  const product = item.product || {};
  const productId = product._id;
  const quantity = item.quantity || 1;
  const stock = typeof product.stock === "number" ? product.stock : 99;
  const isItemLoading = !!itemLoading[productId];

  const isMin = quantity <= 1;
  const isMax = quantity >= stock;

  const handleIncrease = async () => {
    if (isMax || isItemLoading) return;
    setLocalError("");
    const res = await updateQuantity(productId, quantity + 1);
    if (!res.success) {
      setLocalError(res.message);
    }
  };

  const handleDecrease = async () => {
    if (isMin || isItemLoading) return;
    setLocalError("");
    const res = await updateQuantity(productId, quantity - 1);
    if (!res.success) {
      setLocalError(res.message);
    }
  };

  const handleRemove = async () => {
    if (isItemLoading) return;
    setLocalError("");
    const res = await removeFromCart(productId);
    if (!res.success) {
      setLocalError(res.message);
    }
  };

  const itemTotal = (product.price || 0) * quantity;

  return (
    <article className="cart-item" id={`cart-item-${productId}`}>
      <div className="cart-item-image-wrap">
        <Link to={`/products/${productId}`}>
          <img
            src={product.image}
            alt={product.name || "Product"}
            className="cart-item-image"
            onError={(e) => {
              e.target.src = "https://placehold.co/160x160?text=Product";
            }}
          />
        </Link>
      </div>

      <div className="cart-item-content">
        <div className="cart-item-header">
          <div>
            <span className="cart-item-category">{product.category}</span>
            <h3 className="cart-item-title">
              <Link to={`/products/${productId}`}>{product.name}</Link>
            </h3>
          </div>
          <div className="cart-item-price-col">
            <span className="cart-item-unit-price">
              ₹{Number(product.price || 0).toLocaleString("en-IN")} each
            </span>
            <span className="cart-item-total-price">
              ₹{Number(itemTotal).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Stock warning/status */}
        <div className="cart-item-stock-info">
          {stock <= 0 ? (
            <span className="stock-warning out-of-stock">Out of stock</span>
          ) : isMax ? (
            <span className="stock-warning max-stock">Max stock limit reached ({stock} available)</span>
          ) : stock <= 5 ? (
            <span className="stock-warning low-stock">Only {stock} units left in stock</span>
          ) : (
            <span className="stock-in-stock">In Stock ({stock} available)</span>
          )}
        </div>

        {localError && (
          <div className="cart-item-error" role="alert">
            {localError}
          </div>
        )}

        <div className="cart-item-footer">
          {/* Stepper: [-] quantity [+] */}
          <div className="cart-stepper" aria-label="Quantity Controls">
            <button
              type="button"
              className="stepper-btn stepper-decrement"
              onClick={handleDecrease}
              disabled={isMin || isItemLoading}
              title={isMin ? "Quantity cannot be less than 1 (use Remove)" : "Decrease quantity"}
              aria-label="Decrease quantity"
              id={`decrease-qty-${productId}`}
            >
              −
            </button>
            <span className="stepper-value" id={`quantity-value-${productId}`}>
              {isItemLoading ? "..." : quantity}
            </span>
            <button
              type="button"
              className="stepper-btn stepper-increment"
              onClick={handleIncrease}
              disabled={isMax || isItemLoading}
              title={isMax ? `Maximum available stock reached (${stock})` : "Increase quantity"}
              aria-label="Increase quantity"
              id={`increase-qty-${productId}`}
            >
              +
            </button>
          </div>

          {/* Remove Button */}
          <button
            type="button"
            className="cart-remove-btn"
            onClick={handleRemove}
            disabled={isItemLoading}
            id={`remove-cart-item-${productId}`}
          >
            {isItemLoading ? "Updating..." : "Remove"}
          </button>
        </div>
      </div>
    </article>
  );
}
