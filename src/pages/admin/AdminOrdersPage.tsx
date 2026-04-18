import React, { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/components/ApiError';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import { fetchAdminOrders, type AdminOrderRow } from '@/services/adminPanelService';

export const AdminOrdersPage: React.FC = () => {
  const [rows, setRows] = useState<AdminOrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetchAdminOrders({ page: 1, limit: 100 });
      setRows(res.orders);
      setTotal(res.total);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(userMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>SaaS orders</h1>
        <p className="tenant-page-lead">
          Tenant orders from <code>/api/admin/orders</code> (<code>saas_orders</code>). Line counts only; no payment instrument data.
        </p>
        {!loading && !error ? <p style={{ margin: 0, color: 'var(--neo-text-muted)' }}>Total: {total}</p> : null}
      </div>
      {error ? <ApiError message={error} title="Could not load orders" onRetry={() => void load()} /> : null}
      {loading ? (
        <div className="tenant-loading" role="status">
          <div className="neo-loading-spinner tenant-spinner" />
          <span>Loading…</span>
        </div>
      ) : (
        <div className="tenant-card" style={{ overflow: 'auto' }}>
          <table className="tenant-table">
            <thead>
              <tr>
                <th>Clinic</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Lines</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td>{o.clinic.name}</td>
                  <td>{o.status}</td>
                  <td>{o.paymentStatus}</td>
                  <td>
                    {o.total.toFixed(2)} {o.currency}
                  </td>
                  <td>{o._count.items}</td>
                  <td>{new Date(o.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && !error ? <p style={{ padding: '1rem', margin: 0, color: '#64748b' }}>No orders found.</p> : null}
        </div>
      )}
    </div>
  );
};
