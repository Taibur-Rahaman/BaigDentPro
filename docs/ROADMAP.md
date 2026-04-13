# Roadmap — not in current release

These items are **intentionally out of scope** for the current codebase but commonly asked about for “full” clinic products.

| Area | Today | Future direction |
|------|--------|------------------|
| **Card / wallet payments** | Orders/invoices support **COD** and manual totals; no Stripe, PayPal, or bKash webhooks. | Add a gateway + server webhooks + idempotent payment records. |
| **JWT refresh tokens** | Single access JWT (`JWT_EXPIRES_IN`). | Short-lived access + httpOnly refresh cookie or rotation. |
| **CAPTCHA** | None on login/register. | Add hCaptcha/Turnstile on public auth routes if bots appear. |
| **WAF / CDN** | Not configured in repo. | Put **Cloudflare** (or similar) in front of the public site; use their WAF and TLS. |
| **HIPAA / compliance** | App provides auth, TLS guidance, backups docs — **not** a certified compliance package. | Legal review, BAA with vendors, audit logging policy, retention. |

Implementing any row above is a **project**, not a toggle; estimate separately.
