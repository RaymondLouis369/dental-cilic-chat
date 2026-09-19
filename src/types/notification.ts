/**
 * Phase 9.1: Notifications Foundation Types
 * Dental Clinic & Dental Center Management Platform — Egypt
 */

import { RoleKey } from './index';

export type RecipientType = 'patient' | 'staff' | 'role';

export type NotificationType =
  | 'reception_task'
  | 'consent_required'
  | 'investigation_result'
  | 'referral_created'
  | 'insurance_approval'
  | 'lab_order_status'
  | 'delivery_status'
  | 'payment_invoice'
  | 'appointment_event'
  | 'system';

export interface NotificationItem {
  id: string;
  organization_id: string;
  branch_id?: string | null;
  recipient_type: RecipientType;
  recipient_id?: string | null; // Profile ID for staff, Patient ID for patient, or null for role-targeted
  target_role?: RoleKey | null; // Role targeted notifications (e.g. 'receptionist', 'doctor', 'lab_user', etc.)
  type: NotificationType;
  title_ar: string;
  title_en: string;
  message_ar: string;
  message_en: string;
  related_entity_type?: string; // e.g. 'reception_task', 'lab_order', 'consent', 'investigation', 'referral', 'invoice', 'appointment'
  related_entity_id?: string;
  read: boolean;
  read_at?: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface CreateNotificationParams {
  id?: string;
  organization_id: string;
  branch_id?: string | null;
  recipient_type: RecipientType;
  recipient_id?: string | null;
  target_role?: RoleKey | null;
  type: NotificationType;
  title_ar: string;
  title_en: string;
  message_ar: string;
  message_en: string;
  related_entity_type?: string;
  related_entity_id?: string;
  metadata?: Record<string, unknown>;
}
