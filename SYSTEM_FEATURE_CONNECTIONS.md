# BaigDentPro — System Feature Connections

Generated from repository routes (`server/src/createApp.ts`, `server/src/routes/*.ts`), Prisma schema (`server/prisma/schema.prisma`), and SPA routing (`src/App.tsx`). Verified by running API (`scripts/qa-api-probe.mjs`) and UI sidebar crawl (`scripts/qa-ui-crawl.mjs`) against a live dev stack.

## Runtime wiring

| Layer | Dev command | Notes |
|-------|----------------|-------|
| Frontend | `npm run dev:client` (Vite `http://localhost:5173`) | `VITE_API_BASE_URL` from `.env.development` — browser calls API origin directly. |
| Backend | `cd server && npm run dev` (Express default `PORT` or `5000`) | `DATABASE_URL` / `DIRECT_URL` Prisma Postgres; JWT auth. |
| Database | Remote Postgres (this run: Supabase) or Docker (`docker compose up -d` per `docker-compose.yml`) | `npm run db:setup` when using local Postgres. |

## QA automation artifacts

| Script | Purpose |
|--------|---------|
| `scripts/qa-api-probe.mjs` | Logs in per role; GET probes across dashboard, EMR, shop, admin, super-admin. Writes `qa-api-results.json`. |
| `scripts/qa-ui-crawl.mjs` | Playwright (`playwright-core`, Chrome channel): login + every sidebar `aside` link + safe button clicks. Writes `qa-ui-results.json`. Env: `QA_BASE_URL`, `QA_UI_ROLES` (comma roles). |

## Test accounts (demo seed)

After `SEED_MODE=demo npm run db:seed` with `SUPERADMIN_SEED_EMAIL`, `SUPERADMIN_SEED_PASSWORD`, and `DEMO_SEED_PASSWORD` set in `server/.env`:

| Role | Email (seeded) |
|------|----------------|
| SUPER_ADMIN | Value of `SUPERADMIN_SEED_EMAIL` (QA used `qa.superadmin@baigdentpro.test`) |
| CLINIC_ADMIN | `demo@baigdentpro.com` |
| DOCTOR | `doctor@baigdentpro.com` |
| RECEPTIONIST | `receptionist@baigdentpro.com` |
| TENANT | `tenant@baigdentpro.com` |

Passwords come from env (`DEMO_SEED_PASSWORD` / `SUPERADMIN_SEED_PASSWORD`); do not commit real secrets.

---

## Master connection table

Abbreviations: **R** = route file under `server/src/routes/`. **DB** = primary Prisma models.

