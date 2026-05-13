/**
 * Capability vocabulary — overlays RBAC without replacing `User.role`.
 * Naming: domain:resource:verb (colon-separated).
 */
export const CAPABILITIES = [
  // DPMS core
  'dpms:access',
  'dpms:patients:read',
  'dpms:patients:write',
  'dpms:prescriptions:read',
  'dpms:prescriptions:write',
  'dpms:appointments:read',
  'dpms:appointments:write',
  'dpms:billing:read',
  'dpms:billing:write',
  'dpms:lab:access',
  'dpms:analytics:advanced',
  'dpms:dashboard:read',

  // Clinic administration
  'clinic:users:manage',
  'clinic:doctors:manage',
  'clinic:branding:edit',
  'clinic:subscription:manage',
  'clinic:multi_branch:manage',
  'clinic:invites:manage',
  'clinic:inventory:manage',
  'clinic:settings:clinical',

  // Shop / retail APIs
  'shop:catalog:read',
  'shop:products:read',
  'shop:products:manage',
  'shop:orders:read',
  'shop:orders:manage',

  // Platform
  'system:admin',
  'system:demo:reset',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const CAP_SET = new Set<string>(CAPABILITIES);

export function isCapabilityString(value: unknown): value is Capability {
  return typeof value === 'string' && CAP_SET.has(value);
}

export function allCapabilities(): readonly Capability[] {
  return CAPABILITIES;
}
