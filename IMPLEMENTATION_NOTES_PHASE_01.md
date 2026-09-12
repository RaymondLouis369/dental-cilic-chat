# Phase 01 — Implementation Notes
## Dental Clinic & Dental Center Management Platform — Egypt

**Project Identity:** Dental Clinic & Dental Center Management Platform — Egypt  
**Phase:** Phase 01 — Foundation Only  
**Target Market:** Egypt  
**Default Currency:** EGP (Egyptian Pound)  
**Default Timezone:** Africa/Cairo  
**Default Dialing Code:** +20  
**Default Language & Layout:** Arabic (RTL) with full English (LTR) toggle support  

---

## 1. Architectural Overview

The platform is designed from day one as a cloud-native, multi-tenant Software-as-a-Service (SaaS) application supporting two operational modes under a single unified schema:
1. **Single Dental Clinic:** One organization with a single branch.
2. **Dental Center with Multiple Branches:** One organization with multiple physical branches distributed across Egyptian governorates (e.g., Cairo, Alexandria, Giza).

### Core Tenancy Model
Tenancy is strictly anchored to the `organizations` entity. Every database table containing tenant data enforces an immutable `organization_id` foreign key. Multi-tenant data segregation is handled at the database engine level via PostgreSQL Row Level Security (RLS), guaranteeing that application-layer flaws or queries cannot accidentally leak data across organizations.

---

## 2. Database Schema & RLS Policies

All database tables are created in Supabase / PostgreSQL migrations located in `/supabase/migrations/`:
- `20260912000001_initial_dental_saas_schema.sql` (Tables, Foreign Keys, Indexes, Helper Functions, Triggers, and RLS Policies)
- `20260912000002_seed_egypt_demo_data.sql` (Initial Seed Data for Egyptian Dental Center, 3 Branches, 7 Roles, 14 Permissions, and Staff Accounts)

### Tables Defined:
1. **`organizations`**: Stores clinic/center tenants (Country: Egypt, Currency: EGP, Timezone: Africa/Cairo, Language: ar).
2. **`branches`**: Physical dental clinics/branches belonging to an organization.
3. **`roles`**: System roles with `is_org_wide` flags.
4. **`permissions`**: Granular capability keys categorized by domain (`organization.*`, `branch.*`, `user.*`, `permission.*`, `audit.*`, `patient.*`).
5. **`role_permissions`**: Mapping table binding permissions to roles.
6. **`profiles`**: Internal staff profiles linked to authentication users, role, and tenant organization.
7. **`user_branch_scopes`**: Explicit mapping between staff members and the specific branches they are authorized to access.
8. **`audit_logs`**: Append-only security audit log recording actors, actions, timestamps, and metadata.

### RLS Helper Functions & Security Policies:
- **`current_user_org_id()`**: Securely retrieves the calling user's `organization_id` from their profile via `auth.uid()`.
- **`is_org_wide_manager()`**: Evaluates whether the calling user holds a role with `is_org_wide = true` (specifically `center_manager`).
- **`has_branch_access(target_branch_id)`**: Checks whether the calling user is an org-wide manager or has an active entry in `user_branch_scopes` for the specified branch.

### Key RLS Policies:
- `organizations_select`: Users can ONLY read their own organization record (`id = current_user_org_id()`).
- `branches_select_isolated`: Users can ONLY view branches in their organization that match `has_branch_access(id)`. Center managers see all branches; branch-scoped staff see only their assigned locations.
- `branches_insert_policy`: Only staff with `branch.create` permission can provision branches.
- `profiles_select_isolated`: Staff can only see colleagues belonging to the same organization.

---

## 3. The 7 Authorized Internal Roles & Scopes

The Phase 1 foundation defines and seeds all 7 required internal Egyptian healthcare roles:

| Role Key | Role Name (AR / EN) | Scope | Key Permissions |
| :--- | :--- | :--- | :--- |
| `center_manager` | مدير المركز / Center Manager | Organization-wide | Full administrative control, organization settings, branch provisioning, staff management, audit log access |
| `branch_manager` | مدير الفرع / Branch Manager | Branch-scoped | Branch operations, staff directory in assigned branch, operations scheduling |
| `receptionist` | موظف الاستقبال / Receptionist | Branch-scoped | Patient intake readiness, branch appointments check-in (Phase 2 placeholder) |
| `doctor` | طبيب أسنان / Dentist | Branch-scoped (multi-branch supported) | Patient clinical records, dental diagnoses (Phase 2 placeholder) |
| `prosthetic_coordinator` | منسق تركيبات ومعامل / Prosthetic Coordinator | Branch-scoped | Dental lab work order tracking, case dispatch coordination |
| `lab_user` | فني معمل أسنان / Lab Technician | Organization / Lab scoped | Dental laboratory case fabrication, quality check |
| `delivery_user` | مندوب تسليم وتوصيل / Delivery Logistics | Organization / Route scoped | Dental prosthetic dispatch transit, clinic pickup/delivery |

---

## 4. Immutable Audit Log Architecture

The platform enforces an **append-only** audit log constraint:
- **Database Trigger**: `trg_audit_logs_immutable` executes `enforce_audit_log_immutability()` on `BEFORE UPDATE OR DELETE`.
- **Exception Raised**: Any SQL query attempting to `UPDATE` or `DELETE` records from `audit_logs` raises PostgreSQL exception `P0001: Audit logs are immutable`.
- **Logged Events**:
  - `auth.login.success` / `auth.login.failure`
  - `auth.logout`
  - `organization.update`
  - `branch.create` / `branch.update`
  - `user.create` / `user.update`

