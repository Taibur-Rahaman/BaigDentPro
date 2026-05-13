import { useMemo } from 'react';
import api from '@/api';
import type { NetworkStaffRole } from '@/types/network';

export function useNetworkRBACView(viewer: NetworkStaffRole[], requiredScope: NetworkStaffRole['scope']) {
  return useMemo(() => api.network.permission(viewer, requiredScope), [viewer, requiredScope]);
}
