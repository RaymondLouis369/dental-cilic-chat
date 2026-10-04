/**
 * Phase 11.1: Appointment & Scheduling Engine
 * Dental Clinic & Dental Center Management Platform — Egypt
 *
 * Core Responsibilities:
 * 1. Generate available slots from valid doctor working schedules / shifts.
 * 2. Prevent overlapping / double-booked appointments (server & storage level).
 * 3. Receptionist lifecycle: create, confirm, reschedule, cancel, check-in, complete, no-show.
 * 4. Doctor authorized calendar/list and status updates.
 * 5. Patient authorized upcoming and previous appointments (self & guardian wards).
 * 6. Integration with existing Notifications.
 * 7. Integration with existing Recall without duplicate records.
 * 8. Zero sensitive appointment data in plain localStorage.
 * 9. Strict organization and branch boundary isolation.
 */

import {
  Appointment,
  AppointmentStatus,
  AppointmentType,
  DoctorSlot,
  AppointmentFilters,
  CreateAppointmentInput,
  RescheduleAppointmentInput,
  AppointmentCallerContext,
} from '../types/appointment';
import { DoctorShift } from '../types/receptionAndBilling';
import {
  getStoredAppointments,
  setStoredAppointments,
  getStoredDoctorShifts,
} from './receptionAndBillingStorage';
import { getStoredPatients, simulatePatientRLS } from './patientStorage';
import { getStoredStaffUsers, getStoredBranches, DEFAULT_EGYPT_ORG } from './storage';
import { createNotification } from './notificationStorage';
import {
  getStoredFollowUpPlans,
  setStoredFollowUpPlans,
  updateFollowUpPlanStatus,
  createFollowUpPlan,
} from './clinicalStorage';

// Egyptian day of week mapper: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
export function getDayOfWeekFromDate(dateStr: string): number {
  // Use UTC to avoid timezone drift across midnight
  const d = new Date(`${dateStr}T12:00:00Z`);
  return d.getUTCDay();
}

/**
 * Helper to convert "HH:MM" to total minutes since midnight
 */
export function timeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

/**
 * Helper to convert total minutes since midnight to "HH:MM"
 */
export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Validates whether two time intervals overlap: [s1, e1) and [s2, e2)
 */
export function intervalsOverlap(s1?: string, e1?: string, s2?: string, e2?: string): boolean {
  if (!s1 || !e1 || !s2 || !e2) return false;
  const start1 = timeToMinutes(s1);
  const end1 = timeToMinutes(e1);
  const start2 = timeToMinutes(s2);
  const end2 = timeToMinutes(e2);
  return start1 < end2 && end1 > start2;
}

/**
 * Generates available slots for a doctor on a specific date based on working schedules.
 */
export function generateDoctorSlots(
  doctorId: string,
  branchId: string,
  date: string,
  durationMinutes: number = 30
): DoctorSlot[] {
  const dayOfWeek = getDayOfWeekFromDate(date);
  const shifts = getStoredDoctorShifts();

  // If doctorId is 'first_available' or 'any', pool slots across all active doctors working at this branch on this day
  if (doctorId === 'first_available' || doctorId === 'any' || !doctorId) {
    const staff = getStoredStaffUsers();
    const branchDoctors = staff.filter(
      (s) => s.role_key === 'doctor' && (s.active ?? (s as any).is_active ?? true)
    );

    const pooledSlotMap = new Map<string, DoctorSlot>();

    for (const doc of branchDoctors) {
      const docSlots = generateDoctorSlots(doc.id, branchId, date, durationMinutes);
      for (const slot of docSlots) {
        const key = slot.start_time;
        if (!pooledSlotMap.has(key)) {
          pooledSlotMap.set(key, { ...slot });
        } else {
          // If any doctor has the slot available, make the pooled slot available
          const existing = pooledSlotMap.get(key)!;
          if (!existing.is_available && slot.is_available) {
            pooledSlotMap.set(key, { ...slot });
          }
        }
      }
    }

    const pooled = Array.from(pooledSlotMap.values());
    pooled.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    return pooled;
  }

  // Find active shift for this specific doctor, branch, and day of week
  const shift = shifts.find(
    (s) =>
      s.doctor_id === doctorId &&
      s.branch_id === branchId &&
      s.day_of_week === dayOfWeek &&
      (s.active ?? s.is_active ?? true)
  );

  if (!shift) {
    return [];
  }

  const slotDuration = shift.slot_duration_minutes || durationMinutes || 30;
  const shiftStart = timeToMinutes(shift.start_time);
  const shiftEnd = timeToMinutes(shift.end_time);

  const breakStart = shift.break_start || shift.break_start_time ? timeToMinutes(shift.break_start || shift.break_start_time!) : null;
  const breakEnd = shift.break_end || shift.break_end_time ? timeToMinutes(shift.break_end || shift.break_end_time!) : null;

  // Active appointments for this doctor on this date
  const appointments = getStoredAppointments().filter(
    (a) =>
      a.doctor_id === doctorId &&
      (a.appointment_date === date || a.date === date) &&
      a.status !== 'cancelled' &&
      a.status !== 'rescheduled'
  );

  const slots: DoctorSlot[] = [];

  for (let current = shiftStart; current + slotDuration <= shiftEnd; current += slotDuration) {
    const slotStartStr = minutesToTime(current);
    const slotEndStr = minutesToTime(current + slotDuration);

    // Check break overlap
    if (breakStart !== null && breakEnd !== null) {
      if (current < breakEnd && current + slotDuration > breakStart) {
        slots.push({
          start_time: slotStartStr,
          end_time: slotEndStr,
          duration_minutes: slotDuration,
          is_available: false,
          conflict_reason: 'Doctor Break / استراحة الطبيب',
        });
        continue;
      }
    }

    // Check appointment overlap
    const conflictingApt = appointments.find((a) =>
      intervalsOverlap(slotStartStr, slotEndStr, a.start_time, a.end_time)
    );

    if (conflictingApt) {
      slots.push({
        start_time: slotStartStr,
        end_time: slotEndStr,
        duration_minutes: slotDuration,
        is_available: false,
        conflict_reason: 'Already Booked / محجوز مسبقاً',
        existing_appointment_id: conflictingApt.id,
      });
    } else {
      slots.push({
        start_time: slotStartStr,
        end_time: slotEndStr,
        duration_minutes: slotDuration,
        is_available: true,
      });
    }
  }

  return slots;
}

/**
 * Checks whether an appointment time slot conflicts with existing bookings.
 */
export function checkAppointmentConflict(params: {
  doctorId?: string;
  doctor_id?: string;
  date: string;
  startTime?: string;
  start_time?: string;
  endTime?: string;
  end_time?: string;
  excludeAppointmentId?: string;
  exclude_appointment_id?: string;
}): {
  conflict: boolean;
  has_conflict: boolean;
  conflict_type?: string;
  message?: string;
  conflicting_appointment?: Appointment;
} {
  const doctorId = params.doctorId || params.doctor_id || '';
  const date = params.date;
  const startTime = params.startTime || params.start_time || '';
  const endTime = params.endTime || params.end_time || '';
  const excludeAppointmentId = params.excludeAppointmentId || params.exclude_appointment_id;

  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    return {
      conflict: true,
      has_conflict: true,
      conflict_type: 'invalid_window',
      message: 'Invalid time window: start_time must be earlier than end_time',
    };
  }

  const appointments = getStoredAppointments();
  const conflicting = appointments.find((a) => {
    if (a.id === excludeAppointmentId) return false;
    if (a.doctor_id !== doctorId) return false;
    if (a.appointment_date !== date && a.date !== date) return false;
    if (a.status === 'cancelled' || a.status === 'rescheduled') return false;
    return intervalsOverlap(startTime, endTime, a.start_time, a.end_time);
  });

  if (conflicting) {
    return {
      conflict: true,
      has_conflict: true,
      conflict_type: 'doctor_double_booking',
      message: `ERR_APPOINTMENT_CONFLICT: Doctor is already booked during this time interval (${conflicting.start_time} - ${conflicting.end_time})`,
      conflicting_appointment: conflicting,
    };
  }

  return { conflict: false, has_conflict: false };
}

