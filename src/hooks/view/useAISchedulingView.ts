import { useMemo } from 'react';
import api from '@/api';

export type AISchedulingInput = { proposedStartIso: string; adjacentBusyStartsIso: string[] };

export function useAISchedulingView(input: AISchedulingInput) {
  return useMemo(() => api.ai.schedulingSlot(input), [input]);
}
