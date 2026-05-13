import { useMemo } from 'react';
import api from '@/api';

export function useAITriageView(symptoms: string) {
  return useMemo(() => api.ai.triageSymptoms(symptoms), [symptoms]);
}
