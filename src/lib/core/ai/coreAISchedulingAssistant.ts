/**
 * Scheduling suggestions — reads normalized slot representations only; does not write calendar.
 */
export type SlotInsight = {
  slotStartIso: string;
  efficiency: 'good' | 'fair' | 'poor';
  suggestion: string;
};

export type SchedulingAssistantInput = {
  proposedStartIso: string;
  adjacentBusyStartsIso: string[];
};

export function suggestSlotEfficiency(input: SchedulingAssistantInput): SlotInsight {
  const t = Date.parse(input.proposedStartIso);
  if (Number.isNaN(t)) {
    return {
      slotStartIso: input.proposedStartIso,
      efficiency: 'poor',
      suggestion: 'Invalid time — choose another slot.',
    };
  }
  const conflicts = input.adjacentBusyStartsIso.filter((x) => {
    const d = Date.parse(x);
    return !Number.isNaN(d) && Math.abs(d - t) < 20 * 60 * 1000;
  }).length;
  if (conflicts > 0) {
    return {
      slotStartIso: input.proposedStartIso,
      efficiency: 'poor',
      suggestion: 'Adjacent appointments may cause chair congestion.',
    };
  }
  return {
    slotStartIso: input.proposedStartIso,
    efficiency: 'good',
    suggestion: 'Slot appears clear vs provided neighbors.',
  };
}

export function detectSchedulingGaps(busyBlocksMinutes: number[]): { wastedMinutes: number } {
  if (busyBlocksMinutes.length < 2) return { wastedMinutes: 0 };
  const sorted = [...busyBlocksMinutes].sort((a, b) => a - b);
  let gap = 0;
  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i]! - sorted[i - 1]!;
    if (d > 45) gap += d - 30;
  }
  return { wastedMinutes: gap };
}
