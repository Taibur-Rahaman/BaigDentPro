import { useMemo } from 'react';
import api from '@/api';
import { useNetworkRBACView } from '@/hooks/view/useNetworkRBACView';

/** Demo matrix for /network/staff until server-backed org RBAC ships. */
export function useNetworkDemoRBAC() {
  const roles = useMemo(() => api.network.mockRoles, []);
  const canBranch = useNetworkRBACView(roles, 'branch');
  return { roles, canBranch };
}
