/**
 * LOCKED — BaigDentPro SaaS subscription settlement policy.
 *
 * **Keep in sync with repository root `config/payment.ts`** (wording + PAYMENT_METHOD).
 *
 * Subscriptions are paid via **manual WhatsApp** only — no Stripe, bKash/Nagad, or online gateways.
 */

export const PAYMENT_METHOD = 'MANUAL_WHATSAPP' as const;

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

export type PaymentTemplateVars = {
  planName: string;
  amount: string;
  userName: string;
  userEmail: string;
  clinicName: string;
  invoiceId: string;
  date: string;
};

function readAdminWa(): string {
  const v = process.env.ADMIN_WHATSAPP_NUMBER?.trim();
  return v && v.length >= 10 ? v : '8801XXXXXXXXX';
}

export function adminWhatsAppDigits(): string {
  return readAdminWa().replace(/\D/g, '');
}

export function fillPaymentTemplate(template: string, vars: PaymentTemplateVars): string {
  let out = template;
  (Object.keys(vars) as (keyof PaymentTemplateVars)[]).forEach((k) => {
    out = out.split(`{{${k}}}`).join(vars[k] ?? '');
  });
  return out;
}

export function buildManualWhatsAppUrl(adminDigits: string, message: string): string {
  const digits = adminDigits.replace(/\D/g, '');
  const text = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${text}`;
}
