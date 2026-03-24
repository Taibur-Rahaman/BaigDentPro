import React, { useState, useEffect } from 'react';
import api from './api';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  comparePrice?: number;
  images?: string | null;
  category: string;
  stock: number;
  isFeatured: boolean;
}

interface CartItem {
  id: string;
  product: Product;
  quantity: number;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

interface HomePageProps {
  onLoginClick: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onLoginClick }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<{ items: CartItem[]; total: number }>({ items: [], total: 0 });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutData, setCheckoutData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    shippingAddress: '',
    shippingCity: '',
    shippingState: '',
    shippingZip: '',
    paymentMethod: 'COD',
    notes: '',
  });
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedCategory, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes, cartRes] = await Promise.all([
        api.shop.products({ category: selectedCategory || undefined, search: searchQuery || undefined }),
        api.shop.categories(),
        api.shop.cart(),
      ]);
      setProducts(productsRes.products);
      setCategories(categoriesRes);
      setCart({ items: cartRes.items, total: cartRes.total });
    } catch (error) {
      console.log('API not available, using demo mode');
      setCategories([
        { id: 'TOOTHBRUSH', name: 'Toothbrush', icon: '🪥', count: 5 },
        { id: 'TOOTHPASTE', name: 'Toothpaste', icon: '🦷', count: 8 },
        { id: 'MOUTHWASH', name: 'Mouthwash', icon: '🧴', count: 4 },
        { id: 'DENTAL_FLOSS', name: 'Dental Floss', icon: '🧵', count: 3 },
        { id: 'WHITENING', name: 'Whitening Kits', icon: '✨', count: 6 },
        { id: 'DENTAL_TOOLS', name: 'Dental Tools', icon: '🔧', count: 10 },
      ]);
      setProducts([
        { id: '1', name: 'Oral-B Electric Toothbrush', slug: 'oral-b', description: 'Advanced electric toothbrush with smart sensors', price: 2500, images: null, category: 'TOOTHBRUSH', stock: 50, isFeatured: true },
        { id: '2', name: 'Colgate Total Toothpaste', slug: 'colgate', description: '12-hour antibacterial protection', price: 180, images: null, category: 'TOOTHPASTE', stock: 100, isFeatured: false },
        { id: '3', name: 'Listerine Mouthwash 500ml', slug: 'listerine', description: 'Advanced antiseptic formula', price: 350, images: null, category: 'MOUTHWASH', stock: 75, isFeatured: true },
        { id: '4', name: 'Crest Whitening Strips', slug: 'crest', description: 'Professional-grade whitening', price: 3500, images: null, category: 'WHITENING', stock: 30, isFeatured: true },
        { id: '5', name: 'Waterpik Water Flosser', slug: 'waterpik', description: 'Advanced water flossing technology', price: 5500, images: null, category: 'DENTAL_TOOLS', stock: 25, isFeatured: true },
        { id: '6', name: 'Sensodyne Repair', slug: 'sensodyne', description: 'For sensitive teeth protection', price: 220, images: null, category: 'TOOTHPASTE', stock: 90, isFeatured: false },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (product: Product) => {
    try {
      const result = await api.shop.addToCart(product.id, 1);
      setCart({ items: result.items, total: result.total });
    } catch {
      const existingItem = cart.items.find(item => item.product.id === product.id);
      if (existingItem) {
        existingItem.quantity++;
      } else {
        cart.items.push({ id: product.id, product, quantity: 1 });
      }
      const total = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      setCart({ ...cart, total });
    }
  };

  const updateCartQuantity = async (productId: string, quantity: number) => {
    try {
      const result = await api.shop.updateCart(productId, quantity);
      setCart({ items: result.items, total: result.total });
    } catch {
      const item = cart.items.find(i => i.product.id === productId);
      if (item) {
        if (quantity <= 0) {
          cart.items = cart.items.filter(i => i.product.id !== productId);
        } else {
          item.quantity = quantity;
        }
        const total = cart.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
        setCart({ ...cart, total });
      }
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const order = await api.shop.checkout(checkoutData);
      setOrderSuccess(order.orderNo);
      setCart({ items: [], total: 0 });
      setShowCheckout(false);
    } catch (error: any) {
      alert(error.message || 'Checkout failed');
    }
  };

  const handleChoosePlan = (plan: { id: string; name: string; price: number }) => {
    const subscriptionProduct: Product = {
      id: plan.id,
      name: `${plan.name} Plan`,
      slug: plan.id.toLowerCase(),
      description: `Monthly ${plan.name} subscription for BaigDentPro`,
      price: plan.price,
      images: null,
      category: 'SUBSCRIPTION',
      stock: 9999,
      isFeatured: false,
    };

    const existingItem = cart.items.find((item) => item.product.id === subscriptionProduct.id);
    let nextItems: CartItem[];

    if (existingItem) {
      nextItems = cart.items.map((item) =>
        item.product.id === subscriptionProduct.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      nextItems = [...cart.items, { id: subscriptionProduct.id, product: subscriptionProduct, quantity: 1 }];
    }

    const total = nextItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    setCart({ items: nextItems, total });
    setShowCart(false);
    setShowCheckout(true);
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      TOOTHBRUSH: '🪥', TOOTHPASTE: '🦷', MOUTHWASH: '🧴', DENTAL_FLOSS: '🧵',
      WHITENING: '✨', DENTAL_TOOLS: '🔧', CLINIC_SUPPLIES: '🏥', ORTHODONTIC: '😁',
      KIDS_DENTAL: '👶', OTHER: '📦',
    };
    return icons[category] || '📦';
  };

  return (
    <div className="neo-home">
      {/* Animated Background */}
      <div className="neo-bg-grid"></div>
      <div className="neo-bg-glow neo-bg-glow-1"></div>
      <div className="neo-bg-glow neo-bg-glow-2"></div>
      <div className="neo-bg-glow neo-bg-glow-3"></div>

      {/* Header */}
      <header className="neo-header">
        <div className="neo-header-content">
          <div className="neo-logo">
            <img src="/logo.png" alt="BaigDentPro" className="neo-logo-img" />
          </div>
          <nav className="neo-nav">
            <a href="#hero" className="neo-nav-link">Home</a>
            <a href="#shop" className="neo-nav-link">Shop</a>
            <a href="#features" className="neo-nav-link">Features</a>
            <a href="#pricing" className="neo-nav-link">Pricing</a>
          </nav>
          <div className="neo-header-actions">
            <button className="neo-cart-btn" onClick={() => setShowCart(true)}>
              <i className="fa-solid fa-shopping-cart"></i>
              {cart.items.length > 0 && <span className="neo-cart-badge">{cart.items.length}</span>}
            </button>
            <button className="neo-btn neo-btn-primary" onClick={onLoginClick}>
              <i className="fa-solid fa-user-doctor"></i>
              <span>Dentist Portal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero" className="neo-hero">
        <div className="neo-hero-content">
          <div className="neo-hero-badge">
            <i className="fa-solid fa-sparkles"></i>
            <span>Next-Gen Dental Management</span>
          </div>
          <h1 className="neo-hero-title">
            <span className="neo-gradient-text">Revolutionary</span> Dental
            <br />Practice Management
          </h1>
          <p className="neo-hero-subtitle">
            Experience the future of dental clinic operations. AI-powered scheduling, 
            seamless patient management, and integrated e-commerce — all in one beautiful platform.
          </p>
          <div className="neo-hero-buttons">
            <button className="neo-btn neo-btn-primary neo-btn-lg" onClick={onLoginClick}>
              <i className="fa-solid fa-rocket"></i>
              <span>Launch Dashboard</span>
            </button>
            <a href="#shop" className="neo-btn neo-btn-secondary neo-btn-lg">
              <i className="fa-solid fa-store"></i>
              <span>Explore Shop</span>
            </a>
          </div>
          <div className="neo-hero-stats">
            <div className="neo-hero-stat">
              <span className="neo-hero-stat-value">500+</span>
              <span className="neo-hero-stat-label">Clinics Trust Us</span>
            </div>
            <div className="neo-hero-stat-divider"></div>
            <div className="neo-hero-stat">
              <span className="neo-hero-stat-value">50K+</span>
              <span className="neo-hero-stat-label">Patients Served</span>
            </div>
            <div className="neo-hero-stat-divider"></div>
            <div className="neo-hero-stat">
              <span className="neo-hero-stat-value">99.9%</span>
              <span className="neo-hero-stat-label">Uptime</span>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="neo-features-orbit">
          <div className="neo-feature-card neo-feature-card-1">
            <div className="neo-feature-icon">
              <i className="fa-solid fa-user-group"></i>
            </div>
            <h3>Patient Management</h3>
            <p>Complete records & dental charts</p>
          </div>
          <div className="neo-feature-card neo-feature-card-2">
            <div className="neo-feature-icon">
              <i className="fa-solid fa-calendar-check"></i>
            </div>
            <h3>Smart Scheduling</h3>
            <p>AI-powered appointments</p>
          </div>
          <div className="neo-feature-card neo-feature-card-3">
            <div className="neo-feature-icon">
              <i className="fa-solid fa-prescription"></i>
            </div>
            <h3>Digital Rx</h3>
            <p>E-prescriptions & PDF delivery</p>
          </div>
          <div className="neo-feature-card neo-feature-card-4">
            <div className="neo-feature-icon">
              <i className="fa-solid fa-credit-card"></i>
            </div>
            <h3>Smart Billing</h3>
            <p>Invoices & payment tracking</p>
          </div>
          <div className="neo-feature-card neo-feature-card-5">
            <div className="neo-feature-icon">
              <i className="fa-solid fa-flask-vial"></i>
            </div>
            <h3>Lab Tracking</h3>
            <p>Crown, bridge & denture orders</p>
          </div>
          <div className="neo-feature-card neo-feature-card-6">
            <div className="neo-feature-icon">
              <i className="fa-solid fa-store"></i>
            </div>
            <h3>Shop</h3>
            <p>Sell products online</p>
          </div>
        </div>
      </section>

      {/* Shop Section */}
      <section id="shop" className="neo-shop">
        <div className="neo-section-header">
          <div className="neo-section-badge">
            <i className="fa-solid fa-shopping-bag"></i>
            <span>Premium Products</span>
          </div>
          <h2 className="neo-section-title">
            <span className="neo-gradient-text">Dental</span> Shop
          </h2>
          <p className="neo-section-subtitle">
            Quality dental products delivered to your doorstep — no account required
          </p>
        </div>

        <div className="neo-shop-toolbar">
          <div className="neo-search-box">
            <i className="fa-solid fa-search"></i>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="neo-category-filters">
            <button
              className={`neo-category-btn ${!selectedCategory ? 'active' : ''}`}
              onClick={() => setSelectedCategory(null)}
            >
              <i className="fa-solid fa-grid-2"></i>
              <span>All</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`neo-category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span className="neo-category-icon">{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="neo-products-grid">
          {loading ? (
            <div className="neo-loading">
              <div className="neo-loading-spinner"></div>
              <p>Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="neo-empty">
              <i className="fa-solid fa-box-open"></i>
              <p>No products found</p>
            </div>
          ) : (
            products.map((product) => (
              <div key={product.id} className="neo-product-card">
                {product.isFeatured && (
                  <div className="neo-featured-badge">
                    <i className="fa-solid fa-star"></i> Featured
                  </div>
                )}
                <div className="neo-product-image">
                  <div className="neo-product-placeholder">
                    <span>{getCategoryIcon(product.category)}</span>
                  </div>
                  <div className="neo-product-overlay">
                    <button 
                      className="neo-quick-add"
                      onClick={() => addToCart(product)}
                      disabled={product.stock === 0}
                    >
                      <i className="fa-solid fa-plus"></i>
                    </button>
                  </div>
                </div>
                <div className="neo-product-info">
                  <h3 className="neo-product-name">{product.name}</h3>
                  <p className="neo-product-desc">{product.description}</p>
                  <div className="neo-product-footer">
                    <div className="neo-product-price">
                      <span className="neo-price">৳{product.price.toLocaleString()}</span>
                      {product.comparePrice && (
                        <span className="neo-compare-price">৳{product.comparePrice.toLocaleString()}</span>
                      )}
                    </div>
                    <button
                      className="neo-btn neo-btn-primary neo-btn-sm"
                      onClick={() => addToCart(product)}
                      disabled={product.stock === 0}
                    >
                      {product.stock === 0 ? 'Sold Out' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="neo-why">
        <div className="neo-section-header">
          <div className="neo-section-badge">
            <i className="fa-solid fa-gem"></i>
            <span>Why Choose Us</span>
          </div>
          <h2 className="neo-section-title">
            Built for <span className="neo-gradient-text">Excellence</span>
          </h2>
        </div>

        <div className="neo-why-grid">
          <div className="neo-why-card">
            <div className="neo-why-icon">
              <i className="fa-solid fa-shield-check"></i>
            </div>
            <h3>Bank-Level Security</h3>
            <p>Your patient data is encrypted with AES-256 and stored securely in the cloud</p>
          </div>
          <div className="neo-why-card">
            <div className="neo-why-icon">
              <i className="fa-brands fa-whatsapp"></i>
            </div>
            <h3>WhatsApp & SMS</h3>
            <p>Automated appointment reminders and prescription delivery via messaging</p>
          </div>
          <div className="neo-why-card">
            <div className="neo-why-icon">
              <i className="fa-solid fa-file-pdf"></i>
            </div>
            <h3>PDF Generation</h3>
            <p>Professional prescriptions and invoices generated instantly</p>
          </div>
          <div className="neo-why-card">
            <div className="neo-why-icon">
              <i className="fa-solid fa-chart-line"></i>
            </div>
            <h3>Smart Analytics</h3>
            <p>Track revenue, appointments, and patient growth with visual dashboards</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="neo-cta">
        <div className="neo-cta-content neo-pricing">
          <div className="neo-pricing-header">
            <p className="neo-pricing-badge-title">MONTHLY PLANS • CANCEL ANYTIME</p>
            <h2 className="neo-cta-title">Pick a plan that matches your clinic</h2>
            <p className="neo-cta-subtitle">
              Every plan includes secure cloud backup, digital prescriptions, and full patient records. Start with Platinum and upgrade as your team and devices grow.
            </p>
          </div>

          <div className="neo-pricing-grid">
            {/* Platinum */}
            <div className="neo-pricing-card">
              <div className="neo-pricing-card-header">
                <h3 className="neo-pricing-name">Platinum</h3>
                <p className="neo-pricing-desc">For solo dentists or a single reception PC</p>
                <div className="neo-pricing-discount-pill">1 device</div>
              </div>
              <div className="neo-pricing-price-block">
                <div className="neo-pricing-price-main">
                  <span className="neo-pricing-price-value">৳700</span>
                  <span className="neo-pricing-price-period">/month</span>
                </div>
                <p className="neo-pricing-small">Billed monthly in BDT. Best for one‑chair or home practice setups.</p>
              </div>
              <button
                className="neo-btn neo-btn-outline neo-btn-block"
                onClick={() => handleChoosePlan({ id: 'PLAN_PLATINUM', name: 'Platinum', price: 700 })}
              >
                Choose Platinum
              </button>
              <ul className="neo-pricing-features">
                <li><i className="fa-solid fa-check"></i>Access from 1 clinic device</li>
                <li><i className="fa-solid fa-check"></i>Unlimited patients & prescriptions</li>
                <li><i className="fa-solid fa-check"></i>Print‑ready digital prescriptions (PDF)</li>
                <li><i className="fa-solid fa-check"></i>Simple appointment calendar</li>
                <li><i className="fa-solid fa-check"></i>Basic daily collection report</li>
              </ul>
            </div>

            {/* Premium - Most popular */}
            <div className="neo-pricing-card neo-pricing-card-featured">
              <div className="neo-pricing-most-popular">Most popular</div>
              <div className="neo-pricing-card-header">
                <h3 className="neo-pricing-name">Premium</h3>
                <p className="neo-pricing-desc">For busy clinics with multiple rooms and branches</p>
                <div className="neo-pricing-discount-pill">5+ devices and branches</div>
              </div>
              <div className="neo-pricing-price-block">
                <div className="neo-pricing-price-main">
                  <span className="neo-pricing-price-value">৳1,000</span>
                  <span className="neo-pricing-price-period">/month</span>
                </div>
                <p className="neo-pricing-small">Billed monthly in BDT. Ideal when you have separate reception, doctor and counselor PCs or multiple locations.</p>
              </div>
              <button
                className="neo-btn neo-btn-primary neo-btn-block"
                onClick={() => handleChoosePlan({ id: 'PLAN_PREMIUM', name: 'Premium', price: 1000 })}
              >
                Choose Premium
              </button>
              <ul className="neo-pricing-features">
                <li><i className="fa-solid fa-check"></i>Everything in Platinum</li>
                <li><i className="fa-solid fa-check"></i>Access from 5+ devices and branches</li>
                <li><i className="fa-solid fa-check"></i>Role‑based access & activity logs</li>
                <li><i className="fa-solid fa-check"></i>Branch‑wise revenue & chair utilization</li>
                <li><i className="fa-solid fa-check"></i>Custom branding on reports & prescriptions</li>
                <li><i className="fa-solid fa-check"></i>Dedicated onboarding & success manager</li>
              </ul>
            </div>

            {/* Luxury */}
            <div className="neo-pricing-card">
              <div className="neo-pricing-card-header">
                <h3 className="neo-pricing-name">Luxury</h3>
                <p className="neo-pricing-desc">For premium clinics and multi‑branch groups</p>
                <div className="neo-pricing-discount-pill">Up to 5+ devices</div>
              </div>
              <div className="neo-pricing-price-block">
                <div className="neo-pricing-price-main">
                  <span className="neo-pricing-price-value">৳1,500</span>
                  <span className="neo-pricing-price-period">/month</span>
                </div>
                <p className="neo-pricing-small">Billed monthly in BDT. Best when you manage multiple locations or a high‑volume premium brand.</p>
              </div>
              <button
                className="neo-btn neo-btn-outline neo-btn-block"
                onClick={() => handleChoosePlan({ id: 'PLAN_LUXURY', name: 'Luxury', price: 1500 })}
              >
                Choose Luxury
              </button>
              <ul className="neo-pricing-features">
                <li><i className="fa-solid fa-check"></i>Everything in Premium</li>
                <li><i className="fa-solid fa-check"></i>Access from 5+ devices and branches</li>
                <li><i className="fa-solid fa-check"></i>Role‑based access & activity logs</li>
                <li><i className="fa-solid fa-check"></i>Branch‑wise revenue & chair utilization</li>
                <li><i className="fa-solid fa-check"></i>Custom branding on reports & prescriptions</li>
                <li><i className="fa-solid fa-check"></i>Dedicated onboarding & success manager</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="neo-footer">
        <div className="neo-footer-content">
          <div className="neo-footer-brand">
            <div className="neo-logo">
              <img src="/logo.png" alt="BaigDentPro" className="neo-logo-img neo-logo-img-sm" />
            </div>
            <p>Next-generation dental practice management</p>
          </div>
          <div className="neo-footer-links">
            <a href="https://wa.me/8801617180711" target="_blank" rel="noopener noreferrer">
              <i className="fa-brands fa-whatsapp"></i>
              <span>WhatsApp</span>
            </a>
            <a href="mailto:info@baigdentpro.com">
              <i className="fa-solid fa-envelope"></i>
              <span>Email</span>
            </a>
          </div>
        </div>
        <div className="neo-footer-bottom">
          <p>© 2026 BaigDentPro • Omix Solutions • All Rights Reserved</p>
        </div>
      </footer>

      {/* Cart Modal */}
      {showCart && (
        <div className="neo-modal-overlay" onClick={() => setShowCart(false)}>
          <div className="neo-modal neo-cart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="neo-modal-header">
              <h3><i className="fa-solid fa-shopping-cart"></i> Your Cart</h3>
              <button className="neo-modal-close" onClick={() => setShowCart(false)}>
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <div className="neo-modal-body">
              {cart.items.length === 0 ? (
                <div className="neo-cart-empty">
                  <i className="fa-solid fa-cart-shopping"></i>
                  <p>Your cart is empty</p>
                </div>
              ) : (
                <div className="neo-cart-items">
                  {cart.items.map((item) => (
                    <div key={item.id} className="neo-cart-item">
                      <div className="neo-cart-item-info">
                        <span className="neo-cart-item-name">{item.product.name}</span>
                        <span className="neo-cart-item-price">৳{item.product.price.toLocaleString()}</span>
                      </div>
                      <div className="neo-cart-item-qty">
                        <button onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}>
                          <i className="fa-solid fa-minus"></i>
                        </button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}>
                          <i className="fa-solid fa-plus"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {cart.items.length > 0 && (
              <div className="neo-modal-footer">
                <div className="neo-cart-total">
                  <span>Total</span>
                  <span className="neo-cart-total-value">৳{cart.total.toLocaleString()}</span>
                </div>
                <button 
                  className="neo-btn neo-btn-primary neo-btn-block"
                  onClick={() => { setShowCart(false); setShowCheckout(true); }}
                >
                  <i className="fa-solid fa-arrow-right"></i>
                  <span>Proceed to Checkout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="neo-modal-overlay" onClick={() => setShowCheckout(false)}>
          <div className="neo-modal neo-checkout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="neo-modal-header">
              <h3><i className="fa-solid fa-credit-card"></i> Checkout</h3>
              <button className="neo-modal-close" onClick={() => setShowCheckout(false)}>
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCheckout} className="neo-checkout-form">
              <div className="neo-form-row">
                <div className="neo-form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={checkoutData.customerName}
                    onChange={(e) => setCheckoutData({ ...checkoutData, customerName: e.target.value })}
                    required
                  />
                </div>
                <div className="neo-form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    value={checkoutData.customerPhone}
                    onChange={(e) => setCheckoutData({ ...checkoutData, customerPhone: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="neo-form-group">
                <label>Email (Optional)</label>
                <input
                  type="email"
                  value={checkoutData.customerEmail}
                  onChange={(e) => setCheckoutData({ ...checkoutData, customerEmail: e.target.value })}
                />
              </div>
              <div className="neo-form-group">
                <label>Shipping Address *</label>
                <textarea
                  value={checkoutData.shippingAddress}
                  onChange={(e) => setCheckoutData({ ...checkoutData, shippingAddress: e.target.value })}
                  required
                />
              </div>
              <div className="neo-form-row">
                <div className="neo-form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    value={checkoutData.shippingCity}
                    onChange={(e) => setCheckoutData({ ...checkoutData, shippingCity: e.target.value })}
                    required
                  />
                </div>
                <div className="neo-form-group">
                  <label>Zip Code</label>
                  <input
                    type="text"
                    value={checkoutData.shippingZip}
                    onChange={(e) => setCheckoutData({ ...checkoutData, shippingZip: e.target.value })}
                  />
                </div>
              </div>
              <div className="neo-form-group">
                <label>Payment Method</label>
                <select
                  value={checkoutData.paymentMethod}
                  onChange={(e) => setCheckoutData({ ...checkoutData, paymentMethod: e.target.value })}
                >
                  <option value="COD">Cash on Delivery</option>
                  <option value="ONLINE">Online Payment</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
              <div className="neo-order-summary">
                <h4>Order Summary</h4>
                {cart.items.map((item) => (
                  <div key={item.id} className="neo-summary-item">
                    <span>{item.product.name} × {item.quantity}</span>
                    <span>৳{(item.product.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                <div className="neo-summary-total">
                  <span>Total</span>
                  <span>৳{cart.total.toLocaleString()}</span>
                </div>
              </div>
              <button type="submit" className="neo-btn neo-btn-primary neo-btn-block neo-btn-lg">
                <i className="fa-solid fa-check"></i>
                <span>Place Order</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {orderSuccess && (
        <div className="neo-modal-overlay" onClick={() => setOrderSuccess(null)}>
          <div className="neo-modal neo-success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="neo-success-icon">
              <i className="fa-solid fa-check"></i>
            </div>
            <h3>Order Placed Successfully!</h3>
            <p className="neo-success-order">Order #<strong>{orderSuccess}</strong></p>
            <p>We'll contact you shortly to confirm your order.</p>
            <button className="neo-btn neo-btn-primary" onClick={() => setOrderSuccess(null)}>
              <i className="fa-solid fa-shopping-bag"></i>
              <span>Continue Shopping</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
