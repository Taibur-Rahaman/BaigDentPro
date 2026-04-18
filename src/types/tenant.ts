export type TenantSummary = {
  clinicId: string;
  plan: string;
  status: string;
  features: Record<string, unknown>;
  expiresAt: string | null;
};

export function parseTenant(raw: unknown): TenantSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.clinicId !== 'string' || typeof o.plan !== 'string') return null;
  const featuresRaw = o.features;
  const features =
    featuresRaw && typeof featuresRaw === 'object' && !Array.isArray(featuresRaw)
      ? (featuresRaw as Record<string, unknown>)
      : {};
  const expiresAt =
    o.expiresAt === null ? null : typeof o.expiresAt === 'string' ? o.expiresAt : null;
  return {
    clinicId: o.clinicId,
    plan: o.plan,
    status: typeof o.status === 'string' ? o.status : 'ACTIVE',
    features,
    expiresAt,
  };
}
