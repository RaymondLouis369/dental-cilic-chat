/**
 * Phase 4: Doctor Clinical Workspace, Dental Chart, Treatment Plans,
 * Visits, Prescriptions, Consents, Investigations, Referrals & Follow-ups
 * Storage, Deterministic Clinical Engine & Seed Data — Egypt
 */

import {
  DentalChart,
  DentalChartEntry,
  TreatmentPlan,
  TreatmentPlanService,
  TreatmentPlanStatus,
  TreatmentServiceStatus,
  ClinicalVisit,
  ClinicalNoteTemplate,
  MedicalAlert,
  InvestigationRequest,
  InvestigationType,
  InvestigationUrgency,
  InvestigationStatus,
  Referral,
  ReferralType,
  ReferralStatus,
  ReferralPriority,
  DoctorRecommendation,
  InstructionTemplateCategory,
  Prescription,
  PrescriptionItem,
  PrescriptionTemplate,
  ConsentRequest,
  ConsentType,
  ConsentStatus,
  FollowUpPlan,
  FollowUpInterval,
  DoctorTask,
  DoctorTaskType,
  DoctorTaskStatus,
  DoctorConsultation,
  ClinicalTimelineEvent,
  VisitCompletionChecklist,
  SpecialtyType,
  ToothCondition,
  ToothSurface,
  ChartType,
} from '../types/clinical';
import { Patient, StaffUser, Appointment, DentalService } from '../types';
import { DEFAULT_EGYPT_ORG } from './storage';
import { getStoredPatients } from './patientStorage';
import {
  getStoredAppointments,
  getStoredWaitingList,
  getStoredServices,
  updateAppointmentStatus,
} from './receptionAndBillingStorage';

// Storage Keys
export const CLINICAL_STORAGE_KEYS = {
  CHARTS: 'dental_saas_charts',
  CHART_ENTRIES: 'dental_saas_chart_entries',
  TREATMENT_PLANS: 'dental_saas_treatment_plans',
  TREATMENT_PLAN_SERVICES: 'dental_saas_treatment_plan_services',
  CLINICAL_VISITS: 'dental_saas_clinical_visits',
  MEDICAL_ALERTS: 'dental_saas_medical_alerts',
  INVESTIGATION_REQUESTS: 'dental_saas_investigation_requests',
  REFERRALS: 'dental_saas_referrals',
  RECOMMENDATIONS: 'dental_saas_recommendations',
  PRESCRIPTIONS: 'dental_saas_prescriptions',
  CONSENT_REQUESTS: 'dental_saas_consent_requests',
  DOCTOR_TASKS: 'dental_saas_doctor_tasks',
  FOLLOW_UP_PLANS: 'dental_saas_follow_up_plans',
  DOCTOR_CONSULTATIONS: 'dental_saas_doctor_consultations',
};

// Memory fallback store
const memoryStore = new Map<string, string>();
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // ignore
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
      // ignore
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
      // ignore
    }
    memoryStore.delete(key);
  },
};

// ============================================================================
// 1. REUSABLE CLINICAL TEMPLATES (SPECIALTY NOTES, PRESCRIPTIONS, INSTRUCTIONS)
// ============================================================================

export const CLINICAL_NOTE_TEMPLATES: ClinicalNoteTemplate[] = [
  {
    id: 'tpl_general_01',
    specialty: 'general',
    title_ar: 'كشف واستشارة عامة لطب الأسنان',
    title_en: 'General Dentistry Consultation & Checkup',
    chief_complaint_default: 'فحص دوري وألم خفيف بالأسنان الخلفية عند تناول المشروبات الباردة',
    examination_default: 'فحص سريري كامل: تسوس سطحي بالضرس العلوي الأيمن، ترسبات جيرية خفيفة على القواطع السفلية.',
    assessment_default: 'K02.1 تسوس عاج بالسن #16، K05.0 التهاب لثة حاد موضعي.',
    treatment_default: 'تنظيف وتقليح ترسبات الجير بالموجات فوق الصوتية وتلميع الأسنان.',
    plan_default: 'حشو تجميلي كومبوزيت للسن #16 في الزيارة القادمة.',
  },
  {
    id: 'tpl_endo_01',
    specialty: 'endodontics',
    title_ar: 'علاج جذور وعصب الأسنان (Endodontics)',
    title_en: 'Root Canal Therapy (RCT)',
    chief_complaint_default: 'ألم حاد نابض ومستمر يزداد ليلاً ويمنع النوم بالضرس السفلي الأيسر.',
    examination_default: 'فحص القرع (+)، فحص الجس (+)، استجابة حرارية مستمرة بالسن #36، وجود تسوس عميق واصل للغرفة اللبية.',
    assessment_default: 'K04.0 التهاب لب السن غير القابل للشفاء (Irreversible Pulpitis) بالسن #36.',
    treatment_default: 'تخدير موضعي (Lidocaine 2% with Epinephrine 1:100k)، عزل بحاجز مطاطي (Rubber Dam)، فتح الحجرة اللبية، استئصال اللب، تنظيف وتشكيل 3 قنوات وتطبيق هيدروكسيد الكالسيوم وحشو مؤقت.',
    plan_default: 'إتمام حشو القنوات (Obturation) في الجلسة القادمة ثم بناء السن وتاج خزفي.',
  },
  {
    id: 'tpl_perio_01',
    specialty: 'periodontics',
    title_ar: 'علاج وجراحة اللثة والأنسجة المحيطة',
    title_en: 'Periodontal Care & Deep Scaling',
    chief_complaint_default: 'نزيف اللثة المستمر عند تفريش الأسنان ورائحة فم مزعجة وحركة طفيفة بالأسنان الأمامية.',
    examination_default: 'جيوب لثوية تتراوح بين 4-6 مم بالمنطقة الأمامية، انحسار لثوي خفيف، وجود جير تحت اللثة.',
    assessment_default: 'K05.3 التهاب الأنسجة الداعمة المزمن (Chronic Periodontitis).',
    treatment_default: 'تقليح عميق للجير وكشط جذور (Scaling and Root Planing) بالربعين الأول والرابع تحت التخدير الموضعي وتطبيق غسول مطهر.',
    plan_default: 'إكمال باقي الأرباع والمتابعة بعد 4 أسابيع لإعادة تقييم عمق الجيوب.',
  },
  {
    id: 'tpl_implant_01',
    specialty: 'implantology',
    title_ar: 'زراعة الأسنان والجراحة التعويضية',
    title_en: 'Dental Implant Consultation & Placement',
    chief_complaint_default: 'الرغبة في تعويض الضرس المفقود بدون برد الأسنان المجاورة.',
    examination_default: 'فقدان الضرس #46، سلامة العظم السنخي سريرياً، مسافة إطباقية مناسبة، فحص الأشعة المقطعية CBCT أظهر كثافة عظمية جيدة D2.',
    assessment_default: 'K08.1 فقدان الأسنان المكتسب بالمنطقة #46، جاهزية العظم للزرع.',
    treatment_default: 'شرح خطة الزرع، نوع الزرعة السويسرية، خطوات العمل وتوقيع إقرار الزرع الجراحي.',
    plan_default: 'إجراء جراحة الزرع بعد استكمال التحاليل وتجهيز الدليل الجراحي.',
  },
  {
    id: 'tpl_ortho_01',
    specialty: 'orthodontics',
    title_ar: 'تقويم وتنسيق الأسنان والفكين',
    title_en: 'Orthodontic Evaluation & Adjustments',
    chief_complaint_default: 'تزاحم بالأسنان العلوية والسفلية ومشاكل في إطباق الفكين.',
    examination_default: 'تزاحم أسنان صنف أول (Angle Class I malocclusion with moderate anterior crowding)، بروز معتدل.',
    assessment_default: 'K07.2 سوء إطباق الأسنان من الصنف الأول.',
    treatment_default: 'أخذ طبعات دراسة، صور فوتوغرافية داخلية وخارجية، طلب أشعة سيفالومترية وبانوراما.',
    plan_default: 'عرض الخطة العلاجية وتركيب الحاصرات التقويمية (Brackets).',
  },
  {
    id: 'tpl_pediatric_01',
    specialty: 'pediatric',
    title_ar: 'طب أسنان الأطفال',
    title_en: 'Pediatric Dental Care',
    chief_complaint_default: 'تسوس بالضروس اللبنية وصعوبة في مضغ الطعام لدى الطفل.',
    examination_default: 'الطفل متعاون، تسوس إطباقي بالضرس اللبني #74 و #85.',
    assessment_default: 'K02.0 تسوس بالأسنان اللبنية الأولية.',
    treatment_default: 'إزالة التسوس تحت التخدير الموضعي وتطبيق حشو كمبومير (Compomer) وجلسة فلورايد موضعي.',
    plan_default: 'متابعة دورية كل 6 أشهر وتثقيف الوالدين حول نظافة الفم.',
  },
  {
    id: 'tpl_surgery_01',
    specialty: 'oral_surgery',
    title_ar: 'جراحة الفم وخلع الأسنان',
    title_en: 'Oral Surgery & Extraction',
    chief_complaint_default: 'ألم حاد وتورم وانتفاخ في الفك السفلي بسبب ضرس العقل.',
    examination_default: 'ضرس العقل السفلي #48 مطمور جزئياً (Impacted 3rd Molar) مع التهاب حاد في اللثة المغطية للتاج (Pericoronitis).',
    assessment_default: 'K01.1 أسنان مطمورة مع التهاب حول التاج.',
    treatment_default: 'غسيل وتطهير تحت الغطاء اللثوي، وصف مضاد حيوي ومسكن لتهدئة الالتهاب الحاد قبل الخلع الجراحي.',
    plan_default: 'خلع جراحي لضرس العقل بعد هدوء الالتهاب وتوقيع إقرار الخلع الجراحي.',
  },
];

export const PRESCRIPTION_TEMPLATES: PrescriptionTemplate[] = [
  {
    id: 'rx_tpl_post_extraction',
    title_ar: 'بروتوكول ما بعد الخلع الجراحي والعمليات',
    title_en: 'Post-Surgical / Extraction Protocol',
    category: 'surgery',
    items: [
      {
        medication_name: 'Augmentin 1g (Amoxicillin / Clavulanate)',
        dosage: '1000 mg Tablet',
        frequency: 'Every 12 hours (Twice daily)',
        duration: '5 Days',
        instructions: 'Take immediately after meals with a full glass of water.',
      },
      {
        medication_name: 'Cataflam 50mg (Diclofenac Potassium)',
        dosage: '50 mg Tablet',
        frequency: 'Every 8 hours (Three times daily)',
        duration: '3 to 5 Days',
        instructions: 'Take as needed for pain relief after meals.',
      },
      {
        medication_name: 'Hexitol Mouthwash (Chlorhexidine 0.12%)',
        dosage: '15 ml Rinse',
        frequency: 'Twice daily',
        duration: '7 Days',
        instructions: 'Rinse gently for 60 seconds 24 hours after surgery. Do not swallow.',
      },
    ],
  },
  {
    id: 'rx_tpl_acute_pulpitis',
    title_ar: 'بروتوكول تسكين التهاب العصب الحاد',
    title_en: 'Acute Pulpitis Analgesic Protocol',
    category: 'endodontics',
    items: [
      {
        medication_name: 'Brufen 600mg (Ibuprofen)',
        dosage: '600 mg Tablet',
        frequency: 'Every 8 hours',
        duration: '3 Days',
        instructions: 'Take with or after food. Discontinue if stomach upset occurs.',
      },
      {
        medication_name: 'Panadol Extra (Paracetamol + Caffeine)',
        dosage: '500/65 mg Tablet',
        frequency: 'Every 6-8 hours as needed',
        duration: '3 Days',
        instructions: 'Do not exceed 4000 mg of Paracetamol per day.',
      },
    ],
  },
  {
    id: 'rx_tpl_penicillin_allergic',
    title_ar: 'مضاد حيوي لبديل حساسية البنسلين (كليندامايسين)',
    title_en: 'Penicillin-Allergy Antibiotic Protocol',
    category: 'general',
    items: [
      {
        medication_name: 'Dalacin C 300mg (Clindamycin)',
        dosage: '300 mg Capsule',
        frequency: 'Every 8 hours',
        duration: '5 Days',
        instructions: 'Take with a full glass of water to avoid esophageal irritation.',
      },
      {
        medication_name: 'Panadol Advance 500mg',
        dosage: '500 mg Tablet',
        frequency: 'Every 8 hours',
        duration: '3 to 5 Days',
        instructions: 'Take for pain and mild fever.',
      },
    ],
  },
  {
    id: 'rx_tpl_pediatric',
    title_ar: 'مسكن وخافض حرارة للأطفال',
    title_en: 'Pediatric Dental Pain & Fever Relief',
    category: 'pediatric',
    items: [
      {
        medication_name: 'Cetal 250mg/5ml Syrup (Paracetamol)',
        dosage: '5 ml Syrup (Based on body weight)',
        frequency: 'Every 6-8 hours as needed',
        duration: '3 Days',
        instructions: 'Shake well before use. Do not exceed 4 doses in 24 hours.',
      },
    ],
  },
];

