# Wave 01 Implementation Notes: Patient Finance, Prepaid Wallet, Loyalty Rewards, Insurance Prior Approvals & Claims/Settlement Workflows

## Overview & Objectives

Wave 01 establishes a unified, multi-tenant financial and insurance engine across patient, reception, and management interfaces. The implementation reuses all pre-existing financial and insurance infrastructure from Phases 1–11.5 without duplicating or altering existing invoice items, cash/insurance pricing rules, doctor commission calculations, or lab/implant cost allocations.

The workflow spans:
**Treatment/Service $\rightarrow$ Price Resolution $\rightarrow$ Invoice $\rightarrow$ Payment $\rightarrow$ Balance Breakdown $\rightarrow$ Prepaid Wallet / Loyalty Rewards $\rightarrow$ Insurance Pre-Approval / Claim $\rightarrow$ Settlement Posting $\rightarrow$ Patient Financial Portal.**

---

## Completed Wave 01 Scope & Core Modules

### 1. Patient Financial Portal (`PatientFinancialPortal.tsx`)
- **Secure Financial Access:** Patients view authorized financial records only for themselves. Guardians access financial summary records for authorized linked dependents via RLS context switching (`simulatePatientRLS`).
- **Financial Summary KPI Cards:** Real-time display of:
  - Current Outstanding Balance
  - Total Invoiced Amount
  - Total Amount Paid
  - Total Insurance-Covered Amount
  - Patient Copay Responsibility
  - Prepaid Wallet Balance
  - Loyalty Points Balance
- **Chronological Account Statement:** Interactive chronological timeline showing all debits (invoices) and credits (payments, top-ups, adjustments) with running balance tracking.
- **Invoice & Receipt Viewers:** Detailed invoice list showing gross amount, insurance portion, copay, paid amount, remaining balance, and payment status, with printable bilingual receipt vouchers.
- **Privacy & Data Sanitization:** Internal staff costs, doctor commission rates, lab fees, and supplier margins are strictly excluded from patient-facing data models and views. Zero sensitive financial data is stored in `localStorage`.

### 2. Patient Prepaid Wallet (`financeAndInsuranceStorage.ts`, `PatientWalletModal.tsx`)
- **Prepaid Wallet Engine:**
  - `topUpPatientWallet`: Staff credit top-up with reference and payment method tracking.
  - `usePatientWalletForInvoice`: Direct debit of prepaid wallet towards an active invoice balance with automated billing payment log integration (`recordInvoicePayment`).
  - `adjustPatientWallet`: Audited manual credit/debit adjustments restricted to authorized clinic managers.
- **Immutable Transaction History:** Every wallet transaction records `patient_id`, `organization_id`, `branch_id`, `amount`, `type` (`credit` | `debit` | `refund` | `adjustment`), `reference`, `created_by`, timestamp, and `balance_after`.
- **Negative Balance Safeguard:** Debits exceeding current wallet balance are strictly rejected.
- **Staff Workspace Access:** Receptionists and managers manage wallet operations via `PatientWalletModal.tsx` in the Reception Dashboard.

### 3. Loyalty Rewards Program (`financeAndInsuranceStorage.ts`)
- **Configurable Rule Engine:** Configurable earning rate (e.g. 1 point per 10 EGP spent) and redemption rate (e.g. 1 point = 0.5 EGP value).
- **Automated Point Awarding:** `awardLoyaltyPointsForInvoice` automatically awards points upon invoice payment.
- **Duplicate Earn Prevention:** Invoice IDs are tracked in `processed_invoices` arrays inside `PatientLoyaltyAccount`. Repeated award triggers for the same invoice are safely ignored.
- **Point Redemption & Audited Adjustments:** Points can be redeemed toward invoice payments or manually adjusted with audit logging.

