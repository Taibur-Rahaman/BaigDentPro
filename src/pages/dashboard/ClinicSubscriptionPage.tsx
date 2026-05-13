import React from 'react';
import { PAYMENT_METHOD } from '../../../config/payment';
import { ApiError } from '@/components/ApiError';
import { useAuth } from '@/hooks/useAuth';
import { useClinicSubscriptionWorkspaceView } from '@/hooks/view/useClinicSubscriptionWorkspaceView';

export const ClinicSubscriptionPage: React.FC = () => {
  const { user } = useAuth();
  const {
    loading,
    error,
    reload,
    catalogPlan,
    setCatalogPlan,
    upgrading,
    upgradeMsg,
    isSuperAdmin,
    isClinicAdmin,
    waLoading,
    waMsg,
    openWhatsAppCheckout,
    runSuperUpgrade,
    sub,
    clinic,
  } = useClinicSubscriptionWorkspaceView(user);

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Subscription</h1>
        <p className="tenant-page-lead">
          Current clinic plan from <code>/api/clinic/subscription</code>. Plan purchases use{' '}
          <strong>{PAYMENT_METHOD}</strong> — WhatsApp only (no card gateways).
        </p>
      </div>
      {error ? <ApiError message={error} title="Could not load subscription" onRetry={() => void reload()} /> : null}
      {loading ? (
        <div className="tenant-loading" role="status">
          <div className="neo-loading-spinner tenant-spinner" />
          <span>Loading…</span>
        </div>
      ) : (
        <div className="tenant-card">
          <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Clinic</h2>
          <p style={{ margin: '0.25rem 0' }}>
            <strong>Name:</strong> {clinic ? clinic.name : '—'}
          </p>
          <p style={{ margin: '0.25rem 0' }}>
            <strong>Catalog tier (legacy field):</strong> {clinic ? clinic.plan : '—'}
          </p>
          <p style={{ margin: '0.25rem 0' }}>
            <strong>Active:</strong> {clinic && clinic.isActive === false ? 'No' : 'Yes'}
          </p>
          <hr style={{ margin: '1.25rem 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
          <h2 style={{ fontSize: '1.1rem' }}>Billing subscription</h2>
          {!sub ? (
            <p style={{ color: '#64748b' }}>No subscription row found for this clinic.</p>
          ) : (
            <>
              <p style={{ margin: '0.25rem 0' }}>
                <strong>Plan:</strong>{' '}
                {typeof sub.plan === 'string' || typeof sub.plan === 'number' ? String(sub.plan) : '—'}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong>Status:</strong> {typeof sub.status === 'string' ? sub.status : '—'}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong>Device limit:</strong>{' '}
                {sub.deviceLimit === undefined || sub.deviceLimit === null ? '—' : String(sub.deviceLimit)}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong>Devices in use (distinct):</strong>{' '}
                {sub.devicesInUse === undefined || sub.devicesInUse === null ? '—' : String(sub.devicesInUse)}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong>Renew / end:</strong>{' '}
                {sub.endDate ? String(sub.endDate) : sub.expiresAt ? String(sub.expiresAt) : '—'}
              </p>
              <details style={{ marginTop: '1rem' }}>
                <summary style={{ cursor: 'pointer' }}>Plan feature bundle</summary>
                <pre style={{ fontSize: 12, overflow: 'auto', maxHeight: 240 }}>
                  {JSON.stringify(sub.planFeatures ?? {}, null, 2)}
                </pre>
              </details>
            </>
          )}

          {isClinicAdmin ? (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '1.05rem', marginTop: 0 }}>Purchase / upgrade via WhatsApp</h2>
              <p style={{ fontSize: 14, color: '#64748b', marginTop: 0 }}>
                Select the catalog plan code. We create a pending payment and open WhatsApp with a prefilled message —
                no manual typing required.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <label style={{ display: 'flex', flexDirection: 'column', fontSize: 13, gap: 4 }}>
                  Plan code
                  <input value={catalogPlan} onChange={(e) => setCatalogPlan(e.target.value)} style={{ minWidth: 140 }} />
                </label>
                <button
                  type="button"
                  className="neo-btn neo-btn-primary"
                  style={{ alignSelf: 'flex-end' }}
                  disabled={waLoading}
                  onClick={() => void openWhatsAppCheckout()}
                >
                  {waLoading ? 'Opening…' : 'Open WhatsApp checkout'}
                </button>
              </div>
              {waMsg ? <p style={{ marginTop: 10, fontSize: 14 }}>{waMsg}</p> : null}
            </div>
          ) : null}

          {isSuperAdmin ? (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '1.05rem', marginTop: 0 }}>Admin: apply plan directly</h2>
              <p style={{ fontSize: 14, color: '#64748b', marginTop: 0 }}>
                Super-admin override (no payment). Seeded plans include FREE, PLATINUM, PREMIUM, LUXURY.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <input value={catalogPlan} onChange={(e) => setCatalogPlan(e.target.value)} style={{ minWidth: 160 }} />
                <button type="button" className="neo-btn neo-btn-primary" disabled={upgrading} onClick={() => void runSuperUpgrade()}>
                  {upgrading ? 'Saving…' : 'Apply upgrade'}
                </button>
              </div>
              {upgradeMsg ? <p style={{ marginTop: 10, fontSize: 14 }}>{upgradeMsg}</p> : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
