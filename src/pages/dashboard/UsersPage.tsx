import React, { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/components/ApiError';
import api from '@/api';
import { userMessageFromUnknown } from '@/lib/apiErrors';

type Row = { id: string; email: string; name: string; role: string };

export const UsersPage: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.admin.users({ limit: 50 });
      setRows((res.users as Row[]) || []);
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
        <h1>Users &amp; roles</h1>
        <p className="tenant-page-lead">Clinic directory (admins). Uses <code>/api/admin/users</code>.</p>
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
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
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
