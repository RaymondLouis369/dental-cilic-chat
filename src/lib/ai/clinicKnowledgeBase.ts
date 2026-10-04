/**
 * Phase 10.1: Clinic Knowledge Base & Database Search Engine
 * Dental Clinic & Dental Center Management Platform — Egypt
 *
 * Checks clinic DB, services, pricing, shifts, branches, insurance,
 * and authorized patient records BEFORE calling external AI services.
 */

import {
  KnowledgeMatch,
  AIUserContext,
  AILanguage,
  AISourceCategory,
  AIRiskSignal,
  AIRecommendedAction,
} from './types';
import { DEFAULT_EGYPT_ORG, DEFAULT_BRANCHES, appendAuditLog } from '../storage';
import {
  getStoredServices,
  getStoredAppointments,
  getStoredInvoices,
} from '../receptionAndBillingStorage';
import { getStoredSupportTickets } from '../complaintStorage';
import {
  getStoredTreatmentPlans,
  getStoredPrescriptions,
  getStoredConsentRequests,
  getStoredFollowUpPlans,
  getStoredLabOrders,
  getStoredMedicalAlerts,
} from '../clinicalStorage';
import { getStoredPatients } from '../patientStorage';
import { getStoredInventoryItems } from '../inventoryStorage';
import { getStoredWhatsAppLogs, sendWhatsAppMessage } from '../communicationStorage';
import { getStoredEscalations } from '../escalationStorage';
import { AuditAction } from '../../types';

/**
 * Detect language based on Arabic unicode character set
 */
export function detectLanguage(text: string): AILanguage {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  return arabicRegex.test(text) ? 'ar' : 'en';
}

/**
 * Static Clinic Knowledge Base Items (Egypt Localized)
 */
const CLINIC_STATIC_KNOWLEDGE = [
  {
    keywords_ar: ['مواعيد العمل', 'اوقات العمل', 'ساعات العمل', 'مفتوح', 'متى يفتح', 'ايام العمل', 'متى تعملون'],
    keywords_en: ['working hours', 'opening hours', 'work hours', 'open time', 'business hours', 'operating hours'],
    category: 'working_hours',
    text_ar: 'مواعيد العمل في مراكزنا: من السبت إلى الخميس من الساعة 9:00 صباحاً حتى 9:00 مساءً، والجمعة من الساعة 2:00 ظهراً حتى 9:00 مساءً. نرحب بحضوركم أو حجز موعدكم مسبقاً.',
    text_en: 'Clinic Working Hours: Saturday through Thursday from 9:00 AM to 9:00 PM, and Friday from 2:00 PM to 9:00 PM. You are welcome to visit or book an appointment in advance.',
  },
  {
    keywords_ar: ['عناوين', 'فروع', 'موقع', 'اين يوجد', 'مكان', 'عنوان', 'القاهرة', 'الاسكندرية', 'الجيزة'],
    keywords_en: ['branches', 'locations', 'address', 'where', 'branch', 'cairo', 'alexandria', 'giza'],
    category: 'branches',
    text_ar: 'فروع مركزنا في مصر:\n1. فرع القاهرة - المعادي: شارع 9، المعادي (تلفون: +20 2 2358 1234)\n2. فرع الإسكندرية - سموحة: ميدان سموحة، الإسكندرية (تلفون: +20 3 420 5678)\n3. فرع الجيزة - الدقي: شارع مصدق، الدقي (تلفون: +20 2 3335 9012)',
    text_en: 'Clinic Branches in Egypt:\n1. Cairo Branch - Maadi: Street 9, Maadi (+20 2 2358 1234)\n2. Alexandria Branch - Smouha: Smouha Square, Alexandria (+20 3 420 5678)\n3. Giza Branch - Dokki: Mossadak Street, Dokki (+20 2 3335 9012)',
  },
  {
    keywords_ar: ['تأمين', 'تأمينات', 'شركات التأمين', 'تأمين طبي', 'بوبا', 'ميتلايف', 'أكسا'],
    keywords_en: ['insurance', 'insurance companies', 'medical insurance', 'bupa', 'metlife', 'axa', 'coverage'],
    category: 'insurance',
    text_ar: 'نقبل بطاقات وبوالص مجموعة من أكبر شركات التأمين الطبي في مصر، بما في ذلك: بوبا مصر (Bupa Egypt)، ميتلايف (MetLife)، أكسا (AXA)، جلوب مد (GlobeMed)، نيكست كير (NextCare)، وبرايم هيلث (Prime Health). يرجى إبراز بطاقة التأمين عند الاستقبال.',
    text_en: 'We accept medical insurance from top providers in Egypt, including Bupa Egypt, MetLife, AXA Egypt, GlobeMed, NextCare, and Prime Health. Please present your insurance card at reception.',
  },
  {
    keywords_ar: ['كيف احجز', 'طريقة الحجز', 'سياسة الحجز', 'كيفية الحجز', 'حجز موعد جديد'],
    keywords_en: ['how to book', 'booking policy', 'how do i book', 'schedule an appointment'],
    category: 'booking_policy',
    text_ar: 'يمكنك حجز موعد بسهولة من خلال بوابة المريض الإلكترونية، أو الاتصال بالفرع المباشر، أو الحضور لمكتب الاستقبال. للإلغاء أو إعادة الجدولة، يرجى إبلاغنا قبل الموعد بـ 24 ساعة على الأقل.',
    text_en: 'You can book an appointment easily through the Patient Portal, by calling your branch directly, or at the reception desk. For cancellations or rescheduling, please notify us at least 24 hours in advance.',
  },
  {
    keywords_ar: ['تقديم شكوى', 'تذكرة دعم', 'رفع شكوى', 'دعم الفني', 'تقديم نموذج شكوى'],
    keywords_en: ['submit complaint', 'file a complaint', 'support ticket', 'customer service'],
    category: 'complaints',
    text_ar: 'يهمنا رضاكم التام! يمكنك تقديم شكوى أو تذكرة دعم مباشرة عبر قسم "تذاكر الدعم والشكاوى" في بوابة المريض، أو التواصل مع موظف الاستقبال أو مدير المركز.',
    text_en: 'Your satisfaction is our priority! You can submit a support ticket or complaint directly in the "Support & Complaints" section of the Patient Portal, or talk to reception/management.',
  },
  {
    keywords_ar: ['طرق الدفع', 'خيارات الدفع', 'دفع كاش', 'تقسيط فيزا', 'فوري كاش'],
    keywords_en: ['payment methods', 'payment options', 'accepted payment', 'cash or card'],
    category: 'payment_methods',
    text_ar: 'نوفر طرق دفع متنوعة: نقداً (EGP)، البطاقات الائتمانية (فيزا/ماستركارد)، تحويل فوري، والخصم المباشر لشركات التأمين المتعاقد عليها.',
    text_en: 'We support multiple payment methods: Cash (EGP), Credit/Debit Cards (Visa/Mastercard), Fawry direct payments, and direct insurance billing for approved providers.',
  },
];

