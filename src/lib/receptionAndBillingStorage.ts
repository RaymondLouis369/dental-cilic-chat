/**
 * Phase 3: Reception, Doctor Shifts, Appointments, Waiting List,
 * Services, Cash/Insurance Price Lists, Excel Validation, and Card Templates
 * Storage & Deterministic Business Engine — Egypt
 */

import {
  ServiceCategory,
  DentalService,
  DoctorShift,
  Appointment,
  AppointmentStatus,
  WaitingListEntry,
  WaitingPriority,
  WaitingStatus,
  PriceList,
  PriceListVersion,
  PriceListItem,
  InsuranceCompany,
  InsurancePlan,
  InsurancePriceList,
  InsurancePriceListItem,
  InsuranceCardTemplate,
  InsuranceCardField,
  CustomPatientService,
  ExcelRowValidation,
  ExcelImportResult,
  PricingResolutionResult,
} from '../types/receptionAndBilling';
import { Patient, RoleKey } from '../types';
import { DEFAULT_EGYPT_ORG } from './storage';
import { getStoredPatients, setStoredPatients } from './patientStorage';

export const RECEPTION_STORAGE_KEYS = {
  SERVICE_CATEGORIES: 'dental_saas_service_categories',
  SERVICES: 'dental_saas_services',
  DOCTOR_SHIFTS: 'dental_saas_doctor_shifts',
  APPOINTMENTS: 'dental_saas_appointments',
  WAITING_LIST: 'dental_saas_waiting_list',
  PRICE_LISTS: 'dental_saas_price_lists',
  PRICE_LIST_VERSIONS: 'dental_saas_price_list_versions',
  PRICE_LIST_ITEMS: 'dental_saas_price_list_items',
  INSURANCE_COMPANIES: 'dental_saas_insurance_companies',
  INSURANCE_PLANS: 'dental_saas_insurance_plans',
  INSURANCE_PRICE_LISTS: 'dental_saas_insurance_price_lists',
  INSURANCE_PRICE_LIST_ITEMS: 'dental_saas_insurance_price_list_items',
  INSURANCE_CARD_TEMPLATES: 'dental_saas_insurance_card_templates',
  INSURANCE_CARD_FIELDS: 'dental_saas_insurance_card_fields',
  CUSTOM_PATIENT_SERVICES: 'dental_saas_custom_patient_services',
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
// 1. SEED DATA FOR SERVICES & CATEGORIES (EGYPTIAN DENTAL PRACTICE)
// ============================================================================

export const SEED_SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'cat_diag_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    code: 'CAT-DIAG',
    name_ar: 'الفحص والتشخيص والأشعة',
    name_en: 'Examinations & Diagnostics',
    display_order: 1,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'cat_prev_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    code: 'CAT-PREV',
    name_ar: 'الوقاية وتنظيف وتبييض الأسنان',
    name_en: 'Preventive & Hygiene',
    display_order: 2,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'cat_pedo_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    code: 'CAT-PEDO',
    name_ar: 'طب أسنان الأطفال',
    name_en: 'Pediatric Dentistry',
    display_order: 3,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'cat_rest_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    code: 'CAT-REST',
    name_ar: 'الحشوات التجميلية والعلاجية',
    name_en: 'Restorative Dentistry',
    display_order: 4,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'cat_endo_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    code: 'CAT-ENDO',
    name_ar: 'علاج الجذور والعصب',
    name_en: 'Endodontics',
    display_order: 5,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'cat_surg_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    code: 'CAT-SURG',
    name_ar: 'جراحة الفم والخلع البسيط والجراحي',
    name_en: 'Oral Surgery & Extractions',
    display_order: 6,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'cat_ortho_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    code: 'CAT-ORTHO',
    name_ar: 'تقويم الأسنان والفكين',
    name_en: 'Orthodontics',
    display_order: 7,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'cat_pros_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    code: 'CAT-PROS',
    name_ar: 'التركيبات الثابتة والمتحركة والزركونيا',
    name_en: 'Prosthodontics & Crowns',
    display_order: 8,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
];

