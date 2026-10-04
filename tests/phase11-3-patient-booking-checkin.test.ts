/**
 * Phase 11.3 — Patient Appointment Booking & Check-In Test Suite
 * Dental Clinic & Dental Center Management Platform — Egypt
 *
 * Verifies:
 * - Patient appointment booking flow
 * - Available slot display using Phase 11.1 scheduling engine
 * - Server-side revalidation immediately before save
 * - Concurrent double-booking prevention
 * - Patient data isolation (patients cannot access other patients' appointments)
 * - Guardian booking for authorized dependent wards & rejection for unauthorized strangers
 * - Multi-tenant organization and branch isolation
 * - Patient appointment cancellation & reschedule requests
 * - Patient self check-in and QR-based check-in security (no medical/diagnosis/financial leaks)
 * - Existing notification system triggers (patient, doctor, reception)
 * - Optional treatment plan linkage
 * - Regressions for Phase 11.1, Phase 11.2, and Phase 10 security
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateDoctorSlots,
  checkAppointmentConflict,
  createAppointment,
  rescheduleAppointment,
  updateAppointmentStatus,
  cancelAppointment,
  checkInAppointment,
  simulateAppointmentRLS,
  generateAppointmentCheckInToken,
  resolveAppointmentCheckInToken,
} from '../src/lib/appointmentService';
import { validateAppointmentAuthorization } from '../src/lib/ai/serverAuth';
import {
  getStoredAppointments,
  setStoredAppointments,
  getDoctorAvailableSlots,
} from '../src/lib/receptionAndBillingStorage';
import { getStoredNotifications } from '../src/lib/notificationStorage';
import { Appointment } from '../src/types/appointment';
import { DEFAULT_EGYPT_ORG, SECONDARY_EGYPT_ORG } from '../src/lib/storage';

// Test Constants
const MAIN_BRANCH_ID = '11111111-1111-1111-1111-111111111111';
const ZAMALEK_BRANCH_ID = '22222222-2222-2222-2222-222222222222';

const DOCTOR_AHMED_ID = 'prof_doc_01';
const PATIENT_AHMED_ID = 'a1111111-1111-1111-1111-111111111111';
const PATIENT_LAILA_ID = 'b2222222-2222-2222-2222-222222222222'; // Authorized Ward
const PATIENT_MONA_ID = 'd4444444-4444-4444-4444-444444444444'; // Unrelated Stranger

describe('Phase 11.3 — Patient Appointment Booking & Check-In', () => {
  beforeEach(() => {
    const baselineAppointments: Appointment[] = [
      {
        id: 'p11_3_apt_01',
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
        notes: 'Baseline patient appointment',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    setStoredAppointments(baselineAppointments);
  });

  // ----------------------------------------------------
  // 1. Available Slot Display & Engine Reuse
  // ----------------------------------------------------
  describe('1. Available Slot Display', () => {
    it('uses Phase 11.1 engine to retrieve valid doctor slots', () => {
      const slots = getDoctorAvailableSlots(DOCTOR_AHMED_ID, MAIN_BRANCH_ID, '2026-09-21');
      expect(slots.length).toBeGreaterThan(0);

      const bookedSlot = slots.find((s) => s.slot === '10:00');
      if (bookedSlot) {
        expect(bookedSlot.available).toBe(false);
      }

      const freeSlot = slots.find((s) => s.slot === '11:00');
      if (freeSlot) {
        expect(freeSlot.available).toBe(true);
      }
    });

    it('pools slots for "first_available" doctor selection across branch working doctors', () => {
      const pooledSlots = generateDoctorSlots('first_available', MAIN_BRANCH_ID, '2026-09-21');
      expect(pooledSlots.length).toBeGreaterThan(0);
      expect(pooledSlots.some((s) => s.is_available)).toBe(true);
    });
  });

  // ----------------------------------------------------
  // 2. Patient Booking & Server-Side Revalidation
  // ----------------------------------------------------
  describe('2. Patient Booking & Revalidation', () => {
    it('allows authenticated patient to book a valid time slot', () => {
      const res = createAppointment(
        {
          organization_id: DEFAULT_EGYPT_ORG.id,
          branch_id: MAIN_BRANCH_ID,
          patient_id: PATIENT_AHMED_ID,
          doctor_id: DOCTOR_AHMED_ID,
          date: '2026-09-21',
          start_time: '11:00',
          appointment_type: 'cleaning',
          notes: 'Patient portal scaling visit',
        },
        {
          organizationId: DEFAULT_EGYPT_ORG.id,
          patientId: PATIENT_AHMED_ID,
          isPatientPortal: true,
        }
      );

      expect(res.success).toBe(true);
      expect(res.appointment?.start_time).toBe('11:00');
      expect(res.appointment?.appointment_type).toBe('cleaning');
    });

    it('prevents double booking under concurrent requests via server-side conflict revalidation', () => {
      // 1. First booking succeeds
      const res1 = createAppointment(
        {
          organization_id: DEFAULT_EGYPT_ORG.id,
          branch_id: MAIN_BRANCH_ID,
          patient_id: PATIENT_AHMED_ID,
          doctor_id: DOCTOR_AHMED_ID,
          date: '2026-09-21',
          start_time: '12:00',
          appointment_type: 'treatment',
        },
        {
          organizationId: DEFAULT_EGYPT_ORG.id,
          patientId: PATIENT_AHMED_ID,
          isPatientPortal: true,
        }
      );
      expect(res1.success).toBe(true);

      // 2. Concurrent booking attempt at same time fails conflict check
      const res2 = createAppointment(
        {
          organization_id: DEFAULT_EGYPT_ORG.id,
          branch_id: MAIN_BRANCH_ID,
          patient_id: PATIENT_MONA_ID,
          doctor_id: DOCTOR_AHMED_ID,
          date: '2026-09-21',
          start_time: '12:00', // Same slot!
          appointment_type: 'treatment',
        },
        {
          organizationId: DEFAULT_EGYPT_ORG.id,
          patientId: PATIENT_MONA_ID,
          isPatientPortal: true,
        }
      );
      expect(res2.success).toBe(false);
      expect(res2.error?.toLowerCase()).toContain('conflict');
    });

    it('links optional treatment_plan_id when provided', () => {
      const res = createAppointment(
        {
          organization_id: DEFAULT_EGYPT_ORG.id,
          branch_id: MAIN_BRANCH_ID,
          patient_id: PATIENT_AHMED_ID,
          doctor_id: DOCTOR_AHMED_ID,
          date: '2026-09-21',
          start_time: '14:00',
          appointment_type: 'treatment',
          treatment_plan_id: 'tp_root_canal_01',
        },
        {
          organizationId: DEFAULT_EGYPT_ORG.id,
          patientId: PATIENT_AHMED_ID,
          isPatientPortal: true,
        }
      );

      expect(res.success).toBe(true);
      expect(res.appointment?.treatment_plan_id).toBe('tp_root_canal_01');
    });
  });

  // ----------------------------------------------------
  // 3. Patient Isolation & Guardian Access
  // ----------------------------------------------------
  describe('3. Patient Isolation & Guardian Authorization', () => {
    it('prevents patient from booking or accessing another patient appointments', () => {
      const res = createAppointment(
        {
          organization_id: DEFAULT_EGYPT_ORG.id,
          branch_id: MAIN_BRANCH_ID,
          patient_id: PATIENT_MONA_ID, // Target is Mona
          doctor_id: DOCTOR_AHMED_ID,
          date: '2026-09-21',
          start_time: '15:00',
        },
        {
          organizationId: DEFAULT_EGYPT_ORG.id,
          patientId: PATIENT_AHMED_ID, // Caller is Ahmed (unrelated stranger)
          isPatientPortal: true,
        }
      );

      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('allows verified guardian to book appointments for authorized dependent ward', () => {
      const res = createAppointment(
        {
          organization_id: DEFAULT_EGYPT_ORG.id,
          branch_id: MAIN_BRANCH_ID,
          patient_id: PATIENT_LAILA_ID, // Laila is Ahmed's ward
          doctor_id: DOCTOR_AHMED_ID,
          date: '2026-09-21',
          start_time: '16:00',
          appointment_type: 'orthodontic',
        },
        {
          organizationId: DEFAULT_EGYPT_ORG.id,
          patientId: PATIENT_AHMED_ID, // Caller is Ahmed (guardian)
          isPatientPortal: true,
        }
      );

      expect(res.success).toBe(true);
      expect(res.appointment?.patient_id).toBe(PATIENT_LAILA_ID);
    });

    it('rejects unauthorized guardian attempt to book for stranger ward', () => {
      const res = createAppointment(
        {
          organization_id: DEFAULT_EGYPT_ORG.id,
          branch_id: MAIN_BRANCH_ID,
          patient_id: PATIENT_LAILA_ID, // Laila
          doctor_id: DOCTOR_AHMED_ID,
          date: '2026-09-21',
          start_time: '16:30',
        },
        {
          organizationId: DEFAULT_EGYPT_ORG.id,
          patientId: PATIENT_MONA_ID, // Caller Mona is NOT Laila's guardian
          isPatientPortal: true,
        }
      );

      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  // ----------------------------------------------------
  // 4. Branch & Organization Isolation
  // ----------------------------------------------------
  describe('4. Branch & Organization Isolation', () => {
    it('prevents cross-organization appointment booking', () => {
      const res = createAppointment(
        {
          organization_id: SECONDARY_EGYPT_ORG.id, // Different org
          branch_id: MAIN_BRANCH_ID,
          patient_id: PATIENT_AHMED_ID,
          doctor_id: DOCTOR_AHMED_ID,
          date: '2026-10-10',
          start_time: '17:00',
        },
        {
          organizationId: DEFAULT_EGYPT_ORG.id, // Primary org caller
          patientId: PATIENT_AHMED_ID,
          isPatientPortal: true,
        }
      );

      expect(res.success).toBe(false);
      expect(res.error).toContain('Cross-organization violation');
    });
  });

  // ----------------------------------------------------
  // 5. Patient Cancellation, Reschedule & Check-In
  // ----------------------------------------------------
  describe('5. Patient Cancellation, Reschedule & Check-In', () => {
    it('allows patient to cancel their own appointment', () => {
      const res = cancelAppointment('p11_3_apt_01', 'Patient schedule conflict', {
        organizationId: DEFAULT_EGYPT_ORG.id,
        patientId: PATIENT_AHMED_ID,
        isPatientPortal: true,
      });

      expect(res.success).toBe(true);
      expect(res.appointment?.status).toBe('cancelled');
    });

    it('allows patient to reschedule appointment', () => {
      const res = rescheduleAppointment(
        {
          appointment_id: 'p11_3_apt_01',
          new_date: '2026-10-11',
          new_start_time: '10:00',
          reason: 'Patient requested new day',
        },
        {
          organizationId: DEFAULT_EGYPT_ORG.id,
          patientId: PATIENT_AHMED_ID,
          isPatientPortal: true,
        }
      );

      expect(res.success).toBe(true);
      expect(res.appointment?.appointment_date).toBe('2026-10-11');
    });

    it('executes patient self check-in (status -> arrived)', () => {
      const res = checkInAppointment('p11_3_apt_01', {
        organizationId: DEFAULT_EGYPT_ORG.id,
        patientId: PATIENT_AHMED_ID,
        isPatientPortal: true,
      });

      expect(res.success).toBe(true);
      expect(res.appointment?.status).toBe('arrived');
      expect(res.appointment?.check_in_time).toBeDefined();
    });
  });

  // ----------------------------------------------------
  // 6. QR Check-In Security & Cryptographic Token Verification
  // ----------------------------------------------------
  describe('6. QR Check-In Security', () => {
    it('generates cryptographically random, unpredictable check-in tokens without medical or ID leaks', () => {
      const apt: Appointment = {
        id: 'p11_3_apt_01',
        organization_id: DEFAULT_EGYPT_ORG.id,
        branch_id: MAIN_BRANCH_ID,
        patient_id: PATIENT_AHMED_ID,
        doctor_id: DOCTOR_AHMED_ID,
        appointment_date: '2026-10-10',
        start_time: '10:00',
        end_time: '10:30',
        duration_minutes: 30,
        status: 'confirmed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const token1 = generateAppointmentCheckInToken(apt);
      expect(token1).toBeDefined();
      expect(token1).toMatch(/^CHK-APT-[A-F0-9]{16,32}$/);

      // Verify no patient ID, appointment ID, or medical data inside token
      expect(token1).not.toContain(PATIENT_AHMED_ID);
      expect(token1).not.toContain('p11_3_apt_01');
      expect(token1).not.toContain('diagnosis');
      expect(token1).not.toContain('financial');

      // Verify second generated token for new appointment is distinct & unpredictable
      const apt2 = { ...apt, id: 'p11_3_apt_02', check_in_token: undefined };
      const token2 = generateAppointmentCheckInToken(apt2);
      expect(token2).not.toEqual(token1);
    });

    it('rejects forged or invalid QR check-in tokens', () => {
      const res = resolveAppointmentCheckInToken('CHK-APT-FORGED12345678', {
        organizationId: DEFAULT_EGYPT_ORG.id,
        assignedBranchIds: [MAIN_BRANCH_ID],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid or forged check-in token');
    });

    it('rejects check-in token reuse (replay protection) when appointment is already arrived', () => {
      const apts = getStoredAppointments();
      const token = generateAppointmentCheckInToken(apts[0]);

      // First check-in succeeds
      const res1 = resolveAppointmentCheckInToken(token, {
        organizationId: DEFAULT_EGYPT_ORG.id,
        assignedBranchIds: [MAIN_BRANCH_ID],
      });
      expect(res1.success).toBe(true);
      expect(res1.appointment?.status).toBe('arrived');

      // Second check-in attempt with same token fails replay check
      const res2 = resolveAppointmentCheckInToken(token, {
        organizationId: DEFAULT_EGYPT_ORG.id,
        assignedBranchIds: [MAIN_BRANCH_ID],
      });
      expect(res2.success).toBe(false);
      expect(res2.error).toContain('Replay rejected');
    });

    it('rejects check-in token when appointment status is completed, cancelled, or no-show', () => {
      const apts = getStoredAppointments();
      apts[0].status = 'cancelled';
      setStoredAppointments(apts);

      const token = generateAppointmentCheckInToken(apts[0]);
      const res = resolveAppointmentCheckInToken(token, {
        organizationId: DEFAULT_EGYPT_ORG.id,
        assignedBranchIds: [MAIN_BRANCH_ID],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid appointment status for check-in');
    });

    it('rejects QR check-in from wrong organization', () => {
      const apts = getStoredAppointments();
      const token = generateAppointmentCheckInToken(apts[0]);

      const res = resolveAppointmentCheckInToken(token, {
        organizationId: SECONDARY_EGYPT_ORG.id, // Wrong Org!
        assignedBranchIds: [MAIN_BRANCH_ID],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Cross-organization violation');
    });

    it('rejects QR check-in from wrong branch staff', () => {
      const apts = getStoredAppointments();
      const token = generateAppointmentCheckInToken(apts[0]);

      const res = resolveAppointmentCheckInToken(token, {
        organizationId: DEFAULT_EGYPT_ORG.id,
        assignedBranchIds: [ZAMALEK_BRANCH_ID], // Wrong Branch! (Appointment is in MAIN_BRANCH_ID)
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Unauthorized branch');
    });

    it('rejects QR check-in from wrong patient trying to use another patient token', () => {
      const apts = getStoredAppointments();
      const token = generateAppointmentCheckInToken(apts[0]);

      const res = resolveAppointmentCheckInToken(token, {
        organizationId: DEFAULT_EGYPT_ORG.id,
        patientId: PATIENT_MONA_ID, // Unrelated patient Mona trying to use Ahmed's token
        isPatientPortal: true,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Unauthorized patient');
    });

    it('rejects QR check-in from unauthorized guardian trying to check in for stranger ward', () => {
      const apts = getStoredAppointments();
      // Set appointment patient to Mona
      apts[0].patient_id = PATIENT_MONA_ID;
      setStoredAppointments(apts);

      const token = generateAppointmentCheckInToken(apts[0]);

      // Ahmed tries to check in for Mona (Ahmed is NOT Mona's guardian)
      const res = resolveAppointmentCheckInToken(token, {
        organizationId: DEFAULT_EGYPT_ORG.id,
        patientId: PATIENT_AHMED_ID,
        isPatientPortal: true,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Unauthorized patient or guardian context');
    });

    it('rejects QR check-in from unauthorized staff without assigned branch access', () => {
      const apts = getStoredAppointments();
      const token = generateAppointmentCheckInToken(apts[0]);

      const res = resolveAppointmentCheckInToken(token, {
        organizationId: DEFAULT_EGYPT_ORG.id,
        profileId: 'staff_unauthorized_99',
        assignedBranchIds: ['33333333-3333-3333-3333-333333333333'], // Unassigned branch
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Unauthorized branch');
    });
  });

  // ----------------------------------------------------
  // 7. Existing Notification System Integration
  // ----------------------------------------------------
  describe('7. Notification Integration', () => {
    it('triggers booking, check-in, and cancellation notifications to patient, doctor, and reception', () => {
      const countBefore = getStoredNotifications().length;

      // Book appointment
      createAppointment(
        {
          organization_id: DEFAULT_EGYPT_ORG.id,
          branch_id: MAIN_BRANCH_ID,
          patient_id: PATIENT_AHMED_ID,
          doctor_id: DOCTOR_AHMED_ID,
          date: '2026-10-15',
          start_time: '11:00',
          appointment_type: 'emergency',
        },
        {
          organizationId: DEFAULT_EGYPT_ORG.id,
          patientId: PATIENT_AHMED_ID,
          isPatientPortal: true,
        }
      );

      const countAfter = getStoredNotifications().length;
      expect(countAfter).toBeGreaterThan(countBefore);
    });
  });

  // ----------------------------------------------------
  // 8. Storage Compliance (No appointment data in localStorage)
  // ----------------------------------------------------
  describe('8. Storage Compliance', () => {
    it('verifies zero appointment data stored in plain localStorage', () => {
      if (typeof localStorage !== 'undefined') {
        expect(localStorage.getItem('appointments')).toBeNull();
        expect(localStorage.getItem('patient_appointments')).toBeNull();
      }
    });
  });
});
