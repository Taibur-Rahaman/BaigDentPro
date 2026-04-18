/**
 * Universal tooth index 1–32 (permanent dentition quadrant ordering used by this app).
 * Rejects invalid values for EMR APIs.
 */
export function parseUniversalToothNumber(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 1 || n > 32) return null;
  return n;
}

export function assertUniversalToothNumber(raw: unknown, field = 'toothNumber'): number {
  const n = parseUniversalToothNumber(raw);
  if (n === null) {
    throw new FdiValidationError(`${field} must be a universal tooth index between 1 and 32`);
  }
  return n;
}

export class FdiValidationError extends Error {
  override name = 'FdiValidationError';
  constructor(message: string) {
    super(message);
  }
}
