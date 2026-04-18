import React, { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/components/ApiError';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import { fetchAdminClinics, type AdminClinicRow } from '@/services/adminPanelService';

export const AdminClinicsPage: React.FC = () => {
  const [rows, setRows] = useState<AdminClinicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetchAdminClinics();
      setRows(res.clinics);
    } catch (e) {
      setRows([]);
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
        <h1>Clinics</h1>
        <p className="tenant-page-lead">
          <code>/api/admin/clinics</code> — super admins see every tenant; clinic admins see their own organization only.
        </p>
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
                <th>Plan</th>
                <th>Active</th>
                <th>Users</th>
                <th>Products</th>
                <th>Orders</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.plan}</td>
                  <td>{c.isActive ? 'Yes' : 'No'}</td>
                  <td>{c._count.users}</td>
                  <td>{c._count.products}</td>
                  <td>{c._count.orders}</td>
                  <td>
                    {[c.email, c.phone].filter(Boolean).join(' · ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && !error ? <p style={{ padding: '1rem', margin: 0, color: '#64748b' }}>No clinics found.</p> : null}
        </div>
      )}
    </div>
  );
};
