import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";
import { getProducts, getWishlist } from "../services/api";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("");

  // Track which product IDs are in the user's wishlist
  const [wishlistIds, setWishlistIds] = useState(new Set());

  // Fetch current user's wishlist IDs on mount
  useEffect(() => {
    let active = true;
    getWishlist()
      .then((data) => {
        if (active && data.wishlist) {
          setWishlistIds(new Set(data.wishlist.map((item) => item._id)));
        }
      })
      .catch(() => {
        // Silently ignore if not logged in or in preview
      });

    return () => {
      active = false;
    };
  }, []);

  // Fetch products whenever search, category, or sort changes
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    // Debounce search slightly so typing feels smooth
    const timer = setTimeout(() => {
      getProducts({ search, category, sort })
        .then((data) => {
          if (active) {
            setProducts(data.products || []);
          }
        })
        .catch((err) => {
          if (active) {
            setError(err.message || "Something went wrong while loading products.");
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, category, sort]);

  const handleWishlistToggle = (productId, saved) => {
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (saved) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      return next;
    });
  };

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="container products-page">
        <header className="page-header">
          <div>
            <h1 className="page-title">Product Catalog</h1>
            <p className="page-subtitle">Discover good finds for everyday life.</p>
          </div>
        </header>

        {/* Search, Category Filter, and Price Sort */}
        <SearchBar
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={setCategory}
          sort={sort}
          onSortChange={setSort}
        />

        {/* Content Area with Loading, Error, and Empty States */}
        {loading ? (
          <div className="state-box" role="status">
            <p className="state-message">Loading products...</p>
          </div>
        ) : error ? (
          <div className="state-box error-box" role="alert">
            <p className="state-message">Something went wrong while loading products.</p>
            <p className="state-submessage">{error}</p>
            <button
              className="button button-secondary button-small"
              onClick={() => {
                setLoading(true);
                setError("");
                getProducts({ search, category, sort })
                  .then((data) => setProducts(data.products || []))
                  .catch((err) => setError(err.message))
                  .finally(() => setLoading(false));
              }}
            >
              Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="state-box empty-box">
            <p className="state-message">No products found.</p>
            <p className="state-submessage">Try adjusting your search or category filter.</p>
          </div>
        ) : (
          <div className="products-grid">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                isWishlisted={wishlistIds.has(product._id)}
                onWishlistToggle={handleWishlistToggle}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
