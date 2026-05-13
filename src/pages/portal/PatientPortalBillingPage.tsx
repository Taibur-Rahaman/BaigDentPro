import React from 'react';
import { usePatientPortalBillingView } from '@/hooks/view/usePatientPortalBillingView';

export const PatientPortalBillingPage: React.FC = () => {
  const { invoices, loading, error, linkResult, linkBusy, requestPaymentLink } = usePatientPortalBillingView(true);

  return (
    <div className="patient-portal-root">
      <h1 className="pp-title">Billing</h1>
      <p className="pp-muted">Invoice list and payment readiness (no clinic staff login required).</p>
      {loading ? <p className="pp-muted">Loading…</p> : null}
      {error ? (
        <p style={{ color: '#b91c1c' }} role="alert">
          {error}
        </p>
      ) : null}
      {invoices.map((inv) => (
        <div key={inv.id} className="pp-card">
          <div className="pp-row-between">
            <span>{inv.invoiceNo}</span>
            <strong>{inv.status}</strong>
          </div>
          <div className="pp-muted" style={{ fontSize: '0.8rem', marginTop: 6 }}>
            Due: {inv.due.toFixed(2)} · Total: {inv.total.toFixed(2)}
          </div>
          <button
            type="button"
            className="pp-btn pp-btn-primary"
            style={{ marginTop: 8 }}
            disabled={linkBusy}
            onClick={() => void requestPaymentLink(inv.id)}
          >
            Payment options
          </button>
        </div>
      ))}
      {linkResult ? (
        <div className="pp-card" role="status">
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{linkResult.message}</p>
          {linkResult.paymentLink ? (
            <a href={linkResult.paymentLink} style={{ fontSize: '0.9rem' }}>
              Open payment
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
