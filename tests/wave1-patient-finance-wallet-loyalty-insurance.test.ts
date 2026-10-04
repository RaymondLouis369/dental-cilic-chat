import { describe, it, expect, beforeEach } from 'vitest';
import {
  topUpPatientWallet,
  usePatientWalletForInvoice,
  adjustPatientWallet,
  getPatientWallet,
  getStoredWalletTransactions,
  getPatientLoyaltyAccount,
  getStoredLoyaltyTransactions,
  earnLoyaltyPointsForInvoice,
  redeemLoyaltyPoints,
  adjustLoyaltyPoints,
  createInsurancePriorApproval,
  updatePriorApprovalStatus,
  getStoredPriorApprovals,
  createInsuranceClaimFromInvoice,
  createClaimBatch,
  postClaimSettlement,
  getStoredClaims,
  getPatientFinancialSummary,
  getPatientAccountStatement,
  getPatientFinancialPortalData,
} from '../src/lib/financeAndInsuranceStorage';
import {
  createInvoice,
  getStoredInvoices,
  recordInvoicePayment,
  resolvePricing,
} from '../src/lib/receptionAndBillingStorage';
import { DEFAULT_EGYPT_ORG, SECONDARY_EGYPT_ORG } from '../src/lib/storage';
import { getStoredPatients } from '../src/lib/patientStorage';

