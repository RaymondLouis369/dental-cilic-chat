/**
 * Phase 9.1: Centralized Notifications Storage & Event Engine
 * Dental Clinic & Dental Center Management Platform — Egypt
 */

import {
  NotificationItem,
  CreateNotificationParams,
  NotificationType,
} from '../types/notification';
import { Profile, RoleKey, Patient } from '../types';
import { DEFAULT_EGYPT_ORG } from './storage';
import { supabase } from './supabase';

export const NOTIFICATION_STORAGE_KEY = 'dental_saas_notifications';

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

// Seed notifications
export const SEED_NOTIFICATIONS: NotificationItem[] = [
  // 1. Patient Notification (Ahmed Mohamed)
  {
    id: 'notif_seed_pat_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111', // Cairo Branch
    recipient_type: 'patient',
    recipient_id: 'a1111111-1111-1111-1111-111111111111', // Ahmed Mohamed
    type: 'appointment_event',
    title_ar: 'تأكيد حجز الموعد القادم',
    title_en: 'Upcoming Appointment Confirmed',
    message_ar: 'تم تأكيد موعدك القادم بفرع المعادي مع د. كريم حسن. نرجو الحضور قبل الموعد بـ 10 دقائق.',
    message_en: 'Your upcoming appointment at Maadi Branch with Dr. Karim Hassan is confirmed. Please arrive 10 minutes early.',
    related_entity_type: 'appointment',
    related_entity_id: 'apt_cai_001',
    read: false,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'notif_seed_pat_02',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    recipient_type: 'patient',
    recipient_id: 'a1111111-1111-1111-1111-111111111111',
    type: 'consent_required',
    title_ar: 'نموذج موافقة بانتظار التوقيع الرقمي',
    title_en: 'Consent Form Pending Signature',
    message_ar: 'يوجد إقرار موافقة على خطة العلاج والتركيبات بانتظار توقيعك الرقمي في ملفك الطبي.',
    message_en: 'A treatment plan consent form is awaiting your digital signature in your patient portal.',
    related_entity_type: 'consent',
    related_entity_id: 'consent_001',
    read: false,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'notif_seed_pat_03',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    recipient_type: 'patient',
    recipient_id: 'a1111111-1111-1111-1111-111111111111',
    type: 'payment_invoice',
    title_ar: 'تحديث فاتورة العلاج',
    title_en: 'Invoice Update',
    message_ar: 'تم إصدار فاتورة الخدمات الطبية رقم INV-CAI-2026-0001 بمبلغ 850 ج.م.',
    message_en: 'Invoice #INV-CAI-2026-0001 for 850 EGP has been generated for your recent visit.',
    related_entity_type: 'invoice',
    related_entity_id: 'inv_cai_001',
    read: true,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },

  // 2. Receptionist Notifications
  {
    id: 'notif_seed_rec_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    recipient_type: 'role',
    target_role: 'receptionist',
    type: 'reception_task',
    title_ar: 'مهمة استقبال جديدة من الطبيب',
    title_en: 'New Reception Task',
    message_ar: 'طلب د. كريم حسن توثيق بطاقة التأمين وتحديث القيد العائلي للمريض أحمد محمد.',
    message_en: 'Dr. Karim Hassan requested collecting insurance documentation for patient Ahmed Mohamed.',
    related_entity_type: 'reception_task',
    related_entity_id: 'task_rec_001',
    read: false,
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'notif_seed_rec_02',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    recipient_type: 'role',
    target_role: 'receptionist',
    type: 'insurance_approval',
    title_ar: 'موافقة تأمين جاهزة',
    title_en: 'Insurance Approval Received',
    message_ar: 'تمت موافقة شركة أكسا للتأمين على إجراء علاج الجذور للمريض أحمد محمد.',
    message_en: 'AXA Insurance approval received for root canal procedure (Patient: Ahmed Mohamed).',
    related_entity_type: 'insurance_approval',
    related_entity_id: 'appr_axa_001',
    read: false,
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },

  // 3. Doctor Notifications
  {
    id: 'notif_seed_doc_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    recipient_type: 'role',
    target_role: 'doctor',
    recipient_id: 'prof_doc_01',
    type: 'investigation_result',
    title_ar: 'نتيجة الأشعة الرقمية متوفرة',
    title_en: 'X-Ray Result Available',
    message_ar: 'تم رفع أحدث نتيجة لصور الأشعة البانورامية للمريض أحمد محمد بالملف الطبي.',
    message_en: 'New panoramic X-Ray result is now attached to patient Ahmed Mohamed clinical file.',
    related_entity_type: 'investigation',
    related_entity_id: 'inv_req_001',
    read: false,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'notif_seed_doc_02',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    recipient_type: 'role',
    target_role: 'doctor',
    recipient_id: 'prof_doc_01',
    type: 'lab_order_status',
    title_ar: 'تركيبة المعمل جاهزة للتسليم',
    title_en: 'Lab Order Ready',
    message_ar: 'وصل تاج الزركونيا من معمل التصنيع وهو جاهز الآن لتركيبه للمريض أحمد محمد.',
    message_en: 'Zirconia crown arrived from manufacturing lab and is ready for clinical fitting.',
    related_entity_type: 'lab_order',
    related_entity_id: 'lab_ord_001',
    read: false,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },

  // 4. Branch Manager Notification
  {
    id: 'notif_seed_bm_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '22222222-2222-2222-2222-222222222222', // Alex Branch
    recipient_type: 'role',
    target_role: 'branch_manager',
    type: 'system',
    title_ar: 'تقرير الأداء الإداري والمالي للفرع',
    title_en: 'Branch Financial & Operational Summary',
    message_ar: 'تم تحديث مؤشرات الأداء المالي والمهام المعلقة لفرع سموحة بالإسكندرية.',
    message_en: 'Financial KPIs and operational task summary updated for Smouha Branch.',
    related_entity_type: 'dashboard',
    related_entity_id: 'dash_bm_01',
    read: false,
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },

  // 5. Center Manager Notification
  {
    id: 'notif_seed_cm_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    recipient_type: 'role',
    target_role: 'center_manager',
    type: 'system',
    title_ar: 'مراجعة الموردين والخدمات الطبية',
    title_en: 'Service & Supplier Review Alert',
    message_ar: 'تحديثات جديدة على قائمة خدمات وأسعار المؤسسة متوفرة في لوحة تحكم المدير.',
    message_en: 'Service catalog updates and supplier details ready for review in manager portal.',
    related_entity_type: 'service_catalog',
    related_entity_id: 'cat_review_01',
    read: false,
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
  },

  // 6. Prosthetic Coordinator Notification
  {
    id: 'notif_seed_pc_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    recipient_type: 'role',
    target_role: 'prosthetic_coordinator',
    type: 'lab_order_status',
    title_ar: 'تنسيق أمر معمل جديد',
    title_en: 'Prosthetic Lab Order Coordination',
    message_ar: 'تم طلب طقم تركيبات زركونيا جديد للسن #16 وهو بانتظار اعتماد التنسيق الميداني.',
    message_en: 'New Zirconia restoration order created; awaiting coordinator workflow review.',
    related_entity_type: 'lab_order',
    related_entity_id: 'lab_ord_001',
    read: false,
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },

  // 7. Lab User Notification
  {
    id: 'notif_seed_lab_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    recipient_type: 'role',
    target_role: 'lab_user',
    type: 'lab_order_status',
    title_ar: 'طلب تصنيع جديد بالمعمل',
    title_en: 'New Lab Production Request',
    message_ar: 'تم تحويل أمر تصنيع جديد بالمعمل (تاج زركونيا للسن #16) مع المواصفات الطبية.',
    message_en: 'New lab manufacturing order assigned for 3D Zirconia Crown (Tooth #16).',
    related_entity_type: 'lab_order',
    related_entity_id: 'lab_ord_001',
    read: false,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },

  // 8. Delivery User Notification
  {
    id: 'notif_seed_del_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: '11111111-1111-1111-1111-111111111111',
    recipient_type: 'role',
    target_role: 'delivery_user',
    type: 'delivery_status',
    title_ar: 'تأكيد مهمة النقل والتوصيل',
    title_en: 'New Delivery Courier Assignment',
    message_ar: 'تم إسناد شحنة معمل لنقلها من معمل القاهرة المركزية وإعادة تسليمها لفرع المعادي.',
    message_en: 'New lab order pickup task assigned: Transfer item from Central Lab to Maadi Branch.',
    related_entity_type: 'lab_order',
    related_entity_id: 'lab_ord_001',
    read: false,
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

/**
 * Gets all stored raw notifications
 */
export function getStoredNotifications(): NotificationItem[] {
  const raw = safeStorage.getItem(NOTIFICATION_STORAGE_KEY);
  if (!raw) {
    safeStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(SEED_NOTIFICATIONS));
    return SEED_NOTIFICATIONS;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_NOTIFICATIONS;
  } catch {
    return SEED_NOTIFICATIONS;
  }
}

/**
 * Saves all notifications to storage
 */
export function setStoredNotifications(items: NotificationItem[]): void {
  safeStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(items));
}

