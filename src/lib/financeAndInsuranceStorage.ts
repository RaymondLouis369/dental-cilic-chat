/**
 * Wave 1: Patient Finance, Wallet, Loyalty, Insurance Prior Approvals & Claims/Settlement Engine
 * Fully integrated with Phase 1-11.5 infrastructure.
 */

import {
  WalletTransaction,
  WalletTransactionType,
  PatientWallet,
  LoyaltyRule,
  LoyaltyTransaction,
  LoyaltyTransactionType,
  PatientLoyaltyAccount,
  InsurancePriorApproval,
  InsurancePriorApprovalItem,
  PriorApprovalStatus,
  InsuranceClaim,
  InsuranceClaimItem,
  ClaimStatus,
  ClaimBatch,
  ClaimBatchStatus,
  ClaimSettlementPosting,
  PatientFinancialSummary,
  AccountStatementItem,
} from '../types/financeAndInsurance';
import { Invoice, InvoiceItem } from '../types/receptionAndBilling';
import { RoleKey, Patient } from '../types';
import { DEFAULT_EGYPT_ORG } from './storage';
import { getStoredPatients, simulatePatientRLS } from './patientStorage';
import {
  getStoredInvoices,
  setStoredInvoices,
  recordInvoicePayment,
  getStoredServices,
  getStoredInsuranceCompanies,
  getStoredInsurancePlans,
} from './receptionAndBillingStorage';

export const FINANCE_STORAGE_KEYS = {
  WALLETS: 'dental_saas_patient_wallets',
  WALLET_TRANSACTIONS: 'dental_saas_wallet_transactions',
  LOYALTY_ACCOUNTS: 'dental_saas_patient_loyalty_accounts',
  LOYALTY_TRANSACTIONS: 'dental_saas_loyalty_transactions',
  LOYALTY_RULES: 'dental_saas_loyalty_rules',
  PRIOR_APPROVALS: 'dental_saas_insurance_prior_approvals',
  CLAIMS: 'dental_saas_insurance_claims',
  CLAIM_BATCHES: 'dental_saas_claim_batches',
  CLAIM_SETTLEMENTS: 'dental_saas_claim_settlements',
};

// Safe storage wrapper
const memoryStore = new Map<string, string>();
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // fallback
    }
    return memoryStore.get(key) || null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // fallback
    }
    memoryStore.set(key, value);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {
      // fallback
    }
    memoryStore.delete(key);
  },
};

// ============================================================================
// 1. SEED DATA
// ============================================================================

export const SEED_WALLETS: PatientWallet[] = [
  {
    patient_id: 'a1111111-1111-1111-1111-111111111111', // Ahmed Mohamed
    organization_id: DEFAULT_EGYPT_ORG.id,
    balance: 500.0,
    updated_at: '2026-09-01T10:00:00Z',
  },
  {
    patient_id: 'd4444444-4444-4444-4444-444444444444', // Mona Hassan
    organization_id: DEFAULT_EGYPT_ORG.id,
    balance: 200.0,
    updated_at: '2026-09-01T10:00:00Z',
  },
];

export const SEED_WALLET_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 'wtx_seed_001',
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    amount: 500.0,
    type: 'credit',
    reference: 'REC-TOPUP-001',
    notes: 'إيداع مسبق في المحفظة بواسطة موظف الاستقبال',
    created_by: 'usr_rec_01',
    created_by_name: 'سارة استقبال',
    created_at: '2026-09-01T10:00:00Z',
    balance_after: 500.0,
  },
  {
    id: 'wtx_seed_002',
    patient_id: 'd4444444-4444-4444-4444-444444444444',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    amount: 200.0,
    type: 'credit',
    reference: 'REC-TOPUP-002',
    notes: 'رصيد محفظة افتتاحي',
    created_by: 'usr_rec_01',
    created_by_name: 'سارة استقبال',
    created_at: '2026-09-01T10:00:00Z',
    balance_after: 200.0,
  },
];