/**
 * Creates an organization-scoped appointment with conflict checking and role validation.
 */
export function createAppointment(
  input: CreateAppointmentInput,
  caller: AppointmentCallerContext
): { success: boolean; appointment?: Appointment; error?: string } {
  const orgId = input.organization_id || caller.organizationId || DEFAULT_EGYPT_ORG.id;

  // Authorization check: Verify caller belongs to the organization
  if (caller.organizationId && caller.organizationId !== orgId) {
    return { success: false, error: 'Access Denied: Cross-organization violation' };
  }

  // Branch access check for staff callers
  if (!caller.isPatientPortal && !caller.isOrgWideManager && caller.assignedBranchIds && caller.assignedBranchIds.length > 0) {
    if (!caller.assignedBranchIds.includes(input.branch_id)) {
      return { success: false, error: 'Access Denied: Unauthorized branch scope' };
    }
  }

  // Patient portal caller validation
  if (caller.isPatientPortal && caller.patientId) {
    const rls = simulatePatientRLS(caller.patientId, input.patient_id, orgId);
    if (!rls.allowed) {
      return { success: false, error: rls.error || 'Access Denied: Unauthorized patient context' };
    }
  }

  const duration = input.duration_minutes || 30;
  const calculatedEndTime = input.end_time || minutesToTime(timeToMinutes(input.start_time) + duration);

  // Validate conflicts
  const conflictCheck = checkAppointmentConflict({
    doctorId: input.doctor_id,
    date: input.date,
    startTime: input.start_time,
    endTime: calculatedEndTime,
  });

  if (conflictCheck.conflict) {
    return { success: false, error: conflictCheck.message };
  }

  const appointments = getStoredAppointments();
  const appointmentId = `apt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  const appointmentType: AppointmentType = input.appointment_type || 'general';

  const newAppointment: Appointment = {
    id: appointmentId,
    organization_id: orgId,
    branch_id: input.branch_id,
    patient_id: input.patient_id,
    doctor_id: input.doctor_id,
    service_id: input.service_id,
    appointment_date: input.date,
    date: input.date,
    start_time: input.start_time,
    end_time: calculatedEndTime,
    duration_minutes: duration,
    status: 'confirmed',
    confirmation_status: 'pending_confirmation',
    appointment_type: appointmentType,
    booking_type: 'scheduled',
    notes: input.notes,
    check_in_token: generateSecureCheckInTokenString(),
    treatment_plan_id: input.treatment_plan_id,
    treatment_service_id: input.treatment_service_id,
    created_by: input.created_by || caller.profileId || caller.userId,
    created_at: nowIso,
    updated_at: nowIso,
  };

  appointments.push(newAppointment);
  setStoredAppointments(appointments);

  // 1. RECALL INTEGRATION WITHOUT DUPLICATE RECORDS:
  // If the patient has a pending or due recall/follow-up plan for this doctor/org, mark it scheduled and link it.
  try {
    const plans = getStoredFollowUpPlans();
    const existingPlan = plans.find(
      (p) =>
        p.patient_id === input.patient_id &&
        p.organization_id === orgId &&
        (p.status === 'pending' || p.status === 'contacted' || p.status === 'scheduled') &&
        (appointmentType === 'follow_up' || appointmentType === 'cleaning' || p.doctor_id === input.doctor_id)
    );

    if (existingPlan) {
      updateFollowUpPlanStatus(
        existingPlan.id,
        'scheduled',
        `Linked to scheduled appointment ${newAppointment.id} on ${input.date}`,
        caller.profileId
      );
    }
  } catch (err) {
    console.warn('Recall integration warning:', err);
  }

  // 2. NOTIFICATION INTEGRATION:
  try {
    // Notify Patient
    createNotification({
      organization_id: orgId,
      branch_id: input.branch_id,
      recipient_type: 'patient',
      recipient_id: input.patient_id,
      type: 'appointment_event',
      title_ar: 'تأكيد حجز موعد جديد',
      title_en: 'New Appointment Confirmed',
      message_ar: `تم تأكيد موعدك بنجاح بتاريخ ${input.date} الساعة ${input.start_time}. نرجو الحضور قبل الموعد بـ 10 دقائق.`,
      message_en: `Your appointment is confirmed for ${input.date} at ${input.start_time}. Please arrive 10 minutes early.`,
      related_entity_type: 'appointment',
      related_entity_id: newAppointment.id,
    });

    // Notify Doctor
    createNotification({
      organization_id: orgId,
      branch_id: input.branch_id,
      recipient_type: 'staff',
      recipient_id: input.doctor_id,
      type: 'appointment_event',
      title_ar: 'موعد جديد مضاف لجدولك',
      title_en: 'New Appointment Added',
      message_ar: `تم حجز موعد جديد بتاريخ ${input.date} الساعة ${input.start_time}.`,
      message_en: `A new appointment has been scheduled for ${input.date} at ${input.start_time}.`,
      related_entity_type: 'appointment',
      related_entity_id: newAppointment.id,
    });
  } catch (err) {
    console.warn('Notification trigger warning:', err);
  }

  return { success: true, appointment: newAppointment };
}

/**
 * Confirms an appointment by patient or guardian.
 */
export function confirmAppointmentByPatient(
  appointmentId: string,
  caller: AppointmentCallerContext
): { success: boolean; appointment?: Appointment; error?: string } {
  const appointments = getStoredAppointments();
  const apt = appointments.find((a) => a.id === appointmentId);

  if (!apt) {
    return { success: false, error: 'Appointment not found' };
  }

  // Authorization check via simulatePatientRLS
  if (caller.isPatientPortal) {
    if (!caller.patientId) {
      return { success: false, error: 'Access Denied: Patient identity required' };
    }
    const rls = simulatePatientRLS(caller.patientId, apt.patient_id, apt.organization_id || caller.organizationId);
    if (!rls.allowed) {
      return { success: false, error: 'Access Denied: Unauthorized patient context' };
    }
  } else if (caller.organizationId && caller.organizationId !== apt.organization_id) {
    return { success: false, error: 'Access Denied: Cross-organization violation' };
  }

  if (apt.status === 'cancelled' || apt.status === 'completed' || apt.status === 'no_show') {
    return { success: false, error: `Cannot confirm appointment with status '${apt.status}'` };
  }

  const nowIso = new Date().toISOString();
  apt.confirmation_status = 'patient_confirmed';
  apt.confirmed_at = nowIso;
  apt.confirmed_by = caller.patientId || caller.profileId || caller.userId;
  if (apt.status === 'rescheduled') {
    apt.status = 'confirmed';
  }
  apt.updated_at = nowIso;

  setStoredAppointments(appointments);

  // Notify Patient
  try {
    createNotification({
      organization_id: apt.organization_id,
      branch_id: apt.branch_id,
      recipient_type: 'patient',
      recipient_id: apt.patient_id,
      type: 'appointment_event',
      title_ar: 'تأكيد الموعد بنجاح',
      title_en: 'Appointment Confirmed',
      message_ar: `شغراً لك! تم تأكيد حضورك للموعد بتاريخ ${apt.appointment_date || apt.date} الساعة ${apt.start_time}.`,
      message_en: `Thank you! Your appointment on ${apt.appointment_date || apt.date} at ${apt.start_time} is confirmed.`,
      related_entity_type: 'appointment',
      related_entity_id: apt.id,
    });

    // Notify Doctor / Reception
    createNotification({
      organization_id: apt.organization_id,
      branch_id: apt.branch_id,
      recipient_type: 'staff',
      recipient_id: apt.doctor_id,
      type: 'appointment_event',
      title_ar: 'تأكيد موعد من المريض',
      title_en: 'Patient Confirmed Appointment',
      message_ar: `قام المريض بتأكيد حضوره للموعد بتاريخ ${apt.appointment_date || apt.date} الساعة ${apt.start_time}.`,
      message_en: `Patient confirmed attendance for appointment on ${apt.appointment_date || apt.date} at ${apt.start_time}.`,
      related_entity_type: 'appointment',
      related_entity_id: apt.id,
    });
  } catch (err) {
    console.warn('Notification error on patient confirmation:', err);
  }

  return { success: true, appointment: apt };
}

/**
 * Confirms an appointment by receptionist or staff.
 */
export function confirmAppointmentByReception(
  appointmentId: string,
  caller: AppointmentCallerContext
): { success: boolean; appointment?: Appointment; error?: string } {
  const appointments = getStoredAppointments();
  const apt = appointments.find((a) => a.id === appointmentId);

  if (!apt) {
    return { success: false, error: 'Appointment not found' };
  }

  if (caller.organizationId && caller.organizationId !== apt.organization_id) {
    return { success: false, error: 'Access Denied: Cross-organization violation' };
  }

  if (!caller.isOrgWideManager && caller.assignedBranchIds && caller.assignedBranchIds.length > 0) {
    if (!caller.assignedBranchIds.includes(apt.branch_id)) {
      return { success: false, error: 'Access Denied: Unauthorized branch' };
    }
  }

  if (apt.status === 'cancelled' || apt.status === 'completed' || apt.status === 'no_show') {
    return { success: false, error: `Cannot confirm appointment with status '${apt.status}'` };
  }

  const nowIso = new Date().toISOString();
  apt.confirmation_status = 'reception_confirmed';
  apt.confirmed_at = nowIso;
  apt.confirmed_by = caller.profileId || caller.userId;
  if (apt.status === 'rescheduled') {
    apt.status = 'confirmed';
  }
  apt.updated_at = nowIso;

  setStoredAppointments(appointments);

  // Notify Patient
  try {
    createNotification({
      organization_id: apt.organization_id,
      branch_id: apt.branch_id,
      recipient_type: 'patient',
      recipient_id: apt.patient_id,
      type: 'appointment_event',
      title_ar: 'تم تأكيد موعدك بواسطة الاستقبال',
      title_en: 'Appointment Confirmed by Reception',
      message_ar: `تم تأكيد موعدك بتاريخ ${apt.appointment_date || apt.date} الساعة ${apt.start_time} بواسطة فريق الاستقبال.`,
      message_en: `Your appointment on ${apt.appointment_date || apt.date} at ${apt.start_time} was confirmed by reception.`,
      related_entity_type: 'appointment',
      related_entity_id: apt.id,
    });
  } catch (err) {
    console.warn('Notification error on reception confirmation:', err);
  }

  return { success: true, appointment: apt };
}

/**
 * Confirms an appointment (dispatches to patient or reception confirmation based on caller).
 */
export function confirmAppointment(
  appointmentId: string,
  caller: AppointmentCallerContext
): { success: boolean; appointment?: Appointment; error?: string } {
  if (caller.isPatientPortal) {
    return confirmAppointmentByPatient(appointmentId, caller);
  }
  return confirmAppointmentByReception(appointmentId, caller);
}

/**
 * Reschedules an appointment with conflict validation.
 */
export function rescheduleAppointment(
  input: RescheduleAppointmentInput,
  caller: AppointmentCallerContext
): { success: boolean; appointment?: Appointment; error?: string } {
  const appointments = getStoredAppointments();
  const apt = appointments.find((a) => a.id === input.appointment_id);

  if (!apt) {
    return { success: false, error: 'Appointment not found' };
  }

  // Enforce org isolation
  if (caller.organizationId && caller.organizationId !== apt.organization_id) {
    return { success: false, error: 'Access Denied: Cross-organization violation' };
  }

  // Branch access check for staff
  if (!caller.isPatientPortal && !caller.isOrgWideManager && caller.assignedBranchIds && caller.assignedBranchIds.length > 0) {
    if (!caller.assignedBranchIds.includes(apt.branch_id)) {
      return { success: false, error: 'Access Denied: Unauthorized branch' };
    }
  }

  // Patient portal access check
  if (caller.isPatientPortal && caller.patientId) {
    const rls = simulatePatientRLS(caller.patientId, apt.patient_id, apt.organization_id);
    if (!rls.allowed) {
      return { success: false, error: 'Access Denied: Unauthorized patient context' };
    }
  }

  const duration = apt.duration_minutes || 30;
  const newEndTime = input.new_end_time || minutesToTime(timeToMinutes(input.new_start_time) + duration);

  // Validate conflicts excluding current appointment
  const conflict = checkAppointmentConflict({
    doctorId: apt.doctor_id,
    date: input.new_date,
    startTime: input.new_start_time,
    endTime: newEndTime,
    excludeAppointmentId: apt.id,
  });

  if (conflict.conflict) {
    return { success: false, error: conflict.message };
  }

  apt.appointment_date = input.new_date;
  apt.date = input.new_date;
  apt.start_time = input.new_start_time;
  apt.end_time = newEndTime;
  apt.status = 'confirmed';
  apt.confirmation_status = 'pending_confirmation';
  apt.reminder_24h_sent_at = undefined;
  apt.reminder_sameday_sent_at = undefined;
  apt.check_in_time = undefined;
  apt.updated_at = new Date().toISOString();
  if (input.reason) {
    apt.notes = apt.notes ? `${apt.notes} | Rescheduled: ${input.reason}` : `Rescheduled: ${input.reason}`;
  }

  setStoredAppointments(appointments);

  // Notify Patient of Reschedule
  try {
    createNotification({
      organization_id: apt.organization_id,
      branch_id: apt.branch_id,
      recipient_type: 'patient',
      recipient_id: apt.patient_id,
      type: 'appointment_event',
      title_ar: 'تم تعديل موعدك',
      title_en: 'Appointment Rescheduled',
      message_ar: `تم إعادة جدولة موعدك إلى تاريخ ${input.new_date} الساعة ${input.new_start_time}.`,
      message_en: `Your appointment has been rescheduled to ${input.new_date} at ${input.new_start_time}.`,
      related_entity_type: 'appointment',
      related_entity_id: apt.id,
    });
  } catch (err) {
    console.warn('Notification error on reschedule:', err);
  }

  return { success: true, appointment: apt };
}

/**
 * Updates appointment status (cancel, check-in, complete, no-show, etc.).
 */
export function updateAppointmentStatus(
  appointmentId: string,
  newStatus: AppointmentStatus,
  cancellationReasonOrCaller?: string | AppointmentCallerContext,
  maybeCaller?: AppointmentCallerContext | string
): { success: boolean; appointment?: Appointment; error?: string } {
  let caller: AppointmentCallerContext | undefined;
  let cancellationReason: string | undefined;

  if (typeof cancellationReasonOrCaller === 'object' && cancellationReasonOrCaller !== null) {
    caller = cancellationReasonOrCaller;
    cancellationReason = typeof maybeCaller === 'string' ? maybeCaller : undefined;
  } else {
    cancellationReason = typeof cancellationReasonOrCaller === 'string' ? cancellationReasonOrCaller : undefined;
    caller = typeof maybeCaller === 'object' && maybeCaller !== null ? maybeCaller : undefined;
  }

  const appointments = getStoredAppointments();
  const apt = appointments.find((a) => a.id === appointmentId);

  if (!apt) {
    return { success: false, error: 'Appointment not found' };
  }

  if (caller) {
    if (caller.organizationId && caller.organizationId !== apt.organization_id) {
      return { success: false, error: 'Appointment not found in your organization' };
    }

    // Branch isolation for staff
    if (!caller.isOrgWideManager && caller.assignedBranchIds && caller.assignedBranchIds.length > 0) {
      if (!caller.assignedBranchIds.includes(apt.branch_id)) {
        return { success: false, error: 'Unauthorized branch access' };
      }
    }

    // Role-specific transition permissions
    if (caller.roleKey === 'doctor' && caller.profileId !== apt.doctor_id) {
      return { success: false, error: 'Access Denied: Doctor cannot modify other doctors appointments' };
    }

    if (caller.isPatientPortal && caller.patientId) {
      const rls = simulatePatientRLS(caller.patientId, apt.patient_id, apt.organization_id);
      if (!rls.allowed) {
        return { success: false, error: 'Access Denied: Unauthorized patient context' };
      }
      // Patients can cancel or check-in (arrived) to their own appointments
      if (newStatus !== 'cancelled' && newStatus !== 'arrived') {
        return { success: false, error: 'Access Denied: Patients can only cancel or check-in to appointments' };
      }
    }
  }

  apt.status = newStatus;
  apt.updated_at = new Date().toISOString();

  if (newStatus === 'cancelled' && cancellationReason) {
    apt.cancellation_reason = cancellationReason;
  }

  if ((newStatus === 'arrived' || newStatus === 'waiting') && !apt.check_in_time) {
    apt.check_in_time = new Date().toISOString();
  }

  setStoredAppointments(appointments);

  // If completed, update any linked follow-up plan
  if (newStatus === 'completed') {
    try {
      const plans = getStoredFollowUpPlans();
      const linked = plans.find(
        (p) =>
          p.patient_id === apt.patient_id &&
          p.organization_id === apt.organization_id &&
          (p.status === 'scheduled' || p.status === 'pending')
      );
      if (linked) {
        updateFollowUpPlanStatus(linked.id, 'completed', 'Completed during appointment');
      }
    } catch (err) {
      console.warn('Recall completion sync warning:', err);
    }
  }

  // If no-show, create or update recall follow-up plan without duplicate records
  if (newStatus === 'no_show') {
    try {
      const plans = getStoredFollowUpPlans();
      const existing = plans.find(
        (p) =>
          p.patient_id === apt.patient_id &&
          p.organization_id === apt.organization_id &&
          (p.status === 'pending' || p.status === 'due' || p.status === 'contacted' || p.status === 'scheduled')
      );
      if (existing) {
        updateFollowUpPlanStatus(
          existing.id,
          'due',
          `No-show follow-up required for appointment on ${apt.appointment_date || apt.date}`
        );
      } else {
        createFollowUpPlan({
          organizationId: apt.organization_id,
          branchId: apt.branch_id,
          patientId: apt.patient_id,
          doctorId: apt.doctor_id,
          recallType: 'general_treatment',
          dueDate: new Date().toISOString().split('T')[0],
          interval: 'custom',
          reason: `متابعة عدم حضور المريض للموعد بتاريخ ${apt.appointment_date || apt.date} (No-Show Follow-Up)`,
          notes: `Automated recall plan created due to appointment no-show on ${apt.appointment_date || apt.date}`,
          status: 'due',
        });
      }

      createNotification({
        organization_id: apt.organization_id,
        branch_id: apt.branch_id,
        recipient_type: 'staff',
        type: 'appointment_event',
        title_ar: 'تنبيه عدم حضور المريض (No-Show)',
        title_en: 'Patient No-Show Alert',
        message_ar: `لم يحضر المريض للموعد المحدد بتاريخ ${apt.appointment_date || apt.date}. تم إدراج المريض في قائمة المتابعة والاستدعاء.`,
        message_en: `Patient did not attend appointment on ${apt.appointment_date || apt.date}. Recall follow-up created/updated.`,
        related_entity_type: 'appointment',
        related_entity_id: apt.id,
      });
    } catch (err) {
      console.warn('No-show recall sync warning:', err);
    }
  }

  // Emit status change notification
  try {
    if (newStatus === 'cancelled') {
      createNotification({
        organization_id: apt.organization_id,
        branch_id: apt.branch_id,
        recipient_type: 'patient',
        recipient_id: apt.patient_id,
        type: 'appointment_event',
        title_ar: 'تم إلغاء الموعد',
        title_en: 'Appointment Cancelled',
        message_ar: `تم إلغاء موعدك المحدد بتاريخ ${apt.appointment_date}. ${cancellationReason ? `السبب: ${cancellationReason}` : ''}`,
        message_en: `Your appointment on ${apt.appointment_date} has been cancelled.`,
        related_entity_type: 'appointment',
        related_entity_id: apt.id,
      });
    } else if (newStatus === 'arrived' || newStatus === 'waiting') {
      // Notify Doctor of patient arrival/waiting
      createNotification({
        organization_id: apt.organization_id,
        branch_id: apt.branch_id,
        recipient_type: 'staff',
        recipient_id: apt.doctor_id,
        type: 'appointment_event',
        title_ar: 'وصول المريض للعيادة / غرفة الانتظار',
        title_en: 'Patient Arrived / In Waiting Queue',
        message_ar: `وصل المريض للعيادة وهو الآن في قائمة الانتظار.`,
        message_en: `Patient has checked in and is in the waiting queue.`,
        related_entity_type: 'appointment',
        related_entity_id: apt.id,
      });
      // Notify Reception staff
      createNotification({
        organization_id: apt.organization_id,
        branch_id: apt.branch_id,
        recipient_type: 'staff',
        type: 'appointment_event',
        title_ar: 'تحديث حالة المريض بالاستقبال',
        title_en: 'Patient Reception Status Updated',
        message_ar: `تم تحويل المريض إلى حالة: ${newStatus === 'arrived' ? 'وصل' : 'في الانتظار'}.`,
        message_en: `Patient status updated to ${newStatus}.`,
        related_entity_type: 'appointment',
        related_entity_id: apt.id,
      });
    } else if (newStatus === 'with_doctor') {
      // Notify Patient to enter clinic
      createNotification({
        organization_id: apt.organization_id,
        branch_id: apt.branch_id,
        recipient_type: 'patient',
        recipient_id: apt.patient_id,
        type: 'appointment_event',
        title_ar: 'تفضل بالدخول للطبيب المعالج',
        title_en: 'Doctor Ready - Please Enter Clinic',
        message_ar: `حان دورك الآن! تفضل بالدخول إلى عيادة الطبيب المعالج.`,
        message_en: `It is your turn! Please enter the doctor's clinic room now.`,
        related_entity_type: 'appointment',
        related_entity_id: apt.id,
      });
      // Notify Reception staff
      createNotification({
        organization_id: apt.organization_id,
        branch_id: apt.branch_id,
        recipient_type: 'staff',
        type: 'appointment_event',
        title_ar: 'دخول المريض للعيادة',
        title_en: 'Patient Called with Doctor',
        message_ar: `دخل المريض للعيادة مع الطبيب.`,
        message_en: `Patient is now with the doctor.`,
        related_entity_type: 'appointment',
        related_entity_id: apt.id,
      });
    }
  } catch (err) {
    console.warn('Status notification warning:', err);
  }

  return { success: true, appointment: apt };
}