export type StaffUserContext = {
  kind: 'staff';
  profile: Profile;
  accessibleBranchIds?: string[];
};

export type PatientUserContext = {
  kind: 'patient';
  patient: Patient;
  organization_id: string;
};

export type UserNotificationContext = StaffUserContext | PatientUserContext;

/**
 * Gets authorized notifications for a user context securely enforcing org_id, branch_id, and role/recipient isolation.
 */
export function getNotificationsForUser(context: UserNotificationContext): NotificationItem[] {
  const allNotifications = getStoredNotifications();

  if (context.kind === 'patient') {
    const patientId = context.patient.id;
    const orgId = context.organization_id || context.patient.organization_id;

    return allNotifications.filter((n) => {
      // Must match organization_id
      if (n.organization_id !== orgId) return false;
      // Must be recipient_type === 'patient' and recipient_id === patientId
      return n.recipient_type === 'patient' && n.recipient_id === patientId;
    });
  }

  if (context.kind === 'staff') {
    const profile = context.profile;
    const orgId = profile.organization_id;
    const roleKey = profile.role_key;
    const profileId = profile.id;
    const isCenterManager = roleKey === 'center_manager';
    const userBranchIds = new Set(
      context.accessibleBranchIds || (profile.branch_id ? [profile.branch_id] : [])
    );

    return allNotifications.filter((n) => {
      // 1. Strict Organization Isolation
      if (n.organization_id !== orgId) return false;

      // 2. Branch Scoping Check
      if (n.branch_id && !isCenterManager) {
        if (userBranchIds.size > 0 && !userBranchIds.has(n.branch_id)) {
          return false;
        }
      }

      // 3. Recipient Matching
      // Staff receives:
      // a) Specifically assigned to profile.id (recipient_type === 'staff' && recipient_id === profile.id)
      // b) Targeted at user's role (target_role === roleKey)
      // c) General staff notification (recipient_type === 'staff' && !recipient_id && !target_role)
      if (n.recipient_type === 'patient') return false; // Staff never sees patient private notifications

      if (n.recipient_id) {
        return n.recipient_id === profileId;
      }

      if (n.target_role) {
        return n.target_role === roleKey;
      }

      return true;
    });
  }

  return [];
}

