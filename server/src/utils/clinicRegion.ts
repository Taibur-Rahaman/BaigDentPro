import type { InvoicePaymentSource } from './invoicePaymentSource.js';

export type ClinicRegion = 'BD' | 'INTERNATIONAL';

export function normalizeClinicRegion(raw: string | null | undefined): ClinicRegion {
  const u = String(raw ?? 'BD')
    .trim()
    .toUpperCase();
  if (u === 'INTERNATIONAL' || u === 'INTL' || u === 'GLOBAL' || u === 'ROW') return 'INTERNATIONAL';
  return 'BD';
}

/** INTERNATIONAL clinics: CASH + STRIPE only (no bKash/Nagad ledger). */
export function assertPaymentSourceAllowedForRegion(
  source: InvoicePaymentSource,
  region: ClinicRegion
): { ok: true } | { ok: false; error: string } {
  if (region !== 'INTERNATIONAL') return { ok: true };
  if (source === 'BKASH' || source === 'NAGAD') {
    return { ok: false, error: 'This clinic region does not support bKash or Nagad payments' };
  }
  return { ok: true };
}
