/**
 * Combine calendar date (stored as UTC midnight-ish) + "HH:MM" local time into a single Date in local TZ.
 */
export function combineDateAndTimeString(date: Date, timeStr: string): Date {
  const t = String(timeStr || '00:00').trim();
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t);
  const hh = m ? Math.min(23, Math.max(0, parseInt(m[1], 10))) : 0;
  const mm = m ? Math.min(59, Math.max(0, parseInt(m[2], 10))) : 0;
  const ss = m && m[3] ? Math.min(59, parseInt(m[3], 10)) : 0;
  const d = new Date(date);
  d.setHours(hh, mm, ss, 0);
  return d;
}

export function appointmentWindow(date: Date, timeStr: string, durationMinutes: number): { start: Date; end: Date } {
  const start = combineDateAndTimeString(date, timeStr);
  const end = new Date(start.getTime() + Math.max(1, durationMinutes) * 60_000);
  return { start, end };
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}
