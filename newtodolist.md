# BaigDentPro – production readiness todolist

**Straight answer:** The stack *can* run as a real product (Express API + PostgreSQL/Prisma + React), but **“ready to use” on a live website** depends on **your** hosting: correct `DATABASE_URL`, `FRONTEND_URL`, TLS, backups, and secrets. The code is **not** a guarantee of HIPAA compliance, breach immunity, or automatic backups—that comes from **infrastructure + process**.

Update this file as you complete items: change `[ ]` to `[x]`.

### Run the next steps in order

1. **Check what the public site actually serves** — from the repo: `./scripts/check-live-api.sh 'https://YOUR_DOMAIN/api/health'`. If you see the **WARN: HTML** message, the live site is not hitting the Node API (static hosting only, or missing reverse proxy / `VITE_API_URL`).
2. **Point the app at a real API** — (a) deploy **Node + Postgres** with **Nginx** proxying `/api` to the app (`deploy/nginx-same-origin-api.example.conf`), **or** (b) build with `VITE_API_URL=https://your-api-host/api` and redeploy static files.
3. **On the server**, set `DATABASE_URL`, `FRONTEND_URL`, `JWT_SECRET`, `NODE_ENV=production`, then `npm run db:migrate:deploy` (or baseline per §B) and restart.
4. **Schedule backups** (§C) and enable Supabase backups if you use Supabase.
5. **Manual smoke test** — login, open one patient, print prescription once (§F).

---

## Verification log

| Date | Check | Result |
|------|--------|--------|
| 2026-04-13 | `https://baigdentpro.com/api/health` | HTTP 200 but body is **SPA HTML**, not JSON — **API not exposed on that URL**; fix hosting or `VITE_API_URL`. |
| 2026-04-13 | `npm audit` (root + server) | **Fixed** in repo: Vite bump, axios (transitive), nodemailer **8.x** on server — re-run `npm audit` after future `npm install`. |
| 2026-04-13 | Rate limits | **Configurable** via `AUTH_RATE_LIMIT_MAX` / `API_RATE_LIMIT_MAX` in `server/.env` (see `.env.example`). |
| 2026-04-13 | Prisma baseline doc | **`server/DB_SECURITY_AND_BACKUP.md` §2.1** — `migrate resolve --applied 20260413120000_baseline` for existing `db push` DBs. |
| 2026-04-13 | Backup scheduling | Example crontab lines in **`scripts/backup-cron.example`**. |
| 2026-04-13 | CI | **`.github/workflows/ci.yml`** — typecheck + `npm audit --audit-level=high` on push/PR. |
| 2026-04-13 | Same-origin `/api` | Example **`deploy/nginx-same-origin-api.example.conf`** (static `dist` + proxy to Node). |
| 2026-04-13 | CI build + Dependabot | **`build:production`** in CI; **`.github/dependabot.yml`** weekly npm updates. |
| 2026-04-13 | systemd + CI manual | **`deploy/baigdentpro.service.example`**; **`workflow_dispatch`** on CI. |
| 2026-04-13 | Health + security policy | **`GET /api/health`** includes optional **`version`**; **`SECURITY.md`** for reports. |

---

## A. Verify live backend & database (you / owner)

- [ ] **Open** `https://YOUR_API_HOST/api/health` in a browser — expect HTTP 200 and `"database":"connected"`. If 503 or `"disconnected"`, fix `DATABASE_URL`, network, and SSL params (`sslmode=require` for managed Postgres).
- [ ] **Sign in** on the real site with a non-demo account and confirm patients load (proves API + DB + CORS + JWT).
- [ ] **Confirm** `FRONTEND_URL` on the server lists every real origin (e.g. `https://baigdentpro.com` and `https://www.…` if both are used).
- [ ] **Confirm** `NODE_ENV=production`, `JWT_SECRET` is random and **≥ 32 characters** (not the example string).

---

## B. Database schema & migrations

- [x] **Baseline Prisma migration** added (`server/prisma/migrations/20260413120000_baseline/`) so new environments can use `prisma migrate deploy`.
- [x] **Scripts:** `npm run db:migrate:deploy` (root) and `npm run db:migrate:deploy` (in `server/`) apply migrations.
- [x] **If the database already exists** from older `db push` only: see **`server/DB_SECURITY_AND_BACKUP.md` §2.1** — `npx prisma migrate resolve --applied 20260413120000_baseline` when schema already matches, then use `migrate deploy` for future migrations.

---

## C. Backups & recovery