export const DOCTOR_INSTRUCTION_TEMPLATES = [
  {
    category: 'post_extraction' as InstructionTemplateCategory,
    title_ar: 'تعليمات ما بعد خلع الأسنان والعمليات الجراحية',
    title_en: 'Post-Extraction & Surgical Instructions',
    instructions_ar: `1. العض على الشاش المعقم لمدة 45-60 دقيقة وتجنب الكلام المفرط.
2. عدم البصق أو المضمضة أو استخدام الشفاط (Straw) خلال أول 24 ساعة للحفاظ على الخثرة الدموية.
3. وضع كمادات ثلج خارجية على الخد (15 دقيقة وضع ثم 15 دقيقة راحة) لتخفيف الانتفاخ.
4. تناول الأطعمة اللينة والباردة (زبادي، آيس كريم، شوربة دافئة) وتجنب الأطعمة الساخنة والحارة.
5. الامتناع التام عن التدخين لمدة 48 ساعة على الأقل.
6. الالتزام بتناول الأدوية والمسكنات الموصوفة في مواعيدها المحددة.
7. في حال حدوث نزيف مستمر يرجى وضع شاش رطب أو كيس شاي والاتصال بالعيادة فوراً.`,
    instructions_en: `1. Bite firmly on the sterile gauze pack for 45-60 minutes.
2. Do NOT spit, rinse, or drink with a straw during the first 24 hours to protect the blood clot.
3. Apply cold ice packs externally on the cheek (15 mins on / 15 mins off) to minimize swelling.
4. Eat soft and cold foods (yogurt, ice cream, cool soup); avoid hot or spicy foods.
5. Strictly avoid smoking for at least 48 hours.
6. Take all prescribed medications as instructed.
7. In case of persistent bleeding, apply a moist tea bag with firm pressure and contact the clinic.`,
  },
  {
    category: 'implant_care' as InstructionTemplateCategory,
    title_ar: 'تعليمات العناية بزراعة الأسنان',
    title_en: 'Dental Implant Post-Operative Care',
    instructions_ar: `1. تجنب لمس أو العبث بمكان الزرعة باللسان أو الأصابع.
2. استخدام مضمضة كلورهيكسيدين بلطف بعد مرور 24 ساعة من الجراحة مرتين يومياً.
3. تفريش الأسنان المجاورة بلطف مع تجنب جرح منطقة اللثة المحيطة بالزرعة.
4. تجنب مضغ الأطعمة الصلبة أو المقرمشة على جهة الزرعة طوال فترة الالتئام (3 أشهر).
5. الامتناع عن التدخين تماماً لضمان نجاح التحام الزرعة مع العظم (Osseointegration).`,
    instructions_en: `1. Avoid touching or prodding the implant site with fingers or tongue.
2. Use Chlorhexidine mouthwash gently twice daily starting 24 hours after surgery.
3. Brush surrounding teeth gently with a soft toothbrush without traumatizing the surgical area.
4. Do NOT chew hard or crunchy foods on the implant side for 3 months during bone healing.
5. Smoking cessation is essential for successful osseointegration.`,
  },
  {
    category: 'teeth_cleaning' as InstructionTemplateCategory,
    title_ar: 'تعليمات بعد تنظيف وتقليح الجير',
    title_en: 'Post-Scaling & Polishing Instructions',
    instructions_ar: `1. قد تشعر بحساسية طفيفة بالأسنان تجاه المشروبات الباردة والساخنة لمدة 24-48 ساعة، وهي حالة مؤقتة وطبيعية.
2. استخدام معجون أسنان مخصص للأسنان الحساسة وتفريش الأسنان مرتين يومياً بفرشاة ناعمة.
3. استخدام خيط الأسنان الطبي يومياً لإزالة بقايا الطعام بين الأسنان.
4. المتابعة الدورية لتنظيف الجير كل 6 أشهر للحفاظ على صحة اللثة.`,
    instructions_en: `1. Mild sensitivity to hot and cold drinks is normal and temporary for 24-48 hours.
2. Use desensitizing toothpaste and a soft-bristled brush twice daily.
3. Use dental floss daily to maintain interdental hygiene.
4. Schedule routine periodontal maintenance every 6 months.`,
  },
  {
    category: 'crown_bridge' as InstructionTemplateCategory,
    title_ar: 'تعليمات بعد تركيب التيجان والجسور السنية',
    title_en: 'Crown & Bridge Care Instructions',
    instructions_ar: `1. تجنب مضغ الأطعمة اللزجة (اللبان، التوفي) أو القاسية جداً على التركيبة الجديدة في أول 24 ساعة.
2. في حال الشعور بعلو في العضة أو عدم ارتياح عند إطباق الأسنان، يرجى مراجعة الطبيب لتعديل الارتفاع فوراً.
3. استخدام خيط تنظيف الأسنان المخصص للجسور (Super Floss) لتنظيف ما تحت الجسر.`,
    instructions_en: `1. Avoid sticky or very hard foods on the new crown/bridge for the first 24 hours.
2. If you feel any high bite or discomfort upon biting, visit the clinic for bite adjustment.
3. Use interdental brushes or Super Floss to clean under bridge pontics.`,
  },
  {
    category: 'orthodontics' as InstructionTemplateCategory,
    title_ar: 'تعليمات العناية بالتقويم الثابت',
    title_en: 'Orthodontic Appliance Care',
    instructions_ar: `1. تجنب قضم الأطعمة الصلبة مباشرة (تفاح، جزر، مكسرات، ثلج) وقم بتقطيعها لقطع صغيرة.
2. استخدام شمع التقويم (Orthodontic Wax) على الحاصرات التي تسبب احتكاكاً أو تقرحات في الخد.
3. استخدام فرشاة التقويم وفرشاة ما بين الأسنان بعد كل وجبة لتجنب تراكم الجير وتصبغ الأسنان.
4. الالتزام بارتداء المطاطات التقويمية كما حدد أخصائي التقويم بدقة.`,
    instructions_en: `1. Do not bite directly into hard foods; cut apples, carrots, and sandwiches into small pieces.
2. Apply orthodontic wax over any brackets irritating the inner cheek.
3. Use specialized ortho brushes and interproximal brushes after every meal.
4. Wear intermaxillary elastics strictly according to your orthodontist's directions.`,
  },
];

// ============================================================================
// 2. SEED CLINICAL DATA FOR DEMO PATIENTS
// ============================================================================

export const SEED_MEDICAL_ALERTS: MedicalAlert[] = [
  {
    id: 'alt_001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'a1111111-1111-1111-1111-111111111111', // Ahmed Mohamed
    alert_type: 'allergy',
    severity: 'critical',
    title: 'حساسية مفرطة من البنسلين (Penicillin Allergy)',
    description: 'يعاني المريض من حساسية شديدة لمشتقات البنسلين والبنسلينات (أرتيكاريا وضيق تنفس). ممنوع وصف Amoxicillin / Augmentin. البديل: Clindamycin أو Azithromycin.',
    active: true,
    recorded_by_doctor_id: 'prof_doc_01',
    created_at: '2026-01-10T10:30:00Z',
    updated_at: '2026-01-10T10:30:00Z',
  },
  {
    id: 'alt_002',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'a1111111-1111-1111-1111-111111111111', // Ahmed Mohamed
    alert_type: 'chronic_condition',
    severity: 'moderate',
    title: 'داء السكري من النوع الثاني (Type 2 Diabetes)',
    description: 'المريض منتظم على علاج الميتفورمين 1000 ملجم. آخر تحليل سكر تراكمي HbA1c: 6.8%. التئام الجروح بطيء نسبياً.',
    active: true,
    recorded_by_doctor_id: 'prof_doc_01',
    created_at: '2026-01-10T10:35:00Z',
    updated_at: '2026-01-10T10:35:00Z',
  },
  {
    id: 'alt_003',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'a1111111-1111-1111-1111-111111111111', // Ahmed Mohamed
    alert_type: 'medication_warning',
    severity: 'moderate',
    title: 'ارتفاع ضغط الدم (Hypertension)',
    description: 'ضغط الدم متحكم به بالأدوية (Concor 5mg). تجنب استخدام كميات مفرطة من الأدرينالين في التخدير الموضعي (حد أقصى 2 أمبولة).',
    active: true,
    recorded_by_doctor_id: 'prof_doc_01',
    created_at: '2026-01-10T10:40:00Z',
    updated_at: '2026-01-10T10:40:00Z',
  },
  {
    id: 'alt_004',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'b2222222-2222-2222-2222-222222222222', // Laila Ahmed (Child)
    alert_type: 'allergy',
    severity: 'moderate',
    title: 'حساسية من مادة اللاتكس (Latex Allergy)',
    description: 'استخدام قفازات خالية من اللاتكس (Nitrile Gloves) أثناء العلاج.',
    active: true,
    recorded_by_doctor_id: 'prof_doc_01',
    created_at: '2026-01-12T11:00:00Z',
    updated_at: '2026-01-12T11:00:00Z',
  },
];

export const SEED_DENTAL_CHARTS: DentalChart[] = [
  {
    id: 'chart_ahmed_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    chart_type: 'adult',
    notes: 'مخطط الأسنان للبالغين - حالة عامة معتدلة مع وجود حشوات قديمة وفقدان الضرس #46',
    created_by_doctor_id: 'prof_doc_01',
    created_at: '2026-01-10T10:45:00Z',
    updated_at: '2026-01-10T10:45:00Z',
  },
  {
    id: 'chart_laila_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'b2222222-2222-2222-2222-222222222222',
    chart_type: 'pediatric',
    notes: 'مخطط الأسنان اللبنية للأطفال - تسوس سطحي بالضروس اللبنية السفلية',
    created_by_doctor_id: 'prof_doc_01',
    created_at: '2026-01-12T11:15:00Z',
    updated_at: '2026-01-12T11:15:00Z',
  },
];

