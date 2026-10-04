/**
 * Wave 4: Doctor AI Workspace & Clinical Intelligence Assistant
 * Dental Clinic & Dental Center Management Platform — Egypt
 *
 * Operational & Clinical Assistant for authorized Dentists & Specialists.
 * Provides clinical timeline summaries, treatment progress tracking,
 * missing documentation audits, non-final documentation drafts,
 * and actionable recommendation proposals requiring explicit doctor approval.
 */

import {
  getStoredTreatmentPlans,
  getStoredPrescriptions,
  getStoredConsentRequests,
  getStoredFollowUpPlans,
  getStoredLabOrders,
  getStoredMedicalAlerts,
} from '../clinicalStorage';
import { getStoredPatients } from '../patientStorage';
import { AIActionProposal, AISourceCategory } from './types';

export interface DoctorClinicalSummary {
  patientId: string;
  patientName: string;
  patientCode: string;
  medicalAlerts: string[];
  diagnosisSummary: string;
  activeTreatmentTitle: string;
  completedPhasesCount: number;
  totalPhasesCount: number;
  nextStepRecommendation: string;
  prescriptionsCount: number;
  labOrdersCount: number;
  missingDocumentation: string[];
  proposedActions: AIActionProposal[];
  summaryTextAr: string;
  summaryTextEn: string;
  sourceCategory: AISourceCategory;
}

/**
  * Summarizes an authorized patient's clinical timeline and identifies missing documentation fields.
  */
