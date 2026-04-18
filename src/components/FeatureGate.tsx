import React from 'react';
import { useTenant } from '@/hooks/useTenant';
import type { FeatureName } from '@/lib/featureFlags';

type FeatureGateProps = {
  feature: FeatureName;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

/** Client-side hint only; protected APIs still enforce FACL. */
export const FeatureGate: React.FC<FeatureGateProps> = ({ feature, children, fallback }) => {
  const { isFeatureEnabled } = useTenant();
  if (isFeatureEnabled(feature)) return <>{children}</>;
  return (
    <>
      {fallback ?? (
        <p className="tenant-feature-locked" role="status">
          This area is not available on your current plan.
        </p>
      )}
    </>
  );
};