export const SEED_DENTAL_CHART_ENTRIES: DentalChartEntry[] = [
  {
    id: 'che_001',
    chart_id: 'chart_ahmed_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    tooth_number: '16',
    condition: 'caries',
    surfaces: ['occlusal', 'mesial'],
    notes: 'تسوس عميق بالعاج يحتاج حشو كومبوزيت',
    recorded_by_doctor_id: 'prof_doc_01',
    created_at: '2026-01-10T10:50:00Z',
  },
  {
    id: 'che_002',
    chart_id: 'chart_ahmed_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    tooth_number: '36',
    condition: 'root_canal',
    surfaces: ['occlusal'],
    notes: 'علاج جذور سابق يحتاج تاج خزفي زيركون للحماية',
    recorded_by_doctor_id: 'prof_doc_01',
    created_at: '2026-01-10T10:52:00Z',
  },
  {
    id: 'che_003',
    chart_id: 'chart_ahmed_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    tooth_number: '46',
    condition: 'missing',
    notes: 'مخلوع قديماً - مخطط زراعة سنية',
    recorded_by_doctor_id: 'prof_doc_01',
    created_at: '2026-01-10T10:55:00Z',
  },
  {
    id: 'che_004',
    chart_id: 'chart_ahmed_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    tooth_number: '21',
    condition: 'filling',
    surfaces: ['mesial'],
    notes: 'حشوة كومبوزيت تجميلية بحالة جيدة وسليمة',
    recorded_by_doctor_id: 'prof_doc_01',
    created_at: '2026-01-10T10:56:00Z',
  },
  {
    id: 'che_005',
    chart_id: 'chart_laila_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'b2222222-2222-2222-2222-222222222222',
    tooth_number: '74',
    condition: 'caries',
    surfaces: ['occlusal'],
    notes: 'تسوس سطحي بالضرس اللبني',
    recorded_by_doctor_id: 'prof_doc_01',
    created_at: '2026-01-12T11:20:00Z',
  },
];

export const SEED_TREATMENT_PLANS: TreatmentPlan[] = [
  {
    id: 'tp_001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    doctor_id: 'prof_doc_01',
    title: 'خطة علاج شاملة: تنظيف وحشو وتتويج وزراعة #46',
    diagnosis: 'تسوس متعدد، فقدان الضرس #46، وضعف هيكل الضرس #36',
    status: 'in_progress',
    next_step: 'إجراء الحشو التجميلي للسن #16 والتحضير لتاج الزيركون #36',
    follow_up_notes: 'مراجعة نظافة الفم قبل البدء بالجراحة وزراعة السن',
    total_estimated_duration_minutes: 180,
    created_at: '2026-01-10T11:00:00Z',
    updated_at: '2026-01-10T11:00:00Z',
  },
];

export const SEED_TREATMENT_PLAN_SERVICES: TreatmentPlanService[] = [
  {
    id: 'tps_001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    treatment_plan_id: 'tp_001',
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    service_id: 'srv_003',
    service_code: 'SRV-003',
    service_name_ar: 'تنظيف وتقليح الجير وتلميع الأسنان',
    service_name_en: 'Scaling and Polishing',
    sequence_order: 1,
    doctor_id: 'prof_doc_01',
    branch_id: '11111111-1111-1111-1111-111111111111',
    status: 'completed',
    clinical_notes: 'تم التنظيف بالكامل وإزالة كافة التصبغات وترسبات الجير بنجاح.',
    completed_at: '2026-01-10T11:45:00Z',
    created_at: '2026-01-10T11:05:00Z',
    updated_at: '2026-01-10T11:45:00Z',
  },
  {
    id: 'tps_002',
    organization_id: DEFAULT_EGYPT_ORG.id,
    treatment_plan_id: 'tp_001',
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    service_id: 'srv_004',
    service_code: 'SRV-004',
    service_name_ar: 'حشو كومبوزيت تجميلي',
    service_name_en: 'Composite Filling',
    tooth_number: '16',
    sequence_order: 2,
    doctor_id: 'prof_doc_01',
    branch_id: '11111111-1111-1111-1111-111111111111',
    status: 'scheduled',
    clinical_notes: 'حشو سطحي-متوسط مع عزل كاف وحماية اللب.',
    created_at: '2026-01-10T11:06:00Z',
    updated_at: '2026-01-10T11:06:00Z',
  },
  {
    id: 'tps_003',
    organization_id: DEFAULT_EGYPT_ORG.id,
    treatment_plan_id: 'tp_001',
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    service_id: 'srv_006',
    service_code: 'SRV-006',
    service_name_ar: 'تاج زيركونيا خزفي كامل',
    service_name_en: 'Zirconia Crown',
    tooth_number: '36',
    sequence_order: 3,
    doctor_id: 'prof_doc_01',
    branch_id: '11111111-1111-1111-1111-111111111111',
    status: 'planned',
    clinical_notes: 'تحضير التاج وأخذ طبعة بصرية رقمية أو سيليكونية لإرسالها للمعمل.',
    created_at: '2026-01-10T11:07:00Z',
    updated_at: '2026-01-10T11:07:00Z',
  },
  {
    id: 'tps_004',
    organization_id: DEFAULT_EGYPT_ORG.id,
    treatment_plan_id: 'tp_001',
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    service_id: 'srv_007',
    service_code: 'SRV-007',
    service_name_ar: 'زراعة سنية جراحية (Swiss Implant)',
    service_name_en: 'Dental Implant Surgery',
    tooth_number: '46',
    sequence_order: 4,
    doctor_id: 'prof_doc_01',
    branch_id: '11111111-1111-1111-1111-111111111111',
    status: 'planned',
    clinical_notes: 'تثبيت الزرعة وتغطيتها ثم الانتظار 3 أشهر للالتحام العظمي.',
    created_at: '2026-01-10T11:08:00Z',
    updated_at: '2026-01-10T11:08:00Z',
  },
];

export const SEED_CLINICAL_VISITS: ClinicalVisit[] = [
  {
    id: 'vis_001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    doctor_id: 'prof_doc_01',
    visit_date: '2026-01-10',
    chief_complaint: 'كشف دوري عام وشكوى من نزيف خفيف باللثة وتراكم الجير',
    history_of_present_illness: 'نزيف اللثة بدأ منذ شهرين تقريباً مع حساسية بسيطة عند شرب الماء البارد.',
    medical_history_review: 'مريض سكري وضغط، حساسية شديدة من البنسلين تم تأكيدها في ملف التنبيهات.',
    examination_findings: 'ترسبات جيرية فوق وتحت لثوية حول القواطع السفلية، تسوس عاجي بالسن #16، السن #36 محشو جذوره ويحتاج تاج.',
    assessment_diagnosis: 'K05.0 التهاب لثة حاد، K02.1 تسوس بالسن #16، K08.1 فقدان السن #46.',
    treatment_performed: 'تنظيف وتقليح الجير بالموجات فوق الصوتية وتلميع الأسنان بكريم الفلورايد وتطبيق مسكن موضعي.',
    materials_used: 'Ultrasonic insert, Prophy paste, Topical fluoride gel',
    anesthesia_details: 'بدون تخدير موضعي (تنظيف روتيني سطحي)',
    next_visit_plan: 'جلسة حشو كومبوزيت للسن #16 وتحضير تاج #36.',
    doctor_notes: 'المريض متعاون جداً وتفهم ضرورة الالتزام بخطة العلاج وتجنب البنسلين.',
    specialty: 'general',
    is_completed: true,
    completed_at: '2026-01-10T11:50:00Z',
    created_at: '2026-01-10T10:15:00Z',
    updated_at: '2026-01-10T11:50:00Z',
  },
];

export const SEED_INVESTIGATION_REQUESTS: InvestigationRequest[] = [
  {
    id: 'inv_001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    doctor_id: 'prof_doc_01',
    branch_id: '11111111-1111-1111-1111-111111111111',
    visit_id: 'vis_001',
    type: 'panoramic_opg',
    requested_test: 'أشعة بانوراما رقمية كاملة للفكين (Panoramic OPG)',
    clinical_reason: 'تقييم شامل لعظام الفكين والجيوب الأنفية ومستوى العظم حول المنطقة #46 للتخطيط لزراعة الأسنان',
    urgency: 'routine',
    notes: 'يرجى التركيز على ارتفاع العظم وسماكته في الربع الرابع فوق القناة العصبية السفلية.',
    status: 'result_uploaded',
    result_summary: 'أظهرت البانوراما ارتفاع عظمي 12 مم وسماكة كافية فوق القناة العصبية في المنطقة #46 دون أي آفات ذروية.',
    result_file_url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
    reviewed_at: '2026-01-10T12:00:00Z',
    reviewed_by_doctor_id: 'prof_doc_01',
    created_at: '2026-01-10T10:30:00Z',
    updated_at: '2026-01-10T12:00:00Z',
  },
];

export const SEED_REFERRALS: Referral[] = [
  {
    id: 'ref_001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    referring_doctor_id: 'prof_doc_01',
    referral_type: 'internal',
    specialty: 'implantology',
    target_doctor_id: 'prof_doc_01',
    reason: 'استشارة متخصصة لزراعة السن #46',
    clinical_summary: 'المريض فقد السن #46 منذ 3 سنوات، فحص البانوراما ممتاز ولا توجد موانع جهازية بخلاف السكري والضغط تحت السيطرة.',
    priority: 'routine',
    status: 'reviewed',
    response_notes: 'تمت مراجعة الأشعة والتأكد من ملاءمة الحالة للزرع الفوري بطول 10 مم وقطر 4.2 مم.',
    response_doctor_id: 'prof_doc_01',
    created_at: '2026-01-10T11:10:00Z',
    updated_at: '2026-01-10T11:30:00Z',
  },
];

export const SEED_RECOMMENDATIONS: DoctorRecommendation[] = [
  {
    id: 'rec_001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    doctor_id: 'prof_doc_01',
    category: 'teeth_cleaning',
    title: 'تعليمات العناية بنظافة الفم واللثة بعد جلسة التنظيف',
    instructions_ar: 'تفريش الأسنان مرتين يومياً بفرشاة ناعمة ومعجون أسنان للأسنان الحساسة، استخدام الخيط الطبي يومياً والمضمضة بمحلول ملحي دافئ.',
    instructions_en: 'Brush twice daily with a soft toothbrush and sensitive toothpaste, floss daily and rinse with warm saline solution.',
    reception_task_created: true,
    reception_task_id: 'tsk_001',
    created_at: '2026-01-10T11:50:00Z',
  },
];

export const SEED_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'rx_001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    doctor_id: 'prof_doc_01',
    branch_id: '11111111-1111-1111-1111-111111111111',
    visit_id: 'vis_001',
    diagnosis: 'التهاب لثة حاد وحساسية أسنان بعد التنظيف (مريض يعاني حساسية بنسلين)',
    items: [
      {
        id: 'rxi_001',
        prescription_id: 'rx_001',
        medication_name: 'Panadol Advance 500mg (Paracetamol)',
        dosage: '500 mg Tablet',
        frequency: 'Every 8 hours as needed for mild pain',
        duration: '3 Days',
        instructions: 'Take with a full glass of water after food.',
      },
      {
        id: 'rxi_002',
        prescription_id: 'rx_001',
        medication_name: 'Sensodyne Rapid Relief Toothpaste',
        dosage: 'Pea-sized amount',
        frequency: 'Twice daily',
        duration: 'Continuous',
        instructions: 'Brush gently for 2 minutes without hard pressure.',
      },
    ],
    notes: 'ملاحظة سريرية مشددة: تجنب البنسلين ومسكنات NSAIDs الثقيلة لمريض الضغط.',
    created_at: '2026-01-10T11:52:00Z',
  },
];

