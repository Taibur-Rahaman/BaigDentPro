/** Mirrors `server/src/utils/featureFlags.ts` for client-side UX gating only; server remains authoritative. */
export type FeatureName =
  | 'products.read'
  | 'products.write'
  | 'orders.read'
  | 'orders.write'
  | 'orders.export'
  | 'analytics.view';

const PLAN_DEFAULTS: Record<string, readonly FeatureName[]> = {
  FREE: ['products.read', 'products.write', 'orders.read', 'orders.write'],
  PRO: [
    'products.read',
    'products.write',
    'orders.read',
    'orders.write',
    'orders.export',
    'analytics.view',
  ],
  ENTERPRISE: [
    'products.read',
    'products.write',
    'orders.read',
    'orders.write',
    'orders.export',
    'analytics.view',
  ],
};

function asRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

export function isFeatureEnabled(plan: string, featuresJson: unknown, name: FeatureName): boolean {
  const overrides = asRecord(featuresJson);
  const o = overrides[name];
  if (typeof o === 'boolean') return o;

  const p = (plan || 'FREE').toUpperCase();
  const defaults = PLAN_DEFAULTS[p] ?? PLAN_DEFAULTS.FREE;
  return defaults.includes(name);
}
