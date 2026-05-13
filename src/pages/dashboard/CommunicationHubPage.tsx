import React, { useCallback, useEffect, useState } from 'react';
import api from '@/api';

type Row = Record<string, unknown>;

export const CommunicationHubPage: React.FC = () => {
  const [smsLogs, setSmsLogs] = useState<Row[]>([]);
  const [emailLogs, setEmailLogs] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, e] = await Promise.all([api.communication.smsLogs(1), api.communication.emailLogs(1)]);
      setSmsLogs(Array.isArray(s.logs) ? (s.logs as Row[]) : []);
      setEmailLogs(Array.isArray(e.logs) ? (e.logs as Row[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
        <h1>Communication hub</h1>
        <p className="tenant-page-lead">
          Live SMS and email activity from <code>/api/communication/*/logs</code>. Sending still uses the same API routes
          (reminders, compose) from practice workflows.
        </p>
      </div>
      {error ? <p className="neo-text-danger">{error}</p> : null}
      {loading ? <p>Loading…</p> : null}
      <div className="neo-panel" style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>Recent SMS</h2>
        {smsLogs.length === 0 ? (
          <p style={{ color: 'var(--neo-text-muted)' }}>No SMS log rows yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="neo-table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Preview</th>
                </tr>
              </thead>
              <tbody>
                {smsLogs.slice(0, 12).map((r) => (
                  <tr key={String(r.id ?? Math.random())}>
                    <td>{r.sentAt != null ? String(r.sentAt) : '—'}</td>
                    <td>{String(r.phone ?? '—')}</td>
                    <td>{String(r.status ?? '—')}</td>
                    <td style={{ maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {String(r.message ?? '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="neo-panel">
        <h2 style={{ marginTop: 0 }}>Recent email</h2>
        {emailLogs.length === 0 ? (
          <p style={{ color: 'var(--neo-text-muted)' }}>No email log rows yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="neo-table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>When</th>
                  <th>To</th>
                  <th>Subject</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {emailLogs.slice(0, 12).map((r) => (
                  <tr key={String(r.id ?? Math.random())}>
                    <td>{r.sentAt != null ? String(r.sentAt) : '—'}</td>
                    <td>{String(r.to ?? '—')}</td>
                    <td style={{ maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {String(r.subject ?? '')}
                    </td>
                    <td>{String(r.status ?? '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p style={{ marginTop: 16 }}>
        <button type="button" className="neo-btn neo-btn-secondary" onClick={() => void load()}>
          Refresh logs
        </button>
      </p>
    </div>
  );
};
