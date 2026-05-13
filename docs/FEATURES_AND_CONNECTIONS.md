# BaigDentPro — Features & System Connections

Audit snapshot: codebase scan (React SPA + Express API + PostgreSQL/Prisma).  
Deliverable: implemented vs missing capabilities, module breakdown, routing/API/data mapping, and representative UI→API traces.

**Last stabilization pass:** `npx tsc --noEmit` (root + server), `npm run build`, `prisma validate` + `prisma generate`, ESLint **0 errors** (warnings remain in a few view hooks). Global errors: `GlobalErrorModal` + `src/lib/errorHandler.ts` split **session expiry** (401 / auth messages, no WhatsApp, no HTTP codes in UI) vs **general errors** (Retry + WhatsApp support report). Staff JWT access lifetime defaults to **`JWT_EXPIRES_IN=2h`** (override via env); refresh extends active sessions — see `server/src/utils/config.ts`.

---

## 1. Summary: implemented vs missing

| Area | Implemented | Partial / stub | Missing vs typical DPMS |
|------|-------------|----------------|-------------------------|
| Auth & tenancy | Staff JWT, refresh, invites, clinic scope, device/session concepts, patient portal JWT | — | SSO/SAML, MFA, break-glass policies |
| Patients | CRUD, demographics, medical history (structured flags), consents | — | imaging/PACS, periodontal charting depth |
| Clinical | Dental chart rows (`DentalChart`), treatment plans/records, prescriptions + items, tooth numbering (FDI/Universal) UI | Interactive chart is tooth-selection + stored rows; not full SVG odontogram editor | Perio probing charts, voice/perio integration |
| Scheduling | Appointments (status, duration, chair id field), calendar endpoints, reminders flags | Block scheduling, multi-op efficiency | Hygiene column templates, waitlist |
| Billing | Invoices, line items, payments, PDF hooks, lab orders | — | true insurance (837/835), fee schedules, AR aging as first-class |
| Comms | SMS/Email/WhatsApp API routes + logs | Hub UI is placeholder module | Two-way SMS, template library UI |
| Admin / SaaS | Super admin, clinic admin, plans, subscriptions, Stripe, shop catalog | — | full RCM product |
| Reporting | Dashboard stats, revenue/appointment charts, CSV-style clinic reports page | Some nav targets are product scaffolds | production by provider, insurance aging |
| Patient portal | OTP, profile, appointments, billing views (per routes) | — | full self-scheduling rules engine |

---

## 2. Module-wise breakdown

### 2.1 Auth

| Item | Status | Notes |
|------|--------|--------|
| Login / register / password | Implemented | `server/src/routes/auth.ts` |
| JWT + refresh | Implemented | `RefreshToken` model, client session in `src/lib/core/coreAuthStorage.ts`; access JWT default **≤2h** (`JWT_EXPIRES_IN`), refresh rotation in `coreHttpClient` |
| Global error / session UX | Implemented | `GlobalErrorModal`, `captureError` / `isSessionExpiryPayload` in `src/lib/errorHandler.ts` — session vs general flows separated |
| Role-based UI | Implemented | `RequireRole`, `RoleGate`, `ProtectedRoute` |
| Clinic scope on API | Implemented | `businessApiAuthAndClinic`, `requireClinicScope` |
| Patient portal auth | Implemented | `server/src/routes/patientPortal.ts`, `patientPortalAuth` middleware |
| Invites | Implemented | `server/src/routes/invite.ts` |

**Main UI:** `LoginPage`, `SignupPage`, `AcceptInvitePage`, `PortalAuthPage`, `PatientPortalLoginPage`  
**Main API:** `/api/auth/*`, `/api/invite/*`  
**DB:** `User`, `RefreshToken`, `Invite`, `Clinic`, `DeviceSession`, `PatientPortalOtp`, `PatientPortalRefreshToken`

---

### 2.2 Patient

| Item | Status | Notes |
|------|--------|--------|
| Directory & search | Implemented | `GET /api/patients` |
| Patient detail (full) | Implemented | `GET /api/patients/:id` includes related records |
| Create / update / delete | Implemented | `POST`, `PUT`, `DELETE` under `/api/patients` |
| Medical history | Implemented | `MedicalHistory` model + sanitize on write |
| Dental chart | Implemented | `PUT /api/patients/:id/dental-chart` (FDI validation) |
| Treatment plan / history | Implemented | Prisma `TreatmentPlan`, `TreatmentRecord` |
| Consents | Implemented | `PatientConsent` |

**Main UI:** `PatientsPage`, `PatientDetailPage` (workspace), network global patients  
**Main API:** `/api/patients`  
**DB:** `Patient`, `MedicalHistory`, `DentalChart`, `TreatmentPlan`, `TreatmentRecord`, `PatientConsent`

---

### 2.3 Appointment

