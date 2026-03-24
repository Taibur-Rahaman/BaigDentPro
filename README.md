# BaigDentPro

Professional dental clinic management – prescription panel, patient records, and treatment planning (React + Vite).

## Setup

### Frontend only

```bash
npm install
npm run dev
```

Open the URL from Vite (e.g. `http://localhost:5173`). Data is stored in the browser (localStorage).

### Full stack (frontend + backend)

0. **PostgreSQL** (required — Prisma connects to `DATABASE_URL` in `server/.env`, default `localhost:5432`)

   **Option A — Docker (recommended)**  
   Start [Docker Desktop](https://www.docker.com/products/docker-desktop/), then from the repo root:

   ```bash
   docker compose up -d
   ```

   Wait until Postgres is healthy (`docker compose ps`). If you see *Can't reach database server at `localhost:5432`*, Docker isn’t running or port `5432` is used by something else.

   **Option B — your own Postgres**  
   Create a database and user, then set `DATABASE_URL` in `server/.env` to match (see `server/.env.example`).

1. **Backend**
   ```bash
   cd server
   npm install
   cp .env.example .env   # optional; server/.env with JWT_SECRET already exists for dev
   npx prisma db push
   npm run db:seed
   npm run dev
   ```
   API runs at `http://localhost:3001`.

2. **Frontend** (in another terminal)
   ```bash
   npm install
   npm run dev
   ```
   App runs at `http://localhost:5173`. After `npm run db:seed`, use **Sign In** with:
   - **Clinic admin** (manages doctor access under **Clinic admin** in the sidebar): `demo@baigdentpro.com` / `password123`
   - **Doctor** (same clinic, no admin panel): `doctor@baigdentpro.com` / `password123`
   - **Platform super admin** (all clinics, separate **Super Admin** panel): `superadmin@baigdentpro.com` / `super123`

   After login, the dashboard loads and saves patients, appointments, prescriptions, invoices, and lab orders via the API.

   **Public registration:** New accounts from **Create Account** are created in a *pending* state. A **super admin** must open **Super Admin → Pending signups** and click **Approve** before that user can sign in. Staff added under **Clinic admin → Add staff** are approved automatically.

## Features

- **Clinic admin** – Disable or enable doctor logins, change roles (doctor vs clinic admin), add staff accounts (**Clinic admin** sidebar; requires API + `CLINIC_ADMIN` or `SUPER_ADMIN` role)
- **Login** – Choose Prescription or Records panel (demo credentials)
- **Prescription** – Patient details, O/E, Ix, drug list, save & print
- **Records** – Patient list (table with View/Edit/Delete), appointments, inventory
- **Patient profile** – Tooth selection (permanent/deciduous), medical history, treatment plans
- **Tooth chart** – Select teeth by quadrant; Full Mouth / Multi Teeth

## Deploy on Vercel

1. Push this repo to GitHub: [Taibur-Rahaman/BaigDentPro](https://github.com/Taibur-Rahaman/BaigDentPro)
2. In [Vercel](https://vercel.com), **Add New Project** → Import **Taibur-Rahaman/BaigDentPro**
3. Leave build settings as default (Vite is auto-detected)
4. Deploy

The repo includes `vercel.json` for SPA routing. Vercel hosts **frontend only**; run the API and PostgreSQL elsewhere (see below) and set **Environment Variables** `VITE_API_URL` to your public API base (e.g. `https://api.yourdomain.com/api`).

## Production on Hostinger (or any Node + PostgreSQL host)

BaigDentPro is a **Vite/React SPA** plus a **Node (Express) API** and **PostgreSQL**. Hostinger **VPS or cloud Node** plans can run the full stack; static-only hosting is **frontend only** unless you point `VITE_API_URL` at a separate API URL.

### One service (recommended on VPS)

1. Create a **managed PostgreSQL** database (Hostinger or Neon, Supabase, etc.) and note `DATABASE_URL` with TLS (`?sslmode=require`).
2. On the server, clone the repo and install **Node 20+**.
3. Create `server/.env` from `server/.env.example` with:
   - `NODE_ENV=production`
   - `DATABASE_URL` (Postgres, not SQLite)
   - `JWT_SECRET` — long random string (32+ characters, not the placeholder)
   - `FRONTEND_URL` — your live site origin(s), comma-separated, e.g. `https://yourdomain.com,https://www.yourdomain.com`
   - `PORT` — the port your reverse proxy expects (often `3001` or whatever Nginx forwards to)
4. From the **repository root**:
   ```bash
   npm ci
   cd server && npx prisma db push && cd ..
   npm run build:production
   ```
   When you introduce Prisma migrations, replace `db push` with `npx prisma migrate deploy` for production.
5. Start the API (it will also serve the built SPA from `dist/` when `dist` exists):
   ```bash
   NODE_ENV=production npm run start:production
   ```
   Use **PM2**, **systemd**, or Hostinger’s process manager so the app restarts on reboot.
6. Put **Nginx** (or the panel’s reverse proxy) in front: TLS termination, `proxy_pass` to `PORT`, and WebSocket limits if you add them later.

### Split frontend and API

- Build the SPA with `npm run build` and deploy `dist/` to static hosting or CDN.
- If the API is on another origin, set `VITE_API_URL` (see `.env.production.example`) **before** building.
- On the API server, set `FRONTEND_URL` to the **exact** browser origins that will call the API (CORS).

### Before going live

- [ ] Rotate all secrets; never commit `server/.env`.
- [ ] Use PostgreSQL with TLS; backups for the database.
- [ ] Apply schema changes on deploy (`npx prisma db push` or `migrate deploy` if you use migrations).
- [ ] Smoke-test `/api/health` and login after deploy.

## License

MIT
