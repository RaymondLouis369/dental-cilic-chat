/**
 * Phase 09.3: Complaints & Support Tickets Types
 * Dental Clinic & Dental Center Management Platform — Egypt
 */

import { RoleKey } from './index';

export type TicketCategory =
  | 'Appointment'
  | 'Reception'
  | 'Billing'
  | 'Insurance'
  | 'Clinical'
  | 'Lab/Prosthetics'
  | 'Medication'
  | 'Other';

export type TicketPriority = 'normal' | 'urgent' | 'critical';

export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_patient'
  | 'escalated'
  | 'resolved'
  | 'closed';

export interface TicketReply {
  id: string;
  ticket_id: string;
  sender_type: 'patient' | 'staff';
  sender_id: string;
  sender_name: string;
  sender_role?: RoleKey | null;
  message: string;
  is_internal: boolean; // CRITICAL: Internal staff notes are hidden from patients
  created_at: string;
}

export interface SupportTicket {
  id: string; // ticket_id
  ticket_number: string; // e.g. TKT-2026-001
  organization_id: string;
  branch_id: string;
  patient_id: string;
  patient_name?: string;
  patient_phone?: string;
  category: TicketCategory;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to?: string | null; // Staff Profile ID
  assigned_to_name?: string | null;
  escalated_to_role?: RoleKey | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  replies: TicketReply[];
}

export interface CreateTicketParams {
  organizationId: string;
  branchId: string;
  patientId: string;
  patientName?: string;
  patientPhone?: string;
  category: TicketCategory;
  subject: string;
  description: string;
  priority?: TicketPriority;
  assignedTo?: string | null;
  assignedToName?: string | null;
  createdByStaffId?: string | null; // if created by reception staff on behalf of patient
}

export interface FilterTicketParams {
  organizationId: string;
  branchId?: string | null;
  patientId?: string | null;
  category?: TicketCategory | 'all';
  status?: TicketStatus | 'all';
  priority?: TicketPriority | 'all';
  assignedTo?: string | null;
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
  forPatient?: boolean; // When true, filters out internal replies and restricts patient access
}
