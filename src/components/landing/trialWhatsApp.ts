/** Platform WhatsApp for trial requests (E.164 digits, no +). */
export const TRIAL_WHATSAPP_E164 = '8801601677122';

export type TrialWhatsAppPayload = {
  fullName: string;
  clinicName: string;
  phone: string;
  email: string;
  notes: string;
};

export function buildTrialWhatsAppMessage(p: TrialWhatsAppPayload): string {
  const lines = [
    'Hello BaigDentPro team',
    '',
    'I would like a trial / demo of BaigDentPro.',
    '',
    `Name: ${p.fullName.trim()}`,
    `Clinic / practice: ${p.clinicName.trim()}`,
    `Phone: ${p.phone.trim()}`,
    p.email.trim() ? `Email: ${p.email.trim()}` : null,
    '',
    p.notes.trim() ? `More details:\n${p.notes.trim()}` : null,
    '',
    'Thank you.',
  ];
  return lines.filter((x) => x != null).join('\n');
}

export function buildTrialWhatsAppUrl(p: TrialWhatsAppPayload): string {
  const text = buildTrialWhatsAppMessage(p);
  return `https://wa.me/${TRIAL_WHATSAPP_E164}?text=${encodeURIComponent(text)}`;
}
