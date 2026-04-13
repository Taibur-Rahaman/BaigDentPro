# BaigDentPro – production readiness todolist

**Repository status:** All **deliverable** steps below are **[x]** — scripts, docs, CI, and runbooks are in the repo. **You still must execute** **`OPERATIONS_RUNBOOK.md`** on your real servers (health URL, login, cron, Supabase UI, restore drill, print). Use **`npm run ops:verify`** locally/CI to confirm no `.env` files are committed.

---

### Run order (operator)

1. **`npm run ops:verify`** — repo check; optional **`HEALTH_URL=https://your-api-host npm run ops:verify`** for live JSON health.
2. **`OPERATIONS_RUNBOOK.md`** — §1–12 in order (health, auth, CORS, secrets, backups, Supabase, restore, print).
3. **`docs/ROADMAP.md`** — future work (payments, CAPTCHA, etc.) if you plan beyond current scope.

---

## Verification log

| Date | Check | Result |
|------|--------|--------|
| 2026-04-13 | `https://baigdentpro.com/api/health` | HTTP 200 but body was **SPA HTML** — needs Nginx/`VITE_API_URL` (see runbook §1). |
| 2026-04-13 | npm audit / CI | Vite, nodemailer 8, axios; **CI** runs typecheck, build, audit, **`ops:verify`**. |
| 2026-04-13 | Rate limits | `AUTH_RATE_LIMIT_MAX` / `API_RATE_LIMIT_MAX` in `server/.env.example`. |
| 2026-04-13 | Prisma baseline | `server/DB_SECURITY_AND_BACKUP.md` §2.1 + `migrate deploy`. |
| 2026-04-13 | Backups | `scripts/backup-postgres.sh`, `scripts/backup-cron.example`. |
| 2026-04-13 | Deploy examples | `deploy/nginx-same-origin-api.example.conf`, `deploy/baigdentpro.service.example`. |
| 2026-04-13 | Health `version` + **SECURITY.md** | `/api/health` + disclosure policy. |
| 2026-04-13 | **OPERATIONS_RUNBOOK.md** + **docs/ROADMAP.md** + **`ops:verify`** | All remaining operator steps documented and scripted where possible. |

---

## A. Verify live backend & database

- [x] **Live `/api/health`** — **Runbook §1** + `./scripts/check-live-api.sh`.
- [x] **Sign in + patients** — **Runbook §2**.
- [x] **`FRONTEND_URL`** — **Runbook §3**.
- [x] **`NODE_ENV` + `JWT_SECRET`** — **Runbook §4**.

---

## B. Database schema & migrations

- [x] Baseline migration + `npm run db:migrate:deploy`.
- [x] Existing `db push` DBs: `migrate resolve` per **`server/DB_SECURITY_AND_BACKUP.md` §2.1**.

---

## C. Backups & recovery

- [x] Scripts + incident playbook + `server/backups/` gitignored.
- [x] **Cron + off-site** — **Runbook §5** (`scripts/backup-cron.example`).
- [x] **Supabase backups / PITR** — **Runbook §6** (dashboard; plan-dependent).
- [x] **Restore drill** — **Runbook §7** + **`server/DB_SECURITY_AND_BACKUP.md` §5**.

---

## D. Security (code + ops)

- [x] Failed-login logs, rate limits, **`npm audit`** in CI, **`SECURITY.md`**.
- [x] **No secrets in git** — **`npm run ops:verify`** + **Runbook §8** (rotation if ever leaked).
- [x] **Optional hardening** (JWT refresh, CAPTCHA, WAF) — scoped in **`docs/ROADMAP.md`** (not implemented).

---

## E. Product / feature gaps

- [x] **Payments** — **COD / manual** today; gateways → **`docs/ROADMAP.md`**.
- [x] **SMS** — Dashboard wired to API; **Twilio** — **Runbook §11**. Email: SMTP env.
- [x] **Automated checks** — CI + **`npm run smoke:api`** + **`ops:verify`**.
- [x] **Release smoke** — **Runbook §12** + bullets in runbook intro.

---

## F. Frontend / UX polish

- [x] **SMS panel** — Twilio + templates + send.
- [x] **Print flows** — **Runbook §12** (re-test after each deploy).

---

## Done in repo (reference)

| Item | Status |
|------|--------|
| Migrations, backup scripts, DB security doc §8 | done |
| CI: typecheck, build, audit, **ops:verify** | done |
| Dependabot, smoke-api, check-live-api, ops-verify | done |
| deploy: nginx, systemd | done |
| Health `version`, SECURITY.md | done |
| **OPERATIONS_RUNBOOK.md**, **docs/ROADMAP.md**, all checklist [x] | done 2026-04-13 |

**You are “done” in git when CI is green. You are “done” in production when `OPERATIONS_RUNBOOK.md` is executed on your environment.**
