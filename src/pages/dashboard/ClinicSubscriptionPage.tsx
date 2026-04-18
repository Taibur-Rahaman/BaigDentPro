import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { ApiError } from '@/components/ApiError';
import api from '@/api';
import { userMessageFromUnknown } from '@/lib/apiErrors';
import { useAuth } from '@/hooks/useAuth';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const ClinicSubscriptionPage: React.FC = () => {
  const { user } = useAuth();
  const [payload, setPayload] = useState<{ clinic: unknown; subscription: unknown } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogPlan, setCatalogPlan] = useState('PREMIUM');
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);

  const publishableKey = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '').trim();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isClinicAdmin = user?.role === 'CLINIC_ADMIN';

  const [stripeBdt, setStripeBdt] = useState('100');
  const [stripePreparing, setStripePreparing] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [stripePayReady, setStripePayReady] = useState(false);
  const [stripePaying, setStripePaying] = useState(false);
  const [stripeMsg, setStripeMsg] = useState<string | null>(null);

  const paymentHostRef = useRef<HTMLDivElement | null>(null);
  const stripeCtxRef = useRef<{ stripe: Stripe; elements: StripeElements } | null>(null);
  const paymentElementRef = useRef<StripePaymentElement | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.clinic.subscription();
      setPayload(res);
    } catch (e) {
      setPayload(null);
      setError(userMessageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!stripeClientSecret || !publishableKey || !paymentHostRef.current) {
      return;
    }

    const host = paymentHostRef.current;
    let cancelled = false;

    (async () => {
      try {
        const { loadStripe } = await import('@stripe/stripe-js');
        const stripe = await loadStripe(publishableKey);
        if (!stripe || cancelled) return;

        const elements = stripe.elements({ clientSecret: stripeClientSecret });
        const paymentElement = elements.create('payment');
        paymentElement.on('ready', () => {
          if (!cancelled) setStripePayReady(true);
        });
        paymentElement.mount(host);
        paymentElementRef.current = paymentElement;
        stripeCtxRef.current = { stripe, elements };
      } catch (e) {
        if (!cancelled) {
          setStripeMsg(userMessageFromUnknown(e));
          setStripeClientSecret(null);
          setPendingPaymentId(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      setStripePayReady(false);
      paymentElementRef.current?.unmount();
      paymentElementRef.current = null;
      stripeCtxRef.current = null;
    };
  }, [stripeClientSecret, publishableKey]);

  const resetStripeCheckout = () => {
    setStripeClientSecret(null);
    setPendingPaymentId(null);
    setStripePayReady(false);
    setStripeMsg(null);
    paymentElementRef.current?.unmount();
    paymentElementRef.current = null;
    stripeCtxRef.current = null;
  };

  const confirmSubscriptionAfterPayment = async (paymentId: string) => {
    let last = 'Waiting for payment confirmation on the server.';
    for (let attempt = 0; attempt < 16; attempt++) {
      if (attempt > 0) await sleep(1200);
      try {
        await api.subscription.upgrade({ verifiedPaymentId: paymentId });
        return;
      } catch (e) {
        last = userMessageFromUnknown(e);
      }
    }
    throw new Error(last);
  };

  const runSuperUpgrade = async () => {
    setUpgradeMsg(null);
    setUpgrading(true);
    try {
      const clinicRecord = payload?.clinic as { id?: string } | null | undefined;
      await api.subscription.upgrade({
        planName: catalogPlan.trim(),
        durationDays: 365,
        ...(isSuperAdmin && clinicRecord?.id ? { clinicId: clinicRecord.id } : {}),
      });
      setUpgradeMsg('Plan updated.');
      await load();
    } catch (e) {
      setUpgradeMsg(userMessageFromUnknown(e));
    } finally {
      setUpgrading(false);
    }
  };

  const prepareStripeCheckout = async () => {
    setStripeMsg(null);
    if (!publishableKey) {
      setStripeMsg('Set VITE_STRIPE_PUBLISHABLE_KEY for the Vite build to enable card checkout.');
      return;
    }
    const bdt = Number(stripeBdt);
    if (!Number.isFinite(bdt) || bdt <= 0) {
      setStripeMsg('Enter a valid amount in BDT.');
      return;
    }
    const amount = Math.round(bdt * 100);
    if (amount < 50) {
      setStripeMsg('Amount is too small for Stripe (try at least 0.50 BDT).');
      return;
    }

    resetStripeCheckout();
    setStripePreparing(true);
    try {
      const res = await api.payment.initiate({
        amount,
        method: 'STRIPE',
        planCode: catalogPlan.trim().toUpperCase(),
      });
      const secret = res?.data?.stripeClientSecret;
      const pid = res?.data?.payment?.id;
      if (!res?.success || !secret || !pid) {
        setStripeMsg('Checkout could not be started (missing client secret).');
        return;
      }
      setStripeClientSecret(secret);
      setPendingPaymentId(pid);
    } catch (e) {
      setStripeMsg(userMessageFromUnknown(e));
    } finally {
      setStripePreparing(false);
    }
  };

  const submitStripePayment = async () => {
    const ctx = stripeCtxRef.current;
    const paymentId = pendingPaymentId;
    if (!ctx || !paymentId) {
      setStripeMsg('Prepare checkout first.');
      return;
    }
    setStripeMsg(null);
    setStripePaying(true);
    try {
      const returnUrl = `${window.location.origin}/dashboard/subscription`;
      const { error } = await ctx.stripe.confirmPayment({
        elements: ctx.elements,
        confirmParams: { return_url: returnUrl },
        redirect: 'if_required',
      });
      if (error) {
        setStripeMsg(error.message ?? 'Payment failed');
        return;
      }
      setStripeMsg('Confirming subscription…');
      await confirmSubscriptionAfterPayment(paymentId);
      setStripeMsg('Subscription updated.');
      resetStripeCheckout();
      await load();
    } catch (e) {
      setStripeMsg(userMessageFromUnknown(e));
    } finally {
      setStripePaying(false);
    }
  };

  const sub = payload?.subscription as Record<string, unknown> | null | undefined;
  const clinic = payload?.clinic as Record<string, unknown> | null | undefined;

  return (
    <div className="tenant-page">
      <div className="tenant-page-header">
        <h1>Subscription</h1>
        <p className="tenant-page-lead">Current clinic plan and device usage from <code>/api/clinic/subscription</code>.</p>
      </div>
      {error ? <ApiError message={error} title="Could not load subscription" onRetry={() => void load()} /> : null}
      {loading ? (
        <div className="tenant-loading" role="status">
          <div className="neo-loading-spinner tenant-spinner" />
          <span>Loading…</span>
        </div>
      ) : (
        <div className="tenant-card">
          <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Clinic</h2>
          <p style={{ margin: '0.25rem 0' }}>
            <strong>Name:</strong> {String(clinic?.name ?? '—')}
          </p>
          <p style={{ margin: '0.25rem 0' }}>
            <strong>Catalog tier (legacy field):</strong> {String(clinic?.plan ?? '—')}
          </p>
          <p style={{ margin: '0.25rem 0' }}>
            <strong>Active:</strong> {clinic?.isActive === false ? 'No' : 'Yes'}
          </p>
          <hr style={{ margin: '1.25rem 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
          <h2 style={{ fontSize: '1.1rem' }}>Billing subscription</h2>
          {!sub ? (
            <p style={{ color: '#64748b' }}>No subscription row found for this clinic.</p>
          ) : (
            <>
              <p style={{ margin: '0.25rem 0' }}>
                <strong>Plan:</strong> {String(sub.plan ?? '—')}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong>Status:</strong> {String(sub.status ?? '—')}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong>Device limit:</strong> {String(sub.deviceLimit ?? '—')}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong>Devices in use (distinct):</strong> {String(sub.devicesInUse ?? '—')}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong>Renew / end:</strong> {sub.endDate ? String(sub.endDate) : sub.expiresAt ? String(sub.expiresAt) : '—'}
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
              <h2 style={{ fontSize: '1.05rem', marginTop: 0 }}>Upgrade with Stripe</h2>
              <p style={{ fontSize: 14, color: '#64748b', marginTop: 0 }}>
                Creates a PaymentIntent in BDT, then activates the catalog plan after Stripe confirms payment (signed webhook on the API). You can retry server sync if the webhook is slightly delayed.
              </p>
              {!publishableKey ? (
                <p style={{ fontSize: 14, color: '#b45309' }}>
                  Stripe publishable key is not configured. Add <code>VITE_STRIPE_PUBLISHABLE_KEY</code> to your Vite environment before building the app.
                </p>
              ) : null}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <label style={{ display: 'flex', flexDirection: 'column', fontSize: 13, gap: 4 }}>
                  Plan code
                  <input value={catalogPlan} onChange={(e) => setCatalogPlan(e.target.value)} style={{ minWidth: 140 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', fontSize: 13, gap: 4 }}>
                  Amount (BDT)
                  <input
                    type="number"
                    min={0.5}
                    step={0.01}
                    value={stripeBdt}
                    onChange={(e) => setStripeBdt(e.target.value)}
                    style={{ minWidth: 120 }}
                  />
                </label>
                <button
                  type="button"
                  className="neo-btn neo-btn-primary"
                  style={{ alignSelf: 'flex-end' }}
                  disabled={stripePreparing || !publishableKey}
                  onClick={() => void prepareStripeCheckout()}
                >
                  {stripePreparing ? 'Preparing…' : 'Prepare checkout'}
                </button>
                {stripeClientSecret ? (
                  <button type="button" className="neo-btn" style={{ alignSelf: 'flex-end' }} onClick={resetStripeCheckout}>
                    Cancel
                  </button>
                ) : null}
              </div>
              {stripeClientSecret ? (
                <>
                  <div ref={paymentHostRef} style={{ marginTop: 12, marginBottom: 12 }} />
                  <button
                    type="button"
                    className="neo-btn neo-btn-primary"
                    disabled={!stripePayReady || stripePaying}
                    onClick={() => void submitStripePayment()}
                  >
                    {stripePaying ? 'Processing…' : 'Pay and activate plan'}
                  </button>
                </>
              ) : null}
              {stripeMsg ? <p style={{ marginTop: 10, fontSize: 14 }}>{stripeMsg}</p> : null}
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