export const SEED_LOYALTY_RULES: LoyaltyRule[] = [
  {
    id: 'lrule_default_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    points_per_amount: 10, // 1 point per 10 EGP paid
    min_invoice_amount: 100, // min 100 EGP invoice to earn
    redemption_rate: 0.5, // 1 point = 0.5 EGP credit discount
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
];

export const SEED_LOYALTY_ACCOUNTS: PatientLoyaltyAccount[] = [
  {
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    organization_id: DEFAULT_EGYPT_ORG.id,
    total_points_earned: 100,
    total_points_redeemed: 0,
    current_points: 100,
    updated_at: '2026-09-17T09:05:00Z',
  },
];

export const SEED_LOYALTY_TRANSACTIONS: LoyaltyTransaction[] = [
  {
    id: 'ltx_seed_001',
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    invoice_id: 'inv_2026_001',
    points: 100,
    type: 'earn',
    reference: 'INV-20260917-001',
    notes: 'نقاط مكافأة عن سداد فاتورة علاجية بقيمة 1000 ج.م',
    created_by: 'system',
    created_at: '2026-09-17T09:05:00Z',
    points_balance_after: 100,
  },
];

export const SEED_PRIOR_APPROVALS: InsurancePriorApproval[] = [
  {
    id: 'pa_seed_001',
    approval_number: 'APR-2026-001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    patient_id: 'c3333333-3333-3333-3333-333333333333',
    patient_name: 'سارة محمود علي',
    insurance_company_id: 'ins_comp_axa',
    insurance_company_name: 'شركة أكسا للتأمين مصر',
    insurance_plan_id: 'plan_axa_gold',
    insurance_plan_name: 'الخطة الذهبية 80/20',
    policy_number: 'AXA-EGY-99201',
    doctor_id: 'prof_doc_01',
    doctor_name: 'د. كريم حسن',
    total_requested_amount: 1200.0,
    total_approved_amount: 1200.0,
    status: 'approved',
    requested_date: '2026-09-16T10:00:00Z',
    valid_until: '2026-10-16T23:59:59Z',
    notes: 'موافقة مسبقة لعلاج جذور أسنان',
    created_by: 'usr_rec_01',
    created_at: '2026-09-16T10:00:00Z',
    updated_at: '2026-09-16T14:00:00Z',
    items: [
      {
        id: 'pa_item_001',
        service_id: 'srv_005',
        service_code: 'SRV-ENDO-01',
        service_name_ar: 'علاج جذور أسنان (قناة واحدة)',
        service_name_en: 'Root Canal Treatment (Single Canal)',
        requested_amount: 1200.0,
        approved_amount: 1200.0,
        copay_percentage: 20,
        status: 'approved',
      },
    ],
  },
];

export const SEED_CLAIMS: InsuranceClaim[] = [
  {
    id: 'clm_seed_001',
    claim_number: 'CLM-2026-001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    patient_id: 'c3333333-3333-3333-3333-333333333333',
    patient_name: 'سارة محمود علي',
    insurance_company_id: 'ins_comp_axa',
    insurance_company_name: 'شركة أكسا للتأمين مصر',
    policy_number: 'AXA-EGY-99201',
    invoice_id: 'inv_2026_002',
    prior_approval_id: 'pa_seed_001',
    prior_approval_number: 'APR-2026-001',
    total_claimed_amount: 960.0,
    total_approved_amount: 960.0,
    total_paid_amount: 0.0,
    total_write_off_amount: 0.0,
    total_patient_transfer_amount: 0.0,
    status: 'submitted',
    submission_date: '2026-09-18T09:00:00Z',
    notes: 'مطالبة تأمينية عن فاتورة علاج جذور',
    created_by: 'usr_rec_01',
    created_at: '2026-09-18T09:00:00Z',
    updated_at: '2026-09-18T09:00:00Z',
    items: [
      {
        id: 'clm_item_001',
        invoice_id: 'inv_2026_002',
        invoice_item_id: 'inv_item_003',
        service_id: 'srv_005',
        service_code: 'SRV-ENDO-01',
        service_name_ar: 'علاج جذور أسنان',
        service_name_en: 'Root Canal Treatment',
        gross_amount: 1200.0,
        claimed_amount: 960.0,
        approved_amount: 960.0,
        paid_amount: 0.0,
        write_off_amount: 0.0,
        patient_transfer_amount: 0.0,
        status: 'submitted',
      },
    ],
  },
];

// ============================================================================
// 2. WALLET STORAGE & LOGIC ENGINE
// ============================================================================

export function getStoredWallets(orgId?: string): PatientWallet[] {
  const raw = safeStorage.getItem(FINANCE_STORAGE_KEYS.WALLETS);
  let list: PatientWallet[] = raw ? JSON.parse(raw) : [];
  if (!raw || list.length === 0) {
    list = SEED_WALLETS;
    safeStorage.setItem(FINANCE_STORAGE_KEYS.WALLETS, JSON.stringify(list));
  }
  if (orgId) {
    return list.filter((w) => w.organization_id === orgId);
  }
  return list;
}

export function setStoredWallets(wallets: PatientWallet[]): void {
  safeStorage.setItem(FINANCE_STORAGE_KEYS.WALLETS, JSON.stringify(wallets));
}

export function getStoredWalletTransactions(orgId?: string, patientId?: string): WalletTransaction[] {
  const raw = safeStorage.getItem(FINANCE_STORAGE_KEYS.WALLET_TRANSACTIONS);
  let list: WalletTransaction[] = raw ? JSON.parse(raw) : [];
  if (!raw || list.length === 0) {
    list = SEED_WALLET_TRANSACTIONS;
    safeStorage.setItem(FINANCE_STORAGE_KEYS.WALLET_TRANSACTIONS, JSON.stringify(list));
  }
  return list.filter(
    (tx) => (!orgId || tx.organization_id === orgId) && (!patientId || tx.patient_id === patientId)
  );
}

export function setStoredWalletTransactions(txs: WalletTransaction[]): void {
  safeStorage.setItem(FINANCE_STORAGE_KEYS.WALLET_TRANSACTIONS, JSON.stringify(txs));
}

export function getPatientWallet(patientId: string, orgId: string): PatientWallet {
  const wallets = getStoredWallets(orgId);
  let wallet = wallets.find((w) => w.patient_id === patientId && w.organization_id === orgId);
  if (!wallet) {
    wallet = {
      patient_id: patientId,
      organization_id: orgId,
      balance: 0.0,
      updated_at: new Date().toISOString(),
    };
    wallets.push(wallet);
    setStoredWallets(wallets);
  }
  return wallet;
}

export function topUpPatientWallet(params: {
  patientId: string;
  organizationId: string;
  branchId?: string;
  amount: number;
  reference?: string;
  notes?: string;
  createdBy: string;
  createdByName?: string;
}): { success: boolean; transaction?: WalletTransaction; wallet?: PatientWallet; error?: string } {
  const { patientId, organizationId, branchId, amount, reference, notes, createdBy, createdByName } = params;

  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return { success: false, error: 'المبلغ يجب أن يكون رقماً موجباً أكبر من صفر' };
  }

  const wallets = getStoredWallets();
  let walletIndex = wallets.findIndex((w) => w.patient_id === patientId && w.organization_id === organizationId);
  let wallet: PatientWallet;

  if (walletIndex >= 0) {
    wallet = { ...wallets[walletIndex] };
  } else {
    wallet = { patient_id: patientId, organization_id: organizationId, balance: 0.0, updated_at: new Date().toISOString() };
  }

  const newBalance = Math.round((wallet.balance + amount) * 100) / 100;
  wallet.balance = newBalance;
  wallet.updated_at = new Date().toISOString();

  if (walletIndex >= 0) {
    wallets[walletIndex] = wallet;
  } else {
    wallets.push(wallet);
  }
  setStoredWallets(wallets);

  const tx: WalletTransaction = {
    id: `wtx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    patient_id: patientId,
    organization_id: organizationId,
    branch_id: branchId,
    amount,
    type: 'credit',
    reference: reference || `TOPUP-${Date.now().toString().slice(-6)}`,
    notes: notes || 'إيداع مالي في محفظة المريض',
    created_by: createdBy,
    created_by_name: createdByName,
    created_at: new Date().toISOString(),
    balance_after: newBalance,
  };

  const txs = getStoredWalletTransactions();
  txs.unshift(tx);
  setStoredWalletTransactions(txs);

  return { success: true, transaction: tx, wallet };
}

export function usePatientWalletForInvoice(params: {
  patientId: string;
  organizationId: string;
  branchId?: string;
  invoiceId: string;
  amount: number;
  createdBy: string;
  createdByName?: string;
}): { success: boolean; transaction?: WalletTransaction; wallet?: PatientWallet; error?: string } {
  const { patientId, organizationId, branchId, invoiceId, amount, createdBy, createdByName } = params;

  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return { success: false, error: 'المبلغ يجب أن يكون رقماً موجباً أكبر من صفر' };
  }

  const wallets = getStoredWallets();
  const walletIndex = wallets.findIndex((w) => w.patient_id === patientId && w.organization_id === organizationId);
  if (walletIndex === -1 || wallets[walletIndex].balance < amount) {
    const currentBal = walletIndex >= 0 ? wallets[walletIndex].balance : 0;
    return {
      success: false,
      error: `رصيد المحفظة غير كافٍ. الرصيد الحالي: ${currentBal} ج.م والمطلوب: ${amount} ج.م`,
    };
  }

  const wallet = { ...wallets[walletIndex] };
  const newBalance = Math.round((wallet.balance - amount) * 100) / 100;
  wallet.balance = newBalance;
  wallet.updated_at = new Date().toISOString();

  wallets[walletIndex] = wallet;
  setStoredWallets(wallets);

  // Record Payment on Invoice in billing storage
  recordInvoicePayment(invoiceId, amount, {
    actorUserId: createdBy,
    paymentMethod: 'wallet',
    referenceNumber: `WALLET-PAY-${Date.now().toString().slice(-6)}`,
    receivedBy: createdBy,
    notes: `سداد من محفظة المريض المسبقة الدفع (الرصيد المتبقي: ${newBalance} ج.م)`,
  });

  const tx: WalletTransaction = {
    id: `wtx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    patient_id: patientId,
    organization_id: organizationId,
    branch_id: branchId,
    amount,
    type: 'debit',
    reference: `INV-PAY-${invoiceId}`,
    notes: `سداد فاتورة رقم ${invoiceId}`,
    created_by: createdBy,
    created_by_name: createdByName,
    created_at: new Date().toISOString(),
    balance_after: newBalance,
  };

  const txs = getStoredWalletTransactions();
  txs.unshift(tx);
  setStoredWalletTransactions(txs);

  return { success: true, transaction: tx, wallet };
}

