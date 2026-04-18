import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api';

const formatMoney = (n: number) =>
  `৳${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

type ShopStats = {
  products: { total: number; active: number; lowStock: number };
  orders: { total: number; pending: number; today: number };
  revenue: { total: number; today: number };
  profit?: { total: number };
};

type ProductRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  cost?: number | null;
  stock: number;
  isActive: boolean;
  sku?: string | null;
};

type OrderRow = {
  id: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: string;
  createdAt: string;
  items?: { name: string; quantity: number; total: number }[];
};

export const ShopUserDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<ShopStats | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showPlaceOrder, setShowPlaceOrder] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'OTHER',
    price: '',
    cost: '',
    stock: '0',
    description: '',
  });

  const [orderForm, setOrderForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
    shippingCity: '',
    shippingState: '',
    shippingZip: '',
    notes: '',
  });

  const [orderLines, setOrderLines] = useState<{ productId: string; quantity: string }[]>([
    { productId: '', quantity: '1' },
  ]);

  const loadAll = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [s, po, or] = await Promise.all([
        api.shopAdmin.stats(),
        api.shopAdmin.products({ page: 1, limit: 100 }),
        api.shopAdmin.orders({ page: 1 }),
      ]);
      setStats(s as ShopStats);
      setProducts((po.products || []) as ProductRow[]);
      setOrders((or.orders || []) as OrderRow[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load shop data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    void api.shop
      .categories()
      .then((cats) => {
        setCategories((cats as { id: string; name: string }[]).map((c) => ({ id: c.id, name: c.name })));
      })
      .catch(() => {
        setCategories([{ id: 'OTHER', name: 'Other' }]);
      });
  }, []);

  const orderableProducts = useMemo(
    () => products.filter((p) => p.isActive && p.stock > 0),
    [products]
  );

  const displayProfit = stats?.profit?.total ?? 0;

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    setBanner(null);
    try {
      const price = parseFloat(newProduct.price);
      if (!newProduct.name.trim() || Number.isNaN(price) || price < 0) {
        setBanner('Enter a valid product name and price.');
        return;
      }
      await api.shopAdmin.createProduct({
        name: newProduct.name.trim(),
        category: newProduct.category,
        price,
        cost: newProduct.cost.trim() === '' ? undefined : parseFloat(newProduct.cost),
        stock: parseInt(newProduct.stock, 10) || 0,
        description: newProduct.description.trim() || undefined,
      });
      setNewProduct({ name: '', category: newProduct.category, price: '', cost: '', stock: '0', description: '' });
      setShowCreateProduct(false);
      setBanner('Product created.');
      await loadAll();
    } catch (err: unknown) {
      setBanner(err instanceof Error ? err.message : 'Could not create product');
    } finally {
      setSavingProduct(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlacingOrder(true);
    setBanner(null);
    try {
      const lines = orderLines.filter((l) => l.productId && Math.max(1, parseInt(l.quantity, 10) || 0) > 0);
      if (lines.length === 0) {
        setBanner('Add at least one product line with quantity.');
        return;
      }
      if (!orderForm.customerName.trim() || !orderForm.customerPhone.trim() || !orderForm.shippingAddress.trim()) {
        setBanner('Customer name, phone, and shipping address are required.');
        return;
      }
      await api.shop.clearCart();
      for (const l of lines) {
        const q = Math.max(1, parseInt(l.quantity, 10) || 1);
        await api.shop.addToCart(l.productId, q);
      }
      await api.shop.checkout({
        customerName: orderForm.customerName.trim(),
        customerEmail: orderForm.customerEmail.trim() || undefined,
        customerPhone: orderForm.customerPhone.trim(),
        shippingAddress: orderForm.shippingAddress.trim(),
        shippingCity: orderForm.shippingCity.trim() || '—',
        shippingState: orderForm.shippingState.trim() || undefined,
        shippingZip: orderForm.shippingZip.trim() || undefined,
        paymentMethod: 'COD',
        notes: orderForm.notes.trim() || undefined,
      });
      setShowPlaceOrder(false);
      setOrderLines([{ productId: '', quantity: '1' }]);
      setOrderForm({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        shippingAddress: '',
        shippingCity: '',
        shippingState: '',
        shippingZip: '',
        notes: '',
      });
      setBanner('Order placed successfully.');
      await loadAll();
    } catch (err: unknown) {
      setBanner(err instanceof Error ? err.message : 'Could not place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="dashboard-content">
      <div className="page-header shop-header-row" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>
            <i className="fa-solid fa-store" /> Shop dashboard
          </h1>
          <p style={{ color: 'var(--neo-text-muted)', marginTop: 6 }}>
            Orders, catalog, and profit (line revenue minus product cost × quantity).
          </p>
        </div>
        <div className="shop-quick-actions">
          <button type="button" className="btn-primary" onClick={() => setShowCreateProduct(true)}>
            <i className="fa-solid fa-plus" /> Create product
          </button>
          <button type="button" className="btn-secondary" onClick={() => setShowPlaceOrder(true)}>
            <i className="fa-solid fa-cart-shopping" /> Place order
          </button>
          <button type="button" className="btn-sm" onClick={() => void loadAll()} disabled={loading}>
            <i className="fa-solid fa-rotate-right" /> Refresh
          </button>
        </div>
      </div>

      {banner && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(13, 148, 136, 0.08)',
            border: '1px solid rgba(13, 148, 136, 0.25)',
            color: 'var(--neo-text-primary)',
          }}
        >
          {banner}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: '#fef2f2', color: '#b91c1c' }}>
          {error}
        </div>
      )}

      <div className="shop-stats-grid">
        <div className="shop-stat-card">
          <div className="shop-stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #60a5fa)' }}>
            <i className="fa-solid fa-bag-shopping" />
          </div>
          <div className="shop-stat-info">
            <span className="shop-stat-value">{stats?.orders.total ?? '—'}</span>
            <span className="shop-stat-label">Total orders</span>
          </div>
        </div>
        <div className="shop-stat-card">
          <div className="shop-stat-icon" style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}>
            <i className="fa-solid fa-boxes-stacked" />
          </div>
          <div className="shop-stat-info">
            <span className="shop-stat-value">{stats?.products.total ?? '—'}</span>
            <span className="shop-stat-label">Total products</span>
          </div>
        </div>
        <div className="shop-stat-card">
          <div className="shop-stat-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
            <i className="fa-solid fa-chart-line" />
          </div>
          <div className="shop-stat-info">
            <span className="shop-stat-value">{stats ? formatMoney(displayProfit) : '—'}</span>
            <span className="shop-stat-label">Total profit</span>
            <span className="shop-stat-label" style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>
              Revenue (items) − cost × qty
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        <div className="dashboard-card">
          <div className="card-header">
            <h3>
              <i className="fa-solid fa-list" /> Orders
            </h3>
          </div>
          <div className="card-body shop-orders-table-wrap">
            {loading && orders.length === 0 ? (
              <p style={{ color: 'var(--neo-text-muted)' }}>Loading…</p>
            ) : orders.length === 0 ? (
              <p style={{ color: 'var(--neo-text-muted)' }}>No orders yet.</p>
            ) : (
              <table className="records-table shop-orders-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <strong>{o.orderNo}</strong>
                      </td>
                      <td>
                        <div className="customer-cell">
                          <span className="customer-name">{o.customerName}</span>
                          <span className="customer-phone">{o.customerPhone}</span>
                        </div>
                      </td>
                      <td>{formatMoney(Number(o.total))}</td>
                      <td>
                        <span className="status-badge">{o.status}</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                        {o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>
              <i className="fa-solid fa-cubes" /> Products
            </h3>
          </div>
          <div className="card-body shop-products-table-wrap">
            {loading && products.length === 0 ? (
              <p style={{ color: 'var(--neo-text-muted)' }}>Loading…</p>
            ) : products.length === 0 ? (
              <p style={{ color: 'var(--neo-text-muted)' }}>No products yet. Create one to get started.</p>
            ) : (
              <table className="records-table shop-products-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Cost</th>
                    <th>Margin</th>
                    <th>Stock</th>
                    <th>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const cost = p.cost != null ? Number(p.cost) : 0;
                    const margin = Number(p.price) - cost;
                    return (
                      <tr key={p.id}>
                        <td>
                          <div className="product-cell">
                            <div className="product-icon">
                              <i className="fa-solid fa-tooth" />
                            </div>
                            <div className="product-info">
                              <strong>{p.name}</strong>
                              {p.sku ? <span className="product-sku">{p.sku}</span> : null}
                            </div>
                          </div>
                        </td>
                        <td>{p.category}</td>
                        <td>
                          <span className="product-price">{formatMoney(Number(p.price))}</span>
                        </td>
                        <td>{formatMoney(cost)}</td>
                        <td>{formatMoney(margin)}</td>
                        <td>
                          <span className={p.stock <= 5 ? 'stock-badge low' : 'stock-badge'}>{p.stock}</span>
                        </td>
                        <td>
                          <span className={p.isActive ? 'status-badge active' : 'status-badge inactive'}>
                            {p.isActive ? 'Yes' : 'No'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showCreateProduct && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="shop-create-title">
          <div className="checkout-modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 id="shop-create-title">
                <i className="fa-solid fa-plus" /> Create product
              </h3>
              <button type="button" className="close-btn" aria-label="Close" onClick={() => setShowCreateProduct(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleCreateProduct} className="cart-items" style={{ paddingTop: 0 }}>
              <div className="form-grid" style={{ display: 'grid', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                  Name *
                  <input
                    className="input"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    required
                  />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                  Category *
                  <select
                    className="input"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  >
                    {(categories.length ? categories : [{ id: 'OTHER', name: 'Other' }]).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                    Price *
                    <input
                      className="input"
                      type="number"
                      min={0}
                      step="0.01"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      required
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                    Cost
                    <input
                      className="input"
                      type="number"
                      min={0}
                      step="0.01"
                      value={newProduct.cost}
                      onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })}
                      placeholder="COGS"
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                    Stock
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    />
                  </label>
                </div>
                <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                  Description
                  <textarea
                    className="input"
                    rows={3}
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateProduct(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={savingProduct}>
                  {savingProduct ? 'Saving…' : 'Save product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPlaceOrder && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="shop-order-title">
          <div className="checkout-modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3 id="shop-order-title">
                <i className="fa-solid fa-cart-shopping" /> Place order
              </h3>
              <button type="button" className="close-btn" aria-label="Close" onClick={() => setShowPlaceOrder(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handlePlaceOrder} className="cart-items" style={{ paddingTop: 0 }}>
              <p style={{ fontSize: 14, color: 'var(--neo-text-muted)', marginTop: 0 }}>
                Uses your session cart, then checkout (COD). Only in-stock active products are listed.
              </p>
              <div className="form-grid" style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                    Customer name *
                    <input
                      className="input"
                      value={orderForm.customerName}
                      onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                      required
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                    Phone *
                    <input
                      className="input"
                      value={orderForm.customerPhone}
                      onChange={(e) => setOrderForm({ ...orderForm, customerPhone: e.target.value })}
                      required
                    />
                  </label>
                </div>
                <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                  Email
                  <input
                    className="input"
                    type="email"
                    value={orderForm.customerEmail}
                    onChange={(e) => setOrderForm({ ...orderForm, customerEmail: e.target.value })}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                  Shipping address *
                  <input
                    className="input"
                    value={orderForm.shippingAddress}
                    onChange={(e) => setOrderForm({ ...orderForm, shippingAddress: e.target.value })}
                    required
                  />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                    City
                    <input
                      className="input"
                      value={orderForm.shippingCity}
                      onChange={(e) => setOrderForm({ ...orderForm, shippingCity: e.target.value })}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                    State
                    <input
                      className="input"
                      value={orderForm.shippingState}
                      onChange={(e) => setOrderForm({ ...orderForm, shippingState: e.target.value })}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                    ZIP
                    <input
                      className="input"
                      value={orderForm.shippingZip}
                      onChange={(e) => setOrderForm({ ...orderForm, shippingZip: e.target.value })}
                    />
                  </label>
                </div>
                <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                  Notes
                  <input className="input" value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} />
                </label>

                <div style={{ marginTop: 8 }}>
                  <strong style={{ fontSize: 14 }}>Lines</strong>
                  {orderLines.map((line, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 40px', gap: 8, marginTop: 8 }}>
                      <select
                        className="input"
                        value={line.productId}
                        onChange={(e) => {
                          const next = [...orderLines];
                          next[idx] = { ...next[idx], productId: e.target.value };
                          setOrderLines(next);
                        }}
                        required={idx === 0}
                      >
                        <option value="">Select product</option>
                        {orderableProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (stock {p.stock})
                          </option>
                        ))}
                      </select>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) => {
                          const next = [...orderLines];
                          next[idx] = { ...next[idx], quantity: e.target.value };
                          setOrderLines(next);
                        }}
                      />
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => setOrderLines(orderLines.filter((_, i) => i !== idx))}
                        disabled={orderLines.length === 1}
                        aria-label="Remove line"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn-sm"
                    style={{ marginTop: 10 }}
                    onClick={() => setOrderLines([...orderLines, { productId: '', quantity: '1' }])}
                  >
                    <i className="fa-solid fa-plus" /> Add line
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowPlaceOrder(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={placingOrder || orderableProducts.length === 0}>
                  {placingOrder ? 'Placing…' : 'Place order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
