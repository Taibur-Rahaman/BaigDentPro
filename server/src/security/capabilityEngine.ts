import type { ProductFeatureKey } from '../services/productFeatures.js';
import type { Capability } from './capabilities.js';
import { isCapabilityString } from './capabilities.js';
import { baselineCapabilitiesForRole, shopCapabilityList } from './roleCapabilities.js';

/**
 * When set, the capability is only effective if the merged product feature map is true.
 * (Aligns with `resolveProductFeaturesForClinic` — does not replace that service.)
 */
export const CAPABILITY_REQUIRES_FEATURE: Partial<Record<Capability, ProductFeatureKey>> = {
  'dpms:access': 'patient_management',
  'dpms:dashboard:read': 'patient_management',
  'dpms:patients:read': 'patient_management',
  'dpms:patients:write': 'patient_management',
  'dpms:appointments:read': 'patient_management',
  'dpms:appointments:write': 'patient_management',
  'dpms:prescriptions:read': 'digital_prescription',
  'dpms:prescriptions:write': 'digital_prescription',
  'dpms:billing:read': 'billing',
  'dpms:billing:write': 'billing',
  'dpms:lab:access': 'lab_tracking',
  'dpms:analytics:advanced': 'advanced_analytics',
  'clinic:multi_branch:manage': 'multi_branch',
  'shop:catalog:read': 'shop_access',
  'shop:products:read': 'shop_access',
  'shop:products:manage': 'shop_access',
  'shop:orders:read': 'shop_access',
  'shop:orders:manage': 'shop_access',
  'clinic:inventory:manage': 'patient_management',
  'clinic:settings:clinical': 'patient_management',
};

function isShopOnlyRole(role: string): boolean {
  return role === 'TENANT' || role === 'STORE_MANAGER' || role === 'SELLER';
}

function applyPlanBundledCaps(role: string, features: Record<ProductFeatureKey, boolean>, set: Set<Capability>): void {
  if (features.shop_access && (role === 'CLINIC_ADMIN' || role === 'CLINIC_OWNER')) {
    for (const c of shopCapabilityList()) set.add(c);
  }
  if (features.advanced_analytics && !isShopOnlyRole(role) && role !== 'PENDING_APPROVAL') {
    set.add('dpms:analytics:advanced');
  }
  if (features.multi_branch && (role === 'CLINIC_ADMIN' || role === 'CLINIC_OWNER')) {
    set.add('clinic:multi_branch:manage');
  }
}

function stripDisallowedByPlan(set: Set<Capability>, features: Record<ProductFeatureKey, boolean>): void {
  for (const cap of [...set]) {
    const req = CAPABILITY_REQUIRES_FEATURE[cap];
    if (req && !features[req]) set.delete(cap);
  }
}

/** Merge role baseline + plan features + SuperAdmin clinic overrides. */
export function computeEffectiveCapabilities(
  role: string,
  features: Record<ProductFeatureKey, boolean>,
  overrides: readonly { capabilityKey: string; grant: boolean }[],
): Set<Capability> {
  if (role === 'SUPER_ADMIN') {
    return new Set();
  }
  const set = new Set(baselineCapabilitiesForRole(role));
  applyPlanBundledCaps(role, features, set);
  stripDisallowedByPlan(set, features);
  const sorted = [...overrides].sort((a, b) => Number(a.grant) - Number(b.grant));
  for (const o of sorted) {
    if (!isCapabilityString(o.capabilityKey)) continue;
    if (o.grant) set.add(o.capabilityKey);
    else set.delete(o.capabilityKey);
  }
  return set;
}

export function jwtCapabilityPayload(role: string, effective: ReadonlySet<Capability>): string[] {
  if (role === 'SUPER_ADMIN') return ['*'];
  return [...effective];
}

export function hasCapability(
  role: string | undefined,
  effective: ReadonlySet<Capability> | undefined,
  jwtCaps: readonly string[] | undefined,
  required: Capability,
): boolean {
  const r = (role ?? '').trim();
  if (r === 'SUPER_ADMIN') return true;
  /** Must honor an explicit empty set (all caps stripped by plan) — do not fall back to JWT in that case. */
  if (effective !== undefined) return effective.has(required);
  if (jwtCaps?.includes('*')) return true;
  return Boolean(jwtCaps?.includes(required));
}
