# Dental Clinic & Dental Center Management Platform — Egypt
## Phase 01 — Foundation

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

## Phase 1 Scope & Architecture

Phase 1 establishes the foundational infrastructure, security boundaries, and multi-tenant isolation:

1. **Multi-Tenant SaaS Foundation:**
   - Unified schema for single clinics (1 branch) and dental centers with multiple branches (Cairo, Alexandria, Giza).
   - PostgreSQL Row Level Security (RLS) guarantees complete tenant isolation.
2. **Internal Staff RBAC (7 Authorized Roles):**
   - **Center Manager** (Organization-wide access)
   - **Branch Manager** (Branch-scoped)
   - **Receptionist** (Branch-scoped)
   - **Dentist / Doctor** (Branch-scoped, multi-branch supported)
   - **Prosthetic Coordinator** (Dental lab & prosthetics coordination)
   - **Dental Lab Technician** (Fabrication workspace)
   - **Dental Delivery / Logistics** (Case transit & logistics)
3. **Immutable Audit Logging:**
   - Append-only audit trail protected by database triggers preventing `UPDATE` and `DELETE`.
4. **Egyptian Localization & Typography:**
   - Arabic RTL by default with Cairo and Tajawal fonts; English LTR toggle.
5. **Progressive Web App (PWA):**
   - Installable on desktop, Android, and iOS devices with offline support.
6. **Strict Phase 1 Boundaries:**
   - Excludes Patient Portals, Public Booking Engines, Billing/Invoicing, and AI integration (deferred to subsequent phases).

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
Executes the comprehensive Vitest acceptance test suite validating all 13 core Phase 1 acceptance criteria.

### 4. Production Build
```bash
npm run build
```

---

## Supabase Database Migrations

SQL migration files are located in `/supabase/migrations/`:
- `20260912000001_initial_dental_saas_schema.sql`: Core schema, constraints, RLS helper functions, and policies.
- `20260912000002_seed_egypt_demo_data.sql`: Seed data for the Egyptian dental center, branches, roles, permissions, and staff accounts.

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

## Documentation

For detailed architectural notes, RLS evaluation logic, security hardening, and acceptance test outcomes, refer to:
- [`IMPLEMENTATION_NOTES_PHASE_01.md`](./IMPLEMENTATION_NOTES_PHASE_01.md)
- [`IMPLEMENTATION_NOTES_PHASE_02.md`](./IMPLEMENTATION_NOTES_PHASE_02.md)
