/**
 * Structured summary for handoff / AI preprocessing — deterministic composition.
 */
export type PatientNarrativeBlock = { heading: string; bullets: string[] };

export function buildDeterministicPatientSummary(parts: {
  demographics: string;
  alerts: string[];
  lastVisitIso?: string | null;
}): PatientNarrativeBlock[] {
  const blocks: PatientNarrativeBlock[] = [];
  blocks.push({ heading: 'Demographics', bullets: [parts.demographics] });
  if (parts.alerts.length) blocks.push({ heading: 'Alerts', bullets: parts.alerts });
  if (parts.lastVisitIso) {
    blocks.push({ heading: 'Recent activity', bullets: [`Last structured visit: ${parts.lastVisitIso}`] });
  }
  return blocks;
}
