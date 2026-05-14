/**
 * Role → workspace mode for flat `/dashboard/*` clinical routes.
 * Kept free of React so routing tests and guards can import it safely.
 */

export const STARTER_PRACTICE_HOME = '/dashboard/overview';

export type WorkspaceType =
  | 'STARTER_WORKSPACE'
  | 'CLINIC_WORKSPACE'
  | 'ENTERPRISE_WORKSPACE'
  | 'SHOP_WORKSPACE';

export type ClinicWorkspaceCapabilities = {
  /** Reserved for future gating (inventory, reports depth, etc.). */
  fullDpmsSidebar: boolean;
};

export type ResolvedWorkspace = {
  type: WorkspaceType;
  capabilities: ClinicWorkspaceCapabilities;
};

function norm(role: string | undefined): string {
  return (role ?? '').trim();
}

/** Starter workspace: flat `/dashboard/<segment>` allowlist (no clinic growth / audit URLs). */
const STARTER_ALLOWED_SEGMENTS = new Set([
  'overview',
  'patients',
  'appointments',
  'prescriptions',
  'prescription',
  'billing',
  'workspace-calendar',
  'lab',
  'drugs',
  'workspace-settings',
]);

/**
 * When pathname is under `/dashboard/<segment>`, starter workspace may only use allowlisted segments.
 */
export function isStarterPracticePathAllowed(pathname: string): boolean {
  const m = pathname.match(/^\/dashboard\/([^/?]+)/);
  if (!m) return true;
  return STARTER_ALLOWED_SEGMENTS.has(m[1]);
}

export function getWorkspaceByRole(role: string | undefined): ResolvedWorkspace {
  const r = norm(role);
  if (r === 'ENTERPRISE_ADMIN' || r === 'ADMIN') {
    return { type: 'ENTERPRISE_WORKSPACE', capabilities: { fullDpmsSidebar: false } };
  }
  if (r === 'SUPER_ADMIN' || r.toLowerCase() === 'superadmin') {
    return { type: 'ENTERPRISE_WORKSPACE', capabilities: { fullDpmsSidebar: true } };
  }
  if (r === 'TENANT' || r === 'STORE_MANAGER' || r === 'SELLER' || r === 'SAAS_TENANT') {
    return { type: 'SHOP_WORKSPACE', capabilities: { fullDpmsSidebar: false } };
  }
  if (r === 'CLINIC_ADMIN' || r === 'CLINIC_OWNER') {
    return { type: 'CLINIC_WORKSPACE', capabilities: { fullDpmsSidebar: true } };
  }
  if (
    r === 'DOCTOR' ||
    r === 'RECEPTIONIST' ||
    r === 'DENTAL_ASSISTANT' ||
    r === 'LAB_TECH'
  ) {
    return { type: 'STARTER_WORKSPACE', capabilities: { fullDpmsSidebar: false } };
  }
  return { type: 'STARTER_WORKSPACE', capabilities: { fullDpmsSidebar: false } };
}

export function canAccessWorkspace(role: string | undefined, type: WorkspaceType): boolean {
  return getWorkspaceByRole(role).type === type;
}
