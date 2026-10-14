import { useState } from "react";
import { Link } from "react-router-dom";
import { toggleWishlist } from "../services/api";
import { useCart } from "../context/CartContext";

export default function ProductCard({
  product,
  isWishlisted: initialWishlisted = false,
  onWishlistToggle
}) {
  const { addToCart, isInCart, getItemQuantity, itemLoading } = useCart();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successNotice, setSuccessNotice] = useState("");

  const isOutOfStock = product.stock <= 0;
  const inCart = isInCart(product._id);
  const qtyInCart = getItemQuantity(product._id);
  const isAddingToCart = !!itemLoading[product._id];

  async function handleToggleWishlist(e) {
    if (e) e.preventDefault();
    if (saving) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessNotice("");

    try {
      const result = await toggleWishlist(product._id);
      const isSaved = result.saved;
      setWishlisted(isSaved);

      if (isSaved) {
        setSuccessNotice("♥ Added to Wishlist");
      } else {
        setSuccessNotice("Removed from Wishlist");
      }

      window.dispatchEvent(new CustomEvent("shopkart:wishlist_changed"));
      if (onWishlistToggle) {
        onWishlistToggle(product._id, isSaved);
      }

      setTimeout(() => {
        setSuccessNotice("");
      }, 3000);
    } catch (err) {
      setErrorMessage(err.message || "Unable to save product. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddToCart(e) {
    if (e) e.preventDefault();
    if (isAddingToCart || isOutOfStock) return;

    setErrorMessage("");
    setSuccessNotice("");

    const res = await addToCart(product._id);
    if (res.success) {
      setSuccessNotice("🛒 Added to Cart!");
      setTimeout(() => {
        setSuccessNotice("");
      }, 3000);
    } else {
      setErrorMessage(res.message || "Unable to add product to cart.");
    }
  }

  return (
    <article className="product-card" id={`product-card-${product._id}`}>
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

        {/* Floating Heart Button on Top-Right of image */}
        <button
          type="button"
          className={`product-floating-wishlist ${wishlisted ? "active" : ""}`}
          onClick={handleToggleWishlist}
          disabled={saving}
          title={wishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
          aria-label={wishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
          id={`floating-wishlist-${product._id}`}
        >
          {wishlisted ? "♥" : "♡"}
        </button>
      </div>

      <div className="product-card-body">
        <h3 className="product-card-title">{product.name}</h3>

        <div className="product-card-meta">
          <span className="product-card-price">₹{Number(product.price).toLocaleString("en-IN")}</span>
          <span className={`product-card-stock ${isOutOfStock ? "out-of-stock" : ""}`}>
            {isOutOfStock ? "Out of stock" : `${product.stock} units left`}
          </span>
        </div>

        {/* Error message if API call fails */}
        {errorMessage && (
          <div className="card-inline-error" role="alert">
            {errorMessage}
          </div>
        )}

        {/* Success transient notice */}
        {successNotice && (
          <div className="card-inline-success">
            {successNotice}
          </div>
        )}

        <div className="product-card-actions">
          {/* Add to Cart Primary Button */}
          <button
            type="button"
            className="button button-primary product-btn-cart"
            onClick={handleAddToCart}
            disabled={isOutOfStock || isAddingToCart}
            id={`add-to-cart-btn-${product._id}`}
          >
            {isAddingToCart
              ? "Adding..."
              : isOutOfStock
              ? "Out of Stock"
              : inCart
              ? `Add Another (${qtyInCart})`
              : "Add to Cart"}
          </button>

          <Link
            to={`/products/${product._id}`}
            className="button button-secondary product-btn-view"
            id={`view-details-${product._id}`}
          >
            Details
          </Link>

          <button
            type="button"
            className={`button ${wishlisted ? "button-wishlisted" : "button-wishlist"} product-btn-wishlist`}
            onClick={handleToggleWishlist}
            disabled={saving}
            id={`wishlist-btn-${product._id}`}
            title="Wishlist"
          >
            {saving ? "⏳" : wishlisted ? "♥" : "♡"}
          </button>
        </div>
      </div>
    </article>
  );
}