export function adjustPatientWallet(params: {
  patientId: string;
  organizationId: string;
  branchId?: string;
  amount: number;
  type: 'refund' | 'adjustment';
  reference?: string;
  notes: string;
  createdBy: string;
  createdByName?: string;
  actorRole?: RoleKey;
}): { success: boolean; transaction?: WalletTransaction; wallet?: PatientWallet; error?: string } {
  const { patientId, organizationId, branchId, amount, type, reference, notes, createdBy, createdByName, actorRole } = params;

  if (actorRole && !['center_manager', 'branch_manager', 'receptionist'].includes(actorRole)) {
    return { success: false, error: 'غير مصرح لك بتعديل أو استرداد رصيد المحفظة. هذه الخاصية متاحة للاستقبال ومديري الفروع والمؤسسة فقط.' };
  }

  if (!notes || !notes.trim()) {
    return { success: false, error: 'يرجى كتابة سبب أو الملاحظات التفصيلية للتعديل الإداري للمحفظة' };
  }

  if (typeof amount !== 'number' || isNaN(amount) || amount === 0) {
    return { success: false, error: 'المبلغ غير صالح' };
  }

  const wallets = getStoredWallets();
  let walletIndex = wallets.findIndex((w) => w.patient_id === patientId && w.organization_id === organizationId);
  let wallet: PatientWallet;

  if (walletIndex >= 0) {
    wallet = { ...wallets[walletIndex] };
  } else {
    wallet = { patient_id: patientId, organization_id: organizationId, balance: 0.0, updated_at: new Date().toISOString() };
  }

  // Calculate new balance depending on sign or type
  let delta = amount;
  if (type === 'refund' && delta > 0) {
    delta = -delta; // refund reduces wallet balance
  }

  const newBalance = Math.round((wallet.balance + delta) * 100) / 100;
  if (newBalance < 0) {
    return { success: false, error: `لا يمكن تطبيق هذا التعديل لأنه يتسبب في رصيد محفظة سالب (${newBalance} ج.م)` };
  }

  wallet.balance = newBalance;
  wallet.updated_at = new Date().toISOString();

  if (walletIndex >= 0) {
    wallets[walletIndex] = wallet;
  } else {
    wallets.push(wallet);
  }
  setStoredWallets(wallets);

  const tx: WalletTransaction = {
    id: `wtx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    patient_id: patientId,
    organization_id: organizationId,
    branch_id: branchId,
    amount: Math.abs(amount),
    type,
    reference: reference || `ADJ-${Date.now().toString().slice(-6)}`,
    notes: notes.trim(),
    created_by: createdBy,
    created_by_name: createdByName,
    created_at: new Date().toISOString(),
    balance_after: newBalance,
  };

  const txs = getStoredWalletTransactions();
  txs.unshift(tx);
  setStoredWalletTransactions(txs);

  return { success: true, transaction: tx, wallet };
}

// ============================================================================
// 3. LOYALTY POINTS ENGINE
// ============================================================================

export function getStoredLoyaltyAccounts(orgId?: string): PatientLoyaltyAccount[] {
  const raw = safeStorage.getItem(FINANCE_STORAGE_KEYS.LOYALTY_ACCOUNTS);
  let list: PatientLoyaltyAccount[] = raw ? JSON.parse(raw) : [];
  if (!raw || list.length === 0) {
    list = SEED_LOYALTY_ACCOUNTS;
    safeStorage.setItem(FINANCE_STORAGE_KEYS.LOYALTY_ACCOUNTS, JSON.stringify(list));
  }
  if (orgId) {
    return list.filter((a) => a.organization_id === orgId);
  }
  return list;
}

export function setStoredLoyaltyAccounts(accounts: PatientLoyaltyAccount[]): void {
  safeStorage.setItem(FINANCE_STORAGE_KEYS.LOYALTY_ACCOUNTS, JSON.stringify(accounts));
}

export function getStoredLoyaltyTransactions(orgId?: string, patientId?: string): LoyaltyTransaction[] {
  const raw = safeStorage.getItem(FINANCE_STORAGE_KEYS.LOYALTY_TRANSACTIONS);
  let list: LoyaltyTransaction[] = raw ? JSON.parse(raw) : [];
  if (!raw || list.length === 0) {
    list = SEED_LOYALTY_TRANSACTIONS;
    safeStorage.setItem(FINANCE_STORAGE_KEYS.LOYALTY_TRANSACTIONS, JSON.stringify(list));
  }
  return list.filter(
    (tx) => (!orgId || tx.organization_id === orgId) && (!patientId || tx.patient_id === patientId)
  );
}

export function setStoredLoyaltyTransactions(txs: LoyaltyTransaction[]): void {
  safeStorage.setItem(FINANCE_STORAGE_KEYS.LOYALTY_TRANSACTIONS, JSON.stringify(txs));
}

export function getPatientLoyaltyAccount(patientId: string, orgId: string): PatientLoyaltyAccount {
  const accounts = getStoredLoyaltyAccounts(orgId);
  let acc = accounts.find((a) => a.patient_id === patientId && a.organization_id === orgId);
  if (!acc) {
    acc = {
      patient_id: patientId,
      organization_id: orgId,
      total_points_earned: 0,
      total_points_redeemed: 0,
      current_points: 0,
      updated_at: new Date().toISOString(),
    };
    accounts.push(acc);
    setStoredLoyaltyAccounts(accounts);
  }
  return acc;
}

export function earnLoyaltyPointsForInvoice(params: {
  patientId: string;
  organizationId: string;
  branchId?: string;
  invoiceId: string;
  amountPaid: number;
  createdBy: string;
}): { success: boolean; pointsEarned: number; account?: PatientLoyaltyAccount; error?: string } {
  const { patientId, organizationId, branchId, invoiceId, amountPaid, createdBy } = params;

  // Duplicate earn prevention check!
  const existingTxs = getStoredLoyaltyTransactions(organizationId, patientId);
  const alreadyEarned = existingTxs.some((t) => t.invoice_id === invoiceId && t.type === 'earn');
  if (alreadyEarned) {
    return { success: false, pointsEarned: 0, error: 'تم احتساب نقاط الولاء لهذه الفاتورة سابقاً' };
  }

  // Get active loyalty rule
  const rules = SEED_LOYALTY_RULES.filter((r) => r.organization_id === organizationId && r.active);
  const rule = rules[0] || SEED_LOYALTY_RULES[0];

  if (amountPaid < rule.min_invoice_amount) {
    return { success: false, pointsEarned: 0, error: `قيمة السداد (${amountPaid} ج.م) أقل من الحد الأدنى لاكتساب النقاط (${rule.min_invoice_amount} ج.م)` };
  }

  const pointsEarned = Math.floor(amountPaid / rule.points_per_amount);
  if (pointsEarned <= 0) {
    return { success: true, pointsEarned: 0 };
  }

  const accounts = getStoredLoyaltyAccounts();
  let accIndex = accounts.findIndex((a) => a.patient_id === patientId && a.organization_id === organizationId);
  let acc: PatientLoyaltyAccount;

  if (accIndex >= 0) {
    acc = { ...accounts[accIndex] };
  } else {
    acc = { patient_id: patientId, organization_id: organizationId, total_points_earned: 0, total_points_redeemed: 0, current_points: 0, updated_at: new Date().toISOString() };
  }

  acc.total_points_earned += pointsEarned;
  acc.current_points += pointsEarned;
  acc.updated_at = new Date().toISOString();

  if (accIndex >= 0) {
    accounts[accIndex] = acc;
  } else {
    accounts.push(acc);
  }
  setStoredLoyaltyAccounts(accounts);

  const tx: LoyaltyTransaction = {
    id: `ltx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    patient_id: patientId,
    organization_id: organizationId,
    branch_id: branchId,
    invoice_id: invoiceId,
    points: pointsEarned,
    type: 'earn',
    reference: `INV-${invoiceId}`,
    notes: `كتساب ${pointsEarned} نقطة عند سداد فاتورة بقيمة ${amountPaid} ج.م`,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    points_balance_after: acc.current_points,
  };

  const txs = getStoredLoyaltyTransactions();
  txs.unshift(tx);
  setStoredLoyaltyTransactions(txs);

  return { success: true, pointsEarned, account: acc };
}

