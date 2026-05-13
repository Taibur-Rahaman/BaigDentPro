/**
 * DPMS product feature flags — merged from clinic tier, subscription JSON overrides, and `ClinicFeatureFlag` rows.
 */
import { prisma } from '../index.js';

export const PRODUCT_FEATURE_KEYS = [
  'patient_management',
  'digital_prescription',
  'billing',
  'advanced_analytics',
  'multi_branch',
  'lab_tracking',
  'shop_access',
] as const;

export type ProductFeatureKey = (typeof PRODUCT_FEATURE_KEYS)[number];

function asBool(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined;
}

/** Tier defaults aligned with Starter / Growth / Enterprise positioning. */
const TIER_DEFAULTS: Record<string, Record<ProductFeatureKey, boolean>> = {
  STARTER: {
    patient_management: true,
    digital_prescription: true,
    billing: true,
    advanced_analytics: false,
    multi_branch: false,
    lab_tracking: true,
    shop_access: true,
  },
  GROWTH: {
    patient_management: true,
    digital_prescription: true,
    billing: true,
    advanced_analytics: true,
    multi_branch: false,
    lab_tracking: true,
    shop_access: true,
  },
  ENTERPRISE: {
    patient_management: true,
    digital_prescription: true,
    billing: true,
    advanced_analytics: true,
    multi_branch: true,
    lab_tracking: true,
    shop_access: true,
  },
};

function normalizeTier(raw: string | null | undefined): keyof typeof TIER_DEFAULTS {
  const u = String(raw ?? 'STARTER').toUpperCase();
  if (u === 'GROWTH' || u === 'ENTERPRISE' || u === 'STARTER') return u;
  return 'STARTER';
}

function recordFromTier(tier: keyof typeof TIER_DEFAULTS): Record<ProductFeatureKey, boolean> {
  return { ...TIER_DEFAULTS[tier] };
}

function mergeSubscriptionJson(
  base: Record<ProductFeatureKey, boolean>,
  subscriptionFeatures: unknown
): Record<ProductFeatureKey, boolean> {
  const out = { ...base };
  if (!subscriptionFeatures || typeof subscriptionFeatures !== 'object' || Array.isArray(subscriptionFeatures)) {
    return out;
  }
  const o = subscriptionFeatures as Record<string, unknown>;
  for (const k of PRODUCT_FEATURE_KEYS) {
    const b = asBool(o[k]);
    if (b !== undefined) out[k] = b;
  }
  return out;
}

function mergePlanRefJson(
  base: Record<ProductFeatureKey, boolean>,
  planFeatures: unknown
): Record<ProductFeatureKey, boolean> {
  return mergeSubscriptionJson(base, planFeatures);
}

/** Resolve effective boolean map for a clinic (async / DB). */
export async function resolveProductFeaturesForClinic(clinicId: string): Promise<Record<ProductFeatureKey, boolean>> {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: {
      planTier: true,
      subscription: {
        include: { planRef: true },
      },
      featureFlagRows: true,
    },
  });

  if (!clinic) {
    return recordFromTier('STARTER');
  }

  const tier = normalizeTier(clinic.planTier);
  let merged = recordFromTier(tier);

  const sub = clinic.subscription;
  if (sub?.planRef?.features) {
    merged = mergePlanRefJson(merged, sub.planRef.features);
  }
  merged = mergeSubscriptionJson(merged, sub?.features ?? {});

  for (const row of clinic.featureFlagRows) {
    const key = row.featureKey as ProductFeatureKey;
    if (PRODUCT_FEATURE_KEYS.includes(key)) {
      merged[key] = row.enabled;
    }
  }

  return merged;
}
