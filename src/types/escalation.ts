/**
 * Phase 10.3: Human Escalation & Staff Reply Workflow Types
 * Dental Clinic & Dental Center Management Platform — Egypt
 */

import { RoleKey } from './index';

export type EscalationCategory =
  | 'medical_symptom'
  | 'unresolved_ai'
  | 'treatment_inquiry'
  | 'appointment_conflict'
  | 'billing_insurance'
  | 'general';

export type EscalationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type EscalationStatus = 'pending' | 'claimed' | 'resolved' | 'reopened' | 'released';

export interface HumanEscalation {
  id: string;
  organization_id: string;
  branch_id: string | null;
  patient_id: string;
  chat_message_id: string | null;
  category: EscalationCategory;
  priority: EscalationPriority;
  status: EscalationStatus;
  assigned_staff_id: string | null;
  assigned_staff_name: string | null;
  assigned_staff_role: RoleKey | null;
  subject: string;
  original_prompt: string;
  ai_response_summary?: string | null;
  medical_disclaimer?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  resolved_by_id?: string | null;
}

export interface EscalationReply {
  id: string;
  escalation_id: string;
  sender_type: 'patient' | 'staff' | 'system';
  sender_id: string;
  sender_name: string;
  sender_role?: RoleKey | string | null;
  message: string;
  created_at: string;
}

export interface CreateEscalationParams {
  id?: string;
  organization_id: string;
  branch_id?: string | null;
  patient_id: string;
  chat_message_id?: string | null;
  category?: EscalationCategory;
  priority?: EscalationPriority;
  subject: string;
  original_prompt: string;
  ai_response_summary?: string | null;
}

export interface ReplyEscalationParams {
  escalation_id: string;
  message: string;
  sender_type: 'patient' | 'staff' | 'system';
  sender_id: string;
  sender_name: string;
  sender_role?: RoleKey | string | null;
}
