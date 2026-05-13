import type { Capability } from './capabilities.js';

/** Unconditional baseline per role (plan + product-feature gates applied in capabilityEngine). */
const SHOP: readonly Capability[] = [
  'shop:catalog:read',
  'shop:products:read',
  'shop:products:manage',
  'shop:orders:read',
  'shop:orders:manage',
];

const CLINIC_STAFF_DPMS_FULL: readonly Capability[] = [
  'dpms:access',
  'dpms:dashboard:read',
  'dpms:patients:read',
  'dpms:patients:write',
  'dpms:appointments:read',
  'dpms:appointments:write',
  'dpms:prescriptions:read',
  'dpms:prescriptions:write',
  'dpms:billing:read',
  'dpms:billing:write',
  'dpms:lab:access',
];

const CLINIC_ADMIN_EXTRA: readonly Capability[] = [
  'clinic:users:manage',
  'clinic:doctors:manage',
  'clinic:branding:edit',
  'clinic:subscription:manage',
  'clinic:invites:manage',
  'clinic:inventory:manage',
  'clinic:settings:clinical',
];

/** Doctor — DPMS ops; invoicing edits remain constrained by clinicalRbac routers. */
const DOCTOR: readonly Capability[] = [
  'dpms:access',
  'dpms:dashboard:read',
  'dpms:patients:read',
  'dpms:patients:write',
  'dpms:appointments:read',
  'dpms:appointments:write',
  'dpms:prescriptions:read',
  'dpms:prescriptions:write',
  'dpms:billing:read',
  'dpms:lab:access',
];

/** Reception — no Rx authoring. */
const RECEPTIONIST: readonly Capability[] = [
  'dpms:access',
  'dpms:dashboard:read',
  'dpms:patients:read',
  'dpms:patients:write',
  'dpms:appointments:read',
  'dpms:appointments:write',
  'dpms:prescriptions:read',
  'dpms:billing:read',
  'dpms:billing:write',
  'dpms:lab:access',
];

const LAB_TECH: readonly Capability[] = [
  'dpms:access',
  'dpms:dashboard:read',
  'dpms:patients:read',
  'dpms:lab:access',
];

const DENTAL_ASSISTANT: readonly Capability[] = ['dpms:access', 'dpms:dashboard:read', 'dpms:patients:read'];

const CLINIC_ADMIN_BASE: readonly Capability[] = [...CLINIC_STAFF_DPMS_FULL, ...CLINIC_ADMIN_EXTRA];

export const ROLE_BASELINE_CAPABILITIES: Readonly<Record<string, readonly Capability[]>> = {
  SUPER_ADMIN: [],
  CLINIC_ADMIN: CLINIC_ADMIN_BASE,
  CLINIC_OWNER: CLINIC_ADMIN_BASE,
  DOCTOR,
  RECEPTIONIST,
  LAB_TECH,
  DENTAL_ASSISTANT,
  STORE_MANAGER: [...SHOP],
  TENANT: [...SHOP],
  /** Assigned before approval — intentionally minimal; login still gated elsewhere. */
  PENDING_APPROVAL: [],
};

export function baselineCapabilitiesForRole(role: string | undefined | null): ReadonlySet<Capability> {
  const r = (role ?? '').trim();
  const list = ROLE_BASELINE_CAPABILITIES[r];
  if (!list) return new Set();
  return new Set(list);
}

export function shopCapabilityList(): readonly Capability[] {
  return SHOP;
}
