import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/components/ApiError';
import { getApiBaseUrlLabel } from '@/config/api';
import { useCurrentUser } from '@/hooks/useCurrentUserApi';
import { useCreateOrder, useDeleteOrder, useOrders } from '@/hooks/useOrdersApi';
import { useCreateProduct, useDeleteProduct, useProducts, useUpdateProduct } from '@/hooks/useProductsApi';
import { useToast } from '@/hooks/useToast';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import { diagnosticsService } from '@/services/diagnosticsService';

const inputStyle: React.CSSProperties = {
  flex: '1 1 120px',
  padding: '0.45rem 0.6rem',
  borderRadius: 6,
  border: '1px solid rgba(148, 163, 184, 0.35)',
  background: 'rgba(2, 6, 23, 0.5)',
  color: '#f8fafc',
};

export const ApiTestPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [edits, setEdits] = useState<Record<string, { name: string; price: string }>>({});
  const [orderProductId, setOrderProductId] = useState('');
  const [orderQty, setOrderQty] = useState('1');

  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [diagPayload, setDiagPayload] = useState<unknown>(null);

  const { user, loading: meLoading, error: meError, reload: reloadMe, clearError: clearMeError } = useCurrentUser();
  const { rows: products, loading: productsLoading, error: productsError, reload: reloadProducts, clearError: clearProductsError } =
    useProducts();
  const { rows: orders, loading: ordersLoading, error: ordersError, reload: reloadOrders, clearError: clearOrdersError } = useOrders();

  const { create: createProduct, pending: createProductPending } = useCreateProduct();
  const { update: updateProduct, pending: updateProductPending, activeId: updateProductActiveId } = useUpdateProduct();
  const { remove: removeProduct, pending: deleteProductPending, activeId: deleteProductActiveId } = useDeleteProduct();
  const { create: createOrder, pending: createOrderPending } = useCreateOrder();
  const { remove: removeOrder, pending: deleteOrderPending, activeId: deleteOrderActiveId } = useDeleteOrder();
  const { showSuccess, showError, ToastViewport } = useToast();

  const busy =
    meLoading ||
    productsLoading ||
    ordersLoading ||
    createProductPending ||
    updateProductPending ||
    deleteProductPending ||
    createOrderPending ||
    deleteOrderPending;

  const loadDiagnostics = useCallback(async () => {
    setDiagError(null);
    setDiagLoading(true);
    try {
      const res = await diagnosticsService.tenantStatus();
      setDiagPayload(res);
    } catch (e) {
      setDiagPayload(null);
      setDiagError(userMessageFromUnknown(e));
    } finally {
      setDiagLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDiagnostics();
  }, [loadDiagnostics]);

  const firstProductId = products[0]?.id ?? '';

  const productOptions = useMemo(
    () =>
      products.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} — {p.price}
        </option>
      )),
    [products]
  );

  const clearAllErrors = () => {
    clearMeError();
    clearProductsError();
    clearOrdersError();
    setDiagError(null);
  };

  const refreshAll = async () => {
    await Promise.all([reloadMe(), reloadProducts(), reloadOrders(), loadDiagnostics()]);
  };

  const handleCreateProduct = async () => {
    clearAllErrors();
    const name = newName.trim();
    const price = Number.parseFloat(newPrice);
    if (!name) return;
    if (!Number.isFinite(price) || price < 0) {
      showError('Enter a valid price.');
      return;
    }
    const result = await createProduct(name, price);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    setNewName('');
    setNewPrice('');
    showSuccess('Product created');
    await refreshAll();
  };

  const handleUpdateProduct = async (id: string) => {
    clearAllErrors();
    const draft = edits[id];
    const base = products.find((p) => p.id === id);
    const name = (draft?.name ?? base?.name ?? '').trim();
    const price = Number.parseFloat(draft?.price ?? String(base?.price ?? ''));
    if (!name) return;
    if (!Number.isFinite(price) || price < 0) {
      showError('Enter a valid price.');
      return;
    }
    const result = await updateProduct(id, name, price);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    setEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    showSuccess('Product updated');
    await refreshAll();
  };

  const handleDeleteProduct = async (id: string) => {
    clearAllErrors();
    const result = await removeProduct(id);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    showSuccess('Product deleted');
    await refreshAll();
  };

  const handleCreateOrder = async () => {
    clearAllErrors();
    const pid = orderProductId || firstProductId;
    const qty = Number.parseInt(orderQty, 10);
    if (!pid) {
      showError('Create a product first.');
      return;
    }
    if (!Number.isFinite(qty) || qty < 1) {
      showError('Quantity must be at least 1.');
      return;
    }
    const result = await createOrder(pid, qty);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    showSuccess('Order created');
    await reloadOrders();
  };

  const handleDeleteOrder = async (id: string) => {
    clearAllErrors();
    const result = await removeOrder(id);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    showSuccess('Order deleted');
    await reloadOrders();
  };

  const panelStyle: React.CSSProperties = {
    padding: '1.25rem',
    borderRadius: 12,
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    marginBottom: '1.5rem',
  };

  const listError = meError || productsError || ordersError;

  return (
    <div className="neo-home" style={{ minHeight: '100vh', padding: '2rem' }}>
      <div className="neo-bg-grid" />
      <div className="neo-bg-glow neo-bg-glow-1" />
      <div style={{ maxWidth: 820, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <button type="button" className="neo-btn neo-btn-secondary" onClick={onBack} style={{ marginBottom: '1.5rem' }}>
          <i className="fa-solid fa-arrow-left" /> Back to site
        </button>
        <h1 style={{ marginBottom: '0.5rem', color: 'var(--neo-text-primary, #fff)' }}>Tenant catalog API</h1>
        <p style={{ opacity: 0.85, marginBottom: '1rem', color: 'var(--neo-text-secondary, #cbd5e1)' }}>
          Base URL: <code>{getApiBaseUrlLabel()}</code>
        </p>
        <p style={{ opacity: 0.8, marginBottom: '1rem', color: '#94a3b8', fontSize: '0.95rem' }}>
          Products and orders use the real tenant schema (<code>saas_products</code>, <code>saas_orders</code>, line items). Authenticated{' '}
          <code>GET /api/test/status</code> probes database, Supabase admin, and catalog access.
        </p>

        <div style={panelStyle}>
          <h2 style={{ fontSize: '1.05rem', margin: '0 0 0.75rem', color: '#f1f5f9' }}>Backend diagnostics</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 1rem' }}>
            Requires JWT — same <code>Authorization</code> header as catalog APIs.
          </p>
          {diagError ? (
            <ApiError
              title="Diagnostics request failed"
              message={diagError}
              onRetry={() => {
                setDiagError(null);
                void loadDiagnostics();
              }}
            />
          ) : null}
          <div style={{ marginBottom: '1rem' }}>
            <button type="button" className="neo-btn neo-btn-secondary" disabled={diagLoading} onClick={() => void loadDiagnostics()}>
              {diagLoading ? <i className="fa-solid fa-spinner fa-spin" aria-hidden /> : 'Refresh GET /api/test/status'}
            </button>
          </div>
          {diagLoading && !diagPayload ? (
            <p style={{ color: '#94a3b8' }}>
              <i className="fa-solid fa-spinner fa-spin" aria-hidden /> Loading…
            </p>
          ) : diagPayload ? (
            <pre
              style={{
                margin: 0,
                padding: '0.75rem',
                borderRadius: 8,
                background: 'rgba(2, 6, 23, 0.65)',
                color: '#e2e8f0',
                fontSize: '0.78rem',
                overflow: 'auto',
                maxHeight: 280,
              }}
            >
              {JSON.stringify(diagPayload, null, 2)}
            </pre>
          ) : (
            <p style={{ color: '#94a3b8' }}>No payload yet.</p>
          )}
        </div>

        {listError ? (
          <ApiError
            title="Request failed"
            message={listError}
            onRetry={() => {
              clearAllErrors();
              void refreshAll();
            }}
          />
        ) : null}

        <div style={panelStyle}>
          <h2 style={{ fontSize: '1.05rem', margin: '0 0 0.75rem', color: '#f1f5f9' }}>Current user</h2>
          {meLoading && !user ? (
            <p style={{ color: '#94a3b8' }}>
              <i className="fa-solid fa-spinner fa-spin" aria-hidden /> Loading…
            </p>
          ) : user ? (
            <p style={{ color: '#e2e8f0', margin: 0 }}>
              <strong>{user.name}</strong> <span style={{ color: '#64748b' }}>({user.email})</span>
              <span style={{ color: '#64748b', marginLeft: 8 }}>id: {user.id}</span>
            </p>
          ) : (
            <p style={{ color: '#fca5a5', margin: 0 }}>
              Not signed in. Open Login and sign in so <code>Authorization: Bearer</code> is sent with catalog requests.
            </p>
          )}
        </div>

        <div style={panelStyle}>
          <h2 style={{ fontSize: '1.05rem', margin: '0 0 0.75rem', color: '#f1f5f9' }}>Products</h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
            <input
              type="text"
              value={newName}
              disabled={busy}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name"
              style={{ ...inputStyle, flex: '1 1 160px' }}
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={newPrice}
              disabled={busy}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="Price"
              style={{ ...inputStyle, maxWidth: 120 }}
            />
            <button type="button" className="neo-btn neo-btn-primary" disabled={busy} onClick={() => void handleCreateProduct()}>
              {createProductPending ? <i className="fa-solid fa-spinner fa-spin" aria-hidden /> : 'Add product'}
            </button>
          </div>

          {productsLoading && products.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>
              <i className="fa-solid fa-spinner fa-spin" aria-hidden /> Loading…
            </p>
          ) : products.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No products yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {products.map((p) => (
                <li
                  key={p.id}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
                  }}
                >
                  <span style={{ minWidth: '6rem', color: '#64748b', fontFamily: 'monospace', fontSize: '0.8rem' }} title={p.id}>
                    {p.id.slice(0, 8)}…
                  </span>
                  <input
                    type="text"
                    value={edits[p.id]?.name ?? p.name}
                    disabled={busy}
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [p.id]: { name: e.target.value, price: prev[p.id]?.price ?? String(p.price) },
                      }))
                    }
                    style={{ ...inputStyle, flex: '1 1 140px' }}
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={edits[p.id]?.price ?? String(p.price)}
                    disabled={busy}
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [p.id]: { name: prev[p.id]?.name ?? p.name, price: e.target.value },
                      }))
                    }
                    style={{ ...inputStyle, maxWidth: 100 }}
                  />
                  <button
                    type="button"
                    className="neo-btn neo-btn-secondary"
                    disabled={busy}
                    onClick={() => void handleUpdateProduct(p.id)}
                  >
                    {updateProductPending && updateProductActiveId === p.id ? (
                      <i className="fa-solid fa-spinner fa-spin" aria-hidden />
                    ) : (
                      'Save'
                    )}
                  </button>
                  <button
                    type="button"
                    className="neo-btn neo-btn-secondary"
                    disabled={busy}
                    onClick={() => void handleDeleteProduct(p.id)}
                    style={{ borderColor: 'rgba(248, 113, 113, 0.5)', color: '#fca5a5' }}
                  >
                    {deleteProductPending && deleteProductActiveId === p.id ? (
                      <i className="fa-solid fa-spinner fa-spin" aria-hidden />
                    ) : (
                      'Delete'
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={panelStyle}>
          <h2 style={{ fontSize: '1.05rem', margin: '0 0 0.75rem', color: '#f1f5f9' }}>Orders</h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
            <select
              value={orderProductId || firstProductId}
              disabled={busy || products.length === 0}
              onChange={(e) => setOrderProductId(e.target.value)}
              style={{ ...inputStyle, flex: '1 1 200px', minHeight: 36 }}
            >
              {products.length === 0 ? <option value="">No products</option> : productOptions}
            </select>
            <input
              type="number"
              min={1}
              step={1}
              value={orderQty}
              disabled={busy}
              onChange={(e) => setOrderQty(e.target.value)}
              placeholder="Qty"
              style={{ ...inputStyle, maxWidth: 88 }}
            />
            <button type="button" className="neo-btn neo-btn-primary" disabled={busy || products.length === 0} onClick={() => void handleCreateOrder()}>
              {createOrderPending ? <i className="fa-solid fa-spinner fa-spin" aria-hidden /> : 'Place order'}
            </button>
          </div>

          {ordersLoading && orders.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>
              <i className="fa-solid fa-spinner fa-spin" aria-hidden /> Loading…
            </p>
          ) : orders.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No orders yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {orders.map((o) => (
                <li
                  key={o.id}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
                    color: '#e2e8f0',
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b' }} title={o.id}>
                    {o.id.slice(0, 8)}…
                  </span>
                  <span>
                    {o.items?.length === 1
                      ? `${o.items[0].product?.name ?? o.items[0].productName ?? o.items[0].productId} × ${o.items[0].quantity}`
                      : `${o.items?.length ?? 0} line(s)`}
                  </span>
                  <span style={{ color: '#94a3b8' }}>total {o.total}</span>
                  <button
                    type="button"
                    className="neo-btn neo-btn-secondary"
                    disabled={busy}
                    onClick={() => void handleDeleteOrder(o.id)}
                    style={{ borderColor: 'rgba(248, 113, 113, 0.5)', color: '#fca5a5' }}
                  >
                    {deleteOrderPending && deleteOrderActiveId === o.id ? (
                      <i className="fa-solid fa-spinner fa-spin" aria-hidden />
                    ) : (
                      'Delete'
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ToastViewport />
      </div>
    </div>
  );
};
