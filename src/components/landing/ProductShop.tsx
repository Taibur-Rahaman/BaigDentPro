import React from 'react';
import type { LandingCategory, LandingProductRow } from '@/components/landing/shopTypes';

export interface ProductShopProps {
  categories: LandingCategory[];
  products: LandingProductRow[];
  loading: boolean;
  selectedCategory: string | null;
  searchQuery: string;
  onSelectCategory: (id: string | null) => void;
  onSearchChange: (value: string) => void;
  onAddToCart: (product: LandingProductRow) => void;
  getCategoryIcon: (category: string) => string;
}

export const ProductShop: React.FC<ProductShopProps> = ({
  categories,
  products,
  loading,
  selectedCategory,
  searchQuery,
  onSelectCategory,
  onSearchChange,
  onAddToCart,
  getCategoryIcon,
}) => (
  <section id="shop" className="bdp-section bdp-shop">
    <div className="bdp-section__inner">
      <header className="bdp-section__header">
        <div className="bdp-eyebrow">
          <i className="fa-solid fa-shopping-bag" aria-hidden />
          <span>Retail & supplies</span>
        </div>
        <h2 className="bdp-h2">
          <span className="bdp-gradient">Dental shop</span> for your patients & practice
        </h2>
        <p className="bdp-subtitle">
          Browse consumables and patient-friendly products and checkout online with cash on delivery where available. No account required for storefront purchases.
        </p>
      </header>

      <div className="bdp-shop__toolbar">
        <div className="bdp-search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden />
          <input
            type="search"
            placeholder="Search products…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="bdp-cats">
          <button
            type="button"
            className={`bdp-cat${selectedCategory === null ? ' bdp-cat--active' : ''}`}
            onClick={() => onSelectCategory(null)}
          >
            <i className="fa-solid fa-border-all" aria-hidden />
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`bdp-cat${selectedCategory === cat.id ? ' bdp-cat--active' : ''}`}
              onClick={() => onSelectCategory(cat.id)}
            >
              <span aria-hidden>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="bdp-products">
        {loading ? (
          <div className="bdp-loading">
            <div className="bdp-spinner" />
            <p>Loading products…</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bdp-empty">
            <p>No products found.</p>
          </div>
        ) : (
          products.map((product) => (
            <article key={product.id} className="bdp-product">
              <div style={{ position: 'relative' }}>
                {product.isFeatured ? <span className="bdp-product__badge">Featured</span> : null}
                <div className="bdp-product__media">
                  <span className="bdp-product__emoji">{getCategoryIcon(product.category ?? '')}</span>
                  <div className="bdp-product__overlay">
                    <button
                      type="button"
                      className="bdp-product__quick"
                      onClick={() => onAddToCart(product)}
                      disabled={product.stock === 0}
                      aria-label={`Add ${product.name} to cart`}
                    >
                      <i className="fa-solid fa-plus" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
              <div className="bdp-product__body">
                <h3 className="bdp-product__name">{product.name}</h3>
                <p className="bdp-product__desc">{product.description ?? ''}</p>
                <div className="bdp-product__row">
                  <div>
                    <span className="bdp-price">৳{product.price.toLocaleString()}</span>
                    {product.comparePrice != null && (
                      <span className="bdp-price--strike">৳{product.comparePrice.toLocaleString()}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="bdp-btn bdp-btn--primary bdp-btn--sm"
                    onClick={() => onAddToCart(product)}
                    disabled={product.stock === 0}
                  >
                    {product.stock === 0 ? 'Sold out' : 'Add to cart'}
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  </section>
);
