/**
 * Phase 10.3: Human Escalation & Staff Reply Storage & Workflow Engine
 * Dental Clinic & Dental Center Management Platform — Egypt
 */

import {
  HumanEscalation,
  EscalationReply,
  CreateEscalationParams,
  ReplyEscalationParams,
  EscalationStatus,
  EscalationCategory,
  EscalationPriority,
} from '../types/escalation';
import { Profile, RoleKey, Patient } from '../types';
import { DEFAULT_EGYPT_ORG } from './storage';
import { createNotification, StaffUserContext, PatientUserContext } from './notificationStorage';
import { getStoredPatients, simulatePatientRLS } from './patientStorage';
import { supabase } from './supabase';

export const ESCALATIONS_STORAGE_KEY = 'dental_saas_human_escalations';
export const ESCALATION_REPLIES_STORAGE_KEY = 'dental_saas_escalation_replies';

// Memory fallbacks
const memoryEscalations = new Map<string, string>();
const memoryReplies = new Map<string, string>();

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // fallback
    }
    return (key === ESCALATIONS_STORAGE_KEY ? memoryEscalations : memoryReplies).get(key) || null;
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
    (key === ESCALATIONS_STORAGE_KEY ? memoryEscalations : memoryReplies).set(key, value);
  },
};

export const MEDICAL_SAFETY_DISCLAIMER =
  'تنبيه طبي: هذه المحادثة للتواصل والتوثيق ولا تحوي أي روشتة طبية إلكترونية أو تشخيص نهائي بديل عن الفحص الكلينيكي المباشر بالعيادة.';

export const MEDICAL_SAFETY_DISCLAIMER_EN =
  'Medical Advisory: This response is for communication guidance and does not constitute a definitive medical diagnosis or electronic prescription. Direct clinical examination is required.';

export const AUTHORIZED_STAFF_RECIPIENT_ROLES: RoleKey[] = [
  'center_manager',
  'branch_manager',
  'doctor',
  'receptionist',
];

/**
 * Checks if a staff user role is authorized to view or respond to human escalations
 */
export function isAuthorizedStaffRecipient(roleKey: RoleKey): boolean {
  return AUTHORIZED_STAFF_RECIPIENT_ROLES.includes(roleKey);
}

