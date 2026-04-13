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

### Alpha testing (Supabase Postgres + optional Auth)

Use this for a hosted alpha (e.g. [baigdentpro.com](https://baigdentpro.com)) with **Supabase** as Postgres and, if you want password reset / Auth sync, the same project’s API keys.

1. **Supabase dashboard**
   - Create or pick a **non-production** project for alpha when possible.
   - **Database →** copy the **URI** connection string (use **Session** or **Transaction** pooler if your host recommends it). Append `?sslmode=require` if it is not already there.
   - **Project Settings → API →** copy **Project URL**, **anon** `public`, and **service_role** `secret` (server only).

2. **Auth URLs (if you use Supabase Auth features)**  
   **Authentication → URL configuration:** set **Site URL** to your alpha site (e.g. `https://baigdentpro.com`). Add the same under **Redirect URLs** if the dashboard requires it. The server uses the first origin in `FRONTEND_URL` for invite/reset links.

3. **Backend env on the alpha server**  
   Copy `server/.env.alpha.example` → `server/.env` and fill every empty value (`JWT_SECRET` must be random and **≥ 32 characters** — `validateProductionEnvironment` enforces this when `NODE_ENV=production`).

4. **Apply schema and seed (one-time or after schema changes)**  
   From the repo root (with `DATABASE_URL` set in `server/.env`):

   ```bash
   npm run db:push:alpha
   npm run db:seed:alpha
   ```

5. **Frontend build for alpha**  
   Copy `.env.alpha.example` → `.env.alpha` with `VITE_SUPABASE_*` filled. If the API is on another host, set `VITE_API_URL` to the public API base (e.g. `https://api.yourdomain.com/api`). Then:

   ```bash
   npm run build:alpha:full
   ```

6. **Run the API** (same as production — serves `dist/` when present):

   ```bash
   NODE_ENV=production npm run start:production
   ```

7. **Smoke test:** open `https://YOUR-API-HOST/api/health` and confirm `"database":"connected"`.

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
   For **new** databases, prefer **`npm run db:migrate:deploy`** (from repo root) so schema matches versioned migrations under `server/prisma/migrations/`. For quick local experiments, `npx prisma db push` in `server/` is still fine.
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

### Hostinger: File Manager or FTP (static site only)

Use this when you **upload files** to `public_html` (no Git deploy). It deploys the **React app only**. Your **API must run elsewhere** (VPS, another Node host, or Hostinger’s Node feature) and must allow your site’s domain in **`FRONTEND_URL`** (CORS).

1. **Point the frontend at the live API** (create a file `.env.production` in the repo root before building):
   ```bash
   # Example: public HTTPS API
   VITE_API_URL=https://api.yourdomain.com/api
   ```
   If you omit this, the app uses `/api` (same domain). That only works if **the same domain** serves `/api` (for example via reverse proxy to Node), not if the site is pure static files only.

2. **Build:**
   ```bash
   npm ci
   npm run build:hostinger-static
   ```
   Output is in **`dist/`** (includes `index.html`, `assets/`, images, and **`.htaccess`** for Apache SPA routing on Hostinger).

3. **Upload** the **contents** of `dist/` (all files and folders, including hidden `.htaccess`) into **`public_html`** (or the subdomain’s document root). Use **binary** mode in FTP for assets if your client offers it.

4. **Do not** upload `server/`, `node_modules/`, or source files for this static-only method—only the **`dist`** output.

5. If the site lives in a **subfolder** (e.g. `yoursite.com/app/`), build with a base path and fix `.htaccess` `RewriteBase` — see comments inside `public/.htaccess`.

### Hostinger: Git + Vite site (e.g. `*.hostingersite.com`, Cloud Startup)

What Hostinger’s **default Vite + Git** deploy does: it runs something like `npm install` + `npm run build` and publishes **`dist/`** as a **static site**. That is **not** the Express API and **not** PostgreSQL. Your plan shows **Node.js apps** (e.g. 2/10) — use that for the backend, or use an external API + hosted DB.

**Path A — Full stack on Hostinger (same subscription, recommended if you have Node slots)**

1. **Database (hPanel):** **Websites → your site → Databases** — create a **PostgreSQL** database (or use **Supabase / Neon** and copy the connection string). Never use `localhost` unless Postgres runs on the same server as Node.
2. **Node.js app (hPanel):** **Advanced → Node.js** (or **Websites → Node.js** depending on UI) — **Create application**, point it at this repo or upload the built project, set:
   - **Startup file / command:** run from repo root after install, e.g. `npm run start:production` (after `npm ci` and `npm run build:production` on the server), or whatever your panel expects (some use `server/dist/index.js` with `node`).
   - **Environment variables** (never commit these):  
     `NODE_ENV=production`  
     `DATABASE_URL=postgresql://...?sslmode=require`  
     `JWT_SECRET=` (32+ random characters)  
     `FRONTEND_URL=https://YOUR-SUBDOMAIN.hostingersite.com` (your real site URL, comma-separated if you add `www` or a custom domain later)  
     Optional: `PORT` if the panel assigns one.
3. **Deploy schema:** SSH or one-time deploy step: `cd server && npx prisma db push` (or `migrate deploy`) so tables exist.
4. **If the SPA is still built separately by Git:** set **`VITE_API_URL`** in the **Git build environment variables** to your **public API base URL** (e.g. `https://api.yourdomain.com/api` or the URL Hostinger gives the Node app). Rebuild/redeploy the frontend so `fetch` hits the real API.

**Path B — Keep Git deploy as frontend-only**

1. Run the **API + DB** on a **VPS**, **Railway**, **Render**, or Hostinger **Node** URL.
2. In Hostinger **Git → Environment variables** for the Vite build, set `VITE_API_URL=https://YOUR-API-HOST/api` and redeploy.
3. On the API server, set `FRONTEND_URL` to your Hostinger site URL (exact `https://…` origin).

**Quick check:** open `https://YOUR-API-HOST/api/health` — JSON should show `"database":"connected"`.

### After GitHub → Hostinger: “database not working” (common causes)

1. **Static hosting (`public_html` upload) has no database.**  
   Uploading only `dist/` gives you **HTML/JS files**. There is **no Node process** and **no PostgreSQL** on that host. The app will call `/api/...` on the **same domain** and get your **Apache `index.html`** (wrong) unless you point the build at a real API (see below).  
   **Fix:** Either run the **full stack** on a **VPS / Hostinger Node app** (see “One service”), **or** keep static hosting and run the API on another server, then rebuild with `VITE_API_URL=https://your-api-host.com/api`.

2. **`DATABASE_URL` must not be `localhost`.**  
   On the **machine where Node runs**, `localhost` is that server’s loopback — not your laptop. Use a **hosted** Postgres URL (Supabase, Neon, Railway, Hostinger managed DB, etc.) with TLS, e.g. `postgresql://user:pass@host:5432/db?sslmode=require`.

3. **CORS:** set `FRONTEND_URL` on the API to your **exact** live origins (including `https://` and `www` if you use both), comma-separated. Wrong origins = browser blocks API calls (looks like “nothing works”).

4. **Check the API itself:** open `https://YOUR-API-HOST/api/health` in a browser. You should see JSON with `"database":"connected"`. If you see `"database":"disconnected"`, the API is running but **cannot reach Postgres** — fix `DATABASE_URL`, firewall, and SSL params.

5. **Email domain (“temp mail”)** does not fix the database. SMTP and Postgres are separate; use a real provider for production mail if you send from the app.

### Before going live

- [ ] Rotate all secrets; never commit `server/.env`.
- [ ] Use PostgreSQL with TLS; backups for the database.
- [ ] Apply schema changes on deploy (`npx prisma db push` or `migrate deploy` if you use migrations).
- [ ] Smoke-test `/api/health` (expect `database: connected`) and login after deploy.

## License

MIT