export function summarizePatientClinicalTimeline(
  patientId: string,
  organizationId: string,
  doctorId?: string
): DoctorClinicalSummary | { error: string } {
  const patient = getStoredPatients().find(
    (p) => p.id === patientId && p.organization_id === organizationId
  );

  if (!patient) {
    return { error: 'المريض غير موجود أو غير مصرح بالوصول إليه (Patient file not found or unauthorized)' };
  }

  // 1. Fetch Medical Alerts & Systemic Flags
  const alerts = getStoredMedicalAlerts().filter((a) => a.patient_id === patientId && a.active);
  const alertNames = alerts.map((a) => a.title || a.description);

  // 2. Fetch Treatment Plans
  const plans = getStoredTreatmentPlans().filter(
    (tp) => tp.patient_id === patientId && tp.organization_id === organizationId
  );
  const activePlan = plans[0];

  // 3. Fetch Prescriptions
  const prescriptions = getStoredPrescriptions().filter((rx) => rx.patient_id === patientId);

  // 4. Fetch Lab Orders
  const labOrders = getStoredLabOrders().filter(
    (lo) => lo.patient_id === patientId && lo.organization_id === organizationId
  );

  // 5. Fetch Consents
  const consents = getStoredConsentRequests().filter((c) => c.patient_id === patientId);

  // 6. Audit Missing Documentation
  const missingDocumentation: string[] = [];

  if (!patient.national_id) {
    missingDocumentation.push('الرقم القومي غير مكتمل (Missing National ID)');
  }
  if (!patient.medical_notes || patient.medical_notes.trim().length === 0) {
    missingDocumentation.push('لا توجد ملاحظات تاريخ طبي مسجلة (No Medical History Notes)');
  }
  if (activePlan) {
    const missingConsent = consents.find((c) => c.status === 'requested' || c.status === 'pending_signature');
    if (missingConsent) {
      missingDocumentation.push(`موافقة مستنيرة معلقة: ${missingConsent.title || missingConsent.consent_type} (Pending Digital Consent)`);
    }
  } else {
    missingDocumentation.push('لا توجد خطة علاجية نشطة مسجلة (No Active Treatment Plan)');
  }

  // 7. Formulate AI Action Proposals requiring Doctor Approval
  const proposedActions: AIActionProposal[] = [];

  // Suggest post-op follow-up if active treatment exists but no follow-up scheduled
  const followUps = getStoredFollowUpPlans().filter((f) => f.patient_id === patientId);
  if (followUps.length === 0 && activePlan) {
    proposedActions.push({
      id: `act_${Date.now()}_1`,
      actionType: 'schedule_followup',
      titleAr: 'اقتراح جدولة زيارة متابعة وطمأنة للمريض',
      titleEn: 'Propose Scheduling Clinical Follow-up Visit',
      descriptionAr: 'جدولة متابعة بعد الكشف بعد 7 أيام للاطمئنان على استقرار الحالة',
      descriptionEn: 'Schedule a 7-day post-treatment follow-up recall to check clinical progress',
      targetEntity: 'patient',
      targetId: patientId,
      parameters: {
        patientId,
        recallType: 'post_operative',
        daysAhead: 7,
      },
      sourceAttribution: 'Patient Record',
      requiresApproval: true,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  }

  const completedPhases = activePlan?.status === 'completed' ? 1 : 0;
  const totalPhases = activePlan ? 1 : 0;

  const alertsTextAr = alertNames.length > 0 ? alertNames.join('، ') : 'لا توجد تحذيرات طبية حرجة';
  const alertsTextEn = alertNames.length > 0 ? alertNames.join(', ') : 'No critical medical alerts';

  const summaryTextAr = `[المصدر: سجل المريض - Patient Record]
ملخص الحالة السريرية للمريض: ${patient.first_name} ${patient.last_name} (${patient.patient_code})
• التحذيرات الطبية: ${alertsTextAr}
• خطة العلاج النشطة: ${activePlan ? activePlan.title : 'لا توجد خطة نشطة'} (الحالة: ${activePlan ? activePlan.status : 'N/A'})
• نسبة إنجاز المراحل: ${completedPhases} من أصل ${totalPhases} مراحل مكتملة.
• الروشتات الصادرة: ${prescriptions.length} روشتة.
• طلبات المعمل والتركيبات: ${labOrders.length} طلبات.
• حقول التوثيق النواقص: ${missingDocumentation.length > 0 ? missingDocumentation.join(' | ') : 'التوثيق مكتمل بالكامل'}.`;

  const summaryTextEn = `[Source: Patient Record]
Clinical Timeline Summary for Patient: ${patient.first_name} ${patient.last_name} (${patient.patient_code})
• Medical Alerts: ${alertsTextEn}
• Active Treatment Plan: ${activePlan ? activePlan.title : 'None'} (Status: ${activePlan ? activePlan.status : 'N/A'})
• Phase Progress: ${completedPhases} of ${totalPhases} completed.
• Issued Prescriptions: ${prescriptions.length}.
• Dental Lab Orders: ${labOrders.length}.
• Missing Documentation: ${missingDocumentation.length > 0 ? missingDocumentation.join(' | ') : 'Documentation fully complete'}.`;

  return {
    patientId,
    patientName: `${patient.first_name} ${patient.last_name}`,
    patientCode: patient.patient_code,
    medicalAlerts: alertNames,
    diagnosisSummary: activePlan?.diagnosis || 'لا يوجد تشخيص مسجل',
    activeTreatmentTitle: activePlan?.title || 'لا توجد خطة علاج نشطة',
    completedPhasesCount: completedPhases,
    totalPhasesCount: totalPhases,
    nextStepRecommendation: activePlan?.next_step || 'متابعة الكشف الدوري',
    prescriptionsCount: prescriptions.length,
    labOrdersCount: labOrders.length,
    missingDocumentation,
    proposedActions,
    summaryTextAr,
    summaryTextEn,
    sourceCategory: 'Patient Record',
  };
}

/**
 * Prepares a non-final clinical documentation draft for doctor review.
 * AI output is advisory/draft ONLY.
 */
export function prepareClinicalDraft(
  draftType: 'soap_note' | 'referral' | 'recall_recommendation',
  patientId: string,
  organizationId: string,
  params?: { chiefComplaint?: string; clinicalFindings?: string; targetSpecialty?: string }
): { isDraft: true; titleAr: string; titleEn: string; contentAr: string; contentEn: string; sourceCategory: AISourceCategory } {
  const patient = getStoredPatients().find((p) => p.id === patientId && p.organization_id === organizationId);
  const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'المريض';

  if (draftType === 'soap_note') {
    return {
      isDraft: true,
      titleAr: 'مسودة ملاحظات الكشف الطبي (SOAP Draft)',
      titleEn: 'Draft SOAP Clinical Note',
      contentAr: `[مسودة استرشادية - تتطلب اعتماد الطبيب]
• الشكوى الرئيسية (S): ${params?.chiefComplaint || 'يعاني المريض من ألم خفيف بالجهة اليمنى مع المشروبات الباردة.'}
• الفحص السريري (O): نخر سطحي في السن #46، الأنسجة المحيطة سليمة، استجابة حساسة برودة.
• التقييم الطبي (A): تسوس أسنان حاد بالسن #46 (K02.1).
• الخطة العلاجية (P): تنظيف التسوس وإجراء حشوة ضوئية كومبوزيت ملونة للسن #46.`,
      contentEn: `[Advisory Draft - Requires Doctor Approval]
• Subjective (S): ${params?.chiefComplaint || 'Patient complains of mild sensitivity on lower right quadrant with cold drinks.'}
• Objective (O): Superficial caries on tooth #46, surrounding tissues normal, positive thermal sensitivity.
• Assessment (A): Dental caries #46 (ICD-10 K02.1).
• Plan (P): Caries excavation and light-cured composite restoration #46.`,
      sourceCategory: 'Patient Record',
    };
  }

  if (draftType === 'referral') {
    return {
      isDraft: true,
      titleAr: 'مسودة تحويل لمستشار جراحة الفم والفكين',
      titleEn: 'Draft Specialist Referral Request',
      contentAr: `[مسودة استرشادية - تتطلب اعتماد الطبيب]
تحويل المريض: ${patientName}
التخصص المطلوب: ${params?.targetSpecialty || 'جراحة الفم والفكين (Oral Surgery)'}
سبب التحويل: تقييم وضرس العقل السفلي الأيمن المطمور حديثاً مع ألم متكرر باللثة المحيطة.`,
      contentEn: `[Advisory Draft - Requires Doctor Approval]
Patient Referral: ${patientName}
Specialty Target: ${params?.targetSpecialty || 'Oral & Maxillofacial Surgery'}
Reason for Referral: Evaluation of impacted lower right third molar (#48) with recurrent pericoronitis.`,
      sourceCategory: 'Patient Record',
    };
  }

  return {
    isDraft: true,
    titleAr: 'مسودة توصية متابعة وتذكير',
    titleEn: 'Draft Follow-up & Recall Recommendation',
    contentAr: `[مسودة استرشادية - تتطلب اعتماد الطبيب]
توصية متابعة للمريض: ${patientName}
النوع: متابعة معالجة جذور ورعاية اللثة
الموعد المقترح: بعد 14 يوماً من إنهاء الجلسة الحالية.`,
    contentEn: `[Advisory Draft - Requires Doctor Approval]
Follow-up Recommendation for Patient: ${patientName}
Type: Endodontic checkup & periodontal maintenance.
Suggested Date: 14 days post-treatment.`,
    sourceCategory: 'Patient Record',
  };
}
