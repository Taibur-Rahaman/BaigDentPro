export type FeatureName =
  | 'products.read'
  | 'products.write'
  | 'orders.read'
  | 'orders.write'
  | 'orders.export'
  | 'analytics.view';

const SAAS_PRO_FEATURES: readonly FeatureName[] = [
  'products.read',
  'products.write',
  'orders.read',
  'orders.write',
  'orders.export',
  'analytics.view',
] as const;

const PLAN_DEFAULTS: Record<string, readonly FeatureName[]> = {
  FREE: ['products.read', 'products.write', 'orders.read', 'orders.write'],
  PRO: SAAS_PRO_FEATURES,
  PLATINUM: SAAS_PRO_FEATURES,
  PREMIUM: SAAS_PRO_FEATURES,
  LUXURY: SAAS_PRO_FEATURES,
  ENTERPRISE: SAAS_PRO_FEATURES,
};

function asRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

/** Subscription JSON overrides win over plan defaults (per-key boolean). */
export function isFeatureEnabled(plan: string, featuresJson: unknown, name: FeatureName): boolean {
  const overrides = asRecord(featuresJson);
  const o = overrides[name];
  if (typeof o === 'boolean') return o;

  const p = (plan || 'FREE').toUpperCase();
  const defaults = PLAN_DEFAULTS[p] ?? PLAN_DEFAULTS.FREE;
  return defaults.includes(name);
}

export function checkFeature(plan: string, featuresJson: unknown, name: FeatureName): boolean {
  return isFeatureEnabled(plan, featuresJson, name);
}
