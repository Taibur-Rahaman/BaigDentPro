/** Shared formatting + sanitization for clinical provider display (Rx PDF, headers). */

const MAX_TITLE = 80;
const MAX_DEGREE = 200;
const MAX_SPEC = 200;

export function sanitizeProfessionalField(input: unknown, max: number): string | null {
  if (input === undefined || input === null) return null;
  const s = String(input)
    // eslint-disable-next-line no-control-regex -- strip ASCII control chars and DEL for safe PDF/display text
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!s) return null;
  return s.slice(0, max);
}

export function sanitizeTitle(input: unknown): string | null {
  return sanitizeProfessionalField(input, MAX_TITLE);
}

export function sanitizeDegree(input: unknown): string | null {
  return sanitizeProfessionalField(input, MAX_DEGREE);
}

export function sanitizeSpecialization(input: unknown): string | null {
  return sanitizeProfessionalField(input, MAX_SPEC);
}

/**
 * Primary line for Rx / print: title + name when title is set and not already reflected in name.
 */
export function formatProviderPrimaryLine(user: {
  name: string;
  title?: string | null;
}): string {
  const name = String(user.name ?? '').trim();
  const title = sanitizeTitle(user.title);
  if (!name) return title || '—';
  if (!title) return name;
  if (new RegExp(`^${escapeRegExp(title)}\\s`, 'i').test(name)) return name;
  if (/^dr\.?\s/i.test(name) && /^dr\.?$/i.test(title.trim())) return name;
  return `${title} ${name}`.trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function formatProviderCredentialSuffix(degree?: string | null, specialization?: string | null): string {
  const d = sanitizeDegree(degree);
  const sp = sanitizeSpecialization(specialization);
  const parts = [d, sp].filter(Boolean) as string[];
  return parts.join(' · ');
}
