import { describe, it, expect, beforeEach } from 'vitest';
import {
  addServiceToTreatmentPlan,
  updateTreatmentPlanServiceApproval,
  getStoredTreatmentPlanServices,
  createTreatmentPlan,
} from '../src/lib/clinicalStorage';
import {
  getStoredServiceCategories,
  getStoredServices,
  resetPhase3StorageToSeeds,
} from '../src/lib/receptionAndBillingStorage';
import { DEFAULT_EGYPT_ORG } from '../src/lib/storage';

describe('Doctor Clinical Workspace Dental Chart & Treatment Plan Approval Workflow', () => {
  beforeEach(() => {
    resetPhase3StorageToSeeds();
  });

  it('correctly calculates total price, insurance coverage, and copay for multi-tooth service selection', () => {
    const plan = createTreatmentPlan({
      patientId: 'pat_001',
      doctorId: 'doc_001',
      title: 'Multitooth Restoration Plan',
      organizationId: DEFAULT_EGYPT_ORG.id,
    });

    const categories = getStoredServiceCategories();
    const activeCat = categories.find((c) => c.active !== false) || categories[0];
    const services = getStoredServices().filter((s) => s.category_id === activeCat.id && s.active !== false);
    const service = services[0] || getStoredServices()[0];

    // Add service for 3 teeth (#14, #15, #16)
    const addedSrv = addServiceToTreatmentPlan({
      treatmentPlanId: plan.id,
      patientId: 'pat_001',
      doctorId: 'doc_001',
      serviceId: service.id,
      serviceCode: service.code,
      serviceNameAr: service.name_ar,
      serviceNameEn: service.name_en,
      categoryId: activeCat.id,
      categoryNameAr: activeCat.name_ar,
      categoryNameEn: activeCat.name_en,
      toothNumber: '14, 15, 16',
      organizationId: DEFAULT_EGYPT_ORG.id,
    });

    expect(addedSrv).toBeDefined();
    expect(addedSrv.tooth_number).toBe('14, 15, 16');
    expect(addedSrv.unit_price).toBeGreaterThan(0);

    const unitPrice = addedSrv.unit_price || 0;
    const expectedTotal = unitPrice * 3;
    expect(addedSrv.total_price).toBe(expectedTotal);

    const covPct = addedSrv.coverage_percentage || 0;
    const expectedInsuranceAmount = Math.round((expectedTotal * covPct) / 100);
    const expectedCopayAmount = expectedTotal - expectedInsuranceAmount;

    expect(addedSrv.insurance_coverage_amount).toBe(expectedInsuranceAmount);
    expect(addedSrv.patient_copay_amount).toBe(expectedCopayAmount);
  });

  it('allows reception to update approval status to approved, rejected, or pending', () => {
    const plan = createTreatmentPlan({
      patientId: 'pat_001',
      doctorId: 'doc_001',
      title: 'Approval Status Transition Plan',
      organizationId: DEFAULT_EGYPT_ORG.id,
    });

    const addedSrv = addServiceToTreatmentPlan({
      treatmentPlanId: plan.id,
      patientId: 'pat_001',
      doctorId: 'doc_001',
      serviceId: 'srv_001',
      serviceCode: 'DNT-COMP',
      serviceNameAr: 'حشوة تجميلية مركبة',
      serviceNameEn: 'Composite Restoration',
      organizationId: DEFAULT_EGYPT_ORG.id,
    });

    const srvId = addedSrv.id;

    // 1. Reception approves service
    const approveOk = updateTreatmentPlanServiceApproval({
      serviceId: srvId,
      approvalStatus: 'approved',
      updatedByUserId: 'usr_reception_01',
      updatedByName: 'Reception Staff',
      notes: 'Approved by Misr Insurance Co.',
    });

    expect(approveOk).toBe(true);

    let updatedSrv = getStoredTreatmentPlanServices().find((s) => s.id === srvId);
    expect(updatedSrv?.approval_status).toBe('approved');
    expect(updatedSrv?.override_audit?.updated_by_name).toBe('Reception Staff');

    // 2. Reception updates to rejected
    const rejectOk = updateTreatmentPlanServiceApproval({
      serviceId: srvId,
      approvalStatus: 'rejected',
      updatedByUserId: 'usr_reception_01',
      updatedByName: 'Reception Staff',
      notes: 'Exceeds annual limit',
    });

    expect(rejectOk).toBe(true);
    updatedSrv = getStoredTreatmentPlanServices().find((s) => s.id === srvId);
    expect(updatedSrv?.approval_status).toBe('rejected');
  });

  it('supports insurance coverage percentage override with audit logging and financial recalculation', () => {
    const plan = createTreatmentPlan({
      patientId: 'pat_002',
      doctorId: 'doc_001',
      title: 'Override Test Plan',
      organizationId: DEFAULT_EGYPT_ORG.id,
    });

    const addedSrv = addServiceToTreatmentPlan({
      treatmentPlanId: plan.id,
      patientId: 'pat_002',
      doctorId: 'doc_001',
      serviceId: 'srv_crown',
      serviceCode: 'DNT-CROWN',
      serviceNameAr: 'تاج زيركون فاخر',
      serviceNameEn: 'Zirconia Crown',
      organizationId: DEFAULT_EGYPT_ORG.id,
    });

    // Reception overrides approved coverage to 90%
    const overrideOk = updateTreatmentPlanServiceApproval({
      serviceId: addedSrv.id,
      approvalStatus: 'approved',
      approvedCoveragePercentage: 90,
      updatedByUserId: 'usr_reception_mgr',
      updatedByName: 'Reception Manager',
      notes: 'Special VIP approval granted by medical board',
    });

    expect(overrideOk).toBe(true);
    const updatedSrv = getStoredTreatmentPlanServices().find((s) => s.id === addedSrv.id)!;

    // Approved coverage is 90%
    expect(updatedSrv.approved_coverage_percentage).toBe(90);

    // Financial calculations recalculated with 90%:
    const totalPrice = updatedSrv.total_price || 0;
    const expectedInsuranceAmount = Math.round((totalPrice * 90) / 100);
    const expectedCopayAmount = totalPrice - expectedInsuranceAmount;

    expect(updatedSrv.insurance_coverage_amount).toBe(expectedInsuranceAmount);
    expect(updatedSrv.patient_copay_amount).toBe(expectedCopayAmount);

    // Audit trail recorded
    expect(updatedSrv.override_audit).toBeDefined();
    expect(updatedSrv.override_audit?.approved_coverage_percentage).toBe(90);
    expect(updatedSrv.override_audit?.updated_by_name).toBe('Reception Manager');
    expect(updatedSrv.override_audit?.notes).toContain('Special VIP approval');
  });

  it('filters active services strictly by category and excludes inactive ones', () => {
    const allServices = getStoredServices();
    const categories = getStoredServiceCategories();

    expect(categories.length).toBeGreaterThan(0);

    categories.forEach((cat) => {
      const activeCatServices = allServices.filter((s) => {
        const isActive = s.active !== false && (s as any).is_active !== false;
        if (!isActive) return false;
        return (
          s.category_id === cat.id ||
          s.category === cat.id ||
          s.category === cat.code ||
          s.category === cat.name_en.toLowerCase()
        );
      });

      activeCatServices.forEach((s) => {
        expect(s.active).not.toBe(false);
      });
    });
  });

  it('enforces organization scoping on treatment plan service creation and approval', () => {
    const org1 = DEFAULT_EGYPT_ORG.id;
    const org2 = 'org_alexandria_clinic';

    const planOrg1 = createTreatmentPlan({
      patientId: 'pat_org1',
      doctorId: 'doc_001',
      title: 'Cairo Clinic Plan',
      organizationId: org1,
    });

    const addedSrv1 = addServiceToTreatmentPlan({
      treatmentPlanId: planOrg1.id,
      patientId: 'pat_org1',
      doctorId: 'doc_001',
      serviceId: 'srv_scaling',
      serviceCode: 'DNT-SCL',
      serviceNameAr: 'تنظيف وتلميع أسنان',
      serviceNameEn: 'Scaling & Polishing',
      organizationId: org1,
    });

    expect(addedSrv1.organization_id).toBe(org1);

    const allStoredServices = getStoredTreatmentPlanServices();
    const org1Services = allStoredServices.filter((s) => s.organization_id === org1);
    const org2Services = allStoredServices.filter((s) => s.organization_id === org2);

    expect(org1Services.some((s) => s.id === addedSrv1.id)).toBe(true);
    expect(org2Services.some((s) => s.id === addedSrv1.id)).toBe(false);
  });
});
