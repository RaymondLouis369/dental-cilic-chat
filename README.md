# Dental Clinic & Dental Center Management Platform — Egypt
## Phases 01–04: Foundation, Patient Identity, Operations/Pricing, & Doctor Clinical Workspace

A modern, cloud-native, multi-tenant Software-as-a-Service (SaaS) application built for single dental clinics and multi-branch dental centers operating in the **Arab Republic of Egypt**.

---

## Critical Project Identity

- **Industry:** Dental Healthcare (طب وجراحة الأسنان)
- **Target Market:** Egypt (جمهورية مصر العربية)
- **Default Currency:** Egyptian Pound (`EGP` / `ج.م`)
- **Default Timezone:** `Africa/Cairo`
- **Default Phone Dialing Code:** `+20`
- **Default Language:** Arabic (RTL) with bi-directional English (LTR) toggle support

---

## Implemented Architecture & Completed Phases

### Phase 01: Multi-Tenant SaaS Foundation & RBAC
1. **Multi-Tenant Architecture:** Single clinics and multi-branch dental centers (Cairo, Alexandria, Giza) with PostgreSQL Row Level Security (RLS).
2. **7 Internal Staff Roles:** Center Manager, Branch Manager, Receptionist, Dentist / Doctor, Prosthetic Coordinator, Dental Lab Technician, and Delivery Logistics.
3. **Immutable Audit Logging:** Append-only security audit trail with database trigger enforcement.
4. **Progressive Web App (PWA):** Offline capability, installable on mobile and desktop.

### Phase 02: Patient Identity, Family/Guardian Accounts & Digital Card
1. **Organization-Scoped Patient Identity:** Shared medical record across all branches with sequential code (`PAT-XXXXXX`).
2. **Shared Family Mobile Numbers:** Allows multiple family members to share a single phone number without database conflicts.
3. **Cryptographic PIN Security:** Salted SHA-256 PIN hashing with anti-weak PIN rules and anti-enumeration privacy.
4. **Digital Patient Card & QR:** NFC/QR digital pass with opaque tokens (`eg_dcard_v1:...`) containing zero PII or medical data.
5. **Guardian & Ward Management:** Context-switching for authorized parents and wards with strict RLS enforcement.

### Phase 03: Reception Workspace, Scheduling, Service Catalog, Pricing & Insurance
1. **Reception Dashboard & Queue:** Branch-level appointment timetables, real-time waiting room board, and walk-in ticket management.
2. **Doctor Shift Scheduling:** Weekly shift configuration with slot availability and automated lunch break blackout.
3. **Service Catalog & Price List Versioning:** Standardized dental procedures across specialties with draft/published versioning and Excel bulk import validation.
4. **Insurance Resolution Engine:** Multi-tier pricing calculation across cash, contracted plans (copays, approvals), and non-contracted discounts.
5. **Insurance Card OCR Templates:** Visual card templates with bounding-box coordinate mappings for front-desk scanning.
6. **Custom Service Governance:** Manager review queue for ad-hoc procedures and conversion to standard catalog items.

### Phase 04: Doctor Clinical Workspace & Interactive Dental Chart
1. **Doctor Clinical Dashboard:** 8 real-time clinical KPIs, in-chair patient spotlight, waiting room queue with one-click *"Call to Chair"*, and doctor task checklists.
2. **Interactive Dental Chart:** Dual notation (**FDI 11–48** & **Universal 1–32**) adult 32-tooth arches with 5-surface mapping ($M, D, O, B, L$) and 13 clinical conditions.
3. **Multi-Phase Treatment Plans:** Structured clinical procedure sequencing linked directly to tooth numbers and surfaces with duration estimates in EGP.
4. **SOAP Visits & Anesthesia Tracking:** SOAP clinical documentation, materials tracking, and comprehensive local anesthesia logs (agent, carpules, vasoconstrictor, adverse reactions).
5. **Medical Alerts & Safety Safeguards:** High-visibility banner for critical allergies (e.g., Penicillin) and systemic health flags.
6. **Investigations & Specialist Referrals:** Diagnostic imaging orders (OPG, 3D CBCT, Periapical) and internal/external specialist routing.
7. **Egypt Dental Pharmacopeia Prescriptions:** Prescribing engine pre-loaded with standard Egyptian medications (Augmentin, Cataflam, Flagyl) and bilingual print format.
8. **Informed Consent & Follow-Up Recalls:** Pre-built surgical and endodontic consent forms with digital signatures, and structured post-op recall scheduling linked to reception task queues.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Server
```bash
npm run dev
```
The application will be running on `http://localhost:3000`.