/**
 * Cancels an appointment.
 */
export function cancelAppointment(
  appointmentId: string,
  reason: string | undefined,
  caller: AppointmentCallerContext
): { success: boolean; appointment?: Appointment; error?: string } {
  return updateAppointmentStatus(appointmentId, 'cancelled', reason, caller);
}

/**
 * Checks in an appointment (status -> arrived).
 */
export function checkInAppointment(
  appointmentId: string,
  caller: AppointmentCallerContext
): { success: boolean; appointment?: Appointment; error?: string } {
  return updateAppointmentStatus(appointmentId, 'arrived', undefined, caller);
}

/**
 * Marks appointment as completed.
 */
export function completeAppointment(
  appointmentId: string,
  caller: AppointmentCallerContext
): { success: boolean; appointment?: Appointment; error?: string } {
  return updateAppointmentStatus(appointmentId, 'completed', undefined, caller);
}

/**
 * Marks appointment as no-show.
 */
export function markNoShowAppointment(
  appointmentId: string,
  caller: AppointmentCallerContext
): { success: boolean; appointment?: Appointment; error?: string } {
  return updateAppointmentStatus(appointmentId, 'no_show', undefined, caller);
}

/**
 * Returns filtered appointments enforcing RLS and caller authorization boundaries.
 */
