import type { NetworkStaffRole } from '@/types/network';

export function evaluateNetworkPermission(
  viewerRoles: NetworkStaffRole[],
  requiredScope: NetworkStaffRole['scope']
): boolean {
  return viewerRoles.some((r) => r.scope === requiredScope || r.scope === 'org');
}

export const MOCK_ORG_ROLES: NetworkStaffRole[] = [
  { id: 'r1', label: 'Hospital admin', scope: 'org' },
  { id: 'r2', label: 'Branch lead', scope: 'branch' },
];