### 4. Insurance Prior Approvals (`InsuranceClaimsModal.tsx`)
- **Pre-Authorization Lifecycle:** `draft` $\rightarrow$ `pending_approval` $\rightarrow$ `approved` / `rejected` / `expired` lifecycle tracking.
- **Doctor & Staff Tracking:** Doctors and receptionists can track pre-approval requests, valid-until dates, approved amounts, and clinical attachments.
- **Automated Copay Adjustment:** When a prior approval is marked `approved`, invoice copay calculations update automatically to reflect approved coverage.

### 5. Insurance Claims & Batch Settlement Posting (`InsuranceClaimsModal.tsx`)
- **Individual & Batch Claims Processing:** Creation of individual claims from insured invoices and aggregation into `ClaimBatch` objects for batch submission to insurance companies.
- **Settlement Posting & Write-Offs:** Reception and finance managers post insurance payout settlements (`ClaimSettlementPosting`), recording approved payouts, rejected amounts, and contract write-offs.
- **Rejection Shortfall Handling:** When a claim is rejected, the unpaid insurance balance can be automatically transferred to the patient's balance responsibility (`transferRejectedClaimToPatientBalance`).
- **Doctor Visibility:** Doctors can view insurance approval statuses for their patients without gaining access to center-level batch settlements.

---

## Data Models & Canonical Types (`/src/types/financeAndInsurance.ts`)

```typescript
export type WalletTransactionType = 'credit' | 'debit' | 'refund' | 'adjustment';

export interface WalletTransaction {
  id: string;
  patient_id: string;
  organization_id: string;
  branch_id?: string;
  amount: number;
  type: WalletTransactionType;
  reference?: string;
  notes?: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  balance_after: number;
}

export interface PatientWallet {
  patient_id: string;
  organization_id: string;
  balance: number;
  updated_at: string;
}

export interface LoyaltyRule {
  id: string;
  organization_id: string;
  points_per_egp: number;
  redemption_egp_per_point: number;
  minimum_points_to_redeem: number;
  is_active: boolean;
}

export interface LoyaltyTransaction {
  id: string;
  patient_id: string;
  organization_id: string;
  points: number;
  type: 'earned' | 'redeemed' | 'adjusted' | 'expired';
  reference_invoice_id?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  points_after: number;
}

export interface PatientLoyaltyAccount {
  patient_id: string;
  organization_id: string;
  total_points: number;
  lifetime_earned_points: number;
  lifetime_redeemed_points: number;
  processed_invoices: string[];
  updated_at: string;
}

export type InsuranceApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'expired';

export interface InsurancePriorApprovalItem {
  id: string;
  service_id: string;
  service_code?: string;
  service_name_ar: string;
  service_name_en: string;
  requested_amount: number;
  approved_amount?: number;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
}

export interface InsurancePriorApproval {
  id: string;
  patient_id: string;
  patient_name?: string;
  organization_id: string;
  branch_id?: string;
  insurance_company_id: string;
  insurance_company_name: string;
  insurance_plan_name?: string;
  policy_number?: string;
  doctor_id?: string;
  doctor_name?: string;
  treatment_plan_id?: string;
  invoice_id?: string;
  items: InsurancePriorApprovalItem[];
  total_requested_amount: number;
  total_approved_amount?: number;
  status: InsuranceApprovalStatus;
  requested_date: string;
  valid_until?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type InsuranceClaimStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'partially_approved' | 'rejected' | 'settled';

export interface InsuranceClaim {
  id: string;
  claim_number: string;
  patient_id: string;
  patient_name?: string;
  organization_id: string;
  branch_id?: string;
  insurance_company_id: string;
  insurance_company_name: string;
  invoice_id: string;
  prior_approval_id?: string;
  claimed_amount: number;
  approved_amount?: number;
  settled_amount?: number;
  status: InsuranceClaimStatus;
  submission_date: string;
  settlement_date?: string;
  batch_id?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ClaimBatch {
  id: string;
  batch_number: string;
  organization_id: string;
  insurance_company_id: string;
  insurance_company_name: string;
  claim_ids: string[];
  total_claims_count: number;
  total_claimed_amount: number;
  total_approved_amount?: number;
  total_settled_amount?: number;
  status: 'draft' | 'submitted' | 'processing' | 'settled';
  submission_date: string;
  settlement_date?: string;
  created_by: string;
  created_at: string;
}

export interface ClaimSettlementPosting {
  id: string;
  batch_id?: string;
  claim_id: string;
  organization_id: string;
  payout_amount: number;
  write_off_amount: number;
  patient_transferred_amount: number;
  posted_by: string;
  posted_at: string;
  notes?: string;
}

export interface PatientFinancialSummary {
  patient_id: string;
  patient_name?: string;
  outstanding_balance: number;
  total_invoiced: number;
  total_paid: number;
  total_insurance_covered: number;
  total_patient_copay: number;
  wallet_balance: number;
  loyalty_points: number;
}
```

