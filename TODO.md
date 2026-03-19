# BaigDentPro – Master TODO

Central tracker generated from all project `.md` files. Frontend is marked production‑ready; focus is now on backend, integration, testing, deployment, and a few remaining frontend/HTML tasks.

---

## 1. Backend & Database Implementation

- **Core database schema**
  - [ ] Create all core tables: `users`, `clinics`, `patients`, `prescriptions`, `prescription_items`, `appointments`, `medical_histories`, `treatment_plans`, `bills`, `payments`, `drugs`, `audit_logs`.
  - [ ] Add indices for clinic, patient, user, and date fields (per `IMPLEMENTATION_CHECKLIST.md` / `BACKEND_INTEGRATION_GUIDE.md`).
- **Authentication & authorization**
  - [ ] Implement JWT-based auth with refresh tokens.
  - [ ] Implement role-based access control (doctor, receptionist, accountant/admin).
  - [ ] Wire login/logout/change-password endpoints used by the React app.
- **Patients & records**
  - [ ] Implement all `/api/patients` CRUD and search endpoints.
  - [ ] Implement `/api/patients/:id/history` backed by `medical_histories` and treatment data.
- **Prescriptions**
  - [ ] Implement `/api/prescriptions` CRUD + `patient/:patientId` endpoints and printing/PDF generation hook.
  - [ ] Map existing frontend prescription save/print flows to these endpoints.
- **Appointments**
  - [ ] Implement `/api/appointments` CRUD and date-range endpoints.
  - [ ] Connect Records/Prescription appointment UIs to the backend calendar.
- **Billing & payments**
  - [ ] Implement `/api/bills` CRUD + `/api/bills/:id/payment` and `/api/reports/revenue`.
  - [ ] Connect invoice creation, Mushok 6.3, and payment tracking from the UI.
- **Drug database**
  - [ ] Stand up drug database tables and `/api/drugs` + `/api/drugs/search`.
  - [ ] Hook prescription drug search UI to backend search.

---

## 2. Third‑Party Integrations

- **SMS / WhatsApp (Twilio or local provider)**
  - [ ] Configure credentials (.env) and basic send API.
  - [ ] Implement appointment reminder sending and tracking.
- **Payment gateway (Stripe/PayPal)**
  - [ ] Configure keys and create payment endpoints / webhooks.
  - [ ] Connect billing UI to real payments and receipts.
- **Email service (SendGrid/SES/etc.)**
  - [ ] Implement transactional email for appointments, prescriptions, and invoices.
- **PDF generation**
  - [ ] Choose and integrate PDF library for prescriptions, invoices, and reports.
  - [ ] Replace current print‑only flows with optional backend PDF links.
- **Pharmaceutical database**
  - [ ] Integrate with OpenFDA/NDSCO or other drug source and sync into `drugs`.

---

## 3. Security & Compliance

- **Security layer**
  - [ ] Enforce HTTPS/TLS in production.
  - [ ] Implement input validation and rate limiting on all APIs.
  - [ ] Hardening: SQL injection, XSS, CSRF, file upload validation.
- **HIPAA‑oriented features**
  - [ ] Encrypt PHI at rest and in transit.
  - [ ] Implement complete audit logging for sensitive actions.
  - [ ] Add data retention/deletion policies and endpoints.

---

## 4. Testing & Quality

- **Automated tests**
  - [ ] Unit tests for auth, patients, prescriptions, billing, and validation.
  - [ ] Integration tests for API ↔ DB ↔ services.
  - [ ] E2E flows: login, patient registration, prescription creation, appointment booking, billing.
- **Performance & load**
  - [ ] Verify API response time targets (≈200 ms) under realistic load.
  - [ ] Validate large dataset behavior for patients, prescriptions, and invoices.
- **Security testing**
  - [ ] Run vulnerability scans and basic penetration tests.

---

## 5. Deployment, Monitoring & Ops

- **Deployment**
  - [ ] Finalize production environment (domain, SSL, DB, object storage).
  - [ ] Implement migrations and CI/CD for backend + frontend (Vercel/Netlify/other).
  - [ ] Define rollback and backup strategy.
- **Monitoring**
  - [ ] Configure logging, metrics, and alerting (errors, latency, uptime).
  - [ ] Track key app KPIs (login success, prescription success, payment success).

---

## 6. Documentation & Training

- **Docs**
  - [ ] Keep `BACKEND_INTEGRATION_GUIDE.md` and `IMPLEMENTATION_CHECKLIST.md` in sync with real implementation.
  - [ ] Add concrete integration examples/code where checklists are currently conceptual only.
- **Training & rollout**
  - [ ] Use `CCMS_STAFF_CHECKLIST.md` to design initial staff training sessions.
  - [ ] Capture clinic‑specific notes and workflows discovered during rollout back into docs.

---

## 7. Frontend / UI / HTML Follow‑ups

- **Existing React app**
  - [ ] Wire all currently “frontend‑only” flows (patients, prescriptions, appointments, billing, inventory) to the new backend as it comes online.
  - [ ] After backend wiring, re‑run visual/manual QA against `RECORDS_PANEL_UI_IMPROVEMENTS.md` and `HEADER_UI_IMPROVEMENTS.md` to ensure styles still match the documented design.
- **Print popup / billing print flows**
  - [ ] Re‑test invoice + Mushok 6.3 printing after any routing/backend changes:
    - [ ] `npm run dev`, go to Billing, create invoice, test both print buttons.
- **ReflexDN HTML fixes**
  - [ ] Run `scripts/apply-reflexdn-fixes.js` on the latest `reflexdn-patient-view.html` / `reflexdn-patient-list.html`.
  - [ ] Manually/with a secondary script ensure unique checkbox IDs for all teeth and correct modal close behavior (per `REFLEXDN_HTML_FIXES.md`).

---

## 8. Roadmap Items (From Documentation)

- **Short term (next 4–6 weeks)**
  - [ ] Finish backend API + DB.
  - [ ] Implement payment gateway, SMS, and email integrations.
  - [ ] Complete integration and basic analytics reports.
- **Medium/long term**
  - [ ] Advanced analytics dashboards.
  - [ ] Mobile app (or responsive PWA enhancements).
  - [ ] Video consultation and AI‑assisted recommendations.

