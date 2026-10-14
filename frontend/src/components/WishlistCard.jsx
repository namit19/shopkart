import { useState } from "react";
import { Link } from "react-router-dom";
import { removeFromWishlist } from "../services/api";
import { useCart } from "../context/CartContext";

export default function WishlistCard({ product, onRemove }) {
  const { addToCart, itemLoading, isInCart } = useCart();
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isOutOfStock = product.stock <= 0;
  const inCart = isInCart(product._id);
  const isAdding = !!itemLoading[product._id];

  async function handleRemove() {
    if (removing) return;
    setRemoving(true);
    setError("");

    try {
      await removeFromWishlist(product._id);
      window.dispatchEvent(new CustomEvent("shopkart:wishlist_changed"));
      if (onRemove) {
        onRemove(product._id);
      }
    } catch (err) {
      setError(err.message || "Failed to remove product. Please try again.");
      setRemoving(false);
    }
  }

  async function handleAddToCart() {
    if (isAdding || isOutOfStock) return;
    setError("");
    setSuccess("");

    const res = await addToCart(product._id);
    if (res.success) {
      setSuccess("🛒 Added to Cart!");
      setTimeout(() => setSuccess(""), 3000);
    } else {
      setError(res.message);
    }
  }

  return (
    <article className="product-card wishlist-card" id={`wishlist-card-${product._id}`}>
      <div className="product-card-image-wrap">
        <img
          src={product.image}
          alt={product.name}
          className="product-card-image"
          onError={(e) => {
            e.target.src = "https://placehold.co/400x300?text=Product+Image";
          }}
        />
        <span className="product-card-category">{product.category}</span>
      </div>

      <div className="product-card-body">
        <h3 className="product-card-title">{product.name}</h3>

        <div className="product-card-meta">
          <span className="product-card-price">₹{Number(product.price).toLocaleString("en-IN")}</span>
          <span className={`product-card-stock ${isOutOfStock ? "out-of-stock" : ""}`}>
            {isOutOfStock ? "Out of stock" : `${product.stock} units left`}
          </span>
        </div>

        {error && (
          <p className="card-inline-error" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className="card-inline-success" role="status">
            {success}
          </p>
        )}

        <div className="wishlist-card-actions">
          <button
            type="button"
            className="button button-primary wishlist-action-btn"
            id={`wishlist-add-cart-${product._id}`}
            onClick={handleAddToCart}
            disabled={isOutOfStock || isAdding}
          >
            {isAdding ? "Adding..." : isOutOfStock ? "Out of Stock" : inCart ? "Add Another" : "Add to Cart"}
          </button>

          <button
            type="button"
            className="button button-secondary wishlist-action-btn wishlist-remove-btn"
            id={`remove-btn-${product._id}`}
            onClick={handleRemove}
            disabled={removing}
          >
            {removing ? "⏳..." : "Remove ♥"}
          </button>
        </div>
      </div>
    </article>
  );
}