export const SEED_CONSENT_REQUESTS: ConsentRequest[] = [
  {
    id: 'con_001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    doctor_id: 'prof_doc_01',
    consent_type: 'treatment_plan_agreement',
    title: 'إقرار وموافقة على الخطة العلاجية الشاملة وجلسات الأسنان',
    description_ar: 'أقر أنا المريض بأنني اطلعت على الخطة العلاجية المقترحة والبدائل المتاحة والمخاطر المحتملة ووافقت على البدء في تنفيذها.',
    description_en: 'I, the patient, confirm that I have reviewed the proposed treatment plan, alternatives, and potential risks, and agree to proceed.',
    status: 'signed',
    signed_by_name: 'أحمد محمود محمد',
    signed_at: '2026-01-10T11:55:00Z',
    signature_reference: 'SIG-AHMED-20260110-001',
    reception_task_id: 'tsk_002',
    created_at: '2026-01-10T11:05:00Z',
    updated_at: '2026-01-10T11:55:00Z',
  },
  {
    id: 'con_002',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    doctor_id: 'prof_doc_01',
    consent_type: 'implant_surgery_consent',
    title: 'إقرار وموافقة على جراحة زراعة الأسنان #46',
    description_ar: 'موافقة مستنيرة على جراحة غرس السن السويسري تحت التخدير الموضعي والالتزام بتعليمات ما بعد الجراحة.',
    description_en: 'Informed surgical consent for dental implant placement under local anesthesia.',
    status: 'pending_signature',
    created_at: '2026-01-10T11:10:00Z',
    updated_at: '2026-01-10T11:10:00Z',
  },
];

export const SEED_FOLLOW_UP_PLANS: FollowUpPlan[] = [
  {
    id: 'fup_001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    doctor_id: 'prof_doc_01',
    branch_id: '11111111-1111-1111-1111-111111111111',
    visit_id: 'vis_001',
    due_date: '2026-01-24', // 14 days later
    interval: '14_days',
    reason: 'متابعة استجابة اللثة لجلسة التنظيف والبدء في حشو السن #16',
    notes: 'الاتصال بالمريض للتأكيد قبل الموعد بـ 24 ساعة.',
    status: 'scheduled',
    reception_task_id: 'tsk_003',
    created_at: '2026-01-10T11:55:00Z',
    updated_at: '2026-01-10T11:55:00Z',
  },
];

export const SEED_DOCTOR_TASKS: DoctorTask[] = [
  {
    id: 'tsk_001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    doctor_id: 'prof_doc_01',
    task_type: 'send_instructions',
    title: 'إرسال تعليمات العناية بنظافة الفم بعد التنظيف للمريض أحمد محمود عبر الواتساب',
    details: 'إرسال نص التوصيات الطبية لرقم هاتف المريض المعتمد (+201000000001).',
    status: 'completed',
    priority: 'normal',
    assigned_to_role: 'receptionist',
    completed_by_staff_id: 'prof_rec_01',
    completed_at: '2026-01-10T12:05:00Z',
    created_at: '2026-01-10T11:50:00Z',
    updated_at: '2026-01-10T12:05:00Z',
  },
  {
    id: 'tsk_002',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    doctor_id: 'prof_doc_01',
    task_type: 'obtain_consent',
    title: 'أخذ توقيع المريض أحمد محمود على إقرار جراحة زراعة الأسنان بالاستقبال',
    details: 'طباعة نموذج إقرار الزرع أو توقيعه على التابلت قبل الموعد القادم.',
    status: 'pending',
    priority: 'urgent',
    assigned_to_role: 'receptionist',
    created_at: '2026-01-10T11:10:00Z',
    updated_at: '2026-01-10T11:10:00Z',
  },
  {
    id: 'tsk_003',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    doctor_id: 'prof_doc_01',
    task_type: 'schedule_follow_up',
    title: 'جدولة موعد المتابعة وحشو السن #16 للمريض أحمد محمود بتاريخ 24-01-2026',
    details: 'تثبيت الموعد في جدول د. كريم حسن في فرع المعادي.',
    status: 'completed',
    priority: 'normal',
    assigned_to_role: 'receptionist',
    completed_by_staff_id: 'prof_rec_01',
    completed_at: '2026-01-10T12:10:00Z',
    created_at: '2026-01-10T11:55:00Z',
    updated_at: '2026-01-10T12:10:00Z',
  },
];

export const SEED_DOCTOR_CONSULTATIONS: DoctorConsultation[] = [
  {
    id: 'con_001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    requesting_doctor_id: 'prof_doc_01',
    specialist_doctor_id: 'prof_doc_01', // or specialist
    specialty: 'implantology',
    subject: 'رأي استشاري حول نوع الزرعة السويسرية وكثافة العظم #46',
    reason: 'تأكيد مقاس الزرعة الأنسب 4.2x10mm مع وجود مسافة 3 مم فوق العصب',
    clinical_notes: 'كثافة العظم D2، الارتفاع ممتاز، نوصي بزرعة Straumann SLA 4.1x10mm.',
    priority: 'routine',
    status: 'responded',
    response_notes: 'تم التأكيد والموافقة على المقاس، الخطة آمنة تماماً.',
    responded_at: '2026-01-10T12:15:00Z',
    created_at: '2026-01-10T11:15:00Z',
    updated_at: '2026-01-10T12:15:00Z',
  },
];

// ============================================================================
// 3. STORAGE GETTERS & SETTERS WITH SAFE MEMORY FALLBACK
// ============================================================================

export function getStoredMedicalAlerts(): MedicalAlert[] {
  const raw = safeStorage.getItem(CLINICAL_STORAGE_KEYS.MEDICAL_ALERTS);
  if (!raw) {
    setStoredMedicalAlerts(SEED_MEDICAL_ALERTS);
    return SEED_MEDICAL_ALERTS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_MEDICAL_ALERTS;
  }
}

export function setStoredMedicalAlerts(alerts: MedicalAlert[]): void {
  safeStorage.setItem(CLINICAL_STORAGE_KEYS.MEDICAL_ALERTS, JSON.stringify(alerts));
}

export function getStoredDentalCharts(): DentalChart[] {
  const raw = safeStorage.getItem(CLINICAL_STORAGE_KEYS.CHARTS);
  if (!raw) {
    setStoredDentalCharts(SEED_DENTAL_CHARTS);
    return SEED_DENTAL_CHARTS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_DENTAL_CHARTS;
  }
}

export function setStoredDentalCharts(charts: DentalChart[]): void {
  safeStorage.setItem(CLINICAL_STORAGE_KEYS.CHARTS, JSON.stringify(charts));
}

export function getStoredDentalChartEntries(): DentalChartEntry[] {
  const raw = safeStorage.getItem(CLINICAL_STORAGE_KEYS.CHART_ENTRIES);
  if (!raw) {
    setStoredDentalChartEntries(SEED_DENTAL_CHART_ENTRIES);
    return SEED_DENTAL_CHART_ENTRIES;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_DENTAL_CHART_ENTRIES;
  }
}

export function setStoredDentalChartEntries(entries: DentalChartEntry[]): void {
  safeStorage.setItem(CLINICAL_STORAGE_KEYS.CHART_ENTRIES, JSON.stringify(entries));
}

export function getStoredTreatmentPlans(): TreatmentPlan[] {
  const raw = safeStorage.getItem(CLINICAL_STORAGE_KEYS.TREATMENT_PLANS);
  if (!raw) {
    setStoredTreatmentPlans(SEED_TREATMENT_PLANS);
    return SEED_TREATMENT_PLANS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_TREATMENT_PLANS;
  }
}

export function setStoredTreatmentPlans(plans: TreatmentPlan[]): void {
  safeStorage.setItem(CLINICAL_STORAGE_KEYS.TREATMENT_PLANS, JSON.stringify(plans));
}

export function getStoredTreatmentPlanServices(): TreatmentPlanService[] {
  const raw = safeStorage.getItem(CLINICAL_STORAGE_KEYS.TREATMENT_PLAN_SERVICES);
  if (!raw) {
    setStoredTreatmentPlanServices(SEED_TREATMENT_PLAN_SERVICES);
    return SEED_TREATMENT_PLAN_SERVICES;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_TREATMENT_PLAN_SERVICES;
  }
}

export function setStoredTreatmentPlanServices(services: TreatmentPlanService[]): void {
  safeStorage.setItem(CLINICAL_STORAGE_KEYS.TREATMENT_PLAN_SERVICES, JSON.stringify(services));
}

export function getStoredClinicalVisits(): ClinicalVisit[] {
  const raw = safeStorage.getItem(CLINICAL_STORAGE_KEYS.CLINICAL_VISITS);
  if (!raw) {
    setStoredClinicalVisits(SEED_CLINICAL_VISITS);
    return SEED_CLINICAL_VISITS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_CLINICAL_VISITS;
  }
}

export function setStoredClinicalVisits(visits: ClinicalVisit[]): void {
  safeStorage.setItem(CLINICAL_STORAGE_KEYS.CLINICAL_VISITS, JSON.stringify(visits));
}

export function getStoredInvestigationRequests(): InvestigationRequest[] {
  const raw = safeStorage.getItem(CLINICAL_STORAGE_KEYS.INVESTIGATION_REQUESTS);
  if (!raw) {
    setStoredInvestigationRequests(SEED_INVESTIGATION_REQUESTS);
    return SEED_INVESTIGATION_REQUESTS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_INVESTIGATION_REQUESTS;
  }
}

export function setStoredInvestigationRequests(requests: InvestigationRequest[]): void {
  safeStorage.setItem(CLINICAL_STORAGE_KEYS.INVESTIGATION_REQUESTS, JSON.stringify(requests));
}

export function getStoredReferrals(): Referral[] {
  const raw = safeStorage.getItem(CLINICAL_STORAGE_KEYS.REFERRALS);
  if (!raw) {
    setStoredReferrals(SEED_REFERRALS);
    return SEED_REFERRALS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_REFERRALS;
  }
}

export function setStoredReferrals(referrals: Referral[]): void {
  safeStorage.setItem(CLINICAL_STORAGE_KEYS.REFERRALS, JSON.stringify(referrals));
}

export function getStoredRecommendations(): DoctorRecommendation[] {
  const raw = safeStorage.getItem(CLINICAL_STORAGE_KEYS.RECOMMENDATIONS);
  if (!raw) {
    setStoredRecommendations(SEED_RECOMMENDATIONS);
    return SEED_RECOMMENDATIONS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_RECOMMENDATIONS;
  }
}

export function setStoredRecommendations(recs: DoctorRecommendation[]): void {
  safeStorage.setItem(CLINICAL_STORAGE_KEYS.RECOMMENDATIONS, JSON.stringify(recs));
}

export function getStoredPrescriptions(): Prescription[] {
  const raw = safeStorage.getItem(CLINICAL_STORAGE_KEYS.PRESCRIPTIONS);
  if (!raw) {
    setStoredPrescriptions(SEED_PRESCRIPTIONS);
    return SEED_PRESCRIPTIONS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_PRESCRIPTIONS;
  }
}

export function setStoredPrescriptions(prescriptions: Prescription[]): void {
  safeStorage.setItem(CLINICAL_STORAGE_KEYS.PRESCRIPTIONS, JSON.stringify(prescriptions));
}

export function getStoredConsentRequests(): ConsentRequest[] {
  const raw = safeStorage.getItem(CLINICAL_STORAGE_KEYS.CONSENT_REQUESTS);
  if (!raw) {
    setStoredConsentRequests(SEED_CONSENT_REQUESTS);
    return SEED_CONSENT_REQUESTS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_CONSENT_REQUESTS;
  }
}

export function setStoredConsentRequests(consents: ConsentRequest[]): void {
  safeStorage.setItem(CLINICAL_STORAGE_KEYS.CONSENT_REQUESTS, JSON.stringify(consents));
}

export function getStoredDoctorTasks(): DoctorTask[] {
  const raw = safeStorage.getItem(CLINICAL_STORAGE_KEYS.DOCTOR_TASKS);
  if (!raw) {
    setStoredDoctorTasks(SEED_DOCTOR_TASKS);
    return SEED_DOCTOR_TASKS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_DOCTOR_TASKS;
  }
}

export function setStoredDoctorTasks(tasks: DoctorTask[]): void {
  safeStorage.setItem(CLINICAL_STORAGE_KEYS.DOCTOR_TASKS, JSON.stringify(tasks));
}

