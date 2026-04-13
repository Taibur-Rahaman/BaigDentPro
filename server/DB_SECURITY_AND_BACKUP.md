# BaigDentPro – Database Security & Backup Guide

This document shows how to run the BaigDentPro database in a **secure, professional way** and how to **recover quickly if the database is attacked or corrupted**.

The application is configured to use **PostgreSQL via `DATABASE_URL`**.

---

## 1. Secure managed PostgreSQL setup

For production, use a **managed PostgreSQL** service (Render PostgreSQL, Supabase, Railway, AWS RDS, etc.) instead of a local or shared-host database.

### 1.1. Create the database and user

1. Create a database, e.g. `baigdentpro`.
2. Create an **app user** with:
   - Long random password (32+ chars)
   - Permissions **only** on `baigdentpro`
   - Not a superuser.

You will get connection details like:

- Host: `db-example.your-provider.com`
- Port: `5432`
- Database: `baigdentpro`
- User: `baigdentpro_app`
- Password: `GENERATED_PASSWORD`

### 1.2. Set `DATABASE_URL` (secrets, not in git)

Construct the URL:

```text
postgresql://baigdentpro_app:GENERATED_PASSWORD@db-example.your-provider.com:5432/baigdentpro?sslmode=require&connection_limit=10&pool_timeout=30
```

In the **production environment variables** (Hostinger / VPS / managed app), set:

```env
DATABASE_URL=postgresql://baigdentpro_app:GENERATED_PASSWORD@db-example.your-provider.com:5432/baigdentpro?sslmode=require&connection_limit=10&pool_timeout=30
JWT_SECRET=LONG_RANDOM_SECRET_VALUE
JWT_EXPIRES_IN=7d
```

> Do **not** commit real values to git. Only `.env.example` should be in version control.

### 1.3. Network & TLS

- Restrict database access to:
  - Your backend server IP / VPC only.
- Require **SSL/TLS** (`sslmode=require` in `DATABASE_URL`).

---

## 2. Apply Prisma migrations to the secure DB

On a machine that can reach the Postgres instance (your CI, VPS, or local with VPN):

```bash
cd server
export DATABASE_URL="postgresql://baigdentpro_app:GENERATED_PASSWORD@db-example.your-provider.com:5432/baigdentpro?sslmode=require"
npx prisma migrate deploy
```

This will apply all migrations to the managed database.

---

## 3. Automated backups (pg_dump)

The repository includes `scripts/backup-postgres.sh` which:

- Reads `DATABASE_URL`
- Produces a timestamped SQL dump into `./backups`

### 3.1. Manual backup

On the server (or any machine with DB access and `pg_dump` installed):

```bash
cd server
export DATABASE_URL="postgresql://baigdentpro_app:GENERATED_PASSWORD@db-example.your-provider.com:5432/baigdentpro?sslmode=require"
chmod +x scripts/backup-postgres.sh
./scripts/backup-postgres.sh
```

Result:

- A file like `backups/baigdentpro-2026-03-19T12-00-00Z.sql`

### 3.2. Scheduled backups (cron example)

On a Linux/VPS host:

```bash
crontab -e
```

Add a daily backup at 02:00:

```cron
0 2 * * * cd /path/to/baigdentpro/server && DATABASE_URL="postgresql://baigdentpro_app:GENERATED_PASSWORD@db-example.your-provider.com:5432/baigdentpro?sslmode=require" ./scripts/backup-postgres.sh >> backup.log 2>&1
```

---

## 4. Off‑site backup storage

**Never** keep the only copy of backups on the same machine as the database.

### 4.1. Example with AWS S3

1. Create an S3 bucket, e.g. `baigdentpro-db-backups`.
2. Configure an IAM user or role with write access to that bucket.
3. Install and configure `awscli` on the server.

Then extend the cron job to sync backups:

```cron
0 2 * * * cd /path/to/baigdentpro/server && DATABASE_URL="postgresql://baigdentpro_app:GENERATED_PASSWORD@db-example.your-provider.com:5432/baigdentpro?sslmode=require" ./scripts/backup-postgres.sh && aws s3 sync ./backups s3://baigdentpro-db-backups/ --delete >> backup.log 2>&1
```

You now have:

- Local copies under `./backups`
- Off‑site encrypted copies in S3

---

## 5. Restore procedure (after an attack or corruption)

Use `scripts/restore-postgres.sh` to restore from a dump.

