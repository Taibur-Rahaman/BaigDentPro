# BaigDentPro — Features & connections

**Last updated:** 2026-05-06 · **Sources:** `server/src/createApp.ts`, `server/src/routes/*.ts`, `src/App.tsx`, `server/prisma/schema.prisma`

**Legend:** ✅ implemented · ⚠️ partial / scaffold · ❌ not implemented or blocked by design

### Definition of done (feature-complete)

A capability counts as **✅ complete** only when: **UI is real** (not `ProductModulePlaceholder` unless explicitly marked product-preview), **API routes wired**, **Prisma/DB consistent**, **RBAC enforced**, **smoke-tested without console/API errors** on happy path with **real seed-like data** where applicable.

Cross-reference: **`SYSTEM_FEATURE_CONNECTIONS.md`** (historical QA wiring + router inventory).

### Payment policy (**locked** — do not revert without product sign-off)

| Rule | Implementation |
|------|----------------|
| SaaS / subscription checkout | **Manual WhatsApp only** — `POST /api/payment/manual/initiate` creates `SubscriptionPayment` (`MANUAL_WHATSAPP`), opens `wa.me` with prefilled template |
| Admin settlement | `GET/PATCH /api/admin/subscription-payments` (**SUPER_ADMIN**) — statuses **PENDING → CONTACTED → PAID \| REJECTED**; **PAID** runs `applyVerifiedSubscriptionPayment` |
| Forbidden | **No Stripe**, **no** hosted card/MFS checkout for subscriptions (`stripe` dependency removed from server) |
| Config | `config/payment.ts` (PM-visible) + **`server/src/config/paymentPolicy.ts`** (runtime) · env **`ADMIN_WHATSAPP_NUMBER`** |

---

## Status overview

| Module | Status | Notes |
|--------|--------|--------|
| API health & CORS | ✅ | `GET /api/health` registered after `cors()` (browser-safe probe) |
| Authentication & sessions | ✅ | Login, register, `POST /auth/refresh`, JWT + refresh tokens, device sessions |
| Role-based access | ✅ | Express middleware + SPA `RoleGate` / `RequireRole` |
| Password change / recovery | ✅ | Authenticated password change; recovery via Supabase + `sync-prisma-password` |
| Patients (CRUD, EMR) | ✅ | Medical history, dental chart, treatment plans/records, consent |
| Appointments | ✅ | CRUD, filters, status string, reminders fields, conflict checks |
| Prescriptions | ✅ | CRUD, PDF, send channels — **RECEPTIONIST blocked** from Rx API by RBAC |
| Invoices & clinic payments | ✅ | CRUD, PDF; **patient invoice payments recorded as CASH only** (wallet/Stripe paths removed) |
| Lab orders | ✅ | `/api/lab/*` |
| Dashboard analytics | ✅ | `GET /api/dashboard/*` (stats, charts, revenue, doctor metrics, …) |
| Communication (API) | ✅ | SMS/email routes + logs (`/api/communication/*`) |
| Communication hub (UI) | ✅ | `/dashboard/communication` lists SMS + email logs from API |
| Activity timeline | ✅ | `/api/activity/timeline` |
| Multi-branch / clinic workspace | ✅ | `/api/clinic/*`, branches UI, network `/network/*` |
| SaaS shop | ✅ | Public products/cart/checkout; tenant catalog `/products`, `/orders` |
| Shop admin API | ✅ | `/api/shop/admin/*` — **TENANT role gets 403** (admin-capable roles only) |
| SaaS subscription billing | ✅ | **Manual WhatsApp** (`/api/payment/manual/initiate`) + admin **`/api/admin/subscription-payments`** |
| Subscription management | ✅ | `/api/subscription/*`, plans UI |
| Invites | ✅ | `/api/invite/*`, dashboard invites |
| Uploads | ✅ | `POST /api/upload`, static `/uploads` |
| Settings & branding | ✅ | `/api/settings`, `/api/branding/public` |
| Admin (tenant SaaS) | ✅ | `/dashboard/admin/*`, `/api/admin/*` |
| Super admin | ✅ | `/api/super-admin/*` |
| Patient portal | ✅ | `/api/patient-portal/*`, SPA `/portal/*` (login, dashboard, book, records, billing) |
| Insurance claims (UI) | ⚠️ | **Stub page** — placeholder only |
| Inventory (UI) | ⚠️ | **Stub page** |
| Staff schedule (UI) | ⚠️ | **Stub page** |
| Clinic control panel (UI) | ⚠️ | **Stub page** |
| Patient portal settings (UI) | ⚠️ | **Stub page** (portal backend exists separately) |
| AI assistants (core libs) | ⚠️ | `src/lib/core/ai/*` — orchestration present; product depth varies by screen |

---

## Core checklist (product matrix)

### Authentication

| Feature | Status |
|---------|--------|
| Login (admin / doctor / reception / tenant / super-admin) | ✅ |
| JWT access + refresh token flow | ✅ |
| Role-based access control | ✅ |
| Password reset (Supabase recovery + Prisma sync) | ✅ |

### Patient management

| Feature | Status |
|---------|--------|
| Add / edit / delete patient | ✅ |
| Patient history & medical history | ✅ |
| Dental chart & treatment data | ✅ |
| File upload (reports, images) | ✅ |

### Appointments

| Feature | Status |
|---------|--------|
| Create / update / cancel / complete | ✅ |
| Calendar & operations views | ✅ |
| Doctor/chair scheduling hooks (`chairId`, duration) | ✅ |
| Status workflow | ✅ (`Appointment.status` string) |
| Dedicated no-show metric | ⚠️ | No first-class `NO_SHOW` enum in schema; may use status or reporting |