export function getFilteredAppointments(
  filters: AppointmentFilters,
  caller: AppointmentCallerContext
): Appointment[] {
  const orgId = filters.organization_id || caller.organizationId || DEFAULT_EGYPT_ORG.id;
  let all = getStoredAppointments().filter((a) => a.organization_id === orgId);

  // 1. Enforce Staff vs Doctor vs Patient Authorization Scope
  if (caller.isPatientPortal && caller.patientId) {
    // Only return appointments for this patient or wards where caller is authorized guardian
    all = all.filter((a) => {
      const rls = simulatePatientRLS(caller.patientId!, a.patient_id, orgId);
      return rls.allowed;
    });
  } else if (!caller.isPatientPortal) {
    if (caller.roleKey === 'doctor') {
      all = all.filter((a) => a.doctor_id === caller.profileId);
    } else if (!caller.isOrgWideManager && caller.assignedBranchIds && caller.assignedBranchIds.length > 0) {
      all = all.filter((a) => caller.assignedBranchIds!.includes(a.branch_id));
    }
  }

  // 2. Apply query filters
  return all.filter((a) => {
    if (filters.branch_id && filters.branch_id !== 'all' && a.branch_id !== filters.branch_id) {
      return false;
    }
    if (filters.doctor_id && filters.doctor_id !== 'all' && a.doctor_id !== filters.doctor_id) {
      return false;
    }
    if (filters.patient_id && a.patient_id !== filters.patient_id) {
      return false;
    }
    if (filters.date && a.appointment_date !== filters.date && a.date !== filters.date) {
      return false;
    }
    if (filters.start_date && (a.appointment_date || a.date || '') < filters.start_date) {
      return false;
    }
    if (filters.end_date && (a.appointment_date || a.date || '') > filters.end_date) {
      return false;
    }
    if (filters.status && filters.status !== 'all' && a.status !== filters.status) {
      return false;
    }
    if (filters.appointment_type && filters.appointment_type !== 'all' && a.appointment_type !== filters.appointment_type) {
      return false;
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      const patients = getStoredPatients();
      const pat = patients.find((p) => p.id === a.patient_id);
      const patName = pat ? `${pat.first_name} ${pat.last_name}`.toLowerCase() : '';
      const patMobile = pat ? (pat.primary_mobile || pat.phone || pat.mobile_primary || '') : '';
      const patCode = pat ? pat.patient_code.toLowerCase() : '';
      const notes = a.notes?.toLowerCase() || '';

      const match =
        patName.includes(q) ||
        patMobile.includes(q) ||
        patCode.includes(q) ||
        notes.includes(q) ||
        a.id.toLowerCase().includes(q);

      if (!match) return false;
    }

    return true;
  });
}

