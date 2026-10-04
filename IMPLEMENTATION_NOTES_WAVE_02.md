# Wave 02 Remediation & Production Implementation Notes: Advanced Prosthetics, Lab Operations, Inventory & Security Architecture

## Overview & Objectives

Wave 02 establishes an enterprise-grade, multi-tenant inventory management system, lab manufacturing workflow, prosthetic modification ledger, and trial fitting tracking engine across Egypt-based dental centers and branch networks. 

This remediation cycle audited and upgraded Wave 02 to strictly enforce production data persistence in Supabase PostgreSQL, enforce real Row Level Security (RLS) with branch-level isolation, eliminate sensitive browser `localStorage` usage, enforce server-derived identity and authorization, and implement PostgreSQL atomic locking for concurrent inventory stock mutations.

---

## 1. Zero Sensitive Local Storage Architecture

### Analysis & Remediation
- **Removal of Sensitive Local Persistence**: The production store for inventory items, stock movement transactions, supplier linkages, lab/material costs, prosthetic modification requests, and fitting records is strictly bound to Supabase PostgreSQL.
- **In-Memory Storage Engine**: `INVENTORY_STORAGE_KEYS` (`dental_saas_inventory_items`, `dental_saas_inventory_transactions`, `dental_saas_prosthetic_modifications`, `dental_saas_prosthetic_fittings`, `dental_saas_inventory_alert_logs`) are managed in an ephemeral `memoryStore` (Map) for client-side UI rendering.
- **Legacy Storage Purge**: Upon module initialization in `src/lib/inventoryStorage.ts`, any historical legacy keys residing in `window.localStorage` are automatically scrubbed via `localStorage.removeItem(...)`.
- **Search & Verification**: Project-wide search confirmed zero sensitive Wave 2 writes remain in `window.localStorage`.

---

## 2. Server Authorization & Identity Derivation

### Architecture
- **Server Identity Derivation**: All sensitive Wave 2 mutations and read queries validate authorization server-side via `validateWave2Authorization` in `src/lib/ai/serverAuth.ts`.
- **Forged Payload Rejection**: Client-provided parameters (`organization_id`, `branch_id`, `user_id`, `doctor_id`, `lab_id`, etc.) are never trusted. Identity, organization membership, and assigned branch scope are derived directly from the authenticated Bearer token / Supabase Auth session.
- **Organization Isolation**: Any request attempting to access or mutate resources outside the user's authenticated organization ID returns HTTP `403 Forbidden` (`Cross-organization access violation`).
- **Branch Scope Enforcement**: Non-center-manager staff users are restricted strictly to their assigned branch IDs (`assignedBranchIds`). Attempts to access unassigned branches return HTTP `403 Forbidden` (`Unauthorized branch scope access`).

---

## 3. Real Row Level Security (RLS) & Migration 20260912000013

### Database Migration
The database migration `supabase/migrations/20260912000013_wave2_remediation_branch_rls_concurrency.sql` updates the Wave 2 schema with real Row Level Security (RLS) policies and stored procedures.

### RLS Helper Function
`public.fn_auth_user_has_branch_access(p_org_id UUID, p_branch_id UUID)` checks both organization membership and branch assignment for `auth.uid()`. `center_manager` role has organization-wide access; branch-level staff require matching branch IDs.

### Table Policies
1. **`inventory_items`**: Enforces branch isolation via `fn_auth_user_has_branch_access`. Denies patient/guardian roles. Restricts writes to non-lab/delivery staff.
2. **`inventory_transactions`**: Enforces branch isolation via `fn_auth_user_has_branch_access`. Denies patient/guardian access.
3. **`prosthetic_modification_requests`**: Enforces branch isolation and excludes patient/guardian access.
4. **`prosthetic_fitting_records`**: Enforces branch isolation and excludes patient/guardian access.
5. **`lab_material_costs`**: Enforces branch isolation. Explicitly excludes patient, guardian, lab user, and delivery courier roles from accessing internal cost structures.

---

## 4. Role Scope & Isolation (Lab Users, Delivery Users, Patients)

- **Lab Users (`lab_user`)**: Restricted to lab orders, manufacturing stages, modification requests, and trial fitting notes for assigned branch orders. Excluded from viewing full patient medical charts, billing invoices, or supplier unit costs.
- **Delivery Users (`delivery_user`)**: Restricted to courier delivery tracking and QR verification. Excluded from medical chart, financial invoice, or supplier cost access.
- **Patients & Guardians**: Patient portal renders prosthetic stage progress (e.g., `in_production`, `in_transit`, `fitted`) without exposing internal supplier costs, material costs, or stock ledgers.

---

## 5. Concurrency Control & Stock Integrity

### PostgreSQL Stored Procedure `mutate_inventory_stock`
1. **Row-Level Locking (`FOR UPDATE`)**: Queries source `inventory_items` row with `FOR UPDATE`, serializing concurrent stock mutations in PostgreSQL.
2. **Non-Negative Stock Constraint**: Evaluates `v_new_qty = current_quantity ± requested_quantity`. If `v_new_qty < 0`, raises an exception immediately.
3. **Atomic Dual-Ledger Insertion**: For inter-branch transfers, deducts stock from source item, locks/creates destination branch item, and inserts corresponding ledger entries for both branches in a single transaction.
4. **Atomic Rollback**: Any error or overdraft condition aborts the PostgreSQL transaction, leaving stock quantities and ledger entries completely untouched.
5. **Client Engine Concurrency Queue**: `runAtomicInventoryOperation` in `src/lib/inventoryStorage.ts` provides an in-memory async mutex queue for client-side serialization during concurrent requests.

---

## 6. Verification & Test Suite Summary

- **Total Tests Passed**: 321 tests passed across 33 test files (0 failures).
- **TypeScript Compilation**: `npm run lint` (`tsc --noEmit`) passed with 0 errors.
- **Applet Compilation & Build**: `npm run build` completed successfully.
- **Preview Visual Verification**: Verified Inventory Management, Stock Receipts, Inter-Branch Transfers, Lab Workspace, Delivery Workspace, and Fitting Modals in live preview environment.
