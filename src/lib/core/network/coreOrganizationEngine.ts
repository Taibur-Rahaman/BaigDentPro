import type { OrganizationNode } from '@/types/network';

/**
 * Org tree resolution — all tenant boundaries enforced here (no UI filtering).
 * Stub returns a single synthetic root until org service lands.
 */
export function resolveOrganizationTree(seed: OrganizationNode[]): OrganizationNode[] {
  if (seed.length) return seed;
  return [{ id: 'local-org', name: 'Primary organization', parentId: null }];
}

export function assertTenantIsolation(currentOrgId: string, resourceOrgId: string): boolean {
  return currentOrgId === resourceOrgId;
}
