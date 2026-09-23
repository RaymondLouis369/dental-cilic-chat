/**
 * Phase 09.3: Complaints & Support Tickets Storage & Engine
 * Dental Clinic & Dental Center Management Platform — Egypt
 */

import {
  SupportTicket,
  CreateTicketParams,
  FilterTicketParams,
  TicketStatus,
  TicketPriority,
  TicketReply,
  TicketCategory,
} from '../types/complaints';
import { RoleKey } from '../types';
import { emitNotification } from './notificationStorage';
import { DEFAULT_EGYPT_ORG } from './storage';
import { createDoctorTask } from './clinicalStorage';
import { supabase } from './supabase';

export const SUPPORT_TICKET_STORAGE_KEY = 'dental_saas_support_tickets';

// Memory fallback store for non-browser environments
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
};

// Seed Complaints & Support Tickets
export const SEED_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: 'tkt_seed_001',
    ticket_number: 'TKT-2026-001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111', // Cairo Branch
    patient_id: 'a1111111-1111-1111-1111-111111111111', // Ahmed Mohamed
    patient_name: 'أحمد محمد علي',
    patient_phone: '01001234567',
    category: 'Billing',
    subject: 'استفسار حول فاتورة الجلسة الأخيرة وتغطية التأمين',
    description: 'تم خصم المبلغ كاش بالرغم من تقديم موافقة شركـة التأمين قبل الجلسة. أرجو مراجعة الفاتورة وإعادة احتساب نسبة الخصم.',
    priority: 'normal',
    status: 'in_progress',
    assigned_to: 'prof_rec_01',
    assigned_to_name: 'مها أحمد (الاستقبال)',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    replies: [
      {
        id: 'reply_seed_001_1',
        ticket_id: 'tkt_seed_001',
        sender_type: 'patient',
        sender_id: 'a1111111-1111-1111-1111-111111111111',
        sender_name: 'أحمد محمد علي',
        message: 'تم خصم المبلغ كاش بالرغم من تقديم موافقة شركة التأمين قبل الجلسة.',
        is_internal: false,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'reply_seed_001_2',
        ticket_id: 'tkt_seed_001',
        sender_type: 'staff',
        sender_id: 'prof_rec_01',
        sender_name: 'مها أحمد',
        sender_role: 'receptionist',
        message: 'تم استلام الشكوى وجاري مراجعة قسم التأمين لإعادة تحويل الفروقات الحسابية.',
        is_internal: false,
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: 'reply_seed_001_3',
        ticket_id: 'tkt_seed_001',
        sender_type: 'staff',
        sender_id: 'prof_mgr_01',
        sender_name: 'د. طارق الحسين',
        sender_role: 'center_manager',
        message: 'ملاحظة داخلية: التأكد من إدخال رقم موافقة التأمين الصحيح برقم #INS-9082',
        is_internal: true, // INTERNAL NOTE - Hidden from patient!
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
    ],
  },
  {
    id: 'tkt_seed_002',
    ticket_number: 'TKT-2026-002',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    patient_id: 'b2222222-2222-2222-2222-222222222222', // Mona Mahmoud
    patient_name: 'منى محمود السيد',
    patient_phone: '01119876543',
    category: 'Clinical',
    subject: 'حساسية وألم بعد خلع ضرس العقل',
    description: 'يوجد ألم متزايد وشعور بالحساسية مع المشروبات الباردة بعد عملية الخلع بـ 3 أيام.',
    priority: 'urgent',
    status: 'escalated',
    assigned_to: 'prof_doc_01',
    assigned_to_name: 'د. كريم حسن',
    escalated_to_role: 'doctor',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    replies: [
      {
        id: 'reply_seed_002_1',
        ticket_id: 'tkt_seed_002',
        sender_type: 'patient',
        sender_id: 'b2222222-2222-2222-2222-222222222222',
        sender_name: 'منى محمود السيد',
        message: 'أعاني من ألم شديد بعد الخلع ويرجى التواصل من الطبيب المعالج.',
        is_internal: false,
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
      {
        id: 'reply_seed_002_2',
        ticket_id: 'tkt_seed_002',
        sender_type: 'staff',
        sender_id: 'prof_rec_01',
        sender_name: 'مها أحمد',
        sender_role: 'receptionist',
        message: 'ملاحظة داخلية: تم تصعيد الشكوى الطبية للدكتور كريم حسن فوراً لمتابعة حالة المريضة بعد الجراحة.',
        is_internal: true,
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
    ],
  },
];

/**
 * Get stored support tickets
 */
export function getStoredSupportTickets(): SupportTicket[] {
  const data = safeStorage.getItem(SUPPORT_TICKET_STORAGE_KEY);
  if (!data) {
    safeStorage.setItem(SUPPORT_TICKET_STORAGE_KEY, JSON.stringify(SEED_SUPPORT_TICKETS));
    return SEED_SUPPORT_TICKETS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return SEED_SUPPORT_TICKETS;
  }
}

/**
 * Set stored support tickets
 */
export function setStoredSupportTickets(tickets: SupportTicket[]): void {
  safeStorage.setItem(SUPPORT_TICKET_STORAGE_KEY, JSON.stringify(tickets));

  // Background Supabase async sync if supported
  try {
    if (typeof window !== 'undefined' && supabase) {
      Promise.resolve(supabase.from('support_tickets').upsert(tickets)).catch(() => {});
    }
  } catch {
    // Ignore sync failures in demo mode
  }
}

/**
 * Create a new support ticket / complaint
 */
export function createSupportTicket(params: CreateTicketParams): {
  ticket: SupportTicket;
  taskId?: string;
} {
  const tickets = getStoredSupportTickets();

  // Generate ticket number e.g. TKT-2026-003
  const countToday = tickets.length + 101;
  const ticketNumber = `TKT-${new Date().getFullYear()}-${String(countToday).padStart(3, '0')}`;
  const now = new Date().toISOString();
  const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Default priority if not specified
  const priority: TicketPriority = params.priority || 'normal';

  // Determine auto escalation/routing role based on category
  let escalatedRole: RoleKey | null = null;
  if (params.category === 'Clinical' || params.category === 'Medication') {
    escalatedRole = 'doctor';
  } else if (params.category === 'Billing' || params.category === 'Insurance') {
    escalatedRole = 'center_manager';
  }

  const initialReply: TicketReply = {
    id: `reply_${Date.now()}_0`,
    ticket_id: ticketId,
    sender_type: params.createdByStaffId ? 'staff' : 'patient',
    sender_id: params.createdByStaffId || params.patientId,
    sender_name: params.patientName || 'المريض',
    message: params.description,
    is_internal: false,
    created_at: now,
  };

  const newTicket: SupportTicket = {
    id: ticketId,
    ticket_number: ticketNumber,
    organization_id: params.organizationId,
    branch_id: params.branchId,
    patient_id: params.patientId,
    patient_name: params.patientName || 'مريض',
    patient_phone: params.patientPhone,
    category: params.category,
    subject: params.subject.trim(),
    description: params.description.trim(),
    priority,
    status: 'open',
    assigned_to: params.assignedTo || null,
    assigned_to_name: params.assignedToName || null,
    escalated_to_role: escalatedRole,
    created_at: now,
    updated_at: now,
    replies: [initialReply],
  };

  tickets.unshift(newTicket);
  setStoredSupportTickets(tickets);

  // 1. Emit notification to staff/role
  emitNotification({
    organization_id: params.organizationId,
    branch_id: params.branchId,
    recipient_type: 'role',
    target_role: escalatedRole || 'receptionist',
    type: 'reception_task',
    title_ar: `شكوى جديدة: ${ticketNumber}`,
    title_en: `New Complaint: ${ticketNumber}`,
    message_ar: `تلقي شكوى جديدة [${params.category}] من المريض ${params.patientName || ''}: ${params.subject}`,
    message_en: `New complaint received [${params.category}] from ${params.patientName || ''}: ${params.subject}`,
    related_entity_type: 'support_ticket',
    related_entity_id: ticketId,
    metadata: { ticket_number: ticketNumber, priority, category: params.category },
  });

  // 2. Emit confirmation notification to patient
  emitNotification({
    organization_id: params.organizationId,
    branch_id: params.branchId,
    recipient_type: 'patient',
    recipient_id: params.patientId,
    type: 'system',
    title_ar: `تم استلام تذكرة الدعم ${ticketNumber}`,
    title_en: `Support Ticket Received ${ticketNumber}`,
    message_ar: `تم تسجيل شكواك برقم ${ticketNumber} وجاري متابعتها من قبل فريق العيادة.`,
    message_en: `Your ticket ${ticketNumber} has been logged and is under review by clinic staff.`,
    related_entity_type: 'support_ticket',
    related_entity_id: ticketId,
  });

  // 3. Create Reception Task if urgent/critical or requested
  let taskId: string | undefined;
  if (priority === 'urgent' || priority === 'critical' || escalatedRole) {
    const task = createDoctorTask({
      organizationId: params.organizationId,
      branchId: params.branchId,
      patientId: params.patientId,
      doctorId: params.assignedTo || 'system_reception',
      taskType: 'schedule_follow_up',
      title: `[TICKET ${ticketNumber}] ${params.category}: ${params.subject}`,
      details: params.description,
      priority: params.priority === 'urgent' || params.priority === 'critical' ? 'urgent' : 'normal',
      assignedToRole: escalatedRole || 'receptionist',
    });
    taskId = task.id;
  }

  return { ticket: newTicket, taskId };
}

/**
 * Filter support tickets according to RBAC, tenant, branch, and role privacy boundaries
 */
export function getFilteredSupportTickets(params: FilterTicketParams): SupportTicket[] {
  const tickets = getStoredSupportTickets();

  return tickets
    .filter((tkt) => {
      // Organization Boundary
      if (params.organizationId && tkt.organization_id !== params.organizationId) {
        return false;
      }
      // Branch Boundary (if specified)
      if (params.branchId && params.branchId !== 'all' && tkt.branch_id !== params.branchId) {
        return false;
      }
      // Patient Isolation
      if (params.patientId && tkt.patient_id !== params.patientId) {
        return false;
      }
      // Category Filter
      if (params.category && params.category !== 'all' && tkt.category !== params.category) {
        return false;
      }
      // Status Filter
      if (params.status && params.status !== 'all' && tkt.status !== params.status) {
        return false;
      }
      // Priority Filter
      if (params.priority && params.priority !== 'all' && tkt.priority !== params.priority) {
        return false;
      }
      // Assigned To Filter
      if (params.assignedTo && params.assignedTo !== 'all') {
        if (params.assignedTo === 'unassigned') {
          if (tkt.assigned_to) return false;
        } else if (tkt.assigned_to !== params.assignedTo) {
          return false;
        }
      }
      // Date Range Filters
      if (params.startDate && tkt.created_at.split('T')[0] < params.startDate) {
        return false;
      }
      if (params.endDate && tkt.created_at.split('T')[0] > params.endDate) {
        return false;
      }
      // Search Query
      if (params.searchQuery && params.searchQuery.trim() !== '') {
        const q = params.searchQuery.toLowerCase().trim();
        const matchNum = tkt.ticket_number.toLowerCase().includes(q);
        const matchSubj = tkt.subject.toLowerCase().includes(q);
        const matchDesc = tkt.description.toLowerCase().includes(q);
        const matchPat = (tkt.patient_name || '').toLowerCase().includes(q);
        const matchPhone = (tkt.patient_phone || '').includes(q);

        if (!matchNum && !matchSubj && !matchDesc && !matchPat && !matchPhone) {
          return false;
        }
      }

      return true;
    })
    .map((tkt) => {
      // CRITICAL SECURITY RULE: If requested for patient, strip internal staff notes!
      if (params.forPatient) {
        return {
          ...tkt,
          replies: tkt.replies.filter((r) => !r.is_internal),
        };
      }
      return tkt;
    });
}

/**
 * Get ticket by ID with patient privacy filtering option
 */
export function getSupportTicketById(ticketId: string, forPatient = false): SupportTicket | null {
  const tickets = getStoredSupportTickets();
  const found = tickets.find((t) => t.id === ticketId);
  if (!found) return null;

  if (forPatient) {
    return {
      ...found,
      replies: found.replies.filter((r) => !r.is_internal),
    };
  }
  return found;
}

/**
 * Update support ticket status
 */
export function updateSupportTicketStatus(
  ticketId: string,
  newStatus: TicketStatus,
  updatedByStaffId?: string,
  resolutionNotes?: string
): boolean {
  const tickets = getStoredSupportTickets();
  const index = tickets.findIndex((t) => t.id === ticketId);
  if (index === -1) return false;

  const tkt = tickets[index];
  const now = new Date().toISOString();

  tkt.status = newStatus;
  tkt.updated_at = now;

  if (newStatus === 'resolved' || newStatus === 'closed') {
    tkt.resolved_at = now;
    if (resolutionNotes) {
      tkt.resolution_notes = resolutionNotes;
    }

    // Add public resolution reply if resolution notes provided
    if (resolutionNotes && resolutionNotes.trim() !== '') {
      tkt.replies.push({
        id: `reply_${Date.now()}_res`,
        ticket_id: ticketId,
        sender_type: 'staff',
        sender_id: updatedByStaffId || 'staff_system',
        sender_name: 'إدارة العيادة',
        message: `تم إنهاء التذكرة واستكمال المتابعة: ${resolutionNotes}`,
        is_internal: false,
        created_at: now,
      });
    }

    // Notify patient of resolution
    emitNotification({
      organization_id: tkt.organization_id,
      branch_id: tkt.branch_id,
      recipient_type: 'patient',
      recipient_id: tkt.patient_id,
      type: 'system',
      title_ar: `تم إغلاق تذكرة الشكوى ${tkt.ticket_number}`,
      title_en: `Ticket Closed ${tkt.ticket_number}`,
      message_ar: `تمت معالجة شكواك رقم ${tkt.ticket_number} بنجاح. نتمنى لك دوام الصحة والعافية.`,
      message_en: `Your ticket ${tkt.ticket_number} has been successfully resolved.`,
      related_entity_type: 'support_ticket',
      related_entity_id: ticketId,
    });
  }

  setStoredSupportTickets(tickets);
  return true;
}

/**
 * Change support ticket priority
 */
export function updateSupportTicketPriority(
  ticketId: string,
  newPriority: TicketPriority,
  updatedByStaffId?: string
): boolean {
  const tickets = getStoredSupportTickets();
  const tkt = tickets.find((t) => t.id === ticketId);
  if (!tkt) return false;

  const now = new Date().toISOString();
  tkt.priority = newPriority;
  tkt.updated_at = now;

  // Add internal note about priority change
  tkt.replies.push({
    id: `reply_${Date.now()}_prio`,
    ticket_id: ticketId,
    sender_type: 'staff',
    sender_id: updatedByStaffId || 'staff_system',
    sender_name: 'النظام الداخلي',
    message: `ملاحظة داخلية: تم تغيير أولوية التذكرة إلى (${newPriority.toUpperCase()}).`,
    is_internal: true,
    created_at: now,
  });

  setStoredSupportTickets(tickets);
  return true;
}

/**
 * Assign support ticket to staff member
 */
export function assignSupportTicket(
  ticketId: string,
  assignedToStaffId: string,
  assignedToName: string,
  assignedByStaffId?: string
): boolean {
  const tickets = getStoredSupportTickets();
  const tkt = tickets.find((t) => t.id === ticketId);
  if (!tkt) return false;

  const now = new Date().toISOString();
  tkt.assigned_to = assignedToStaffId;
  tkt.assigned_to_name = assignedToName;
  if (tkt.status === 'open') {
    tkt.status = 'in_progress';
  }
  tkt.updated_at = now;

  // Add internal note
  tkt.replies.push({
    id: `reply_${Date.now()}_assign`,
    ticket_id: ticketId,
    sender_type: 'staff',
    sender_id: assignedByStaffId || 'staff_system',
    sender_name: 'النظام الداخلي',
    message: `ملاحظة داخلية: تم تعيين التذكرة للموظف/الطبيب [${assignedToName}].`,
    is_internal: true,
    created_at: now,
  });

  setStoredSupportTickets(tickets);

  // Notify assigned staff
  emitNotification({
    organization_id: tkt.organization_id,
    branch_id: tkt.branch_id,
    recipient_type: 'staff',
    recipient_id: assignedToStaffId,
    type: 'reception_task',
    title_ar: `إسناد تذكرة شكوى: ${tkt.ticket_number}`,
    title_en: `Ticket Assigned: ${tkt.ticket_number}`,
    message_ar: `تم إسناد التذكرة ${tkt.ticket_number} [${tkt.category}] لمتابعتك.`,
    message_en: `Ticket ${tkt.ticket_number} [${tkt.category}] assigned to you.`,
    related_entity_type: 'support_ticket',
    related_entity_id: ticketId,
  });

  return true;
}

/**
 * Escalate support ticket to authorized role (Clinical -> Doctor, Billing -> Manager, etc.)
 */
export function escalateSupportTicket(
  ticketId: string,
  targetRole: RoleKey,
  escalatedByStaffId: string,
  reason: string
): boolean {
  const tickets = getStoredSupportTickets();
  const tkt = tickets.find((t) => t.id === ticketId);
  if (!tkt) return false;

  const now = new Date().toISOString();
  tkt.status = 'escalated';
  tkt.priority = 'critical';
  tkt.escalated_to_role = targetRole;
  tkt.updated_at = now;

  // Add internal note documenting escalation
  tkt.replies.push({
    id: `reply_${Date.now()}_esc`,
    ticket_id: ticketId,
    sender_type: 'staff',
    sender_id: escalatedByStaffId,
    sender_name: 'فريق الاستقبال/الإدارة',
    message: `ملاحظة داخلية: تم تصعيد الشكوى إلى الدور القيادي [${targetRole}]. سبب التصعيد: ${reason}`,
    is_internal: true,
    created_at: now,
  });

  setStoredSupportTickets(tickets);

  // Emit notification to escalated role
  emitNotification({
    organization_id: tkt.organization_id,
    branch_id: tkt.branch_id,
    recipient_type: 'role',
    target_role: targetRole,
    type: 'reception_task',
    title_ar: `تصعيد عاجل لتذكرة: ${tkt.ticket_number}`,
    title_en: `Urgent Ticket Escalation: ${tkt.ticket_number}`,
    message_ar: `تم تصعيد الشكوى [${tkt.category}] برقم ${tkt.ticket_number} إليك. السبب: ${reason}`,
    message_en: `Complaint ${tkt.ticket_number} [${tkt.category}] escalated to your role. Reason: ${reason}`,
    related_entity_type: 'support_ticket',
    related_entity_id: ticketId,
    metadata: { priority: 'critical', category: tkt.category },
  });

  return true;
}

/**
 * Add reply / comment to support ticket
 */
export function addTicketReply(
  ticketId: string,
  params: {
    senderType: 'patient' | 'staff';
    senderId: string;
    senderName: string;
    senderRole?: RoleKey | null;
    message: string;
    isInternal: boolean;
  }
): TicketReply | null {
  const tickets = getStoredSupportTickets();
  const tkt = tickets.find((t) => t.id === ticketId);
  if (!tkt) return null;

  const now = new Date().toISOString();

  const reply: TicketReply = {
    id: `reply_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    ticket_id: ticketId,
    sender_type: params.senderType,
    sender_id: params.senderId,
    sender_name: params.senderName,
    sender_role: params.senderRole,
    message: params.message.trim(),
    is_internal: params.isInternal,
    created_at: now,
  };

  tkt.replies.push(reply);
  tkt.updated_at = now;

  // Auto-adjust status when reply sent
  if (params.senderType === 'patient') {
    if (tkt.status === 'waiting_patient' || tkt.status === 'open') {
      tkt.status = 'in_progress';
    }
  } else if (params.senderType === 'staff' && !params.isInternal) {
    if (tkt.status === 'open') {
      tkt.status = 'in_progress';
    }
  }

  setStoredSupportTickets(tickets);

  // Send notifications for non-internal replies
  if (!params.isInternal) {
    if (params.senderType === 'staff') {
      // Staff replied publicly -> notify patient
      emitNotification({
        organization_id: tkt.organization_id,
        branch_id: tkt.branch_id,
        recipient_type: 'patient',
        recipient_id: tkt.patient_id,
        type: 'system',
        title_ar: `رد جديد على تذكرتك ${tkt.ticket_number}`,
        title_en: `New Response on Ticket ${tkt.ticket_number}`,
        message_ar: `قام فريق العيادة بالرد على تذكرتك: ${params.message.slice(0, 60)}...`,
        message_en: `Clinic staff responded to your ticket: ${params.message.slice(0, 60)}...`,
        related_entity_type: 'support_ticket',
        related_entity_id: ticketId,
      });
    } else {
      // Patient replied -> notify assigned staff or receptionists
      if (tkt.assigned_to) {
        emitNotification({
          organization_id: tkt.organization_id,
          branch_id: tkt.branch_id,
          recipient_type: 'staff',
          recipient_id: tkt.assigned_to,
          type: 'reception_task',
          title_ar: `رد مريض على التذكرة ${tkt.ticket_number}`,
          title_en: `Patient Replied to Ticket ${tkt.ticket_number}`,
          message_ar: `أضاف المريض رداً جديداً على التذكرة المسندة إليك: ${params.message.slice(0, 60)}...`,
          message_en: `Patient replied to your assigned ticket: ${params.message.slice(0, 60)}...`,
          related_entity_type: 'support_ticket',
          related_entity_id: ticketId,
        });
      } else {
        emitNotification({
          organization_id: tkt.organization_id,
          branch_id: tkt.branch_id,
          recipient_type: 'role',
          target_role: 'receptionist',
          type: 'reception_task',
          title_ar: `رد مريض على التذكرة ${tkt.ticket_number}`,
          title_en: `Patient Replied to Ticket ${tkt.ticket_number}`,
          message_ar: `أضاف المريض رداً جديداً على التذكرة: ${params.message.slice(0, 60)}...`,
          message_en: `Patient replied to ticket: ${params.message.slice(0, 60)}...`,
          related_entity_type: 'support_ticket',
          related_entity_id: ticketId,
        });
      }
    }
  }

  return reply;
}

/**
 * Resets storage to initial seeds for unit testing & state clean-up
 */
export function resetComplaintsStorageToSeed(): void {
  memoryStore.clear();
  safeStorage.setItem(SUPPORT_TICKET_STORAGE_KEY, JSON.stringify(SEED_SUPPORT_TICKETS));
}
