import type { BranchNode } from '@/types/network';

export function activeBranchForClinic(clinicId: string): BranchNode {
  return {
    id: `branch-${clinicId}`,
    clinicId,
    organizationId: 'local-org',
    name: 'Primary site',
  };
}

export function branchScopedQueryKey(clinicId: string, suffix: string): string {
  return `${clinicId}::${suffix}`;
}
