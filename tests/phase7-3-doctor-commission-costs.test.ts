import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateFinancialBreakdown,
  getCommissionRuleForDoctorAndService,
  upsertCommissionRule,
  deleteCommissionRule,
  recordLabMaterialCost,
  getStoredCommissionRules,
  setStoredCommissionRules,
  getStoredLabMaterialCosts,
  setStoredLabMaterialCosts,
  createInvoice,
  getStoredInvoices,
  setStoredInvoices,
  SEED_DOCTOR_COMMISSION_RULES,
  SEED_LAB_MATERIAL_COSTS,
} from '../src/lib/receptionAndBillingStorage';
import { DEFAULT_EGYPT_ORG } from '../src/lib/storage';

describe('Phase 7.3 — Doctor Commission & Lab/Material Costs', () => {
  beforeEach(() => {
    // Reset stored data to default seeds before each test
    setStoredCommissionRules(SEED_DOCTOR_COMMISSION_RULES);
    setStoredLabMaterialCosts(SEED_LAB_MATERIAL_COSTS);
    setStoredInvoices([]);
  });

  describe('1. Explicit Commission Base Calculations (Gross vs Net After Costs)', () => {
    it('should correctly calculate commission using Gross Service Amount as base', () => {
      const breakdown = calculateFinancialBreakdown({
        grossServiceAmount: 1000,
        insuranceAmount: 200,
        patientAmount: 800,
        labCost: 150,
        materialCost: 50,
        commissionPercentage: 20,
        commissionBase: 'gross',
      });

      // Gross = 1000
      // Commission Base = 1000
      // Doctor Commission = 1000 * 0.20 = 200
      // Total Costs = 150 + 50 = 200
      // Clinic Net = Patient Amount (800) - Lab (150) - Material (50) - Commission (200) = 400
      expect(breakdown.gross_service_amount).toBe(1000);
      expect(breakdown.commission_base).toBe('gross');
      expect(breakdown.commission_base_amount).toBe(1000);
      expect(breakdown.doctor_commission).toBe(200);
      expect(breakdown.clinic_net_amount).toBe(400);
    });

    it('should correctly calculate commission using Net Amount After Costs as base', () => {
      const breakdown = calculateFinancialBreakdown({
        grossServiceAmount: 1000,
        insuranceAmount: 0,
        patientAmount: 1000,
        labCost: 300,
        materialCost: 100,
        commissionPercentage: 25,
        commissionBase: 'net_after_costs',
      });

      // Total Costs = 300 + 100 = 400
      // Commission Base Amount = Gross (1000) - Costs (400) = 600
      // Doctor Commission = 600 * 0.25 = 150
      // Clinic Net = Patient Amount (1000) - Lab (300) - Material (100) - Commission (150) = 450
      expect(breakdown.commission_base).toBe('net_after_costs');
      expect(breakdown.commission_base_amount).toBe(600);
      expect(breakdown.doctor_commission).toBe(150);
      expect(breakdown.clinic_net_amount).toBe(450);
    });

    it('should handle zero or negative net base gracefully without negative commissions', () => {
      const breakdown = calculateFinancialBreakdown({
        grossServiceAmount: 200,
        insuranceAmount: 0,
        patientAmount: 200,
        labCost: 180,
        materialCost: 50, // Total costs = 230 > Gross (200)
        commissionPercentage: 20,
        commissionBase: 'net_after_costs',
      });

      // Net Base should be clamped to 0
      expect(breakdown.commission_base_amount).toBe(0);
      expect(breakdown.doctor_commission).toBe(0);
      expect(breakdown.clinic_net_amount).toBe(-30); // Patient (200) - Costs (230) - Comm (0)
    });
  });

  describe('2. Configurable Commission Rules (Doctor & Service hierarchy)', () => {
    it('should match specific doctor & specific service rule first', () => {
      upsertCommissionRule(
        {
          id: 'test_rule_spec',
          organization_id: '11111111-1111-1111-1111-111111111111',
          doctor_id: 'doc_ahmed',
          service_id: 'srv_implant',
          commission_percentage: 30,
          commission_base: 'net_after_costs',
          active: true,
        },
        'usr_center_mgr',
        'center_manager'
      );

      const rule = getCommissionRuleForDoctorAndService('11111111-1111-1111-1111-111111111111', 'doc_ahmed', 'srv_implant');
      expect(rule.commission_percentage).toBe(30);
      expect(rule.commission_base).toBe('net_after_costs');
    });

    it('should fallback to doctor-level general rule if service-specific rule does not exist', () => {
      upsertCommissionRule(
        {
          id: 'test_rule_doc_all',
          organization_id: '11111111-1111-1111-1111-111111111111',
          doctor_id: 'doc_sarah',
          service_id: 'all',
          commission_percentage: 22,
          commission_base: 'gross',
          active: true,
        },
        'usr_center_mgr',
        'center_manager'
      );

      const rule = getCommissionRuleForDoctorAndService('11111111-1111-1111-1111-111111111111', 'doc_sarah', 'srv_crown');
      expect(rule.commission_percentage).toBe(22);
      expect(rule.commission_base).toBe('gross');
    });
  });

  describe('3. Security & Role-Based Access Control (RBAC)', () => {
    it('should allow center_manager and branch_manager to upsert commission rules', () => {
      const res1 = upsertCommissionRule(
        {
          doctor_id: 'doc_1',
          service_id: 'all',
          commission_percentage: 18,
          commission_base: 'gross',
        },
        'usr_mgr_1',
        'center_manager'
      );
      expect(res1.success).toBe(true);

      const res2 = upsertCommissionRule(
        {
          doctor_id: 'doc_2',
          service_id: 'all',
          commission_percentage: 15,
          commission_base: 'net_after_costs',
        },
        'usr_mgr_2',
        'branch_manager'
      );
      expect(res2.success).toBe(true);
    });

    it('should reject unauthorized roles (e.g. doctor, receptionist) from modifying commission rules', () => {
      const resDoctor = upsertCommissionRule(
        {
          doctor_id: 'doc_1',
          service_id: 'all',
          commission_percentage: 50,
          commission_base: 'gross',
        },
        'usr_doc_1',
        'doctor'
      );
      expect(resDoctor.success).toBe(false);
      expect(resDoctor.error).toContain('غير مصرح لك');

      const resRecep = upsertCommissionRule(
        {
          doctor_id: 'doc_1',
          service_id: 'all',
          commission_percentage: 50,
          commission_base: 'gross',
        },
        'usr_recep_1',
        'receptionist'
      );
      expect(resRecep.success).toBe(false);
    });
  });

  describe('4. Lab & Material Cost Tracking', () => {
    it('should record lab and material costs with supplier and reference', () => {
      const record = recordLabMaterialCost(
        {
          organization_id: DEFAULT_EGYPT_ORG.id,
          type: 'lab',
          supplier_vendor: 'Nile Dental Lab',
          item_name_ar: 'تاج زركونيا',
          item_name_en: 'Zirconia Crown',
          quantity: 2,
          unit_cost: 300,
          actual_cost: 600,
          source_reference: 'LAB-ORD-999',
        },
        'usr_center_mgr'
      );

      expect(record.id).toBeDefined();
      expect(record.actual_cost).toBe(600);
      expect(record.supplier_vendor).toBe('Nile Dental Lab');

      const stored = getStoredLabMaterialCosts(DEFAULT_EGYPT_ORG.id);
      expect(stored.length).toBeGreaterThan(0);
      expect(stored.some((c) => c.source_reference === 'LAB-ORD-999')).toBe(true);
    });
  });

  describe('5. Invoice Integration & Historical Preservation', () => {
    it('should persist commission and cost fields on invoice creation without altering historical invoices', () => {
      // 1. Create invoice
      const invoice = createInvoice({
        organizationId: '11111111-1111-1111-1111-111111111111',
        patientId: 'p001',
        doctorId: 'a1111111-2222-3333-4444-555555555555',
        patientType: 'cash',
        actorUserId: 'usr_recep_1',
        items: [
          {
            serviceId: 'srv_004', // Zirconia Crown
            quantity: 1,
            customUnitPrice: 1500,
          },
        ],
      });

      expect(invoice.items[0].commission_percentage).toBeDefined();
      expect(invoice.total_doctor_commission).toBeDefined();
      expect(invoice.clinic_net_amount).toBeDefined();

      const savedCommission = invoice.total_doctor_commission;

      // 2. Change global commission rules afterwards
      upsertCommissionRule(
        {
          doctor_id: 'a1111111-2222-3333-4444-555555555555',
          service_id: 'srv_004',
          commission_percentage: 90, // Extreme rule change
          commission_base: 'gross',
        },
        'usr_center_mgr',
        'center_manager'
      );

      // 3. Retrieve stored invoice and confirm historical value is PRESERVED
      const storedInvoices = getStoredInvoices();
      const fetchedInvoice = storedInvoices.find((i) => i.id === invoice.id);

      expect(fetchedInvoice?.total_doctor_commission).toBe(savedCommission);
      expect(fetchedInvoice?.total_doctor_commission).not.toBe(1500 * 0.9);
    });
  });
});