export function redeemLoyaltyPoints(params: {
  patientId: string;
  organizationId: string;
  branchId?: string;
  points: number;
  notes?: string;
  createdBy: string;
}): { success: boolean; transaction?: LoyaltyTransaction; account?: PatientLoyaltyAccount; error?: string } {
  const { patientId, organizationId, branchId, points, notes, createdBy } = params;

  if (typeof points !== 'number' || isNaN(points) || points <= 0) {
    return { success: false, error: 'عدد النقاط المراد استبدالها يجب أن يكون رقماً موجباً' };
  }

  const accounts = getStoredLoyaltyAccounts();
  const accIndex = accounts.findIndex((a) => a.patient_id === patientId && a.organization_id === organizationId);
  if (accIndex === -1 || accounts[accIndex].current_points < points) {
    const currentPts = accIndex >= 0 ? accounts[accIndex].current_points : 0;
    return { success: false, error: `رصيد النقاط غير كافٍ. الرصيد المتاح: ${currentPts} نقطة والمطلوب: ${points} نقطة` };
  }

  const acc = { ...accounts[accIndex] };
  acc.current_points -= points;
  acc.total_points_redeemed += points;
  acc.updated_at = new Date().toISOString();

  accounts[accIndex] = acc;
  setStoredLoyaltyAccounts(accounts);

  const tx: LoyaltyTransaction = {
    id: `ltx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    patient_id: patientId,
    organization_id: organizationId,
    branch_id: branchId,
    points: -points,
    type: 'redeem',
    reference: `REDM-${Date.now().toString().slice(-6)}`,
    notes: notes || `استبدال ${points} نقطة من برنامج الولاء`,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    points_balance_after: acc.current_points,
  };

  const txs = getStoredLoyaltyTransactions();
  txs.unshift(tx);
  setStoredLoyaltyTransactions(txs);

  return { success: true, transaction: tx, account: acc };
}

export function adjustLoyaltyPoints(params: {
  patientId: string;
  organizationId: string;
  branchId?: string;
  points: number; // positive or negative
  notes: string;
  createdBy: string;
  actorRole?: RoleKey;
}): { success: boolean; transaction?: LoyaltyTransaction; account?: PatientLoyaltyAccount; error?: string } {
  const { patientId, organizationId, branchId, points, notes, createdBy, actorRole } = params;

  if (actorRole && !['center_manager', 'branch_manager', 'receptionist'].includes(actorRole)) {
    return { success: false, error: 'غير مصرح لك بتعديل نقاط الولاء' };
  }

  if (!notes || !notes.trim()) {
    return { success: false, error: 'يرجى كتابة سبب التعديل الإداري لنقاط الولاء' };
  }

  const accounts = getStoredLoyaltyAccounts();
  let accIndex = accounts.findIndex((a) => a.patient_id === patientId && a.organization_id === organizationId);
  let acc: PatientLoyaltyAccount;

  if (accIndex >= 0) {
    acc = { ...accounts[accIndex] };
  } else {
    acc = { patient_id: patientId, organization_id: organizationId, total_points_earned: 0, total_points_redeemed: 0, current_points: 0, updated_at: new Date().toISOString() };
  }

  const newPoints = acc.current_points + points;
  if (newPoints < 0) {
    return { success: false, error: `التعديل يتسبب في رصيد نقاط سالب (${newPoints} نقطة)` };
  }

  acc.current_points = newPoints;
  if (points > 0) acc.total_points_earned += points;
  else acc.total_points_redeemed += Math.abs(points);
  acc.updated_at = new Date().toISOString();

  if (accIndex >= 0) {
    accounts[accIndex] = acc;
  } else {
    accounts.push(acc);
  }
  setStoredLoyaltyAccounts(accounts);

  const tx: LoyaltyTransaction = {
    id: `ltx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    patient_id: patientId,
    organization_id: organizationId,
    branch_id: branchId,
    points,
    type: 'adjustment',
    reference: `ADJ-${Date.now().toString().slice(-6)}`,
    notes: notes.trim(),
    created_by: createdBy,
    created_at: new Date().toISOString(),
    points_balance_after: newPoints,
  };

  const txs = getStoredLoyaltyTransactions();
  txs.unshift(tx);
  setStoredLoyaltyTransactions(txs);

  return { success: true, transaction: tx, account: acc };
}

