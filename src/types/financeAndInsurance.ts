/**
 * Wave 1: Patient Finance, Wallet, Loyalty, Insurance Prior Approvals & Claims/Settlement Workflow
 */

export type WalletTransactionType = 'credit' | 'debit' | 'refund' | 'adjustment';

export interface WalletTransaction {
  id: string;
  patient_id: string;
  organization_id: string;
  branch_id?: string;
  amount: number; // positive numeric value
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
  points_per_amount: number; // e.g. 1 point per 10 EGP paid
  min_invoice_amount: number; // e.g. 100 EGP
  redemption_rate: number; // e.g. 100 points = 50 EGP credit
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type LoyaltyTransactionType = 'earn' | 'redeem' | 'adjustment';

export interface LoyaltyTransaction {
  id: string;
  patient_id: string;
  organization_id: string;
  branch_id?: string;
  invoice_id?: string;
  points: number; // positive for earn/adjustment+, negative for redeem/adjustment-
  type: LoyaltyTransactionType;
  reference?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  points_balance_after: number;
}

export interface PatientLoyaltyAccount {
  patient_id: string;
  organization_id: string;
  total_points_earned: number;
  total_points_redeemed: number;
  current_points: number;
  updated_at: string;
}

export type PriorApprovalStatus =
  | 'draft'
  | 'requested'
  | 'pending_approval'
  | 'approved'
  | 'partially_approved'
  | 'rejected'
  | 'expired';

export interface InsurancePriorApprovalItem {
  id: string;
  service_id: string;
  service_code: string;
  service_name_ar: string;
  service_name_en: string;
  requested_amount: number;
  approved_amount?: number;
  copay_percentage: number;
  status: PriorApprovalStatus;
  rejection_reason?: string;
}

export interface InsurancePriorApproval {
  id: string;
  approval_number: string; // e.g. APR-2026-001
  organization_id: string;
  branch_id: string;
  patient_id: string;
  patient_name?: string;
  insurance_company_id: string;
  insurance_company_name?: string;
  insurance_plan_id?: string;
  insurance_plan_name?: string;
  policy_number?: string;
  doctor_id?: string;
  doctor_name?: string;
  appointment_id?: string;
  treatment_plan_id?: string;
  items: InsurancePriorApprovalItem[];
  total_requested_amount: number;
  total_approved_amount: number;
  status: PriorApprovalStatus;
  requested_date: string;
  valid_until?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ClaimStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'paid'
  | 'partially_paid'
  | 'rejected'
  | 'disputed';

export interface InsuranceClaimItem {
  id: string;
  invoice_id: string;
  invoice_item_id: string;
  service_id: string;
  service_code: string;
  service_name_ar: string;
  service_name_en: string;
  gross_amount: number;
  claimed_amount: number;
  approved_amount: number;
  paid_amount: number;
  write_off_amount: number;
  patient_transfer_amount: number;
  status: ClaimStatus;
  rejection_reason?: string;
}

export interface InsuranceClaim {
  id: string;
  claim_number: string; // e.g. CLM-2026-001
  organization_id: string;
  branch_id: string;
  batch_id?: string;
  patient_id: string;
  patient_name?: string;
  insurance_company_id: string;
  insurance_company_name?: string;
  policy_number?: string;
  invoice_id: string;
  prior_approval_id?: string;
  prior_approval_number?: string;
  items: InsuranceClaimItem[];
  total_claimed_amount: number;
  total_approved_amount: number;
  total_paid_amount: number;
  total_write_off_amount: number;
  total_patient_transfer_amount: number;
  status: ClaimStatus;
  submission_date: string;
  settlement_date?: string;
  rejection_reason?: string;
  dispute_notes?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ClaimBatchStatus = 'draft' | 'submitted' | 'processing' | 'settled' | 'partially_settled';

export interface ClaimBatch {
  id: string;
  batch_number: string; // e.g. BATCH-2026-001
  organization_id: string;
  branch_id: string;
  insurance_company_id: string;
  insurance_company_name?: string;
  claim_ids: string[];
  total_claims_count: number;
  total_claimed_amount: number;
  total_approved_amount: number;
  total_settled_amount: number;
  status: ClaimBatchStatus;
  submission_date: string;
  settlement_date?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ClaimSettlementPosting {
  id: string;
  organization_id: string;
  branch_id: string;
  batch_id?: string;
  claim_id: string;
  payout_amount: number;
  claimed_amount: number;
  write_off_amount: number;
  patient_transfer_amount: number;
  rejection_reason?: string;
  transfer_to_patient_balance: boolean;
  posted_by: string;
  posted_at: string;
}

export interface PatientFinancialSummary {
  patient_id: string;
  organization_id: string;
  current_outstanding_balance: number;
  total_invoiced: number;
  total_paid: number;
  insurance_covered_amount: number;
  patient_copay_amount: number;
  wallet_balance: number;
  loyalty_points: number;
}

export type AccountStatementItemType =
  | 'invoice'
  | 'payment'
  | 'wallet_topup'
  | 'wallet_debit'
  | 'wallet_refund'
  | 'loyalty_earn'
  | 'loyalty_redeem'
  | 'insurance_claim_transfer';

export interface AccountStatementItem {
  id: string;
  date: string;
  type: AccountStatementItemType;
  reference_number: string;
  description_ar: string;
  description_en: string;
  debit_amount: number; // Increases debt
  credit_amount: number; // Decreases debt
  running_balance: number;
  invoice_id?: string;
  payment_id?: string;
}