/**
 * Creates a new notification entry and persists it to local storage and Supabase if active
 */
export function createNotification(params: CreateNotificationParams): NotificationItem {
  const newNotif: NotificationItem = {
    id: params.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'notif_' + Math.random().toString(36).substring(2, 11)),
    organization_id: params.organization_id,
    branch_id: params.branch_id || null,
    recipient_type: params.recipient_type,
    recipient_id: params.recipient_id || null,
    target_role: params.target_role || null,
    type: params.type,
    title_ar: params.title_ar,
    title_en: params.title_en,
    message_ar: params.message_ar,
    message_en: params.message_en,
    related_entity_type: params.related_entity_type,
    related_entity_id: params.related_entity_id,
    read: false,
    created_at: new Date().toISOString(),
    metadata: params.metadata,
  };

  const list = getStoredNotifications();
  list.unshift(newNotif);
  setStoredNotifications(list);

  // Persist asynchronously to Supabase if client is active
  if (supabase) {
    Promise.resolve(
      supabase
        .from('notifications')
        .insert({
          id: newNotif.id,
          organization_id: newNotif.organization_id,
          branch_id: newNotif.branch_id,
          recipient_type: newNotif.recipient_type,
          recipient_id: newNotif.recipient_id,
          target_role: newNotif.target_role,
          type: newNotif.type,
          title_ar: newNotif.title_ar,
          title_en: newNotif.title_en,
          message_ar: newNotif.message_ar,
          message_en: newNotif.message_en,
          related_entity_type: newNotif.related_entity_type || null,
          related_entity_id: newNotif.related_entity_id || null,
          read: newNotif.read,
          created_at: newNotif.created_at,
        })
    )
      .then(({ error }: any) => {
        if (error) {
          console.warn('Failed to persist notification to Supabase:', error.message);
        }
      })
      .catch((err: any) => {
        console.warn('Error inserting notification to Supabase:', err);
      });
  }

  return newNotif;
}

