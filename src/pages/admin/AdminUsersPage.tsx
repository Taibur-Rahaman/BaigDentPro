import React, { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/components/ApiError';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import { fetchAdminUsers, type AdminUserRow } from '@/services/adminPanelService';

export const AdminUsersPage: React.FC = () => {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetchAdminUsers({ page: 1, limit: 100 });
      setRows(res.users);
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
        <h1>Users</h1>
        <p className="tenant-page-lead">
          Directory via <code>/api/admin/users</code>. Passwords and session secrets are never returned.
        </p>
        {!loading && !error ? <p style={{ margin: 0, color: 'var(--neo-text-muted)' }}>Total: {total}</p> : null}
      </div>
      {error ? <ApiError message={error} title="Could not load users" onRetry={() => void load()} /> : null}
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
                <th>Email</th>
                <th>Role</th>
                <th>Clinic</th>
                <th>Active</th>
                <th>Approved</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.clinic?.name || u.clinicName || u.clinicId}</td>
                  <td>{u.isActive ? 'Yes' : 'No'}</td>
                  <td>{u.isApproved ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && !error ? <p style={{ padding: '1rem', margin: 0, color: '#64748b' }}>No users found.</p> : null}
        </div>
      )}
    </div>
  );
};