| Item | Status | Notes |
|------|--------|--------|
| CRUD + lists | Implemented | `server/src/routes/appointments.ts` |
| Today / upcoming / calendar | Implemented | dashboard + appointment routes |
| Reminder integration | Implemented | `reminderSent` on `Appointment`; comm routes send SMS |

**Main UI:** `AppointmentsPage`, `OperationsCalendarPage`, `PatientPortalBookAppointmentPage`  
**Main API:** `/api/appointments`, `/api/dashboard/*` (stats)  
**DB:** `Appointment` (links `Patient`, `User`, `Clinic`)

---

### 2.4 Billing

| Item | Status | Notes |
|------|--------|--------|
| Invoices & items | Implemented | `/api/invoices` |
| Payments on invoice | Implemented | Prisma `Payment` |
| Subscription / SaaS billing | Implemented | `/api/billing`, `/api/subscription`, `/api/payment`, Stripe webhook |
| Mushok / regional hooks | Present in UI domain code | verify env/feature flags in deployment |
| Insurance / claims | UI scaffold only | `InsuranceClaimsPage` → `ProductModulePlaceholder` |

**Main UI:** `BillingPage`, `BillingDashboardPage`, `InsuranceClaimsPage` (stub)  
**Main API:** `/api/invoices`, `/api/billing`, `/api/payment`  
**DB:** `Invoice`, `InvoiceItem`, `Payment`, `Subscription`, `SubscriptionPayment`, `Plan`

---

### 2.5 Clinical (charts, Rx, lab)

| Item | Status | Notes |
|------|--------|--------|
| Prescriptions | Implemented | `/api/prescriptions`, PDF fields |
| Lab orders | Implemented | `/api/lab` |
| Dental chart store | Implemented | per-tooth rows in `DentalChart` |
| Odontogram UX | Partial | Grid selection + reference image; not a procedural SVG tooth chart |

**Main UI:** `PrescriptionsPage`, `PrescriptionPage` (embedded in workspace), lab rendered inside workspace controller  
**Main API:** `/api/prescriptions`, `/api/lab`  
**DB:** `Prescription`, `PrescriptionItem`, `LabOrder`

---

### 2.6 Admin / platform

| Item | Status | Notes |
|------|--------|--------|
| Super-admin routes | Implemented | `/api/super-admin` |
| Tenant admin | Implemented | `/api/admin`, `/api/admin` tenant router |
| Audit logs | Implemented | `AuditLog` model + UI pages |
| Branding | Implemented | `/api/branding` |
| Shop / catalog | Implemented | `/api/shop`, `/api/products`, `/api/orders` |

**Main UI:** `AdminDashboardLayout` tree, `AdminClinicsPage`, `AdminUsersPage`, `AdminBrandingPage`, etc.  
**DB:** `AuditLog`, `FraudAlert`, `ImpersonationSession`, `Product`, `Order`, etc.

---

## 3. Feature connection map (page → API → DB)

High-level: the SPA uses `src/api.ts` / `src/lib/core/*` to call the API. Express mounts routes in `server/src/createApp.ts`. Prisma models in `server/prisma/schema.prisma`.

### 3.1 Staff clinical workspace (flat `/dashboard/...` routes)

| Path (examples) | Primary client API | Server route prefix | Primary models |
|-----------------|--------------------|--------------------|----------------|
| `/dashboard/overview` | `api.dashboard.*`, bundle loaders | `/api/dashboard` | aggregates over `Patient`, `Appointment`, `Invoice`, … |
| `/dashboard/patients` | `api.patients.*` | `/api/patients` | `Patient` |
| `/dashboard/prescriptions` | `api.prescriptions.*` | `/api/prescriptions` | `Prescription` |
| `/dashboard/appointments` | `api.appointments.*` | `/api/appointments` | `Appointment` |
| `/dashboard/billing` | `api.invoices.*` + billing helpers | `/api/invoices`, `/api/billing` | `Invoice`, `Payment` |
| `/dashboard/reports` | reports / export view models | `/api/dashboard`, clinic workspace | many |
| `/dashboard/insurance` | **stub** (scaffold) | *n/a* | *n/a* |
| `/dashboard/communication` | **stub** (scaffold) | live: `/api/communication` available from other flows | `SmsLog`, `EmailLog` |
| `/dashboard/settings` (tenant) | `api.settings.*` | `/api/settings` | `Clinic.settings` JSON + related |

**Note:** Some child routes use `PracticeChildRoute` (renders `null`); the visible UI is driven by `PracticeWorkspaceController` + `PracticeWorkspaceContext` syncing the URL segment to `activeTab`. This is intentional, not a missing outlet.

### 3.2 Patient portal (`/portal/...`)

