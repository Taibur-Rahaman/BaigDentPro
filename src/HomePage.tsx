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
        { id: '1', name: 'Oral-B Electric Toothbrush', slug: 'oral-b', description: 'Advanced electric toothbrush', price: 2500, images: [], category: 'TOOTHBRUSH', stock: 50, isFeatured: true },
        { id: '2', name: 'Colgate Total Toothpaste', slug: 'colgate', description: '12-hour protection', price: 180, images: [], category: 'TOOTHPASTE', stock: 100, isFeatured: false },
        { id: '3', name: 'Listerine Mouthwash 500ml', slug: 'listerine', description: 'Antiseptic mouthwash', price: 350, images: [], category: 'MOUTHWASH', stock: 75, isFeatured: true },
        { id: '4', name: 'Crest Whitening Strips', slug: 'crest', description: 'Professional whitening', price: 3500, images: [], category: 'WHITENING', stock: 30, isFeatured: true },
        { id: '5', name: 'Waterpik Water Flosser', slug: 'waterpik', description: 'Deep cleaning', price: 5500, images: [], category: 'DENTAL_TOOLS', stock: 25, isFeatured: true },
        { id: '6', name: 'Sensodyne Repair', slug: 'sensodyne', description: 'For sensitive teeth', price: 220, images: [], category: 'TOOTHPASTE', stock: 90, isFeatured: false },
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

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      TOOTHBRUSH: '🪥', TOOTHPASTE: '🦷', MOUTHWASH: '🧴', DENTAL_FLOSS: '🧵',
      WHITENING: '✨', DENTAL_TOOLS: '🔧', CLINIC_SUPPLIES: '🏥', ORTHODONTIC: '😁',
      KIDS_DENTAL: '👶', OTHER: '📦',
    };
    return icons[category] || '📦';
  };

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-content">
          <div className="home-logo">
            <i className="fa-solid fa-tooth"></i>
            <span>BaigMed</span>
          </div>
          <nav className="home-nav">
            <a href="#shop" className="nav-link">Shop</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#contact" className="nav-link">Contact</a>
          </nav>
          <div className="home-actions">
            <button className="cart-btn" onClick={() => setShowCart(true)}>
              <i className="fa-solid fa-shopping-cart"></i>
              {cart.items.length > 0 && <span className="cart-count">{cart.items.length}</span>}
            </button>
            <button className="btn-primary" onClick={onLoginClick}>
              <i className="fa-solid fa-user-doctor"></i> Dentist Login
            </button>
          </div>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-content">
          <h1>Professional Dental Management System</h1>
          <p>Complete clinic management with patient records, appointments, prescriptions, billing, and more. Plus, shop quality dental products online!</p>
          <div className="hero-buttons">
            <button className="btn-primary btn-lg" onClick={onLoginClick}>
              <i className="fa-solid fa-sign-in-alt"></i> Login to Dentist Panel
            </button>
            <a href="#shop" className="btn-secondary btn-lg">
              <i className="fa-solid fa-shopping-bag"></i> Browse Shop
            </a>
          </div>
        </div>
        <div className="hero-features-grid">
          <div className="hero-feature-card">
            <i className="fa-solid fa-users"></i>
            <h3>Patient Management</h3>
            <p>Complete patient records, history, and dental charts</p>
          </div>
          <div className="hero-feature-card">
            <i className="fa-solid fa-calendar-check"></i>
            <h3>Appointments</h3>
            <p>Schedule with SMS & WhatsApp reminders</p>
          </div>
          <div className="hero-feature-card">
            <i className="fa-solid fa-prescription"></i>
            <h3>Prescriptions</h3>
            <p>Digital prescriptions with PDF & email delivery</p>
          </div>
          <div className="hero-feature-card">
            <i className="fa-solid fa-file-invoice-dollar"></i>
            <h3>Billing</h3>
            <p>Invoices, payments, and financial tracking</p>
          </div>
          <div className="hero-feature-card">
            <i className="fa-solid fa-flask"></i>
            <h3>Lab Tracking</h3>
            <p>Track crowns, bridges, dentures, and more</p>
          </div>
          <div className="hero-feature-card">
            <i className="fa-solid fa-store"></i>
            <h3>Online Shop</h3>
            <p>Sell dental products directly to patients</p>
          </div>
        </div>
      </section>

      <section id="shop" className="shop-section">
        <div className="shop-header">
          <h2><i className="fa-solid fa-store"></i> Dental Shop</h2>
          <p>Quality dental products delivered to your doorstep - no account required!</p>
        </div>

        <div className="shop-toolbar">
          <div className="search-box">
            <i className="fa-solid fa-search"></i>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="category-filters">
            <button
              className={`category-btn ${!selectedCategory ? 'active' : ''}`}
              onClick={() => setSelectedCategory(null)}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="products-grid">
          {loading ? (
            <div className="loading">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="no-products">No products found</div>
          ) : (
            products.map((product) => (
              <div key={product.id} className="product-card">
                {product.isFeatured && <span className="featured-badge">Featured</span>}
                <div className="product-image">
                  {product.images ? (
                    <img src={product.images} alt={product.name} />
                  ) : (
                    <div className="product-placeholder">{getCategoryIcon(product.category)}</div>
                  )}
                </div>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <div className="product-price">
                    <span className="price">৳{product.price}</span>
                    {product.comparePrice && (
                      <span className="compare-price">৳{product.comparePrice}</span>
                    )}
                  </div>
                  <button
                    className="btn-primary add-to-cart"
                    onClick={() => addToCart(product)}
                    disabled={product.stock === 0}
                  >
                    {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section id="features" className="features-section">
        <h2>Why Choose BaigMed?</h2>
        <div className="features-grid">
          <div className="feature-item">
            <i className="fa-solid fa-shield-check"></i>
            <h3>Secure & Reliable</h3>
            <p>Your patient data is encrypted and stored securely</p>
          </div>
          <div className="feature-item">
            <i className="fa-solid fa-mobile-alt"></i>
            <h3>SMS & WhatsApp</h3>
            <p>Automated reminders and prescription delivery</p>
          </div>
          <div className="feature-item">
            <i className="fa-solid fa-file-pdf"></i>
            <h3>PDF Generation</h3>
            <p>Professional prescriptions and invoices</p>
          </div>
          <div className="feature-item">
            <i className="fa-solid fa-chart-bar"></i>
            <h3>Analytics</h3>
            <p>Track revenue, appointments, and patient growth</p>
          </div>
        </div>
      </section>

      <section id="contact" className="contact-section">
        <h2>Get Started Today</h2>
        <p>Join hundreds of dental clinics using BaigMed</p>
        <button className="btn-primary btn-lg" onClick={onLoginClick}>
          <i className="fa-solid fa-rocket"></i> Start Free Trial
        </button>
      </section>

      <footer className="home-footer">
        <p>© 2024 BaigMed • Omix Solutions • All Rights Reserved</p>
        <div className="footer-links">
          <a href="https://wa.me/8801617180711" target="_blank" rel="noopener noreferrer">
            <i className="fa-brands fa-whatsapp"></i> WhatsApp
          </a>
          <a href="mailto:info@baigmed.com">
            <i className="fa-solid fa-envelope"></i> Email
          </a>
        </div>
      </footer>

      {showCart && (
        <div className="modal-overlay" onClick={() => setShowCart(false)}>
          <div className="cart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-shopping-cart"></i> Your Cart</h3>
              <button className="close-btn" onClick={() => setShowCart(false)}>×</button>
            </div>
            <div className="cart-items">
              {cart.items.length === 0 ? (
                <p className="empty-cart">Your cart is empty</p>
              ) : (
                cart.items.map((item) => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-info">
                      <span className="cart-item-name">{item.product.name}</span>
                      <span className="cart-item-price">৳{item.product.price}</span>
                    </div>
                    <div className="cart-item-qty">
                      <button onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}>+</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {cart.items.length > 0 && (
              <>
                <div className="cart-total">
                  <span>Total:</span>
                  <span>৳{cart.total}</span>
                </div>
                <button className="btn-primary checkout-btn" onClick={() => { setShowCart(false); setShowCheckout(true); }}>
                  Proceed to Checkout
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showCheckout && (
        <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
          <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-credit-card"></i> Checkout</h3>
              <button className="close-btn" onClick={() => setShowCheckout(false)}>×</button>
            </div>
            <form onSubmit={handleCheckout} className="checkout-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={checkoutData.customerName}
                    onChange={(e) => setCheckoutData({ ...checkoutData, customerName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    value={checkoutData.customerPhone}
                    onChange={(e) => setCheckoutData({ ...checkoutData, customerPhone: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Email (Optional)</label>
                <input
                  type="email"
                  value={checkoutData.customerEmail}
                  onChange={(e) => setCheckoutData({ ...checkoutData, customerEmail: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Shipping Address *</label>
                <textarea
                  value={checkoutData.shippingAddress}
                  onChange={(e) => setCheckoutData({ ...checkoutData, shippingAddress: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    value={checkoutData.shippingCity}
                    onChange={(e) => setCheckoutData({ ...checkoutData, shippingCity: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Zip Code</label>
                  <input
                    type="text"
                    value={checkoutData.shippingZip}
                    onChange={(e) => setCheckoutData({ ...checkoutData, shippingZip: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
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
              <div className="order-summary">
                <h4>Order Summary</h4>
                {cart.items.map((item) => (
                  <div key={item.id} className="summary-item">
                    <span>{item.product.name} × {item.quantity}</span>
                    <span>৳{item.product.price * item.quantity}</span>
                  </div>
                ))}
                <div className="summary-total">
                  <span>Total:</span>
                  <span>৳{cart.total}</span>
                </div>
              </div>
              <button type="submit" className="btn-primary place-order-btn">
                <i className="fa-solid fa-check"></i> Place Order
              </button>
            </form>
          </div>
        </div>
      )}

      {orderSuccess && (
        <div className="modal-overlay" onClick={() => setOrderSuccess(null)}>
          <div className="success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon">✓</div>
            <h3>Order Placed Successfully!</h3>
            <p>Your order number is: <strong>{orderSuccess}</strong></p>
            <p>We'll contact you shortly to confirm your order.</p>
            <button className="btn-primary" onClick={() => setOrderSuccess(null)}>Continue Shopping</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