/**
 * Creates a new notification with explicit async Supabase persistence awaiting
 */
export async function createNotificationInSupabase(
  params: CreateNotificationParams
): Promise<NotificationItem> {
  const notif = createNotification(params);
  if (supabase) {
    const { error } = await supabase.from('notifications').insert({
      id: notif.id,
      organization_id: notif.organization_id,
      branch_id: notif.branch_id,
      recipient_type: notif.recipient_type,
      recipient_id: notif.recipient_id,
      target_role: notif.target_role,
      type: notif.type,
      title_ar: notif.title_ar,
      title_en: notif.title_en,
      message_ar: notif.message_ar,
      message_en: notif.message_en,
      related_entity_type: notif.related_entity_type || null,
      related_entity_id: notif.related_entity_id || null,
      read: notif.read,
      created_at: notif.created_at,
    });
    if (error) {
      throw new Error(`Supabase insert failed: ${error.message}`);
    }
  }
  return notif;
}

/**
 * Fetches notifications from Supabase, updates local cache, and returns authorized notifications
 */
export async function fetchNotificationsFromSupabase(
  context: UserNotificationContext
): Promise<NotificationItem[]> {
  if (!supabase) {
    return getNotificationsForUser(context);
  }

  try {
    let query = supabase.from('notifications').select('*');

    if (context.kind === 'patient') {
      const patientId = context.patient.id;
      const orgId = context.organization_id || context.patient.organization_id;
      query = query
        .eq('organization_id', orgId)
        .eq('recipient_type', 'patient')
        .eq('recipient_id', patientId);
    } else {
      const profile = context.profile;
      query = query
        .eq('organization_id', profile.organization_id)
        .neq('recipient_type', 'patient');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data && Array.isArray(data)) {
      const fetchedItems: NotificationItem[] = data.map((d: any) => ({
        id: d.id,
        organization_id: d.organization_id,
        branch_id: d.branch_id || null,
        recipient_type: d.recipient_type,
        recipient_id: d.recipient_id || null,
        target_role: d.target_role || null,
        type: d.type,
        title_ar: d.title_ar,
        title_en: d.title_en,
        message_ar: d.message_ar,
        message_en: d.message_en,
        related_entity_type: d.related_entity_type || null,
        related_entity_id: d.related_entity_id || null,
        read: Boolean(d.read),
        read_at: d.read_at || null,
        created_at: d.created_at,
      }));

      // Merge fetched items with local storage
      const existing = getStoredNotifications();
      const existingMap = new Map(existing.map((item) => [item.id, item]));
      fetchedItems.forEach((item) => {
        existingMap.set(item.id, item);
      });
      const merged = Array.from(existingMap.values());
      setStoredNotifications(merged);
    }
  } catch (err) {
    console.warn('Error fetching notifications from Supabase:', err);
  }

  return getNotificationsForUser(context);
}