export const SEED_SERVICES: DentalService[] = [
  {
    id: 'srv_001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    category_id: 'cat_diag_01',
    code: 'SRV-001',
    name_ar: 'الكشف العام واستشارة طبيب الأسنان',
    name_en: 'General Examination & Consultation',
    category: 'examinations',
    default_duration_minutes: 20,
    requires_approval: false,
    requires_doctor: true,
    active: true,
    notes: 'فحص سريري شامل للأسنان واللثة مع خطة علاج أولية',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'srv_002',
    organization_id: DEFAULT_EGYPT_ORG.id,
    category_id: 'cat_pedo_01',
    code: 'SRV-002',
    name_ar: 'كشف واستشارة أسنان أطفال وسلوك علاجي',
    name_en: 'Pediatric Dental Consultation & Behavior Management',
    category: 'pediatric',
    default_duration_minutes: 30,
    requires_approval: false,
    requires_doctor: true,
    active: true,
    notes: 'فحص مخصص للأطفال مع تطبيق جلسة تهيئة نفسية',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'srv_003',
    organization_id: DEFAULT_EGYPT_ORG.id,
    category_id: 'cat_prev_01',
    code: 'SRV-003',
    name_ar: 'تنظيف الأسنان وإزالة الجير بالموجات فوق الصوتية وتلميع',
    name_en: 'Ultrasonic Scaling, Plaque Removal & Polishing',
    category: 'preventive',
    default_duration_minutes: 30,
    requires_approval: false,
    requires_doctor: true,
    active: true,
    notes: 'جلسة تنظيف وتلميع كاملة للفكين العلوي والسفلي',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'srv_004',
    organization_id: DEFAULT_EGYPT_ORG.id,
    category_id: 'cat_rest_01',
    code: 'SRV-004',
    name_ar: 'حشو ضوئي تجميلي نانو كومبوزيت للسن الواحد',
    name_en: 'Nano-Composite Cosmetic Filling',
    category: 'restorative',
    default_duration_minutes: 45,
    requires_approval: false,
    requires_doctor: true,
    active: true,
    notes: 'حشو تجميلي مطابق لدرجة لون السن الطبيعي',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'srv_005',
    organization_id: DEFAULT_EGYPT_ORG.id,
    category_id: 'cat_endo_01',
    code: 'SRV-005',
    name_ar: 'علاج جذور وعصب لضرس خلفي (شامل الحشو النهائي)',
    name_en: 'Molar Molar Endodontic Treatment (Root Canal)',
    category: 'endodontics',
    default_duration_minutes: 60,
    requires_approval: true,
    requires_doctor: true,
    active: true,
    notes: 'تنظيف وتطهير القنوات وحشو الجذور ثلاثي الأبعاد',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'srv_006',
    organization_id: DEFAULT_EGYPT_ORG.id,
    category_id: 'cat_surg_01',
    code: 'SRV-006',
    name_ar: 'خلع جراحي مدفون لضرس العقل مع خياطة جراحية',
    name_en: 'Surgical Extraction of Impacted Wisdom Tooth',
    category: 'surgery',
    default_duration_minutes: 45,
    requires_approval: true,
    requires_doctor: true,
    active: true,
    notes: 'تدخل جراحي دقيق تحت التخدير الموضعي',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'srv_007',
    organization_id: DEFAULT_EGYPT_ORG.id,
    category_id: 'cat_ortho_01',
    code: 'SRV-007',
    name_ar: 'استشارة فحص أولية لتقويم الأسنان وتخطيط الحالة',
    name_en: 'Orthodontic Initial Consultation & Case Planning',
    category: 'orthodontics',
    default_duration_minutes: 45,
    requires_approval: false,
    requires_doctor: true,
    active: true,
    notes: 'دراسة المقاسات وتحليل الصور الفوتوغرافية للفكين',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'srv_008',
    organization_id: DEFAULT_EGYPT_ORG.id,
    category_id: 'cat_pros_01',
    code: 'SRV-008',
    name_ar: 'تاج زركونيا كامل عالي النقاء بتقنية CAD/CAM',
    name_en: 'Monolithic High-Translucency Zirconia Crown',
    category: 'prosthetics',
    default_duration_minutes: 45,
    requires_approval: true,
    requires_doctor: true,
    active: true,
    notes: 'تصميم وتنفيذ رقمي بمعمل الأسنان المعتمد',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
];

// ============================================================================
// 2. SEED DOCTOR SHIFTS & SCHEDULES
// ============================================================================

export const SEED_DOCTOR_SHIFTS: DoctorShift[] = [
  // Dr. Karim Hassan (prof_doc_01) - Works in Cairo Branch & Alexandria Branch
  // Cairo Branch (Sunday to Thursday: 10:00 - 18:00, break 14:00 - 15:00)
  {
    id: 'shift_doc1_cai_sun',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111', // Cairo Branch
    doctor_id: 'prof_doc_01',
    day_of_week: 0, // Sunday
    start_time: '10:00',
    end_time: '18:00',
    break_start: '14:00',
    break_end: '15:00',
    slot_duration_minutes: 30,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'shift_doc1_cai_mon',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    doctor_id: 'prof_doc_01',
    day_of_week: 1, // Monday
    start_time: '10:00',
    end_time: '18:00',
    break_start: '14:00',
    break_end: '15:00',
    slot_duration_minutes: 30,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'shift_doc1_cai_tue',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    doctor_id: 'prof_doc_01',
    day_of_week: 2, // Tuesday
    start_time: '10:00',
    end_time: '18:00',
    break_start: '14:00',
    break_end: '15:00',
    slot_duration_minutes: 30,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'shift_doc1_cai_wed',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    doctor_id: 'prof_doc_01',
    day_of_week: 3, // Wednesday
    start_time: '10:00',
    end_time: '18:00',
    break_start: '14:00',
    break_end: '15:00',
    slot_duration_minutes: 30,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'shift_doc1_cai_thu',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    doctor_id: 'prof_doc_01',
    day_of_week: 4, // Thursday
    start_time: '10:00',
    end_time: '18:00',
    break_start: '14:00',
    break_end: '15:00',
    slot_duration_minutes: 30,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  // Dr. Karim Hassan - Alexandria Branch on Saturdays (11:00 - 19:00)
  {
    id: 'shift_doc1_alx_sat',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '22222222-2222-2222-2222-222222222222', // Alexandria Branch
    doctor_id: 'prof_doc_01',
    day_of_week: 6, // Saturday
    start_time: '11:00',
    end_time: '19:00',
    break_start: '14:00',
    break_end: '15:00',
    slot_duration_minutes: 30,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  // Dr. Mona (Pediatric & Restorative Specialist - prof_bm_01) - Cairo Branch
  {
    id: 'shift_doc2_cai_sun',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    doctor_id: 'prof_bm_01', // Dr. Mona El-Gohary
    day_of_week: 0, // Sunday
    start_time: '12:00',
    end_time: '20:00',
    break_start: '16:00',
    break_end: '17:00',
    slot_duration_minutes: 30,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'shift_doc2_cai_tue',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    doctor_id: 'prof_bm_01',
    day_of_week: 2, // Tuesday
    start_time: '12:00',
    end_time: '20:00',
    break_start: '16:00',
    break_end: '17:00',
    slot_duration_minutes: 30,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
];

// ============================================================================
// 3. SEED CASH PRICE LIST & VERSIONING
// ============================================================================

export const SEED_PRICE_LISTS: PriceList[] = [
  {
    id: 'pl_cash_def_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    name: 'قائمة الأسعار النقدية الافتراضية 2026 (Default Cash Price List)',
    code: 'PL-CASH-DEF',
    type: 'cash',
    is_default: true,
    currency: 'EGP',
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
];

export const SEED_PRICE_LIST_VERSIONS: PriceListVersion[] = [
  {
    id: 'plv_cash_v1',
    price_list_id: 'pl_cash_def_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    version_number: 1,
    status: 'published',
    published_at: '2026-01-01T08:00:00Z',
    effective_from: '2026-01-01',
    created_by: 'prof_cm_01',
    notes: 'الأسعار النقدية السارية للعام 2026 لجميع فروع مصر',
    created_at: '2026-01-01T08:00:00Z',
  },
];

export const SEED_PRICE_LIST_ITEMS: PriceListItem[] = [
  {
    id: 'pli_001',
    price_list_version_id: 'plv_cash_v1',
    organization_id: DEFAULT_EGYPT_ORG.id,
    service_id: 'srv_001',
    service_code: 'SRV-001',
    cash_price: 300.0,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'pli_002',
    price_list_version_id: 'plv_cash_v1',
    organization_id: DEFAULT_EGYPT_ORG.id,
    service_id: 'srv_002',
    service_code: 'SRV-002',
    cash_price: 350.0,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'pli_003',
    price_list_version_id: 'plv_cash_v1',
    organization_id: DEFAULT_EGYPT_ORG.id,
    service_id: 'srv_003',
    service_code: 'SRV-003',
    cash_price: 600.0,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'pli_004',
    price_list_version_id: 'plv_cash_v1',
    organization_id: DEFAULT_EGYPT_ORG.id,
    service_id: 'srv_004',
    service_code: 'SRV-004',
    cash_price: 850.0,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'pli_005',
    price_list_version_id: 'plv_cash_v1',
    organization_id: DEFAULT_EGYPT_ORG.id,
    service_id: 'srv_005',
    service_code: 'SRV-005',
    cash_price: 2200.0,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'pli_006',
    price_list_version_id: 'plv_cash_v1',
    organization_id: DEFAULT_EGYPT_ORG.id,
    service_id: 'srv_006',
    service_code: 'SRV-006',
    cash_price: 1800.0,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'pli_007',
    price_list_version_id: 'plv_cash_v1',
    organization_id: DEFAULT_EGYPT_ORG.id,
    service_id: 'srv_007',
    service_code: 'SRV-007',
    cash_price: 500.0,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'pli_008',
    price_list_version_id: 'plv_cash_v1',
    organization_id: DEFAULT_EGYPT_ORG.id,
    service_id: 'srv_008',
    service_code: 'SRV-008',
    cash_price: 3500.0,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
  },
];

// ============================================================================
// 4. SEED INSURANCE COMPANIES, PLANS, PRICING & CARD TEMPLATES
// ============================================================================

export const SEED_INSURANCE_COMPANIES: InsuranceCompany[] = [
  // 1. AXA Egypt (Contracted)
  {
    id: 'ins_comp_axa',
    organization_id: DEFAULT_EGYPT_ORG.id,
    name_ar: 'شركة أكسا للتأمين مصر',
    name_en: 'AXA Insurance Egypt',
    code: 'AXA-EG',
    phone: '+20 2 2768 9000',
    email: 'medical.claims@axa.eg',
    contact_person: 'عمرو السعيد - مدير شبكة التعاقدات الطبية',
    allows_non_contracted_discount: false,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  // 2. MetLife Egypt (Contracted)
  {
    id: 'ins_comp_metlife',
    organization_id: DEFAULT_EGYPT_ORG.id,
    name_ar: 'ميتلايف مصر لتأمينات الحياة',
    name_en: 'MetLife Egypt',
    code: 'MET-EG',
    phone: '+20 2 19747',
    email: 'claims@metlife.eg',
    contact_person: 'مروة فهمي',
    allows_non_contracted_discount: false,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  // 3. Bupa Egypt (Uncontracted - organization configured 10% cash discount)
  {
    id: 'ins_comp_bupa',
    organization_id: DEFAULT_EGYPT_ORG.id,
    name_ar: 'بوبا للتأمين الطبي الدولي (غير متعاقد مباشر)',
    name_en: 'Bupa Global Egypt (Non-Contracted)',
    code: 'BUPA-EG',
    phone: '+20 2 2400 3000',
    email: 'egypt@bupa.com',
    allows_non_contracted_discount: true,
    non_contracted_discount_percentage: 10.0, // 10% discount on cash price for non-contracted patients
    active: false, // Uncontracted directly
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
];

export const SEED_INSURANCE_PLANS: InsurancePlan[] = [
  // AXA Gold Plan
  {
    id: 'plan_axa_gold',
    organization_id: DEFAULT_EGYPT_ORG.id,
    company_id: 'ins_comp_axa',
    name_ar: 'الخطة الذهبية لطب الأسنان (تغطية 80%)',
    name_en: 'Gold Dental Plan (80% Coverage)',
    code: 'AXA-GOLD-80',
    coverage_percentage_default: 80.0,
    patient_copay_percentage_default: 20.0,
    max_annual_limit: 15000.0,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  // MetLife Platinum
  {
    id: 'plan_met_plat',
    organization_id: DEFAULT_EGYPT_ORG.id,
    company_id: 'ins_comp_metlife',
    name_ar: 'بلاتينيوم للأسنان (تغطية 85%)',
    name_en: 'Platinum Dental Plan (85% Coverage)',
    code: 'MET-PLAT-85',
    coverage_percentage_default: 85.0,
    patient_copay_percentage_default: 15.0,
    max_annual_limit: 25000.0,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
];

export const SEED_INSURANCE_PRICE_LISTS: InsurancePriceList[] = [
  {
    id: 'ipl_axa_gold',
    organization_id: DEFAULT_EGYPT_ORG.id,
    company_id: 'ins_comp_axa',
    plan_id: 'plan_axa_gold',
    name: 'قائمة أسعار تعاقد أكسا - الخطة الذهبية 2026',
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
];

export const SEED_INSURANCE_PRICE_LIST_ITEMS: InsurancePriceListItem[] = [
  {
    id: 'ipli_axa_001',
    insurance_price_list_id: 'ipl_axa_gold',
    organization_id: DEFAULT_EGYPT_ORG.id,
    service_id: 'srv_001',
    service_code: 'SRV-001',
    insurance_price: 250.0, // Agreed contracted price
    coverage_percentage: 80.0,
    patient_copay_percentage: 20.0, // 50 EGP copay
    requires_approval: false,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'ipli_axa_003',
    insurance_price_list_id: 'ipl_axa_gold',
    organization_id: DEFAULT_EGYPT_ORG.id,
    service_id: 'srv_003',
    service_code: 'SRV-003',
    insurance_price: 500.0,
    coverage_percentage: 80.0,
    patient_copay_percentage: 20.0, // 100 EGP copay
    requires_approval: false,
    active: true,
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'ipli_axa_005',
    insurance_price_list_id: 'ipl_axa_gold',
    organization_id: DEFAULT_EGYPT_ORG.id,
    service_id: 'srv_005',
    service_code: 'SRV-005',
    insurance_price: 1900.0,
    coverage_percentage: 75.0,
    patient_copay_percentage: 25.0,
    requires_approval: true, // Endodontics requires insurance pre-approval
    active: true,
    created_at: '2026-01-01T08:00:00Z',
  },
];

export const SEED_INSURANCE_CARD_TEMPLATES: InsuranceCardTemplate[] = [
  {
    id: 'card_tpl_axa',
    organization_id: DEFAULT_EGYPT_ORG.id,
    company_id: 'ins_comp_axa',
    template_name: 'قالب بطاقة تأمين أكسا مصر (AXA Egypt Standard Card)',
    sample_card_image_url: '/assets/sample-axa-card.png',
    description: 'قالب بطاقة التأمين الصحي الصادرة من أكسا لعملاء الشركات والأفراد في مصر',
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
];

export const SEED_INSURANCE_CARD_FIELDS: InsuranceCardField[] = [
  {
    id: 'fld_axa_name',
    template_id: 'card_tpl_axa',
    organization_id: DEFAULT_EGYPT_ORG.id,
    field_key: 'patient_name',
    field_label_ar: 'اسم المستفيد / المريض',
    field_label_en: 'Member / Patient Name',
    required: true,
    field_type: 'text',
    display_order: 1,
    ocr_bounding_box: { x: 50, y: 120, width: 320, height: 40 },
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'fld_axa_member_id',
    template_id: 'card_tpl_axa',
    organization_id: DEFAULT_EGYPT_ORG.id,
    field_key: 'member_id',
    field_label_ar: 'رقم العضوية (Member ID)',
    field_label_en: 'Member ID',
    required: true,
    field_type: 'text',
    display_order: 2,
    ocr_bounding_box: { x: 50, y: 180, width: 220, height: 35 },
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'fld_axa_card_number',
    template_id: 'card_tpl_axa',
    organization_id: DEFAULT_EGYPT_ORG.id,
    field_key: 'card_number',
    field_label_ar: 'رقم البطاقة (Card Number)',
    field_label_en: 'Card Number',
    required: true,
    field_type: 'text',
    display_order: 3,
    ocr_bounding_box: { x: 50, y: 230, width: 280, height: 35 },
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'fld_axa_policy_number',
    template_id: 'card_tpl_axa',
    organization_id: DEFAULT_EGYPT_ORG.id,
    field_key: 'policy_number',
    field_label_ar: 'رقم الوثيقة / العقد',
    field_label_en: 'Policy / Contract Number',
    required: false,
    field_type: 'text',
    display_order: 4,
    ocr_bounding_box: { x: 300, y: 180, width: 180, height: 35 },
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'fld_axa_expiry_date',
    template_id: 'card_tpl_axa',
    organization_id: DEFAULT_EGYPT_ORG.id,
    field_key: 'expiry_date',
    field_label_ar: 'تاريخ انتهاء السريان',
    field_label_en: 'Expiry Date',
    required: true,
    field_type: 'date',
    display_order: 5,
    ocr_bounding_box: { x: 300, y: 230, width: 150, height: 35 },
    created_at: '2026-01-01T08:00:00Z',
  },
];

// ============================================================================
// 5. SEED APPOINTMENTS & WAITING LIST
// ============================================================================

// Helper to get today's date in YYYY-MM-DD
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const SEED_APPOINTMENTS: Appointment[] = [
  // Appointment 1: Ahmed Mohamed in Cairo Branch with Dr. Karim at 10:00 today
  {
    id: 'apt_cai_001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111', // Cairo Branch
    patient_id: 'a1111111-1111-1111-1111-111111111111', // Ahmed
    doctor_id: 'prof_doc_01', // Dr. Karim Hassan
    service_id: 'srv_003', // Scaling & Polishing
    appointment_date: getTodayDateString(),
    start_time: '10:00',
    end_time: '10:30',
    duration_minutes: 30,
    status: 'confirmed',
    booking_type: 'scheduled',
    notes: 'تنظيف جير دوري للفكين',
    created_by: 'prof_rec_01',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-01-10T10:00:00Z',
  },
  // Appointment 2: Laila Ahmed (Child) in Cairo Branch with Dr. Karim at 10:30 today
  {
    id: 'apt_cai_002',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    patient_id: 'b2222222-2222-2222-2222-222222222222', // Laila (Ward)
    doctor_id: 'prof_doc_01',
    service_id: 'srv_002', // Pediatric Consultation
    appointment_date: getTodayDateString(),
    start_time: '10:30',
    end_time: '11:00',
    duration_minutes: 30,
    status: 'arrived',
    booking_type: 'scheduled',
    notes: 'فحص دوري لأسنان الطفلة بحضور الأب',
    check_in_time: '2026-01-10T10:25:00Z',
    created_by: 'prof_rec_01',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-01-10T10:25:00Z',
  },
  // Appointment 3: Omar Ahmed (Child) in Cairo Branch with Dr. Mona at 12:30 today
  {
    id: 'apt_cai_003',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    patient_id: 'c3333333-3333-3333-3333-333333333333', // Omar (Ward)
    doctor_id: 'prof_bm_01', // Dr. Mona El-Gohary (Pediatric specialist)
    service_id: 'srv_002',
    appointment_date: getTodayDateString(),
    start_time: '12:30',
    end_time: '13:00',
    duration_minutes: 30,
    status: 'waiting',
    booking_type: 'scheduled',
    notes: 'شكوى من ألم في الضرس اللبني',
    check_in_time: '2026-01-10T12:20:00Z',
    created_by: 'prof_rec_01',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-01-10T12:20:00Z',
  },
  // Appointment 4: Alexandria Branch Appointment (For Branch Manager & Doctor scope testing)
  {
    id: 'apt_alx_001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '22222222-2222-2222-2222-222222222222', // Alexandria Branch
    patient_id: 'd4444444-4444-4444-4444-444444444444', // Mahmoud (Alexandria)
    doctor_id: 'prof_doc_01',
    service_id: 'srv_004', // Composite Filling
    appointment_date: getTodayDateString(),
    start_time: '15:00',
    end_time: '15:45',
    duration_minutes: 45,
    status: 'confirmed',
    booking_type: 'scheduled',
    notes: 'حشو ضوئي لفرع سموحة بالإسكندرية',
    created_by: 'prof_bm_01',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-01-10T10:00:00Z',
  },
];

export const SEED_WAITING_LIST: WaitingListEntry[] = [
  {
    id: 'wait_001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    patient_id: 'c3333333-3333-3333-3333-333333333333', // Omar Ahmed
    preferred_doctor_id: 'prof_bm_01',
    requested_service_id: 'srv_002',
    appointment_id: 'apt_cai_003',
    priority: 'normal',
    status: 'waiting',
    ticket_number: 'TK-01',
    check_in_time: new Date().toISOString(),
    estimated_wait_minutes: 10,
    notes: 'المريض في صالة الانتظار رقم 1',
    created_at: '2026-01-10T12:20:00Z',
    updated_at: '2026-01-10T12:20:00Z',
  },
];

export const SEED_CUSTOM_SERVICES: CustomPatientService[] = [
  {
    id: 'cust_srv_001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    service_name: 'حارس ليلي سيليكون مخصص للملاكمة والرياضة (Custom Sports Guard)',
    patient_price: 1500.0,
    reason: 'طلب مخصص للمريض غير مدرج في كتالوج الخدمات القياسي',
    created_by: 'prof_rec_01',
    status: 'pending_review',
    notes: 'بحاجة لاعتماد المدير وتحديد تكلفة معمل تصنيع السيليكون',
    created_at: '2026-01-10T11:00:00Z',
    updated_at: '2026-01-10T11:00:00Z',
  },
];

// ============================================================================
// 6. STORAGE ACCESSORS & RESET ENGINE
// ============================================================================

export function getStoredCategories(): ServiceCategory[] {
  const raw = safeStorage.getItem(RECEPTION_STORAGE_KEYS.SERVICE_CATEGORIES);
  return raw ? JSON.parse(raw) : SEED_SERVICE_CATEGORIES;
}

export function setStoredCategories(items: ServiceCategory[]): void {
  safeStorage.setItem(RECEPTION_STORAGE_KEYS.SERVICE_CATEGORIES, JSON.stringify(items));
}

export function getStoredServices(): DentalService[] {
  const raw = safeStorage.getItem(RECEPTION_STORAGE_KEYS.SERVICES);
  return raw ? JSON.parse(raw) : SEED_SERVICES;
}

export function setStoredServices(items: DentalService[]): void {
  safeStorage.setItem(RECEPTION_STORAGE_KEYS.SERVICES, JSON.stringify(items));
}

export function getStoredDoctorShifts(): DoctorShift[] {
  const raw = safeStorage.getItem(RECEPTION_STORAGE_KEYS.DOCTOR_SHIFTS);
  return raw ? JSON.parse(raw) : SEED_DOCTOR_SHIFTS;
}

export function setStoredDoctorShifts(items: DoctorShift[]): void {
  safeStorage.setItem(RECEPTION_STORAGE_KEYS.DOCTOR_SHIFTS, JSON.stringify(items));
}

export function getStoredAppointments(): Appointment[] {
  const raw = safeStorage.getItem(RECEPTION_STORAGE_KEYS.APPOINTMENTS);
  return raw ? JSON.parse(raw) : SEED_APPOINTMENTS;
}

export function setStoredAppointments(items: Appointment[]): void {
  safeStorage.setItem(RECEPTION_STORAGE_KEYS.APPOINTMENTS, JSON.stringify(items));
}

export function getStoredWaitingList(): WaitingListEntry[] {
  const raw = safeStorage.getItem(RECEPTION_STORAGE_KEYS.WAITING_LIST);
  return raw ? JSON.parse(raw) : SEED_WAITING_LIST;
}

export function setStoredWaitingList(items: WaitingListEntry[]): void {
  safeStorage.setItem(RECEPTION_STORAGE_KEYS.WAITING_LIST, JSON.stringify(items));
}

export function getStoredPriceLists(): PriceList[] {
  const raw = safeStorage.getItem(RECEPTION_STORAGE_KEYS.PRICE_LISTS);
  return raw ? JSON.parse(raw) : SEED_PRICE_LISTS;
}

export function setStoredPriceLists(items: PriceList[]): void {
  safeStorage.setItem(RECEPTION_STORAGE_KEYS.PRICE_LISTS, JSON.stringify(items));
}

export function getStoredPriceListVersions(): PriceListVersion[] {
  const raw = safeStorage.getItem(RECEPTION_STORAGE_KEYS.PRICE_LIST_VERSIONS);
  return raw ? JSON.parse(raw) : SEED_PRICE_LIST_VERSIONS;
}

export function setStoredPriceListVersions(items: PriceListVersion[]): void {
  safeStorage.setItem(RECEPTION_STORAGE_KEYS.PRICE_LIST_VERSIONS, JSON.stringify(items));
}

export function getStoredPriceListItems(): PriceListItem[] {
  const raw = safeStorage.getItem(RECEPTION_STORAGE_KEYS.PRICE_LIST_ITEMS);
  return raw ? JSON.parse(raw) : SEED_PRICE_LIST_ITEMS;
}

export function setStoredPriceListItems(items: PriceListItem[]): void {
  safeStorage.setItem(RECEPTION_STORAGE_KEYS.PRICE_LIST_ITEMS, JSON.stringify(items));
}

export function getStoredInsuranceCompanies(): InsuranceCompany[] {
  const raw = safeStorage.getItem(RECEPTION_STORAGE_KEYS.INSURANCE_COMPANIES);
  return raw ? JSON.parse(raw) : SEED_INSURANCE_COMPANIES;
}

export function setStoredInsuranceCompanies(items: InsuranceCompany[]): void {
  safeStorage.setItem(RECEPTION_STORAGE_KEYS.INSURANCE_COMPANIES, JSON.stringify(items));
}

export function getStoredInsurancePlans(): InsurancePlan[] {
  const raw = safeStorage.getItem(RECEPTION_STORAGE_KEYS.INSURANCE_PLANS);
  return raw ? JSON.parse(raw) : SEED_INSURANCE_PLANS;
}

export function setStoredInsurancePlans(items: InsurancePlan[]): void {
  safeStorage.setItem(RECEPTION_STORAGE_KEYS.INSURANCE_PLANS, JSON.stringify(items));
}

export function getStoredInsurancePriceLists(): InsurancePriceList[] {
  const raw = safeStorage.getItem(RECEPTION_STORAGE_KEYS.INSURANCE_PRICE_LISTS);
  return raw ? JSON.parse(raw) : SEED_INSURANCE_PRICE_LISTS;
}

export function setStoredInsurancePriceLists(items: InsurancePriceList[]): void {
  safeStorage.setItem(RECEPTION_STORAGE_KEYS.INSURANCE_PRICE_LISTS, JSON.stringify(items));
}

export function getStoredInsurancePriceListItems(): InsurancePriceListItem[] {
  const raw = safeStorage.getItem(RECEPTION_STORAGE_KEYS.INSURANCE_PRICE_LIST_ITEMS);
  return raw ? JSON.parse(raw) : SEED_INSURANCE_PRICE_LIST_ITEMS;
}

export function setStoredInsurancePriceListItems(items: InsurancePriceListItem[]): void {
  safeStorage.setItem(RECEPTION_STORAGE_KEYS.INSURANCE_PRICE_LIST_ITEMS, JSON.stringify(items));
}

export function getStoredInsuranceCardTemplates(): InsuranceCardTemplate[] {
  const raw = safeStorage.getItem(RECEPTION_STORAGE_KEYS.INSURANCE_CARD_TEMPLATES);
  return raw ? JSON.parse(raw) : SEED_INSURANCE_CARD_TEMPLATES;
}

export function setStoredInsuranceCardTemplates(items: InsuranceCardTemplate[]): void {
  safeStorage.setItem(RECEPTION_STORAGE_KEYS.INSURANCE_CARD_TEMPLATES, JSON.stringify(items));
}

export function getStoredInsuranceCardFields(): InsuranceCardField[] {
  const raw = safeStorage.getItem(RECEPTION_STORAGE_KEYS.INSURANCE_CARD_FIELDS);
  return raw ? JSON.parse(raw) : SEED_INSURANCE_CARD_FIELDS;
}

export function setStoredInsuranceCardFields(items: InsuranceCardField[]): void {
  safeStorage.setItem(RECEPTION_STORAGE_KEYS.INSURANCE_CARD_FIELDS, JSON.stringify(items));
}

export function getStoredCustomPatientServices(): CustomPatientService[] {
  const raw = safeStorage.getItem(RECEPTION_STORAGE_KEYS.CUSTOM_PATIENT_SERVICES);
  return raw ? JSON.parse(raw) : SEED_CUSTOM_SERVICES;
}

export function setStoredCustomPatientServices(items: CustomPatientService[]): void {
  safeStorage.setItem(RECEPTION_STORAGE_KEYS.CUSTOM_PATIENT_SERVICES, JSON.stringify(items));
}

export function resetPhase3StorageToSeeds(): void {
  setStoredCategories(SEED_SERVICE_CATEGORIES);
  setStoredServices(SEED_SERVICES);
  setStoredDoctorShifts(SEED_DOCTOR_SHIFTS);
  setStoredAppointments(SEED_APPOINTMENTS);
  setStoredWaitingList(SEED_WAITING_LIST);
  setStoredPriceLists(SEED_PRICE_LISTS);
  setStoredPriceListVersions(SEED_PRICE_LIST_VERSIONS);
  setStoredPriceListItems(SEED_PRICE_LIST_ITEMS);
  setStoredInsuranceCompanies(SEED_INSURANCE_COMPANIES);
  setStoredInsurancePlans(SEED_INSURANCE_PLANS);
  setStoredInsurancePriceLists(SEED_INSURANCE_PRICE_LISTS);
  setStoredInsurancePriceListItems(SEED_INSURANCE_PRICE_LIST_ITEMS);
  setStoredInsuranceCardTemplates(SEED_INSURANCE_CARD_TEMPLATES);
  setStoredInsuranceCardFields(SEED_INSURANCE_CARD_FIELDS);
  setStoredCustomPatientServices(SEED_CUSTOM_SERVICES);
}

// ============================================================================
// 7. BUSINESS RULES & DETERMINISTIC LOGIC ENGINE
// ============================================================================

/**
 * 1. Child / Adult classification from DOB
 */
export function classifyPatientAge(
  dateOfBirth: string,
  referenceDate = new Date()
): { age: number; isChild: boolean; classification: 'child' | 'adult' } {
  if (!dateOfBirth) {
    return { age: 30, isChild: false, classification: 'adult' };
  }
  const dob = new Date(dateOfBirth);
  let age = referenceDate.getFullYear() - dob.getFullYear();
  const m = referenceDate.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < dob.getDate())) {
    age--;
  }
  const isChild = age < 18;
  return {
    age: Math.max(0, age),
    isChild,
    classification: isChild ? 'child' : 'adult',
  };
}

/**
 * 2. Doctor Availability Evaluator
 * Checks doctor's shifts on a specific date, minus break times and booked appointments.
 */
export function getDoctorAvailableSlots(
  doctorId: string,
  branchId: string,
  dateString: string
): { slot: string; available: boolean; conflictReason?: string }[] {
  const date = new Date(dateString);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  const shifts = getStoredDoctorShifts().filter(
    (s) =>
      s.doctor_id === doctorId &&
      s.branch_id === branchId &&
      s.day_of_week === dayOfWeek &&
      s.active
  );

  if (shifts.length === 0) {
    return [];
  }

  const shift = shifts[0];
  const slotMinutes = shift.slot_duration_minutes || 30;

  // Convert HH:MM to total minutes from midnight
  const toMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };
  const toTimeString = (totalMins: number) => {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const shiftStart = toMinutes(shift.start_time);
  const shiftEnd = toMinutes(shift.end_time);
  const breakStart = shift.break_start ? toMinutes(shift.break_start) : null;
  const breakEnd = shift.break_end ? toMinutes(shift.break_end) : null;

  // Existing non-cancelled appointments for this doctor on this date
  const bookedAppointments = getStoredAppointments().filter(
    (a) =>
      a.doctor_id === doctorId &&
      a.appointment_date === dateString &&
      a.status !== 'cancelled'
  );

  const bookedIntervals = bookedAppointments.map((a) => ({
    start: toMinutes(a.start_time),
    end: toMinutes(a.end_time),
  }));

  const results: { slot: string; available: boolean; conflictReason?: string }[] = [];

  for (let t = shiftStart; t + slotMinutes <= shiftEnd; t += slotMinutes) {
    const slotTimeStr = toTimeString(t);
    const slotEndMins = t + slotMinutes;

    // Check break
    if (breakStart !== null && breakEnd !== null) {
      if (t >= breakStart && t < breakEnd) {
        results.push({
          slot: slotTimeStr,
          available: false,
          conflictReason: 'Doctor Break Time',
        });
        continue;
      }
    }

    // Check overlap with booked appointments
    const overlap = bookedIntervals.some((b) => Math.max(t, b.start) < Math.min(slotEndMins, b.end));

    if (overlap) {
      results.push({
        slot: slotTimeStr,
        available: false,
        conflictReason: 'Already Booked',
      });
    } else {
      results.push({
        slot: slotTimeStr,
        available: true,
      });
    }
  }

  return results;
}

/**
 * 3. RLS Filtered Appointments for Internal Staff
 */
export function getAppointmentsForUser(
  userProfileId: string,
  userRoleKey: RoleKey,
  assignedBranchIds: string[],
  orgId: string
): Appointment[] {
  const all = getStoredAppointments().filter((a) => a.organization_id === orgId);

  // Center Manager: Org-wide access (sees all branches)
  if (userRoleKey === 'center_manager') {
    return all;
  }

  // Doctor: Sees appointments in their assigned branches OR where doctor_id === profileId
  if (userRoleKey === 'doctor') {
    return all.filter(
      (a) => a.doctor_id === userProfileId || assignedBranchIds.includes(a.branch_id)
    );
  }

  // Branch Manager & Receptionist: ONLY sees appointments in assigned branches
  return all.filter((a) => assignedBranchIds.includes(a.branch_id));
}

/**
 * 4. RLS Filtered Waiting List for Internal Staff
 */
export function getWaitingListForUser(
  userProfileId: string,
  userRoleKey: RoleKey,
  assignedBranchIds: string[],
  orgId: string
): WaitingListEntry[] {
  const all = getStoredWaitingList().filter((w) => w.organization_id === orgId);

  if (userRoleKey === 'center_manager') {
    return all;
  }
  return all.filter((w) => assignedBranchIds.includes(w.branch_id));
}

/**
 * 5. Book Appointment with Shared Mobile Handling & Pediatric Rules
 */
export function bookAppointment(params: {
  organizationId?: string;
  branchId?: string;
  isNewPatient?: boolean;
  existingPatientId?: string;
  newPatientData?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    mobile?: string;
    mobile_primary?: string;
    dateOfBirth?: string;
    date_of_birth?: string;
    gender?: 'male' | 'female' | 'other';
    insuranceCompany?: string;
    insurance_company?: string;
    national_id?: string;
  };
  doctorId?: string;
  serviceId?: string;
  appointmentDate?: string;
  startTime?: string;
  durationMinutes?: number;
  notes?: string;
  actorUserId?: string;
  appointmentData?: {
    organization_id?: string;
    branch_id?: string;
    doctor_id?: string;
    service_id?: string;
    appointment_date?: string;
    start_time?: string;
    end_time?: string;
    status?: AppointmentStatus;
    notes?: string;
    booked_by_staff_id?: string;
  };
}): { success: boolean; appointment?: Appointment; error?: string } {
  const aptData = params.appointmentData;
  const organizationId = params.organizationId || aptData?.organization_id || 'org_dental_egy_01';
  const branchId = params.branchId || aptData?.branch_id || '11111111-1111-1111-1111-111111111111';
  const doctorId = params.doctorId || aptData?.doctor_id || '';
  const serviceId = params.serviceId || aptData?.service_id;
  const appointmentDate = params.appointmentDate || aptData?.appointment_date || getTodayDateString();
  const startTime = params.startTime || aptData?.start_time || '09:00';
  const durationMinutes = params.durationMinutes || 30;
  const notes = params.notes || aptData?.notes;
  const actorUserId = params.actorUserId || aptData?.booked_by_staff_id;
  const isNewPatient = params.isNewPatient ?? false;
  const existingPatientId = params.existingPatientId;
  const newPatientData = params.newPatientData;

  let patientId = existingPatientId;

  // Handle New vs Existing Patient
  if (isNewPatient) {
    const fName = newPatientData?.firstName || newPatientData?.first_name;
    const lName = newPatientData?.lastName || newPatientData?.last_name;
    const mob = newPatientData?.mobile || newPatientData?.mobile_primary;

    if (!newPatientData || !fName || !lName || !mob) {
      return { success: false, error: 'Missing required new patient details (Name and Mobile).' };
    }

    const allPatients = getStoredPatients();
    const newCode = `PAT-${String(allPatients.length + 1).padStart(6, '0')}`;
    const newPatient: Patient = {
      id: `pat_new_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organization_id: organizationId,
      patient_code: newCode,
      first_name: fName.trim(),
      middle_name: (newPatientData.middleName || newPatientData.middle_name || '').trim(),
      last_name: lName.trim(),
      date_of_birth: newPatientData.dateOfBirth || newPatientData.date_of_birth || '2000-01-01',
      gender: newPatientData.gender || 'male',
      primary_mobile: mob.trim(),
      insurance_company: newPatientData.insuranceCompany || newPatientData.insurance_company || undefined,
      preferred_language: 'ar',
      country_code: '+20',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    allPatients.push(newPatient);
    setStoredPatients(allPatients);
    patientId = newPatient.id;
  }

  if (!patientId) {
    return { success: false, error: 'Patient ID is required.' };
  }

  // Calculate End Time
  const [h, m] = startTime.split(':').map(Number);
  const endTotal = h * 60 + m + durationMinutes;
  const endH = Math.floor(endTotal / 60);
  const endM = endTotal % 60;
  const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

  // Check Doctor Availability
  const slots = getDoctorAvailableSlots(doctorId, branchId, appointmentDate);
  const requestedSlot = slots.find((s) => s.slot === startTime);

  if (requestedSlot && !requestedSlot.available) {
    return {
      success: false,
      error: `Doctor is not available at ${startTime}: ${requestedSlot.conflictReason || 'Conflict'}`,
    };
  }

  const newApt: Appointment = {
    id: `apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    organization_id: organizationId,
    branch_id: branchId,
    patient_id: patientId,
    doctor_id: doctorId,
    service_id: serviceId,
    appointment_date: appointmentDate,
    start_time: startTime,
    end_time: endTime,
    duration_minutes: durationMinutes,
    status: 'confirmed',
    booking_type: 'scheduled',
    notes,
    created_by: actorUserId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const appointments = getStoredAppointments();
  appointments.push(newApt);
  setStoredAppointments(appointments);

  return { success: true, appointment: newApt };
}

/**
 * 6. Walk-in Registration into Waiting List
 */
export function addWalkInToWaitingList(params: {
  organizationId: string;
  branchId: string;
  patientId: string;
  preferredDoctorId?: string;
  requestedServiceId?: string;
  priority?: WaitingPriority;
  estimatedWaitMinutes?: number;
  notes?: string;
}): { success: boolean; entry?: WaitingListEntry } {
  const waitingList = getStoredWaitingList();
  const countToday = waitingList.length + 1;
  const ticketNumber = `TK-${String(countToday).padStart(2, '0')}`;

  const entry: WaitingListEntry = {
    id: `wait_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    organization_id: params.organizationId,
    branch_id: params.branchId,
    patient_id: params.patientId,
    preferred_doctor_id: params.preferredDoctorId,
    requested_service_id: params.requestedServiceId,
    priority: params.priority || 'normal',
    status: 'waiting',
    ticket_number: ticketNumber,
    check_in_time: new Date().toISOString(),
    estimated_wait_minutes: params.estimatedWaitMinutes || 15,
    notes: params.notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  waitingList.push(entry);
  setStoredWaitingList(waitingList);
  return { success: true, entry };
}

/**
 * 7. Update Appointment Status
 */
export function updateAppointmentStatus(
  appointmentId: string,
  newStatus: AppointmentStatus,
  reason?: string
): boolean {
  const appointments = getStoredAppointments();
  const apt = appointments.find((a) => a.id === appointmentId);
  if (!apt) return false;

  apt.status = newStatus;
  apt.updated_at = new Date().toISOString();
  if (reason) apt.cancellation_reason = reason;
  if (newStatus === 'arrived' && !apt.check_in_time) {
    apt.check_in_time = new Date().toISOString();
  }

  setStoredAppointments(appointments);
  return true;
}

/**
 * 8. Pricing Resolution (Deterministic, NO AI)
 * Patient -> Insurance Company -> Insurance Plan -> Service -> Contracted Price
 * Fallbacks: Cash Price or Non-contracted configured discount
 */
export function resolvePricing(params: {
  organizationId?: string;
  patientId?: string;
  serviceId: string;
  patientInsuranceCompanyId?: string;
  patientInsurancePlanId?: string;
}): PricingResolutionResult {
  const organizationId = params.organizationId || 'org_dental_egy_01';
  const { patientId, serviceId, patientInsuranceCompanyId, patientInsurancePlanId } = params;

  // 1. Get Service
  const service = getStoredServices().find(
    (s) => s.id === serviceId && s.organization_id === organizationId
  );

  // 2. Get Published Cash Price
  const publishedVersions = getStoredPriceListVersions().filter(
    (v) => v.organization_id === organizationId && v.status === 'published'
  );
  const latestPublishedVersion = publishedVersions[publishedVersions.length - 1];

  let defaultCashPrice = 300.0; // fallback
  if (latestPublishedVersion) {
    const item = getStoredPriceListItems().find(
      (pi) =>
        pi.price_list_version_id === latestPublishedVersion.id &&
        pi.service_id === serviceId &&
        pi.active
    );
    if (item) {
      defaultCashPrice = item.cash_price;
    }
  }

  // 3. Check Patient Insurance
  const patient = patientId
    ? getStoredPatients().find((p) => p.id === patientId && p.organization_id === organizationId)
    : undefined;

  const rawCompanyId = patientInsuranceCompanyId || patient?.insurance_company;

  // Case A: No insurance declared
  if (!rawCompanyId) {
    return {
      price_type: 'cash',
      total_price: defaultCashPrice,
      patient_copay: defaultCashPrice,
      insurance_coverage: 0,
      coverage_percentage: 0,
      copay_percentage: 100,
      requires_approval: service?.requires_approval || false,
    };
  }

  // Case B: Has insurance company name/code
  const insuranceCompanies = getStoredInsuranceCompanies().filter(
    (c) => c.organization_id === organizationId
  );
  const matchedCompany = insuranceCompanies.find(
    (c) =>
      c.id === rawCompanyId ||
      c.code.toLowerCase() === rawCompanyId?.toLowerCase() ||
      c.name_ar.includes(rawCompanyId || '') ||
      c.name_en.toLowerCase().includes((rawCompanyId || '').toLowerCase())
  );

  // If company not found or explicitly uncontracted
  if (!matchedCompany || !matchedCompany.active) {
    // Check if non-contracted discount is configured
    if (matchedCompany && matchedCompany.allows_non_contracted_discount) {
      const discountPct = matchedCompany.non_contracted_discount_percentage || 0;
      const discountedPrice = defaultCashPrice * (1 - discountPct / 100);
      return {
        price_type: 'non_contracted_discount',
        total_price: discountedPrice,
        patient_copay: discountedPrice,
        insurance_coverage: 0,
        coverage_percentage: 0,
        copay_percentage: 100,
        requires_approval: false,
        message_ar: `شركة التأمين (${patient.insurance_company}) غير متعاقدة مباشرة. تم تطبيق خصم نقدي قدره ${discountPct}%.`,
        message_en: `Insurance company is not contracted with this clinic/center. Applied ${discountPct}% courtesy cash discount.`,
      };
    }

    return {
      price_type: 'not_contracted',
      total_price: defaultCashPrice,
      patient_copay: defaultCashPrice,
      insurance_coverage: 0,
      coverage_percentage: 0,
      copay_percentage: 100,
      requires_approval: false,
      message_ar: 'شركة التأمين غير متعاقدة مع هذه العيادة / المركز.',
      message_en: 'Insurance company is not contracted with this clinic/center.',
    };
  }

  // Case C: Contracted Insurance Company -> Look up Plan & Contracted Price
  const plans = getStoredInsurancePlans().filter(
    (p) => p.company_id === matchedCompany.id && p.active
  );
  const activePlan = plans[0]; // Primary plan

  const priceLists = getStoredInsurancePriceLists().filter(
    (pl) => pl.company_id === matchedCompany.id && pl.active
  );
  const primaryPriceList = priceLists[0];

  let contractPrice = defaultCashPrice;
  let coveragePct = activePlan?.coverage_percentage_default ?? 80;
  let copayPct = activePlan?.patient_copay_percentage_default ?? 20;
  let reqApproval = service?.requires_approval || false;

  if (primaryPriceList) {
    const item = getStoredInsurancePriceListItems().find(
      (i) => i.insurance_price_list_id === primaryPriceList.id && i.service_id === serviceId && i.active
    );
    if (item) {
      contractPrice = item.insurance_price;
      coveragePct = item.coverage_percentage;
      copayPct = item.patient_copay_percentage;
      reqApproval = item.requires_approval;
    }
  }

  const insuranceCoverage = (contractPrice * coveragePct) / 100;
  const patientCopay = (contractPrice * copayPct) / 100;

  return {
    price_type: 'contracted_insurance',
    total_price: contractPrice,
    patient_copay: Math.round(patientCopay * 100) / 100,
    insurance_coverage: Math.round(insuranceCoverage * 100) / 100,
    coverage_percentage: coveragePct,
    copay_percentage: copayPct,
    requires_approval: reqApproval,
    message_ar: `تغطية تأمينية معتمدة (${matchedCompany.name_ar}) بنسبة ${coveragePct}%`,
    message_en: `Contracted coverage (${matchedCompany.name_en}) at ${coveragePct}%`,
  };
}

/**
 * 9. Excel Price List Row Validation
 * Validates:
 * - missing service code or name
 * - invalid price (negative, NaN)
 * - duplicate service code in file
 * - duplicate row
 * - unknown category
 */
export function validateExcelPriceListRows(
  rows: {
    service_code?: string;
    service_name_ar?: string;
    service_name_en?: string;
    category?: string;
    cash_price?: any;
    active?: any;
  }[]
): ExcelImportResult {
  const allowedCategories = [
    'examinations',
    'preventive',
    'restorative',
    'endodontics',
    'periodontics',
    'surgery',
    'orthodontics',
    'pediatric',
    'prosthetics',
  ];

  const seenCodes = new Set<string>();
  const seenRowSignatures = new Set<string>();
  const validatedRows: ExcelRowValidation[] = [];

  let validCount = 0;
  let invalidCount = 0;

  rows.forEach((r, idx) => {
    const rowNumber = idx + 1;
    const errors: string[] = [];

    const code = String(r.service_code || '').trim().toUpperCase();
    const nameAr = String(r.service_name_ar || '').trim();
    const nameEn = String(r.service_name_en || '').trim();
    const category = String(r.category || '').trim().toLowerCase();
    const rawPrice = r.cash_price;
    const priceNum = Number(rawPrice);
    const active = r.active === true || String(r.active).toLowerCase() === 'true' || r.active === 1;

    // Check missing fields
    if (!code) errors.push('Missing Service Code (كود الخدمة مفقود)');
    if (!nameAr && !nameEn) errors.push('Missing Service Name (اسم الخدمة مفقود بالعربية أو الإنجليزية)');

    // Check price
    if (rawPrice === undefined || rawPrice === null || rawPrice === '' || isNaN(priceNum) || priceNum < 0) {
      errors.push(`Invalid Cash Price '${rawPrice}' (السعر النقدي غير صالح أو سالب)`);
    }

    // Check category
    if (category && !allowedCategories.includes(category)) {
      errors.push(`Unknown Category '${category}' (تصنيف طبي غير معروف)`);
    }

    // Check duplicate code
    if (code) {
      if (seenCodes.has(code)) {
        errors.push(`Duplicate Service Code '${code}' in spreadsheet (كود الخدمة مكرر في الملف)`);
      } else {
        seenCodes.add(code);
      }
    }

    // Check duplicate identical row
    const rowSignature = `${code}|${nameAr}|${nameEn}|${priceNum}`;
    if (seenRowSignatures.has(rowSignature)) {
      errors.push('Duplicate row detected (صف مكرر بالكامل)');
    } else {
      seenRowSignatures.add(rowSignature);
    }

    const isValid = errors.length === 0;
    if (isValid) validCount++;
    else invalidCount++;

    validatedRows.push({
      row_number: rowNumber,
      service_code: code,
      service_name_ar: nameAr || nameEn,
      service_name_en: nameEn || nameAr,
      category: category || 'restorative',
      cash_price: isNaN(priceNum) ? 0 : priceNum,
      active,
      is_valid: isValid,
      errors,
    });
  });

  return {
    total_rows: rows.length,
    valid_rows: validCount,
    invalid_rows: invalidCount,
    rows: validatedRows,
  };
}

/**
 * 10. Price List Versioning Engine: Draft -> Validate -> Preview -> Publish -> Archive
 * Never mutates historical records.
 */
export function publishNewPriceListVersion(params: {
  organizationId?: string;
  organization_id?: string;
  priceListId?: string;
  price_list_id?: string;
  validRows?: ExcelRowValidation[];
  validatedRows?: ExcelRowValidation[];
  actorUserId?: string;
  publishedByStaffId?: string;
  created_by?: string;
  notes?: string;
  effectiveFrom?: string;
  effective_from?: string;
}): { success: boolean; newVersion?: PriceListVersion; itemsCount: number } {
  const organizationId = params.organizationId || params.organization_id || 'org_dental_egy_01';
  const priceListId = params.priceListId || params.price_list_id || '';
  const validRows = params.validRows || params.validatedRows || [];
  const actorUserId = params.actorUserId || params.publishedByStaffId || params.created_by;
  const { notes, effectiveFrom, effective_from } = params;

  const versions = getStoredPriceListVersions();
  const currentVersions = versions.filter(
    (v) => v.price_list_id === priceListId && v.organization_id === organizationId
  );

  // Archive previously published version
  currentVersions.forEach((v) => {
    if (v.status === 'published') {
      v.status = 'archived';
      v.effective_to = getTodayDateString();
    }
  });

  const nextVersionNum = currentVersions.length + 1;
  const newVersionId = `plv_${Date.now()}_v${nextVersionNum}`;

  const newVersion: PriceListVersion = {
    id: newVersionId,
    price_list_id: priceListId,
    organization_id: organizationId,
    version_number: nextVersionNum,
    status: 'published',
    published_at: new Date().toISOString(),
    effective_from: effectiveFrom || effective_from || getTodayDateString(),
    created_by: actorUserId,
    notes: notes || `إصدار معتمد جديد رقم ${nextVersionNum} من ملف إكسل`,
    created_at: new Date().toISOString(),
  };

  versions.push(newVersion);
  setStoredPriceListVersions(versions);

  // Insert Price List Items for this version
  const services = getStoredServices();
  const allPriceItems = getStoredPriceListItems();

  validRows.forEach((vr) => {
    // Find or create service in catalog
    let srv = services.find(
      (s) => s.code.toUpperCase() === vr.service_code.toUpperCase() && s.organization_id === organizationId
    );
    if (!srv) {
      srv = {
        id: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        organization_id: organizationId,
        code: vr.service_code,
        name_ar: vr.service_name_ar,
        name_en: vr.service_name_en,
        category: vr.category,
        default_duration_minutes: 30,
        requires_approval: false,
        requires_doctor: true,
        active: vr.active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      services.push(srv);
    }

    allPriceItems.push({
      id: `pli_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      price_list_version_id: newVersionId,
      organization_id: organizationId,
      service_id: srv.id,
      service_code: vr.service_code,
      cash_price: vr.cash_price,
      active: vr.active,
      created_at: new Date().toISOString(),
    });
  });

  setStoredServices(services);
  setStoredPriceListItems(allPriceItems);

  return { success: true, newVersion, itemsCount: validRows.length };
}

/**
 * 11. Custom Patient Service Creation & Review
 */
export function addCustomPatientService(params: {
  organizationId?: string;
  organization_id?: string;
  branchId?: string;
  branch_id?: string;
  patientId?: string;
  patient_id?: string;
  serviceName?: string;
  service_name?: string;
  custom_service_name?: string;
  patientPrice?: number;
  patient_price?: number;
  agreed_patient_price?: number;
  reason?: string;
  actorUserId?: string;
  created_by?: string;
  created_by_staff_id?: string;
  appointmentId?: string;
  appointment_id?: string;
}): CustomPatientService {
  const customServices = getStoredCustomPatientServices();
  const orgId = params.organizationId || params.organization_id || 'org_dental_egy_01';
  const brId = params.branchId || params.branch_id || '11111111-1111-1111-1111-111111111111';
  const patId = params.patientId || params.patient_id || '';
  const sName = params.serviceName || params.service_name || params.custom_service_name || 'Custom Dental Service';
  const price = params.patientPrice !== undefined
    ? params.patientPrice
    : (params.patient_price !== undefined ? params.patient_price : (params.agreed_patient_price || 0));
  const reas = params.reason || '';
  const actor = params.actorUserId || params.created_by || params.created_by_staff_id;
  const aptId = params.appointmentId || params.appointment_id;

  const item: CustomPatientService = {
    id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    organization_id: orgId,
    branch_id: brId,
    patient_id: patId,
    appointment_id: aptId,
    service_name: sName.trim(),
    patient_price: Number(price),
    reason: reas.trim(),
    created_by: actor,
    status: 'pending_review',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  customServices.push(item);
  setStoredCustomPatientServices(customServices);
  return item;
}

export function reviewCustomPatientService(
  serviceIdOrParams:
    | string
    | {
        id?: string;
        serviceId?: string;
        status?: 'approved' | 'rejected' | 'assigned_standard';
        action?: 'approved' | 'rejected' | 'assigned_standard';
        assignedStandardServiceId?: string;
        actualSupplierCost?: number;
        supplierVendorCost?: number;
        adminNotes?: string;
        reviewedByStaffId?: string;
      },
  action?: 'approved' | 'rejected' | 'assigned_standard',
  assignedStandardServiceId?: string,
  supplierVendorCost?: number,
  adminNotes?: string
): boolean {
  let targetId: string;
  let targetAction: 'approved' | 'rejected' | 'assigned_standard' = 'approved';
  let targetAssignedServiceId: string | undefined = assignedStandardServiceId;
  let targetCost: number | undefined = supplierVendorCost;
  let targetNotes: string | undefined = adminNotes;

  if (typeof serviceIdOrParams === 'object') {
    targetId = serviceIdOrParams.id || serviceIdOrParams.serviceId || '';
    targetAction = serviceIdOrParams.status || serviceIdOrParams.action || 'approved';
    targetAssignedServiceId = serviceIdOrParams.assignedStandardServiceId;
    targetCost = serviceIdOrParams.actualSupplierCost ?? serviceIdOrParams.supplierVendorCost;
    targetNotes = serviceIdOrParams.adminNotes;
  } else {
    targetId = serviceIdOrParams;
    if (action) targetAction = action;
  }

  const items = getStoredCustomPatientServices();
  const found = items.find((i) => i.id === targetId);
  if (!found) return false;

  found.status = targetAction;
  if (targetAssignedServiceId) found.assigned_standard_service_id = targetAssignedServiceId;
  if (targetCost !== undefined) found.supplier_vendor_cost = targetCost;
  if (targetNotes) found.notes = targetNotes;
  found.updated_at = new Date().toISOString();

  setStoredCustomPatientServices(items);
  return true;
}

export const getStoredServiceCategories = getStoredCategories;

export function isCategoryInUse(categoryId: string): boolean {
  const services = getStoredServices();
  return services.some((s) => s.category_id === categoryId);
}

export function saveServiceCategory(category: Partial<ServiceCategory> & { id?: string; organization_id?: string }): ServiceCategory {
  const categories = getStoredCategories();
  const id = category.id || `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const index = categories.findIndex((c) => c.id === id);

  const normalized: ServiceCategory = {
    id,
    organization_id: category.organization_id || DEFAULT_EGYPT_ORG.id,
    code: (category.code || `CAT-${Date.now().toString().slice(-4)}`).trim().toUpperCase(),
    name_ar: (category.name_ar || 'تصنيف جديد').trim(),
    name_en: (category.name_en || 'New Category').trim(),
    display_order: category.display_order ?? (categories.length + 1),
    active: category.active !== undefined ? category.active : true,
    created_at: category.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (index >= 0) {
    categories[index] = normalized;
  } else {
    categories.push(normalized);
  }
  setStoredCategories(categories);
  return normalized;
}

export const addServiceCategory = saveServiceCategory;
export const updateServiceCategory = saveServiceCategory;

export function deactivateServiceCategory(categoryId: string): boolean {
  const categories = getStoredCategories();
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return false;
  cat.active = false;
  cat.updated_at = new Date().toISOString();
  setStoredCategories(categories);
  return true;
}

export function reactivateServiceCategory(categoryId: string): boolean {
  const categories = getStoredCategories();
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return false;
  cat.active = true;
  cat.updated_at = new Date().toISOString();
  setStoredCategories(categories);
  return true;
}

export function deleteServiceCategory(categoryId: string): { success: boolean; error?: string } {
  if (isCategoryInUse(categoryId)) {
    return {
      success: false,
      error: 'لا يمكن حذف التصنيف لاحتوائه على خدمات سنية مسجلة. يمكنك تعطيل التصنيف بدلاً من حذفه.',
    };
  }
  const categories = getStoredCategories();
  const filtered = categories.filter((c) => c.id !== categoryId);
  if (filtered.length === categories.length) {
    return { success: false, error: 'التصنيف غير موجود' };
  }
  setStoredCategories(filtered);
  return { success: true };
}

export function getCategoryServices(categoryId: string, onlyActive = true): DentalService[] {
  const services = getStoredServices();
  return services.filter((s) => s.category_id === categoryId && (!onlyActive || s.active !== false));
}

export function saveDoctorShift(shift: Partial<DoctorShift> & { id?: string; organization_id?: string }): DoctorShift {
  const shifts = getStoredDoctorShifts();
  const id = shift.id || `shift_${Date.now()}`;
  const index = shifts.findIndex((s) => s.id === id);
  const normalized: DoctorShift = {
    id,
    organization_id: shift.organization_id || 'org_dental_egy_01',
    branch_id: shift.branch_id || '11111111-1111-1111-1111-111111111111',
    doctor_id: shift.doctor_id || '',
    day_of_week: shift.day_of_week ?? 0,
    start_time: shift.start_time || '09:00',
    end_time: shift.end_time || '17:00',
    break_start: shift.break_start || shift.break_start_time,
    break_end: shift.break_end || shift.break_end_time,
    break_start_time: shift.break_start || shift.break_start_time,
    break_end_time: shift.break_end || shift.break_end_time,
    slot_duration_minutes: shift.slot_duration_minutes || 30,
    active: shift.active !== undefined ? shift.active : (shift.is_active ?? true),
    is_active: shift.active !== undefined ? shift.active : (shift.is_active ?? true),
    created_at: shift.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (index >= 0) {
    shifts[index] = normalized;
  } else {
    shifts.push(normalized);
  }
  setStoredDoctorShifts(shifts);
  return normalized;
}

export function saveService(service: Partial<DentalService> & { id?: string; organization_id?: string }): DentalService {
  const services = getStoredServices();
  const id = service.id || `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const index = services.findIndex((s) => s.id === id);

  // Validate category if specified
  if (service.category_id) {
    const categories = getStoredCategories();
    const cat = categories.find((c) => c.id === service.category_id);
    if (cat && !cat.active && index < 0) {
      throw new Error('لا يمكن إضافة خدمة جديدة إلى تصنيف معطل');
    }
  }

  const normalized: DentalService = {
    id,
    organization_id: service.organization_id || DEFAULT_EGYPT_ORG.id,
    category_id: service.category_id,
    code: (service.code || `SRV-${Date.now().toString().slice(-4)}`).trim().toUpperCase(),
    name_ar: (service.name_ar || 'خدمة جديدة').trim(),
    name_en: (service.name_en || 'New Service').trim(),
    category: service.category || 'عام',
    default_duration_minutes: service.default_duration_minutes || service.duration_minutes || 30,
    duration_minutes: service.default_duration_minutes || service.duration_minutes || 30,
    requires_approval: service.requires_approval ?? false,
    requires_doctor: service.requires_doctor ?? true,
    active: service.active !== undefined ? service.active : (service.is_active ?? true),
    is_active: service.active !== undefined ? service.active : (service.is_active ?? true),
    notes: service.notes,
    created_at: service.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (index >= 0) {
    services[index] = normalized;
  } else {
    services.push(normalized);
  }
  setStoredServices(services);
  return normalized;
}

export function deactivateService(serviceId: string): boolean {
  const services = getStoredServices();
  const srv = services.find((s) => s.id === serviceId);
  if (!srv) return false;
  srv.active = false;
  srv.is_active = false;
  srv.updated_at = new Date().toISOString();
  setStoredServices(services);
  return true;
}

export function reactivateService(serviceId: string): boolean {
  const services = getStoredServices();
  const srv = services.find((s) => s.id === serviceId);
  if (!srv) return false;
  srv.active = true;
  srv.is_active = true;
  srv.updated_at = new Date().toISOString();
  setStoredServices(services);
  return true;
}

export function saveInsuranceCompany(company: Partial<InsuranceCompany> & { id?: string; organization_id?: string }): InsuranceCompany {
  const companies = getStoredInsuranceCompanies();
  const id = company.id || `ins_co_${Date.now()}`;
  const index = companies.findIndex((c) => c.id === id);
  const normalized: InsuranceCompany = {
    id,
    organization_id: company.organization_id || 'org_dental_egy_01',
    name_ar: company.name_ar || 'شركة تأمين',
    name_en: company.name_en || 'Insurance Company',
    code: company.code || `INS-${Date.now().toString().slice(-4)}`,
    phone: company.phone || company.contact_phone,
    contact_phone: company.phone || company.contact_phone,
    email: company.email || company.contact_email,
    contact_email: company.email || company.contact_email,
    contact_person: company.contact_person,
    allows_non_contracted_discount: company.allows_non_contracted_discount ?? false,
    non_contracted_discount_percentage: company.non_contracted_discount_percentage ?? company.non_contracted_discount_percent,
    non_contracted_discount_percent: company.non_contracted_discount_percentage ?? company.non_contracted_discount_percent,
    is_contracted: company.is_contracted ?? true,
    active: company.active !== undefined ? company.active : (company.is_active ?? true),
    is_active: company.active !== undefined ? company.active : (company.is_active ?? true),
    created_at: company.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (index >= 0) {
    companies[index] = normalized;
  } else {
    companies.push(normalized);
  }
  setStoredInsuranceCompanies(companies);
  return normalized;
}

export function addWaitingListEntry(params: {
  organization_id: string;
  branch_id: string;
  patient_id: string;
  preferred_doctor_id?: string;
  requested_service_id?: string;
  priority?: WaitingPriority;
  status?: any;
  chief_complaint?: string;
}): WaitingListEntry {
  const res = addWalkInToWaitingList({
    organizationId: params.organization_id,
    branchId: params.branch_id,
    patientId: params.patient_id,
    preferredDoctorId: params.preferred_doctor_id,
    requestedServiceId: params.requested_service_id,
    priority: params.priority,
    notes: params.chief_complaint,
  });
  return res.entry!;
}

export const createCustomPatientService = addCustomPatientService;

export function updateWaitingListStatus(
  entryId: string,
  newStatus: WaitingStatus
): boolean {
  const list = getStoredWaitingList();
  const item = list.find((w) => w.id === entryId);
  if (!item) return false;
  item.status = newStatus;
  item.updated_at = new Date().toISOString();
  setStoredWaitingList(list);
  return true;
}