- [x] **Scripts documented:** `server/scripts/backup-postgres.sh` and `server/scripts/restore-postgres.sh` (see `server/DB_SECURITY_AND_BACKUP.md`).
- [x] **Incident / breach playbook** added to `server/DB_SECURITY_AND_BACKUP.md` §8 (rotate secrets, logs, restore).
- [x] **`server/backups/`** added to `.gitignore` so SQL dumps are not committed by mistake.
- [ ] **Schedule** backups (cron or host scheduler) and copy dumps **off-site** (S3, another region, etc.). *Start from **`scripts/backup-cron.example`**.*
- [ ] **Supabase:** turn on and test **automated backups / PITR** in the dashboard if you use Supabase Postgres (per your plan).
- [ ] **Restore drill:** restore a dump to a **throwaway** database once to prove the procedure.

---

## D. Security (code + ops)

- [x] **Failed login logging** (hashed email id + IP) in `server/src/routes/auth.ts` for log monitoring — tag: `[security] failed_login`.
- [x] **Review** rate limits — tuned via **`AUTH_RATE_LIMIT_MAX`** (default 60 / 15 min per IP on `/api/auth`) and **`API_RATE_LIMIT_MAX`** (default 300 / min on `/api`) in `server/.env`; see `server/.env.example`.
- [ ] **No secrets in git:** `.env`, `server/.env`, `.env.alpha` remain ignored; rotate any key ever pasted in chat or tickets.
- [x] **Dependency audit:** run `npm audit` / `npm audit fix` in root and `server/` on a schedule (done in repo 2026-04-13: 0 vulns root + server; repeat monthly).
- [ ] **Optional hardening:** JWT refresh tokens, CAPTCHA on login/register, WAF / Cloudflare in front of the public site.

---

## E. Product / feature gaps (not blockers for “API works”, but real-clinic expectations)

- [ ] **Payment gateway:** shop/billing is largely **manual / COD-style** in schema; no Stripe webhooks in repo.
- [ ] **SMS / email:** Twilio SMS from **Dashboard → SMS** is wired to `POST /communication/sms/send` (needs `TWILIO_*` on server). Verify on production; email still env-driven.
- [x] **Automated checks (light):** GitHub Actions runs **typecheck + high-severity npm audit**; locally **`npm run smoke:api`** hits `/api/health` (no E2E browser tests yet).
- **Release smoke (manual, ~5 min):** `GET /api/health` → `database: connected` · login · list patients · open one patient · create draft prescription or invoice · browser print preview once · **SMS:** select patient, template, Send (with Twilio test number / creds).
- [x] **Stale doc:** `TODO.md` replaced with a **short index** pointing here + `DB_SECURITY_AND_BACKUP.md`.

---

## F. Frontend / UX polish

- [x] **SMS panel** — templates + compose call **`api.communication.sendSMS`** (Twilio on server); fake “850 remaining” removed.
- [ ] Re-test **print** flows (invoice / prescription) after each deploy.

---

## Done in this pass (reference)

| Item | Status |
|------|--------|
| `newtodolist.md` created | done |
| Baseline migration + `db:migrate:deploy` | done |
| `DB_SECURITY_AND_BACKUP.md` §8 incident response | done |
| Failed-login security logs | done |
| `server/backups/` gitignored | done |
| README: `db:migrate:deploy` for prod | done |
| `TODO.md` stale warning | done |
| `scripts/check-live-api.sh` + ordered “next steps” | done 2026-04-13 |
| npm audit fixes (Vite, nodemailer 8, axios) | done 2026-04-13 |
| SMS panel UX honesty (toasts + copy) | done 2026-04-13 |
| Env-tunable rate limits + `.env.example` | done 2026-04-13 |
| DB doc §2.1 Prisma baseline + `backup-cron.example` | done 2026-04-13 |
| `TODO.md` shortened to index | done 2026-04-13 |
| Dashboard SMS wired to Twilio API | done 2026-04-13 |
| GitHub Actions CI + `scripts/smoke-api.sh` + `npm run smoke:api` | done 2026-04-13 |
| `deploy/nginx-same-origin-api.example.conf` + README cross-link | done 2026-04-13 |
| CI: `build:production` + Dependabot weekly npm | done 2026-04-13 |
| systemd unit example + `workflow_dispatch` | done 2026-04-13 |
| `/api/health` version + `SECURITY.md` | done 2026-04-13 |

When an item is finished, set it to `[x]` and optionally add a date in a commit message.
