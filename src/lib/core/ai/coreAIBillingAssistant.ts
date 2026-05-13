/**
 * Billing assistance — proposes line items from historical text; never posts invoices.
 */
export type BillingLineSuggestion = {
  description: string;
  confidence: number;
};

export function suggestInvoiceLinesFromTreatmentNotes(notes: string): BillingLineSuggestion[] {
  const n = notes.toLowerCase();
  const lines: BillingLineSuggestion[] = [];
  if (/filling|composite/i.test(notes)) lines.push({ description: 'Restorative procedure — review CDT mapping', confidence: 0.4 });
  if (/crown/i.test(notes)) lines.push({ description: 'Crown preparation / seat — verify fee schedule', confidence: 0.45 });
  if (/endo|root\s*canal/i.test(notes)) lines.push({ description: 'Endodontics — verify tooth + phases', confidence: 0.45 });
  if (/cleaning|prophy|scaling/i.test(notes)) lines.push({ description: 'Hygiene visit', confidence: 0.35 });
  if (!n.trim()) return [];
  return lines;
}

export function findPossiblyUnbilledMarkers(treatmentLabels: string[], invoiceLabels: string[]): string[] {
  const inv = new Set(invoiceLabels.map((x) => x.toLowerCase()));
  return treatmentLabels.filter((t) => !inv.has(t.toLowerCase()));
}