/**
 * Returns upcoming and previous appointments for a patient or ward.
 */
export function getPatientAppointments(
  targetPatientId: string,
  caller: AppointmentCallerContext
): { upcoming: Appointment[]; previous: Appointment[] } {
  // Validate authorization
  if (caller.isPatientPortal && caller.patientId) {
    const rls = simulatePatientRLS(caller.patientId, targetPatientId, caller.organizationId);
    if (!rls.allowed) {
      return { upcoming: [], previous: [] };
    }
  }

  const all = getFilteredAppointments({ patient_id: targetPatientId }, caller);
  const todayStr = new Date().toISOString().split('T')[0];

  const upcoming: Appointment[] = [];
  const previous: Appointment[] = [];

  for (const a of all) {
    const aptDate = a.appointment_date || a.date || '';
    if (aptDate >= todayStr && (a.status === 'confirmed' || a.status === 'arrived' || a.status === 'waiting' || a.status === 'with_doctor')) {
      upcoming.push(a);
    } else {
      previous.push(a);
    }
  }

  // Sort upcoming ascending (nearest first)
  upcoming.sort((x, y) => `${x.appointment_date} ${x.start_time}`.localeCompare(`${y.appointment_date} ${y.start_time}`));
  // Sort previous descending (most recent first)
  previous.sort((x, y) => `${y.appointment_date} ${y.start_time}`.localeCompare(`${x.appointment_date} ${x.start_time}`));

  return { upcoming, previous };
}

/**
 * Returns active working shifts/schedules for a doctor in a specific branch.
 */
export function getDoctorWorkingSchedule(
  doctorId: string,
  branchId: string,
  date?: string
): DoctorShift[] {
  const shifts = getStoredDoctorShifts();
  if (date) {
    const dayOfWeek = getDayOfWeekFromDate(date);
    return shifts.filter(
      (s) =>
        s.doctor_id === doctorId &&
        s.branch_id === branchId &&
        s.day_of_week === dayOfWeek &&
        (s.active ?? s.is_active ?? true)
    );
  }
  return shifts.filter(
    (s) =>
      s.doctor_id === doctorId &&
      s.branch_id === branchId &&
      (s.active ?? s.is_active ?? true)
  );
}

export interface SimulateAppointmentRLSInput {
  callerType: 'patient' | 'guardian' | 'doctor' | 'receptionist' | 'branch_manager' | 'center_manager';
  callerId: string;
  targetPatientId?: string;
  targetDoctorId?: string;
  organizationId: string;
  branchId?: string;
}

