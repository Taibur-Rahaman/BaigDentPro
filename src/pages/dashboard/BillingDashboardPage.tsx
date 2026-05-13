import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBillingView } from '@/hooks/view/useBillingView';

export const BillingDashboardPage: React.FC = () => {
  const bv = useBillingView();
  const [hintMsg, setHintMsg] = useState<string | null>(null);

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Billing &amp; subscription</h1>
        <p className="tenant-page-lead">Presentation from coreBillingEngine · live payload from `/api/billing/subscription`.</p>
      </div>
      {bv.loading ? <p>Loading…</p> : null}
      {bv.error ? <p className="neo-text-danger">{bv.error}</p> : null}
      {bv.presentation ? (
        <div className="neo-panel" style={{ marginBottom: 16 }}>
          <h2>{bv.presentation.headline}</h2>
          <p>Status chip: {bv.presentation.statusChip}</p>
          {bv.presentation.renewalHint ? <p>{bv.presentation.renewalHint}</p> : null}
          <button type="button" className="neo-btn neo-btn-secondary" onClick={() => void bv.reload()}>
            Refresh
          </button>
        </div>
      ) : null}
      <div className="neo-panel">
        <h3>SaaS checkout routing</h3>
        <p style={{ fontSize: 14, color: 'var(--neo-text-muted)' }}>
          Subscription upgrades use <strong>manual WhatsApp</strong> from <strong>/dashboard/subscription</strong> (
          <code>POST /api/payment/manual/initiate</code>). Below requests the backend routing hint via{' '}
          <code>/api/billing/checkout</code>.
        </p>
        <button
          type="button"
          className="neo-btn neo-btn-primary"
          onClick={async () => {
            try {
              const r = await bv.requestCheckoutHint('PRO');
              setHintMsg(JSON.stringify(r.data ?? r, null, 2));
            } catch {
              setHintMsg('Checkout hint failed (needs active session + billing scope)');
            }
          }}
        >
          Request checkout hint (PRO)
        </button>
        {hintMsg ? (
          <pre style={{ marginTop: 12, fontSize: 12, overflow: 'auto' }}>{hintMsg}</pre>
        ) : null}
      </div>
      <p style={{ marginTop: 24 }}>
        <Link to="/dashboard/plans">Plan matrix</Link> · <Link to="/dashboard/subscription">Pay &amp; upgrade</Link>
      </p>
    </div>
  );
};