// ============================================================================
// 4. INSURANCE PRIOR APPROVAL WORKFLOW ENGINE
// ============================================================================

export function getStoredPriorApprovals(orgId?: string, branchId?: string): InsurancePriorApproval[] {
  const raw = safeStorage.getItem(FINANCE_STORAGE_KEYS.PRIOR_APPROVALS);
  let list: InsurancePriorApproval[] = raw ? JSON.parse(raw) : [];
  if (!raw || list.length === 0) {
    list = SEED_PRIOR_APPROVALS;
    safeStorage.setItem(FINANCE_STORAGE_KEYS.PRIOR_APPROVALS, JSON.stringify(list));
  }
  return list.filter(
    (pa) => (!orgId || pa.organization_id === orgId) && (!branchId || pa.branch_id === branchId)
  );
}

export function setStoredPriorApprovals(approvals: InsurancePriorApproval[]): void {
  safeStorage.setItem(FINANCE_STORAGE_KEYS.PRIOR_APPROVALS, JSON.stringify(approvals));
}

export function createInsurancePriorApproval(params: {
  organizationId: string;
  branchId: string;
  patientId: string;
  insuranceCompanyId: string;
  insurancePlanId?: string;
  policyNumber?: string;
  doctorId?: string;
  appointmentId?: string;
  treatmentPlanId?: string;
  items: Array<{ serviceId: string; requestedAmount: number; copayPercentage?: number }>;
  notes?: string;
  createdBy: string;
}): InsurancePriorApproval {
  const {
    organizationId,
    branchId,
    patientId,
    insuranceCompanyId,
    insurancePlanId,
    policyNumber,
    doctorId,
    appointmentId,
    treatmentPlanId,
    items,
    notes,
    createdBy,
  } = params;

  const patients = getStoredPatients();
  const pat = patients.find((p) => p.id === patientId);
  const patientName = pat ? `${pat.first_name} ${pat.last_name}`.trim() : 'Patient';

  const companies = getStoredInsuranceCompanies();
  const company = companies.find((c) => c.id === insuranceCompanyId);
  const companyName = company ? company.name_ar : 'Insurance Company';

  const plans = getStoredInsurancePlans();
  const plan = insurancePlanId ? plans.find((p) => p.id === insurancePlanId) : undefined;

  const services = getStoredServices();
  const allPAs = getStoredPriorApprovals();

  let totalRequested = 0;
  const paItems: InsurancePriorApprovalItem[] = items.map((it, idx) => {
    const srv = services.find((s) => s.id === it.serviceId);
    totalRequested += it.requestedAmount;
    return {
      id: `pa_item_${Date.now()}_${idx}`,
      service_id: it.serviceId,
      service_code: srv?.code || 'SRV-GEN',
      service_name_ar: srv?.name_ar || 'خدمة سنية',
      service_name_en: srv?.name_en || 'Dental Service',
      requested_amount: it.requestedAmount,
      approved_amount: it.requestedAmount,
      copay_percentage: it.copayPercentage || 20,
      status: 'pending_approval',
    };
  });

  const approvalNumber = `APR-${new Date().getFullYear()}-${String(allPAs.length + 1).padStart(3, '0')}`;
  const now = new Date().toISOString();

  const pa: InsurancePriorApproval = {
    id: `pa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    approval_number: approvalNumber,
    organization_id: organizationId,
    branch_id: branchId,
    patient_id: patientId,
    patient_name: patientName,
    insurance_company_id: insuranceCompanyId,
    insurance_company_name: companyName,
    insurance_plan_id: insurancePlanId,
    insurance_plan_name: plan?.name_ar,
    policy_number: policyNumber,
    doctor_id: doctorId,
    appointment_id: appointmentId,
    treatment_plan_id: treatmentPlanId,
    items: paItems,
    total_requested_amount: totalRequested,
    total_approved_amount: totalRequested,
    status: 'pending_approval',
    requested_date: now,
    notes,
    created_by: createdBy,
    created_at: now,
    updated_at: now,
  };

  allPAs.unshift(pa);
  setStoredPriorApprovals(allPAs);
  return pa;
}

export function updatePriorApprovalStatus(params: {
  approvalId: string;
  organizationId: string;
  newStatus: PriorApprovalStatus;
  itemApprovals?: Array<{ itemId: string; status: PriorApprovalStatus; approvedAmount?: number; rejectionReason?: string }>;
  notes?: string;
  actorRole?: string;
}): { success: boolean; approval?: InsurancePriorApproval; error?: string } {
  const { approvalId, organizationId, newStatus, itemApprovals, notes } = params;

  const allPAs = getStoredPriorApprovals();
  const index = allPAs.findIndex((p) => p.id === approvalId && p.organization_id === organizationId);
  if (index === -1) {
    return { success: false, error: 'طلب الموافقة المسبقة غير موجود' };
  }

  const pa = { ...allPAs[index] };
  pa.status = newStatus;
  pa.updated_at = new Date().toISOString();
  if (notes) pa.notes = notes;

  if (itemApprovals && itemApprovals.length > 0) {
    let totalApproved = 0;
    pa.items = pa.items.map((item) => {
      const update = itemApprovals.find((u) => u.itemId === item.id);
      if (update) {
        const itemAppAmt = update.approvedAmount !== undefined ? update.approvedAmount : item.requested_amount;
        if (update.status === 'approved' || update.status === 'partially_approved') {
          totalApproved += itemAppAmt;
        }
        return {
          ...item,
          status: update.status,
          approved_amount: itemAppAmt,
          rejection_reason: update.rejectionReason,
        };
      }
      return item;
    });
    pa.total_approved_amount = totalApproved;
  }

  allPAs[index] = pa;
  setStoredPriorApprovals(allPAs);
  return { success: true, approval: pa };
}

// ============================================================================
// 5. INSURANCE CLAIMS & BATCH SETTLEMENT ENGINE
// ============================================================================

export function getStoredClaims(orgId?: string, branchId?: string): InsuranceClaim[] {
  const raw = safeStorage.getItem(FINANCE_STORAGE_KEYS.CLAIMS);
  let list: InsuranceClaim[] = raw ? JSON.parse(raw) : [];
  if (!raw || list.length === 0) {
    list = SEED_CLAIMS;
    safeStorage.setItem(FINANCE_STORAGE_KEYS.CLAIMS, JSON.stringify(list));
  }
  return list.filter(
    (c) => (!orgId || c.organization_id === orgId) && (!branchId || c.branch_id === branchId)
  );
}

export function setStoredClaims(claims: InsuranceClaim[]): void {
  safeStorage.setItem(FINANCE_STORAGE_KEYS.CLAIMS, JSON.stringify(claims));
}

export function getStoredClaimBatches(orgId?: string): ClaimBatch[] {
  const raw = safeStorage.getItem(FINANCE_STORAGE_KEYS.CLAIM_BATCHES);
  const list: ClaimBatch[] = raw ? JSON.parse(raw) : [];
  if (orgId) {
    return list.filter((b) => b.organization_id === orgId);
  }
  return list;
}

export function setStoredClaimBatches(batches: ClaimBatch[]): void {
  safeStorage.setItem(FINANCE_STORAGE_KEYS.CLAIM_BATCHES, JSON.stringify(batches));
}

export function createInsuranceClaimFromInvoice(params: {
  invoiceId: string;
  organizationId: string;
  branchId: string;
  createdBy: string;
}): { success: boolean; claim?: InsuranceClaim; error?: string } {
  const { invoiceId, organizationId, branchId, createdBy } = params;

  const invoices = getStoredInvoices(organizationId);
  const invoice = invoices.find((i) => i.id === invoiceId);
  if (!invoice) {
    return { success: false, error: 'الفاتورة غير موجودة' };
  }

  if (invoice.patient_type !== 'insured' || !invoice.insurance_company_id) {
    return { success: false, error: 'هذه الفاتورة نقداً ولا تتضمن تغطية تأمينية صالحة للمطالبة' };
  }

  const existingClaims = getStoredClaims(organizationId);
  const alreadyClaimed = existingClaims.some((c) => c.invoice_id === invoiceId);
  if (alreadyClaimed) {
    return { success: false, error: 'تم إنشاء مطالبة تأمينية لهذه الفاتورة سابقاً' };
  }

  let totalClaimed = 0;
  const claimItems: InsuranceClaimItem[] = invoice.items.map((item) => {
    const itemClaimed = item.insurance_amount || 0;
    totalClaimed += itemClaimed;
    return {
      id: `clm_item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      invoice_id: invoiceId,
      invoice_item_id: item.id,
      service_id: item.service_id,
      service_code: item.service_code,
      service_name_ar: item.service_name_ar,
      service_name_en: item.service_name_en,
      gross_amount: item.gross_amount,
      claimed_amount: itemClaimed,
      approved_amount: itemClaimed,
      paid_amount: 0,
      write_off_amount: 0,
      patient_transfer_amount: 0,
      status: 'submitted',
    };
  });

  const claimNumber = `CLM-${new Date().getFullYear()}-${String(existingClaims.length + 1).padStart(3, '0')}`;
  const now = new Date().toISOString();

  const claim: InsuranceClaim = {
    id: `clm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    claim_number: claimNumber,
    organization_id: organizationId,
    branch_id: branchId,
    patient_id: invoice.patient_id,
    patient_name: invoice.patient_name,
    insurance_company_id: invoice.insurance_company_id,
    insurance_company_name: invoice.insurance_company_name,
    policy_number: invoice.policy_number,
    invoice_id: invoiceId,
    items: claimItems,
    total_claimed_amount: totalClaimed,
    total_approved_amount: totalClaimed,
    total_paid_amount: 0,
    total_write_off_amount: 0,
    total_patient_transfer_amount: 0,
    status: 'submitted',
    submission_date: now,
    created_by: createdBy,
    created_at: now,
    updated_at: now,
  };

  existingClaims.unshift(claim);
  setStoredClaims(existingClaims);
  return { success: true, claim };
}

export function createClaimBatch(params: {
  organizationId: string;
  branchId: string;
  insuranceCompanyId: string;
  claimIds: string[];
  notes?: string;
  createdBy: string;
}): ClaimBatch {
  const { organizationId, branchId, insuranceCompanyId, claimIds, notes, createdBy } = params;

  const claims = getStoredClaims(organizationId);
  const selectedClaims = claims.filter((c) => claimIds.includes(c.id));

  const companies = getStoredInsuranceCompanies();
  const company = companies.find((c) => c.id === insuranceCompanyId);

  let totalClaimed = 0;
  let totalApproved = 0;

  selectedClaims.forEach((c) => {
    totalClaimed += c.total_claimed_amount;
    totalApproved += c.total_approved_amount;
  });

  const allBatches = getStoredClaimBatches();
  const batchNumber = `BATCH-${new Date().getFullYear()}-${String(allBatches.length + 1).padStart(3, '0')}`;
  const now = new Date().toISOString();

  const batch: ClaimBatch = {
    id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    batch_number: batchNumber,
    organization_id: organizationId,
    branch_id: branchId,
    insurance_company_id: insuranceCompanyId,
    insurance_company_name: company?.name_ar,
    claim_ids: claimIds,
    total_claims_count: selectedClaims.length,
    total_claimed_amount: totalClaimed,
    total_approved_amount: totalApproved,
    total_settled_amount: 0,
    status: 'submitted',
    submission_date: now,
    notes,
    created_by: createdBy,
    created_at: now,
    updated_at: now,
  };

  allBatches.unshift(batch);
  setStoredClaimBatches(allBatches);

  // Link claims to this batch
  selectedClaims.forEach((c) => {
    c.batch_id = batch.id;
    c.status = 'in_review';
    c.updated_at = now;
  });
  setStoredClaims(claims);

  return batch;
}

export function postClaimSettlement(params: {
  organizationId: string;
  branchId: string;
  batchId?: string;
  claimId: string;
  payoutAmount: number; // actual payout from insurer
  writeOffAmount?: number;
  rejectionReason?: string;
  transferToPatientBalance?: boolean; // if rejected/unpaid portion transferred to patient debt
  postedBy: string;
  actorRole?: string;
}): { success: boolean; claim?: InsuranceClaim; error?: string } {
  const {
    organizationId,
    claimId,
    payoutAmount,
    writeOffAmount = 0,
    rejectionReason,
    transferToPatientBalance = false,
    postedBy,
    actorRole,
  } = params;

  if (actorRole && !['center_manager', 'branch_manager', 'receptionist'].includes(actorRole)) {
    return { success: false, error: 'غير مصرح لك بتسوية المطالبات التأمينية' };
  }

  const claims = getStoredClaims(organizationId);
  const index = claims.findIndex((c) => c.id === claimId);
  if (index === -1) {
    return { success: false, error: 'المطالبة غير موجودة' };
  }

  const claim = { ...claims[index] };
  const now = new Date().toISOString();

  const claimed = claim.total_claimed_amount;
  const shortfall = Math.max(0, claimed - payoutAmount - writeOffAmount);

  claim.total_paid_amount = payoutAmount;
  claim.total_write_off_amount = writeOffAmount;
  claim.total_patient_transfer_amount = transferToPatientBalance ? shortfall : 0;
  claim.settlement_date = now;
  claim.updated_at = now;

  if (payoutAmount >= claimed) {
    claim.status = 'paid';
  } else if (payoutAmount > 0) {
    claim.status = 'partially_paid';
  } else {
    claim.status = 'rejected';
    claim.rejection_reason = rejectionReason || 'تم رفض المطالبة من شركة التأمين';
  }

  claims[index] = claim;
  setStoredClaims(claims);

  // If rejected/unpaid amount transferred to patient balance, update invoice remaining balance!
  if (transferToPatientBalance && shortfall > 0) {
    const invoices = getStoredInvoices(organizationId);
    const invIndex = invoices.findIndex((i) => i.id === claim.invoice_id);
    if (invIndex >= 0) {
      const inv = { ...invoices[invIndex] };
      inv.patient_total_amount += shortfall;
      inv.insurance_total_amount = Math.max(0, inv.insurance_total_amount - shortfall);
      inv.remaining_balance += shortfall;
      inv.status = 'unpaid';
      inv.notes = `${inv.notes || ''} [تسوية تأمينية: تم تحويل مبلغ ${shortfall} ج.م على حساب المريض لرفض التأمين سداده]`.trim();
      invoices[invIndex] = inv;
      setStoredInvoices(invoices);
    }
  }

  return { success: true, claim };
}

// ============================================================================
// 6. PATIENT FINANCIAL SUMMARY & CHRONOLOGICAL ACCOUNT STATEMENT
// ============================================================================

export function getPatientFinancialSummary(patientId: string, orgId: string): PatientFinancialSummary {
  const invoices = getStoredInvoices(orgId).filter((i) => i.patient_id === patientId && i.status !== 'cancelled');
  const wallet = getPatientWallet(patientId, orgId);
  const loyalty = getPatientLoyaltyAccount(patientId, orgId);

  let currentOutstanding = 0;
  let totalInvoiced = 0;
  let totalPaid = 0;
  let insuranceCovered = 0;
  let patientCopay = 0;

  invoices.forEach((inv) => {
    currentOutstanding += inv.remaining_balance || 0;
    totalInvoiced += inv.subtotal_amount || 0;
    totalPaid += inv.paid_amount || 0;
    insuranceCovered += inv.insurance_total_amount || 0;
    patientCopay += inv.patient_total_amount || 0;
  });

  return {
    patient_id: patientId,
    organization_id: orgId,
    current_outstanding_balance: Math.round(currentOutstanding * 100) / 100,
    total_invoiced: Math.round(totalInvoiced * 100) / 100,
    total_paid: Math.round(totalPaid * 100) / 100,
    insurance_covered_amount: Math.round(insuranceCovered * 100) / 100,
    patient_copay_amount: Math.round(patientCopay * 100) / 100,
    wallet_balance: Math.round(wallet.balance * 100) / 100,
    loyalty_points: loyalty.current_points,
  };
}

export function getPatientAccountStatement(patientId: string, orgId: string): AccountStatementItem[] {
  const invoices = getStoredInvoices(orgId).filter((i) => i.patient_id === patientId && i.status !== 'cancelled');
  const walletTxs = getStoredWalletTransactions(orgId, patientId);

  const items: AccountStatementItem[] = [];

  // Add Invoices (Debit -> Increases Patient Debt)
  invoices.forEach((inv) => {
    items.push({
      id: `stmt_inv_${inv.id}`,
      date: inv.created_at,
      type: 'invoice',
      reference_number: inv.invoice_number,
      description_ar: `فاتورة خدمات علاجية رقم ${inv.invoice_number}`,
      description_en: `Medical Services Invoice ${inv.invoice_number}`,
      debit_amount: inv.patient_total_amount,
      credit_amount: 0,
      running_balance: 0,
      invoice_id: inv.id,
    });

    // Add Invoice Payments (Credit -> Reduces Patient Debt)
    if (inv.payments && inv.payments.length > 0) {
      inv.payments.forEach((p) => {
        items.push({
          id: `stmt_pay_${p.id}`,
          date: p.created_at,
          type: 'payment',
          reference_number: p.reference_number || inv.invoice_number,
          description_ar: `سداد نقدي/إلكتروني عن فاتورة رقم ${inv.invoice_number} (${p.payment_method})`,
          description_en: `Payment for Invoice ${inv.invoice_number} (${p.payment_method})`,
          debit_amount: 0,
          credit_amount: p.amount,
          running_balance: 0,
          invoice_id: inv.id,
          payment_id: p.id,
        });
      });
    }
  });

  // Add Wallet Transactions
  walletTxs.forEach((wtx) => {
    if (wtx.type === 'credit') {
      items.push({
        id: `stmt_wtx_${wtx.id}`,
        date: wtx.created_at,
        type: 'wallet_topup',
        reference_number: wtx.reference || 'WALLET-TOPUP',
        description_ar: `إيداع رصيد بالمحفظة (${wtx.notes || ''})`,
        description_en: `Wallet Credit Top-Up (${wtx.notes || ''})`,
        debit_amount: 0,
        credit_amount: 0, // Wallet balance is prepaid asset, does not change patient invoice debt directly
        running_balance: 0,
      });
    }
  });

  // Sort Chronologically (oldest to newest)
  items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate Running Outstanding Balance
  let runningBal = 0;
  items.forEach((item) => {
    runningBal = Math.round((runningBal + item.debit_amount - item.credit_amount) * 100) / 100;
    item.running_balance = runningBal;
  });

  return items;
}

// ============================================================================
// 7. SECURE PATIENT FINANCIAL PORTAL WRAPPER (RLS / PRIVACY GUARANTEE)
// ============================================================================

export function getPatientFinancialPortalData(
  authenticatedPatientId: string,
  targetPatientId: string,
  organizationId: string
): {
  allowed: boolean;
  error?: string;
  patientProfile?: Patient;
  summary?: PatientFinancialSummary;
  statement?: AccountStatementItem[];
  invoices?: Invoice[];
  wallet?: PatientWallet;
  walletTransactions?: WalletTransaction[];
  loyaltyAccount?: PatientLoyaltyAccount;
  loyaltyTransactions?: LoyaltyTransaction[];
  priorApprovals?: InsurancePriorApproval[];
} {
  // 1. Evaluate Server RLS Authorization (Patient Self OR Authorized Guardian / Family Shared Mobile)
  const rls = simulatePatientRLS(authenticatedPatientId, targetPatientId, organizationId);
  if (!rls.allowed || !rls.patient) {
    return {
      allowed: false,
      error: rls.error || 'RLS Authorization Denied: You do not have permission to view financial records for this profile.',
    };
  }

  // 2. Retrieve Patient Financial Data
  const summary = getPatientFinancialSummary(targetPatientId, organizationId);
  const statement = getPatientAccountStatement(targetPatientId, organizationId);
  const rawInvoices = getStoredInvoices(organizationId).filter(
    (i) => i.patient_id === targetPatientId && i.status !== 'cancelled'
  );

  // SANITIZATION GUARD: Strictly strip out internal supplier costs, doctor commissions, and clinic net margins!
  const sanitizedInvoices: Invoice[] = rawInvoices.map((inv) => {
    return {
      ...inv,
      total_lab_cost: undefined,
      total_material_cost: undefined,
      total_doctor_commission: undefined,
      clinic_net_amount: undefined,
      commission_details: undefined,
      items: inv.items.map((it) => ({
        ...it,
        commission_percentage: undefined,
        commission_base: undefined,
        calculated_commission: undefined,
        lab_cost: undefined,
        material_cost: undefined,
        supplier_vendor: undefined,
        clinic_net_amount: undefined,
      })),
    };
  });

  const wallet = getPatientWallet(targetPatientId, organizationId);
  const walletTransactions = getStoredWalletTransactions(organizationId, targetPatientId);
  const loyaltyAccount = getPatientLoyaltyAccount(targetPatientId, organizationId);
  const loyaltyTransactions = getStoredLoyaltyTransactions(organizationId, targetPatientId);
  const priorApprovals = getStoredPriorApprovals(organizationId).filter(
    (pa) => pa.patient_id === targetPatientId
  );

  return {
    allowed: true,
    patientProfile: rls.patient,
    summary,
    statement,
    invoices: sanitizedInvoices,
    wallet,
    walletTransactions,
    loyaltyAccount,
    loyaltyTransactions,
    priorApprovals,
  };
}
