/**
 * Wave 3: Communication Center, WhatsApp Messaging, Templates & Preferences Types
 * Dental Clinic & Dental Center Management Platform — Egypt
 */

export type WhatsAppMessageType =
  | 'appointment_confirmation'
  | 'appointment_reminder_24h'
  | 'appointment_reminder_same_day'
  | 'recall_notice'
  | 'payment_receipt'
  | 'post_treatment_instructions'
  | 'lab_prosthetic_update'
  | 'complaint_escalation_response'
  | 'custom_operational';

export type WhatsAppDeliveryState = 'queued' | 'sent' | 'delivered' | 'failed';

export interface WhatsAppMessageLog {
  id: string;
  organization_id: string;
  branch_id?: string | null;
  idempotency_key: string;
  recipient_patient_id?: string | null;
  recipient_mobile: string;
  recipient_name: string;
  message_type: WhatsAppMessageType;
  language: 'ar' | 'en';
  template_id?: string | null;
  rendered_body: string;
  delivery_state: WhatsAppDeliveryState;
  retry_count: number;
  max_retries: number;
  error_message?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface MessageTemplate {
  id: string;
  organization_id: string;
  type: WhatsAppMessageType;
  name_ar: string;
  name_en: string;
  body_ar: string;
  body_en: string;
  allowed_placeholders: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by_user_id?: string | null;
}

export interface PatientCommunicationPreference {
  patient_id: string;
  organization_id: string;
  whatsapp_enabled: boolean;
  in_app_enabled: boolean;
  preferred_language: 'ar' | 'en';
  reminder_lead_hours: 12 | 24 | 48;
  guardian_inheritance_enabled: boolean;
  updated_at: string;
}

export interface SendWhatsAppMessageParams {
  organizationId: string;
  branchId?: string | null;
  recipientPatientId?: string | null;
  recipientMobile: string;
  recipientName: string;
  messageType: WhatsAppMessageType;
  language?: 'ar' | 'en';
  templateId?: string | null;
  placeholders?: Record<string, string>;
  customBody?: string;
  idempotencyKey: string;
  createdByUserId?: string | null;
  isMandatoryClinical?: boolean;
}
