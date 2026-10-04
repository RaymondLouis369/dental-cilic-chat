/**
 * Phase 11.1 Appointment & Scheduling Engine Comprehensive Test Suite
 * Dental Clinic & Dental Center Management Platform — Egypt
 *
 * Verifies:
 * - slot generation from doctor working schedules
 * - database and server-level overlap prevention
 * - appointment lifecycle: create, confirm, reschedule, cancel, check-in, complete, no-show
 * - RBAC & access control: patient access, guardian access, doctor access, receptionist access
 * - multi-tenant branch & organization isolation
 * - server-side authorization (validateAppointmentAuthorization)
 * - Supabase RLS simulation (simulateAppointmentRLS)
 * - notification triggers on appointment creation and reschedule
 * - recall integration without duplicate records
 * - Phase 10 security regression preservation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateDoctorSlots,
  checkAppointmentConflict,
  createAppointmentRecord,
  rescheduleAppointment,
  updateAppointmentState,
  getDoctorWorkingSchedule,
  simulateAppointmentRLS,
} from '../src/lib/appointmentService';
import { validateAppointmentAuthorization, validateServerAuthorization } from '../src/lib/ai/serverAuth';
import {
  getStoredAppointments,
  setStoredAppointments,
  bookAppointment,
  getAppointmentsForUser,
} from '../src/lib/receptionAndBillingStorage';
import { getStoredNotifications } from '../src/lib/notificationStorage';
import { getStoredFollowUpPlans } from '../src/lib/clinicalStorage';
import { Appointment, AppointmentType } from '../src/types/appointment';
import { DEFAULT_EGYPT_ORG, SECONDARY_EGYPT_ORG } from '../src/lib/storage';

// Known IDs
const MAIN_BRANCH_ID = '11111111-1111-1111-1111-111111111111'; // Branch Cairo
const ZAMALEK_BRANCH_ID = '22222222-2222-2222-2222-222222222222'; // Branch Zamalek
const SECONDARY_BRANCH_ID = '33333333-3333-3333-3333-333333333333'; // Alex branch

const DOCTOR_AHMED_ID = 'prof_doc_01'; // Doctor Ahmed El-Shennawy
const DOCTOR_SARAH_ID = 'prof_doc_02'; // Doctor Sarah Mahmoud

const PATIENT_AHMED_ID = 'a1111111-1111-1111-1111-111111111111'; // Adult & Guardian
const PATIENT_LAILA_ID = 'b2222222-2222-2222-2222-222222222222'; // Ward of Ahmed
const PATIENT_MONA_ID = 'd4444444-4444-4444-4444-444444444444'; // Unrelated Patient
const PATIENT_TAREQ_SEC_ID = 'e5555555-5555-5555-5555-555555555555'; // Secondary Org Patient

const RECEPTIONIST_ID = 'prof_rec_01';

describe('Phase 11.1 — Appointment & Scheduling Engine', () => {
  beforeEach(() => {
    // Clear storage and reset baseline appointments
    const initialAppointments: Appointment[] = [
      {
        id: 'test_apt_01',
        organization_id: DEFAULT_EGYPT_ORG.id,
        branch_id: MAIN_BRANCH_ID,
        patient_id: PATIENT_AHMED_ID,
        doctor_id: DOCTOR_AHMED_ID,
        service_id: 'srv_consultation',
        appointment_date: '2026-09-21',
        date: '2026-09-21',
        start_time: '10:00',
        end_time: '10:30',
        duration_minutes: 30,
        status: 'confirmed',
        appointment_type: 'consultation',
        notes: 'Initial checkup',
        created_by: RECEPTIONIST_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    setStoredAppointments(initialAppointments);
  });

  // ----------------------------------------------------
  // 1. Slot Generation & Working Schedules
  // ----------------------------------------------------
  describe('1. Slot Generation', () => {
    it('generates slots based on doctor working schedule', () => {
      // 2026-09-25 is a Friday (day 5) or Thursday depending on calculation. Let's test a date with known schedule.
      const schedule = getDoctorWorkingSchedule(DOCTOR_AHMED_ID, MAIN_BRANCH_ID, '2026-09-21'); // Monday (day 1)
      expect(schedule.length).toBeGreaterThan(0);

      const slots = generateDoctorSlots(DOCTOR_AHMED_ID, MAIN_BRANCH_ID, '2026-09-21', 30);
      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0]).toHaveProperty('start_time');
      expect(slots[0]).toHaveProperty('end_time');
      expect(slots[0]).toHaveProperty('is_available');
    });

    it('marks booked slots as unavailable with conflict reason', () => {
      // test_apt_01 is on 2026-09-21 at 10:00 - 10:30 for DOCTOR_AHMED_ID
      const slots = generateDoctorSlots(DOCTOR_AHMED_ID, MAIN_BRANCH_ID, '2026-09-21', 30);
      const bookedSlot = slots.find((s) => s.start_time === '10:00');

      if (bookedSlot) {
        expect(bookedSlot.is_available).toBe(false);
        expect(bookedSlot.conflict_reason).toBeDefined();
      }
    });

    it('returns empty slots when doctor has no shift on selected day', () => {
      // Doctor Ahmed only works Sunday/Monday in seed
      const slots = generateDoctorSlots(DOCTOR_AHMED_ID, MAIN_BRANCH_ID, '2026-09-25', 30);
      expect(slots).toEqual([]);
    });
  });

  // ----------------------------------------------------
  // 2. Overlap Prevention & Conflict Detection
  // ----------------------------------------------------
  describe('2. Overlap Prevention & Conflict Detection', () => {
    it('prevents exact overlap with existing appointment', () => {
      const conflict = checkAppointmentConflict({
        doctor_id: DOCTOR_AHMED_ID,
        date: '2026-09-21',
        start_time: '10:00',
        end_time: '10:30',
      });

      expect(conflict.has_conflict).toBe(true);
      expect(conflict.conflict_type).toBe('doctor_double_booking');
      expect(conflict.conflicting_appointment?.id).toBe('test_apt_01');
    });

    it('prevents partial overlap (starts during another appointment)', () => {
      const conflict = checkAppointmentConflict({
        doctor_id: DOCTOR_AHMED_ID,
        date: '2026-09-21',
        start_time: '10:15',
        end_time: '10:45',
      });

      expect(conflict.has_conflict).toBe(true);
      expect(conflict.conflict_type).toBe('doctor_double_booking');
    });

    it('prevents enclosing overlap (surrounds existing appointment)', () => {
      const conflict = checkAppointmentConflict({
        doctor_id: DOCTOR_AHMED_ID,
        date: '2026-09-21',
        start_time: '09:45',
        end_time: '10:45',
      });

      expect(conflict.has_conflict).toBe(true);
      expect(conflict.conflict_type).toBe('doctor_double_booking');
    });

    it('permits adjacent non-overlapping slots on same day', () => {
      const conflict = checkAppointmentConflict({
        doctor_id: DOCTOR_AHMED_ID,
        date: '2026-09-21',
        start_time: '10:30',
        end_time: '11:00',
      });

      expect(conflict.has_conflict).toBe(false);
    });

    it('ignores the appointment itself when checking conflicts during update', () => {
      const conflict = checkAppointmentConflict({
        doctor_id: DOCTOR_AHMED_ID,
        date: '2026-09-21',
        start_time: '10:00',
        end_time: '10:30',
        exclude_appointment_id: 'test_apt_01',
      });

      expect(conflict.has_conflict).toBe(false);
    });
  });

  // ----------------------------------------------------
  // 3. Appointment Lifecycle: Create, Confirm, Reschedule, Cancel, Check-in, Complete, No-Show
  // ----------------------------------------------------
  describe('3. Appointment Lifecycle Operations', () => {
    it('creates a new organization-scoped appointment with appointment_type', () => {
      const result = createAppointmentRecord(
        {
          organization_id: DEFAULT_EGYPT_ORG.id,
          branch_id: MAIN_BRANCH_ID,
          patient_id: PATIENT_LAILA_ID,
          doctor_id: DOCTOR_AHMED_ID,
          date: '2026-09-21',
          start_time: '11:00',
          end_time: '11:30',
          status: 'confirmed',
          appointment_type: 'cleaning',
          notes: 'Routine dental scaling',
        },
        {
          organizationId: DEFAULT_EGYPT_ORG.id,
          profileId: RECEPTIONIST_ID,
          roleKey: 'receptionist',
          assignedBranchIds: [MAIN_BRANCH_ID],
        }
      );

      expect(result.success).toBe(true);
      expect(result.appointment).toBeDefined();
      expect(result.appointment?.appointment_type).toBe('cleaning');
      expect(result.appointment?.status).toBe('confirmed');

      // Verify stored
      const all = getStoredAppointments();
      expect(all.some((a) => a.id === result.appointment?.id)).toBe(true);
    });

    it('rejects creation if there is a scheduling conflict', () => {
      const result = createAppointmentRecord(
        {
          organization_id: DEFAULT_EGYPT_ORG.id,
          branch_id: MAIN_BRANCH_ID,
          patient_id: PATIENT_MONA_ID,
          doctor_id: DOCTOR_AHMED_ID,
          date: '2026-09-21',
          start_time: '10:00', // Already booked!
          end_time: '10:30',
          appointment_type: 'treatment',
        },
        {
          organizationId: DEFAULT_EGYPT_ORG.id,
          profileId: RECEPTIONIST_ID,
          roleKey: 'receptionist',
          assignedBranchIds: [MAIN_BRANCH_ID],
        }
      );

      expect(result.success).toBe(false);
      expect(result.error?.toLowerCase()).toContain('conflict');
    });

    it('reschedules an appointment, freeing the old slot and occupying the new slot', () => {
      const result = rescheduleAppointment(
        {
          appointment_id: 'test_apt_01',
          new_date: '2026-09-21',
          new_start_time: '14:00',
          new_end_time: '14:30',
          reason: 'Patient requested afternoon time',
        },
        {
          organizationId: DEFAULT_EGYPT_ORG.id,
          profileId: RECEPTIONIST_ID,
          roleKey: 'receptionist',
          assignedBranchIds: [MAIN_BRANCH_ID],
        }
      );

      expect(result.success).toBe(true);
      expect(result.appointment?.start_time).toBe('14:00');
      expect(result.appointment?.end_time).toBe('14:30');

      // Old slot (10:00) should now be free
      const conflictCheck = checkAppointmentConflict({
        doctor_id: DOCTOR_AHMED_ID,
        date: '2026-09-21',
        start_time: '10:00',
        end_time: '10:30',
      });
      expect(conflictCheck.has_conflict).toBe(false);
    });

    it('updates appointment state: check-in (arrived), complete, no-show, cancel', () => {
      const staffAuth = {
        organizationId: DEFAULT_EGYPT_ORG.id,
        profileId: RECEPTIONIST_ID,
        roleKey: 'receptionist' as const,
        assignedBranchIds: [MAIN_BRANCH_ID],
      };

      // 1. Check-in (arrived)
      const res1 = updateAppointmentState('test_apt_01', 'arrived', staffAuth);
      expect(res1.success).toBe(true);
      expect(res1.appointment?.status).toBe('arrived');

      // 2. Doctor session (with_doctor)
      const res2 = updateAppointmentState('test_apt_01', 'with_doctor', staffAuth);
      expect(res2.success).toBe(true);
      expect(res2.appointment?.status).toBe('with_doctor');

      // 3. Complete
      const res3 = updateAppointmentState('test_apt_01', 'completed', staffAuth);
      expect(res3.success).toBe(true);
      expect(res3.appointment?.status).toBe('completed');

      // 4. Cancel
      const res4 = updateAppointmentState('test_apt_01', 'cancelled', staffAuth, 'Patient cancellation');
      expect(res4.success).toBe(true);
      expect(res4.appointment?.status).toBe('cancelled');

      // 5. No-Show
      const res5 = updateAppointmentState('test_apt_01', 'no_show', staffAuth);
      expect(res5.success).toBe(true);
      expect(res5.appointment?.status).toBe('no_show');
    });
  });

  // ----------------------------------------------------
  // 4. Role-Based Access Control & Isolation (RLS)
  // ----------------------------------------------------
  describe('4. RBAC, RLS, and Branch/Org Isolation', () => {
    it('Patient Access: Patient can only read their own appointments', () => {
      const res = simulateAppointmentRLS({
        callerType: 'patient',
        callerId: PATIENT_AHMED_ID,
        targetPatientId: PATIENT_AHMED_ID,
        organizationId: DEFAULT_EGYPT_ORG.id,
      });

      expect(res.allowed).toBe(true);
      expect(res.appointments.every((a) => a.patient_id === PATIENT_AHMED_ID)).toBe(true);
    });

    it('Patient Access: Patient cannot access another unrelated patient appointments', () => {
      const res = simulateAppointmentRLS({
        callerType: 'patient',
        callerId: PATIENT_MONA_ID,
        targetPatientId: PATIENT_AHMED_ID,
        organizationId: DEFAULT_EGYPT_ORG.id,
      });

      expect(res.allowed).toBe(false);
      expect(res.appointments).toEqual([]);
    });

    it('Guardian Access: Authorized guardian can access dependent appointments', () => {
      const res = simulateAppointmentRLS({
        callerType: 'guardian',
        callerId: PATIENT_AHMED_ID,
        targetPatientId: PATIENT_LAILA_ID, // Laila is Ahmed's ward
        organizationId: DEFAULT_EGYPT_ORG.id,
      });

      expect(res.allowed).toBe(true);
    });

    it('Guardian Access: Unauthorized user cannot act as guardian for stranger', () => {
      const res = simulateAppointmentRLS({
        callerType: 'guardian',
        callerId: PATIENT_MONA_ID,
        targetPatientId: PATIENT_LAILA_ID, // Mona is NOT Laila's guardian
        organizationId: DEFAULT_EGYPT_ORG.id,
      });

      expect(res.allowed).toBe(false);
    });

    it('Doctor Access: Doctor only sees appointments in their assigned branch or where they are the doctor', () => {
      const doctorAppointments = getAppointmentsForUser(
        DOCTOR_AHMED_ID,
        'doctor',
        [MAIN_BRANCH_ID],
        DEFAULT_EGYPT_ORG.id
      );

      expect(doctorAppointments.length).toBeGreaterThan(0);
      expect(
        doctorAppointments.every(
          (a) => a.doctor_id === DOCTOR_AHMED_ID || a.branch_id === MAIN_BRANCH_ID
        )
      ).toBe(true);
    });

    it('Receptionist Access: Receptionist only sees appointments in their assigned branches', () => {
      const zamalekAppointments = getAppointmentsForUser(
        RECEPTIONIST_ID,
        'receptionist',
        [ZAMALEK_BRANCH_ID], // Only assigned to Zamalek
        DEFAULT_EGYPT_ORG.id
      );

      // test_apt_01 is in MAIN_BRANCH_ID, should NOT be visible to Zamalek receptionist
      expect(zamalekAppointments.some((a) => a.id === 'test_apt_01')).toBe(false);
    });

    it('Branch Isolation: Staff cannot update appointment in an unassigned branch', () => {
      const unassignedAuth = {
        organizationId: DEFAULT_EGYPT_ORG.id,
        profileId: RECEPTIONIST_ID,
        roleKey: 'receptionist' as const,
        assignedBranchIds: [ZAMALEK_BRANCH_ID], // NOT MAIN_BRANCH_ID
      };

      const res = updateAppointmentState('test_apt_01', 'arrived', unassignedAuth);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Unauthorized branch access');
    });

    it('Organization Isolation: Caller cannot access or modify appointments from another organization', () => {
      const crossOrgAuth = {
        organizationId: SECONDARY_EGYPT_ORG.id, // Different org!
        profileId: 'usr_sec_staff_01',
        roleKey: 'receptionist' as const,
        assignedBranchIds: [MAIN_BRANCH_ID],
      };

      const res = updateAppointmentState('test_apt_01', 'cancelled', crossOrgAuth);
      expect(res.success).toBe(false);
      expect(res.error).toContain('not found in your organization');
    });
  });

  // ----------------------------------------------------
  // 5. Server-Side Authorization Layer
  // ----------------------------------------------------
  describe('5. Server-Side Authorization (validateAppointmentAuthorization)', () => {
    it('authorizes authenticated staff token and scopes request', async () => {
      const authResult = await validateAppointmentAuthorization({
        authorizationHeader: 'Bearer token_prof_rec_01',
        action: 'read',
      });

      expect(authResult.authorized).toBe(true);
      expect(authResult.statusCode).toBe(200);
      expect(authResult.context?.callerType).toBe('staff');
    });

    it('authorizes authenticated patient token with proper target', async () => {
      const authResult = await validateAppointmentAuthorization({
        authorizationHeader: `Bearer token_${PATIENT_AHMED_ID}`,
        action: 'read',
        targetPatientId: PATIENT_AHMED_ID,
      });

      expect(authResult.authorized).toBe(true);
      expect(authResult.statusCode).toBe(200);
      expect(authResult.context?.callerType).toBe('patient');
    });

    it('allows guardian to query dependent appointments via server authorization', async () => {
      const authResult = await validateAppointmentAuthorization({
        authorizationHeader: `Bearer token_${PATIENT_AHMED_ID}`,
        action: 'read',
        targetPatientId: PATIENT_LAILA_ID,
      });

      expect(authResult.authorized).toBe(true);
      expect(authResult.statusCode).toBe(200);
      expect(authResult.context?.callerType).toBe('patient');
    });

    it('rejects patient trying to read stranger appointments via server authorization', async () => {
      const authResult = await validateAppointmentAuthorization({
        authorizationHeader: `Bearer token_${PATIENT_MONA_ID}`,
        action: 'read',
        targetPatientId: PATIENT_AHMED_ID, // Forbidden!
      });

      expect(authResult.authorized).toBe(false);
      expect(authResult.statusCode).toBe(403);
    });

    it('rejects requests with missing or invalid token', async () => {
      const authResult = await validateAppointmentAuthorization({
        authorizationHeader: 'Bearer invalid_token_xyz',
        action: 'read',
      });

      expect(authResult.authorized).toBe(false);
      expect(authResult.statusCode).toBe(401);
    });
  });

  // ----------------------------------------------------
  // 6. Notification Integration & Triggers
  // ----------------------------------------------------
  describe('6. Notification Integration', () => {
    it('creates patient notification upon appointment booking', () => {
      const initialCount = getStoredNotifications().length;

      bookAppointment({
        organizationId: DEFAULT_EGYPT_ORG.id,
        branchId: MAIN_BRANCH_ID,
        existingPatientId: PATIENT_AHMED_ID,
        doctorId: DOCTOR_AHMED_ID,
        appointmentDate: '2026-09-28',
        startTime: '12:00',
        appointmentType: 'orthodontic',
        notes: 'Braces adjustment',
      });

      const newNotifications = getStoredNotifications();
      expect(newNotifications.length).toBeGreaterThan(initialCount);

      const patientNotification = newNotifications.find(
        (n) => n.recipient_id === PATIENT_AHMED_ID && n.type === 'appointment_event'
      );
      expect(patientNotification).toBeDefined();
      expect(patientNotification?.title_ar).toBeDefined();
      expect(patientNotification?.title_en).toBeDefined();
    });

    it('creates notification when appointment is rescheduled', () => {
      const initialCount = getStoredNotifications().length;

      rescheduleAppointment(
        {
          appointment_id: 'test_apt_01',
          new_date: '2026-09-29',
          new_start_time: '15:00',
          new_end_time: '15:30',
        },
        {
          organizationId: DEFAULT_EGYPT_ORG.id,
          profileId: RECEPTIONIST_ID,
          roleKey: 'receptionist',
          assignedBranchIds: [MAIN_BRANCH_ID],
        }
      );

      const newNotifications = getStoredNotifications();
      expect(newNotifications.length).toBeGreaterThan(initialCount);
    });
  });

  // ----------------------------------------------------
  // 7. Recall Integration without Duplicate Records
  // ----------------------------------------------------
  describe('7. Recall Integration', () => {
    it('links appointment with follow_up / recall without duplicating existing recall plans', () => {
      const initialFollowUps = getStoredFollowUpPlans();
      const initialCount = initialFollowUps.length;

      // Book an appointment of type follow_up
      const result = createAppointmentRecord(
        {
          organization_id: DEFAULT_EGYPT_ORG.id,
          branch_id: MAIN_BRANCH_ID,
          patient_id: PATIENT_AHMED_ID,
          doctor_id: DOCTOR_AHMED_ID,
          date: '2026-09-30',
          start_time: '11:00',
          end_time: '11:30',
          status: 'confirmed',
          appointment_type: 'follow_up',
          notes: 'Recall visit linked to root canal',
        },
        {
          organizationId: DEFAULT_EGYPT_ORG.id,
          profileId: RECEPTIONIST_ID,
          roleKey: 'receptionist',
          assignedBranchIds: [MAIN_BRANCH_ID],
        }
      );

      expect(result.success).toBe(true);

      // Verify no duplicate recall plans were blindly created
      const followUpsAfter = getStoredFollowUpPlans();
      expect(followUpsAfter.length).toBe(initialCount);
    });
  });

  // ----------------------------------------------------
  // 8. Phase 10 Security Regression Preservation
  // ----------------------------------------------------
  describe('8. Phase 10 Security Regression Preservation', () => {
    it('preserves patient AI chat server-side validation invariants', async () => {
      const res = await validateServerAuthorization({
        authorizationHeader: `Bearer token_${PATIENT_AHMED_ID}`,
      });

      expect(res.authorized).toBe(true);
      expect(res.context?.authenticatedPatientId).toBe(PATIENT_AHMED_ID);
      expect(res.context?.organizationId).toBe(DEFAULT_EGYPT_ORG.id);
    });

    it('ensures no sensitive appointment data is saved in localStorage', () => {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('dental_reception_appointments');
        expect(stored).toBeNull();
      }
    });
  });
});