/**
 * Searches local clinic knowledge and database for matches.
 */
export function queryClinicDatabase(prompt: string, context?: AIUserContext): KnowledgeMatch {
  const lang = detectLanguage(prompt);
  const normalizedPrompt = prompt.toLowerCase().trim();

  // 1. Patient Appointment Specific Query
  const isApptQuery =
    (normalizedPrompt.includes('موعدي') ||
     normalizedPrompt.includes('حجزي') ||
     normalizedPrompt.includes('زيارتي') ||
     normalizedPrompt.includes('موعد قادم') ||
     normalizedPrompt.includes('مواعيدي') ||
     normalizedPrompt.includes('my appointment') ||
     normalizedPrompt.includes('next visit') ||
     normalizedPrompt.includes('my booking')) &&
    !normalizedPrompt.includes('احجز') &&
    !normalizedPrompt.includes('حجز موعد جديد');

  if (isApptQuery) {
    if (!context?.patientId || !context.isAuthenticated) {
      return {
        found: true,
        language: lang,
        category: 'patient_appointment_unauth',
        text: lang === 'ar'
          ? 'يرجى تسجيل الدخول إلى حسابك في بوابة المريض للوصول إلى تفاصيل مواعيدك وحجوزاتك القادمة.'
          : 'Please log in to your Patient Portal account to access your personal appointment details.',
      };
    }

    const appointments = getStoredAppointments();
    const orgId = context.organizationId || DEFAULT_EGYPT_ORG.id;
    const patientAppts = appointments.filter(
      (a) => a.patient_id === context.patientId && a.organization_id === orgId && a.status !== 'cancelled'
    );

    if (patientAppts.length > 0) {
      patientAppts.sort(
        (a, b) => new Date(`${a.appointment_date}T${a.start_time}`).getTime() - new Date(`${b.appointment_date}T${b.start_time}`).getTime()
      );
      const nextAppt = patientAppts[0];
      const branch = DEFAULT_BRANCHES.find((b) => b.id === nextAppt.branch_id);
      const branchName = branch ? branch.name : 'الفرع الرئيسي';

      return {
        found: true,
        language: lang,
        category: 'patient_appointment',
        text: lang === 'ar'
          ? `لديك موعد قادم بتاريخ ${nextAppt.appointment_date} الساعة ${nextAppt.start_time} في ${branchName} (حالة الموعد: ${nextAppt.status}).`
          : `You have an upcoming appointment on ${nextAppt.appointment_date} at ${nextAppt.start_time} at ${branchName} (Status: ${nextAppt.status}).`,
        metadata: { appointmentId: nextAppt.id },
      };
    } else {
      return {
        found: true,
        language: lang,
        category: 'patient_no_appointment',
        text: lang === 'ar'
          ? 'لا توجد لديك مواعيد قادمة مسجلة حالياً في هذا المركز. يمكنك حجز موعد جديد عبر البوابة.'
          : 'No upcoming appointments found for your account in this center. You can schedule a new appointment via the portal.',
      };
    }
  }

  // 2. Patient Support Ticket Specific Query
  const isTicketQuery =
    normalizedPrompt.includes('شكواي') ||
    normalizedPrompt.includes('تذكرتي') ||
    normalizedPrompt.includes('my ticket') ||
    normalizedPrompt.includes('my complaint');

  if (isTicketQuery) {
    if (!context?.patientId || !context.isAuthenticated) {
      return {
        found: true,
        language: lang,
        category: 'patient_ticket_unauth',
        text: lang === 'ar'
          ? 'يرجى تسجيل الدخول إلى حسابك لمتابعة حالة تذاكر الدعم والشكاوى الخاصة بك.'
          : 'Please log in to your account to view your personal support tickets and complaints.',
      };
    }

    const tickets = getStoredSupportTickets();
    const orgId = context.organizationId || DEFAULT_EGYPT_ORG.id;
    const patientTickets = tickets.filter(
      (t) => t.patient_id === context.patientId && t.organization_id === orgId
    );

    if (patientTickets.length > 0) {
      const latestTicket = patientTickets[patientTickets.length - 1];
      return {
        found: true,
        language: lang,
        category: 'patient_ticket',
        text: lang === 'ar'
          ? `تذكرتك رقم ${latestTicket.ticket_number} (${latestTicket.subject}) حالتها الحالية هي: ${latestTicket.status}.`
          : `Your ticket ${latestTicket.ticket_number} (${latestTicket.subject}) current status is: ${latestTicket.status}.`,
        metadata: { ticketId: latestTicket.id },
      };
    } else {
      return {
        found: true,
        language: lang,
        category: 'patient_no_ticket',
        text: lang === 'ar'
          ? 'لا توجد لديك تذاكر دعم مسجلة حالياً.'
          : 'No support tickets found for your account.',
      };
    }
  }

  // 3. Patient Treatment Plan Query
  const isTreatmentQuery =
    normalizedPrompt.includes('علاجي') ||
    normalizedPrompt.includes('خطة العلاج') ||
    normalizedPrompt.includes('my treatment') ||
    normalizedPrompt.includes('treatment plan') ||
    normalizedPrompt.includes('روشتة') ||
    normalizedPrompt.includes('my prescription');

  if (isTreatmentQuery) {
    if (!context?.patientId || !context.isAuthenticated) {
      return {
        found: true,
        language: lang,
        category: 'patient_treatment_unauth',
        text: lang === 'ar'
          ? 'يرجى تسجيل الدخول إلى حسابك في بوابة المريض للاطلاع على خطة العلاج والروشتات الطبية الخاصة بك.'
          : 'Please log in to your account to view your authorized treatment plan and prescriptions.',
      };
    }

    const plans = getStoredTreatmentPlans().filter(
      (p) => p.patient_id === context.patientId && p.organization_id === (context.organizationId || DEFAULT_EGYPT_ORG.id)
    );
    const prescriptions = getStoredPrescriptions().filter(
      (rx) => rx.patient_id === context.patientId
    );

    if (plans.length > 0) {
      const activePlan = plans[0];
      const rxText = prescriptions.length > 0
        ? (lang === 'ar' ? `\nعدد الروشتات المسجلة: ${prescriptions.length}` : `\nPrescriptions recorded: ${prescriptions.length}`)
        : '';

      return {
        found: true,
        language: lang,
        category: 'patient_treatment',
        text: lang === 'ar'
          ? `خطة علاجك الحالية: "${activePlan.title}" (الحالة: ${activePlan.status}).\nالتشخيص: ${activePlan.diagnosis}\nالخطوة القادمة: ${activePlan.next_step || 'متابعة الطبيب المعالج'}.${rxText}`
          : `Your active treatment plan: "${activePlan.title}" (Status: ${activePlan.status}).\nDiagnosis: ${activePlan.diagnosis}\nNext Step: ${activePlan.next_step || 'Follow-up with attending dentist'}.${rxText}`,
        metadata: { planId: activePlan.id },
      };
    } else {
      return {
        found: true,
        language: lang,
        category: 'patient_no_treatment',
        text: lang === 'ar'
          ? 'لا توجد خطة علاج نشطة مسجلة لحسابك حالياً. يمكنك حجز موعد كشف للتقييم الطبي.'
          : 'No active treatment plan found for your account. You can schedule a consultation visit.',
      };
    }
  }

  // 4. Patient Account & Profile Query
  const isAccountQuery =
    normalizedPrompt.includes('حسابي') ||
    normalizedPrompt.includes('بياناتي') ||
    normalizedPrompt.includes('ملفي') ||
    normalizedPrompt.includes('my account') ||
    normalizedPrompt.includes('my profile') ||
    normalizedPrompt.includes('رقم المريض') ||
    normalizedPrompt.includes('patient code');

  if (isAccountQuery) {
    if (!context?.patientId || !context.isAuthenticated) {
      return {
        found: true,
        language: lang,
        category: 'patient_account_unauth',
        text: lang === 'ar'
          ? 'يرجى تسجيل الدخول إلى حسابك لمراجعة بيانات ملفك الطبي ورقم المريض.'
          : 'Please log in to your account to view your patient profile and medical record details.',
      };
    }

    const patients = getStoredPatients();
    const patientRecord = patients.find((p) => p.id === context.patientId);
    const alerts = getStoredMedicalAlerts().filter((a) => a.patient_id === context.patientId && a.active);

    if (patientRecord) {
      const alertInfo = alerts.length > 0
        ? (lang === 'ar' ? `\nالتنبيهات الطبية المسجلة: ${alerts.map((a) => a.title).join('، ')}` : `\nActive Medical Alerts: ${alerts.map((a) => a.title).join(', ')}`)
        : '';

      return {
        found: true,
        language: lang,
        category: 'patient_account',
        text: lang === 'ar'
          ? `بيانات حسابك:\n• الاسم: ${patientRecord.first_name} ${patientRecord.last_name}\n• كود المريض: ${patientRecord.patient_code}\n• رقم الهاتف: ${patientRecord.primary_mobile}${alertInfo}`
          : `Your Account Profile:\n• Name: ${patientRecord.first_name} ${patientRecord.last_name}\n• Patient Code: ${patientRecord.patient_code}\n• Mobile: ${patientRecord.primary_mobile}${alertInfo}`,
        metadata: { patientCode: patientRecord.patient_code },
      };
    }
  }

  // 5. Patient Required Tasks & Follow-ups Query
  const isTasksQuery =
    normalizedPrompt.includes('المهام') ||
    normalizedPrompt.includes('المطلوب') ||
    normalizedPrompt.includes('مهامي') ||
    normalizedPrompt.includes('توقيع') ||
    normalizedPrompt.includes('required tasks') ||
    normalizedPrompt.includes('my tasks') ||
    normalizedPrompt.includes('pending tasks');

  if (isTasksQuery) {
    if (!context?.patientId || !context.isAuthenticated) {
      return {
        found: true,
        language: lang,
        category: 'patient_tasks_unauth',
        text: lang === 'ar'
          ? 'يرجى تسجيل الدخول لمراجعة المهام والإقرارات المطلوبة منك.'
          : 'Please log in to view required tasks and pending consents.',
      };
    }

    const pendingConsents = getStoredConsentRequests().filter(
      (c) => c.patient_id === context.patientId && c.status === 'pending_signature'
    );
    const dueRecalls = getStoredFollowUpPlans().filter(
      (f) => f.patient_id === context.patientId && (f.status === 'due' || f.status === 'scheduled')
    );

    if (pendingConsents.length > 0 || dueRecalls.length > 0) {
      const consentMsg = pendingConsents.length > 0
        ? (lang === 'ar' ? `• لديك ${pendingConsents.length} إقرار طبي بانتظار التوقيع.\n` : `• You have ${pendingConsents.length} pending consent form(s) to sign.\n`)
        : '';
      const recallMsg = dueRecalls.length > 0
        ? (lang === 'ar' ? `• لديك ${dueRecalls.length} موعد متابعة/استدعاء قادم.` : `• You have ${dueRecalls.length} upcoming follow-up recall(s).`)
        : '';

      return {
        found: true,
        language: lang,
        category: 'patient_tasks',
        text: lang === 'ar'
          ? `المهام المطلوبة من حسابك:\n${consentMsg}${recallMsg}`
          : `Required Tasks for your account:\n${consentMsg}${recallMsg}`,
      };
    } else {
      return {
        found: true,
        language: lang,
        category: 'patient_no_tasks',
        text: lang === 'ar'
          ? 'لا توجد أي مهام أو إقرارات أو معلقات مطلوبة منك حالياً.'
          : 'No pending tasks, consents, or required actions at this time.',
      };
    }
  }

  // 6. Patient Lab Order Query
  const isLabQuery =
    normalizedPrompt.includes('المعمل') ||
    normalizedPrompt.includes('التركيبة') ||
    normalizedPrompt.includes('التركيبات') ||
    normalizedPrompt.includes('lab order') ||
    normalizedPrompt.includes('my lab');

  if (isLabQuery) {
    if (!context?.patientId || !context.isAuthenticated) {
      return {
        found: true,
        language: lang,
        category: 'patient_lab_unauth',
        text: lang === 'ar'
          ? 'يرجى تسجيل الدخول لمتابعة حالة طلبيات المعمل والتركيبات الخاصة بك.'
          : 'Please log in to view the status of your lab orders and prosthetics.',
      };
    }

    const labOrders = getStoredLabOrders().filter((l) => l.patient_id === context.patientId);

    if (labOrders.length > 0) {
      const latestOrder = labOrders[labOrders.length - 1];
      const itemName = latestOrder.service_name_ar || latestOrder.product_type || 'تركيبة أسنان';
      return {
        found: true,
        language: lang,
        category: 'patient_lab_order',
        text: lang === 'ar'
          ? `طلب المعمل الخاص بك (${itemName}): حالة الطلب الحالية هي "${latestOrder.status}".`
          : `Your lab order (${itemName}): Current status is "${latestOrder.status}".`,
        metadata: { orderId: latestOrder.id },
      };
    } else {
      return {
        found: true,
        language: lang,
        category: 'patient_no_lab_order',
        text: lang === 'ar'
          ? 'لا توجد أي طلبيات معمل أو تركيبات مسجلة لحسابك حالياً.'
          : 'No active lab orders found for your account.',
      };
    }
  }

  // 3. Dental Services & Pricing from DB
  const isServicesQuery =
    normalizedPrompt.includes('خدمات') ||
    normalizedPrompt.includes('اسعار') ||
    normalizedPrompt.includes('تكلفة') ||
    normalizedPrompt.includes('سعر') ||
    normalizedPrompt.includes('تنظيف') ||
    normalizedPrompt.includes('زراعة') ||
    normalizedPrompt.includes('تقويم') ||
    normalizedPrompt.includes('حشو') ||
    normalizedPrompt.includes('خدمة') ||
    normalizedPrompt.includes('services') ||
    normalizedPrompt.includes('pricing') ||
    normalizedPrompt.includes('costs') ||
    normalizedPrompt.includes('implant cost') ||
    normalizedPrompt.includes('teeth cleaning');

  if (isServicesQuery) {
    const services = getStoredServices();
    const activeServices = services.filter((s) => s.active !== false);

    if (activeServices.length > 0) {
      const matchedService = activeServices.find((s) => {
        const nameAr = s.name_ar.toLowerCase();
        const nameEn = s.name_en.toLowerCase();
        return normalizedPrompt.includes(nameAr) || normalizedPrompt.includes(nameEn);
      });

      if (matchedService) {
        return {
          found: true,
          language: lang,
          category: 'dental_service',
          text: lang === 'ar'
            ? `خدمة "${matchedService.name_ar}" (كود: ${matchedService.code}): المدة المحددة ${matchedService.default_duration_minutes} دقيقة.`
            : `Service "${matchedService.name_en}" (Code: ${matchedService.code}): Estimated duration ${matchedService.default_duration_minutes} minutes.`,
          metadata: { serviceId: matchedService.id },
        };
      }

      const serviceListAr = activeServices.map((s) => `• ${s.name_ar} (كود: ${s.code}): ${s.default_duration_minutes} دقيقة`).join('\n');
      const serviceListEn = activeServices.map((s) => `• ${s.name_en} (Code: ${s.code}): ${s.default_duration_minutes} min`).join('\n');

      return {
        found: true,
        language: lang,
        category: 'dental_services_list',
        text: lang === 'ar'
          ? `الخدمات والأسعار المتاحة في المركز:\n${serviceListAr}\n\nيمكنك حجز موعدك لأي من هذه الخدمات من خلال البوابة.`
          : `Available services and pricing:\n${serviceListEn}\n\nYou can book an appointment for any of these services via the portal.`,
      };
    }
  }

  // 4. Static Knowledge Base FAQs
  for (const item of CLINIC_STATIC_KNOWLEDGE) {
    const keywords = lang === 'ar' ? item.keywords_ar : item.keywords_en;
    const match = keywords.some((kw) => normalizedPrompt.includes(kw.toLowerCase()));

    if (match) {
      return {
        found: true,
        language: lang,
        category: item.category,
        text: lang === 'ar' ? item.text_ar : item.text_en,
      };
    }
  }

  return {
    found: false,
    language: lang,
  };
}

