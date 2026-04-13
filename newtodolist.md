# BaigDentPro – production readiness todolist

**Straight answer:** The stack *can* run as a real product (Express API + PostgreSQL/Prisma + React), but **“ready to use” on a live website** depends on **your** hosting: correct `DATABASE_URL`, `FRONTEND_URL`, TLS, backups, and secrets. The code is **not** a guarantee of HIPAA compliance, breach immunity, or automatic backups—that comes from **infrastructure + process**.

Update this file as you complete items: change `[ ]` to `[x]`.

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
- [ ] **If the database already exists** from older `db push` only: either run `migrate deploy` on an empty DB, or follow [Prisma baselining](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate/add-prisma-migrate-to-an-existing-project) and mark the baseline as applied without re-running destructive SQL.

---

## C. Backups & recovery

- [x] **Scripts documented:** `server/scripts/backup-postgres.sh` and `server/scripts/restore-postgres.sh` (see `server/DB_SECURITY_AND_BACKUP.md`).
- [x] **Incident / breach playbook** added to `server/DB_SECURITY_AND_BACKUP.md` §8 (rotate secrets, logs, restore).
- [x] **`server/backups/`** added to `.gitignore` so SQL dumps are not committed by mistake.
- [ ] **Schedule** backups (cron or host scheduler) and copy dumps **off-site** (S3, another region, etc.).
- [ ] **Supabase:** turn on and test **automated backups / PITR** in the dashboard if you use Supabase Postgres (per your plan).
- [ ] **Restore drill:** restore a dump to a **throwaway** database once to prove the procedure.

---

## D. Security (code + ops)

- [x] **Failed login logging** (hashed email id + IP) in `server/src/routes/auth.ts` for log monitoring — tag: `[security] failed_login`.
- [ ] **Review** rate limits (`server/src/index.ts`) for your traffic; tighten `/api/auth` if you see abuse.
- [ ] **No secrets in git:** `.env`, `server/.env`, `.env.alpha` remain ignored; rotate any key ever pasted in chat or tickets.
- [ ] **Dependency audit:** run `npm audit` / `npm audit fix` in root and `server/` on a schedule (expect some dev-only noise).
- [ ] **Optional hardening:** JWT refresh tokens, CAPTCHA on login/register, WAF / Cloudflare in front of the public site.

---

## E. Product / feature gaps (not blockers for “API works”, but real-clinic expectations)

- [ ] **Payment gateway:** shop/billing is largely **manual / COD-style** in schema; no Stripe webhooks in repo.
- [ ] **SMS / email:** optional via env; verify Twilio/SMTP in production if you promise reminders.
- [ ] **Automated tests:** no full E2E suite in repo; add smoke tests or manual QA checklist per release.
- [ ] **Stale doc:** `TODO.md` is outdated (it claims core APIs are missing). Prefer this file + `README.md` for truth; update `TODO.md` when you have time.

---

## F. Frontend / UX polish

- [ ] **SMS template buttons** on the dashboard may be UI-only — confirm they call the API or hide until wired.
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

When an item is finished, set it to `[x]` and optionally add a date in a commit message.