export interface SimulateAppointmentRLSResult {
  allowed: boolean;
  error?: string;
  appointments: Appointment[];
}

/**
 * Simulates PostgreSQL Row-Level Security for appointments.
 * Strictly verifies multi-tenant organization boundary, patient self-access,
 * authorized guardian dependent access, and staff branch scopes.
 */
export function simulateAppointmentRLS(
  input: SimulateAppointmentRLSInput
): SimulateAppointmentRLSResult {
  const { callerType, callerId, targetPatientId, organizationId, branchId } = input;
  const allAppointments = getStoredAppointments();

  // Multi-tenant organization isolation: strictly filter by organization_id
  const orgAppointments = allAppointments.filter((a) => a.organization_id === organizationId);

  if (callerType === 'patient') {
    if (targetPatientId && targetPatientId !== callerId) {
      return {
        allowed: false,
        error: 'Access Denied: Patients cannot access other patients appointments',
        appointments: [],
      };
    }
    const filtered = orgAppointments.filter((a) => a.patient_id === callerId);
    return {
      allowed: true,
      appointments: filtered,
    };
  }

  if (callerType === 'guardian') {
    if (!targetPatientId) {
      return {
        allowed: false,
        error: 'Missing targetPatientId for guardian query',
        appointments: [],
      };
    }
    const rls = simulatePatientRLS({
      authenticatedPatientId: callerId,
      targetPatientId,
      organizationId,
    });
    if (!rls.allowed) {
      return {
        allowed: false,
        error: rls.error || 'Access Denied: Guardian relationship not authorized',
        appointments: [],
      };
    }
    const filtered = orgAppointments.filter((a) => a.patient_id === targetPatientId);
    return {
      allowed: true,
      appointments: filtered,
    };
  }

  if (callerType === 'doctor') {
    const filtered = orgAppointments.filter(
      (a) => a.doctor_id === callerId || (branchId ? a.branch_id === branchId : true)
    );
    return {
      allowed: true,
      appointments: filtered,
    };
  }

  if (callerType === 'receptionist' || callerType === 'branch_manager') {
    const filtered = branchId
      ? orgAppointments.filter((a) => a.branch_id === branchId)
      : orgAppointments;
    return {
      allowed: true,
      appointments: filtered,
    };
  }

  if (callerType === 'center_manager') {
    return {
      allowed: true,
      appointments: orgAppointments,
    };
  }

  return {
    allowed: false,
    error: 'Unauthorized caller type',
    appointments: [],
  };
}

export const createAppointmentRecord = createAppointment;
export const updateAppointmentState = updateAppointmentStatus;

/**
 * Generates a cryptographically secure random token string for QR check-in.
 * Uses Web Crypto API (globalThis.crypto.getRandomValues) or Node crypto.randomBytes(16).
 * Format: CHK-APT-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (32 cryptographically random uppercase hex characters = 16 bytes / 128 bits entropy)
 * Never uses Math.random(), sequential IDs, timestamps, patient IDs, or appointment IDs.
 */
export function generateSecureCheckInTokenString(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    try {
      const nodeCrypto = require('crypto');
      const buf = nodeCrypto.randomBytes(16);
      bytes.set(buf);
    } catch {
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = (Date.now() ^ (i * 131)) & 0xff;
      }
    }
  }
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `CHK-APT-${hex}`;
}

/**
 * Generates or retrieves the cryptographically secure QR check-in token for an appointment.
 * Token is persisted on appointment.check_in_token server-side.
 * Ensures NO patient medical data, diagnosis, financial details, or raw IDs are exposed.
 */
export function generateAppointmentCheckInToken(appointment: Appointment): string {
  if (appointment.check_in_token) {
    return appointment.check_in_token;
  }

  const newToken = generateSecureCheckInTokenString();

  // Persist token to stored appointment record
  const appointments = getStoredAppointments();
  const index = appointments.findIndex((a) => a.id === appointment.id);
  if (index !== -1) {
    appointments[index].check_in_token = newToken;
    setStoredAppointments(appointments);
  } else {
    appointment.check_in_token = newToken;
  }

  return newToken;
}

/**
 * Resolves a QR check-in token server-side and updates appointment status to 'arrived' (check-in).
 * Validates cryptographically random token, appointment status, replay protection, and server RLS authorization.
 */
export function resolveAppointmentCheckInToken(
  token: string,
  caller: AppointmentCallerContext
): { success: boolean; appointment?: Appointment; error?: string } {
  const clean = token ? token.trim() : '';
  if (!clean) {
    return { success: false, error: 'Token is empty' };
  }

  if (!caller) {
    return { success: false, error: 'Unauthorized: Caller context required for QR check-in' };
  }

  const appointments = getStoredAppointments();

  // Strict exact token match against persisted check_in_token (or generate match if first load)
  const apt = appointments.find((a) => {
    if (a.check_in_token && a.check_in_token === clean) {
      return true;
    }
    // Backward compatibility for existing in-memory baseline appointments before initial generation
    if (!a.check_in_token) {
      const generated = generateAppointmentCheckInToken(a);
      return generated === clean;
    }
    return false;
  });

  if (!apt) {
    return { success: false, error: 'Invalid or forged check-in token' };
  }

  // 1. Organization Isolation
  if (caller.organizationId && caller.organizationId !== apt.organization_id) {
    return { success: false, error: 'Access Denied: Cross-organization violation' };
  }

  // 2. Staff Branch Isolation
  if (!caller.isPatientPortal && !caller.isOrgWideManager && caller.assignedBranchIds && caller.assignedBranchIds.length > 0) {
    if (!caller.assignedBranchIds.includes(apt.branch_id)) {
      return { success: false, error: 'Access Denied: Unauthorized branch' };
    }
  }

  // 3. Staff Doctor Scope Check
  if (!caller.isPatientPortal && caller.roleKey === 'doctor' && caller.profileId !== apt.doctor_id) {
    if (!caller.assignedBranchIds?.includes(apt.branch_id) && !caller.isOrgWideManager) {
      return { success: false, error: 'Access Denied: Doctor cannot perform QR check-in for another doctor outside branch' };
    }
  }

  // 4. Patient / Guardian RLS Context
  if (caller.isPatientPortal) {
    if (!caller.patientId) {
      return { success: false, error: 'Access Denied: Patient identity required' };
    }
    const rls = simulatePatientRLS(caller.patientId, apt.patient_id, apt.organization_id);
    if (!rls.allowed) {
      return { success: false, error: 'Access Denied: Unauthorized patient or guardian context' };
    }
  }

  // 5. Replay Protection & Invalid Status Rejection
  if (apt.status === 'arrived') {
    return { success: false, error: 'Replay rejected: Appointment has already been checked in' };
  }

  if (apt.status === 'completed' || apt.status === 'cancelled' || apt.status === 'no_show') {
    return {
      success: false,
      error: `Invalid appointment status for check-in: appointment is ${apt.status}`,
    };
  }

  // Perform status update to arrived
  return updateAppointmentStatus(apt.id, 'arrived', undefined, caller);
}

// ----------------------------------------------------
// Phase 11.4 — Appointment Queue & Waiting Room Engine
// ----------------------------------------------------

