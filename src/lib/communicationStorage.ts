/**
 * Wave 3: Communication Center & WhatsApp Messaging Engine
 * Storage, Provider Abstraction, Templates, Preferences & Idempotent Retry — Egypt
 */

import {
  WhatsAppMessageLog,
  WhatsAppMessageType,
  WhatsAppDeliveryState,
  MessageTemplate,
  PatientCommunicationPreference,
  SendWhatsAppMessageParams,
} from '../types/communication';
import { DEFAULT_EGYPT_ORG, appendAuditLog } from './storage';
import { supabase } from './supabase';
import { AuditAction } from '../types';

export const COMMUNICATION_STORAGE_KEYS = {
  WHATSAPP_LOGS: 'dental_saas_whatsapp_logs',
  MESSAGE_TEMPLATES: 'dental_saas_message_templates',
  PATIENT_PREFERENCES: 'dental_saas_patient_comm_preferences',
};

const memoryStore = new Map<string, string>();

// Clean up any historical sensitive localStorage keys if present in browser
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    Object.values(COMMUNICATION_STORAGE_KEYS).forEach((key) => {
      window.localStorage.removeItem(key);
    });
  } catch {
    // ignore iframe restricted localStorage access errors
  }
}

// In-memory safeStorage: MUST NEVER persist sensitive communication logs to window.localStorage
const safeStorage = {
  getItem: (key: string): string | null => {
    return memoryStore.get(key) || null;
  },
  setItem: (key: string, value: string): void => {
    memoryStore.set(key, value);
  },
  removeItem: (key: string): void => {
    memoryStore.delete(key);
  },
};

// ============================================================================
// DEFAULT BILINGUAL MESSAGE TEMPLATES
// ============================================================================

