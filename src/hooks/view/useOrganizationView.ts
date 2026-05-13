import { useMemo } from 'react';
import api from '@/api';
import type { OrganizationNode } from '@/types/network';

export function useOrganizationView(seed: OrganizationNode[]) {
  return useMemo(() => api.network.organizationTree(seed), [seed]);
}
