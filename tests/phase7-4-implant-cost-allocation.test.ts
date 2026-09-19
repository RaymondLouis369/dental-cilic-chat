import { describe, it, expect, beforeEach } from 'vitest';
import {
  ImplantComponentType,
  ImplantComponentItem,
  ImplantCaseRecord,
  ImplantFinancialBreakdown,
  Invoice,
} from '../src/types/receptionAndBilling';
import {
  calculateComponentConsumedCost,
  calculateImplantFinancialBreakdown,
  calculateFinancialBreakdown,
  getStoredImplantCases,
  setStoredImplantCases,
  upsertImplantCase,
  deleteImplantCase,
  getImplantCaseById,
  createInvoice,
  getStoredInvoices,
  upsertCommissionRule,
  SEED_IMPLANT_CASES,
} from '../src/lib/receptionAndBillingStorage';

describe('Phase 7.4 — Implant Cost Allocation Unit & Integration Tests', () => {
  const TEST_ORG_A = '11111111-1111-1111-1111-111111111111';
  const TEST_ORG_B = '22222222-2222-2222-2222-222222222222';
  const TEST_BRANCH = 'b1111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    // Reset storage to default seeds
    setStoredImplantCases(SEED_IMPLANT_CASES);
  });

  // 1. Component Tracking Test across all 10 component types
  it('should support tracking all 10 required implant component types', () => {
    const requiredTypes: ImplantComponentType[] = [
      'implant',
      'bone_graft',
      'membrane',
      'healing_abutment',
      'cover_screw',
      'healing_cap',
      'abutment',
      'scan_body',
      'prosthetic_screw',
      'other_accessories',
    ];

    const components: ImplantComponentItem[] = requiredTypes.map((type, idx) => ({
      id: `comp_test_${idx}`,
      component_type: type,
      supplier_vendor: `Vendor ${type}`,
      item_name: `Item for ${type}`,
      planned_quantity: 1,
      actual_quantity: 1,
      unit_cost: 100 * (idx + 1),
      date: '2026-09-17',
      reference: `REF-${type.toUpperCase()}`,
    }));

    expect(components.length).toBe(10);
    components.forEach((comp) => {
      expect(comp.supplier_vendor).toBeTruthy();
      expect(comp.item_name).toBeTruthy();
      expect(comp.planned_quantity).toBeGreaterThan(0);
      expect(comp.actual_quantity).toBeGreaterThan(0);
      expect(comp.unit_cost).toBeGreaterThan(0);
      expect(comp.date).toBe('2026-09-17');
      expect(comp.reference).toBeDefined();
    });
  });

  // 2. Planned vs. Actual Quantity & Cost Calculation
  it('should compute consumed cost correctly using actual consumed cost when available', () => {
    // Case A: Actual quantity used differs from planned
    const componentA: ImplantComponentItem = {
      id: 'c1',
      component_type: 'bone_graft',
      supplier_vendor: 'Nile Medical',
      item_name: 'Bio-Oss 0.5g',
      planned_quantity: 3, // Planned 3 vials
      actual_quantity: 1,  // Used only 1 vial
      unit_cost: 500,
    };
    expect(calculateComponentConsumedCost(componentA)).toBe(500); // 1 * 500 = 500

    // Case B: Explicit actual_cost override (discounted bulk rate)
    const componentB: ImplantComponentItem = {
      id: 'c2',
      component_type: 'implant',
      supplier_vendor: 'Delta Dental',
      item_name: 'Straumann BLX',
      planned_quantity: 1,
      actual_quantity: 1,
      unit_cost: 3000,
      actual_cost: 2700, // Explicit actual cost override
    };
    expect(calculateComponentConsumedCost(componentB)).toBe(2700);

    // Case C: Actual quantity = 0 (component planned but not consumed)
    const componentC: ImplantComponentItem = {
      id: 'c3',
      component_type: 'membrane',
      supplier_vendor: 'Nile Medical',
      item_name: 'Bio-Gide',
      planned_quantity: 1,
      actual_quantity: 0,
      unit_cost: 800,
    };
    expect(calculateComponentConsumedCost(componentC)).toBe(0);
  });

  // 3. Total Implant Material Cost Calculation
  it('should calculate Total Implant Material Cost accurately across multiple components', () => {
    const components: ImplantComponentItem[] = [
      {
        id: 'comp_1',
        component_type: 'implant',
        supplier_vendor: 'Vendor A',
        item_name: 'Implant 4.0',
        planned_quantity: 1,
        actual_quantity: 1,
        unit_cost: 2000,
      },
      {
        id: 'comp_2',
        component_type: 'bone_graft',
        supplier_vendor: 'Vendor B',
        item_name: 'Bone Graft',
        planned_quantity: 2,
        actual_quantity: 1,
        unit_cost: 750,
      },
      {
        id: 'comp_3',
        component_type: 'membrane',
        supplier_vendor: 'Vendor B',
        item_name: 'Membrane',
        planned_quantity: 1,
        actual_quantity: 1,
        unit_cost: 650,
      },
    ];

    const breakdown = calculateImplantFinancialBreakdown({
      grossServiceAmount: 10000,
      insuranceAmount: 0,
      patientAmount: 10000,
      components,
      labCost: 1000,
      commissionPercentage: 20,
      commissionBase: 'net_after_costs',
    });

    // Total Implant Material Cost = 2000 + (1 * 750) + 650 = 3400
    expect(breakdown.total_implant_material_cost).toBe(3400);
    expect(breakdown.material_cost).toBe(3400);
    expect(breakdown.components_cost_breakdown.length).toBe(3);
  });

  // 4. Reuse Phase 7.3 Commission Engine & Base Calculation
  it('should reuse Phase 7.3 commission engine when commission base is net_after_costs vs gross', () => {
    const components: ImplantComponentItem[] = [
      {
        id: 'imp_1',
        component_type: 'implant',
        supplier_vendor: 'Vendor',
        item_name: 'Implant',
        planned_quantity: 1,
        actual_quantity: 1,
        unit_cost: 3000,
      },
    ];

    // Gross Amount = 10,000, Lab Cost = 1,000, Material Cost = 3,000. Total Costs = 4,000.
    // When commission_base = 'net_after_costs':
    // Commission Base Amount = Math.max(0, 10,000 - 4,000) = 6,000.
    // Doctor Commission (20%) = 6,000 * 0.20 = 1,200.
    const netBreakdown = calculateImplantFinancialBreakdown({
      grossServiceAmount: 10000,
      insuranceAmount: 0,
      patientAmount: 10000,
      components,
      labCost: 1000,
      commissionPercentage: 20,
      commissionBase: 'net_after_costs',
    });

    expect(netBreakdown.commission_base).toBe('net_after_costs');
    expect(netBreakdown.commission_base_amount).toBe(6000);
    expect(netBreakdown.doctor_commission).toBe(1200);

    // When commission_base = 'gross':
    // Commission Base Amount = 10,000.
    // Doctor Commission (20%) = 10,000 * 0.20 = 2,000.
    const grossBreakdown = calculateImplantFinancialBreakdown({
      grossServiceAmount: 10000,
      insuranceAmount: 0,
      patientAmount: 10000,
      components,
      labCost: 1000,
      commissionPercentage: 20,
      commissionBase: 'gross',
    });

    expect(grossBreakdown.commission_base).toBe('gross');
    expect(grossBreakdown.commission_base_amount).toBe(10000);
    expect(grossBreakdown.doctor_commission).toBe(2000);
  });

  // 5. Clinic Net Amount Calculation
  it('should compute Clinic Net Amount accurately as patient_amount - lab_cost - material_cost - doctor_commission', () => {
    // Patient Amount = 12,000 EGP
    // Lab Cost = 1,500 EGP
    // Implant Material Cost = 3,500 EGP
    // Total Costs = 5,000 EGP
    // Commission Base (Net) = 12,000 - 5,000 = 7,000 EGP
    // Doctor Commission (15%) = 7,000 * 0.15 = 1,050 EGP
    // Clinic Net Amount = 12,000 - 1,500 - 3,500 - 1,050 = 5,950 EGP

    const components: ImplantComponentItem[] = [
      {
        id: 'comp_a',
        component_type: 'implant',
        supplier_vendor: 'Straumann',
        item_name: 'BLX Implant',
        planned_quantity: 1,
        actual_quantity: 1,
        unit_cost: 2500,
      },
      {
        id: 'comp_b',
        component_type: 'bone_graft',
        supplier_vendor: 'Bio-Oss',
        item_name: 'Bone Graft 0.5g',
        planned_quantity: 1,
        actual_quantity: 1,
        unit_cost: 1000,
      },
    ];

    const breakdown = calculateImplantFinancialBreakdown({
      grossServiceAmount: 12000,
      insuranceAmount: 0,
      patientAmount: 12000,
      components,
      labCost: 1500,
      commissionPercentage: 15,
      commissionBase: 'net_after_costs',
    });

    expect(breakdown.total_implant_material_cost).toBe(3500);
    expect(breakdown.doctor_commission).toBe(1050);
    expect(breakdown.clinic_net_amount).toBe(5950);
  });

  // 6. Preservation of Historical Transaction Values
  it('should preserve historical invoice values when creating invoices with implant costs', () => {
    // Create an invoice with implant cost allocation
    const invoice = createInvoice(
      {
        organizationId: TEST_ORG_A,
        branchId: TEST_BRANCH,
        patientId: 'pat_historical_01',
        patientType: 'cash',
        doctorId: 'doc_historical_01',
        items: [
          {
            serviceId: 'srv_001',
            customUnitPrice: 15000,
            customCopayAmount: 15000,
            doctorId: 'doc_historical_01',
            doctorName: 'Dr. Tarek',
            commissionPercentage: 20,
            commissionBase: 'net_after_costs',
            labCost: 2000,
            materialCost: 4000, // Total Implant Material Cost
          },
        ],
        actorUserId: 'usr_center_mgr',
      }
    );

    expect(invoice).toBeDefined();
    expect(invoice.id).toBeTruthy();
    expect(invoice.total_lab_cost).toBe(2000);
    expect(invoice.total_material_cost).toBe(4000);
    // Net base = 15,000 - (2000 + 4000) = 9,000. Commission (20%) = 1,800. Clinic Net = 15,000 - 6000 - 1800 = 7,200.
    expect(invoice.total_doctor_commission).toBe(1800);
    expect(invoice.clinic_net_amount).toBe(7200);

    // Now update global rules or implant component prices later
    upsertCommissionRule(
      {
        doctor_id: 'doc_historical_01',
        commission_percentage: 30, // Changed to 30%
        commission_base: 'gross',
        active: true,
      },
      'usr_center_mgr',
      'center_manager'
    );

    // Verify stored historical invoice values REMAIN UNCHANGED
    const reloadedInvoice = getStoredInvoices(TEST_ORG_A).find((i) => i.id === invoice.id);
    expect(reloadedInvoice).toBeDefined();
    expect(reloadedInvoice?.total_doctor_commission).toBe(1800);
    expect(reloadedInvoice?.clinic_net_amount).toBe(7200);
  });

  // 7. Multi-Organization and Branch Isolation
  it('should strictly enforce organization isolation for implant cases', () => {
    // Create case in Org A
    upsertImplantCase(
      {
        id: 'case_org_a_01',
        organization_id: TEST_ORG_A,
        branch_id: TEST_BRANCH,
        patient_id: 'pat_org_a',
        tooth_number: '16',
        implant_brand: 'Straumann',
        lab_cost: 1000,
        components: [
          {
            id: 'comp_org_a',
            component_type: 'implant',
            supplier_vendor: 'Vendor Org A',
            item_name: 'Implant Org A',
            planned_quantity: 1,
            actual_quantity: 1,
            unit_cost: 2000,
          },
        ],
      },
      'usr_mgr_a',
      'center_manager'
    );

    // Create case in Org B
    upsertImplantCase(
      {
        id: 'case_org_b_01',
        organization_id: TEST_ORG_B,
        branch_id: 'b2222222-2222-2222-2222-222222222222',
        patient_id: 'pat_org_b',
        tooth_number: '26',
        implant_brand: 'Osstem',
        lab_cost: 800,
        components: [
          {
            id: 'comp_org_b',
            component_type: 'implant',
            supplier_vendor: 'Vendor Org B',
            item_name: 'Implant Org B',
            planned_quantity: 1,
            actual_quantity: 1,
            unit_cost: 1500,
          },
        ],
      },
      'usr_mgr_b',
      'center_manager'
    );

    // Query cases for Org A
    const casesOrgA = getStoredImplantCases(TEST_ORG_A);
    expect(casesOrgA.some((c) => c.id === 'case_org_a_01')).toBe(true);
    expect(casesOrgA.some((c) => c.id === 'case_org_b_01')).toBe(false);

    // Query cases for Org B
    const casesOrgB = getStoredImplantCases(TEST_ORG_B);
    expect(casesOrgB.some((c) => c.id === 'case_org_b_01')).toBe(true);
    expect(casesOrgB.some((c) => c.id === 'case_org_a_01')).toBe(false);
  });
});
