/**
 * Phase 10.1: Centralized AI Router
 * Dental Clinic & Dental Center Management Platform — Egypt
 *
 * Route Flow:
 * 1. Validate Organization / Branch / Patient Context server-side.
 * 2. Database-First: Query Clinic Database & FAQ Knowledge Base.
 * 3. If local answer exists -> Return immediately WITHOUT calling Gemini.
 * 4. If no local answer -> Call Gemini Provider (with primary/fallback key switching).
 * 5. Medical Safety Guardrails & Doctor Escalation handling.
 */

import { AIQueryOptions, AIResponse, AILanguage } from './types';
import { queryClinicDatabase, detectLanguage } from './clinicKnowledgeBase';
import { generateGeminiResponse } from './geminiProvider';
import { DEFAULT_EGYPT_ORG } from '../storage';
import { createNotification } from '../notificationStorage';

/**
 * Keywords indicating medical urgency requiring human doctor escalation
 */
const MEDICAL_ESCALATION_KEYWORDS_AR = [
  'ألم شديد',
  'نزيف',
  'ورم',
  'انتفاخ',
  'كسر سن',
  'خلع طارئ',
  'طوارئ',
  'روشتة',
  'تشخيص',
  'دواء مسكن',
  'مضاد حيوي',
];

const MEDICAL_ESCALATION_KEYWORDS_EN = [
  'severe pain',
  'bleeding',
  'swelling',
  'broken tooth',
  'emergency',
  'prescription',
  'diagnosis',
  'antibiotic',
  'painkiller',
];

/**
 * Checks if a prompt requires medical escalation to a human doctor.
 */
export function checkMedicalEscalation(prompt: string, lang: AILanguage): boolean {
  const normalized = prompt.toLowerCase();
  const keywords = lang === 'ar' ? MEDICAL_ESCALATION_KEYWORDS_AR : MEDICAL_ESCALATION_KEYWORDS_EN;
  return keywords.some((kw) => normalized.includes(kw.toLowerCase()));
}

/**
 * Centralized AI Router Function
 */
export async function routeAIQuery(options: AIQueryOptions): Promise<AIResponse> {
  const { prompt, context, skipDatabaseCheck, mockGeminiCall } = options;
  const lang = detectLanguage(prompt);
  const isEscalation = checkMedicalEscalation(prompt, lang);

  // Validate Organization context server-side (default to primary Egyptian org if valid)
  const validatedOrgId = context?.organizationId || DEFAULT_EGYPT_ORG.id;

  // Escalate medical symptom query to reception notifications if patientId is known
  if (isEscalation && context?.patientId) {
    try {
      createNotification({
        organization_id: validatedOrgId,
        branch_id: context.branchId || null,
        recipient_type: 'staff',
        target_role: 'receptionist',
        type: 'reception_task',
        title_ar: 'تنبيه تصعيد طبي عاجل من المحادثة الذكية',
        title_en: 'Urgent Medical Escalation Alert from AI Chat',
        message_ar: `استفسار مريض يحوي أعراضاً طبية عاجلة: "${prompt.substring(0, 100)}"`,
        message_en: `Patient query contains urgent medical symptoms: "${prompt.substring(0, 100)}"`,
        related_entity_type: 'patient',
        related_entity_id: context.patientId,
      });
    } catch {
      // Ignore notification storage error
    }
  }

  // 1. Database-First Routing (Skip if explicitly requested for Gemini testing)
  if (!skipDatabaseCheck) {
    const dbMatch = queryClinicDatabase(prompt, {
      ...context,
      organizationId: validatedOrgId,
    });

    if (dbMatch.found && dbMatch.text) {
      let resultText = dbMatch.text;

      // Append medical escalation advisory if urgent medical symptoms detected
      if (isEscalation) {
        resultText += lang === 'ar'
          ? '\n\nملاحظة هامة: نظراً لوجود أعراض طبية، ننصحك بحجز موعد عاجل مع الطبيب المختص أو زيارة العيادة فوراً.'
          : '\n\nImportant Note: Due to medical symptoms, we strongly recommend booking an urgent appointment with a doctor or visiting the clinic immediately.';
      }

      return {
        text: resultText,
        source: 'database',
        keyUsed: 'none',
        isMedicalEscalation: isEscalation,
        language: dbMatch.language || lang,
        category: dbMatch.category,
        metadata: dbMatch.metadata,
      };
    }
  }

  // 2. Fallback to Gemini AI Provider
  const geminiResult = await generateGeminiResponse(prompt, {
    mockRunner: mockGeminiCall,
  });

  if (geminiResult.text) {
    let resultText = geminiResult.text;

    if (isEscalation) {
      resultText += lang === 'ar'
        ? '\n\nتنبيه طبي: هذه المعلومات لإرشادات العامة فقط ولا تغني عن الاستشارة الطبية المباشرة. يرجى مراجعة الطبيب للحصول على التشخيص والعلاج المناسب.'
        : '\n\nMedical Advisory: This information is for general guidance only and does not substitute for a professional diagnosis. Please consult a doctor for proper examination.';
    }

    const source = geminiResult.keyUsed === 'primary' ? 'gemini_primary' : 'gemini_fallback';

    return {
      text: resultText,
      source,
      keyUsed: geminiResult.keyUsed,
      isMedicalEscalation: isEscalation,
      language: lang,
    };
  }

  // 3. Service Fallback Response if Gemini is unconfigured or failed
  const fallbackMsg = lang === 'ar'
    ? 'أهلاً بك! نحن عيادة أسنان متخصصة في مصر. يمكنك الاستفسار عن مواعيد العمل، الفروع، الخدمات والأسعار، شركات التأمين، أو حجز موعد عبر بوابتك.'
    : 'Welcome! We are a specialized dental clinic in Egypt. You can ask about our working hours, branches, services, pricing, insurance plans, or book an appointment.';

  return {
    text: fallbackMsg,
    source: 'fallback_system',
    keyUsed: 'none',
    isMedicalEscalation: isEscalation,
    language: lang,
    error: geminiResult.error,
  };
}
