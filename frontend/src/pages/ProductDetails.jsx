import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getProductById, getWishlist, toggleWishlist } from "../services/api";
import { useCart } from "../context/CartContext";

export default function ProductDetails() {
  const { id } = useParams();
  const { addToCart, isInCart, getItemQuantity, itemLoading } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartNotice, setCartNotice] = useState("");
  const [cartError, setCartError] = useState("");

  // Wishlist state
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistError, setWishlistError] = useState("");
  const [wishlistNotice, setWishlistNotice] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    getProductById(id)
      .then((data) => {
        if (active) {
          setProduct(data.product || data);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to load product details.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    // Check if item is already in user's wishlist
    getWishlist()
      .then((data) => {
        if (active && data.wishlist) {
          const found = data.wishlist.some((item) => item._id === id);
          setIsWishlisted(found);
        }
      })
      .catch(() => {
        // Silently ignore if unauthenticated
      });

    return () => {
      active = false;
    };
  }, [id]);

  const inCart = isInCart(id);
  const qtyInCart = getItemQuantity(id);
  const isAddingToCart = !!itemLoading[id];

  const handleAddToCart = async () => {
    if (isAddingToCart || !product || product.stock <= 0) return;
    setCartNotice("");
    setCartError("");

    const res = await addToCart(id);
    if (res.success) {
      setCartNotice("🛒 Added to Cart!");
      setTimeout(() => setCartNotice(""), 3000);
    } else {
      setCartError(res.message);
    }
  };

  const handleToggleWishlist = async () => {
    if (wishlistLoading) return;
    setWishlistLoading(true);
    setWishlistError("");
    setWishlistNotice("");

    try {
      const res = await toggleWishlist(id);
      setIsWishlisted(res.saved);
      setWishlistNotice(res.saved ? "♥ Added to Wishlist" : "Removed from Wishlist");
      window.dispatchEvent(new CustomEvent("shopkart:wishlist_changed"));
      setTimeout(() => setWishlistNotice(""), 3000);
    } catch (err) {
      setWishlistError(err.message || "Unable to update wishlist. Please try again.");
    } finally {
      setWishlistLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="container product-details-page">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/products">← Back to Products</Link>
        </nav>

        {loading ? (
          <div className="state-box" role="status">
            <p className="state-message">Loading product details...</p>
          </div>
        ) : error || !product ? (
          <div className="state-box error-box" role="alert">
            <p className="state-message">{error || "Product not found."}</p>
            <Link to="/products" className="button button-secondary button-small">
              Return to Catalog
            </Link>
          </div>
        ) : (
          <section className="product-details-card">
            <div className="product-details-image-wrap">
              <img
                src={product.image}
                alt={product.name}
                className="product-details-image"
                onError={(e) => {
                  e.target.src = "https://placehold.co/600x450?text=Product+Image";
                }}
              />
            </div>

            <div className="product-details-info">
              <span className="product-details-category">{product.category}</span>
              <h1 className="product-details-title">{product.name}</h1>
              <p className="product-details-price">₹{product.price.toLocaleString("en-IN")}</p>

              <div className="product-details-stock">
                <span className="stock-label">Availability:</span>
                <span className={`stock-badge ${product.stock <= 0 ? "out-of-stock" : ""}`}>
                  {product.stock > 0 ? `${product.stock} units in stock` : "Out of stock"}
                </span>
              </div>

              <div className="product-details-desc">
                <h3>About this item</h3>
                <p>{product.description}</p>
              </div>

              {wishlistError && (
                <div className="card-inline-error" role="alert" style={{ marginBottom: "12px" }}>
                  {wishlistError}
                </div>
              )}

              {wishlistNotice && (
                <div className="card-inline-success" style={{ marginBottom: "12px" }}>
                  {wishlistNotice}
                </div>
              )}

              {cartError && (
                <div className="card-inline-error" role="alert" style={{ marginBottom: "12px" }}>
                  {cartError}
                </div>
              )}

              {cartNotice && (
                <div className="card-inline-success" style={{ marginBottom: "12px" }}>
                  {cartNotice}
                </div>
              )}

              <div className="product-details-actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="button button-primary button-large"
                  disabled={product.stock <= 0 || isAddingToCart}
                  onClick={handleAddToCart}
                  id="product-detail-add-cart-btn"
                >
                  {isAddingToCart
                    ? "Adding..."
                    : product.stock <= 0
                    ? "Out of Stock"
                    : inCart
                    ? `Add Another (${qtyInCart} in Cart)`
                    : "Add to Cart"}
                </button>

                <button
                  type="button"
                  className={`button button-large ${isWishlisted ? "button-wishlisted" : "button-secondary"}`}
                  onClick={handleToggleWishlist}
                  disabled={wishlistLoading}
                  id="product-detail-wishlist-btn"
                >
                  {wishlistLoading
                    ? "⏳ Saving..."
                    : isWishlisted
                    ? "♥ In Wishlist"
                    : "♡ Add to Wishlist"}
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
