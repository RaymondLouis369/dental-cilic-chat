# Dental Clinic & Dental Center Management Platform — Egypt
## Phases 01–08: Foundation, Identity, Operations, Clinical, Insurance, Consents, Lab QR Logistics, Billing, Commissions, Supplier Management & Manager Financial Dashboard

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
1. **Reception Dashboard & Real-Time Operations Summary:** Branch-level appointment timetables, real-time waiting room board, walk-in ticket management, and real-time operational summary cards (`Pending Appointments`, `Active Investigations`, `Referrals Pending`, `In-Clinic Patients`).
2. **Doctor Shift Scheduling:** Weekly shift configuration with slot availability and automated lunch break blackout.
3. **Dual-Tabbed Service Catalog & Price List Management:** Clean cash and insurance tariff tabs with step-by-step Excel bulk import workflow (Download → Upload → Validate → Preview → Publish Version).
4. **Insurance Plan Cards & Approval Status Badges:** Intuitive card-based scope selection for coverage plans (e.g., Gold 80%, Platinum 85%) and explicit status badging for procedures requiring medical pre-approval (`Requires Approval` vs `Direct Coverage`).
5. **Insurance Resolution Engine:** Multi-tier pricing calculation across cash, contracted plans (copays, approvals), and non-contracted discounts.
6. **Insurance Card OCR Templates:** Visual card templates with bounding-box coordinate mappings for front-desk scanning.
7. **Custom Service Governance:** Manager review queue for ad-hoc procedures and conversion to standard catalog items.

### Phase 04: Doctor Clinical Workspace & Interactive Dental Chart
1. **Doctor Clinical Dashboard:** 8 real-time clinical KPIs, in-chair patient spotlight, waiting room queue with one-click *"Call to Chair"*, and doctor task checklists.
2. **Interactive Dental Chart:** Dual notation (**FDI 11–48** & **Universal 1–32**) adult 32-tooth arches with 5-surface mapping ($M, D, O, B, L$) and 13 clinical conditions.
3. **Multi-Phase Treatment Plans:** Structured clinical procedure sequencing linked directly to tooth numbers and surfaces with duration estimates in EGP.
4. **SOAP Visits & Anesthesia Tracking:** SOAP clinical documentation, materials tracking, and comprehensive local anesthesia logs (agent, carpules, vasoconstrictor, adverse reactions).
5. **Medical Alerts & Safety Safeguards:** High-visibility banner for critical allergies (e.g., Penicillin) and systemic health flags.
6. **Investigations & Specialist Referrals:** Diagnostic imaging orders (OPG, 3D CBCT, Periapical) and internal/external specialist routing.
7. **Egypt Dental Pharmacopeia Prescriptions:** Prescribing engine pre-loaded with standard Egyptian medications (Augmentin, Cataflam, Flagyl) and bilingual print format.
8. **Informed Consent & Follow-Up Recalls:** Pre-built surgical and endodontic consent forms with digital signatures, and structured post-op recall scheduling linked to reception task queues.

### Phase 05: Insurance Approval Tracker, Digital Consents & Patient Portal Enhancements
1. **Treatment Plan Insurance Approval Tracker:** Real-time visual tracking component (`TreatmentPlanApprovalTracker.tsx`) calculating pending approvals, approved coverage percentages, rejections, and direct insurance coverage vs. patient copay breakdowns.
2. **Insurance Approval Status Badges & Override Audits:** `InsuranceApprovalStatusBadge` component with pre-approval warnings, status pills, and staff `OVR` badges containing manual override audit tooltips.
3. **Digital Consent Signature Engine:** Interactive touch/mouse drawing signature pad (`ConsentSignModal.tsx`) supporting bilingual legal terms in Arabic and English for high-risk procedures (Surgical Extractions, Endodontics, Implants).
4. **Patient Portal Profile Dropdown & Quick Tools:** `PatientPortalProfileDropdown.tsx` providing direct access to patient digital passes, policy numbers, language switcher, and account settings.
5. **Patient Portal Family Account Linking:** `PatientPortalFamilyLink.tsx` allowing primary account holders to link, switch context, and manage health records for dependents under a single portal login.
6. **Dynamic Procedure Category Filtering:** Specialty procedure picker categorized into General Dentistry, Endodontics, Periodontics, Orthodontics, Prosthodontics, Oral Surgery, Pediatric Dentistry, and Cosmetics.
7. **Automated Reception Recall Handoffs:** Automatic generation of front-desk action items for insurance approval follow-ups, post-op 24h/7d recall calls, and consent signature collection.

### Phase 06: Dental Lab Order Management, QR Logistics, Dispatch Tracking & Technical Chat
1. **Lab Order Creation & Treatment Plan Integration:** Order creation modal linked to treatment plans with configurable FDI teeth selection, manufacturing specs (material, framework, stage try-in/final, pontic design, abutment type, product type), and STL/PLY/photo attachment references.
2. **Vector QR Code Engine & Printable Shipping Tag (`labQrUtils.ts`, `LabOrderQrModal`):** Deterministic 21x21 QR code matrix generation algorithm and crisp `QrCodeSvg` vector component encoding standardized order tracking payloads (`LAB-ORD-{id}`), with print-ready physical shipping tags and dispatch vouchers.
3. **Real-Time Camera & Barcode QR Scanner (`LabOrderScannerModal`):** Live video feed frame decoding via `jsQR` with viewfinder overlays, camera switcher (`environment` / `user`), audio scan chimes, and instant status updates to Delivered / Received at Desk.
4. **Lab Order Management Dashboard (`LabOrderManagementDashboard.tsx`):** Central operational dashboard with multi-criteria search (patient code/name, order ID) and filtering by status, date range toggle (Order vs. Delivery Date), specialty category, and external lab vendor.
5. **Lab & Courier Workspaces (`LabUserWorkspace`, `DeliveryUserWorkspace`):** Dedicated workstations for lab technicians to manage production stages and courier drivers to track transport statuses (`pending_pickup`, `in_transit`, `delivered_to_lab`, `delivered_to_clinic`, `returned`) with strict patient data privacy safeguards.
6. **Product / Lab Order Technical Chat (`LabOrderChatModal`):** Order-bound technical chat interface with topic categorization (**Shade**, **Material**, **Design**, **Teeth**, **Try-in / Final**, **Modification**, **Delivery**), unread message badges, RBAC chat authorization, and `organization_id` / `branch_id` tenant isolation.

