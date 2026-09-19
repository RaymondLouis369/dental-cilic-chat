# Phase 8.1 Implementation Notes: Supplier / Vendor Management

## Executive Overview
Phase 8.1 introduces a structured, centralized **Supplier / Vendor Management System** for the **Dental Clinic & Dental Center Management Platform — Egypt**. This system replaces unstructured vendor strings with a domain-specific vendor registry supporting categorizations tailored to Egyptian dental healthcare centers (Dental Labs, Implant Suppliers, Dental Materials, Medical Supplies, and Other).

All supplier operations adhere strictly to multi-tenant isolation rules, server-side `organization_id` enforcement, and Role-Based Access Control (RBAC) restricting vendor management to **Center Managers** and **Branch Managers**.

---

## Key Capabilities & Technical Features

### 1. Domain Data Model & Types (`src/types/receptionAndBilling.ts`)
The `Supplier` entity captures complete vendor details:
- **`id`**: Unique primary key identifier (`sup_...`).
- **`organization_id`**: Required multi-tenant organization foreign key.
- **`name_ar`**: Vendor name in Arabic (e.g., `معمل النيل لتركيبات الأسنان`).
- **`name_en`**: Vendor name in English (e.g., `Nile Dental Laboratory`).
- **`type`**: `SupplierType` enum:
  - `dental_lab`: Dental prosthetics & ceramics laboratory.
  - `implant_supplier`: Implant systems, fixtures, bone grafts, and membranes.
  - `dental_materials`: Composites, impression materials, and clinic consumables.
  - `medical_supplies`: Sterilization units, PPE, and general medical equipment.
  - `other`: Miscellaneous vendors and services.
- **`phone`**: Primary contact telephone number (`+20` / `01...`).
- **`notes`**: Textual notes, warranty details, or address information.
- **`active`**: Boolean flag indicating operational status (`true` / `false`).
- **`created_at` & `updated_at`**: Standard ISO timestamps.

### 2. Multi-Tenant Storage & Protection Engine (`src/lib/receptionAndBillingStorage.ts`)
- **`getStoredSuppliers(organizationId?: string)`**:
  - Automatically loads pre-seeded vendors for Egyptian dental centers if local cache is uninitialized.
  - Filters strictly by `organization_id` when an organization ID is provided.
  - Never exposes foreign organization suppliers to unauthorized tenants.
- **`upsertSupplier(supplierData, actorUserId, actorRole)`**:
  - Enforces `organization_id` association.
  - Validates that either `name_ar` or `name_en` is provided.
  - Verifies RBAC authorization (`center_manager`, `branch_manager`, `admin`, `super_admin`).
  - Rejects write attempts from unauthorized staff (e.g., `receptionist`, `doctor`) with explicit error messages.
- **`toggleSupplierActive(id, active, actorUserId, actorRole, organizationId)`**:
  - Activates or deactivates supplier records.
  - Verifies target supplier belongs to the caller's `organization_id` to block cross-organization tampering.

### 3. User Interface Component (`src/modules/suppliers/SupplierManagementView.tsx`)
- **Bilingual Layout**: Full support for Arabic (RTL) and English (LTR).
- **KPI Summary Cards**:
  - Total Suppliers Count.
  - Dental Labs Count.
  - Implant Suppliers Count.
  - Active Vendors Count.
- **Search & Multi-Filter Controls**:
  - Real-time search by Arabic name, English name, phone number, or notes.
  - Category filter pills (`All`, `Dental Labs`, `Implant Suppliers`, `Dental Materials`, `Medical Supplies`, `Other`).
  - Active/Inactive status selector.
- **Role-Gated Actions**:
  - Add Supplier Modal & Edit Supplier Modal.
  - Direct Active/Inactive toggle button with visual feedback.
  - Non-manager staff (Receptionists, Doctors) receive a clear RBAC notification banner explaining that supplier modification is restricted to clinic managers.

### 4. Navigation & Workspace Integration (`Sidebar.tsx`, `App.tsx`, `translations.ts`)
- Added `suppliers` (`إدارة الموردين والشركات`) tab to the main sidebar navigation for Center Managers and Branch Managers.
- Rendered `SupplierManagementView` within `App.tsx` routing.

---

## Acceptance Tests & Verification (`AcceptanceTestRunner.tsx`)

Three dedicated automated acceptance tests verify Phase 8.1 implementation:

1. **Test 34: Supplier Data Model & Organization Isolation**
   - Verifies default seed supplier loading for the Egyptian organization.
   - Confirms strict 0-supplier query result for foreign tenant organizations.
2. **Test 35: Supplier CRUD & Strict RBAC Enforcement**
   - Verifies supplier creation and update operations by `center_manager`.
   - Confirms write rejection and error message when attempted by `receptionist`.
3. **Test 36: Supplier Active Status Toggle & Cross-Org Guard**
   - Verifies toggling supplier active status.
   - Confirms cross-organization active state modification is strictly blocked.

---

## Security & Compliance
- **Server-Side Tenant Validation**: Browser-supplied `organization_id` values are never trusted without backend validation.
- **RBAC Financial Guardrails**: Receptionists and Doctors cannot modify vendor definitions or financial supplier settings.
