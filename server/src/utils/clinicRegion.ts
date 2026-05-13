import type { InvoicePaymentSource } from './invoicePaymentSource.js';

export type ClinicRegion = 'BD' | 'INTERNATIONAL';

export function normalizeClinicRegion(raw: string | null | undefined): ClinicRegion {
  const u = String(raw ?? 'BD')
    .trim()
    .toUpperCase();
  if (u === 'INTERNATIONAL' || u === 'INTL' || u === 'GLOBAL' || u === 'ROW') return 'INTERNATIONAL';
  return 'BD';
}

/** Clinic invoices: **CASH only** (offline). SaaS plans use WhatsApp (`config/payment.ts`). */
export function assertPaymentSourceAllowedForRegion(
  source: InvoicePaymentSource,
  _region: ClinicRegion
): { ok: true } | { ok: false; error: string } {
  if (source === 'CASH') return { ok: true };
  return {
    ok: false,
    error:
      'Only CASH invoice payments are supported. Subscription upgrades use WhatsApp — see Clinic Subscription.',
  };
}
