import React, { useCallback, useEffect, useState } from 'react';
import api from '@/api';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import { isRecord } from '@/lib/core/domainShared';

type Row = Record<string, unknown>;

function pickStr(v: unknown): string {
  if (v === null || v === undefined) return '—';
  return String(v);
}

export const AdminSubscriptionPaymentsPage: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.admin.subscriptionPayments({ limit: 200 });
      const list = Array.isArray(data) ? data : [];
      setRows(list.filter(isRecord) as Row[]);
    } catch (e) {
      setError(userMessageFromUnknown(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (id: string, status: 'CONTACTED' | 'PAID' | 'REJECTED') => {
    setBusyId(id);
    setError(null);
    try {
      await api.admin.subscriptionPaymentPatch(id, { status });
      await load();
    } catch (e) {
      setError(userMessageFromUnknown(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Subscription payments (WhatsApp)</h1>
        <p className="tenant-page-lead">
          Pending requests from <code>POST /api/payment/manual/initiate</code>. Mark <strong>PAID</strong> after funds are
          confirmed — the catalog plan is applied automatically.
        </p>
      </div>
      {error ? <p className="neo-text-danger">{error}</p> : null}
      {loading ? <p>Loading…</p> : null}
      <div style={{ overflowX: 'auto' }}>
        <table className="neo-table" style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th>Invoice ID</th>
              <th>User</th>
              <th>Clinic</th>
              <th>Plan</th>
              <th>Amount (৳)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const id = typeof r.id === 'string' ? r.id : '';
              const clinic = isRecord(r.clinic) ? r.clinic : null;
              const user = isRecord(r.user) ? r.user : null;
              const amountMinor = typeof r.amount === 'number' ? r.amount : 0;
              const amountDisplay = (amountMinor / 100).toFixed(2);
              const planLabel =
                (typeof r.planName === 'string' && r.planName) || (typeof r.planCode === 'string' && r.planCode) || '—';
              return (
                <tr key={id || Math.random().toString(36)}>
                  <td>
                    <code style={{ fontSize: 11 }}>{id || '—'}</code>
                  </td>
                  <td>
                    {user ? (
                      <>
                        {pickStr(user.name)}
                        <br />
                        <span style={{ color: 'var(--neo-text-muted)', fontSize: 12 }}>{pickStr(user.email)}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{clinic && typeof clinic.name === 'string' ? clinic.name : '—'}</td>
                  <td>{planLabel}</td>
                  <td>{amountDisplay}</td>
                  <td>{pickStr(r.status)}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      <button
                        type="button"
                        className="neo-btn neo-btn-secondary"
                        style={{ fontSize: 12 }}
                        disabled={!id || busyId === id}
                        onClick={() => void patch(id, 'CONTACTED')}
                      >
                        Contacted
                      </button>
                      <button
                        type="button"
                        className="neo-btn neo-btn-primary"
                        style={{ fontSize: 12 }}
                        disabled={!id || busyId === id}
                        onClick={() => void patch(id, 'PAID')}
                      >
                        Mark paid
                      </button>
                      <button
                        type="button"
                        className="neo-btn"
                        style={{ fontSize: 12 }}
                        disabled={!id || busyId === id}
                        onClick={() => void patch(id, 'REJECTED')}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!loading && rows.length === 0 ? <p style={{ marginTop: 12 }}>No payment requests yet.</p> : null}
      <p style={{ marginTop: 16 }}>
        <button type="button" className="neo-btn neo-btn-secondary" onClick={() => void load()}>
          Refresh
        </button>
      </p>
    </div>
  );
};