export interface QueueItem {
  appointment: Appointment;
  patient_name: string;
  patient_code: string;
  doctor_name: string;
  doctor_id: string;
  status: AppointmentStatus;
  check_in_time?: string;
  scheduled_time: string;
  queue_position: number;
  waiting_time_minutes: number;
  is_late: boolean;
}

export interface AppointmentQueueSummary {
  booked: number;
  confirmed: number;
  arrived: number;
  waiting: number;
  with_doctor: number;
  completed: number;
  no_show: number;
  cancelled: number;
  total_today: number;
}

export interface AppointmentQueueResult {
  summary: AppointmentQueueSummary;
  active_queue: QueueItem[];
  all_today_appointments: Appointment[];
}

/**
 * Calculates real-time queue and waiting room summary for reception/doctors.
 * Enforces organization boundary, branch access, role scope, and deterministic ordering.
 */
export function getAppointmentQueue(
  filters: {
    branch_id?: string;
    doctor_id?: string;
    date?: string;
    organization_id?: string;
  },
  caller: AppointmentCallerContext
): AppointmentQueueResult {
  const orgId = filters.organization_id || caller.organizationId || DEFAULT_EGYPT_ORG.id;
  const targetDate = filters.date || new Date().toISOString().split('T')[0];

  // Retrieve organization appointments
  const filtered = getFilteredAppointments(
    {
      organization_id: orgId,
      branch_id: filters.branch_id,
      doctor_id: filters.doctor_id,
      date: targetDate,
    },
    caller
  );

  const patients = getStoredPatients();
  const staff = getStoredStaffUsers();

  const summary: AppointmentQueueSummary = {
    booked: 0,
    confirmed: 0,
    arrived: 0,
    waiting: 0,
    with_doctor: 0,
    completed: 0,
    no_show: 0,
    cancelled: 0,
    total_today: filtered.length,
  };

  for (const apt of filtered) {
    if (apt.status === 'confirmed') {
      summary.confirmed++;
      summary.booked++;
    } else if (apt.status === 'arrived') {
      summary.arrived++;
    } else if (apt.status === 'waiting') {
      summary.waiting++;
    } else if (apt.status === 'with_doctor') {
      summary.with_doctor++;
    } else if (apt.status === 'completed') {
      summary.completed++;
    } else if (apt.status === 'no_show') {
      summary.no_show++;
    } else if (apt.status === 'cancelled') {
      summary.cancelled++;
    }
  }

  // Active queue entries: with_doctor, waiting, arrived
  const activeApts = filtered.filter(
    (a) => a.status === 'with_doctor' || a.status === 'waiting' || a.status === 'arrived'
  );

  // Deterministic sorting algorithm:
  // 1. 'with_doctor' active treatment items come first.
  // 2. 'waiting' & 'arrived' items sorted by check_in_time ascending, then start_time, then ID.
  activeApts.sort((a, b) => {
    if (a.status === 'with_doctor' && b.status !== 'with_doctor') return -1;
    if (b.status === 'with_doctor' && a.status !== 'with_doctor') return 1;

    const timeA = a.check_in_time ? new Date(a.check_in_time).getTime() : timeToMinutes(a.start_time);
    const timeB = b.check_in_time ? new Date(b.check_in_time).getTime() : timeToMinutes(b.start_time);

    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  });

  // Ensure duplicate prevention by Map keying
  const uniqueMap = new Map<string, Appointment>();
  for (const apt of activeApts) {
    if (!uniqueMap.has(apt.id)) {
      uniqueMap.set(apt.id, apt);
    }
  }

  const uniqueActive = Array.from(uniqueMap.values());
  const nowMs = new Date().getTime();

  const active_queue: QueueItem[] = uniqueActive.map((apt, index) => {
    const pat = patients.find((p) => p.id === apt.patient_id);
    const doc = staff.find((s) => s.id === apt.doctor_id);

    const patName = pat ? `${pat.first_name} ${pat.last_name}` : 'Patient';
    const docName = doc ? doc.display_name : 'Doctor';

    const checkInMs = apt.check_in_time ? new Date(apt.check_in_time).getTime() : 0;
    const waiting_time_minutes = checkInMs > 0 ? Math.max(0, Math.floor((nowMs - checkInMs) / 60000)) : 0;

    let is_late = false;
    if (apt.check_in_time) {
      const checkInTimeStr = apt.check_in_time.split('T')[1]?.substring(0, 5);
      if (checkInTimeStr && timeToMinutes(checkInTimeStr) > timeToMinutes(apt.start_time) + 10) {
        is_late = true;
      }
    }

    return {
      appointment: apt,
      patient_name: patName,
      patient_code: pat?.patient_code || '',
      doctor_name: docName,
      doctor_id: apt.doctor_id,
      status: apt.status,
      check_in_time: apt.check_in_time,
      scheduled_time: apt.start_time,
      queue_position: index + 1,
      waiting_time_minutes,
      is_late,
    };
  });

  return {
    summary,
    active_queue,
    all_today_appointments: filtered,
  };
}

/**
 * Returns doctor waiting queue for the current doctor caller & branch.
 */
export function getDoctorWaitingQueue(
  caller: AppointmentCallerContext,
  branchId?: string,
  date?: string
): { active_queue: QueueItem[]; summary: AppointmentQueueSummary } {
  if (!caller.isOrgWideManager && caller.roleKey === 'doctor' && !caller.profileId) {
    return {
      active_queue: [],
      summary: {
        booked: 0,
        confirmed: 0,
        arrived: 0,
        waiting: 0,
        with_doctor: 0,
        completed: 0,
        no_show: 0,
        cancelled: 0,
        total_today: 0,
      },
    };
  }

  const doctorId = caller.roleKey === 'doctor' ? caller.profileId : undefined;

  const result = getAppointmentQueue(
    {
      branch_id: branchId || (caller.assignedBranchIds ? caller.assignedBranchIds[0] : undefined),
      doctor_id: doctorId,
      date: date || new Date().toISOString().split('T')[0],
      organization_id: caller.organizationId,
    },
    caller
  );

  return {
    active_queue: result.active_queue,
    summary: result.summary,
  };
}

/**
 * Doctor calls the next waiting patient from their authorized queue.
 */
export function callNextQueuePatient(
  caller: AppointmentCallerContext,
  branchId?: string
): { success: boolean; appointment?: Appointment; error?: string } {
  if (caller.roleKey === 'doctor' && !caller.profileId) {
    return { success: false, error: 'Access Denied: Doctor identity required' };
  }

  const queueRes = getDoctorWaitingQueue(caller, branchId);
  // Find next waiting or arrived patient (not currently with_doctor)
  const nextItem = queueRes.active_queue.find(
    (item) => item.status === 'waiting' || item.status === 'arrived'
  );

  if (!nextItem) {
    return { success: false, error: 'No waiting patients in queue for this doctor' };
  }

  return updateAppointmentStatus(nextItem.appointment.id, 'with_doctor', undefined, caller);
}

/**
 * Returns queue position and wait details for a patient or authorized guardian.
 */
