import { useMemo } from 'react';
import { TENANT_PLANS, type TenantTier } from '@/lib/core/coreTenantPlan';

const ORDERED_TIERS: readonly TenantTier[] = ['FREE', 'PRO', 'ENTERPRISE'];

export function useTenantPlanView() {
  return useMemo(
    () => ({
      plans: TENANT_PLANS,
      orderedTiers: ORDERED_TIERS,
    }),
    []
  );
}
