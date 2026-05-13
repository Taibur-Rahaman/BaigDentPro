/**
 * @domain PLATFORM_SAAS_FINANCE
 * Subscription checkout hints only — not patient AR.
 */
export async function createCheckoutSessionPlaceholder(opts: { planCode?: string }) {
  return {
    paymentMethod: 'MANUAL_WHATSAPP',
    hint: 'Open WhatsApp via POST /api/payment/manual/initiate with planCode after clinic-admin login.',
    planCode: opts.planCode ?? null,
  };
}

export async function syncSubscriptionState(clinicId: string) {
  return { mode: 'manual_whatsapp', clinicId };
}