### 3. Run Acceptance Tests
```bash
npm test
```
Or open the built-in interactive **Acceptance Test Runner** tab in the top navigation bar to execute all 33 automated tests in real time.

### 4. Production Build & Linting
```bash
npm run lint
npm run build
```

---

## Supabase Database Migrations

SQL migration files are located in `/supabase/migrations/`:
- `20260912000001_initial_dental_saas_schema.sql`: Phase 1 core schema, constraints, RLS helper functions, and policies.
- `20260912000002_seed_egypt_demo_data.sql`: Seed data for the Egyptian dental center, branches, roles, permissions, and staff accounts.
- `20260912000003_phase2_patient_identity.sql`: Phase 2 patient identity, family structures, and accounts.

To apply migrations to your Supabase project:
```bash
npx supabase db push
```

---

## Demo Accounts & Security Architecture

### ⚠️ Development / Demo Environment Only
The in-app role switcher (located in the bottom sidebar drawer) and the 1-click quick persona switcher on the sign-in screen are **strictly development/demo features**:
- **Omitted in Production:** Role switching is conditioned on `import.meta.env.DEV` and is completely stripped and unavailable in production builds (`npm run build`).
- **Demo Password Warning:** The default demo password (`dental123`) is strictly intended for local development testing and preview verification. **It must never be used in production environments.**
- **Zero Production Secrets:** No production credentials, database connection strings, or service secrets are hard-coded or exposed in the client bundle.

### 🔒 Production Authentication & Authorization
- **Server & RLS Enforced:** In production, user identities are verified through Supabase Auth (or the configured identity provider), and permissions are enforced directly at the database level by PostgreSQL Row Level Security (RLS) policies.
- **No Client Elevation:** Normal users can never mutate or switch their role from the UI. Permissions are strictly derived from the authenticated staff member's profile and database role mappings.

### Development Demo Staff Accounts (Egypt):
All 7 internal staff roles can be tested locally in development with password `dental123`:

- **Center Manager:** `manager@dental-demo.eg` (All Branches — Org-wide)
- **Branch Manager:** `bm.alex@dental-demo.eg` (Alexandria Branch)
- **Receptionist:** `reception.cairo@dental-demo.eg` (Cairo Branch)
- **Dentist:** `dr.karim@dental-demo.eg` (Cairo & Alexandria Branches)
- **Prosthetic Coordinator:** `lab.coord@dental-demo.eg` (Cairo Branch)
- **Lab Technician:** `tech.lab@dental-demo.eg` (Dental Lab)
- **Delivery Logistics:** `delivery@dental-demo.eg` (Logistics)

### Development Demo Patient Accounts (Egypt):
Pre-seeded for testing the Patient Portal and multi-profile guardian workflows:

- **Adult Guardian:** `+201000000001` • PIN: `7492` (Ahmed Mohamed — has 2 children: Laila & Omar)
- **Individual Adult:** `+201000000004` • PIN: `5829` (Mona Hassan — independent adult file)

---

## Detailed Implementation Documentation

For in-depth architectural breakdowns, database schema descriptions, security constraints, and acceptance test matrices, refer to:
- [`IMPLEMENTATION_NOTES_PHASE_01.md`](./IMPLEMENTATION_NOTES_PHASE_01.md) — Foundation, Tenancy, RBAC & Immutable Audit Logs
- [`IMPLEMENTATION_NOTES_PHASE_02.md`](./IMPLEMENTATION_NOTES_PHASE_02.md) — Patient Identity, Family/Guardian Models & Patient Portal Shell
- [`IMPLEMENTATION_NOTES_PHASE_03.md`](./IMPLEMENTATION_NOTES_PHASE_03.md) — Reception Workspace, Scheduling, Service Catalog, Pricing & Insurance
- [`IMPLEMENTATION_NOTES_PHASE_04.md`](./IMPLEMENTATION_NOTES_PHASE_04.md) — Doctor Clinical Workspace, Interactive Dental Chart, Treatment Plans, SOAP Visits & Prescriptions

