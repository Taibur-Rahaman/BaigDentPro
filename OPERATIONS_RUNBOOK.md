# BaigDentPro — operations runbook (complete remaining steps)

Use this after deploy. It maps 1:1 to **`newtodolist.md`**. Run commands from your laptop or the server as noted.

---

## §1 Live API health (newtodolist §A)

```bash
./scripts/check-live-api.sh 'https://YOUR_PUBLIC_DOMAIN/api/health'
# Expect: JSON with "database":"connected" and optional "version".
```

If you see **HTML**: fix **Nginx** (`deploy/nginx-same-origin-api.example.conf`) or rebuild SPA with **`VITE_API_URL`** (see README).

---

## §2 Login + patients (newtodolist §A)

1. Open the live site in a browser (incognito).
2. Sign in with a **real** clinic account (not only demo).
3. Open **Patients** — list should load from API (not empty error toast).

---

## §3 `FRONTEND_URL` (newtodolist §A)

On the API host, `server/.env` must list **every** browser origin that calls the API, comma-separated, no trailing slashes:

```env
FRONTEND_URL=https://baigdentpro.com,https://www.baigdentpro.com
```

Restart Node after changes.

---

## §4 `NODE_ENV` + `JWT_SECRET` (newtodolist §A)

```env
NODE_ENV=production
JWT_SECRET=<openssl rand -base64 48 — at least 32 characters, not the example string>
```

Restart the app. All users get new sessions after `JWT_SECRET` change.

---

## §5 Schedule backups + off-site (newtodolist §C)

1. Copy lines from **`scripts/backup-cron.example`** into `crontab -e` on a host that can reach Postgres.
2. Ensure **`pg_dump`** is installed.
3. Sync **`server/backups/*.sql`** to S3 or another region (example in same file).

---

## §6 Supabase backups / PITR (newtodolist §C)

If Postgres is **Supabase**:

1. Dashboard → your project → **Project Settings** → **Add-ons** / **Database** (UI varies by plan).
2. Enable **backups** and, on paid plans, **Point-in-Time Recovery** if offered.
3. Run a **test restore** in a throwaway branch/project if Supabase supports it.

---

## §7 Restore drill (newtodolist §C)

On a **disposable** database only:

```bash
cd server
export DATABASE_URL='postgresql://…throwaway…?sslmode=require'
chmod +x scripts/restore-postgres.sh
./scripts/restore-postgres.sh backups/baigdentpro-YYYY-MM-DD….sql
```

Confirm tables exist (`npx prisma studio` or `psql`). Do **not** point production at this DB until verified. Full narrative: **`server/DB_SECURITY_AND_BACKUP.md` §5**.

---

## §8 Secrets hygiene (newtodolist §D)

1. Run **`npm run ops:verify`** — ensures no `.env` files are tracked by git.
2. Rotate any credential ever exposed (chat, ticket, screenshot): **DB password**, **`JWT_SECRET`**, **Supabase keys**, **Twilio**, **SMTP**.

---

## §9 Optional hardening (newtodolist §D)

See **`docs/ROADMAP.md`** — Cloudflare/WAF, CAPTCHA, JWT refresh tokens are **not** implemented; follow vendor docs if you add them.

---

## §10 Payments scope (newtodolist §E)

Shop/billing is **COD / manual** unless you integrate a gateway. Roadmap: **`docs/ROADMAP.md`**.

---

## §11 Twilio + email (newtodolist §E)

1. Set **`TWILIO_*`** and/or **`SMTP_*`** in `server/.env`.
2. Dashboard → **SMS**: send a test to a **verified** Twilio number.
3. Trigger an email flow (e.g. appointment confirmation) if configured.

---

## §12 Print smoke (newtodolist §F)

After each deploy: **Billing** → open invoice → **Print**; **Prescription** → **Print** / preview. Confirm layout and no blank data.

---

## §13 Docker (optional deploy)

```bash
docker build -t baigdentpro .
docker run --rm -p 3001:3001 --env-file server/.env baigdentpro
```

Apply DB schema once (new database):

```bash
docker run --rm --env-file server/.env baigdentpro sh -c "cd server && npx prisma migrate deploy"
```

Compose template: **`docker-compose.prod.example.yml`**. Put **Nginx** in front for TLS and optional same-origin `/api` (see `deploy/nginx-same-origin-api.example.conf`).

---

## Quick local checks (development)

```bash
npm run ops:verify
npm run lint
npm run smoke:api
# With API on another host:
HEALTH_URL='https://api.example.com' npm run ops:verify
```

`HEALTH_URL` should be the **base URL of the Node app** (no `/api/health` suffix); the script appends `/api/health`.