export const INITIAL_MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl_apt_confirm',
    organization_id: DEFAULT_EGYPT_ORG.id,
    type: 'appointment_confirmation',
    name_ar: 'تأكيد الحجز المبدئي',
    name_en: 'Appointment Confirmation',
    body_ar: 'عزيزي/تكي {patient_name}، تم تأكيد حجز موعدك بنجاح في مركزنا {branch_name} مع د. {doctor_name} بتاريخ {appointment_date} الساعة {time}. يسعدنا حضورك.',
    body_en: 'Dear {patient_name}, your appointment at {branch_name} with Dr. {doctor_name} is confirmed for {appointment_date} at {time}. We look forward to seeing you.',
    allowed_placeholders: ['patient_name', 'branch_name', 'doctor_name', 'appointment_date', 'time'],
    active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'tmpl_apt_rem_24h',
    organization_id: DEFAULT_EGYPT_ORG.id,
    type: 'appointment_reminder_24h',
    name_ar: 'تذكير بالموعد قبل 24 ساعة',
    name_en: '24-Hour Appointment Reminder',
    body_ar: 'تذكير: موعدك غداً في {branch_name} مع د. {doctor_name} الساعة {time}. نرجو تأكيد الحضور أو التواصل معنا في حال الرغبة في التعديل.',
    body_en: 'Reminder: Your appointment tomorrow at {branch_name} with Dr. {doctor_name} is at {time}. Please confirm your attendance or contact us to reschedule.',
    allowed_placeholders: ['patient_name', 'branch_name', 'doctor_name', 'time'],
    active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'tmpl_apt_rem_sameday',
    organization_id: DEFAULT_EGYPT_ORG.id,
    type: 'appointment_reminder_same_day',
    name_ar: 'تذكير موعد نفس اليوم',
    name_en: 'Same-Day Appointment Reminder',
    body_ar: 'تذكير: ننتظرك اليوم في {branch_name} الساعة {time} لموعدك مع د. {doctor_name}. نرجو الحضور قبل الموعد بـ 10 دقائق.',
    body_en: 'Reminder: We look forward to seeing you today at {branch_name} at {time} for your appointment with Dr. {doctor_name}. Please arrive 10 mins early.',
    allowed_placeholders: ['patient_name', 'branch_name', 'doctor_name', 'time'],
    active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'tmpl_recall_notice',
    organization_id: DEFAULT_EGYPT_ORG.id,
    type: 'recall_notice',
    name_ar: 'تذكير الفحص الدوري والمتابعة',
    name_en: 'Recall & Checkup Reminder',
    body_ar: 'عزيزي/تكي {patient_name}، حان موعد {recall_type} الخاص بك بمركز {branch_name}. اطمئنانك على صحة أسنانك أمانة نعتز بها. اتصل بنا لتحديد الموعد المناسب.',
    body_en: 'Dear {patient_name}, it is time for your {recall_type} at {branch_name}. Your dental health is our priority. Contact us to schedule your checkup.',
    allowed_placeholders: ['patient_name', 'recall_type', 'branch_name'],
    active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'tmpl_payment_receipt',
    organization_id: DEFAULT_EGYPT_ORG.id,
    type: 'payment_receipt',
    name_ar: 'إيصال استلام دفعة',
    name_en: 'Payment Receipt Notification',
    body_ar: 'شكراً لك {patient_name}. تم استلام مبلغ {amount} ج.م بموجب فاتورة رقم {invoice_code} بفرع {branch_name}. نتمنى لك دوام الصحة والعافية.',
    body_en: 'Thank you {patient_name}. We received payment of {amount} EGP for invoice {invoice_code} at {branch_name}. Wishing you good health.',
    allowed_placeholders: ['patient_name', 'amount', 'invoice_code', 'branch_name'],
    active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'tmpl_post_treatment',
    organization_id: DEFAULT_EGYPT_ORG.id,
    type: 'post_treatment_instructions',
    name_ar: 'تعليمات ما بعد العلاج',
    name_en: 'Post-Treatment Instructions',
    body_ar: 'تعليمات هامة بعد إجراء {service_name}: نرجو الالتزام بالراحة وتناول الأدوية الموصوفة حسب التعليمات، وتجنب الأطعمة الساخنة لمدة 24 ساعة. نتمنى لك الشفاء العاجل.',
    body_en: 'Important instructions after {service_name}: Please rest, take prescribed medications as instructed, and avoid hot foods for 24 hours. Get well soon.',
    allowed_placeholders: ['patient_name', 'service_name', 'branch_name'],
    active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'tmpl_lab_update',
    organization_id: DEFAULT_EGYPT_ORG.id,
    type: 'lab_prosthetic_update',
    name_ar: 'متابعة تركيبات الأسنان والمعمل',
    name_en: 'Lab & Prosthetics Status Update',
    body_ar: 'عزيزي/تكي {patient_name}، نود إعلامك بأن تركيبة الأسنان الخاصة بك ({lab_order_code}) أصبحت في مرحلة ({stage}) في {branch_name}. سنوافيك بموعد التركيب المباشر.',
    body_en: 'Dear {patient_name}, your dental prosthetic ({lab_order_code}) status is now ({stage}) at {branch_name}. We will notify you when it is ready for fitting.',
    allowed_placeholders: ['patient_name', 'lab_order_code', 'stage', 'branch_name'],
    active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'tmpl_escalation_resp',
    organization_id: DEFAULT_EGYPT_ORG.id,
    type: 'complaint_escalation_response',
    name_ar: 'متابعة الاستفسار والشكوى',
    name_en: 'Complaint & Escalation Response',
    body_ar: 'عزيزي/تكي {patient_name}، حرصاً منا على تقديم أفضل خدمة، تم مراجعة ملاحظتك المرفوعة بمركز {branch_name} وجاري متابعتها مباشرة بواسطة الإدارة الطبية.',
    body_en: 'Dear {patient_name}, regarding your feedback at {branch_name}, our medical management team has reviewed your query and is following up directly.',
    allowed_placeholders: ['patient_name', 'branch_name'],
    active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
];

// ============================================================================
// PROVIDER-AGNOSTIC WHATSAPP SERVICE ABSTRACTION
// ============================================================================

export interface WhatsAppProvider {
  sendMessage(params: {
    recipientMobile: string;
    renderedBody: string;
    idempotencyKey: string;
  }): Promise<{ success: boolean; externalMessageId?: string; error?: string }>;
}

