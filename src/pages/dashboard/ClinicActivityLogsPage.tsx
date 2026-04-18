import React, { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/components/ApiError';
import api from '@/api';
import { userMessageFromUnknown } from '@/lib/apiErrors';

type LogRow = {
  id: string;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  details?: string | null;
  createdAt: string;
  user?: { email?: string; name?: string; role?: string };
};

export const ClinicActivityLogsPage: React.FC = () => {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.clinic.activityLogs({
        page: 1,
        limit: 100,
        userId: userId.trim() || undefined,
        from: from.trim() || undefined,
        to: to.trim() || undefined,
      });
      setRows((res.logs as LogRow[]) || []);
      setTotal(res.total ?? 0);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(userMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, [userId, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Activity logs</h1>
        <p className="tenant-page-lead">
          Recent actions for users in your clinic (<code>/api/clinic/activity-logs</code>). Total matching: {total}.
        </p>
      </div>
      <div className="tenant-card" style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <label className="neo-field" style={{ minWidth: 200 }}>
          <span>User id</span>
          <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Optional" />
        </label>
        <label className="neo-field" style={{ minWidth: 140 }}>
          <span>From</span>
          <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="YYYY-MM-DD" />
        </label>
        <label className="neo-field" style={{ minWidth: 140 }}>
          <span>To</span>
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="YYYY-MM-DD" />
        </label>
        <button type="button" className="neo-btn neo-btn-secondary" onClick={() => void load()}>
          Apply filters
        </button>
      </div>
      {error ? <ApiError message={error} title="Could not load activity" onRetry={() => void load()} /> : null}
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
                <th>When</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
                  <td>
                    {r.user?.name || '—'}
                    <div style={{ fontSize: 12, color: '#64748b' }}>{r.user?.email}</div>
                  </td>
                  <td>{r.action}</td>
                  <td>
                    {r.entity || '—'}
                    {r.entityId ? <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.entityId}</div> : null}
                  </td>
                  <td style={{ maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.details || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && !error ? <p style={{ padding: '1rem', margin: 0, color: '#64748b' }}>No activity yet.</p> : null}
        </div>
      )}
    </div>
  );
};
