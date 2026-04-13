# BaigDentPro – TODO (short)

The long checklist that used to live here was **obsolete** (it assumed the backend was not built). **Use these instead:**

| Doc | Purpose |
|-----|---------|
| **`newtodolist.md`** | Production readiness: live API check, migrations, backups, security, smoke tests |
| **`README.md`** | Setup, deploy, Hostinger, Supabase alpha |
| **`server/DB_SECURITY_AND_BACKUP.md`** | Postgres security, backups, restore, incident response, **Prisma baselining §2.1** |
| **`IMPLEMENTATION_CHECKLIST.md`** | Historical feature checklist (may be partially stale) |

## Real remaining product gaps (high level)

- **Payments:** no Stripe/PayPal webhooks; shop is COD-oriented.
- **SMS:** Dashboard **SMS** tab calls `/api/communication/sms/send` (Twilio env required). Appointment row “reminder” already used the API.
- **Compliance:** not HIPAA-certified; PHI handling is your legal + hosting responsibility.
- **Automated tests:** CI runs typecheck + audit; `npm run smoke:api` for `/api/health`. Add E2E over time if needed.

## Quick links

- Cron backup examples: `scripts/backup-cron.example`
- Live API probe: `scripts/check-live-api.sh`
- Nginx same-origin `/api`: `deploy/nginx-same-origin-api.example.conf`
