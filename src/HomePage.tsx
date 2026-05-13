import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import api from './api';
import { useSiteLogo } from '@/hooks/useSiteLogo';
import '@/components/landing/landing-page.css';
import {
  LandingHeader,
  HeroSection,
  StatsSection,
  FeaturesGrid,
  TrustSection,
  PlatformSection,
  WhySection,
  ProductShop,
  PricingCards,
  CTASection,
  LandingFooter,
  StickyMobileCta,
  TrialWhatsAppModal,
  LandingStructuredData,
} from '@/components/landing';
import type { LandingCategory } from '@/components/landing/shopTypes';
import type { PricingPlan } from '@/components/landing/PricingCards';

const TestimonialsSection = lazy(() =>
  import('@/components/landing/TestimonialsSection').then((m) => ({ default: m.TestimonialsSection })),
);
const SeoSolutionsSection = lazy(() =>
  import('@/components/landing/SeoSolutionsSection').then((m) => ({ default: m.SeoSolutionsSection })),
);
const FeatureComparisonSection = lazy(() =>
  import('@/components/landing/FeatureComparisonSection').then((m) => ({ default: m.FeatureComparisonSection })),
);
const FAQSection = lazy(() => import('@/components/landing/FAQSection').then((m) => ({ default: m.FAQSection })));
const DemoBookingSection = lazy(() =>
  import('@/components/landing/DemoBookingSection').then((m) => ({ default: m.DemoBookingSection })),
);

const sectionFallback = (
  <div className="bdp-section" style={{ minHeight: 120 }} aria-hidden>
    <div className="bdp-section__inner" style={{ padding: '2rem 0' }} />
  </div>
);

const LANDING_THEME_KEY = 'baigdentpro:landingTheme';

type LandingTheme = 'light' | 'dark';

function readStoredLandingTheme(): LandingTheme | null {
  try {
    const raw = localStorage.getItem(LANDING_THEME_KEY);
    return raw === 'dark' || raw === 'light' ? raw : null;
  } catch {
    return null;
  }
}

type ShopProductVM = Awaited<ReturnType<typeof api.shop.products>>['products'][number];
type ProductCard = ShopProductVM & {
  description?: string;
  comparePrice?: number;
  isFeatured?: boolean;
  images?: string | null;
};

type ShopCartVM = Awaited<ReturnType<typeof api.shop.cart>>;
type ShopCartItemVM = ShopCartVM['items'][number];