| Feature area | API (prefix `/api`) | Backend | DB | UI pages (examples) | Role access (typical) |
|--------------|----------------------|---------|-----|---------------------|-------------------------|
| Health | `GET /api/health` | `createApp.ts` | DB probe cache | (banner via `useSafeHealthProbe`) | Public from SPA origin |
| Auth login | `POST /auth/login`, `POST /auth/register*`, `POST /auth/refresh`, `GET /auth/me`, `PUT /auth/profile`, password routes | `routes/auth.ts` | `User`, `RefreshToken`, `Clinic`, `Subscription` | `/login`, `/signup`, `/accept-invite` | All (register flows vary) |
| Branding (public) | `GET /branding/public` | `routes/branding.ts` | `Clinic.settings` | Site logo hook | Public |
| Dashboard analytics | `GET /dashboard/*` (stats, today, charts, revenue, daily closing, …) | `routes/dashboard.ts` | Aggregates across `Patient`, `Appointment`, `Invoice`, `Prescription`, `LabOrder`, … | `/dashboard/practice/overview`, reports, billing dashboards | Clinical + admin roles per feature gate |
| Patients EMR | `GET|POST|PUT|DELETE /patients`, **`GET /patients/:id/timeline`** (read projection), medical history, dental chart, treatment plans/records, consent | `routes/patients.ts`, `services/patientTimelineQuery.ts` | `Patient`, `MedicalHistory`, `DentalChart`, `TreatmentPlan`, `TreatmentRecord`, `PatientConsent` | `/dashboard/patients`, workspace patient views | `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`, `SUPER_ADMIN` |
| Appointments | `GET|POST|PUT|DELETE /appointments`, cancel/complete/confirm | `routes/appointments.ts` | `Appointment` | `/dashboard/appointments`, `/dashboard/calendar`, operations calendar | Clinical roles |
| Prescriptions | `GET|POST|PUT|DELETE /prescriptions`, `GET .../pdf`, send email/whatsapp | `routes/prescriptions.ts` | `Prescription`, `PrescriptionItem` | `/dashboard/prescriptions`, `/dashboard/prescription` | Clinical roles |
| Invoices & payments | `GET|POST|PUT|DELETE /invoices`, payments, `GET .../pdf`, send email/whatsapp | `routes/invoices.ts` | `Invoice`, `InvoiceItem`, `Payment`, `Transaction` | Practice billing pages | Clinical / admin |
| Lab | CRUD + workflow (`send-to-lab`, `mark-ready`, …) | `routes/lab.ts` | `LabOrder` | `/dashboard/lab` (workspace) | Clinical |
| Communication | `POST /communication/sms/*`, `POST /communication/email/send`, `GET .../logs`, WhatsApp | `routes/communication.ts` | `SmsLog`, `EmailLog`, integrations | `/dashboard/communication` (log viewer UI) | Clinical roles |
| Clinic workspace | Branches CRUD, workspace panels | `routes/clinicWorkspace.ts` | `Branch`, clinic-scoped data | `/dashboard/branches`, network `/network/*` | Admin / clinical per route |
| Activity | `GET /activity/timeline` | `routes/activity.ts` | `ActivityLog` | `/dashboard/activity` | `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`, `SUPER_ADMIN` |
| SaaS shop (public + cart) | `GET /shop/products`, categories, cart, checkout, order lookup | `routes/shop.ts` | `ShopProduct`, `Cart`, `CartItem`, `ShopOrder`, `ShopOrderItem` | Home/marketing shop UIs | Public + authenticated cart |
| Tenant catalog | `GET|POST|PUT|DELETE /products`, `/orders` | `routes/products.ts`, `routes/orders.ts` | `Product`, `Order`, `OrderItem`, `Profit`, `Transaction` | `/dashboard/products`, `/dashboard/orders`, tenant home | `TENANT`, `CLINIC_ADMIN`, `SUPER_ADMIN` (see middleware) |
| Shop admin (tenant) | `/shop/admin/*` stats, orders, products | `routes/shop.ts` | `ShopProduct`, `ShopOrder`, … | Admin shop views inside dashboard | Admin-capable roles |
| SaaS billing (WhatsApp) | `POST /payment/manual/initiate`, `/billing/*`, `/subscription/*`, `/admin/subscription-payments` | `routes/payment.ts`, `routes/platformSaasBilling.ts`, `routes/subscriptionPaymentsAdmin.ts` | `SubscriptionPayment` (PENDING→CONTACTED→PAID→REJECTED), `Subscription`, `Plan` | `/dashboard/subscription`, billing dashboards, super-admin subscription payments | `CLINIC_ADMIN`, `SUPER_ADMIN` |
| Subscription | `/subscription/*` | `routes/subscription.ts` | `Subscription`, `Plan` | Subscription UI | Tenant / clinic admin |
| Invites | `/invite/*` | `routes/invite.ts` | `Invite` | `/dashboard/invites` | `CLINIC_ADMIN`, `SUPER_ADMIN` |
| Upload | `POST /upload` | `routes/upload.ts` | File storage (Supabase or local `uploads/`) | Settings / branding uploads | Authenticated (see route guards) |
| Settings / print prefs | `GET|PUT /settings` | `routes/settings.ts` | `Clinic.settings`, branding fields | `/dashboard/settings`, practice workspace settings | Admin keywords + subscription |
| Admin (tenant SaaS) | `/admin/*` stats, users, clinics, orders, audit logs, branding logo | `routes/admin.ts`, `routes/adminTenants.ts` | Many (`User`, `Clinic`, `AuditLog`, …) | `/dashboard/admin/*` | `ADMIN` keyword (`SUPER_ADMIN`, `CLINIC_ADMIN`, `CLINIC_OWNER`) per `RoleGate` |
| Super Admin platform | `/super-admin/*` clinics, stats, approvals, cross-clinic patients/prescriptions | `routes/superAdmin.ts` | Cross-clinic aggregates | Super-admin nav + analytics | `SUPER_ADMIN` |
| Patient portal | `/patient-portal/*` | `routes/patientPortal.ts` | `PatientPortalOtp`, portal tokens | `/portal/*` routes | Patients (OTP) |
| Devices / impersonation | Middleware + services | various | `DeviceSession`, `ImpersonationSession` | — | Internal |

---

## Router mount map (Express)

Prefix `/api` + mount path from `createApp.ts`:

- `/auth` → `auth.ts`
- `/patients` → `patients.ts`
- `/appointments` → `appointments.ts`
- `/prescriptions` → `prescriptions.ts`
- `/invoices` → `invoices.ts`
- `/lab` → `lab.ts`
- `/shop` → `shop.ts`
- `/communication` → `communication.ts`
- `/dashboard` → `dashboard.ts`
- `/admin` → `adminTenants.ts` then `admin.ts`
- `/billing` → `platformSaasBilling.ts`
- `/invite` → `invite.ts`
- `/subscription` → `subscription.ts`
- `/payment` → `payment.ts`
- `/activity` → `activity.ts`
- `/upload` → `upload.ts`
- `/super-admin` → `superAdmin.ts`
- `/products` → `products.ts`
- `/orders` → `orders.ts`
- `/test` → `test.ts` (non-production only)
- `/clinic` → `clinicWorkspace.ts`
- `/settings` → `settings.ts`
- `/patient-portal` → `patientPortal.ts`
- `/branding` → `branding.ts`

Static uploads: `GET /uploads/*` from server `uploads/` directory.

---

## Fixes applied during this QA pass (reference)

| Issue | Change |
|-------|--------|
| Browser `/api/health` blocked by CORS | Registered `GET /api/health` **after** `cors()` middleware in `server/src/createApp.ts`. |
| Dev automation hit HTTP 429 | Raised default `API_RATE_LIMIT_MAX` and `AUTH_RATE_LIMIT_MAX` baselines when `NODE_ENV !== 'production'` in `createApp.ts`. |
| Missing favicon caused 404 noise | Added `<link rel="icon" href="/logo.png">` in `index.html`. |

---

## Database entities (Prisma models)

Core business tables include: `User`, `Clinic`, `Plan`, `Subscription`, `Branch`, `Patient` and EMR satellites (`MedicalHistory`, `DentalChart`, `TreatmentPlan`, `TreatmentRecord`), `Appointment`, `Prescription` (+ `PrescriptionItem`), `Invoice` (+ `InvoiceItem`, `Payment`), `LabOrder`, shop (`ShopProduct`, `Cart`, `ShopOrder`, …), SaaS tenant catalog (`Product`, `Order`), `AuditLog`, `ActivityLog`, `DoctorPanelSettings`, `Profile`, etc. See `schema.prisma` for full relations.