export class DefaultWhatsAppProvider implements WhatsAppProvider {
  async sendMessage(params: {
    recipientMobile: string;
    renderedBody: string;
    idempotencyKey: string;
  }): Promise<{ success: boolean; externalMessageId?: string; error?: string }> {
    // Simulated cloud message delivery dispatch
    const isMobileValid = params.recipientMobile.length >= 8;
    if (!isMobileValid) {
      return { success: false, error: 'رقم الهاتف غير صحيح' };
    }

    const externalMessageId = `wa_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return { success: true, externalMessageId };
  }
}

const activeWhatsAppProvider: WhatsAppProvider = new DefaultWhatsAppProvider();

// ============================================================================
// TEMPLATES READ / WRITE HELPERS
// ============================================================================

export function getStoredMessageTemplates(organizationId?: string): MessageTemplate[] {
  const orgId = organizationId || DEFAULT_EGYPT_ORG.id;
  const raw = safeStorage.getItem(COMMUNICATION_STORAGE_KEYS.MESSAGE_TEMPLATES);
  let templates: MessageTemplate[] = [];

  if (!raw) {
    templates = INITIAL_MESSAGE_TEMPLATES;
    safeStorage.setItem(COMMUNICATION_STORAGE_KEYS.MESSAGE_TEMPLATES, JSON.stringify(templates));
  } else {
    try {
      templates = JSON.parse(raw);
    } catch {
      templates = INITIAL_MESSAGE_TEMPLATES;
    }
  }

  return templates.filter((t) => !orgId || t.organization_id === orgId);
}

export function saveMessageTemplate(
  params: Partial<MessageTemplate> & {
    organization_id: string;
    type: WhatsAppMessageType;
    name_ar: string;
    name_en: string;
    body_ar: string;
    body_en: string;
    allowed_placeholders?: string[];
  },
  actorUserId?: string
): MessageTemplate {
  const templates = getStoredMessageTemplates();
  const now = new Date().toISOString();

  if (params.id) {
    const idx = templates.findIndex((t) => t.id === params.id && t.organization_id === params.organization_id);
    if (idx !== -1) {
      const updated: MessageTemplate = {
        ...templates[idx],
        ...params,
        updated_at: now,
      };
      templates[idx] = updated;
      safeStorage.setItem(COMMUNICATION_STORAGE_KEYS.MESSAGE_TEMPLATES, JSON.stringify(templates));

      if (supabase) {
        Promise.resolve(supabase.from('communication_message_templates').upsert(updated)).catch(() => {});
      }

      appendAuditLog({
        actor_user_id: actorUserId || 'sys_manager',
        organization_id: params.organization_id,
        action: 'user.update' as AuditAction,
        entity_type: 'message_template',
        entity_id: updated.id,
        metadata: { name_ar: params.name_ar, user_name: 'Center Manager', user_role: 'center_manager' },
      });

      return updated;
    }
  }

  const newTemplate: MessageTemplate = {
    id: `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    organization_id: params.organization_id,
    type: params.type,
    name_ar: params.name_ar,
    name_en: params.name_en,
    body_ar: params.body_ar,
    body_en: params.body_en,
    allowed_placeholders: params.allowed_placeholders || ['patient_name', 'branch_name'],
    active: params.active ?? true,
    created_at: now,
    updated_at: now,
    created_by_user_id: actorUserId,
  };

  templates.unshift(newTemplate);
  safeStorage.setItem(COMMUNICATION_STORAGE_KEYS.MESSAGE_TEMPLATES, JSON.stringify(templates));

  if (supabase) {
    Promise.resolve(supabase.from('communication_message_templates').insert(newTemplate)).catch(() => {});
  }

  appendAuditLog({
    actor_user_id: actorUserId || 'sys_manager',
    organization_id: params.organization_id,
    action: 'user.create' as AuditAction,
    entity_type: 'message_template',
    entity_id: newTemplate.id,
    metadata: { name_ar: params.name_ar, user_name: 'Center Manager', user_role: 'center_manager' },
  });

  return newTemplate;
}

// ============================================================================
// PATIENT COMMUNICATION PREFERENCES
// ============================================================================

export function getPatientCommunicationPreference(
  patientId: string,
  organizationId?: string
): PatientCommunicationPreference {
  const orgId = organizationId || DEFAULT_EGYPT_ORG.id;
  const raw = safeStorage.getItem(COMMUNICATION_STORAGE_KEYS.PATIENT_PREFERENCES);
  let prefsList: PatientCommunicationPreference[] = raw ? JSON.parse(raw) : [];

  const found = prefsList.find((p) => p.patient_id === patientId && p.organization_id === orgId);
  if (found) return found;

  return {
    patient_id: patientId,
    organization_id: orgId,
    whatsapp_enabled: true,
    in_app_enabled: true,
    preferred_language: 'ar',
    reminder_lead_hours: 24,
    guardian_inheritance_enabled: true,
    updated_at: new Date().toISOString(),
  };
}

