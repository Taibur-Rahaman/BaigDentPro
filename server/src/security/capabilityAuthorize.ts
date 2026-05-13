import { prisma } from '../index.js';
import type { AuthRequest } from '../middleware/auth.js';
import { resolveProductFeaturesForClinic } from '../services/productFeatures.js';
import { computeEffectiveCapabilities, hasCapability as hasCap } from './capabilityEngine.js';
import type { Capability } from './capabilities.js';

/**
 * Resolve effective caps when subscription middleware did not populate `req.effectiveCapabilities`
 * (e.g. `/api/admin` exempt from subscription tier load).
 */
export async function resolveEffectiveCapabilitiesOnRequest(req: AuthRequest): Promise<ReadonlySet<Capability>> {
  const role = req.user?.role ?? '';
  if (role === 'SUPER_ADMIN') {
    return new Set();
  }
  if (req.effectiveCapabilities !== undefined) {
    return req.effectiveCapabilities;
  }
  const clinicId = (req.businessClinicId ?? req.effectiveClinicId ?? req.user?.clinicId)?.trim();
  if (!clinicId) {
    return new Set();
  }
  const [features, overrides] = await Promise.all([
    resolveProductFeaturesForClinic(clinicId),
    prisma.clinicCapabilityOverride.findMany({
      where: { clinicId },
      select: { capabilityKey: true, grant: true },
    }),
  ]);
  const eff = computeEffectiveCapabilities(role, features, overrides);
  req.effectiveCapabilities = eff;
  return eff;
}

export async function requestHasCapability(req: AuthRequest, capability: Capability): Promise<boolean> {
  const role = req.user?.role ?? '';
  if (role === 'SUPER_ADMIN') return true;
  const eff = await resolveEffectiveCapabilitiesOnRequest(req);
  return hasCap(role, eff, req.jwtCapabilities, capability);
}
