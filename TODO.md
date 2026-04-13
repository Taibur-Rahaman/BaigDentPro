# BaigDentPro – TODO (short)

| Doc | Purpose |
|-----|---------|
| **`newtodolist.md`** | Production checklist — all items **[x]** in repo; **you** run **`OPERATIONS_RUNBOOK.md`** on your servers. |
| **`OPERATIONS_RUNBOOK.md`** | Copy-paste steps: health, login, `FRONTEND_URL`, backups, Supabase, restore drill, print. |
| **`docs/ROADMAP.md`** | Payments, CAPTCHA, JWT refresh, WAF — not built yet. |
| **`README.md`** | Setup, deploy, Hostinger, CI |
| **`server/DB_SECURITY_AND_BACKUP.md`** | Postgres security, backups, restore, incidents, Prisma baseline |

## Commands

- **`npm run ops:verify`** — ensure no secret env files are tracked; optional `HEALTH_URL=https://api.host npm run ops:verify`
- **`npm run smoke:api`** — local `/api/health` (server running)
- **`./scripts/check-live-api.sh 'https://domain/api/health'`** — prod probe

## Quick links

- Cron backup examples: `scripts/backup-cron.example`
- Nginx: `deploy/nginx-same-origin-api.example.conf`
- systemd: `deploy/baigdentpro.service.example`
- Docker: `Dockerfile`, `docker-compose.prod.example.yml`, runbook §13
- Security disclosures: `SECURITY.md`
