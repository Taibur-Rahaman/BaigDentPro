import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { hasFeature } from '@/lib/core/coreFeatureGate';
import type { EnterpriseFeatureKey } from '@/lib/core/coreTenantPlan';

/** Server remains authoritative; UI uses this for upgrade prompts only. */
export function useEnterpriseFeatureGate(feature: EnterpriseFeatureKey) {
  const { user } = useAuth();
  return useMemo(() => {
    const plan = user?.tenant?.plan ?? 'FREE';
    const featuresJson = user?.tenant?.features;
    const allowed = hasFeature(plan, featuresJson, feature);
    return { allowed, plan, featuresJson };
  }, [feature, user?.tenant?.features, user?.tenant?.plan]);
}
