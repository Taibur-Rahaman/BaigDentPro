import { useCallback, useEffect, useState } from 'react';
import api from '@/api';
import { resolveSubscriptionPresentation } from '@/lib/core/coreBillingEngine';

export function useBillingView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res = await api.billing.subscription();
      if (!res.success) res = await api.billing.status();
      if (!res.success) throw new Error('billing unavailable');
      setRaw(res.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load billing');
      setRaw(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const checkoutHint = useCallback(async (planCode?: string) => {
    return api.billing.checkout({ planCode });
  }, []);

  const presentation = raw
    ? resolveSubscriptionPresentation({
        status: String(raw.status ?? ''),
        plan: String(raw.plan ?? ''),
        expiresAt: raw.expiresAt ? String(raw.expiresAt) : null,
      })
    : null;

  return {
    loading,
    error,
    raw,
    presentation,
    reload: load,
    requestCheckoutHint: checkoutHint,
  };
}