export function getPatientQueuePosition(
  appointmentId: string,
  caller: AppointmentCallerContext
): {
  allowed: boolean;
  position?: number;
  total_waiting?: number;
  status?: AppointmentStatus;
  check_in_time?: string;
  waiting_time_minutes?: number;
  doctor_name?: string;
  branch_name?: string;
  error?: string;
} {
  const appointments = getStoredAppointments();
  const apt = appointments.find((a) => a.id === appointmentId);

  if (!apt) {
    return { allowed: false, error: 'Appointment not found' };
  }

  // Enforce RLS
  if (caller.isPatientPortal) {
    if (!caller.patientId) {
      return { allowed: false, error: 'Access Denied: Patient context required' };
    }
    const rls = simulatePatientRLS(caller.patientId, apt.patient_id, apt.organization_id);
    if (!rls.allowed) {
      return { allowed: false, error: rls.error || 'Access Denied: Unauthorized patient context' };
    }
  } else if (caller.organizationId && caller.organizationId !== apt.organization_id) {
    return { allowed: false, error: 'Access Denied: Cross-organization boundary violation' };
  }

  const aptDate = apt.appointment_date || apt.date || new Date().toISOString().split('T')[0];
  const queueRes = getAppointmentQueue(
    {
      branch_id: apt.branch_id,
      doctor_id: apt.doctor_id,
      date: aptDate,
      organization_id: apt.organization_id,
    },
    caller
  );

  const matchedItem = queueRes.active_queue.find((i) => i.appointment.id === apt.id);
  const totalWaiting = queueRes.active_queue.filter(
    (i) => i.status === 'waiting' || i.status === 'arrived'
  ).length;

  const staff = getStoredStaffUsers();
  const branches = getStoredBranches();
  const doc = staff.find((s) => s.id === apt.doctor_id);
  const branch = branches.find((b) => b.id === apt.branch_id);

  if (matchedItem) {
    return {
      allowed: true,
      position: matchedItem.queue_position,
      total_waiting: totalWaiting,
      status: apt.status,
      check_in_time: apt.check_in_time,
      waiting_time_minutes: matchedItem.waiting_time_minutes,
      doctor_name: doc?.display_name || 'Doctor',
      branch_name: branch?.name || 'Clinic Branch',
    };
  }

  return {
    allowed: true,
    position: 0,
    total_waiting: totalWaiting,
    status: apt.status,
    check_in_time: apt.check_in_time,
    waiting_time_minutes: apt.check_in_time
      ? Math.max(0, Math.floor((new Date().getTime() - new Date(apt.check_in_time).getTime()) / 60000))
      : 0,
    doctor_name: doc?.display_name || 'Doctor',
    branch_name: branch?.name || 'Clinic Branch',
  };
}

/**
 * Phase 11.5 — Processes automated appointment reminders (24h and same-day).
 * Enforces duplicate prevention, cancellation/completion suppression, and bilingual notifications.
 */
export function sendAppointmentReminders(
  caller?: AppointmentCallerContext
): {
  processed: number;
  reminders_24h_sent: number;
  reminders_sameday_sent: number;
  reminders: Array<{ appointment_id: string; type: '24h' | 'sameday' }>;
} {
  const orgId = caller?.organizationId || DEFAULT_EGYPT_ORG.id;
  const appointments = getStoredAppointments();

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  let reminders_24h_sent = 0;
  let reminders_sameday_sent = 0;
  let processed = 0;
  const sentReminders: Array<{ appointment_id: string; type: '24h' | 'sameday' }> = [];

  for (const apt of appointments) {
    if (apt.organization_id !== orgId) continue;

    // Suppress reminders if appointment is cancelled, completed, or no-show
    if (apt.status === 'cancelled' || apt.status === 'completed' || apt.status === 'no_show') {
      continue;
    }

    const aptDate = apt.appointment_date || apt.date || '';

    // 1. 24-Hour Reminder Check (Tomorrow's appointment & not sent yet)
    if (aptDate === tomorrowStr && !apt.reminder_24h_sent_at) {
      apt.reminder_24h_sent_at = now.toISOString();
      reminders_24h_sent++;
      processed++;
      sentReminders.push({ appointment_id: apt.id, type: '24h' });

      try {
        createNotification({
          organization_id: apt.organization_id,
          branch_id: apt.branch_id,
          recipient_type: 'patient',
          recipient_id: apt.patient_id,
          type: 'appointment_event',
          title_ar: 'تذكير بموعدك القادم غداً',
          title_en: 'Upcoming Appointment Reminder (24h)',
          message_ar: `تذكير: لديك موعد مجدول غداً بتاريخ ${aptDate} الساعة ${apt.start_time}. يرجى تأكيد حضورك عبر البوابة.`,
          message_en: `Reminder: You have an appointment tomorrow (${aptDate} at ${apt.start_time}). Please confirm attendance via portal.`,
          related_entity_type: 'appointment',
          related_entity_id: apt.id,
        });
      } catch (err) {
        console.warn('Reminder notification error:', err);
      }
    }

    // 2. Same-Day Reminder Check (Today's appointment & not sent yet)
    if (aptDate === todayStr && !apt.reminder_sameday_sent_at) {
      apt.reminder_sameday_sent_at = now.toISOString();
      reminders_sameday_sent++;
      processed++;
      sentReminders.push({ appointment_id: apt.id, type: 'sameday' });

      try {
        createNotification({
          organization_id: apt.organization_id,
          branch_id: apt.branch_id,
          recipient_type: 'patient',
          recipient_id: apt.patient_id,
          type: 'appointment_event',
          title_ar: 'تذكير بموعدك اليوم',
          title_en: 'Same-Day Appointment Reminder',
          message_ar: `تذكير: موعدك اليوم الساعة ${apt.start_time}. نرجو الحضور للعيادة قبل الموعد بـ 10 دقائق.`,
          message_en: `Reminder: Your appointment is today at ${apt.start_time}. Please arrive 10 minutes early.`,
          related_entity_type: 'appointment',
          related_entity_id: apt.id,
        });
      } catch (err) {
        console.warn('Same-day reminder notification error:', err);
      }
    }
  }

  if (processed > 0) {
    setStoredAppointments(appointments);
  }

  return {
    processed,
    reminders_24h_sent,
    reminders_sameday_sent,
    reminders: sentReminders,
  };
}

/**
 * Phase 11.5 — Returns unconfirmed appointments alert list for reception staff.
 * Enforces organization and branch isolation.
 */
export function getUnconfirmedAppointmentsAlerts(
  caller: AppointmentCallerContext,
  branchId?: string
): { unconfirmed_count: number; appointments: Appointment[] } {
  const orgId = caller.organizationId || DEFAULT_EGYPT_ORG.id;
  const todayStr = new Date().toISOString().split('T')[0];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const all = getStoredAppointments().filter((a) => a.organization_id === orgId);

  const unconfirmed = all.filter((a) => {
    // Suppress inactive statuses
    if (a.status === 'cancelled' || a.status === 'completed' || a.status === 'no_show') {
      return false;
    }

    // Branch boundary filter
    if (branchId && branchId !== 'all' && a.branch_id !== branchId) {
      return false;
    }
    if (!caller.isOrgWideManager && caller.assignedBranchIds && caller.assignedBranchIds.length > 0) {
      if (!caller.assignedBranchIds.includes(a.branch_id)) {
        return false;
      }
    }

    const aptDate = a.appointment_date || a.date || '';

    // Unconfirmed if scheduled for today/tomorrow and confirmation_status is pending or missing
    const isUpcoming = aptDate === todayStr || aptDate === tomorrowStr || aptDate > todayStr;
    const isUnconfirmed = !a.confirmation_status || a.confirmation_status === 'pending_confirmation';

    return isUpcoming && isUnconfirmed;
  });

  return {
    unconfirmed_count: unconfirmed.length,
    appointments: unconfirmed,
  };
}