---

## Key Files Created and Modified

### Newly Created Files
1. `src/types/financeAndInsurance.ts`: Type declarations for wallet, loyalty, prior approvals, claims, batches, and settlements.
2. `src/lib/financeAndInsuranceStorage.ts`: Core business logic, calculation engines, and persistence wrappers for financial workflows.
3. `src/modules/patient-portal/PatientFinancialPortal.tsx`: Patient Portal Financial tab with balance KPI summary, account statements, invoices, wallet, and loyalty views.
4. `src/modules/reception/PatientWalletModal.tsx`: Front-desk modal for patient wallet top-ups, invoice debits, and manager balance adjustments.
5. `src/modules/reception/InsuranceClaimsModal.tsx`: Front-desk modal for managing prior approvals, claim submissions, batching, and settlement postings.
6. `tests/wave1-patient-finance-wallet-loyalty-insurance.test.ts`: Automated unit and acceptance test suite for Wave 01.

### Modified Files
1. `src/types/index.ts`: Exported `financeAndInsurance.ts` types.
2. `src/modules/patient-portal/PatientPortalShell.tsx`: Added `finance` navigation tab and routed rendering to `PatientFinancialPortal`.
3. `src/modules/patient-portal/PatientHome.tsx`: Updated `onNavigate` props to allow direct navigation to the financial tab.
4. `src/modules/reception/ReceptionDashboard.tsx`: Added action buttons and rendered `PatientWalletModal` and `InsuranceClaimsModal`.

---

## Authorization, Isolation & Security Controls

1. **Patient & Guardian Isolation:** Patient portal queries rely on `simulatePatientRLS` and `getAuthorizedProfilesForAccount`. Patients can access only their own financial records, while guardians access authorized dependent records only.
2. **Organization & Branch Isolation:** All wallet, loyalty, prior approval, and claim records are enforced with `organization_id` and optional `branch_id` tenant filters.
3. **Privacy Sanitization:** Internal clinic margins, supplier prices, lab fees, and doctor commission percentages are withheld from all patient-facing models and endpoints.
4. **Audit Trail:** Wallet adjustments, loyalty point edits, and claim settlement postings log the `created_by` staff ID and timestamp.
5. **No LocalStorage Secret Exposure:** Financial state is evaluated server/memory-side or via authenticated storage mocks; zero financial tokens or sensitive records are stored in browser `localStorage`.

---

## Database Migrations

- **Database Migrations:** None (State handled through existing schema and client/mock storage wrappers).

---

## Notifications & Task Handoffs

- **Wallet Top-Up Notification:** Triggers informational alert upon wallet top-up.
- **Claim Status Notification:** Emits alerts to receptionists when an insurance prior approval or claim status changes.
- **Manager Audit Tasks:** Manual wallet or loyalty adjustments log internal staff audit notes.

---

## Verification Results

- **Test Suite Execution:** `npx vitest run`
  - **31 test files passed**
  - **295 total tests passed**
  - **0 failures**
- **Type Checking:** `npx tsc --noEmit`
  - **0 errors**
- **Build Verification:** `npm run build`
  - **PASS (Applet compiled successfully)**
- **Lint Verification:** `npm run lint`
  - **PASS**
- **Preview Verification:** `CURRENT Preview: PASS`
- **Remaining Issues:** `None`
