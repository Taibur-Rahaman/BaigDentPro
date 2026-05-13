import { useMemo } from 'react';
import api from '@/api';

export function useNetworkPatientView(linkedIds: string[]) {
  return useMemo(() => api.network.unifyPatients(linkedIds), [linkedIds]);
}