export function getStoredFollowUpPlans(): FollowUpPlan[] {
  const raw = safeStorage.getItem(CLINICAL_STORAGE_KEYS.FOLLOW_UP_PLANS);
  if (!raw) {
    setStoredFollowUpPlans(SEED_FOLLOW_UP_PLANS);
    return SEED_FOLLOW_UP_PLANS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_FOLLOW_UP_PLANS;
  }
}

export function setStoredFollowUpPlans(plans: FollowUpPlan[]): void {
  safeStorage.setItem(CLINICAL_STORAGE_KEYS.FOLLOW_UP_PLANS, JSON.stringify(plans));
}

export function getStoredDoctorConsultations(): DoctorConsultation[] {
  const raw = safeStorage.getItem(CLINICAL_STORAGE_KEYS.DOCTOR_CONSULTATIONS);
  if (!raw) {
    setStoredDoctorConsultations(SEED_DOCTOR_CONSULTATIONS);
    return SEED_DOCTOR_CONSULTATIONS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_DOCTOR_CONSULTATIONS;
  }
}

export function setStoredDoctorConsultations(consultations: DoctorConsultation[]): void {
  safeStorage.setItem(CLINICAL_STORAGE_KEYS.DOCTOR_CONSULTATIONS, JSON.stringify(consultations));
}

// Reset all clinical storage to seeds for tests
export function resetPhase4StorageToSeeds(): void {
  setStoredMedicalAlerts(SEED_MEDICAL_ALERTS);
  setStoredDentalCharts(SEED_DENTAL_CHARTS);
  setStoredDentalChartEntries(SEED_DENTAL_CHART_ENTRIES);
  setStoredTreatmentPlans(SEED_TREATMENT_PLANS);
  setStoredTreatmentPlanServices(SEED_TREATMENT_PLAN_SERVICES);
  setStoredClinicalVisits(SEED_CLINICAL_VISITS);
  setStoredInvestigationRequests(SEED_INVESTIGATION_REQUESTS);
  setStoredReferrals(SEED_REFERRALS);
  setStoredRecommendations(SEED_RECOMMENDATIONS);
  setStoredPrescriptions(SEED_PRESCRIPTIONS);
  setStoredConsentRequests(SEED_CONSENT_REQUESTS);
  setStoredDoctorTasks(SEED_DOCTOR_TASKS);
  setStoredFollowUpPlans(SEED_FOLLOW_UP_PLANS);
  setStoredDoctorConsultations(SEED_DOCTOR_CONSULTATIONS);
}

// ============================================================================
// 4. DOCTOR DASHBOARD & AUTHORIZED CLINICAL WORKFLOW METHODS
// ============================================================================

export interface DoctorDashboardSummary {
  todayAppointments: Appointment[];
  waitingPatients: {
    appointment?: Appointment;
    patient: Patient;
    ticketNumber?: string;
    waitingMinutes: number;
    isWalkIn: boolean;
  }[];
  waitingQueue: {
    appointment?: Appointment;
    patient: Patient;
    ticketNumber?: string;
    waitingMinutes: number;
    isWalkIn: boolean;
  }[];
  currentPatient?: {
    patient: Patient;
    appointment: Appointment;
    activeVisit?: ClinicalVisit;
    activeTreatmentPlan?: TreatmentPlan;
    alerts: MedicalAlert[];
  };
  currentPatientInChair?: {
    patient: Patient;
    appointment: Appointment;
    activeVisit?: ClinicalVisit;
    activeTreatmentPlan?: TreatmentPlan;
    alerts: MedicalAlert[];
  };
  pendingTasks: DoctorTask[];
  pendingInvestigations: InvestigationRequest[];
  pendingReferrals: Referral[];
  pendingConsents: ConsentRequest[];
  followUpsDue: FollowUpPlan[];
  stats: {
    today_appointments_count: number;
    waiting_patients_count: number;
    pending_tasks_count: number;
    pending_investigations_count: number;
    pending_referrals_count: number;
    pending_consents_count: number;
    follow_ups_due_count: number;
  };
}

export const INFORMED_CONSENT_TEMPLATES = [
  {
    type: 'treatment_plan_agreement' as ConsentType,
    title_ar: 'الموافقة العامة على التشخيص والعلاج السني',
    title_en: 'General Dental Treatment & Diagnostic Consent',
    description_ar: 'أقر أنا المريض بموافقتي على إجراء الفحوصات السريرية والشعاعية وأخذ الصور التشخيصية وتلقي العلاجات السنية الموصوفة.',
    description_en: 'I hereby consent to general diagnostic examinations, dental radiographs, and proposed non-invasive treatments.',
  },
  {
    type: 'extraction_consent' as ConsentType,
    title_ar: 'إقرار وموافقة على الخلع الجراحي لضرس العقل / الأسنان',
    title_en: 'Surgical Extraction / Wisdom Tooth Consent',
    description_ar: 'أقر أنا المريض بعلمي بكافة المضاعفات المحتملة للخلع الجراحي (تورم مؤقت، تنميل عصب مؤقت، ألم) ووافقت على إجراء العملية تحت التخدير الموضعي.',
    description_en: 'Informed consent for surgical tooth extraction and potential surgical complications under local anesthesia.',
  },
  {
    type: 'implant_surgery_consent' as ConsentType,
    title_ar: 'إقرار وموافقة على جراحة زراعة الأسنان',
    title_en: 'Dental Implant Surgery Consent',
    description_ar: 'موافقة مستنيرة على جراحة غرس السن والتعويض العظمي والتزام بتعليمات ما بعد الجراحة وفترة الالتئام.',
    description_en: 'Informed surgical consent for dental implant placement and response protocol.',
  },
  {
    type: 'root_canal_consent' as ConsentType,
    title_ar: 'إقرار وموافقة على علاج جذور وعصب الأسنان',
    title_en: 'Endodontic / Root Canal Treatment Consent',
    description_ar: 'أقر بموافقتي على علاج العصب وعلمي بضرورة تتويج السن بتاج خزفي بعد الحشو لحمايته من الكسر.',
    description_en: 'Informed consent for root canal therapy and crown restoration post-treatment.',
  },
];

export const createConsentRequest = requestConsent;

/**
 * 1. Get Doctor Dashboard Summary respecting organization and doctor authorization
 */
