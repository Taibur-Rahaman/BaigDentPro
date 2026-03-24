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

The repo includes `vercel.json` for SPA routing.

## License

MIT
