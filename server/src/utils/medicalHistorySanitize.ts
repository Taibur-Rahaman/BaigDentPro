/**
 * Whitelist MedicalHistory fields to prevent mass-assignment / IDOR via request body
 * (e.g. injecting patientId, id, or unknown columns).
 */
const BOOL_FIELDS = [
  'bloodPressure',
  'heartProblems',
  'diabetes',
  'pepticUlcer',
  'jaundice',
  'asthma',
  'tuberculosis',
  'kidneyDiseases',
  'aids',
  'thyroid',
  'hepatitis',
  'stroke',
  'bleedingDisorder',
  'isPregnant',
  'isLactating',
  'allergyPenicillin',
  'allergySulphur',
  'allergyAspirin',
  'allergyLocalAnesthesia',
  'takingAspirin',
  'takingAntihypertensive',
  'takingInhaler',
  'habitSmoking',
  'habitBetelLeaf',
  'habitAlcohol',
] as const;

const STRING_FIELDS = ['otherDiseases', 'allergyOther', 'takingOther', 'habitOther', 'notes'] as const;

const MAX_TEXT_LEN = 50_000;

export type MedicalHistorySanitized = Partial<
  Record<(typeof BOOL_FIELDS)[number], boolean> & Record<(typeof STRING_FIELDS)[number], string | null>
>;

export function sanitizeMedicalHistoryBody(raw: unknown): MedicalHistorySanitized {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const input = raw as Record<string, unknown>;
  const out: MedicalHistorySanitized = {};

  for (const key of BOOL_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      (out as Record<string, boolean>)[key] = Boolean(input[key]);
    }
  }
  for (const key of STRING_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const v = input[key];
      if (v === null || v === undefined) {
        (out as Record<string, string | null>)[key] = null;
      } else {
        const s = String(v);
        (out as Record<string, string | null>)[key] = s.length > MAX_TEXT_LEN ? s.slice(0, MAX_TEXT_LEN) : s;
      }
    }
  }

  return out;
}
