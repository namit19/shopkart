export default function SearchBar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  sort,
  onSortChange
}) {
  return (
    <section className="search-filter-bar" aria-label="Product search and filters">
      <div className="search-input-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder="Search products..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search products"
        />
        {search && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => onSearchChange("")}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <div className="filter-dropdowns">
        <select
          className="filter-select"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="All">All Categories</option>
          <option value="Electronics">Electronics</option>
          <option value="Fashion">Fashion</option>
          <option value="Books">Books</option>
          <option value="Home">Home</option>
        </select>

        <select
          className="filter-select"
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          aria-label="Sort products by price"
        >
          <option value="">Sort by Price</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>
    </section>
  );
}