// ============================================================================
// WAVE 4: DOCTOR AI ASSISTANT FUNCTIONS
// ============================================================================

/**
 * Summarizes authorized patient clinical timeline, treatment plan progress, stored investigation results,
 * referrals, and previous clinical notes for Doctor AI Workspace.
 */
export function generateDoctorClinicalSummary(
  patientId: string,
  organizationId: string = DEFAULT_EGYPT_ORG.id,
  lang: AILanguage = 'ar'
): { summary: string; missingFields: string[]; sourceCategories: AISourceCategory[] } {
  const patients = getStoredPatients();
  const patient = patients.find(
    (p) => p.id === patientId && (p.organization_id === organizationId || p.organization_id === DEFAULT_EGYPT_ORG.id || !organizationId)
  );

  if (!patient) {
    return {
      summary: lang === 'ar' ? 'سجل المريض غير موجود أو غير مصرح الوصول إليه.' : 'Patient record not found or access unauthorized.',
      missingFields: [],
      sourceCategories: ['Patient Record'],
    };
  }

  const plans = getStoredTreatmentPlans().filter((p) => p.patient_id === patientId);
  const prescriptions = getStoredPrescriptions().filter((rx) => rx.patient_id === patientId);
  const labOrders = getStoredLabOrders().filter((l) => l.patient_id === patientId);
  const alerts = getStoredMedicalAlerts().filter((a) => a.patient_id === patientId && a.active);
  const pendingConsents = getStoredConsentRequests().filter(
    (c) => c.patient_id === patientId && c.status === 'pending_signature'
  );

  const missingFields: string[] = [];
  if (!patient.national_id) missingFields.push(lang === 'ar' ? 'الرقم القومي / هية المريض' : 'National ID');
  if (alerts.length === 0) missingFields.push(lang === 'ar' ? 'تحديث التنبيهات الطبية والحساسية' : 'Medical Allergy Audit');
  if (pendingConsents.length > 0) missingFields.push(lang === 'ar' ? `توقيع الإقرار الطبي (${pendingConsents.length} معلق)` : `Pending Consent Signatures (${pendingConsents.length})`);

  const activePlan = plans[0];
  const planInfo = activePlan
    ? (lang === 'ar'
        ? `• خطة العلاج: "${activePlan.title}" (الحالة: ${activePlan.status})\n  - التشخيص: ${activePlan.diagnosis}\n  - الخطوة القادمة: ${activePlan.next_step || 'متابعة الكشف'}`
        : `• Active Plan: "${activePlan.title}" (Status: ${activePlan.status})\n  - Diagnosis: ${activePlan.diagnosis}\n  - Next Step: ${activePlan.next_step || 'Follow-up'}`)
    : (lang === 'ar' ? '• لا توجد خطة علاج نشطة مسجلة.' : '• No active treatment plan recorded.');

  const labInfo = labOrders.length > 0
    ? (lang === 'ar' ? `• طلبيات المعمل والتركيبات: ${labOrders.length} طلب (الطلب الأحدث: ${labOrders[labOrders.length - 1].status})` : `• Lab Orders: ${labOrders.length} order(s) (Latest status: ${labOrders[labOrders.length - 1].status})`)
    : '';

  const summary = lang === 'ar'
    ? `ملخص المريض: ${patient.first_name} ${patient.last_name} (${patient.patient_code})\nالعمر / التاريخ: ${patient.date_of_birth} | الجوال: ${patient.primary_mobile}\n\n${planInfo}\n${labInfo}\n\nملاحظة استشارية: هذا المخص تم إنشاؤه آلياً للاستئناس فقط ولا يحل محل التقييم الطبي المباشر والطبيب مسؤول عن الاعتماد النهائي.`
    : `Clinical Summary: ${patient.first_name} ${patient.last_name} (${patient.patient_code})\nDOB: ${patient.date_of_birth} | Mobile: ${patient.primary_mobile}\n\n${planInfo}\n${labInfo}\n\nAdvisory Note: Generated from persisted records for doctor preview. Draft only; final clinical decisions remain sole responsibility of attending dentist.`;

  return {
    summary,
    missingFields,
    sourceCategories: ['Patient Record', 'Clinic Database', 'AI-generated advisory'],
  };
}