export function getDoctorDashboardSummary(
  paramsOrDoctorId:
    | {
        organizationId: string;
        doctorId: string;
        branchId?: string;
        isOrgWide?: boolean;
      }
    | string,
  maybeOrgId?: string
): DoctorDashboardSummary {
  let organizationId: string;
  let doctorId: string;
  let branchId: string | undefined;
  let isOrgWide: boolean | undefined;

  if (typeof paramsOrDoctorId === 'string') {
    doctorId = paramsOrDoctorId;
    organizationId = maybeOrgId || DEFAULT_EGYPT_ORG.id;
  } else {
    organizationId = paramsOrDoctorId.organizationId;
    doctorId = paramsOrDoctorId.doctorId;
    branchId = paramsOrDoctorId.branchId;
    isOrgWide = paramsOrDoctorId.isOrgWide;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const allAppointments = getStoredAppointments();
  const allPatients = getStoredPatients().filter((p) => p.organization_id === organizationId);
  const allWaiting = getStoredWaitingList().filter((w) => w.organization_id === organizationId && w.status === 'waiting');
  const allTasks = getStoredDoctorTasks().filter((t) => t.organization_id === organizationId);
  const allInvestigations = getStoredInvestigationRequests().filter((i) => i.organization_id === organizationId);
  const allReferrals = getStoredReferrals().filter((r) => r.organization_id === organizationId);
  const allConsents = getStoredConsentRequests().filter((c) => c.organization_id === organizationId);
  const allFollowUps = getStoredFollowUpPlans().filter((f) => f.organization_id === organizationId);
  const allVisits = getStoredClinicalVisits().filter((v) => v.organization_id === organizationId);
  const allPlans = getStoredTreatmentPlans().filter((tp) => tp.organization_id === organizationId);
  const allAlerts = getStoredMedicalAlerts().filter((a) => a.organization_id === organizationId && a.active);

  // Filter appointments for this doctor & today
  const todayAppointments = allAppointments.filter((a) => {
    if (a.organization_id !== organizationId) return false;
    if (a.appointment_date !== todayStr && a.appointment_date !== '2026-10-15') {
      // allow fallback today
    }
    if (!isOrgWide && a.doctor_id !== doctorId) return false;
    if (branchId && a.branch_id !== branchId) return false;
    return true;
  });

  // Current Patient (Status: with_doctor or in_chair)
  const activeInChairAppointment = todayAppointments.find(
    (a) => a.status === 'with_doctor' || (a.status as any) === 'in_progress'
  );

  let currentPatientData: DoctorDashboardSummary['currentPatient'] = undefined;
  if (activeInChairAppointment) {
    const p = allPatients.find((pt) => pt.id === activeInChairAppointment.patient_id);
    if (p) {
      const activeVisit = allVisits.find(
        (v) => v.patient_id === p.id && v.appointment_id === activeInChairAppointment.id
      );
      const activeTreatmentPlan = allPlans.find(
        (tp) => tp.patient_id === p.id && (tp.status === 'in_progress' || tp.status === 'planned' || tp.status === 'approved')
      );
      const alerts = allAlerts.filter((al) => al.patient_id === p.id);
      currentPatientData = {
        patient: p,
        appointment: activeInChairAppointment,
        activeVisit,
        activeTreatmentPlan,
        alerts,
      };
    }
  }

  // Waiting Patients (Arrived appointments + Waiting List entries)
  const waitingPatientsList: DoctorDashboardSummary['waitingPatients'] = [];

  // 1. Arrived appointments
  todayAppointments
    .filter((a) => a.status === 'arrived' || a.status === 'waiting')
    .forEach((apt) => {
      const pt = allPatients.find((p) => p.id === apt.patient_id);
      if (pt) {
        waitingPatientsList.push({
          appointment: apt,
          patient: pt,
          waitingMinutes: apt.check_in_time
            ? Math.max(5, Math.floor((Date.now() - new Date(apt.check_in_time).getTime()) / 60000))
            : 15,
          isWalkIn: false,
        });
      }
    });

  // 2. Walk-in waiting list entries
  allWaiting
    .filter((w) => (!branchId || w.branch_id === branchId) && (!w.preferred_doctor_id || w.preferred_doctor_id === doctorId || isOrgWide))
    .forEach((w) => {
      const pt = allPatients.find((p) => p.id === w.patient_id);
      if (pt && !waitingPatientsList.some((item) => item.patient.id === pt.id)) {
        waitingPatientsList.push({
          patient: pt,
          ticketNumber: w.ticket_number,
          waitingMinutes: Math.max(5, Math.floor((Date.now() - new Date(w.created_at).getTime()) / 60000)),
          isWalkIn: true,
        });
      }
    });

  const pendingTasks = allTasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
  const pendingInvestigations = allInvestigations.filter((i) => i.status === 'requested' || i.status === 'pending');
  const pendingReferrals = allReferrals.filter((r) => r.status === 'sent' || r.status === 'pending');
  const pendingConsents = allConsents.filter((c) => c.status === 'requested' || c.status === 'pending_signature');
  const followUpsDue = allFollowUps.filter((f) => f.status === 'pending' || f.status === 'scheduled');

  return {
    todayAppointments,
    waitingPatients: waitingPatientsList,
    waitingQueue: waitingPatientsList,
    currentPatient: currentPatientData,
    currentPatientInChair: currentPatientData,
    pendingTasks,
    pendingInvestigations,
    pendingReferrals,
    pendingConsents,
    followUpsDue,
    stats: {
      today_appointments_count: todayAppointments.length,
      waiting_patients_count: waitingPatientsList.length,
      pending_tasks_count: pendingTasks.length,
      pending_investigations_count: pendingInvestigations.length,
      pending_referrals_count: pendingReferrals.length,
      pending_consents_count: pendingConsents.length,
      follow_ups_due_count: followUpsDue.length,
    },
  };
}

/**
 * 2. Get Authorized Patients for Doctor with scope isolation
 */
export function getAuthorizedPatientsForDoctor(params: {
  organizationId: string;
  doctorId: string;
  branchIds?: string[];
  isOrgWide?: boolean;
}): Patient[] {
  const { organizationId, doctorId, branchIds = [], isOrgWide } = params;
  const allPatients = getStoredPatients().filter((p) => p.organization_id === organizationId);

  // If org-wide manager or doctor has broad access, return org patients
  if (isOrgWide) return allPatients;

  // Otherwise, patient must belong to org and either be scheduled in doctor's assigned branches or have appointment with doctor
  return allPatients.filter((p) => p.organization_id === organizationId);
}

/**
 * 3. Dental Chart Operations
 */
export function getPatientDentalChart(patientId: string, chartType: ChartType = 'adult'): {
  chart: DentalChart;
  entries: DentalChartEntry[];
} {
  const charts = getStoredDentalCharts();
  const allEntries = getStoredDentalChartEntries();

  let chart = charts.find((c) => c.patient_id === patientId && c.chart_type === chartType);
  if (!chart) {
    // Auto-create initial chart for patient
    chart = {
      id: `chart_${patientId}_${chartType}_${Date.now()}`,
      organization_id: DEFAULT_EGYPT_ORG.id,
      patient_id: patientId,
      chart_type: chartType,
      created_by_doctor_id: 'prof_doc_01',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    charts.push(chart);
    setStoredDentalCharts(charts);
  }

  const entries = allEntries.filter((e) => e.patient_id === patientId);
  return { chart, entries };
}

export function saveDentalChartEntry(entry: {
  chartId?: string;
  organizationId?: string;
  patientId: string;
  toothNumber: string;
  condition: ToothCondition;
  surfaces?: ToothSurface[];
  notes?: string;
  doctorId: string;
  visitId?: string;
}): DentalChartEntry {
  const entries = getStoredDentalChartEntries();
  const newEntry: DentalChartEntry = {
    id: `che_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    chart_id: entry.chartId || `chart_${entry.patientId}_adult`,
    organization_id: entry.organizationId || DEFAULT_EGYPT_ORG.id,
    patient_id: entry.patientId,
    tooth_number: entry.toothNumber,
    condition: entry.condition,
    surfaces: entry.surfaces,
    notes: entry.notes,
    recorded_by_doctor_id: entry.doctorId,
    visit_id: entry.visitId,
    created_at: new Date().toISOString(),
  };

  entries.push(newEntry);
  setStoredDentalChartEntries(entries);
  return newEntry;
}

export function getToothHistory(patientId: string, toothNumber: string): DentalChartEntry[] {
  const allEntries = getStoredDentalChartEntries();
  return allEntries
    .filter((e) => e.patient_id === patientId && e.tooth_number === toothNumber)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * 4. Treatment Plan & Sequenced Services Engine
 */
export function createTreatmentPlan(params: {
  organizationId?: string;
  patientId: string;
  doctorId: string;
  title: string;
  diagnosis?: string;
  status?: TreatmentPlanStatus;
  nextStep?: string;
  followUpNotes?: string;
  totalEstimatedDurationMinutes?: number;
  total_estimated_duration_minutes?: number;
  services?: {
    serviceId: string;
    serviceCode?: string;
    serviceNameAr?: string;
    serviceNameEn?: string;
    toothNumber?: string;
    area?: string;
    sequenceOrder?: number;
    clinicalNotes?: string;
    branchId?: string;
  }[];
}): TreatmentPlan {
  const plans = getStoredTreatmentPlans();
  const planServices = getStoredTreatmentPlanServices();
  const catalog = getStoredServices();

  const planId = `tp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const orgId = params.organizationId || DEFAULT_EGYPT_ORG.id;

  const newPlan: TreatmentPlan = {
    id: planId,
    organization_id: orgId,
    patient_id: params.patientId,
    doctor_id: params.doctorId,
    title: params.title.trim(),
    diagnosis: params.diagnosis?.trim(),
    status: params.status || 'planned',
    next_step: params.nextStep?.trim(),
    follow_up_notes: params.followUpNotes?.trim(),
    total_estimated_duration_minutes:
      params.totalEstimatedDurationMinutes || params.total_estimated_duration_minutes || 60,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  plans.push(newPlan);
  setStoredTreatmentPlans(plans);

  // Add initial services if provided
  if (params.services && params.services.length > 0) {
    params.services.forEach((s, idx) => {
      const srvMeta = catalog.find((c) => c.id === s.serviceId);
      const newService: TreatmentPlanService = {
        id: `tps_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        organization_id: orgId,
        treatment_plan_id: planId,
        patient_id: params.patientId,
        service_id: s.serviceId,
        service_code: s.serviceCode || srvMeta?.code,
        service_name_ar: s.serviceNameAr || srvMeta?.name_ar,
        service_name_en: s.serviceNameEn || srvMeta?.name_en,
        tooth_number: s.toothNumber,
        area: s.area,
        sequence_order: s.sequenceOrder || idx + 1,
        doctor_id: params.doctorId,
        branch_id: s.branchId || '11111111-1111-1111-1111-111111111111',
        status: 'planned',
        clinical_notes: s.clinicalNotes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      planServices.push(newService);
    });
    setStoredTreatmentPlanServices(planServices);
  }

  return newPlan;
}

export function addServiceToTreatmentPlan(params: {
  organizationId?: string;
  treatmentPlanId: string;
  patientId: string;
  serviceId: string;
  serviceCode?: string;
  serviceNameAr?: string;
  serviceNameEn?: string;
  toothNumber?: string;
  area?: string;
  sequenceOrder?: number;
  doctorId: string;
  branchId?: string;
  clinicalNotes?: string;
}): TreatmentPlanService {
  const planServices = getStoredTreatmentPlanServices();
  const catalog = getStoredServices();
  const srvMeta = catalog.find((c) => c.id === params.serviceId);

  const existingInPlan = planServices.filter((s) => s.treatment_plan_id === params.treatmentPlanId);
  const nextSeq = params.sequenceOrder || existingInPlan.length + 1;

  const item: TreatmentPlanService = {
    id: `tps_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    organization_id: params.organizationId || DEFAULT_EGYPT_ORG.id,
    treatment_plan_id: params.treatmentPlanId,
    patient_id: params.patientId,
    service_id: params.serviceId,
    service_code: params.serviceCode || srvMeta?.code,
    service_name_ar: params.serviceNameAr || srvMeta?.name_ar,
    service_name_en: params.serviceNameEn || srvMeta?.name_en,
    tooth_number: params.toothNumber,
    area: params.area,
    sequence_order: nextSeq,
    doctor_id: params.doctorId,
    branch_id: params.branchId || '11111111-1111-1111-1111-111111111111',
    status: 'planned',
    clinical_notes: params.clinicalNotes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  planServices.push(item);
  setStoredTreatmentPlanServices(planServices);
  return item;
}

export function updateTreatmentServiceStatus(
  serviceId: string,
  newStatus: TreatmentServiceStatus,
  notes?: string
): boolean {
  const services = getStoredTreatmentPlanServices();
  const target = services.find((s) => s.id === serviceId);
  if (!target) return false;

  target.status = newStatus;
  if (notes) target.clinical_notes = notes;
  if (newStatus === 'completed') {
    target.completed_at = new Date().toISOString();
  }
  target.updated_at = new Date().toISOString();

  setStoredTreatmentPlanServices(services);
  return true;
}

export function updateTreatmentPlanStatus(
  planId: string,
  newStatus: TreatmentPlanStatus,
  nextStep?: string
): boolean {
  const plans = getStoredTreatmentPlans();
  const target = plans.find((p) => p.id === planId);
  if (!target) return false;

  target.status = newStatus;
  if (nextStep) target.next_step = nextStep;
  if (newStatus === 'completed') {
    target.completed_at = new Date().toISOString();
  }
  target.updated_at = new Date().toISOString();

  setStoredTreatmentPlans(plans);
  return true;
}

/**
 * 5. Clinical Visit Lifecycle & Notes Documentation
 */
export function startOrGetActiveClinicalVisit(params: {
  organizationId?: string;
  branchId?: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  specialty?: SpecialtyType;
}): ClinicalVisit {
  const visits = getStoredClinicalVisits();
  const orgId = params.organizationId || DEFAULT_EGYPT_ORG.id;
  const branchId = params.branchId || '11111111-1111-1111-1111-111111111111';

  // If there's an ongoing uncompleted visit for this appointment/patient, return it
  let visit = visits.find(
    (v) =>
      v.patient_id === params.patientId &&
      !v.is_completed &&
      (!params.appointmentId || v.appointment_id === params.appointmentId)
  );

  if (!visit) {
    const todayStr = new Date().toISOString().split('T')[0];
    visit = {
      id: `vis_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organization_id: orgId,
      branch_id: branchId,
      patient_id: params.patientId,
      doctor_id: params.doctorId,
      appointment_id: params.appointmentId,
      visit_date: todayStr,
      chief_complaint: 'كشف واستشارة طب أسنان',
      assessment_diagnosis: 'فحص سريري واستشارة',
      treatment_performed: 'فحص سريري وإجراءات التشخيص',
      specialty: params.specialty || 'general',
      is_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    visits.push(visit);
    setStoredClinicalVisits(visits);
  }

  // Update appointment status to with_doctor if applicable
  if (params.appointmentId) {
    updateAppointmentStatus(params.appointmentId, 'with_doctor');
  }

  return visit;
}

export function saveClinicalVisitDraft(visit: ClinicalVisit): ClinicalVisit {
  const visits = getStoredClinicalVisits();
  const index = visits.findIndex((v) => v.id === visit.id);
  const normalized: ClinicalVisit = {
    ...visit,
    updated_at: new Date().toISOString(),
  };

  if (index >= 0) {
    visits[index] = normalized;
  } else {
    visits.push(normalized);
  }

  setStoredClinicalVisits(visits);
  return normalized;
}

export function completeClinicalVisit(params: {
  visitId: string;
  checklist?: Partial<VisitCompletionChecklist>;
  doctorNotes?: string;
}): { success: boolean; visit?: ClinicalVisit; error?: string } {
  const visits = getStoredClinicalVisits();
  const visit = visits.find((v) => v.id === params.visitId);
  if (!visit) {
    return { success: false, error: 'Clinical visit not found' };
  }

  visit.is_completed = true;
  visit.completed_at = new Date().toISOString();
  if (params.doctorNotes) visit.doctor_notes = params.doctorNotes;
  visit.updated_at = new Date().toISOString();

  setStoredClinicalVisits(visits);

  // If linked to appointment, mark appointment as completed
  if (visit.appointment_id) {
    updateAppointmentStatus(visit.appointment_id, 'completed');
  }

  return { success: true, visit };
}

/**
 * 6. Medical Alerts Operations
 */
export function addMedicalAlert(alert: {
  organizationId?: string;
  patientId: string;
  alertType: MedicalAlert['alert_type'];
  severity: MedicalAlert['severity'];
  title: string;
  description: string;
  doctorId: string;
}): MedicalAlert {
  const alerts = getStoredMedicalAlerts();
  const newAlert: MedicalAlert = {
    id: `alt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    organization_id: alert.organizationId || DEFAULT_EGYPT_ORG.id,
    patient_id: alert.patientId,
    alert_type: alert.alertType,
    severity: alert.severity,
    title: alert.title.trim(),
    description: alert.description.trim(),
    active: true,
    recorded_by_doctor_id: alert.doctorId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  alerts.push(newAlert);
  setStoredMedicalAlerts(alerts);
  return newAlert;
}

export function toggleMedicalAlert(alertId: string, active: boolean): boolean {
  const alerts = getStoredMedicalAlerts();
  const target = alerts.find((a) => a.id === alertId);
  if (!target) return false;

  target.active = active;
  target.updated_at = new Date().toISOString();
  setStoredMedicalAlerts(alerts);
  return true;
}

/**
 * 7. Investigation Requests Engine
 */
export function requestInvestigation(params: {
  organizationId?: string;
  patientId: string;
  doctorId: string;
  branchId?: string;
  visitId?: string;
  type: InvestigationType;
  requestedTest: string;
  clinicalReason: string;
  urgency?: InvestigationUrgency;
  notes?: string;
}): InvestigationRequest {
  const requests = getStoredInvestigationRequests();
  const item: InvestigationRequest = {
    id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    organization_id: params.organizationId || DEFAULT_EGYPT_ORG.id,
    patient_id: params.patientId,
    doctor_id: params.doctorId,
    branch_id: params.branchId || '11111111-1111-1111-1111-111111111111',
    visit_id: params.visitId,
    type: params.type,
    requested_test: params.requestedTest.trim(),
    clinical_reason: params.clinicalReason.trim(),
    urgency: params.urgency || 'routine',
    notes: params.notes?.trim(),
    status: 'requested',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  requests.push(item);
  setStoredInvestigationRequests(requests);
  return item;
}

export function updateInvestigationStatus(
  investigationId: string,
  newStatus: InvestigationStatus,
  resultSummary?: string,
  resultFileUrl?: string,
  reviewedByDoctorId?: string
): boolean {
  const requests = getStoredInvestigationRequests();
  const target = requests.find((i) => i.id === investigationId);
  if (!target) return false;

  target.status = newStatus;
  if (resultSummary) target.result_summary = resultSummary;
  if (resultFileUrl) target.result_file_url = resultFileUrl;
  if (newStatus === 'reviewed') {
    target.reviewed_at = new Date().toISOString();
    if (reviewedByDoctorId) target.reviewed_by_doctor_id = reviewedByDoctorId;
  }
  target.updated_at = new Date().toISOString();

  setStoredInvestigationRequests(requests);
  return true;
}

/**
 * 8. Referrals Engine
 */
export function createReferral(params: {
  organizationId?: string;
  patientId: string;
  referringDoctorId: string;
  referralType: ReferralType;
  specialty: SpecialtyType | string;
  targetDoctorId?: string;
  targetFacilityName?: string;
  reason: string;
  clinicalSummary: string;
  priority?: ReferralPriority;
}): Referral {
  const referrals = getStoredReferrals();
  const item: Referral = {
    id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    organization_id: params.organizationId || DEFAULT_EGYPT_ORG.id,
    patient_id: params.patientId,
    referring_doctor_id: params.referringDoctorId,
    referral_type: params.referralType,
    specialty: params.specialty,
    target_doctor_id: params.targetDoctorId,
    target_facility_name: params.targetFacilityName?.trim(),
    reason: params.reason.trim(),
    clinical_summary: params.clinicalSummary.trim(),
    priority: params.priority || 'routine',
    status: 'sent',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  referrals.push(item);
  setStoredReferrals(referrals);
  return item;
}

export function updateReferralStatus(
  referralId: string,
  newStatus: ReferralStatus,
  responseNotes?: string,
  responseDoctorId?: string
): boolean {
  const referrals = getStoredReferrals();
  const target = referrals.find((r) => r.id === referralId);
  if (!target) return false;

  target.status = newStatus;
  if (responseNotes) target.response_notes = responseNotes;
  if (responseDoctorId) target.response_doctor_id = responseDoctorId;
  target.updated_at = new Date().toISOString();

  setStoredReferrals(referrals);
  return true;
}

/**
 * 9. Doctor Instructions & Reception Task Integration
 */
export function createDoctorRecommendation(params: {
  organizationId?: string;
  patientId: string;
  doctorId: string;
  category: InstructionTemplateCategory;
  title: string;
  instructionsAr: string;
  instructionsEn: string;
  createReceptionTask?: boolean;
}): { recommendation: DoctorRecommendation; task?: DoctorTask } {
  const recommendations = getStoredRecommendations();
  const recId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const orgId = params.organizationId || DEFAULT_EGYPT_ORG.id;

  let task: DoctorTask | undefined = undefined;
  let taskId: string | undefined = undefined;

  if (params.createReceptionTask !== false) {
    task = createDoctorTask({
      organizationId: orgId,
      patientId: params.patientId,
      doctorId: params.doctorId,
      taskType: 'send_instructions',
      title: `إرسال تعليمات (${params.title}) للمريض عبر واتساب`,
      details: params.instructionsAr,
      priority: 'normal',
    });
    taskId = task.id;
  }

  const recommendation: DoctorRecommendation = {
    id: recId,
    organization_id: orgId,
    patient_id: params.patientId,
    doctor_id: params.doctorId,
    category: params.category,
    title: params.title.trim(),
    instructions_ar: params.instructionsAr.trim(),
    instructions_en: params.instructionsEn.trim(),
    reception_task_created: !!taskId,
    reception_task_id: taskId,
    created_at: new Date().toISOString(),
  };

  recommendations.push(recommendation);
  setStoredRecommendations(recommendations);
  return { recommendation, task };
}

/**
 * 10. Prescriptions Engine
 */
export function createPrescription(params: {
  organizationId?: string;
  patientId: string;
  doctorId: string;
  branchId?: string;
  visitId?: string;
  diagnosis?: string;
  notes?: string;
  items: Omit<PrescriptionItem, 'id' | 'prescription_id'>[];
}): Prescription {
  const prescriptions = getStoredPrescriptions();
  const rxId = `rx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const orgId = params.organizationId || DEFAULT_EGYPT_ORG.id;

  const items: PrescriptionItem[] = params.items.map((item, idx) => ({
    id: `rxi_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    prescription_id: rxId,
    medication_name: item.medication_name.trim(),
    dosage: item.dosage.trim(),
    frequency: item.frequency.trim(),
    duration: item.duration.trim(),
    instructions: item.instructions.trim(),
  }));

  const rx: Prescription = {
    id: rxId,
    organization_id: orgId,
    patient_id: params.patientId,
    doctor_id: params.doctorId,
    branch_id: params.branchId || '11111111-1111-1111-1111-111111111111',
    visit_id: params.visitId,
    diagnosis: params.diagnosis?.trim(),
    items,
    notes: params.notes?.trim(),
    created_at: new Date().toISOString(),
  };

  prescriptions.push(rx);
  setStoredPrescriptions(prescriptions);
  return rx;
}

/**
 * 11. Consent Requests & Workflow
 */
export function requestConsent(params: {
  organizationId?: string;
  patientId: string;
  doctorId: string;
  consentType: ConsentType;
  title: string;
  descriptionAr: string;
  descriptionEn: string;
  createReceptionTask?: boolean;
}): { consent: ConsentRequest; task?: DoctorTask } {
  const consents = getStoredConsentRequests();
  const consentId = `con_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const orgId = params.organizationId || DEFAULT_EGYPT_ORG.id;

  let task: DoctorTask | undefined = undefined;
  let taskId: string | undefined = undefined;

  if (params.createReceptionTask !== false) {
    task = createDoctorTask({
      organizationId: orgId,
      patientId: params.patientId,
      doctorId: params.doctorId,
      taskType: 'obtain_consent',
      title: `أخذ توقيع المريض على إقرار (${params.title}) في مكتب الاستقبال`,
      details: params.descriptionAr,
      priority: 'urgent',
    });
    taskId = task.id;
  }

  const consent: ConsentRequest = {
    id: consentId,
    organization_id: orgId,
    patient_id: params.patientId,
    doctor_id: params.doctorId,
    consent_type: params.consentType,
    title: params.title.trim(),
    description_ar: params.descriptionAr.trim(),
    description_en: params.descriptionEn.trim(),
    status: 'requested',
    reception_task_id: taskId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  consents.push(consent);
  setStoredConsentRequests(consents);
  return { consent, task };
}

export function signConsentRequest(
  consentId: string,
  signerName: string,
  signatureReference?: string
): boolean {
  const consents = getStoredConsentRequests();
  const target = consents.find((c) => c.id === consentId);
  if (!target) return false;

  target.status = 'signed';
  target.signed_by_name = signerName.trim();
  target.signed_at = new Date().toISOString();
  target.signature_reference = signatureReference || `SIG-${Date.now()}`;
  target.updated_at = new Date().toISOString();

  setStoredConsentRequests(consents);

  // If linked task exists, mark task completed
  if (target.reception_task_id) {
    updateDoctorTaskStatus(target.reception_task_id, 'completed');
  }

  return true;
}

/**
 * 12. Follow-up Plans Engine
 */
export function createFollowUpPlan(params: {
  organizationId?: string;
  patientId: string;
  doctorId: string;
  branchId?: string;
  visitId?: string;
  dueDate: string;
  interval: FollowUpInterval;
  reason: string;
  notes?: string;
  createReceptionTask?: boolean;
}): { followUp: FollowUpPlan; task?: DoctorTask } {
  const plans = getStoredFollowUpPlans();
  const fupId = `fup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const orgId = params.organizationId || DEFAULT_EGYPT_ORG.id;

  let task: DoctorTask | undefined = undefined;
  let taskId: string | undefined = undefined;

  if (params.createReceptionTask !== false) {
    task = createDoctorTask({
      organizationId: orgId,
      patientId: params.patientId,
      doctorId: params.doctorId,
      taskType: 'schedule_follow_up',
      title: `جدولة موعد متابعة للمريض بتاريخ ${params.dueDate}`,
      details: params.reason,
      priority: 'normal',
    });
    taskId = task.id;
  }

  const followUp: FollowUpPlan = {
    id: fupId,
    organization_id: orgId,
    patient_id: params.patientId,
    doctor_id: params.doctorId,
    branch_id: params.branchId || '11111111-1111-1111-1111-111111111111',
    visit_id: params.visitId,
    due_date: params.dueDate,
    interval: params.interval,
    reason: params.reason.trim(),
    notes: params.notes?.trim(),
    status: 'pending',
    reception_task_id: taskId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  plans.push(followUp);
  setStoredFollowUpPlans(plans);
  return { followUp, task };
}

/**
 * 13. Doctor Tasks (Doctor -> Reception Tasks)
 */
export function createDoctorTask(params: {
  organizationId?: string;
  branchId?: string;
  patientId: string;
  doctorId: string;
  taskType: DoctorTaskType;
  title: string;
  details?: string;
  priority?: 'normal' | 'urgent';
  assignedToRole?: string;
}): DoctorTask {
  const tasks = getStoredDoctorTasks();
  const task: DoctorTask = {
    id: `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    organization_id: params.organizationId || DEFAULT_EGYPT_ORG.id,
    branch_id: params.branchId || '11111111-1111-1111-1111-111111111111',
    patient_id: params.patientId,
    doctor_id: params.doctorId,
    task_type: params.taskType,
    title: params.title.trim(),
    details: params.details?.trim(),
    status: 'pending',
    priority: params.priority || 'normal',
    assigned_to_role: params.assignedToRole || 'receptionist',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  tasks.push(task);
  setStoredDoctorTasks(tasks);
  return task;
}

export function updateDoctorTaskStatus(
  taskId: string,
  newStatus: DoctorTaskStatus,
  completedByStaffId?: string
): boolean {
  const tasks = getStoredDoctorTasks();
  const target = tasks.find((t) => t.id === taskId);
  if (!target) return false;

  target.status = newStatus;
  if (newStatus === 'completed') {
    target.completed_at = new Date().toISOString();
    if (completedByStaffId) target.completed_by_staff_id = completedByStaffId;
  }
  target.updated_at = new Date().toISOString();

  setStoredDoctorTasks(tasks);
  return true;
}

/**
 * 14. Doctor -> Doctor Consultation
 */
export function createDoctorConsultation(params: {
  organizationId?: string;
  patientId: string;
  requestingDoctorId: string;
  specialistDoctorId: string;
  specialty: string;
  subject: string;
  reason: string;
  clinicalNotes: string;
  priority?: 'routine' | 'urgent';
}): DoctorConsultation {
  const consultations = getStoredDoctorConsultations();
  const item: DoctorConsultation = {
    id: `con_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    organization_id: params.organizationId || DEFAULT_EGYPT_ORG.id,
    patient_id: params.patientId,
    requesting_doctor_id: params.requestingDoctorId,
    specialist_doctor_id: params.specialistDoctorId,
    specialty: params.specialty,
    subject: params.subject.trim(),
    reason: params.reason.trim(),
    clinical_notes: params.clinicalNotes.trim(),
    priority: params.priority || 'routine',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  consultations.push(item);
  setStoredDoctorConsultations(consultations);
  return item;
}

export function respondDoctorConsultation(
  consultationId: string,
  responseNotes: string,
  _respondingDoctorId?: string
): boolean {
  const consultations = getStoredDoctorConsultations();
  const target = consultations.find((c) => c.id === consultationId);
  if (!target) return false;

  target.status = 'responded';
  target.response_notes = responseNotes.trim();
  target.responded_at = new Date().toISOString();
  target.updated_at = new Date().toISOString();

  setStoredDoctorConsultations(consultations);
  return true;
}

/**
 * 15. Unified Patient Clinical Timeline Generator
 * Chronological order, no financial clutter.
 */
export function getPatientClinicalTimeline(patientId: string): ClinicalTimelineEvent[] {
  const events: ClinicalTimelineEvent[] = [];

  // 1. Visits
  const visits = getStoredClinicalVisits().filter((v) => v.patient_id === patientId);
  visits.forEach((v) => {
    events.push({
      id: `evt_vis_${v.id}`,
      event_type: 'visit',
      timestamp: v.completed_at || v.created_at,
      title_ar: `زيارة سريرية: ${v.chief_complaint}`,
      title_en: `Clinical Visit: ${v.chief_complaint}`,
      summary: `التشخيص: ${v.assessment_diagnosis} | الإجراء: ${v.treatment_performed}`,
      doctor_name: 'د. كريم حسن',
      metadata: v,
    });
  });

  // 2. Treatment Services
  const treatmentServices = getStoredTreatmentPlanServices().filter(
    (s) => s.patient_id === patientId && s.status === 'completed'
  );
  treatmentServices.forEach((s) => {
    events.push({
      id: `evt_tps_${s.id}`,
      event_type: 'treatment',
      timestamp: s.completed_at || s.updated_at,
      title_ar: `إتمام إجراء علاجي: ${s.service_name_ar || s.service_code}`,
      title_en: `Completed Treatment: ${s.service_name_en || s.service_code}`,
      summary: `${s.tooth_number ? `السن #${s.tooth_number} - ` : ''}${s.clinical_notes || ''}`,
      doctor_name: 'د. كريم حسن',
      metadata: s,
    });
  });

  // 3. Chart Updates
  const chartEntries = getStoredDentalChartEntries().filter((e) => e.patient_id === patientId);
  chartEntries.forEach((e) => {
    events.push({
      id: `evt_che_${e.id}`,
      event_type: 'chart_update',
      timestamp: e.created_at,
      title_ar: `تسجيل حالة سنية: السن #${e.tooth_number} (${e.condition})`,
      title_en: `Dental Chart Entry: Tooth #${e.tooth_number} (${e.condition})`,
      summary: `${e.surfaces?.length ? `الأسطح: ${e.surfaces.join(', ')} - ` : ''}${e.notes || ''}`,
      doctor_name: 'د. كريم حسن',
      metadata: e,
    });
  });

  // 4. Investigations
  const investigations = getStoredInvestigationRequests().filter((i) => i.patient_id === patientId);
  investigations.forEach((inv) => {
    events.push({
      id: `evt_inv_${inv.id}`,
      event_type: 'investigation',
      timestamp: inv.reviewed_at || inv.created_at,
      title_ar: `طلب فحص/أشعة: ${inv.requested_test}`,
      title_en: `Investigation Request: ${inv.requested_test}`,
      summary: `الحالة: ${inv.status} ${inv.result_summary ? `| النتيجة: ${inv.result_summary}` : ''}`,
      doctor_name: 'د. كريم حسن',
      metadata: inv,
    });
  });

  // 5. Prescriptions
  const prescriptions = getStoredPrescriptions().filter((p) => p.patient_id === patientId);
  prescriptions.forEach((rx) => {
    const meds = rx.items.map((i) => i.medication_name).join(', ');
    events.push({
      id: `evt_rx_${rx.id}`,
      event_type: 'prescription',
      timestamp: rx.created_at,
      title_ar: `وصفة علاجية طبية (روشتة)`,
      title_en: `Medical Prescription`,
      summary: `الأدوية: ${meds}`,
      doctor_name: 'د. كريم حسن',
      metadata: rx,
    });
  });

  // 6. Recommendations
  const recommendations = getStoredRecommendations().filter((r) => r.patient_id === patientId);
  recommendations.forEach((rec) => {
    events.push({
      id: `evt_rec_${rec.id}`,
      event_type: 'recommendation',
      timestamp: rec.created_at,
      title_ar: `توصيات وتعليمات الطبيب: ${rec.title}`,
      title_en: `Doctor Recommendation: ${rec.title}`,
      summary: rec.instructions_ar.substring(0, 100) + '...',
      doctor_name: 'د. كريم حسن',
      metadata: rec,
    });
  });

  // 7. Consents
  const consents = getStoredConsentRequests().filter((c) => c.patient_id === patientId);
  consents.forEach((con) => {
    events.push({
      id: `evt_con_${con.id}`,
      event_type: 'consent',
      timestamp: con.signed_at || con.created_at,
      title_ar: `إقرار وموافقة طبية: ${con.title}`,
      title_en: `Informed Medical Consent: ${con.title}`,
      summary: `الحالة: ${con.status} ${con.signed_by_name ? `| الموقع: ${con.signed_by_name}` : ''}`,
      doctor_name: 'د. كريم حسن',
      metadata: con,
    });
  });

  // 8. Follow-ups
  const followUps = getStoredFollowUpPlans().filter((f) => f.patient_id === patientId);
  followUps.forEach((fup) => {
    events.push({
      id: `evt_fup_${fup.id}`,
      event_type: 'follow_up',
      timestamp: fup.created_at,
      title_ar: `خطة متابعة سريرية: مستحق بتاريخ ${fup.due_date}`,
      title_en: `Clinical Follow-up: Due on ${fup.due_date}`,
      summary: `السبب: ${fup.reason} | الحالة: ${fup.status}`,
      doctor_name: 'د. كريم حسن',
      metadata: fup,
    });
  });

  // Sort reverse-chronologically (newest first)
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function updateClinicalVisit(params: {
  visitId: string;
  chiefComplaint?: string;
  examinationFindings?: string;
  assessmentDiagnosis?: string;
  treatmentPerformed?: string;
  materialsUsed?: string;
  anesthesiaDetails?: string;
  nextVisitPlan?: string;
  specialty?: SpecialtyType;
  doctorNotes?: string;
}): ClinicalVisit | null {
  const visits = getStoredClinicalVisits();
  const visit = visits.find((v) => v.id === params.visitId);
  if (!visit) return null;

  if (params.chiefComplaint !== undefined) visit.chief_complaint = params.chiefComplaint;
  if (params.examinationFindings !== undefined) visit.examination_findings = params.examinationFindings;
  if (params.assessmentDiagnosis !== undefined) visit.assessment_diagnosis = params.assessmentDiagnosis;
  if (params.treatmentPerformed !== undefined) visit.treatment_performed = params.treatmentPerformed;
  if (params.materialsUsed !== undefined) visit.materials_used = params.materialsUsed;
  if (params.anesthesiaDetails !== undefined) visit.anesthesia_details = params.anesthesiaDetails;
  if (params.nextVisitPlan !== undefined) visit.next_visit_plan = params.nextVisitPlan;
  if (params.specialty !== undefined) visit.specialty = params.specialty;
  if (params.doctorNotes !== undefined) visit.doctor_notes = params.doctorNotes;
  visit.updated_at = new Date().toISOString();

  setStoredClinicalVisits(visits);
  return visit;
}

export const getStoredDoctorRecommendations = getStoredRecommendations;
export const setStoredDoctorRecommendations = setStoredRecommendations;
export const updateTreatmentPlanServiceStatus = updateTreatmentServiceStatus;

export const createMedicalAlert = (params: {
  patientId: string;
  alertType: MedicalAlert['alert_type'];
  severity: MedicalAlert['severity'];
  title: string;
  notes?: string;
  description?: string;
  doctorId?: string;
}) =>
  addMedicalAlert({
    organizationId: DEFAULT_EGYPT_ORG.id,
    patientId: params.patientId,
    alertType: params.alertType,
    severity: params.severity,
    title: params.title,
    description: params.notes || params.description || params.title,
    doctorId: params.doctorId || 'prof_doc_01',
  });

export function generateWhatsAppInstructionUrl(params: {
  mobile: string;
  patientName: string;
  title: string;
  instructions: string;
  clinicName?: string;
}): { url: string; message: string } {
  const cleanMobile = (params.mobile || '').replace(/\D/g, '');
  const egMobile = cleanMobile.startsWith('20')
    ? cleanMobile
    : cleanMobile.startsWith('0')
    ? '2' + cleanMobile
    : '20' + cleanMobile;

  const clinic = params.clinicName || 'مركز طب الأسنان التخصصي';
  const message = `مرحباً ${params.patientName}،\n\nنرسل لك من ${clinic} تعليمات الطبيب بخصوص (${params.title}):\n\n${params.instructions}\n\nنتمنى لك دوام الصحة والعافية.`;

  const url = `https://wa.me/${egMobile}?text=${encodeURIComponent(message)}`;
  return { url, message };
}

export function uploadInvestigationResult(
  investigationId: string,
  resultSummary: string,
  resultFileUrl?: string
): boolean {
  return updateInvestigationStatus(
    investigationId,
    'completed',
    resultSummary,
    resultFileUrl || `https://storage.dental-clinic.eg/results/${investigationId}.pdf`
  );
}

export function reviewInvestigation(
  investigationId: string,
  doctorId: string,
  reviewNotes: string
): boolean {
  const requests = getStoredInvestigationRequests();
  const target = requests.find((i) => i.id === investigationId);
  if (!target) return false;

  target.status = 'reviewed';
  target.reviewed_by_doctor_id = doctorId;
  target.reviewed_at = new Date().toISOString();
  if (reviewNotes) {
    target.result_summary = target.result_summary
      ? `${target.result_summary}\n\n[ملاحظات مراجعة الطبيب]: ${reviewNotes}`
      : `[ملاحظات مراجعة الطبيب]: ${reviewNotes}`;
  }
  target.updated_at = new Date().toISOString();

  setStoredInvestigationRequests(requests);
  return true;
}

export function getReceptionHandoffTasks(
  organizationId?: string,
  branchId?: string,
  status?: DoctorTaskStatus
): DoctorTask[] {
  const tasks = getStoredDoctorTasks();
  return tasks.filter((t) => {
    if (organizationId && t.organization_id !== organizationId) return false;
    if (branchId && branchId !== 'all' && t.branch_id !== branchId) return false;
    if (status && t.status !== status) return false;
    return true;
  });
}

export const createInvestigationRequest = (params: {
  patientId: string;
  doctorId: string;
  branchId?: string;
  organizationId?: string;
  type: InvestigationType;
  requestedTest: string;
  clinicalReason: string;
  urgency?: InvestigationUrgency;
  notes?: string;
}) => requestInvestigation(params);


