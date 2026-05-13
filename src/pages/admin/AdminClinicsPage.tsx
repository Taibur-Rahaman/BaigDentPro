import React from 'react';
import { ApiError } from '@/components/ApiError';
import { useAdminClinicsView } from '@/hooks/view/useAdminClinicsView';

export const AdminClinicsPage: React.FC = () => {
  const { rows, loading, error, detail, setDetail, busyId, load, toggleClinicActive } = useAdminClinicsView();

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Clinics</h1>
        <p className="tenant-page-lead">Operational directory with plan-tier visibility and lifecycle controls.</p>
      </div>
      {error ? <ApiError message={error} title="Could not load clinics" onRetry={() => void load()} /> : null}
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
                <th>Name</th>
                <th>Plan / subscription</th>
                <th>Active</th>
                <th>Users</th>
                <th>Branches</th>
                <th>Products</th>
                <th>Orders</th>
                <th>Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.plan || '—'}</td>
                  <td>{c.isActive ? 'Yes' : 'No'}</td>
                  <td>{c._count.users}</td>
                  <td>{c._count.branches ?? '—'}</td>
                  <td>{c._count.products}</td>
                  <td>{c._count.orders}</td>
                  <td>{[c.email, c.phone].filter(Boolean).join(' · ') || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" className="neo-btn neo-btn-secondary neo-btn-sm" onClick={() => setDetail(c)}>
                      Details
                    </button>{' '}
                    <button
                      type="button"
                      className="neo-btn neo-btn-sm"
                      disabled={busyId === c.id}
                      onClick={() => void toggleClinicActive(c)}
                      style={{
                        ...(c.isActive
                          ? { borderColor: 'rgba(220,38,38,0.5)', color: '#991b1b' }
                          : { borderColor: 'rgba(16,185,129,0.55)', color: '#065f46' }),
                      }}
                    >
                      {busyId === c.id ? '…' : c.isActive ? 'Suspend' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && !error ? <p style={{ padding: '1rem', margin: 0, color: '#64748b' }}>No clinics found.</p> : null}
        </div>
      )}

      {detail ? (
        <div
          className="tenant-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          role="dialog"
          aria-modal
          aria-labelledby="admin-clinic-detail-title"
          onClick={() => setDetail(null)}
        >
          <div className="tenant-card" style={{ maxWidth: 480, width: '100%', padding: '1.25rem' }} onClick={(e) => e.stopPropagation()}>
            <h2 id="admin-clinic-detail-title" style={{ marginTop: 0 }}>
              {detail.name}
            </h2>
            <dl style={{ margin: 0, display: 'grid', gap: '0.6rem', fontSize: 14 }}>
              <div>
                <dt style={{ fontWeight: 700 }}>Subscription / plan</dt>
                <dd style={{ margin: 0 }}>{detail.plan}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 700 }}>Status</dt>
                <dd style={{ margin: 0 }}>{detail.isActive ? 'Active' : 'Suspended'}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 700 }}>Contact</dt>
                <dd style={{ margin: 0 }}>{[detail.email, detail.phone].filter(Boolean).join(' · ') || '—'}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 700 }}>Address</dt>
                <dd style={{ margin: 0 }}>{detail.address || '—'}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 700 }}>Created</dt>
                <dd style={{ margin: 0 }}>{detail.createdAt ? new Date(detail.createdAt).toLocaleString() : '—'}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 700 }}>Volumes</dt>
                <dd style={{ margin: 0 }}>
                  {detail._count.users} users · {detail._count.branches ?? 0} branches · {detail._count.products} products ·{' '}
                  {detail._count.orders} orders
                </dd>
              </div>
              <div>
                <dt style={{ fontWeight: 700 }}>Internal ID</dt>
                <dd style={{ margin: 0, wordBreak: 'break-all', fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{detail.id}</dd>
              </div>
            </dl>
            <div style={{ display: 'flex', gap: 8, marginTop: '1.25rem', flexWrap: 'wrap' }}>
              <button type="button" className="neo-btn neo-btn-secondary" onClick={() => setDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
