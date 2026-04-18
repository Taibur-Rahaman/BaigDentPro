import React from 'react';
import { ApiError } from '@/components/ApiError';
import { useOrders } from '@/hooks/useOrdersApi';
import type { SaasOrder } from '@/services/orderService';

const formatMoney = (n: number) =>
  `৳${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function orderStatus(row: SaasOrder): { label: string; className: string } {
  const ok = row.status === 'CONFIRMED' || row.status === 'FULFILLED';
  return ok
    ? { label: row.status, className: 'tenant-badge tenant-badge-success' }
    : { label: row.status || '—', className: 'tenant-badge tenant-badge-muted' };
}

function lineSummary(row: SaasOrder): { label: string; qty: number } {
  const items = row.items ?? [];
  if (items.length === 1) {
    const it = items[0];
    return { label: it.product?.name ?? it.productName ?? '—', qty: it.quantity };
  }
  if (items.length === 0) {
    return { label: '—', qty: 0 };
  }
  const qty = items.reduce((s, it) => s + it.quantity, 0);
  return { label: `${items.length} products`, qty };
}

export const TenantOrdersPage: React.FC = () => {
  const { rows, loading, error, reload, clearError } = useOrders();

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Orders</h1>
        <p className="tenant-page-lead">Tenant orders from <code>/api/orders</code>.</p>
      </div>

      {error ? (
        <ApiError
          message={error}
          title="Could not load orders"
          onRetry={() => {
            clearError();
            void reload();
          }}
        />
      ) : null}

      <section className="tenant-panel">
        {loading ? (
          <div className="tenant-loading" role="status">
            <div className="neo-loading-spinner tenant-spinner" />
            <span>Loading orders…</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="tenant-empty">
            <i className="fa-solid fa-receipt" aria-hidden />
            <p>No orders yet</p>
            <p className="tenant-empty-hint">Orders appear here when you create them from products.</p>
          </div>
        ) : (
          <div className="tenant-table-wrap">
            <table className="tenant-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th>Profit</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = orderStatus(r);
                  const line = lineSummary(r);
                  return (
                    <tr key={r.id}>
                      <td data-label="Product">{line.label}</td>
                      <td data-label="Qty">{line.qty}</td>
                      <td data-label="Total">{formatMoney(r.total)}</td>
                      <td data-label="Profit">
                        {r.profit != null ? formatMoney(r.profit.amount) : '—'}
                      </td>
                      <td data-label="Status">
                        <span className={st.className}>{st.label}</span>
                      </td>
                      <td data-label="Date">{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