### Phase 07: Reception & Billing, Invoicing, Doctor Commissions, Lab/Material Costs & Implant Cost Allocation
1. **Bilingual Invoice Generation & Patient Copay Split:** Itemized invoices generated from treatment plans or ad-hoc procedures with cash, insurance copay, tax, and discount breakdown in EGP (`ج.م`).
2. **Payment Processing Modal (`PaymentModal.tsx`):** Multimodal payment processing (Cash, Credit Card, Bank Transfer, Direct Insurance) with remaining balance calculations and automatic status updates.
3. **Doctor Commission Rules Engine:** Flexible rule configuration per doctor or service with `gross`, `net_after_costs`, or `net_after_lab` bases and frozen transaction history preservation.
4. **Direct Lab & Material Costs Log (`CommissionCostManagementModal.tsx`):** Direct logging of external laboratory fees and clinical consumables with supplier/vendor tracking.
5. **Implant Cost Allocation (Phase 7.4):** Itemized tracking across 10 implant component categories (`implant`, `bone_graft`, `membrane`, `healing_abutment`, `cover_screw`, `healing_cap`, `abutment`, `scan_body`, `prosthetic_screw`, `other_accessories`) with planned vs. actual quantities, unit costs, actual consumed cost overrides, and automatic synchronization with `LabMaterialCostRecord`.
6. **Clinic Net Profit Calculation:** Automated calculation of net revenue after deducting lab fees, material costs, and doctor commissions:
   $$\text{Clinic Net Amount} = \text{Patient Amount} - \text{Lab Cost} - \text{Total Material Cost} - \text{Doctor Commission}$$

### Phase 08: Supplier Management, Service Configuration & Manager Financial Dashboard
1. **Supplier / Vendor Management (Phase 8.1):** Centralized vendor registry (`SupplierManagementView.tsx`) supporting Egyptian dental categories (Dental Labs, Implant Suppliers, Dental Materials, Medical Supplies, Other) with bilingual search, category filters, and manager RBAC.
2. **Service Catalog & Configuration (Phase 8.2):** Enterprise dental procedure catalog (`ServiceCatalogView.tsx`) with category management, default supplier linkage, active/inactive lifecycle controls, and real-time cash tariff & insurance plan links.
3. **Manager Financial Dashboard & Operational Analytics (Phase 8.3):** Executive dashboard (`DashboardPlaceholder.tsx`) featuring revenue KPIs (Gross Invoiced, Insurance Covered, Patient Copay, Total Collected, Outstanding Balances), doctor commissions, lab fees, material expenses, implant component costs, and net clinic profit calculation.
4. **Operational Pending Queues & Appointment Summary:** Real-time operational queues for pending insurance pre-approvals, pending lab orders, and reception tasks, alongside appointment metric summaries.
5. **Multi-Filter Dashboard Controls & CSV Export:** Interactive filters by Branch, Doctor, Service Category, Service, Insurance Company, Time Period, Payment Status, and Payer Type, with one-click UTF-8 BOM CSV financial report export.
6. **Multi-Tenant Isolation & Manager RBAC:** Strict `organization_id` and `branch_id` scoping with role-gated administrative write operations for Center Managers and Branch Managers.

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

### 3. Run Acceptance & Unit Tests
```bash
npm test
```
Executes all 119 automated tests across 18 test suites. Or open the built-in interactive **Acceptance Test Runner** tab in the top navigation bar.

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
- [`IMPLEMENTATION_NOTES_PHASE_05.md`](./IMPLEMENTATION_NOTES_PHASE_05.md) — Insurance Approval Tracker, Digital Consents & Patient Portal Enhancements
- [`IMPLEMENTATION_NOTES_PHASE_06.md`](./IMPLEMENTATION_NOTES_PHASE_06.md) — Dental Lab Order Management, QR Logistics, Dispatch Tracking & Technical Chat
- [`IMPLEMENTATION_NOTES_PHASE_07.md`](./IMPLEMENTATION_NOTES_PHASE_07.md) — Reception & Billing, Invoicing, Doctor Commissions, Lab/Material Costs & Implant Cost Allocation
- [`IMPLEMENTATION_NOTES_PHASE_08_1.md`](./IMPLEMENTATION_NOTES_PHASE_08_1.md) — Supplier / Vendor Management & Egyptian Dental Categorization
- [`IMPLEMENTATION_NOTES_PHASE_08.md`](./IMPLEMENTATION_NOTES_PHASE_08.md) — Manager Dashboard, Service Configuration, Supplier Management & Financial Analytics
- [`IMPLEMENTATION_NOTES_PHASE_09_1.md`](./IMPLEMENTATION_NOTES_PHASE_09_1.md) — Centralized Notifications Foundation, Multi-Role & Event Triggers

