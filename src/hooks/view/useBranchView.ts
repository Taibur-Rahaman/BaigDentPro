import { useMemo } from 'react';
import api from '@/api';

export function useBranchView(clinicId: string) {
  return useMemo(() => api.network.branchForClinic(clinicId), [clinicId]);
}