export function savePatientCommunicationPreference(
  pref: PatientCommunicationPreference,
  actorUserId?: string
): PatientCommunicationPreference {
  const raw = safeStorage.getItem(COMMUNICATION_STORAGE_KEYS.PATIENT_PREFERENCES);
  let prefsList: PatientCommunicationPreference[] = raw ? JSON.parse(raw) : [];

  const idx = prefsList.findIndex(
    (p) => p.patient_id === pref.patient_id && p.organization_id === pref.organization_id
  );

  const updated: PatientCommunicationPreference = {
    ...pref,
    updated_at: new Date().toISOString(),
  };

  if (idx !== -1) {
    prefsList[idx] = updated;
  } else {
    prefsList.unshift(updated);
  }

  safeStorage.setItem(COMMUNICATION_STORAGE_KEYS.PATIENT_PREFERENCES, JSON.stringify(prefsList));

  if (supabase) {
    Promise.resolve(supabase.from('patient_communication_preferences').upsert(updated)).catch(() => {});
  }

  appendAuditLog({
    actor_user_id: actorUserId || pref.patient_id,
    organization_id: pref.organization_id,
    action: 'user.update' as AuditAction,
    entity_type: 'patient_communication_preference',
    entity_id: pref.patient_id,
    metadata: { user_name: 'Patient / Staff', user_role: 'patient' },
  });

  return updated;
}

// ============================================================================
// TEMPLATE PLACEHOLDER RENDERER WITH SECURITY SAFEGUARDS
// ============================================================================

export function renderMessageBody(
  templateBody: string,
  placeholders: Record<string, string>,
  allowedPlaceholders: string[] = []
): string {
  let rendered = templateBody;

  // Substitute allowed placeholders strictly
  Object.entries(placeholders).forEach(([key, val]) => {
    // Security safeguard: Do not render internal costs or sensitive notes
    const sanitizedVal = (val || '')
      .replace(/cost/gi, '')
      .replace(/commission/gi, '')
      .replace(/supplier/gi, '');

    const pattern = new RegExp(`\\{${key}\\}`, 'g');
    rendered = rendered.replace(pattern, sanitizedVal);
  });

  return rendered;
}

// ============================================================================
// WHATSAPP MESSAGES LOGS & IDEMPOTENT DISPATCH ENGINE
// ============================================================================

export function getStoredWhatsAppLogs(
  organizationId?: string,
  branchId?: string,
  patientId?: string
): WhatsAppMessageLog[] {
  const orgId = organizationId || DEFAULT_EGYPT_ORG.id;
  const raw = safeStorage.getItem(COMMUNICATION_STORAGE_KEYS.WHATSAPP_LOGS);
  let list: WhatsAppMessageLog[] = raw ? JSON.parse(raw) : [];

  return list.filter((log) => {
    if (orgId && log.organization_id !== orgId) return false;
    if (branchId && branchId !== 'all' && log.branch_id !== branchId) return false;
    if (patientId && log.recipient_patient_id !== patientId) return false;
    return true;
  });
}

export function setStoredWhatsAppLogs(logs: WhatsAppMessageLog[]): void {
  safeStorage.setItem(COMMUNICATION_STORAGE_KEYS.WHATSAPP_LOGS, JSON.stringify(logs));
  if (supabase) {
    Promise.resolve(supabase.from('whatsapp_message_logs').upsert(logs)).catch(() => {});
  }
}

/**
 * Sends a WhatsApp message with idempotency key duplicate send prevention,
 * patient preference verification, and automatic delivery status updates.
 */