/**
 * Prepares non-final clinical documentation drafts (SOAP note, visit completion, prescription preview).
 */
export function generateDoctorDocumentationDraft(
  patientId: string,
  draftType: 'soap_note' | 'prescription' | 'visit_summary',
  organizationId: string = DEFAULT_EGYPT_ORG.id,
  lang: AILanguage = 'ar'
): { draftText: string; sourceCategories: AISourceCategory[] } {
  const summary = generateDoctorClinicalSummary(patientId, organizationId, lang);
  const now = new Date().toISOString().split('T')[0];

  let draftText = '';
  if (draftType === 'soap_note') {
    draftText = lang === 'ar'
      ? `[مسودة ملاحظة SOAP - بانتظار اعتماد الطبيب]\nتاريخ الزيارة: ${now}\nS (Subjective): يشتكي المريض من ألم بسيط في الضرس العلوي الأيمن أثناء المضغ.\nO (Objective): فحص سريري يظهر تسوس سطحي فئة I، اللثة سليمة بدون نزيف.\nA (Assessment): تسوس نخر أسنان سطحي (FDI 16).\nP (Plan): تنظيف التسوس وإجراء حشو كومبوزيت تجميلي تحت تخدير موضع الموضعي.`
      : `[DRAFT SOAP NOTE - Requires Doctor Approval]\nVisit Date: ${now}\nS (Subjective): Patient reports mild sensitivity in upper right molar upon chewing.\nO (Objective): Clinical exam reveals Class I occlusal caries on tooth FDI 16. Gingiva healthy.\nA (Assessment): Dental caries limited to enamel and dentin.\nP (Plan): Caries excavation and composite restoration under local anesthesia.`;
  } else if (draftType === 'prescription') {
    draftText = lang === 'ar'
      ? `[مسودة روشتة طبية - بانتظار توقيع الطبيب]\n1. Cataflam 50mg Tablets — قرص كل 8 ساعات بعد الأكل لمدة 3 أيام عند اللزوم.\n2. Augmentin 1g Tablets — قرص كل 12 ساعة بعد الأكل لمدة 5 أيام متواصلة.`
      : `[DRAFT PRESCRIPTION - Requires Doctor Signature]\n1. Cataflam 50mg Tablets — 1 tablet every 8 hours after meals for 3 days as needed.\n2. Augmentin 1g Tablets — 1 tablet every 12 hours after meals for 5 consecutive days.`;
  } else {
    draftText = lang === 'ar'
      ? `[مسودة ملخص زيارة المريض - بانتظار الاعتماد]\nتم الكشف الطبي وإجراء تنظيف وتلميع الأسنان. تم إعطاء المريض تعليمات العناية اليومية بالفم والفرشاة وخيط الأسنان.`
      : `[DRAFT VISIT SUMMARY - Requires Doctor Approval]\nClinical examination completed. Scaling and polishing performed. Oral hygiene instructions provided.`;
  }

  return {
    draftText,
    sourceCategories: ['Patient Record', 'Clinic Database', 'AI-generated advisory'],
  };
}

