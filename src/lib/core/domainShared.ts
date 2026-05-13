/** Small shared guards/parsers — internal to `src/lib/core`; not exported from public barrel. */

export function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function numField(raw: Record<string, unknown>, key: string): number {
  const v = raw[key];
  return typeof v === 'number' && !Number.isNaN(v) ? v : 0;
}

export function unwrapSuccessData<T>(raw: unknown): T | undefined {
  if (isRecord(raw) && raw.success === true && 'data' in raw) {
    return raw.data as T;
  }
  return undefined;
}

export function unwrapSuccessDataArray<T>(raw: unknown): T[] | undefined {
  const inner = unwrapSuccessData<T[]>(raw);
  if (Array.isArray(inner)) return inner;
  if (Array.isArray(raw)) return raw as T[];
  return undefined;
}

/** Calendar YYYY-MM-DD in the user's local timezone from an API date string or `Date`. */
export function utcOrDateToLocalYmd(date: unknown): string {
  const d =
    date instanceof Date
      ? date
      : typeof date === 'string' || typeof date === 'number'
        ? new Date(date)
        : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