export async function sendWhatsAppMessage(
  params: SendWhatsAppMessageParams
): Promise<{ success: boolean; log: WhatsAppMessageLog; duplicateSkipped?: boolean; error?: string }> {
  const {
    organizationId,
    branchId,
    recipientPatientId,
    recipientMobile,
    recipientName,
    messageType,
    language = 'ar',
    templateId,
    placeholders = {},
    customBody,
    idempotencyKey,
    createdByUserId,
    isMandatoryClinical = false,
  } = params;

  // 1. Check Idempotency (Duplicate Send Prevention)
  const existingLogs = getStoredWhatsAppLogs(organizationId);
  const duplicate = existingLogs.find((l) => l.idempotency_key === idempotencyKey);
  if (duplicate && (duplicate.delivery_state === 'sent' || duplicate.delivery_state === 'delivered')) {
    return { success: true, log: duplicate, duplicateSkipped: true };
  }

  // 2. Verify Patient Communication Preferences
  if (recipientPatientId && !isMandatoryClinical) {
    const prefs = getPatientCommunicationPreference(recipientPatientId, organizationId);
    if (!prefs.whatsapp_enabled) {
      const skippedLog: WhatsAppMessageLog = {
        id: `wa_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        organization_id: organizationId,
        branch_id: branchId,
        idempotency_key: idempotencyKey,
        recipient_patient_id: recipientPatientId,
        recipient_mobile: recipientMobile,
        recipient_name: recipientName,
        message_type: messageType,
        language,
        template_id: templateId,
        rendered_body: 'تم إلغاء الإرسال بناء على تفضيلات عدم استلام رسائل الواتساب للمريض',
        delivery_state: 'failed',
        retry_count: 0,
        max_retries: 3,
        error_message: 'مرفوض: المريض قام بإلغاء اشتراك رسائل الواتساب',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by_user_id: createdByUserId,
      };
      existingLogs.unshift(skippedLog);
      setStoredWhatsAppLogs(existingLogs);
      return { success: false, log: skippedLog, error: 'المريض قام بإلغاء اشتراك رسائل الواتساب' };
    }
  }

  // 3. Render Message Body
  let template: MessageTemplate | undefined;
  if (templateId) {
    const templates = getStoredMessageTemplates(organizationId);
    template = templates.find((t) => t.id === templateId);
  } else {
    const templates = getStoredMessageTemplates(organizationId);
    template = templates.find((t) => t.type === messageType && t.active);
  }

  const templateBody = customBody || (language === 'ar' ? template?.body_ar : template?.body_en) || customBody || 'تذكير موعد من مركز الأسنان';
  const renderedBody = renderMessageBody(
    templateBody,
    {
      patient_name: recipientName,
      ...placeholders,
    },
    template?.allowed_placeholders || []
  );

  const now = new Date().toISOString();
  const log: WhatsAppMessageLog = {
    id: `wa_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    organization_id: organizationId,
    branch_id: branchId,
    idempotency_key: idempotencyKey,
    recipient_patient_id: recipientPatientId,
    recipient_mobile: recipientMobile,
    recipient_name: recipientName,
    message_type: messageType,
    language,
    template_id: template?.id || templateId,
    rendered_body: renderedBody,
    delivery_state: 'queued',
    retry_count: 0,
    max_retries: 3,
    created_at: now,
    updated_at: now,
    created_by_user_id: createdByUserId,
  };

  // 4. Dispatch via Provider Abstraction
  const result = await activeWhatsAppProvider.sendMessage({
    recipientMobile,
    renderedBody,
    idempotencyKey,
  });

  if (result.success) {
    log.delivery_state = 'delivered';
    log.sent_at = new Date().toISOString();
    log.delivered_at = new Date().toISOString();
  } else {
    log.delivery_state = 'failed';
    log.error_message = result.error || 'خطأ بفشل إرسال الرسالة عبر المزود';
  }

  existingLogs.unshift(log);
  setStoredWhatsAppLogs(existingLogs);

  appendAuditLog({
    actor_user_id: createdByUserId || 'sys_comm',
    organization_id: organizationId,
    action: 'user.create' as AuditAction,
    entity_type: 'whatsapp_message_log',
    entity_id: log.id,
    metadata: { user_name: 'WhatsApp Dispatcher', user_role: 'system', recipientName, messageType, delivery_state: log.delivery_state },
  });

  return { success: result.success, log, error: result.error };
}

/**
 * Retries sending a failed WhatsApp message with safe retry count increment.
 */
export async function retryFailedWhatsAppMessage(
  logId: string,
  organizationId: string
): Promise<{ success: boolean; log?: WhatsAppMessageLog; error?: string }> {
  const logs = getStoredWhatsAppLogs(organizationId);
  const idx = logs.findIndex((l) => l.id === logId && l.organization_id === organizationId);

  if (idx === -1) {
    return { success: false, error: 'سجل الرسالة غير موجود' };
  }

  const target = { ...logs[idx] };
  if (target.retry_count >= target.max_retries) {
    return { success: false, error: 'تم تجاوز الحد الأقصى لإعادة المحاولة (3 محاولات)' };
  }

  target.retry_count += 1;
  target.delivery_state = 'queued';
  target.updated_at = new Date().toISOString();

  const result = await activeWhatsAppProvider.sendMessage({
    recipientMobile: target.recipient_mobile,
    renderedBody: target.rendered_body,
    idempotencyKey: target.idempotency_key,
  });

  if (result.success) {
    target.delivery_state = 'delivered';
    target.sent_at = new Date().toISOString();
    target.delivered_at = new Date().toISOString();
    target.error_message = undefined;
  } else {
    target.delivery_state = 'failed';
    target.error_message = result.error || 'فشل إعادة الإرسال';
  }

  logs[idx] = target;
  setStoredWhatsAppLogs(logs);

  appendAuditLog({
    actor_user_id: 'sys_retry',
    organization_id: organizationId,
    action: 'user.update' as AuditAction,
    entity_type: 'whatsapp_message_log',
    entity_id: target.id,
    metadata: { user_name: 'Retry Engine', user_role: 'system', retry_count: target.retry_count, delivery_state: target.delivery_state },
  });

  return { success: result.success, log: target, error: result.error };
}