// Seed Escalations
export const SEED_ESCALATIONS: HumanEscalationsData = {
  escalations: [
    {
      id: 'esc_seed_01',
      organization_id: DEFAULT_EGYPT_ORG.id,
      branch_id: '11111111-1111-1111-1111-111111111111', // Cairo Branch
      patient_id: 'a1111111-1111-1111-1111-111111111111', // Ahmed Mohamed
      chat_message_id: 'msg_001',
      category: 'medical_symptom',
      priority: 'urgent',
      status: 'pending',
      assigned_staff_id: null,
      assigned_staff_name: null,
      assigned_staff_role: null,
      subject: 'ألم شديد جداً بعد خلع الضرس العقل',
      original_prompt: 'عندي ألم شديد جداً ونزيف خفيف بعد خلع الضرس أمس ولا أستطيع النوم',
      ai_response_summary: 'المساعد الذكي قام بإعطاء إرشادات المضمضة واقترح تصعيد الطلب للطبيب المختص.',
      medical_disclaimer: MEDICAL_SAFETY_DISCLAIMER,
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 'esc_seed_02',
      organization_id: DEFAULT_EGYPT_ORG.id,
      branch_id: '11111111-1111-1111-1111-111111111111',
      patient_id: 'a1111111-1111-1111-1111-111111111111',
      chat_message_id: 'msg_002',
      category: 'treatment_inquiry',
      priority: 'medium',
      status: 'claimed',
      assigned_staff_id: 'prof_doc_01',
      assigned_staff_name: 'د. كريم حسن',
      assigned_staff_role: 'doctor',
      subject: 'استفسار عن خطة زراعة الأسنان والمواعيد',
      original_prompt: 'أريد معرفة هل يمكن تركيب التاج المؤقت بنفس يوم جراحة الزراعة؟',
      ai_response_summary: 'تم توجيه الاستفسار للمنسق الطبي والطبيب المعالج.',
      medical_disclaimer: MEDICAL_SAFETY_DISCLAIMER,
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ],
  replies: [
    {
      id: 'rep_seed_01',
      escalation_id: 'esc_seed_02',
      sender_type: 'staff',
      sender_id: 'prof_doc_01',
      sender_name: 'د. كريم حسن',
      sender_role: 'doctor',
      message: 'أهلاً بك أستاذ أحمد. في حالتك سنقوم بفحص كثافة العظم بالكت والأشعة المقطعية قبل الجراحة لتحديد إمكانية التحميل الفوري للتاج.',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ],
};

interface HumanEscalationsData {
  escalations: HumanEscalation[];
  replies: EscalationReply[];
}

/**
 * Retrieves all raw stored escalations
 */
export function getStoredEscalations(): HumanEscalation[] {
  const raw = safeStorage.getItem(ESCALATIONS_STORAGE_KEY);
  if (!raw) {
    safeStorage.setItem(ESCALATIONS_STORAGE_KEY, JSON.stringify(SEED_ESCALATIONS.escalations));
    return SEED_ESCALATIONS.escalations;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_ESCALATIONS.escalations;
  } catch {
    return SEED_ESCALATIONS.escalations;
  }
}

/**
 * Saves all escalations
 */
export function setStoredEscalations(items: HumanEscalation[]): void {
  safeStorage.setItem(ESCALATIONS_STORAGE_KEY, JSON.stringify(items));
}

/**
 * Retrieves all raw stored replies
 */
export function getStoredEscalationReplies(): EscalationReply[] {
  const raw = safeStorage.getItem(ESCALATION_REPLIES_STORAGE_KEY);
  if (!raw) {
    safeStorage.setItem(ESCALATION_REPLIES_STORAGE_KEY, JSON.stringify(SEED_ESCALATIONS.replies));
    return SEED_ESCALATIONS.replies;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_ESCALATIONS.replies;
  } catch {
    return SEED_ESCALATIONS.replies;
  }
}

/**
 * Saves all replies
 */
export function setStoredEscalationReplies(items: EscalationReply[]): void {
  safeStorage.setItem(ESCALATION_REPLIES_STORAGE_KEY, JSON.stringify(items));
}

/**
 * Creates a new Human Escalation and emits staff notifications
 */
export function createHumanEscalation(params: CreateEscalationParams): HumanEscalation {
  const now = new Date().toISOString();
  const id = params.id || 'esc_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();

  const category = params.category || 'general';
  const priority = params.priority || (category === 'medical_symptom' ? 'urgent' : 'medium');

  const newEscalation: HumanEscalation = {
    id,
    organization_id: params.organization_id || DEFAULT_EGYPT_ORG.id,
    branch_id: params.branch_id || null,
    patient_id: params.patient_id,
    chat_message_id: params.chat_message_id || null,
    category,
    priority,
    status: 'pending',
    assigned_staff_id: null,
    assigned_staff_name: null,
    assigned_staff_role: null,
    subject: params.subject,
    original_prompt: params.original_prompt,
    ai_response_summary: params.ai_response_summary || null,
    medical_disclaimer: MEDICAL_SAFETY_DISCLAIMER,
    created_at: now,
    updated_at: now,
  };

  const list = getStoredEscalations();
  list.unshift(newEscalation);
  setStoredEscalations(list);

  // Notify authorized staff roles (Receptionist, Doctor, Branch Manager, Center Manager)
  try {
    const patients = getStoredPatients();
    const pat = patients.find((p) => p.id === params.patient_id);
    const patName = pat ? `${pat.first_name} ${pat.last_name}` : 'المريض';

    AUTHORIZED_STAFF_RECIPIENT_ROLES.forEach((targetRole) => {
      createNotification({
        organization_id: newEscalation.organization_id,
        branch_id: newEscalation.branch_id,
        recipient_type: 'role',
        target_role: targetRole,
        type: 'escalation_created',
        title_ar: 'طلب تصعيد استفسار جديد من المريض',
        title_en: 'New Human Escalation Request',
        message_ar: `طلب تصعيد جديد من المريض ${patName}: "${newEscalation.subject}"`,
        message_en: `New escalation request from patient ${patName}: "${newEscalation.subject}"`,
        related_entity_type: 'escalation',
        related_entity_id: newEscalation.id,
      });
    });
  } catch {
    // Ignore notification errors
  }

  // Persist to Supabase if client active
  if (supabase) {
    Promise.resolve(
      supabase.from('human_escalations').insert({
        id: newEscalation.id,
        organization_id: newEscalation.organization_id,
        branch_id: newEscalation.branch_id,
        patient_id: newEscalation.patient_id,
        chat_message_id: newEscalation.chat_message_id,
        category: newEscalation.category,
        priority: newEscalation.priority,
        status: newEscalation.status,
        subject: newEscalation.subject,
        original_prompt: newEscalation.original_prompt,
        ai_response_summary: newEscalation.ai_response_summary,
        medical_disclaimer: newEscalation.medical_disclaimer,
        created_at: newEscalation.created_at,
        updated_at: newEscalation.updated_at,
      })
    )
      .then(({ error }: any) => {
        if (error) console.warn('Supabase escalation insert warning:', error.message);
      })
      .catch(() => {});
  }

  return newEscalation;
}

/**
 * Retrieves escalations for an authorized user context (Staff or Patient)
 */
export function getEscalationsForUser(
  context: StaffUserContext | PatientUserContext,
  filters?: {
    status?: EscalationStatus;
    category?: EscalationCategory;
    branchId?: string;
    patientId?: string;
  }
): HumanEscalation[] {
  const all = getStoredEscalations();

  if (context.kind === 'patient') {
    const patientId = context.patient.id;
    const orgId = context.organization_id || context.patient.organization_id;

    return all.filter((e) => {
      if (e.organization_id !== orgId) return false;

      // Patient Isolation & Guardian Access Rule
      const rls = simulatePatientRLS(patientId, e.patient_id, orgId);
      if (!rls.allowed) return false;

      if (filters?.status && e.status !== filters.status) return false;
      if (filters?.category && e.category !== filters.category) return false;
      return true;
    });
  }

  if (context.kind === 'staff') {
    const profile = context.profile;
    const orgId = profile.organization_id;
    const roleKey = profile.role_key;

    // Recipient Authorization Check
    if (!isAuthorizedStaffRecipient(roleKey)) {
      return []; // Unauthorized staff roles (lab_user, delivery_user, etc.) receive empty set
    }

    const isCenterManager = roleKey === 'center_manager';
    const userBranchIds = new Set(
      context.accessibleBranchIds || (profile.branch_id ? [profile.branch_id] : [])
    );

    return all.filter((e) => {
      // 1. Organization Isolation
      if (e.organization_id !== orgId) return false;

      // 2. Branch Isolation
      if (e.branch_id && !isCenterManager) {
        if (userBranchIds.size > 0 && !userBranchIds.has(e.branch_id)) {
          return false;
        }
      }

      // 3. Filters
      if (filters?.status && e.status !== filters.status) return false;
      if (filters?.category && e.category !== filters.category) return false;
      if (filters?.branchId && e.branch_id !== filters.branchId) return false;
      if (filters?.patientId && e.patient_id !== filters.patientId) return false;

      return true;
    });
  }

  return [];
}

/**
 * Gets a specific escalation and its replies with authorized context checks
 */
export function getEscalationWithReplies(
  id: string,
  context: StaffUserContext | PatientUserContext
): { escalation: HumanEscalation; replies: EscalationReply[] } | null {
  const list = getEscalationsForUser(context, {});
  const escalation = list.find((e) => e.id === id);
  if (!escalation) return null;

  const allReplies = getStoredEscalationReplies();
  const replies = allReplies
    .filter((r) => r.escalation_id === id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return { escalation, replies };
}

/**
 * Claims an escalation for a staff user.
 * PREVENTS DUPLICATE ACTIVE RESPONDERS.
 */
export function claimHumanEscalation(
  escalationId: string,
  staffProfile: Profile
): { success: boolean; escalation?: HumanEscalation; error?: string } {
  // Check role authorization
  if (!isAuthorizedStaffRecipient(staffProfile.role_key)) {
    return {
      success: false,
      error: 'Access Denied: Your staff role is not authorized to claim escalations.',
    };
  }

  const list = getStoredEscalations();
  const escalation = list.find((e) => e.id === escalationId);

  if (!escalation) {
    return { success: false, error: 'Escalation record not found.' };
  }

  // Organization isolation check
  if (escalation.organization_id !== staffProfile.organization_id) {
    return { success: false, error: 'Access Denied: Organization isolation policy violation.' };
  }

  // PREVENT DUPLICATE ACTIVE RESPONDERS:
  // If assigned to another active responder, reject claim!
  if (
    escalation.assigned_staff_id &&
    escalation.assigned_staff_id !== staffProfile.id &&
    (escalation.status === 'claimed' || escalation.status === 'resolved')
  ) {
    return {
      success: false,
      error: `Escalation is currently claimed by another responder (${escalation.assigned_staff_name || 'Staff Member'}). Duplicate active responders are prevented.`,
    };
  }

  const now = new Date().toISOString();
  escalation.status = 'claimed';
  escalation.assigned_staff_id = staffProfile.id;
  escalation.assigned_staff_name = staffProfile.display_name;
  escalation.assigned_staff_role = staffProfile.role_key;
  escalation.updated_at = now;

  setStoredEscalations(list);

  // Sync to Supabase if active
  if (supabase) {
    Promise.resolve(
      supabase
        .from('human_escalations')
        .update({
          status: 'claimed',
          assigned_staff_id: staffProfile.id,
          assigned_staff_name: staffProfile.display_name,
          assigned_staff_role: staffProfile.role_key,
          updated_at: now,
        })
        .eq('id', escalationId)
    )
      .then(() => {})
      .catch(() => {});
  }

  return { success: true, escalation };
}

/**
 * Releases a claimed escalation back to pending state so another staff member can claim it
 */
export function releaseHumanEscalation(
  escalationId: string,
  staffProfile: Profile
): { success: boolean; escalation?: HumanEscalation; error?: string } {
  if (!isAuthorizedStaffRecipient(staffProfile.role_key)) {
    return {
      success: false,
      error: 'Access Denied: Your staff role is not authorized to manage escalations.',
    };
  }

  const list = getStoredEscalations();
  const escalation = list.find((e) => e.id === escalationId);

  if (!escalation) {
    return { success: false, error: 'Escalation record not found.' };
  }

  if (escalation.organization_id !== staffProfile.organization_id) {
    return { success: false, error: 'Access Denied: Organization isolation policy violation.' };
  }

  // Check if assigned staff or manager
  const isAssigned = escalation.assigned_staff_id === staffProfile.id;
  const isManager = staffProfile.role_key === 'center_manager' || staffProfile.role_key === 'branch_manager';

  if (!isAssigned && !isManager && escalation.assigned_staff_id) {
    return {
      success: false,
      error: 'Access Denied: Only the assigned responder or manager can release this escalation.',
    };
  }

  const now = new Date().toISOString();
  escalation.status = 'pending'; // or 'released' / 'pending'
  escalation.assigned_staff_id = null;
  escalation.assigned_staff_name = null;
  escalation.assigned_staff_role = null;
  escalation.updated_at = now;

  setStoredEscalations(list);

  if (supabase) {
    Promise.resolve(
      supabase
        .from('human_escalations')
        .update({
          status: 'pending',
          assigned_staff_id: null,
          assigned_staff_name: null,
          assigned_staff_role: null,
          updated_at: now,
        })
        .eq('id', escalationId)
    )
      .then(() => {})
      .catch(() => {});
  }

  return { success: true, escalation };
}

/**
 * Adds a reply to an escalation and updates state / notifications
 */
export function addEscalationReply(
  params: ReplyEscalationParams,
  context: StaffUserContext | PatientUserContext
): { success: boolean; reply?: EscalationReply; escalation?: HumanEscalation; error?: string } {
  const { escalation_id, message, sender_type, sender_id, sender_name, sender_role } = params;

  if (!message || !message.trim()) {
    return { success: false, error: 'Reply message text is required.' };
  }

  const escalations = getStoredEscalations();
  const escalation = escalations.find((e) => e.id === escalation_id);

  if (!escalation) {
    return { success: false, error: 'Escalation record not found.' };
  }

  // Context Authorization
  if (context.kind === 'patient') {
    const patientId = context.patient.id;
    const rls = simulatePatientRLS(patientId, escalation.patient_id, context.organization_id || context.patient.organization_id);
    if (!rls.allowed) {
      return { success: false, error: 'Access Denied: Patient access authorization violation.' };
    }
  } else {
    if (!isAuthorizedStaffRecipient(context.profile.role_key)) {
      return { success: false, error: 'Access Denied: Unauthorized staff role.' };
    }
    if (escalation.organization_id !== context.profile.organization_id) {
      return { success: false, error: 'Access Denied: Organization isolation violation.' };
    }

    // DUPLICATE RESPONDER PREVENTION:
    // If escalation is already claimed by another staff member, reject reply unless released!
    if (
      escalation.assigned_staff_id &&
      escalation.assigned_staff_id !== sender_id &&
      escalation.status === 'claimed'
    ) {
      return {
        success: false,
        error: `Escalation is currently claimed by another responder (${escalation.assigned_staff_name}). Duplicate active responders are prevented.`,
      };
    }
  }

  const now = new Date().toISOString();
  const replyId = 'rep_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();

  const newReply: EscalationReply = {
    id: replyId,
    escalation_id,
    sender_type,
    sender_id,
    sender_name,
    sender_role: sender_role || null,
    message,
    created_at: now,
  };

  const replies = getStoredEscalationReplies();
  replies.push(newReply);
  setStoredEscalationReplies(replies);

  // Update Escalation status
  if (sender_type === 'staff') {
    // Automatically claim if unassigned
    if (!escalation.assigned_staff_id) {
      escalation.assigned_staff_id = sender_id;
      escalation.assigned_staff_name = sender_name;
      escalation.assigned_staff_role = (sender_role as RoleKey) || 'doctor';
    }
    if (escalation.status === 'pending' || escalation.status === 'released') {
      escalation.status = 'claimed';
    }
    escalation.updated_at = now;

    // Emit Notification to Patient
    createNotification({
      organization_id: escalation.organization_id,
      branch_id: escalation.branch_id,
      recipient_type: 'patient',
      recipient_id: escalation.patient_id,
      type: 'escalation_reply',
      title_ar: 'رد جديد من فريق العيادة على استفسارك',
      title_en: 'New Clinic Staff Response to Your Inquiry',
      message_ar: `رد ${sender_name}: "${message.substring(0, 90)}${message.length > 90 ? '...' : ''}"`,
      message_en: `Response from ${sender_name}: "${message.substring(0, 90)}${message.length > 90 ? '...' : ''}"`,
      related_entity_type: 'escalation',
      related_entity_id: escalation.id,
    });
  } else if (sender_type === 'patient') {
    // If patient replies on a resolved escalation -> Reopen!
    if (escalation.status === 'resolved') {
      escalation.status = 'reopened';
    }
    escalation.updated_at = now;

    // Emit Notification to assigned staff or recipient roles
    AUTHORIZED_STAFF_RECIPIENT_ROLES.forEach((targetRole) => {
      createNotification({
        organization_id: escalation.organization_id,
        branch_id: escalation.branch_id,
        recipient_type: 'role',
        target_role: targetRole,
        type: 'escalation_reopened',
        title_ar: 'رد جديد / إعادة فتح طلب تصعيد من المريض',
        title_en: 'New Reply / Escalation Reopened by Patient',
        message_ar: `رسالة جديدة من المريض على الطلب "${escalation.subject}": "${message.substring(0, 80)}"`,
        message_en: `New patient reply on "${escalation.subject}": "${message.substring(0, 80)}"`,
        related_entity_type: 'escalation',
        related_entity_id: escalation.id,
      });
    });
  }

  setStoredEscalations(escalations);

  // Sync to Supabase
  if (supabase) {
    Promise.resolve(
      supabase.from('escalation_replies').insert({
        id: newReply.id,
        escalation_id: newReply.escalation_id,
        sender_type: newReply.sender_type,
        sender_id: newReply.sender_id,
        sender_name: newReply.sender_name,
        sender_role: newReply.sender_role,
        message: newReply.message,
        created_at: newReply.created_at,
      })
    )
      .then(() => {})
      .catch(() => {});

    Promise.resolve(
      supabase
        .from('human_escalations')
        .update({
          status: escalation.status,
          assigned_staff_id: escalation.assigned_staff_id,
          assigned_staff_name: escalation.assigned_staff_name,
          assigned_staff_role: escalation.assigned_staff_role,
          updated_at: escalation.updated_at,
        })
        .eq('id', escalation_id)
    )
      .then(() => {})
      .catch(() => {});
  }

  return { success: true, reply: newReply, escalation };
}

/**
 * Resolves an escalation
 */
export function resolveHumanEscalation(
  escalationId: string,
  staffProfile: Profile,
  resolutionNotes?: string
): { success: boolean; escalation?: HumanEscalation; error?: string } {
  if (!isAuthorizedStaffRecipient(staffProfile.role_key)) {
    return {
      success: false,
      error: 'Access Denied: Your staff role is not authorized to resolve escalations.',
    };
  }

  const list = getStoredEscalations();
  const escalation = list.find((e) => e.id === escalationId);

  if (!escalation) {
    return { success: false, error: 'Escalation record not found.' };
  }

  if (escalation.organization_id !== staffProfile.organization_id) {
    return { success: false, error: 'Access Denied: Organization isolation violation.' };
  }

  // Prevent duplicate responder override
  if (
    escalation.assigned_staff_id &&
    escalation.assigned_staff_id !== staffProfile.id &&
    staffProfile.role_key !== 'center_manager' &&
    staffProfile.role_key !== 'branch_manager'
  ) {
    return {
      success: false,
      error: `Escalation is currently assigned to another staff responder (${escalation.assigned_staff_name}).`,
    };
  }

  const now = new Date().toISOString();
  escalation.status = 'resolved';
  escalation.resolved_at = now;
  escalation.resolved_by_id = staffProfile.id;
  escalation.updated_at = now;

  if (resolutionNotes) {
    addEscalationReply(
      {
        escalation_id: escalationId,
        sender_type: 'staff',
        sender_id: staffProfile.id,
        sender_name: staffProfile.display_name,
        sender_role: staffProfile.role_key,
        message: `[تم إغلاق واستكمال الطلب]: ${resolutionNotes}`,
      },
      { kind: 'staff', profile: staffProfile }
    );
  }

  setStoredEscalations(list);

  // Notify Patient
  createNotification({
    organization_id: escalation.organization_id,
    branch_id: escalation.branch_id,
    recipient_type: 'patient',
    recipient_id: escalation.patient_id,
    type: 'escalation_resolved',
    title_ar: 'تم معالجة وإغلاق طلب الاستفسار المباشر',
    title_en: 'Direct Inquiry Escalation Resolved',
    message_ar: `تم معالجة طلب الاستفسار الخاص بك "${escalation.subject}" بواسطة الفريق الطبي.`,
    message_en: `Your inquiry escalation "${escalation.subject}" has been marked as resolved by clinic staff.`,
    related_entity_type: 'escalation',
    related_entity_id: escalation.id,
  });

  if (supabase) {
    Promise.resolve(
      supabase
        .from('human_escalations')
        .update({
          status: 'resolved',
          resolved_at: now,
          resolved_by_id: staffProfile.id,
          updated_at: now,
        })
        .eq('id', escalationId)
    )
      .then(() => {})
      .catch(() => {});
  }

  return { success: true, escalation };
}

/**
 * Reopens a resolved escalation
 */
export function reopenHumanEscalation(
  escalationId: string,
  context: StaffUserContext | PatientUserContext,
  reason?: string
): { success: boolean; escalation?: HumanEscalation; error?: string } {
  const list = getStoredEscalations();
  const escalation = list.find((e) => e.id === escalationId);

  if (!escalation) {
    return { success: false, error: 'Escalation record not found.' };
  }

  if (context.kind === 'patient') {
    const patientId = context.patient.id;
    const rls = simulatePatientRLS(patientId, escalation.patient_id, context.organization_id || context.patient.organization_id);
    if (!rls.allowed) {
      return { success: false, error: 'Access Denied: Patient authorization violation.' };
    }
  } else {
    if (!isAuthorizedStaffRecipient(context.profile.role_key)) {
      return { success: false, error: 'Access Denied: Unauthorized staff role.' };
    }
    if (escalation.organization_id !== context.profile.organization_id) {
      return { success: false, error: 'Access Denied: Organization isolation violation.' };
    }
  }

  const now = new Date().toISOString();
  escalation.status = 'reopened';
  escalation.resolved_at = null;
  escalation.resolved_by_id = null;
  escalation.updated_at = now;

  setStoredEscalations(list);

  if (reason) {
    const senderType = context.kind === 'patient' ? 'patient' : 'staff';
    const senderId = context.kind === 'patient' ? context.patient.id : context.profile.id;
    const senderName =
      context.kind === 'patient'
        ? `${context.patient.first_name} ${context.patient.last_name}`
        : context.profile.display_name;
    const senderRole = context.kind === 'patient' ? null : context.profile.role_key;

    addEscalationReply(
      {
        escalation_id: escalationId,
        sender_type: senderType,
        sender_id: senderId,
        sender_name: senderName,
        sender_role: senderRole,
        message: `[إعادة فتح الطلب]: ${reason}`,
      },
      context
    );
  }

  // Notify staff if reopened by patient
  if (context.kind === 'patient') {
    AUTHORIZED_STAFF_RECIPIENT_ROLES.forEach((targetRole) => {
      createNotification({
        organization_id: escalation.organization_id,
        branch_id: escalation.branch_id,
        recipient_type: 'role',
        target_role: targetRole,
        type: 'escalation_reopened',
        title_ar: 'تم إعادة فتح طلب التصعيد بواسطة المريض',
        title_en: 'Escalation Reopened by Patient',
        message_ar: `قام المريض بإعادة فتح طلب التصعيد "${escalation.subject}".`,
        message_en: `Patient reopened escalation request "${escalation.subject}".`,
        related_entity_type: 'escalation',
        related_entity_id: escalation.id,
      });
    });
  }

  if (supabase) {
    Promise.resolve(
      supabase
        .from('human_escalations')
        .update({
          status: 'reopened',
          resolved_at: null,
          resolved_by_id: null,
          updated_at: now,
        })
        .eq('id', escalationId)
    )
      .then(() => {})
      .catch(() => {});
  }

  return { success: true, escalation };
}

/**
 * Resets escalation store to seed state
 */
export function resetEscalationsToSeed(): void {
  setStoredEscalations(SEED_ESCALATIONS.escalations);
  setStoredEscalationReplies(SEED_ESCALATIONS.replies);
}
