/**
 * BaigDentPro — global payment policy (locked).
 *
 * Subscriptions are settled **only** via manual WhatsApp — no Stripe, bKash/Nagad gateways, or card checkout.
 *
 * Runtime admin WhatsApp (digits): server reads `ADMIN_WHATSAPP_NUMBER` from environment (`server/.env`).
 * This module mirrors constants for documentation and optional frontend display of policy text only.
 */

export const PAYMENT_METHOD = 'MANUAL_WHATSAPP' as const;

/** Env key on the API server — set E.164 digits without `+` (e.g. `8801712345678`). */
export const ADMIN_WHATSAPP_NUMBER_ENV_KEY = 'ADMIN_WHATSAPP_NUMBER' as const;

export const WHATSAPP_MESSAGE_TEMPLATE = `Hello, I want to purchase a plan from BaigDentPro:

Plan: {{planName}}
Amount: ৳{{amount}}

User Details:
Name: {{userName}}
Email: {{userEmail}}
Clinic: {{clinicName}}

Invoice ID: {{invoiceId}}
Date: {{date}}

Please guide me to complete the payment.`;