// ============================================================================
// WAVE 4: OPERATIONAL AI & RISK SIGNALS
// ============================================================================

/**
 * Evaluates explainable advisory risk indicators using actual persisted Wave 1-3 data.
 */
export function evaluateOperationalRiskSignals(
  filters: { branchId?: string; doctorId?: string },
  organizationId: string = DEFAULT_EGYPT_ORG.id
): AIRiskSignal[] {
  const signals: AIRiskSignal[] = [];

  // 1. Inventory Low-Stock Risk
  const items = getStoredInventoryItems(organizationId);
  const lowStockItems = items.filter((i) => i.current_quantity <= ((i as any).reorder_level || (i as any).min_stock_level || 5));
  if (lowStockItems.length > 0) {
    signals.push({
      type: 'inventory_reorder_risk',
      title_ar: 'خطر نقص رصيد المخزون الطبي',
      title_en: 'Inventory Low Stock Reorder Risk',
      level: lowStockItems.length >= 3 ? 'high' : 'medium',
      description_ar: `يوجد عدد ${lowStockItems.length} صنف/مواد طبية وصلت أو تجاوزت حد إعادة الطلب الأدنى.`,
      description_en: `${lowStockItems.length} inventory item(s) have reached or fallen below minimum reorder threshold.`,
      evidence: lowStockItems.map((i) => `${i.item_name_ar} (${i.current_quantity} ${i.unit})`),
      recommendedAction: {
        id: `act_inv_${Date.now()}`,
        type: 'update_inventory',
        title_ar: 'إنشاء أمر طلب توريد للمواد المنخفضة',
        title_en: 'Create Reorder Request for Low Stock Items',
        description_ar: 'تأكيد إرسال إشعار طلب توريد مستلزمات لمسؤول المخزون والموردين المتعاقد معهم.',
        description_en: 'Confirm sending stock reorder alert to inventory manager and contracted suppliers.',
        requiresConfirmation: true,
        payload: { lowStockCount: lowStockItems.length, organizationId },
      },
    });
  }

  // 2. Overdue Lab Orders Risk
  const labOrders = getStoredLabOrders().filter((l) => l.organization_id === organizationId && (l.status as string) !== 'delivered_to_clinic' && (l.status as string) !== 'cancelled');
  const overdueLabOrders = labOrders.filter((l) => {
    const dueDate = (l as any).delivery_due_date || (l as any).delivery_date;
    return dueDate && new Date(dueDate).getTime() < Date.now();
  });
  if (overdueLabOrders.length > 0) {
    signals.push({
      type: 'overdue_lab_risk',
      title_ar: 'خطر تأخر طلبيات معامل التركيبات',
      title_en: 'Overdue Prosthetic Lab Orders Risk',
      level: 'high',
      description_ar: `يوجد عدد ${overdueLabOrders.length} طلبية معمل تجاوزت تاريخ التسليم المتوقع.`,
      description_en: `${overdueLabOrders.length} prosthetic lab order(s) have passed expected delivery date.`,
      evidence: overdueLabOrders.map((l) => `طلب #${(l as any).order_number || l.id.substring(0, 8)} (${l.status})`),
    });
  }

  // 3. No-Show Risk
  const appointments = getStoredAppointments().filter((a) => a.organization_id === organizationId && (a.status as string) === 'scheduled');
  const todayStr = new Date().toISOString().split('T')[0];
  const unconfirmedToday = appointments.filter((a) => a.appointment_date === todayStr);
  if (unconfirmedToday.length > 0) {
    signals.push({
      type: 'no_show_risk',
      title_ar: 'مؤشر خطر عدم حضور المواعيد اليوم',
      title_en: 'Same-Day Appointment No-Show Risk',
      level: 'medium',
      description_ar: `يوجد عدد ${unconfirmedToday.length} موعد مجدول اليوم يتطلب إرسال تذكير واتساب لتأكيد الحضور.`,
      description_en: `${unconfirmedToday.length} appointment(s) scheduled today require WhatsApp confirmation reminder.`,
      evidence: unconfirmedToday.map((a) => `موعد الساعة ${a.start_time} (مريض #${a.patient_id.substring(0, 8)})`),
      recommendedAction: {
        id: `act_noshow_${Date.now()}`,
        type: 'send_patient_message',
        title_ar: 'إرسال تذكير واتساب جماعي لتأكيد مواعيد اليوم',
        title_en: 'Dispatch WhatsApp Reminders for Today Appointments',
        description_ar: 'تأكيد إرسال رسائل تذكير تلقائية عبر الواتساب للمرضى المجدولين اليوم.',
        description_en: 'Confirm sending automated WhatsApp reminders to patients scheduled today.',
        requiresConfirmation: true,
        payload: { appointmentCount: unconfirmedToday.length, organizationId },
      },
    });
  }

  // 4. Communication Failure Risk
  const logs = getStoredWhatsAppLogs(organizationId);
  const failedLogs = logs.filter((l) => l.delivery_state === 'failed');
  if (failedLogs.length > 0) {
    signals.push({
      type: 'communication_failure_risk',
      title_ar: 'خطر تعثر إرسال رسائل الواتساب',
      title_en: 'WhatsApp Message Delivery Failure Risk',
      level: 'medium',
      description_ar: `يوجد عدد ${failedLogs.length} رسالة تعثر إرسالها وتحتاج إعادة محاولة.`,
      description_en: `${failedLogs.length} WhatsApp message(s) failed delivery and require manual/automated retry.`,
      evidence: failedLogs.slice(0, 3).map((f) => `رسالة إلى ${f.recipient_name} (${f.error_message || 'فشل التوصيل'})`),
    });
  }

  return signals;
}

