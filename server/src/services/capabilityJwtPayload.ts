import { prisma } from '../index.js';
import { computeEffectiveCapabilities, jwtCapabilityPayload } from '../security/capabilityEngine.js';
import { resolveProductFeaturesForClinic } from './productFeatures.js';

/** Signed into access JWT for fast checks on routes without subscription middleware. */
export async function resolveJwtCapabilitiesForUser(opts: {
  role: string;
  clinicId: string | null | undefined;
}): Promise<string[]> {
  const { role } = opts;
  if (role === 'SUPER_ADMIN') return ['*'];
  const cid = opts.clinicId?.trim();
  if (!cid) return [];
  const [features, overrides] = await Promise.all([
    resolveProductFeaturesForClinic(cid),
    prisma.clinicCapabilityOverride.findMany({
      where: { clinicId: cid },
      select: { capabilityKey: true, grant: true },
    }),
  ]);
  const effective = computeEffectiveCapabilities(role, features, overrides);
  return jwtCapabilityPayload(role, effective);
}