/**
 * Marks a notification as read for an authorized user
 */
export function markNotificationAsRead(id: string, context: UserNotificationContext): boolean {
  const list = getStoredNotifications();
  const userNotifIds = new Set(getNotificationsForUser(context).map((n) => n.id));

  if (!userNotifIds.has(id)) {
    return false; // Unauthorized or not found
  }

  let updated = false;
  const now = new Date().toISOString();
  const updatedList = list.map((n) => {
    if (n.id === id) {
      updated = true;
      return {
        ...n,
        read: true,
        read_at: now,
      };
    }
    return n;
  });

  if (updated) {
    setStoredNotifications(updatedList);

    if (supabase) {
      Promise.resolve(
        supabase
          .from('notifications')
          .update({ read: true, read_at: now })
          .eq('id', id)
      )
        .then(({ error }: any) => {
          if (error) {
            console.warn('Failed to update notification read status in Supabase:', error.message);
          }
        })
        .catch((err: any) => {
          console.warn('Error updating notification read status in Supabase:', err);
        });
    }
  }
  return updated;
}

/**
 * Marks a notification as read with explicit async Supabase update awaiting
 */
export async function markNotificationAsReadInSupabase(
  id: string,
  context: UserNotificationContext
): Promise<boolean> {
  const success = markNotificationAsRead(id, context);
  if (success && supabase) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      throw new Error(`Supabase update failed: ${error.message}`);
    }
  }
  return success;
}

/**
 * Marks all notifications as read for an authorized user
 */
export function markAllNotificationsAsRead(context: UserNotificationContext): number {
  const userNotifs = getNotificationsForUser(context);
  const userNotifIds = new Set(userNotifs.map((n) => n.id));

  let count = 0;
  const now = new Date().toISOString();
  const list = getStoredNotifications();
  const updatedList = list.map((n) => {
    if (userNotifIds.has(n.id) && !n.read) {
      count++;
      return {
        ...n,
        read: true,
        read_at: now,
      };
    }
    return n;
  });

  if (count > 0) {
    setStoredNotifications(updatedList);

    if (supabase) {
      const targetIds = Array.from(userNotifIds);
      Promise.resolve(
        supabase
          .from('notifications')
          .update({ read: true, read_at: now })
          .in('id', targetIds)
      )
        .then(({ error }: any) => {
          if (error) {
            console.warn('Failed to mark all notifications as read in Supabase:', error.message);
          }
        })
        .catch((err: any) => {
          console.warn('Error marking all notifications as read in Supabase:', err);
        });
    }
  }
  return count;
}

/**
 * Marks all notifications as read with explicit async Supabase update awaiting
 */
export async function markAllNotificationsAsReadInSupabase(
  context: UserNotificationContext
): Promise<number> {
  const userNotifs = getNotificationsForUser(context);
  const unreadNotifIds = userNotifs.filter((n) => !n.read).map((n) => n.id);
  const count = markAllNotificationsAsRead(context);

  if (count > 0 && supabase && unreadNotifIds.length > 0) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .in('id', unreadNotifIds);
    if (error) {
      throw new Error(`Supabase mark all update failed: ${error.message}`);
    }
  }
  return count;
}

/**
 * Returns unread notification count for a user
 */
export function getUnreadNotificationCount(context: UserNotificationContext): number {
  const userNotifs = getNotificationsForUser(context);
  return userNotifs.filter((n) => !n.read).length;
}

/**
 * Resets notifications storage to default seeds
 */
export function resetNotificationsToSeeds(): void {
  setStoredNotifications(SEED_NOTIFICATIONS);
}