interface HomePageProps {
  onLoginClick: () => void;
  onPortalClick?: () => void;
  onApiTestClick?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onLoginClick, onPortalClick, onApiTestClick }) => {
  const siteLogo = useSiteLogo();
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<LandingTheme>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = readStoredLandingTheme();
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [categories, setCategories] = useState<LandingCategory[]>([]);
  const [cart, setCart] = useState<ShopCartVM>({ sessionId: '', items: [], total: 0 });
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
  const [trialWhatsAppOpen, setTrialWhatsAppOpen] = useState(false);
  const requestTrialWhatsApp = useCallback(() => setTrialWhatsAppOpen(true), []);

  useEffect(() => {
    try {
      localStorage.setItem(LANDING_THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes, cartRes] = await Promise.all([
        api.shop.products({ category: selectedCategory || undefined, search: searchQuery || undefined }),
        api.shop.categories(),
        api.shop.cart(),
      ]);
      setProducts(productsRes.products as ProductCard[]);
      setCategories(
        categoriesRes.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon ?? '📦',
          count: c.count ?? 0,
        }))
      );
      setCart(cartRes);
    } catch {
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
        {
          id: '1',
          name: 'Oral-B Electric Toothbrush',
          slug: 'oral-b',
          description: 'Advanced electric toothbrush with smart sensors',
          price: 2500,
          images: null,
          category: 'TOOTHBRUSH',
          stock: 50,
          isFeatured: true,
        },
        {
          id: '2',
          name: 'Colgate Total Toothpaste',
          slug: 'colgate',
          description: '12-hour antibacterial protection',
          price: 180,
          images: null,
          category: 'TOOTHPASTE',
          stock: 100,
          isFeatured: false,
        },
        {
          id: '3',
          name: 'Listerine Mouthwash 500ml',
          slug: 'listerine',
          description: 'Advanced antiseptic formula',
          price: 350,
          images: null,
          category: 'MOUTHWASH',
          stock: 75,
          isFeatured: true,
        },
        {
          id: '4',
          name: 'Crest Whitening Strips',
          slug: 'crest',
          description: 'Professional-grade whitening',
          price: 3500,
          images: null,
          category: 'WHITENING',
          stock: 30,
          isFeatured: true,
        },
        {
          id: '5',
          name: 'Waterpik Water Flosser',
          slug: 'waterpik',
          description: 'Advanced water flossing technology',
          price: 5500,
          images: null,
          category: 'DENTAL_TOOLS',
          stock: 25,
          isFeatured: true,
        },
        {
          id: '6',
          name: 'Sensodyne Repair',
          slug: 'sensodyne',
          description: 'For sensitive teeth protection',
          price: 220,
          images: null,
          category: 'TOOTHPASTE',
          stock: 90,
          isFeatured: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const addToCart = async (product: ProductCard) => {
    try {
      const result = await api.shop.addToCart(product.id, 1);
      setCart(result);
    } catch {
      const existingItem = cart.items.find((item) => item.productId === product.id);
      const linePrice = product.price;
      if (existingItem) {
        existingItem.quantity += 1;
        existingItem.lineTotal = linePrice * existingItem.quantity;
      } else {
        cart.items.push({
          productId: product.id,
          quantity: 1,
          name: product.name,
          price: linePrice,
          lineTotal: linePrice,
        });
      }
      const total = cart.items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
      setCart({ ...cart, sessionId: cart.sessionId, items: [...cart.items], total });
    }
  };

  const updateCartQuantity = async (productId: string, quantity: number) => {
    try {
      const result = await api.shop.updateCart(productId, quantity);
      setCart(result);
    } catch {
      const item = cart.items.find((i) => i.productId === productId);
      if (item) {
        if (quantity <= 0) {
          cart.items = cart.items.filter((i) => i.productId !== productId);
        } else {
          item.quantity = quantity;
          item.lineTotal = (item.price ?? 0) * quantity;
        }
        const total = cart.items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);
        setCart({ ...cart, sessionId: cart.sessionId, items: [...cart.items], total });
      }
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const order = await api.shop.checkout(checkoutData);
      const orderNo =
        order && typeof order === 'object' && 'orderNo' in order && typeof (order as { orderNo?: unknown }).orderNo === 'string'
          ? (order as { orderNo: string }).orderNo
          : null;
      setOrderSuccess(orderNo);
      setCart({ sessionId: cart.sessionId, items: [], total: 0 });
      setShowCheckout(false);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Checkout failed');
    }
  };

  const handleChoosePlan = (plan: PricingPlan) => {
    const subscriptionProduct: ProductCard = {
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

    const existingItem = cart.items.find((item) => item.productId === subscriptionProduct.id);
    let nextItems: ShopCartItemVM[];

    if (existingItem) {
      nextItems = cart.items.map((item) =>
        item.productId === subscriptionProduct.id
          ? {
              ...item,
              quantity: item.quantity + 1,
              lineTotal: (item.price ?? subscriptionProduct.price) * (item.quantity + 1),
            }
          : item
      );
    } else {
      nextItems = [
        ...cart.items,
        {
          productId: subscriptionProduct.id,
          quantity: 1,
          name: subscriptionProduct.name,
          price: subscriptionProduct.price,
          lineTotal: subscriptionProduct.price,
        },
      ];
    }

    const total = nextItems.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
    setCart({ sessionId: cart.sessionId, items: nextItems, total });
    setShowCart(false);
    setShowCheckout(true);
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      TOOTHBRUSH: '🪥',
      TOOTHPASTE: '🦷',
      MOUTHWASH: '🧴',
      DENTAL_FLOSS: '🧵',
      WHITENING: '✨',
      DENTAL_TOOLS: '🔧',
      CLINIC_SUPPLIES: '🏥',
      ORTHODONTIC: '😁',
      KIDS_DENTAL: '👶',
      OTHER: '📦',
    };
    return icons[category] || '📦';
  };

  return (
    <div className={`bdp-landing${theme === 'dark' ? ' bdp-landing--dark' : ''}`}>
      <LandingStructuredData />
      <a href="#main-content" className="bdp-skip-link">
        Skip to main content
      </a>
      <LandingHeader
        siteLogo={siteLogo}
        cartItemCount={cart.items.length}
        scrolled={scrolled}
        onCartClick={() => setShowCart(true)}
        onRequestTrialWhatsApp={requestTrialWhatsApp}
        onLoginClick={onLoginClick}
        onPortalClick={onPortalClick}
        onApiTestClick={onApiTestClick}
        themeDark={theme === 'dark'}
        onToggleTheme={toggleTheme}
      />

      <main id="main-content">
        <HeroSection onRequestTrialWhatsApp={requestTrialWhatsApp} />
        <StatsSection />
        <FeaturesGrid />
        <Suspense fallback={sectionFallback}>
          <TestimonialsSection />
        </Suspense>
        <TrustSection />
        <Suspense fallback={sectionFallback}>
          <SeoSolutionsSection />
        </Suspense>
        <PlatformSection onRequestTrialWhatsApp={requestTrialWhatsApp} />
        <ProductShop
          categories={categories}
          products={products}
          loading={loading}
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          onSelectCategory={setSelectedCategory}
          onSearchChange={setSearchQuery}
          onAddToCart={(p) => void addToCart(p as ProductCard)}
          getCategoryIcon={getCategoryIcon}
        />
        <WhySection />
        <Suspense fallback={sectionFallback}>
          <DemoBookingSection onRequestTrialWhatsApp={requestTrialWhatsApp} />
        </Suspense>
        <CTASection variant="fomo" onRequestTrialWhatsApp={requestTrialWhatsApp} />
        <CTASection variant="mid" onRequestTrialWhatsApp={requestTrialWhatsApp} onLoginClick={onLoginClick} />
        <Suspense fallback={sectionFallback}>
          <FeatureComparisonSection />
        </Suspense>
        <PricingCards onChoosePlan={handleChoosePlan} />
        <Suspense fallback={sectionFallback}>
          <FAQSection />
        </Suspense>
      </main>

      <LandingFooter siteLogo={siteLogo} onRequestTrialWhatsApp={requestTrialWhatsApp} />
      <StickyMobileCta onRequestTrialWhatsApp={requestTrialWhatsApp} />

      <TrialWhatsAppModal open={trialWhatsAppOpen} onClose={() => setTrialWhatsAppOpen(false)} />

      {showCart && (
        <div
          className="neo-modal-overlay"
          onClick={() => setShowCart(false)}
          onKeyDown={(e) => e.key === 'Escape' && setShowCart(false)}
          role="presentation"
        >
          <div
            className="neo-modal neo-cart-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-modal-title"
          >
            <div className="neo-modal-header">
              <h3 id="cart-modal-title">
                <i className="fa-solid fa-shopping-cart" aria-hidden /> Your Cart
              </h3>
              <button type="button" className="neo-modal-close" onClick={() => setShowCart(false)} aria-label="Close cart">
                <i className="fa-solid fa-times" aria-hidden />
              </button>
            </div>
            <div className="neo-modal-body">
              {cart.items.length === 0 ? (
                <div className="neo-cart-empty">
                  <i className="fa-solid fa-cart-shopping" />
                  <p>Your cart is empty</p>
                </div>
              ) : (
                <div className="neo-cart-items">
                  {cart.items.map((item) => (
                    <div key={item.productId} className="neo-cart-item">
                      <div className="neo-cart-item-info">
                        <span className="neo-cart-item-name">{item.name ?? 'Item'}</span>
                        <span className="neo-cart-item-price">৳{(item.price ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="neo-cart-item-qty">
                        <button type="button" onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}>
                          <i className="fa-solid fa-minus" />
                        </button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}>
                          <i className="fa-solid fa-plus" />
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
                  type="button"
                  className="neo-btn neo-btn-primary neo-btn-block"
                  onClick={() => {
                    setShowCart(false);
                    setShowCheckout(true);
                  }}
                >
                  <i className="fa-solid fa-arrow-right" />
                  <span>Proceed to Checkout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showCheckout && (
        <div
          className="neo-modal-overlay"
          onClick={() => setShowCheckout(false)}
          onKeyDown={(e) => e.key === 'Escape' && setShowCheckout(false)}
          role="presentation"
        >
          <div
            className="neo-checkout-modal neo-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-modal-title"
          >
            <div className="neo-modal-header">
              <h3 id="checkout-modal-title">
                <i className="fa-solid fa-credit-card" aria-hidden /> Checkout
              </h3>
              <button type="button" className="neo-modal-close" onClick={() => setShowCheckout(false)} aria-label="Close checkout">
                <i className="fa-solid fa-times" aria-hidden />
              </button>
            </div>
            <form onSubmit={handleCheckout} className="neo-checkout-form">
              <div className="neo-form-row">
                <div className="neo-form-group">
                  <label htmlFor="checkout-name">Full Name *</label>
                  <input
                    id="checkout-name"
                    type="text"
                    autoComplete="name"
                    value={checkoutData.customerName}
                    onChange={(e) => setCheckoutData({ ...checkoutData, customerName: e.target.value })}
                    required
                  />
                </div>
                <div className="neo-form-group">
                  <label htmlFor="checkout-phone">Phone Number *</label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    value={checkoutData.customerPhone}
                    onChange={(e) => setCheckoutData({ ...checkoutData, customerPhone: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="neo-form-group">
                <label htmlFor="checkout-email">Email (Optional)</label>
                <input
                  id="checkout-email"
                  type="email"
                  autoComplete="email"
                  value={checkoutData.customerEmail}
                  onChange={(e) => setCheckoutData({ ...checkoutData, customerEmail: e.target.value })}
                />
              </div>
              <div className="neo-form-group">
                <label htmlFor="checkout-address">Shipping Address *</label>
                <textarea
                  id="checkout-address"
                  autoComplete="street-address"
                  value={checkoutData.shippingAddress}
                  onChange={(e) => setCheckoutData({ ...checkoutData, shippingAddress: e.target.value })}
                  required
                />
              </div>
              <div className="neo-form-row">
                <div className="neo-form-group">
                  <label htmlFor="checkout-city">City *</label>
                  <input
                    id="checkout-city"
                    type="text"
                    autoComplete="address-level2"
                    value={checkoutData.shippingCity}
                    onChange={(e) => setCheckoutData({ ...checkoutData, shippingCity: e.target.value })}
                    required
                  />
                </div>
                <div className="neo-form-group">
                  <label htmlFor="checkout-zip">Zip Code</label>
                  <input
                    id="checkout-zip"
                    type="text"
                    autoComplete="postal-code"
                    value={checkoutData.shippingZip}
                    onChange={(e) => setCheckoutData({ ...checkoutData, shippingZip: e.target.value })}
                  />
                </div>
              </div>
              <div className="neo-form-group">
                <label htmlFor="checkout-payment">Payment Method</label>
                <select
                  id="checkout-payment"
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
                  <div key={item.productId} className="neo-summary-item">
                    <span>
                      {item.name ?? 'Item'} × {item.quantity}
                    </span>
                    <span>৳{((item.price ?? 0) * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                <div className="neo-summary-total">
                  <span>Total</span>
                  <span>৳{cart.total.toLocaleString()}</span>
                </div>
              </div>
              <button type="submit" className="neo-btn neo-btn-primary neo-btn-block neo-btn-lg">
                <i className="fa-solid fa-check" />
                <span>Place Order</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {orderSuccess && (
        <div
          className="neo-modal-overlay"
          onClick={() => setOrderSuccess(null)}
          onKeyDown={(e) => e.key === 'Escape' && setOrderSuccess(null)}
          role="presentation"
        >
          <div
            className="neo-modal neo-success-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-success-title"
          >
            <div className="neo-success-icon" aria-hidden>
              <i className="fa-solid fa-check" />
            </div>
            <h3 id="order-success-title">Order Placed Successfully!</h3>
            <p className="neo-success-order">
              Order #<strong>{orderSuccess}</strong>
            </p>
            <p>We&apos;ll contact you shortly to confirm your order.</p>
            <button type="button" className="neo-btn neo-btn-primary" onClick={() => setOrderSuccess(null)}>
              <i className="fa-solid fa-shopping-bag" />
              <span>Continue Shopping</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
