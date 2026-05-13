# Roadmap — product backlog vs current repo

| Area | Today (verified in code) | Future direction |
|------|---------------------------|------------------|
| **SaaS subscription settlement** | **Manual WhatsApp only** — `POST /api/payment/manual/initiate`, policy in `/config/payment.ts`, super-admin marks `SubscriptionPayment` via `/api/admin/subscription-payments`. No Stripe/gateway. | Optional accounting export / reminders — **not** automatic card capture unless product scope changes. |
| **Clinic invoice payments** | **CASH recording only** on `/api/invoices/.../payments` (online wallets / Stripe paths removed). | If gateways return: new integration project + webhooks + reconciliation rules. |
| **JWT sessions** | Access JWT + **`POST /auth/refresh`** refresh tokens (`RefreshToken` model). | Optional httpOnly cookie hardening, shorter access TTL. |
| **CAPTCHA** | None on login/register. | hCaptcha/Turnstile if bots appear. |
| **WAF / CDN** | Not in repo. | Cloudflare or similar in front of production. |
| **HIPAA / compliance** | Auth + audit hooks — **not** a certified compliance bundle. | Legal review, BAA, retention policy. |

Estimate separately for any row’s “Future direction” — these are projects, not toggles.