| Path | Client | Server | DB |
|------|--------|--------|-----|
| `login` | `corePatientPortalAuth` | `/api/patient-portal` | `Patient`, `PatientPortalOtp` |
| `dashboard` / `book-appointment` / `medical-records` / `billing` | patient portal core modules | `/api/patient-portal` | `Patient`, `Appointment`, invoices as exposed |

### 3.3 Admin & network

| Path | Client | Server | DB |
|------|--------|--------|-----|
| `/dashboard/admin/*` | `coreAdmin*`, `coreSuperAdminApi` | `/api/admin`, `/api/super-admin` | platform-wide |
| `/network/*` | network engines in `src/lib/core/network/*` | `/api/clinic` + admin | `Branch`, `Clinic`, … |

---

## 4. Button → action → API → result (representative)

| UI control (where) | Action | API (method) | Result |
|----------------------|--------|--------------|--------|
| Save patient (workspace) | Update demographics | `PUT /api/patients/:id` | `Patient` row updated |
| Edit medical history | Patch flags / text | `PUT` body to patients route (as implemented) | `MedicalHistory` |
| Select tooth + save chart | Upsert tooth row | `PUT /api/patients/:id/dental-chart` | `DentalChart` upsert |
| Create appointment | Insert schedule | `POST /api/appointments` | `Appointment` |
| Send appointment SMS (API) | Twilio/SMS service | `POST /api/communication/sms/appointment-reminder` | `SmsLog`, may set `reminderSent` |
| Create invoice | Bill patient | `POST /api/invoices` | `Invoice` + `InvoiceItem` |
| Record payment | Apply payment | invoice payment route (client: `api.invoices.addPayment` path) | `Payment` |
| Staff login | JWT issue | `POST /api/auth/login` | token + user |
| Portal OTP | Verify phone | `POST /api/patient-portal/...` (see route file) | portal session |
| Upload product/tenant image (settings UI) | multipart | tenant upload used from `api.tenantProducts.uploadImage` | storage URL returned |

---

## 5. Architecture & folder structure (as-is)

- **Frontend:** `src/pages` (routes), `src/hooks/view` (view models / controllers), `src/lib/core` (HTTP + domain facades), `src/api.ts` (facade class), `src/components` (shared UI).
- **Backend:** `server/src/routes` (Express routers), `server/src/middleware` (auth, tenant, subscription, audit), `server/src/services` (SMS, email, PDF, Stripe, etc.), `server/prisma/schema.prisma`.
- **Security:** Helmet, rate limits, CORS allowlist, global auth for business API, patient-portal separate JWT kind, audit hooks on EMR paths.

---

## 6. Priority roadmap

### Critical (must fix now)

- None blocking production build after recent fixes; keep **API base URL** embedded in dist (`scripts/verify-dist-api-host.cjs`) and **no `window.location.origin` in bundles** for deploy guard compliance.
- Replace **logo upload** in practice settings: `api.tenantProducts.uploadImage` is semantically a **catalog/tenant** path; clinic/doctor assets should use **`/api/upload`** (or dedicated branding upload) to match RBAC and data ownership (see limitations doc).
- **CI:** enforce `npm run typecheck`, `npm run lint`, and `npm run build` on merge (toolchain currently clean for errors; a few ESLint **warnings** remain in AI/network view hooks).

### Important

- Replace **ProductModulePlaceholder** pages (insurance, communication hub, inventory, staff schedule, clinic control, patient portal admin) with real modules or hide behind feature flags until ready.
- **Insurance:** introduce payer, eligibility, claim, and remittance models; avoid fake “insurance” nav without backend.
- **Reporting:** unify `ClinicReportsPage` + practice reports with shared export service; add AR aging, production by provider.
- **Notifications:** wire Communication Hub UI to existing `/api/communication/*` with templates + audit.

### Future upgrades

- Full **odontogram** editor (SVG/per-surface caries), perio chart.
- **Imaging** integration (DICOM viewer bridge).
- **EHR depth:** allergies as coded entities, problem list, immunizations (if general health crossover needed).
- **MFA**, SSO.
- **FHIR** export for interoperability.

---

## 7. Industry DPMS feature checklist (target state)

| Capability | Current BaigDentPro | Suggested direction |
|------------|---------------------|---------------------|
| Dental charting / odontogram | Tooth grid + `DentalChart` API | Surface/per-tooth SVG state + versioning |
| Billing + invoice + insurance | Invoice + Stripe/SaaS billing; insurance UI stub | Clearinghouse integration, ERA, fee schedules |
| Patient history / EHR | Demographics + MR flags + treatments + Rx | Document attachments, structured allergy/pharma |
| Notifications | SMS/Email/WhatsApp routes | Hub UI + queues + template governance |
| Reporting dashboard | Dashboard charts + reports page | Role-specific KPIs, scheduled exports |

---

*Generated as part of an architecture/QA pass; update when major routes or models change.*