### Clinical

| Feature | Status |
|---------|--------|
| Dental charting (data + UI depth) | ⚠️ | API ✅; rich odontogram UX varies by page |
| Treatment plan | ✅ |
| Procedure / treatment records | ✅ |
| Prescription system | ✅ |
| Imaging (upload + view) | ⚠️ | Upload ✅; dedicated viewer depends on UI |

### Billing & finance

| Feature | Status |
|---------|--------|
| Invoice generation & PDF | ✅ |
| Payment tracking & recording | ✅ |
| Due / pending amounts (dashboard) | ✅ |
| Insurance claims | ⚠️ | UI stub only |
| Financial reports | ✅ | Dashboard + clinic reports surfaces |

### Dashboard & analytics

| Feature | Status |
|---------|--------|
| Daily / monthly stats | ✅ |
| Revenue chart | ✅ |
| Patient & appointment charts | ✅ |
| Doctor performance / revenue | ✅ |

### Communication

| Feature | Status |
|---------|--------|
| SMS / email APIs & logs | ✅ |
| Dedicated hub UI | ❌ | Stub placeholder |
| Appointment reminder fields | ✅ (`reminderSent`, `reminderSentAt`) |

### Admin & platform

| Feature | Status |
|---------|--------|
| Staff / user management | ✅ |
| Role permissions | ✅ |
| Activity & audit logs | ✅ |
| System / clinic settings | ✅ |

### Advanced

| Feature | Status |
|---------|--------|
| Multi-branch | ✅ |
| Inventory module | ⚠️ | UI stub |
| Lab integration | ✅ |
| Online subscription gateways (Stripe / bKash / Nagad automation) | ❌ | **Removed** — policy is manual WhatsApp |
| Local wallet methods on invoices | ⚠️ | Region/clinic rules + manual verification paths exist; not full gateway automation |

---

## Connection table (primary wiring)

Prefix all API paths with `/api`. SPA routes are browser paths.

| Feature area | API (examples) | Backend | Primary DB models | UI (examples) |
|--------------|----------------|---------|---------------------|----------------|
| Health | `GET /api/health` | `createApp.ts` | DB monitor | `ApiHealthBanner`, probes |
| Auth | `POST /auth/login`, `/auth/refresh`, `GET /auth/me` | `routes/auth.ts` | `User`, `RefreshToken`, `DeviceSession` | `/login`, `/signup`, `/accept-invite`, `/staff-portal` |
| Branding | `GET /branding/public` | `routes/branding.ts` | `Clinic.settings` | Site logo hooks |
| Dashboard | `GET /dashboard/stats`, `…/revenue-chart`, … | `routes/dashboard.ts` | aggregates | `/dashboard/overview`, practice overview |
| Patients | `/patients`, `…/medical-history`, `…/dental-chart`, treatment routes | `routes/patients.ts` | `Patient`, EMR satellites | `/dashboard/patients`, workspace |
| Appointments | `/appointments`, `/appointments/today` | `routes/appointments.ts` | `Appointment` | `/dashboard/appointments`, `/dashboard/calendar` |
| Prescriptions | `/prescriptions`, `…/pdf` | `routes/prescriptions.ts` | `Prescription` | `/dashboard/prescriptions` |
| Invoices | `/invoices`, payments subroutes | `routes/invoices.ts` | `Invoice`, `Payment` | practice `/dashboard/billing` |
| Lab | `/lab/*` | `routes/lab.ts` | `LabOrder` | `/dashboard/lab` |
| Communication | `/communication/*` | `routes/communication.ts` | `SmsLog`, `EmailLog` | `/dashboard/communication` |
| Clinic / branches | `/clinic/*` | `routes/clinicWorkspace.ts` | `Branch`, … | `/dashboard/branches`, `/network/*` |
| Shop | `/shop/*`, `/products`, `/orders` | `routes/shop.ts`, `products.ts`, `orders.ts` | shop + tenant tables | products/orders pages |
| Billing / manual WhatsApp | `/billing/*`, **`/payment/manual/initiate`**, `/admin/subscription-payments` | `routes/billing.ts`, `payment.ts`, `subscriptionPaymentsAdmin.ts` | `SubscriptionPayment` | `/dashboard/subscription`, **`/dashboard/admin/subscription-payments`** |
| Portal | `/patient-portal/*` | `routes/patientPortal.ts` | portal OTP / tokens | `/portal/*` |
| Upload | `POST /upload` | `routes/upload.ts` | storage backends | settings / profile |
| Admin | `/admin/*` | `routes/admin.ts`, `adminTenants.ts` | many | `/dashboard/admin/*` |
| Super admin | `/super-admin/*` | `routes/superAdmin.ts` | cross-clinic | super-admin UI |

---

## Related docs

- `SYSTEM_FEATURE_CONNECTIONS.md` — detailed QA run notes and router map from an earlier pass  
- `scripts/qa-api-probe.mjs`, `scripts/qa-ui-crawl.mjs` — regenerate `qa-api-results.json` / `qa-ui-results.json`

---

## Roadmap progress (high level)

| Phase | Theme | Progress (2026-05-06) |
|-------|--------|------------------------|
| **1 — Stabilize** | Auth, API reliability, health, rate limits | **Largely done** in tree: refresh tokens, `/api/health` + CORS, tier/rate limits |
| **2 — Core product** | Billing depth, clinical UX (charting), replace stub dashboard modules | **In progress** — many APIs exist; several dashboard pages still placeholders |
| **3 — Advanced** | AI automation, deeper clinic integrations | **Early** — AI libs present; subscriptions intentionally **manual** |
