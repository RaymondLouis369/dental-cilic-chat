# IMPLEMENTATION NOTES — PHASE 02: PATIENT IDENTITY & PATIENT PORTAL

**Project:** Dental Clinic & Dental Center Management Platform — Egypt  
**Phase:** Phase 02 (Patient Identity, Family/Guardian Relationships & Patient Portal Shell)  
**Status:** Completed & Verified  

---

## 1. Architectural Principles & Scope Enforcement

Phase 02 builds upon the hardened Phase 01 multi-tenant SaaS foundation to implement **Patient Identity** and the **Patient Portal Shell** for single dental clinics and multi-branch dental centers across Egypt:

- **Organization-Scoped Identity:** Patient records are anchored directly to the `organization_id`, never scoped to a single branch. A patient registered in Maadi (Cairo) has an identical medical file valid if they visit Alexandria or Giza.
- **Stable Sequential Patient Code:** Patients are identified by a human-friendly code in the format `PAT-XXXXXX` (zero-padded 6 digits, e.g. `PAT-000001`), generated sequentially per organization.
- **Mobile Number as Contact/Login, NOT Unique Key:** Egyptian families frequently share a single mobile number between parents and young children. The system allows multiple patient records to share the same mobile phone without database unique key collisions.
- **Strict Separation of Login Identity and Active Context:** An authenticated guardian logs in with their credentials, but the active viewing context is maintained as a separate session variable.
- **No Phase Bleed:** Phase 02 strictly avoids implementing medical records, appointment booking engines, billing/invoicing, or clinical treatment plans (deferred to subsequent phases).

---

## 2. Database Schema (`supabase/migrations/20260912000003_phase2_patient_identity.sql`)

### Tables Implemented:
1. **`patients`**: Core patient demographic record (UUID primary key, `organization_id`, `patient_code`, Arabic & English names, DOB, gender, mobile numbers, preferred language).
2. **`families`**: Family cluster grouping managed at the organization level.
3. **`family_members`**: Links patients to families with designated roles (`head`, `spouse`, `child`, `dependent`).
4. **`guardian_relationships`**: Explicit legal and parental guardianship records connecting `guardian_patient_id` to `ward_patient_id`, with active status and verification timestamps.
5. **`patient_accounts`**: Patient login credentials containing `mobile_number`, `pin_salt`, `pin_hash` (SHA-256), failed attempts counter, and lockout status.
6. **`patient_cards`**: Digital patient cards linking `patient_id` to an opaque `qr_token` and card number.

### Row Level Security (RLS) Policies:
- Patients and guardians can only read and update records where `id = auth.uid()` OR `id IN (SELECT ward_patient_id FROM guardian_relationships WHERE guardian_patient_id = auth.uid())`.
- Cross-tenant access is strictly blocked (`organization_id = current_setting(...)`).
- Internal staff with `patient.read` permissions can access patient files within their organization.

---

## 3. Cryptography & Security Primitives (`src/modules/patient-portal/utils/pinSecurity.ts`)

- **Salted SHA-256 PIN Hashing:** Fixed 4-to-6 digit PINs are cryptographically hashed using a cryptographically random salt. No plaintext PIN is ever stored in the database or client storage.
- **Strict Anti-Weak PIN Rules:**
  - Rejection of sequential sequences (`1234`, `4321`, `0123`).
  - Rejection of repeated digits (`1111`, `9999`).
  - Rejection of substrings derived from the patient's mobile number.
  - Rejection of substrings matching the patient's birth year or patient code.
- **Anti-Enumeration Forgot PIN:** The PIN recovery mechanism dispatches a uniform generic confirmation message regardless of whether the mobile number exists, preventing brute-force account enumeration.
- **Opaque QR Code Token:** Digital patient cards encode a cryptographically random, opaque reference (`eg_dcard_v1:<hex>`). The QR code payload contains **zero PII, zero national ID numbers, zero medical records, and zero plain PINs**.

---

## 4. Patient Portal Shell & UI Components

1. **`PatientPortalShell.tsx`**: High-performance responsive navigation shell featuring desktop sidebar/tabs, mobile bottom navigation, active profile indicator, and language switcher.
2. **`DigitalPatientCard.tsx`**: NFC/QR digital membership card displaying clinic branding, patient code, bilingual names, and dynamic high-contrast QR code.
3. **`FamilyView.tsx`**: Family and ward management screen allowing guardians to switch active profile contexts and view linked dependents.
4. **`ProfileChooserModal.tsx`**: Profile switcher modal allowing guardians to switch between their own profile and authorized dependents.
5. **`PatientProfile.tsx`**: Self-service profile management for allowed contact details (secondary mobile, email, language preference) while locking critical clinical identifiers.
6. **`PatientLogin.tsx` & `ForgotPinModal.tsx`**: Streamlined Egyptian mobile (+20) and fixed PIN login with reset flows.

---

## 5. Acceptance Criteria Verification Matrix

All 23 automated acceptance tests (Phase 1 + Phase 2) pass:

| Test ID | Area | Verification Description | Result |
|---|---|---|---|
| **Test 1–14** | Phase 1 Foundation | Multi-tenant RLS, 7 internal roles, Cairo/Alex/Giza branch scopes, demo security hardening | **PASS** |
| **Test 15** | Patient Identity | Organization-scoped patient files valid across all branches without branch lock | **PASS** |
| **Test 16** | Code Generation | Sequential human-friendly code format `PAT-XXXXXX` (zero-padded 6 digits) | **PASS** |
| **Test 17** | Shared Mobile | Same mobile (`+201000000001`) safely shared by guardian and wards without collision | **PASS** |
| **Test 18** | PIN Security | Fixed PIN salted SHA-256 hashing; verified zero plaintext PIN storage | **PASS** |
| **Test 19** | PIN Strength | Strict rejection of sequences, repeated digits, mobile derivations, and birth years | **PASS** |
| **Test 20** | Forgot PIN | Anti-enumeration privacy with uniform generic response for existing/non-existing accounts | **PASS** |
| **Test 21** | Digital Card & QR | Opaque token format (`eg_dcard_v1:...`); zero medical data, national ID, or PII in QR | **PASS** |
| **Test 22** | RLS Profile Switching | Guardian authorized for registered wards; attempts to access foreign adult strictly blocked | **PASS** |
| **Test 23** | Audit Logging | Immutable audit logging of patient authentication, profile switching, and card events | **PASS** |
