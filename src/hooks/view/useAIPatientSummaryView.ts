import { useMemo } from 'react';
import api from '@/api';

export type AIPatientSummaryInput = {
  demographics: string;
  alerts: string[];
  lastVisitIso?: string | null;
};

export function useAIPatientSummaryView(parts: AIPatientSummaryInput) {
  return useMemo(() => api.ai.patientSummaryBlocks(parts), [parts]);
}