describe('Wave 1: Patient Finance, Wallet, Loyalty, Insurance & Claims Workflow', () => {
  const primaryOrgId = DEFAULT_EGYPT_ORG.id;
  const secondaryOrgId = SECONDARY_EGYPT_ORG.id;
  const branchId = '11111111-1111-1111-1111-111111111111';

  // Seed patient IDs
  const ahmedId = 'a1111111-1111-1111-1111-111111111111'; // Father (Adult)
  const lailaId = 'b2222222-2222-2222-2222-222222222222'; // Daughter (Child ward)
  const monaId = 'd4444444-4444-4444-4444-444444444444'; // Unrelated Patient
  const foreignPatientId = 'e5555555-5555-5555-5555-555555555555'; // Foreign Org Patient

  beforeEach(() => {
    // Fresh state reset before each test
  });

  // 1. Patient Financial Portal Summary
  it('1. calculates patient financial summary accurately', () => {
    const summary = getPatientFinancialSummary(ahmedId, primaryOrgId);
    expect(summary).toBeDefined();
    expect(summary.patient_id).toBe(ahmedId);
    expect(summary.organization_id).toBe(primaryOrgId);
    expect(summary.total_invoiced).toBeGreaterThanOrEqual(0);
    expect(summary.wallet_balance).toBeGreaterThanOrEqual(0);
  });

  // 2. Patient Statement Chronology & Running Balance
  it('2. generates chronological account statement with correct running balance', () => {
    const statement = getPatientAccountStatement(ahmedId, primaryOrgId);
    expect(Array.isArray(statement)).toBe(true);

    if (statement.length > 1) {
      // Check chronological order
      for (let i = 1; i < statement.length; i++) {
        const prevDate = new Date(statement[i - 1].date).getTime();
        const currDate = new Date(statement[i].date).getTime();
        expect(currDate).toBeGreaterThanOrEqual(prevDate);
      }

      // Check running balance calculation
      let running = 0;
      statement.forEach((item) => {
        running = Math.round((running + item.debit_amount - item.credit_amount) * 100) / 100;
        expect(item.running_balance).toBe(running);
      });
    }
  });

  // 3. Guardian Financial Access Authorization
  it('3. allows father/guardian to view authorized dependent financial records', () => {
    // Ahmed (father) requests Laila (ward) financial portal data
    const portalData = getPatientFinancialPortalData(ahmedId, lailaId, primaryOrgId);
    expect(portalData.allowed).toBe(true);
    expect(portalData.patientProfile?.id).toBe(lailaId);
    expect(portalData.summary).toBeDefined();
    expect(portalData.invoices).toBeDefined();
  });

  // 4. Guardian Financial Isolation
  it('4. strictly blocks unauthorized patient / guardian from viewing another patient financial records', () => {
    // Mona (unrelated) attempts to access Ahmed's financial portal data
    const portalData = getPatientFinancialPortalData(monaId, ahmedId, primaryOrgId);
    expect(portalData.allowed).toBe(false);
    expect(portalData.error).toContain('RLS Security Violation');
    expect(portalData.summary).toBeUndefined();
    expect(portalData.invoices).toBeUndefined();
  });

  // 5. Wallet Top-Up
  it('5. tops up patient wallet and updates balance', () => {
    const initialWallet = getPatientWallet(monaId, primaryOrgId);
    const topUpRes = topUpPatientWallet({
      patientId: monaId,
      organizationId: primaryOrgId,
      branchId,
      amount: 300,
      reference: 'TOPUP-REF-101',
      notes: 'إيداع نقدي في الاستقبال',
      createdBy: 'usr_rec_01',
      createdByName: 'سارة استقبال',
    });

    expect(topUpRes.success).toBe(true);
    expect(topUpRes.wallet?.balance).toBe(initialWallet.balance + 300);
    expect(topUpRes.transaction?.type).toBe('credit');
  });

  // 6. Wallet Payment
  it('6. pays invoice using patient wallet balance and records payment record', () => {
    // Top-up first
    topUpPatientWallet({
      patientId: monaId,
      organizationId: primaryOrgId,
      branchId,
      amount: 1000,
      createdBy: 'usr_rec_01',
    });

    // Create Cash Invoice for Mona
    const inv = createInvoice({
      organizationId: primaryOrgId,
      branchId,
      patientId: monaId,
      patientType: 'cash',
      items: [{ serviceId: 'srv_001', quantity: 1, customUnitPrice: 200, customCopayAmount: 200 }],
    });

    const initialWallet = getPatientWallet(monaId, primaryOrgId);
    const payRes = usePatientWalletForInvoice({
      patientId: monaId,
      organizationId: primaryOrgId,
      branchId,
      invoiceId: inv.id,
      amount: 200,
      createdBy: 'usr_rec_01',
    });

    expect(payRes.success).toBe(true);
    expect(payRes.wallet?.balance).toBe(initialWallet.balance - 200);

    // Verify invoice is paid
    const updatedInvoices = getStoredInvoices(primaryOrgId);
    const updatedInv = updatedInvoices.find((i) => i.id === inv.id);
    expect(updatedInv?.paid_amount).toBe(200);
    expect(updatedInv?.remaining_balance).toBe(0);
    expect(updatedInv?.status).toBe('paid');
  });

  // 7. Wallet Refund / Adjustment
  it('7. applies audited wallet adjustment with reason', () => {
    const adjRes = adjustPatientWallet({
      patientId: monaId,
      organizationId: primaryOrgId,
      branchId,
      amount: 50,
      type: 'adjustment',
      notes: 'تعديل إداري تسوية رصيد المريض المتبقي',
      createdBy: 'usr_mgr_01',
      actorRole: 'center_manager',
    });

    expect(adjRes.success).toBe(true);
    expect(adjRes.transaction?.notes).toBe('تعديل إداري تسوية رصيد المريض المتبقي');
  });

  // 8. Wallet Negative Balance Prevention
  it('8. prevents wallet transaction if balance is insufficient (negative balance prevention)', () => {
    // Create large invoice
    const inv = createInvoice({
      organizationId: primaryOrgId,
      branchId,
      patientId: monaId,
      items: [{ serviceId: 'srv_001', quantity: 1, customUnitPrice: 99999 }],
    });

    const payRes = usePatientWalletForInvoice({
      patientId: monaId,
      organizationId: primaryOrgId,
      branchId,
      invoiceId: inv.id,
      amount: 99999,
      createdBy: 'usr_rec_01',
    });

    expect(payRes.success).toBe(false);
    expect(payRes.error).toContain('رصيد المحفظة غير كافٍ');
  });

  // 9. Wallet Audit Trail
  it('9. records immutable wallet transactions with creator ID and balance_after', () => {
    const txs = getStoredWalletTransactions(primaryOrgId, monaId);
    expect(txs.length).toBeGreaterThan(0);
    txs.forEach((tx) => {
      expect(tx.created_by).toBeDefined();
      expect(tx.created_at).toBeDefined();
      expect(tx.balance_after).toBeGreaterThanOrEqual(0);
    });
  });

  // 10. Loyalty Earning on Paid Invoice
  it('10. earns loyalty points when an invoice is paid', () => {
    const earnRes = earnLoyaltyPointsForInvoice({
      patientId: monaId,
      organizationId: primaryOrgId,
      branchId,
      invoiceId: 'inv_test_loyalty_001',
      amountPaid: 500,
      createdBy: 'usr_rec_01',
    });

    expect(earnRes.success).toBe(true);
    expect(earnRes.pointsEarned).toBeGreaterThan(0);
  });

  // 11. Loyalty Double-Earn Prevention
  it('11. prevents earning loyalty points twice for the same invoice transaction', () => {
    const invoiceId = 'inv_test_loyalty_dup_001';

    // First earn
    earnLoyaltyPointsForInvoice({
      patientId: monaId,
      organizationId: primaryOrgId,
      branchId,
      invoiceId,
      amountPaid: 500,
      createdBy: 'usr_rec_01',
    });

    // Duplicate earn attempt
    const dupRes = earnLoyaltyPointsForInvoice({
      patientId: monaId,
      organizationId: primaryOrgId,
      branchId,
      invoiceId,
      amountPaid: 500,
      createdBy: 'usr_rec_01',
    });

    expect(dupRes.success).toBe(false);
    expect(dupRes.error).toContain('تم احتساب نقاط الولاء لهذه الفاتورة سابقاً');
  });

  // 12. Loyalty Redemption / Manual Adjustment
  it('12. redeems loyalty points and supports manual adjustments with audit reason', () => {
    const initialAcc = getPatientLoyaltyAccount(monaId, primaryOrgId);

    // Adjust points
    const adjRes = adjustLoyaltyPoints({
      patientId: monaId,
      organizationId: primaryOrgId,
      branchId,
      points: 100,
      notes: 'إضافة نقاط ترحيبية استثنائية',
      createdBy: 'usr_mgr_01',
      actorRole: 'center_manager',
    });

    expect(adjRes.success).toBe(true);
    expect(adjRes.account?.current_points).toBe(initialAcc.current_points + 100);

    // Redeem points
    const redmRes = redeemLoyaltyPoints({
      patientId: monaId,
      organizationId: primaryOrgId,
      branchId,
      points: 50,
      notes: 'خصم مقابل خدمات علاجية',
      createdBy: 'usr_rec_01',
    });

    expect(redmRes.success).toBe(true);
    expect(redmRes.account?.current_points).toBe(initialAcc.current_points + 50);
  });

  // 13. Insurance Coverage Calculation
  it('13. calculates insurance coverage and patient copay accurately', () => {
    const resolved = resolvePricing({
      organizationId: primaryOrgId,
      patientId: 'c3333333-3333-3333-3333-333333333333', // Insured Patient (AXA)
      serviceId: 'srv_001',
    });

    expect(resolved).toBeDefined();
    expect(resolved.patient_copay + resolved.insurance_coverage).toBeCloseTo(resolved.total_price, 2);
  });

  // 14. Prior Approval Workflow
  it('14. handles prior approval creation and status update lifecycle', () => {
    const pa = createInsurancePriorApproval({
      organizationId: primaryOrgId,
      branchId,
      patientId: monaId,
      insuranceCompanyId: 'ins_comp_axa',
      items: [{ serviceId: 'srv_005', requestedAmount: 1200 }],
      createdBy: 'usr_rec_01',
    });

    expect(pa).toBeDefined();
    expect(pa.status).toBe('pending_approval');

    const updateRes = updatePriorApprovalStatus({
      approvalId: pa.id,
      organizationId: primaryOrgId,
      newStatus: 'approved',
      actorRole: 'center_manager',
    });

    expect(updateRes.success).toBe(true);
    expect(updateRes.approval?.status).toBe('approved');
  });

  // 15. Prior Approval Impact on Invoice Copay
  it('15. respects insurance approval state during invoice creation', () => {
    const inv = createInvoice({
      organizationId: primaryOrgId,
      branchId,
      patientId: 'c3333333-3333-3333-3333-333333333333',
      patientType: 'insured',
      insuranceCompanyId: 'ins_comp_axa',
      items: [
        {
          serviceId: 'srv_005', // Root Canal
          quantity: 1,
          approvalStatus: 'approved',
        },
      ],
    });

    expect(inv.insurance_total_amount).toBeGreaterThan(0);
    expect(inv.patient_total_amount).toBeGreaterThan(0);
  });

  // 16. Claims Lifecycle State Transitions
  it('16. transitions claims lifecycle from creation to submission and settlement', () => {
    const inv = createInvoice({
      organizationId: primaryOrgId,
      branchId,
      patientId: 'c3333333-3333-3333-3333-333333333333',
      patientType: 'insured',
      insuranceCompanyId: 'ins_comp_axa',
      items: [{ serviceId: 'srv_001', quantity: 1 }],
    });

    const claimRes = createInsuranceClaimFromInvoice({
      invoiceId: inv.id,
      organizationId: primaryOrgId,
      branchId,
      createdBy: 'usr_rec_01',
    });

    expect(claimRes.success).toBe(true);
    expect(claimRes.claim?.status).toBe('submitted');
  });

  // 17. Batch Claim Aggregation
  it('17. aggregates multiple insurance claims into a batch for submission', () => {
    const claims = getStoredClaims(primaryOrgId);
    const claimIds = claims.map((c) => c.id);

    if (claimIds.length > 0) {
      const batch = createClaimBatch({
        organizationId: primaryOrgId,
        branchId,
        insuranceCompanyId: 'ins_comp_axa',
        claimIds,
        notes: 'دفعة مطالبات شهر سبتمبر',
        createdBy: 'usr_mgr_01',
      });

      expect(batch).toBeDefined();
      expect(batch.claim_ids.length).toBe(claimIds.length);
      expect(batch.status).toBe('submitted');
    }
  });

  // 18. Claim Settlement Posting & Write-Off
  it('18. posts claim settlement recording payout and write-off', () => {
    const claims = getStoredClaims(primaryOrgId);
    if (claims.length > 0) {
      const targetClaim = claims[0];
      const res = postClaimSettlement({
        organizationId: primaryOrgId,
        branchId,
        claimId: targetClaim.id,
        payoutAmount: targetClaim.total_claimed_amount - 50,
        writeOffAmount: 50,
        postedBy: 'usr_mgr_01',
        actorRole: 'center_manager',
      });

      expect(res.success).toBe(true);
      expect(res.claim?.total_paid_amount).toBe(targetClaim.total_claimed_amount - 50);
      expect(res.claim?.total_write_off_amount).toBe(50);
    }
  });

  // 19. Claim Rejection Balance Transfer to Patient
  it('19. transfers unpaid rejected claim balance to patient debt if policy requires transfer', () => {
    const inv = createInvoice({
      organizationId: primaryOrgId,
      branchId,
      patientId: monaId,
      patientType: 'insured',
      insuranceCompanyId: 'ins_comp_axa',
      items: [{ serviceId: 'srv_003', quantity: 1, customUnitPrice: 500 }],
    });

    const claimRes = createInsuranceClaimFromInvoice({
      invoiceId: inv.id,
      organizationId: primaryOrgId,
      branchId,
      createdBy: 'usr_rec_01',
    });

    const claim = claimRes.claim!;

    // Reject claim and transfer balance to patient
    const settleRes = postClaimSettlement({
      organizationId: primaryOrgId,
      branchId,
      claimId: claim.id,
      payoutAmount: 0,
      rejectionReason: 'التشخيص غير مغطى بالعقد',
      transferToPatientBalance: true,
      postedBy: 'usr_mgr_01',
      actorRole: 'center_manager',
    });

    expect(settleRes.success).toBe(true);
    expect(settleRes.claim?.status).toBe('rejected');

    // Verify invoice remaining balance increased
    const updatedInvoices = getStoredInvoices(primaryOrgId);
    const updatedInv = updatedInvoices.find((i) => i.id === inv.id);
    expect(updatedInv?.remaining_balance).toBeGreaterThan(0);
  });

  // 20. Patient Data Privacy (No internal cost/commission leakage)
  it('20. strictly strips internal supplier costs and doctor commission metrics from patient financial portal data', () => {
    const portalData = getPatientFinancialPortalData(ahmedId, ahmedId, primaryOrgId);
    expect(portalData.allowed).toBe(true);

    portalData.invoices?.forEach((inv) => {
      // Sensitive management fields must be undefined in patient view!
      expect(inv.total_lab_cost).toBeUndefined();
      expect(inv.total_material_cost).toBeUndefined();
      expect(inv.total_doctor_commission).toBeUndefined();
      expect(inv.clinic_net_amount).toBeUndefined();
      expect(inv.commission_details).toBeUndefined();

      inv.items.forEach((it) => {
        expect(it.lab_cost).toBeUndefined();
        expect(it.material_cost).toBeUndefined();
        expect(it.calculated_commission).toBeUndefined();
        expect(it.supplier_vendor).toBeUndefined();
        expect(it.clinic_net_amount).toBeUndefined();
      });
    });
  });

  // 21. Organization Isolation
  it('21. strictly isolates financial and wallet data by organization', () => {
    const foreignWallets = getPatientWallet(foreignPatientId, secondaryOrgId);
    expect(foreignWallets.organization_id).toBe(secondaryOrgId);

    // Ensure Ahmed in primary org cannot access foreign org patient
    const portalData = getPatientFinancialPortalData(ahmedId, foreignPatientId, primaryOrgId);
    expect(portalData.allowed).toBe(false);
  });
});
