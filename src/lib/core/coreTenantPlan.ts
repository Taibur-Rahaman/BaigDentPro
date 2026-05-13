/** Canonical SaaS tiers — FREE / PRO / ENTERPRISE */

export type TenantTier = 'FREE' | 'PRO' | 'ENTERPRISE';

/** Feature keys consumed by coreFeatureGate (extend freely). */
export type EnterpriseFeatureKey =
  | 'calendar.operatory'
  | 'calendar.enterprise_engine'
  | 'billing.subscription'
  | 'analytics.advanced'
  | 'inventory.clinic'
  | 'communication.hub'
  | 'portal.patient'
  | 'reports.export';

export type TenantPlanDefinition = {
  tier: TenantTier;
  title: string;
  description: string;
  limits: {
    chairs?: number;
    providerSeats?: number;
    smsMonthly?: number;
  };
  features: readonly EnterpriseFeatureKey[];
};

export const TENANT_PLANS: Record<TenantTier, TenantPlanDefinition> = {
  FREE: {
    tier: 'FREE',
    title: 'Free',
    description: 'Core charting & limited scheduling',
    limits: { chairs: 2, providerSeats: 2 },
    features: ['calendar.operatory', 'billing.subscription'],
  },
  PRO: {
    tier: 'PRO',
    title: 'Professional',
    description: 'Multi-operatory scheduling + insights',
    limits: { chairs: 8, providerSeats: 25, smsMonthly: 500 },
    features: [
      'calendar.operatory',
      'calendar.enterprise_engine',
      'billing.subscription',
      'analytics.advanced',
      'inventory.clinic',
      'communication.hub',
      'reports.export',
    ],
  },
  ENTERPRISE: {
    tier: 'ENTERPRISE',
    title: 'Enterprise',
    description: 'Full Dentrix-class calendar + SSO-ready hooks',
    limits: {},
    features: [
      'calendar.operatory',
      'calendar.enterprise_engine',
      'billing.subscription',
      'analytics.advanced',
      'inventory.clinic',
      'communication.hub',
      'portal.patient',
      'reports.export',
    ],
  },
};

export function normalizeTier(plan: string | undefined | null): TenantTier {
  const p = String(plan ?? 'FREE').trim().toUpperCase();
  if (p === 'PRO') return 'PRO';
  if (p === 'ENTERPRISE') return 'ENTERPRISE';
  return 'FREE';
}
