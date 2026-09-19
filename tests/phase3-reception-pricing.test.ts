import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredAppointments,
  getStoredWaitingList,
  getStoredDoctorShifts,
  getStoredServices,
  getStoredServiceCategories,
  saveServiceCategory,
  deactivateServiceCategory,
  reactivateServiceCategory,
  deleteServiceCategory,
  isCategoryInUse,
  getStoredPriceLists,
  getStoredPriceListVersions,
  getStoredInsuranceCompanies,
  getStoredInsurancePlans,
  getStoredCustomPatientServices,
  bookAppointment,
  addWalkInToWaitingList,
  updateAppointmentStatus,
  resolvePricing,
  validateExcelPriceListRows,
  publishNewPriceListVersion,
  addCustomPatientService,
  reviewCustomPatientService,
  resetPhase3StorageToSeeds,
} from '../src/lib/receptionAndBillingStorage';
import { getStoredPatients, setStoredPatients } from '../src/lib/patientStorage';
import { hasPermission } from '../src/modules/permissions/rolesAndPermissions';
import { DEFAULT_EGYPT_ORG } from '../src/lib/storage';

describe('PHASE 03 — DENTAL CLINIC RECEPTION, SCHEDULING, SERVICES & PRICING ENGINE', () => {
  beforeEach(() => {
    resetPhase3StorageToSeeds();
  });

  // 1. Reception & Appointment Booking
  it('1. Books appointment with duration and doctor scheduling', () => {
    const res = bookAppointment({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: '11111111-1111-1111-1111-111111111111',
      doctorId: 'prof_doc_01',
      existingPatientId: 'a1111111-1111-1111-1111-111111111111',
      serviceId: 'srv_003',
      appointmentDate: '2026-10-15', // Thursday (shift is 10:00 - 18:00, break 14:00 - 15:00)
      startTime: '11:00',
      durationMinutes: 30,
      notes: 'كشف أسنان دوري وتنظيف',
      actorUserId: 'prof_rec_01',
    });

    expect(res.success).toBe(true);
    expect(res.appointment).toBeDefined();
    expect(res.appointment?.appointment_date).toBe('2026-10-15');
    expect(res.appointment?.start_time).toBe('11:00');
    expect(res.appointment?.end_time).toBe('11:30');
    expect(res.appointment?.status).toBe('confirmed');

    const stored = getStoredAppointments();
    expect(stored.some((a) => a.id === res.appointment?.id)).toBe(true);
  });

  // 2. Appointment Lifecycle Status Transitions
  it('2. Transitions appointment through reception lifecycle states (Confirmed -> Arrived -> Waiting -> Completed)', () => {
    const res = bookAppointment({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: '11111111-1111-1111-1111-111111111111',
      doctorId: 'prof_doc_01',
      existingPatientId: 'a1111111-1111-1111-1111-111111111111',
      serviceId: 'srv_001',
      appointmentDate: '2026-10-15',
      startTime: '15:30',
      actorUserId: 'prof_rec_01',
    });

    expect(res.success).toBe(true);
    const aptId = res.appointment!.id;

    // Check-in: Arrived
    const arrivedOk = updateAppointmentStatus(aptId, 'arrived');
    expect(arrivedOk).toBe(true);
    const arrivedApt = getStoredAppointments().find((a) => a.id === aptId);
    expect(arrivedApt?.status).toBe('arrived');
    expect(arrivedApt?.check_in_time).toBeDefined();

    // Waiting in lounge
    const waitingOk = updateAppointmentStatus(aptId, 'waiting');
    expect(waitingOk).toBe(true);
    const waitingApt = getStoredAppointments().find((a) => a.id === aptId);
    expect(waitingApt?.status).toBe('waiting');

    // In Progress / With Doctor
    const inProgressOk = updateAppointmentStatus(aptId, 'with_doctor');
    expect(inProgressOk).toBe(true);

    // Completed consultation
    const completedOk = updateAppointmentStatus(aptId, 'completed');
    expect(completedOk).toBe(true);
    const completedApt = getStoredAppointments().find((a) => a.id === aptId);
    expect(completedApt?.status).toBe('completed');
  });

  // 3. Walk-in and Waiting List Queue Management
  it('3. Queues walk-in patient with priority triage and ticket generation', () => {
    const res = addWalkInToWaitingList({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: '11111111-1111-1111-1111-111111111111',
      patientId: 'a1111111-1111-1111-1111-111111111111',
      requestedServiceId: 'srv_006',
      priority: 'urgent',
      notes: 'ألم ضرس حاد طارئ',
    });

    expect(res.success).toBe(true);
    expect(res.entry).toBeDefined();
    expect(res.entry?.priority).toBe('urgent');
    expect(res.entry?.status).toBe('waiting');
    expect(res.entry?.ticket_number).toBeDefined();

    const stored = getStoredWaitingList();
    expect(stored.some((w) => w.id === res.entry?.id)).toBe(true);
  });

  // 4. Patient Search & QR Token Resolution
  it('4. Resolves patient identity organization-wide via Patient Code or Profile ID', () => {
    const patients = getStoredPatients();
    const ahmed = patients.find((p) => p.id === 'a1111111-1111-1111-1111-111111111111');
    expect(ahmed).toBeDefined();
    expect(ahmed?.patient_code).toBe('PAT-000001');
    expect(ahmed?.first_name).toBe('أحمد');
  });

  // 5. Doctor Shifts & Scheduling Engine
  it('5. Retrieves doctor working shifts with breaks and active status', () => {
    const shifts = getStoredDoctorShifts();
    expect(shifts.length).toBeGreaterThanOrEqual(1);
    const drKarimShift = shifts.find((s) => s.doctor_id === 'prof_doc_01');
    expect(drKarimShift).toBeDefined();
    expect(drKarimShift?.active).toBe(true);
  });

  // 6. Service Catalog
  it('6. Manages dental service catalog with categories and doctor requirements', () => {
    const catalog = getStoredServices();
    expect(catalog.length).toBeGreaterThanOrEqual(5);

    const exam = catalog.find((s) => s.id === 'srv_001');
    expect(exam).toBeDefined();
    expect(exam?.code).toBe('SRV-001');
    expect(exam?.requires_doctor).toBe(true);
  });

  // 7. Deterministic Pricing Engine: Cash Patient
  it('7. Deterministically resolves Cash Price for uninsured patient without AI or random variance', () => {
    // Uninsured patient reading srv_001
    const resolution = resolvePricing({
      organizationId: DEFAULT_EGYPT_ORG.id,
      patientId: 'd4444444-4444-4444-4444-444444444444', // Tariq, no insurance
      serviceId: 'srv_001',
    });

    expect(resolution.price_type).toBe('cash');
    expect(resolution.total_price).toBe(300);
    expect(resolution.patient_copay).toBe(300);
    expect(resolution.insurance_coverage).toBe(0);
    expect(resolution.coverage_percentage).toBe(0);
  });

  // 8. Deterministic Pricing Engine: Contracted Insurance & Copay
  it('8. Deterministically resolves Contracted Insurance Price and calculates copay percentage mathematically', () => {
    // Set insurance on patient
    const allPatients = getStoredPatients();
    const updatedPatients = allPatients.map((p) =>
      p.id === 'a1111111-1111-1111-1111-111111111111'
        ? { ...p, insurance_company: 'ins_comp_axa' }
        : p
    );
    setStoredPatients(updatedPatients);

    // In demo data, AXA contracted price for srv_001 is 250 EGP with 80% coverage (20% copay = 50 EGP)
    const resolution = resolvePricing({
      organizationId: DEFAULT_EGYPT_ORG.id,
      patientId: 'a1111111-1111-1111-1111-111111111111',
      serviceId: 'srv_001',
    });

    expect(resolution.price_type).toBe('contracted_insurance');
    expect(resolution.total_price).toBe(250);
    expect(resolution.patient_copay).toBe(50);
    expect(resolution.insurance_coverage).toBe(200);
    expect(resolution.coverage_percentage).toBe(80);
  });

  // 9. Deterministic Pricing Engine: Uncontracted Courtesy Discount
  it('9. Resolves non-contracted courtesy discount when insurance is uncontracted but allows discount', () => {
    // Bupa Egypt (ins_comp_bupa) has allows_non_contracted_discount: true (10%)
    // Base cash price = 300 EGP. 10% discount = 30 EGP. Final patient price = 270 EGP.
    const allPatients = getStoredPatients();
    const updatedPatients = allPatients.map((p) =>
      p.id === 'd4444444-4444-4444-4444-444444444444'
        ? { ...p, insurance_company: 'ins_comp_bupa' }
        : p
    );
    setStoredPatients(updatedPatients);

    const resolution = resolvePricing({
      organizationId: DEFAULT_EGYPT_ORG.id,
      patientId: 'd4444444-4444-4444-4444-444444444444',
      serviceId: 'srv_001',
    });

    expect(resolution.price_type).toBe('non_contracted_discount');
    expect(resolution.total_price).toBe(270);
    expect(resolution.patient_copay).toBe(270);
    expect(resolution.insurance_coverage).toBe(0);
  });

  // 10. Excel Price List Row Validation
  it('10. Validates Excel price list rows, detecting negative prices, missing codes, and duplicates', () => {
    const rawRows = [
      {
        service_code: 'SRV-001',
        service_name_ar: 'كشف عام',
        service_name_en: 'General Exam',
        category: 'examinations',
        cash_price: 300,
        active: true,
      },
      {
        service_code: '', // Missing code!
        service_name_ar: 'خلع ضرس',
        service_name_en: 'Extraction',
        category: 'surgery',
        cash_price: 500,
        active: true,
      },
      {
        service_code: 'SRV-003',
        service_name_ar: 'تبييض أسنان',
        service_name_en: 'Teeth Whitening',
        category: 'preventive',
        cash_price: -150, // Negative price!
        active: true,
      },
      {
        service_code: 'SRV-001', // Duplicate code!
        service_name_ar: 'كشف مكرر',
        service_name_en: 'Duplicate Exam',
        category: 'examinations',
        cash_price: 350,
        active: true,
      },
    ];

    const result = validateExcelPriceListRows(rawRows);
    expect(result.total_rows).toBe(4);
    expect(result.valid_rows).toBe(1);
    expect(result.invalid_rows).toBe(3);

    const validRow = result.rows.find((r) => r.is_valid);
    expect(validRow?.service_code).toBe('SRV-001');

    const invalidRows = result.rows.filter((r) => !r.is_valid);
    expect(invalidRows.length).toBe(3);
  });

  // 11. Price List Versioning & Immutability
  it('11. Archives prior price list version upon publishing new version, retaining audit trail', () => {
    const res = publishNewPriceListVersion({
      organizationId: DEFAULT_EGYPT_ORG.id,
      priceListId: 'pl_cash_def_01',
      notes: 'تحديث أسعار الربع الأخير 2026',
      validRows: [
        {
          row_number: 1,
          service_code: 'SRV-EXAM-V2',
          service_name_ar: 'كشف أسنان تخصصي',
          service_name_en: 'Specialist Exam',
          category: 'examinations',
          cash_price: 350,
          active: true,
          is_valid: true,
          errors: [],
        },
      ],
      actorUserId: 'prof_cm_01',
    });

    expect(res.success).toBe(true);
    expect(res.newVersion?.status).toBe('published');
    expect(res.newVersion?.version_number).toBe(2);

    const versions = getStoredPriceListVersions();
    const v1 = versions.find((v) => v.version_number === 1);
    expect(v1?.status).toBe('archived');
  });

  // 12. Custom Patient Pricing Review Queue
  it('12. Receptionist submits custom patient pricing; manager reviews and approves', () => {
    const customReq = addCustomPatientService({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: '11111111-1111-1111-1111-111111111111',
      patientId: 'a1111111-1111-1111-1111-111111111111',
      serviceName: 'تركيبة زركونيا خاصة مع تشريح تجميلي يدوي',
      patientPrice: 4500,
      reason: 'حالة تجميلية استثنائية تم الاتفاق عليها مع الطبيب',
      actorUserId: 'prof_rec_01',
    });

    expect(customReq.id).toBeDefined();
    expect(customReq.status).toBe('pending_review');

    // Center manager reviews and approves
    const reviewOk = reviewCustomPatientService(
      customReq.id,
      'approved',
      'srv_008',
      1800,
      'تمت الموافقة وتعيين تكلفة معمل الخزف 1800 ج.م'
    );

    expect(reviewOk).toBe(true);

    const storedQueue = getStoredCustomPatientServices();
    const item = storedQueue.find((q) => q.id === customReq.id);
    expect(item?.status).toBe('approved');
    expect(item?.supplier_vendor_cost).toBe(1800);
    expect(item?.assigned_standard_service_id).toBe('srv_008');
  });

  // 13. Phase 3 Permissions Enforcement
  it('13. Enforces Phase 3 permissions: receptionist has booking/reception, center_manager has pricing', () => {
    // Receptionist
    expect(hasPermission('receptionist', 'reception.manage')).toBe(true);
    expect(hasPermission('receptionist', 'booking.create')).toBe(true);
    expect(hasPermission('receptionist', 'booking.manage')).toBe(true);
    expect(hasPermission('receptionist', 'pricing.manage')).toBe(false);

    // Center Manager
    expect(hasPermission('center_manager', 'reception.manage')).toBe(true);
    expect(hasPermission('center_manager', 'pricing.manage')).toBe(true);
    expect(hasPermission('center_manager', 'service.manage')).toBe(true);

    // Doctor
    expect(hasPermission('doctor', 'booking.manage')).toBe(true);
    expect(hasPermission('doctor', 'reception.manage')).toBe(false);
    expect(hasPermission('doctor', 'pricing.manage')).toBe(false);
  });

  // 14. Service Categories CRUD with organization_id Scoping & Description
  it('14. Manages Service Categories CRUD with name_ar, name_en, description, active status, and organization_id scoping', () => {
    // 1. Create a new category with description and org scope
    const createdCat = saveServiceCategory({
      organization_id: DEFAULT_EGYPT_ORG.id,
      code: 'CAT-PERIO',
      name_ar: 'أمراض وجراحة اللثة',
      name_en: 'Periodontics',
      description: 'علاج التهابات اللثة وتنظيف الجيوب اللثوية وتجهيز ما قبل التركيبات',
      active: true,
      display_order: 9,
    });

    expect(createdCat.id).toBeDefined();
    expect(createdCat.organization_id).toBe(DEFAULT_EGYPT_ORG.id);
    expect(createdCat.code).toBe('CAT-PERIO');
    expect(createdCat.name_ar).toBe('أمراض وجراحة اللثة');
    expect(createdCat.name_en).toBe('Periodontics');
    expect(createdCat.description).toBe('علاج التهابات اللثة وتنظيف الجيوب اللثوية وتجهيز ما قبل التركيبات');
    expect(createdCat.active).toBe(true);

    // 2. Fetch scoped categories for org
    const orgCats = getStoredServiceCategories(DEFAULT_EGYPT_ORG.id);
    expect(orgCats.some((c) => c.id === createdCat.id)).toBe(true);

    // 3. Update category details
    const updatedCat = saveServiceCategory({
      id: createdCat.id,
      organization_id: DEFAULT_EGYPT_ORG.id,
      code: 'CAT-PERIO',
      name_ar: 'طب وجراحة اللثة والأنسجة المحيطة',
      name_en: 'Periodontology & Implant Maintenance',
      description: 'تخصص اللثة وتكثيف العظام المحيط بالأسنان والزرعات',
      active: true,
      display_order: 9,
    });

    expect(updatedCat.name_ar).toBe('طب وجراحة اللثة والأنسجة المحيطة');
    expect(updatedCat.name_en).toBe('Periodontology & Implant Maintenance');
    expect(updatedCat.description).toBe('تخصص اللثة وتكثيف العظام المحيط بالأسنان والزرعات');

    // 4. Deactivate and reactivate
    const deactOk = deactivateServiceCategory(createdCat.id);
    expect(deactOk).toBe(true);
    let checkCat = getStoredServiceCategories().find((c) => c.id === createdCat.id);
    expect(checkCat?.active).toBe(false);

    const reactOk = reactivateServiceCategory(createdCat.id);
    expect(reactOk).toBe(true);
    checkCat = getStoredServiceCategories().find((c) => c.id === createdCat.id);
    expect(checkCat?.active).toBe(true);

    // 5. Delete category if not in use
    expect(isCategoryInUse(createdCat.id)).toBe(false);
    const delResult = deleteServiceCategory(createdCat.id);
    expect(delResult.success).toBe(true);
    expect(getStoredServiceCategories().some((c) => c.id === createdCat.id)).toBe(false);

    // 6. Attempting to delete a category that IS in use (e.g. cat_diag_01) should fail gracefully
    const inUseDelete = deleteServiceCategory('cat_diag_01');
    expect(inUseDelete.success).toBe(false);
    expect(inUseDelete.error).toBeDefined();
  });
});
