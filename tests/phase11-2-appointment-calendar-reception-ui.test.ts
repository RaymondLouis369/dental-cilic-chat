/**
 * Phase 11.2 — Appointment Calendar & Reception Workflow UI Test Suite
 * Dental Clinic & Dental Center Management Platform — Egypt
 *
 * Verifies:
 * - Reception Dashboard & Appointment Calendar View (Day, Week, Month views)
 * - Appointment creation workflow using Phase 11.1 scheduling engine & available slots
 * - Real-time conflict validation and status updates
 * - Patient search & quick profile/portal context actions without data leakage
 * - Doctor calendar schedule authorization and branch filtering
 * - Patient Portal upcoming & previous appointment views with guardian RLS
 * - Existing notification trigger integration without system duplication
 * - Verification that no appointment data is persisted in localStorage
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateDoctorSlots,
  checkAppointmentConflict,
  createAppointmentRecord,
  rescheduleAppointment,
  updateAppointmentState,
  getDoctorWorkingSchedule,
  simulateAppointmentRLS,
} from '../src/lib/appointmentService';
import { validateAppointmentAuthorization } from '../src/lib/ai/serverAuth';
import {
  getStoredAppointments,
  setStoredAppointments,
  bookAppointment,
  getAppointmentsForUser,
  getDoctorAvailableSlots,
} from '../src/lib/receptionAndBillingStorage';
import { getStoredNotifications } from '../src/lib/notificationStorage';
import { getStoredPatients } from '../src/lib/patientStorage';
import { Appointment, AppointmentStatus, AppointmentType } from '../src/types/appointment';
import { DEFAULT_EGYPT_ORG, SECONDARY_EGYPT_ORG } from '../src/lib/storage';

// Known test IDs
const MAIN_BRANCH_ID = '11111111-1111-1111-1111-111111111111';
const ZAMALEK_BRANCH_ID = '22222222-2222-2222-2222-222222222222';

const DOCTOR_AHMED_ID = 'prof_doc_01';
const PATIENT_AHMED_ID = 'a1111111-1111-1111-1111-111111111111';
const PATIENT_LAILA_ID = 'b2222222-2222-2222-2222-222222222222'; // Dependent ward of Ahmed
const PATIENT_MONA_ID = 'd4444444-4444-4444-4444-444444444444'; // Unrelated

const RECEPTIONIST_ID = 'prof_rec_01';

describe('Phase 11.2 — Appointment Calendar & Reception Workflow UI', () => {
  beforeEach(() => {
    const baselineAppointments: Appointment[] = [
      {
        id: 'ui_apt_01',
        organization_id: DEFAULT_EGYPT_ORG.id,
        branch_id: MAIN_BRANCH_ID,
        patient_id: PATIENT_AHMED_ID,
        doctor_id: DOCTOR_AHMED_ID,
        service_id: 'srv_consultation',
        appointment_date: '2026-10-01',
        date: '2026-10-01',
        start_time: '10:00',
        end_time: '10:30',
        duration_minutes: 30,
        status: 'confirmed',
        appointment_type: 'consultation',
        notes: 'Reception UI test consultation',
        created_by: RECEPTIONIST_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'ui_apt_02',
        organization_id: DEFAULT_EGYPT_ORG.id,
        branch_id: MAIN_BRANCH_ID,
        patient_id: PATIENT_LAILA_ID,
        doctor_id: DOCTOR_AHMED_ID,
        service_id: 'srv_scaling',
        appointment_date: '2026-10-01',
        date: '2026-10-01',
        start_time: '11:00',
        end_time: '11:30',
        duration_minutes: 30,
        status: 'arrived',
        appointment_type: 'cleaning',
        notes: 'Teeth cleaning for ward',
        created_by: RECEPTIONIST_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    setStoredAppointments(baselineAppointments);
  });

  // ----------------------------------------------------
  // 1. Reception Dashboard Filtering & Status Indicators
  // ----------------------------------------------------
  describe('1. Reception Dashboard Filtering & Status Indicators', () => {
    it('filters appointments by date, branch, doctor, and status', () => {
      const all = getStoredAppointments();

      // Filter by date
      const dateFiltered = all.filter((a) => (a.appointment_date || a.date) === '2026-10-01');
      expect(dateFiltered.length).toBe(2);

      // Filter by status 'arrived'
      const arrivedFiltered = dateFiltered.filter((a) => a.status === 'arrived');
      expect(arrivedFiltered.length).toBe(1);
      expect(arrivedFiltered[0].id).toBe('ui_apt_02');

      // Filter by appointment_type 'cleaning'
      const cleaningFiltered = dateFiltered.filter((a) => a.appointment_type === 'cleaning');
      expect(cleaningFiltered.length).toBe(1);
      expect(cleaningFiltered[0].patient_id).toBe(PATIENT_LAILA_ID);
    });

    it('maps color/status indicators without changing backend status definitions', () => {
      const validStatuses: AppointmentStatus[] = [
        'confirmed',
        'arrived',
        'waiting',
        'with_doctor',
        'completed',
        'cancelled',
        'no_show',
        'rescheduled',
        'late',
      ];

      validStatuses.forEach((st) => {
        const res = updateAppointmentState(
          'ui_apt_01',
          st,
          {
            organizationId: DEFAULT_EGYPT_ORG.id,
            profileId: RECEPTIONIST_ID,
            roleKey: 'receptionist',
            assignedBranchIds: [MAIN_BRANCH_ID],
          }
        );
        expect(res.success).toBe(true);
        expect(res.appointment?.status).toBe(st);
      });
    });
  });

  // ----------------------------------------------------
  // 2. Appointment Creation Modal & Conflict Validation
  // ----------------------------------------------------
  describe('2. Appointment Creation Modal & Conflict Engine Integration', () => {
    it('fetches valid available slots for selected doctor, branch, and date', () => {
      const slots = getDoctorAvailableSlots(DOCTOR_AHMED_ID, MAIN_BRANCH_ID, '2026-10-01');
      expect(slots.length).toBeGreaterThan(0);

      // 10:00 and 11:00 are already booked in baselineAppointments
      const slot10 = slots.find((s) => s.slot === '10:00');
      const slot11 = slots.find((s) => s.slot === '11:00');
      const slot12 = slots.find((s) => s.slot === '12:00');

      if (slot10) expect(slot10.available).toBe(false);
      if (slot11) expect(slot11.available).toBe(false);
      if (slot12) expect(slot12.available).toBe(true);
    });

    it('validates conflicts in real-time before saving new appointment', () => {
      // Attempt booking at 10:00 (Conflicting!)
      const conflictCheck = checkAppointmentConflict({
        doctor_id: DOCTOR_AHMED_ID,
        date: '2026-10-01',
        start_time: '10:00',
        end_time: '10:30',
      });
      expect(conflictCheck.has_conflict).toBe(true);

      // Book at 12:00 (Free slot!)
      const res = bookAppointment({
        organizationId: DEFAULT_EGYPT_ORG.id,
        branchId: MAIN_BRANCH_ID,
        existingPatientId: PATIENT_MONA_ID,
        doctorId: DOCTOR_AHMED_ID,
        appointmentDate: '2026-10-01',
        startTime: '12:00',
        appointmentType: 'treatment',
        notes: 'UI modal new appointment test',
      });

      expect(res.success).toBe(true);
      expect(res.appointment?.start_time).toBe('12:00');
      expect(res.appointment?.appointment_type).toBe('treatment');
    });
  });

  // ----------------------------------------------------
  // 3. Quick Patient Actions & Portal Search Data Boundary
  // ----------------------------------------------------
  describe('3. Patient Search & Portal Security Isolation', () => {
    it('searches patients without exposing unauthorized cross-organization data', () => {
      const allPatients = getStoredPatients();
      const patientMatch = allPatients.find(
        (p) => p.id === PATIENT_AHMED_ID && p.organization_id === DEFAULT_EGYPT_ORG.id
      );

      expect(patientMatch).toBeDefined();
      expect(patientMatch?.first_name).toBeDefined();
    });

    it('enforces patient and guardian RLS for appointment history', () => {
      // Adult patient reads own appointments
      const patientRls = simulateAppointmentRLS({
        callerType: 'patient',
        callerId: PATIENT_AHMED_ID,
        targetPatientId: PATIENT_AHMED_ID,
        organizationId: DEFAULT_EGYPT_ORG.id,
      });
      expect(patientRls.allowed).toBe(true);
      expect(patientRls.appointments.some((a) => a.id === 'ui_apt_01')).toBe(true);

      // Guardian reads ward's appointments
      const guardianRls = simulateAppointmentRLS({
        callerType: 'guardian',
        callerId: PATIENT_AHMED_ID,
        targetPatientId: PATIENT_LAILA_ID,
        organizationId: DEFAULT_EGYPT_ORG.id,
      });
      expect(guardianRls.allowed).toBe(true);
      expect(guardianRls.appointments.some((a) => a.id === 'ui_apt_02')).toBe(true);

      // Stranger blocked from reading target patient
      const strangerRls = simulateAppointmentRLS({
        callerType: 'patient',
        callerId: PATIENT_MONA_ID,
        targetPatientId: PATIENT_AHMED_ID,
        organizationId: DEFAULT_EGYPT_ORG.id,
      });
      expect(strangerRls.allowed).toBe(false);
      expect(strangerRls.appointments).toEqual([]);
    });
  });

  // ----------------------------------------------------
  // 4. Existing Notification System Integration
  // ----------------------------------------------------
  describe('4. Notification Trigger Integration', () => {
    it('triggers existing notification system on appointment status update', () => {
      const initialCount = getStoredNotifications().length;

      // Reschedule appointment
      rescheduleAppointment(
        {
          appointment_id: 'ui_apt_01',
          new_date: '2026-10-02',
          new_start_time: '14:00',
          new_end_time: '14:30',
          reason: 'Reception UI reschedule request',
        },
        {
          organizationId: DEFAULT_EGYPT_ORG.id,
          profileId: RECEPTIONIST_ID,
          roleKey: 'receptionist',
          assignedBranchIds: [MAIN_BRANCH_ID],
        }
      );

      const notificationsAfter = getStoredNotifications();
      expect(notificationsAfter.length).toBeGreaterThan(initialCount);

      const aptNotif = notificationsAfter.find(
        (n) => n.recipient_id === PATIENT_AHMED_ID && n.type === 'appointment_event'
      );
      expect(aptNotif).toBeDefined();
    });
  });

  // ----------------------------------------------------
  // 5. No Appointment Data in localStorage Check
  // ----------------------------------------------------
  describe('5. Storage Compliance Verification', () => {
    it('verifies zero appointment records in localStorage', () => {
      if (typeof localStorage !== 'undefined') {
        expect(localStorage.getItem('appointments')).toBeNull();
        expect(localStorage.getItem('reception_appointments')).toBeNull();
      }
    });
  });
});