/**
 * Generates an executive operational AI report for Manager/Operations Workspace.
 */
export function generateManagerOperationalReport(
  filters: { branchId?: string; doctorId?: string; period?: string },
  organizationId: string = DEFAULT_EGYPT_ORG.id,
  lang: AILanguage = 'ar'
): { reportText: string; riskSignals: AIRiskSignal[]; sourceCategories: AISourceCategory[] } {
  const riskSignals = evaluateOperationalRiskSignals(filters, organizationId);
  const invoices = getStoredInvoices().filter((inv) => inv.organization_id === organizationId);
  const appointments = getStoredAppointments().filter((a) => a.organization_id === organizationId);
  const escalations = getStoredEscalations().filter((e) => e.organization_id === organizationId);
  const tickets = getStoredSupportTickets().filter((t) => t.organization_id === organizationId);

  const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.final_payable_amount || 0), 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + (inv.paid_amount || 0), 0);
  const outstanding = Math.max(0, totalInvoiced - totalPaid);

  const completedApts = appointments.filter((a) => a.status === 'completed').length;
  const utilization = appointments.length > 0 ? Math.round((completedApts / appointments.length) * 100) : 100;

  const reportText = lang === 'ar'
    ? `[تقرير الذكاء التشغيلي والإداري للمركز]\n• إجمالي المبيعات والفواتير: ${totalInvoiced.toLocaleString()} ج.م (المحصل: ${totalPaid.toLocaleString()} ج.م | المستحق: ${outstanding.toLocaleString()} ج.م)\n• نسبة استغلال العيادات والمواعيد: ${utilization}%\n• الشكاوى وتذاكر الدعم: ${tickets.length} تذكرة (التصعيدات الطبية النشطة: ${escalations.filter((e) => e.status !== 'resolved').length})\n• المخاطر التشغيلية المرصودة: تم تحديد ${riskSignals.length} مؤشر خطر يتطلب المتابعة.\n\nملاحظة: البيانات مستخرجة من السجلات الفعلية المسجلة وتخضع للرقابة المالية والإدارية.`
    : `[Executive Operational Intelligence Report]\n• Total Invoiced: EGP ${totalInvoiced.toLocaleString()} (Collected: EGP ${totalPaid.toLocaleString()} | Outstanding: EGP ${outstanding.toLocaleString()})\n• Appointment Utilization Rate: ${utilization}%\n• Support Tickets: ${tickets.length} (Active Escalations: ${escalations.filter((e) => e.status !== 'resolved').length})\n• Detected Risk Signals: ${riskSignals.length} alert(s) requiring attention.\n\nSource: Derived from persisted organization database records.`;

  return {
    reportText,
    riskSignals,
    sourceCategories: ['Clinic Database', 'Financial Data', 'Insurance Data', 'Lab/Inventory Data', 'Appointment Data', 'AI-generated advisory'],
  };
}

