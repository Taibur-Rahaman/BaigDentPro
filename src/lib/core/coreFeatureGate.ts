/**
 * Subscription feature gating — authoritative state still comes from server;
 * UI must call these helpers rather than branching on raw plan strings.
 */

import type { EnterpriseFeatureKey, TenantTier } from '@/lib/core/coreTenantPlan';
import { TENANT_PLANS, normalizeTier } from '@/lib/core/coreTenantPlan';

function asOverrides(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

/** Whether the effective tenant bundle unlocks `feature`. */
export function hasFeature(plan: string, featuresJson: unknown | undefined, feature: EnterpriseFeatureKey): boolean {
  const overrides = asOverrides(featuresJson);
  const o = overrides[feature];
  if (typeof o === 'boolean') return o;

  const tier = normalizeTier(plan);
  const defs = TENANT_PLANS[tier]?.features ?? TENANT_PLANS.FREE.features;
  return defs.includes(feature);
}

/** Throws Error when feature unavailable — use from hooks/services only. */
export function requireFeature(
  plan: string,
  featuresJson: unknown | undefined,
  feature: EnterpriseFeatureKey
): void {
  if (!hasFeature(plan, featuresJson, feature)) {
    throw new Error(`Feature locked: ${feature}`);
  }
}

/** Merge server plan string + optional promo overrides */
export function effectiveTier(plan: string, featuresJson: unknown | undefined): TenantTier {
  const overrides = asOverrides(featuresJson);
  const forced = overrides['_tier'];
  if (forced === 'PRO' || forced === 'ENTERPRISE' || forced === 'FREE') return forced;
  return normalizeTier(plan);
}
