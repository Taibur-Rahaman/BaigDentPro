/**
 * Presentation formatting helpers. Prefer view-model fields that are already display-ready;
 * use these when normalizing raw transport values at the VM boundary or for shared labels.
 */

/** Local calendar day `YYYY-MM-DD` (avoids UTC midnight drift vs appointments). */
export function formatLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatBdt(amount: number, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }): string {
  const min = options?.minimumFractionDigits ?? 0;
  const max = options?.maximumFractionDigits ?? Math.max(min, 2);
  return `৳${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: min, maximumFractionDigits: max })}`;
}

/** Human-readable appointment status for UI chips (server may send SNAKE_CASE). */
export function prettifyAppointmentStatus(status: string): string {
  const s = String(status || '').trim();
  if (!s) return 'Scheduled';
  return s
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function invoiceStatusLabel(status: string): string {
  const u = String(status || '').trim().toUpperCase();
  if (u === 'PAID') return 'Paid';
  if (u === 'OVERDUE') return 'Overdue';
  if (u === 'PARTIAL' || u === 'PARTIALLY_PAID') return 'Partially paid';
  if (u === 'DRAFT') return 'Draft';
  if (u === 'VOID' || u === 'CANCELLED') return 'Void';
  return prettifyAppointmentStatus(status);
}