---

## 5. Egyptian Localization

- **Country**: Egypt (جمهورية مصر العربية)
- **Official Currency**: Egyptian Pound (`EGP` / `ج.م`)
- **Timezone**: `Africa/Cairo` (EET / EEST)
- **International Dialing Code**: `+20`
- **Egyptian Governorates**: Cairo (Maadi, Nasr City), Alexandria (Smouha), Giza (Dokki), Gharbia (Tanta), Mansoura.
- **Bi-directional Typography**:
  - Arabic (default): Cairo & Tajawal font families, `dir="rtl"`, tailored dental Arabic terminology.
  - English: Inter font family, `dir="ltr"`.

---

## 6. PWA Integration

The application complies with Progressive Web App standards:
- **Manifest**: Located at `/public/manifest.webmanifest` with `display: "standalone"`, dental theme color `#0d9488` (Teal), and high-resolution icons (192x192, 512x512).
- **Service Worker**: Configured via `vite-plugin-pwa` with `registerType: 'autoUpdate'`.
- **In-App Installation**: Custom `PWAInstallButton` supporting Android/Desktop standard prompts and iOS Safari installation guidance.
- **Offline Indicator**: `OfflineIndicator` notifies users when network connectivity is disrupted.

---

## 7. Security Hardening & Demo Role Switching Isolation

As part of the final Phase 1 security verification, the application enforces strict boundaries between development/testing demo capabilities and production security:

1. **Development-Only In-App Role Switcher:**
   - The role-switching UI control (in `Sidebar.tsx`) and the 1-click staff persona selector (in `LoginForm.tsx`) are strictly compiled behind `import.meta.env.DEV`.
   - In production builds (`npm run build`), Vite/esbuild performs dead-code elimination, completely stripping these controls from the bundle.
   - The underlying `switchDemoRole` function in `AuthContext.tsx` explicitly halts and emits a security error if invoked outside development environments.

2. **Demo Password & Credentials Isolation:**
   - Demo accounts and the default test password (`dental123`) exist exclusively for local and preview testing.
   - In production mode, any attempt to authenticate with demo accounts (`@dental-demo.eg`) or demo passwords is automatically blocked with an audit security event.
   - Zero production secrets or credentials are hard-coded or exposed in client bundles.

3. **Server-Side & Database RLS Authorization:**
   - Frontend navigation filters are cosmetic conveniences; true authorization is enforced by PostgreSQL Row Level Security (RLS) policies (`branches_select_isolated`, `org_read_isolated`, `profiles_select_same_org`).
   - Normal users cannot elevate their role or access unassigned branches by altering frontend state.

---

## 8. Acceptance Test Results (14 Criteria)

All 14 acceptance tests execute automatically with **100% pass rate** via Vitest (`npm test`) and are also verifiable live inside the running application:

1. **Test 1 — Organization multi-tenancy isolation via RLS**: PASS (Foreign org branches blocked at database level)
2. **Test 2 — Single clinic vs. Multi-branch center support**: PASS (Unified model handles 1 branch or N branches)
3. **Test 3 — Branch-level RLS isolation restricts single-branch user**: PASS (Receptionist sees only Cairo branch)
4. **Test 4 — Multi-branch user assignment**: PASS (Doctor accesses Cairo + Alexandria, denied Giza)
5. **Test 5 — Center Manager org-wide bypass**: PASS (Center manager accesses all branches without manual scope rows)
6. **Test 6 — Role & Permission registry completeness**: PASS (All 7 roles registered, granular checks verified)
7. **Test 7 — Internal staff auth & credential validation**: PASS (Authentication succeeds/fails; audit logged)
8. **Test 8 — Strict Phase 1 boundaries**: PASS (No patient portal, billing, or external booking)
9. **Test 9 — Immutable audit log**: PASS (UPDATE and DELETE operations strictly rejected by trigger)
10. **Test 10 — Egypt localization defaults**: PASS (Egypt, EGP, Africa/Cairo, +20 verified)
11. **Test 11 — Bi-directional RTL / LTR support**: PASS (Arabic RTL and English LTR layouts validated)
12. **Test 12 — PWA manifest & service worker compliance**: PASS (PWA assets and offline indicator confirmed)
13. **Test 13 — Clean build & TypeScript types**: PASS (Clean compilation with zero type discrepancies)
14. **Test 14 — Demo Auth & Role Switcher Security Hardening**: PASS (No credentials in bundle, role switching dev-only, RLS enforced)

---

## 9. Phase 1 Boundary Compliance Checklist

- [x] **No Patient Portal**: Patient self-registration and public login routes are strictly excluded.
- [x] **No Public Booking**: Public appointment booking engines are strictly excluded.
- [x] **No Billing Engine**: Invoices, payment gateways, and insurance claims are strictly deferred to Phase 3.
- [x] **No Gemini / AI Modules**: AI diagnostics and automation are deferred to subsequent phases.
- [x] **No Saudi Terminology / Data**: All data, branches, phone numbers, and currencies are strictly Egyptian.
- [x] **No Role Switching in Production**: In-app role switcher is strictly dev-only and omitted from production builds.
- [x] **No Hard-coded Production Credentials**: Passwords and secrets are never in the client bundle.
