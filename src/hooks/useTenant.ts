import { useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { FeatureName } from '@/lib/featureFlags';
import { isFeatureEnabled } from '@/lib/featureFlags';
import type { TenantSummary } from '@/types/tenant';

export function useTenant() {
  const { user } = useAuth();
  const tenant = (user?.tenant ?? null) as TenantSummary | null;
  const plan = tenant?.plan ?? 'FREE';

  const check = useCallback(
    (name: FeatureName) => isFeatureEnabled(plan, tenant?.features, name),
    [plan, tenant?.features]
  );

  return useMemo(
    () => ({
      tenant,
      plan,
      isFeatureEnabled: check,
    }),
    [tenant, plan, check]
  );
}