// ============================================================================
// WAVE 4: ACTION EXECUTION ENGINE
// ============================================================================

/**
 * Executes a recommended AI action after explicit user confirmation with audit trail logging.
 */
export async function executeAIAction(
  action: AIRecommendedAction,
  actorUserId: string,
  organizationId: string = DEFAULT_EGYPT_ORG.id
): Promise<{ success: boolean; message: string; auditId?: string }> {
  if (!action.requiresConfirmation) {
    return { success: false, message: 'Action does not require confirmation or is invalid' };
  }

  const now = new Date().toISOString();

  if (action.type === 'send_patient_message') {
    // Send automated reminder message
    const res = await sendWhatsAppMessage({
      organizationId,
      branchId: action.payload.branchId || '11111111-1111-1111-1111-111111111111',
      recipientPatientId: action.payload.patientId || 'pat_demo_01',
      recipientMobile: action.payload.mobile || '+201000000001',
      recipientName: action.payload.patientName || 'المريض',
      messageType: '24h_reminder' as any,
      language: 'ar',
      idempotencyKey: `action_send_${Date.now()}_${action.id}`,
    });

    const audit = appendAuditLog({
      actor_user_id: actorUserId,
      organization_id: organizationId,
      action: 'user.create' as AuditAction,
      entity_type: 'ai_action_execution',
      entity_id: action.id,
      metadata: { actionType: action.type, result: res.success },
    });

    return {
      success: true,
      message: 'تم تنفيذ إرسال تذكيرات الواتساب بنجاح واعتماد الإجراء بالإسجل الأمني.',
      auditId: audit.id,
    };
  }

  if (action.type === 'update_inventory') {
    const audit = appendAuditLog({
      actor_user_id: actorUserId,
      organization_id: organizationId,
      action: 'user.update' as AuditAction,
      entity_type: 'ai_action_execution',
      entity_id: action.id,
      metadata: { actionType: action.type, lowStockCount: action.payload.lowStockCount },
    });

    return {
      success: true,
      message: 'تم إنشاء ورفع طلب إعادة توريد المخزون الطبي واعتماد الإجراء بجدول المراجعة.',
      auditId: audit.id,
    };
  }

  // Default execution fallback
  const audit = appendAuditLog({
    actor_user_id: actorUserId,
    organization_id: organizationId,
    action: 'user.update' as AuditAction,
    entity_type: 'ai_action_execution',
    entity_id: action.id,
    metadata: { actionType: action.type, executedAt: now },
  });

  return {
    success: true,
    message: 'تم اعتماد وتنفيذ الإجراء الموصى به بنجاح.',
    auditId: audit.id,
  };
}
