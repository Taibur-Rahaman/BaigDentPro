import React, { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/components/ApiError';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import { fetchAdminAuditLogs, type AdminAuditLogRow } from '@/services/adminPanelService';

function formatMeta(meta: unknown): string {
  if (meta === null || meta === undefined) return '—';
  try {
    const s = JSON.stringify(meta);
    return s.length > 160 ? `${s.slice(0, 157)}…` : s;
  } catch {
    return '—';
  }
}

export const AdminAuditLogsPage: React.FC = () => {
  const [rows, setRows] = useState<AdminAuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetchAdminAuditLogs({ page: 1, limit: 80 });
      setRows(res.logs);
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
        <h1>Audit logs</h1>
        <p className="tenant-page-lead">
          Structured events from <code>/api/admin/audit-logs</code>. Review metadata carefully — upstream features may store operational fields.
        </p>
        {!loading && !error ? <p style={{ margin: 0, color: 'var(--neo-text-muted)' }}>Total: {total}</p> : null}
      </div>
      {error ? <ApiError message={error} title="Could not load audit logs" onRetry={() => void load()} /> : null}
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
                <th>Action</th>
                <th>Actor</th>
                <th>Entity</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>{log.action}</td>
                  <td>
                    <div>{log.user.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--neo-text-muted)' }}>{log.user.email}</div>
                  </td>
                  <td>{log.entityId || '—'}</td>
                  <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>{formatMeta(log.metadata)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && !error ? <p style={{ padding: '1rem', margin: 0, color: '#64748b' }}>No audit entries found.</p> : null}
        </div>
      )}
    </div>
  );
};
