import { useMemo } from 'react';
import api from '@/api';

export function useAIBillingView(treatmentNotes: string) {
  return useMemo(() => api.ai.billingLines(treatmentNotes), [treatmentNotes]);
}