> WARNING: This will **drop existing tables** in the target database before restore. Use it only on a database you intend to fully overwrite.

### 5.1. Restore into a clean database

1. Create a **new empty database** (e.g. `baigdentpro_restored`) and a user with access.
2. Download a backup file from S3 (or copy from `./backups`).
3. Run:

```bash
cd server
export DATABASE_URL="postgresql://baigdentpro_app:GENERATED_PASSWORD@db-example.your-provider.com:5432/baigdentpro_restored?sslmode=require"
chmod +x scripts/restore-postgres.sh
./scripts/restore-postgres.sh backups/baigdentpro-2026-03-19T12-00-00Z.sql
```

4. Point your backend `DATABASE_URL` to the restored database once verified.

---

## 6. Application-level protections (backend)

The API includes mitigations that reduce common database-related abuse:

- **Production startup checks** (`validateProductionEnvironment`): refuses SQLite/file DBs in production; warns if `DATABASE_URL` omits TLS parameters.
- **HTTP hardening**: `helmet` security headers; `trust proxy` in production for correct client IP behind reverse proxies.
- **Rate limiting**: global `/api` limits and stricter limits on `/api/auth` to slow brute-force and credential stuffing.
- **Medical history updates**: request bodies are **whitelisted** (no raw `...req.body` into Prisma) to prevent mass-assignment and unexpected field writes.
- **Shop admin routes**: `/api/shop/admin/*` requires **clinic admin** (not only a logged-in user), reducing unauthorized data access.
- **Error responses**: production avoids returning raw database error strings to clients on 5xx responses.
- **Password policy**: minimum length (and max) on register and password change.

---

## 7. Recommended security checks

- **Access control**
  - Only the backend uses the DB credentials.
  - No direct DB access from the public internet.
- **Secrets**
  - Rotate DB password and `JWT_SECRET` if leaked.
  - Store them in your hosting provider's secret/env store, not in files.
- **Monitoring**
  - Enable DB logs and watch for:
    - Unusual login attempts
    - Sudden spikes in queries or errors

By following this guide and using the included scripts, your database will be:

- Hosted on a secure managed PostgreSQL service
- Protected by restricted network access and strong credentials
- Backed up automatically
- Recoverable via a tested restore process

---

## 8. If the website is hacked or you suspect an attack

No checklist replaces a qualified security review, but use this as an **immediate operational sequence**:

1. **Contain**
   - If you host the Node app yourself: **stop** the process (or scale to zero) until you understand the blast radius.
   - In **Supabase**: review **Logs** and **Auth** for unusual sign-ins; consider **pausing** the project only if you must block all access while investigating (this affects live users).

2. **Rotate secrets (assume compromise if unsure)**
   - Generate a new **database password** and update `DATABASE_URL` on the server; restart the app.
   - Generate a new **`JWT_SECRET`** and deploy; **all users will need to sign in again** (old tokens invalid).
   - Rotate **Supabase service_role** and **anon** keys if they could have leaked (Dashboard → API → reset).
   - Rotate any **SMTP / Twilio / WhatsApp** keys that lived in the same environment.

3. **Preserve evidence**
   - Export or screenshot **reverse-proxy access logs**, **application logs** (failed logins are tagged `[security] failed_login` in server output), and **Supabase logs** for the incident window before they roll off.

4. **Assess data**
   - Check **ActivityLog** (and Supabase audit features if enabled) for unexpected admin actions.
   - Compare current row counts or critical tables against a **recent backup** if you suspect data tampering.

5. **Recover**
   - If the database was corrupted or ransomware-style dropped: restore from the **latest clean backup** (see §5) into a **new** database, verify, then point `DATABASE_URL` at it.

6. **Harden before going back live**
   - Confirm **TLS**, **CORS** (`FRONTEND_URL`), and **firewall** rules still match your intent.
   - Re-run smoke tests: `/api/health`, login, one patient read/write.

7. **Backups going forward**
   - **Supabase**: enable and verify **Point-in-Time Recovery** / automated backups on paid tiers, or schedule **`backup-postgres.sh`** plus **off-site** copy (§3–§4) so you always have a restore path.

For day-to-day assurance: **you are not “safe because the app exists”**—safety comes from **managed DB backups**, **secret hygiene**, **HTTPS**, **limited DB network exposure**, and **monitoring**. The app implements rate limits, helmet, production env checks, and scoped patient queries; it does **not** replace backups or org-wide security policies.

