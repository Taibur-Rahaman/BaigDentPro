/**
 * Deterministic triage helper — not a medical device; clinic staff have final authority.
 */
export type TriageUrgency = 'routine' | 'soon' | 'urgent';

export type TriageSuggestion = {
  urgency: TriageUrgency;
  score: number;
  reasons: string[];
};

const URGENT = /severe|uncontrolled\s*bleeding|swelling|trauma|fever|difficulty\s*breathing|jaw\s*lock/i;
const SOON = /pain|ache|broken|chip|lost\s*filling|sensitive/i;

export function suggestTriageFromSymptoms(symptoms: string): TriageSuggestion {
  const s = symptoms.trim();
  if (!s) {
    return { urgency: 'routine', score: 0, reasons: ['No symptoms described'] };
  }
  const reasons: string[] = [];
  if (URGENT.test(s)) {
    reasons.push('Matched urgent verbal patterns');
    return { urgency: 'urgent', score: 90, reasons };
  }
  if (SOON.test(s)) {
    reasons.push('Pain or structural concern noted');
    return { urgency: 'soon', score: 55, reasons };
  }
  reasons.push('General scheduling');
  return { urgency: 'routine', score: 20, reasons };
}
