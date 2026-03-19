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
   App runs at `http://localhost:5173`. Use **Sign In** with:
   - Email: `demo@baigdentpro.com`
   - Password: `password123`

   After login, the dashboard loads and saves patients, appointments, prescriptions, invoices, and lab orders via the API.

## Features

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
