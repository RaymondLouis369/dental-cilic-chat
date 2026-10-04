/**
 * Phase 11.1: Appointment & Scheduling Engine Types
 * Dental Clinic & Dental Center Management Platform — Egypt
 */

import { RoleKey } from './index';

export type AppointmentStatus =
  | 'confirmed'
  | 'arrived'
  | 'waiting'
  | 'with_doctor'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled'
  | 'late';

export type AppointmentType =
  | 'consultation'
  | 'treatment'
  | 'follow_up'
  | 'cleaning'
  | 'prosthetic'
  | 'orthodontic'
  | 'emergency'
  | 'general';

export type BookingType = 'scheduled' | 'walk_in';

export type ConfirmationStatus =
  | 'pending_confirmation'
  | 'patient_confirmed'
  | 'reception_confirmed'
  | 'cancelled';

export interface Appointment {
  id: string;
  organization_id: string;
  branch_id: string;
  patient_id: string;
  doctor_id: string;
  service_id?: string;
  appointment_date: string; // YYYY-MM-DD
  date?: string; // Alias for appointment_date
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  duration_minutes: number;
  status: AppointmentStatus;
  confirmation_status?: ConfirmationStatus;
  confirmed_at?: string;
  confirmed_by?: string;
  reminder_24h_sent_at?: string;
  reminder_sameday_sent_at?: string;
  appointment_type?: AppointmentType;
  booking_type?: BookingType;
  notes?: string;
  cancellation_reason?: string;
  check_in_time?: string;
  check_in_token?: string;
  treatment_plan_id?: string;
  treatment_service_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DoctorSlot {
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_available: boolean;
  conflict_reason?: string;
  existing_appointment_id?: string;
}

export interface AppointmentFilters {
  organization_id?: string;
  branch_id?: string;
  doctor_id?: string;
  patient_id?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  status?: AppointmentStatus | 'all';
  appointment_type?: AppointmentType | 'all';
  search?: string;
}

export interface CreateAppointmentInput {
  organization_id?: string;
  branch_id: string;
  patient_id: string;
  doctor_id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time?: string; // HH:MM (calculated if omitted)
  duration_minutes?: number;
  status?: AppointmentStatus;
  appointment_type?: AppointmentType;
  service_id?: string;
  treatment_plan_id?: string;
  treatment_service_id?: string;
  notes?: string;
  created_by?: string;
}

export interface RescheduleAppointmentInput {
  appointment_id: string;
  new_date: string;
  new_start_time: string;
  new_end_time?: string;
  reason?: string;
}

export interface AppointmentCallerContext {
  userId?: string;
  profileId?: string;
  roleKey?: RoleKey;
  patientId?: string;
  organizationId: string;
  assignedBranchIds?: string[];
  isOrgWideManager?: boolean;
  isPatientPortal?: boolean;
}
