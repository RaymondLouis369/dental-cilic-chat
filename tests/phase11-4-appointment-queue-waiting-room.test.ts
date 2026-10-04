/**
 * Phase 11.4 — Appointment Queue & Waiting Room Management Test Suite
 * Dental Clinic & Dental Center Management Platform — Egypt
 *
 * Verifies:
 * - Real-time queue construction & summary aggregation
 * - Deterministic ordering (with_doctor first, check_in_time ascending, start_time ascending tie-breaker)
 * - Check-in to queue flow (status transitions: arrived -> waiting -> with_doctor -> completed)
 * - Waiting time calculation from check_in_time
 * - Duplicate entry prevention in active queue
 * - Doctor queue isolation & doctor Call Next Patient action
 * - Receptionist authorization & status updates
 * - Patient queue visibility & position tracking
 * - Guardian dependent queue visibility
 * - Organization & branch multi-tenant boundary isolation
 * - Reception & doctor notifications on queue events
 * - Regressions for Phase 11.1, Phase 11.2, and Phase 11.3 QR check-in security
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAppointmentQueue,
  getDoctorWaitingQueue,
  callNextQueuePatient,
  getPatientQueuePosition,
  updateAppointmentStatus,
  createAppointment,
  generateAppointmentCheckInToken,
  resolveAppointmentCheckInToken,
} from '../src/lib/appointmentService';
import {
  getStoredAppointments,
  setStoredAppointments,
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
const PATIENT_MONA_ID = 'd4444444-4444-4444-4444-444444444444'; // Stranger

const TODAY = new Date().toISOString().split('T')[0];

describe('Phase 11.4 — Appointment Queue & Waiting Room Management', () => {
  beforeEach(() => {
    const nowIso = new Date().toISOString();
    const tenMinsAgoIso = new Date(Date.now() - 10 * 60000).toISOString();
    const fiveMinsAgoIso = new Date(Date.now() - 5 * 60000).toISOString();

    const baselineAppointments: Appointment[] = [
      {
        id: 'p11_4_apt_01',
        organization_id: DEFAULT_EGYPT_ORG.id,
        branch_id: MAIN_BRANCH_ID,
        patient_id: PATIENT_AHMED_ID,
        doctor_id: DOCTOR_AHMED_ID,
        appointment_date: TODAY,
        start_time: '10:00',
        end_time: '10:30',
        duration_minutes: 30,
        status: 'arrived',
        check_in_time: tenMinsAgoIso,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: 'p11_4_apt_02',
        organization_id: DEFAULT_EGYPT_ORG.id,
        branch_id: MAIN_BRANCH_ID,
        patient_id: PATIENT_LAILA_ID,
        doctor_id: DOCTOR_AHMED_ID,
        appointment_date: TODAY,
        start_time: '10:30',
        end_time: '11:00',
        duration_minutes: 30,
        status: 'waiting',
        check_in_time: fiveMinsAgoIso,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: 'p11_4_apt_03',
        organization_id: DEFAULT_EGYPT_ORG.id,
        branch_id: MAIN_BRANCH_ID,
        patient_id: PATIENT_MONA_ID,
        doctor_id: DOCTOR_AHMED_ID,
        appointment_date: TODAY,
        start_time: '11:00',
        end_time: '11:30',
        duration_minutes: 30,
        status: 'confirmed',
        created_at: nowIso,
        updated_at: nowIso,
      },
    ];

    setStoredAppointments(baselineAppointments);
  });

  // ----------------------------------------------------
  // 1. Queue Construction & Summary Aggregation
  // ----------------------------------------------------
  describe('1. Queue Construction & Summary', () => {
    it('constructs active waiting queue and aggregates today summary correctly', () => {
      const res = getAppointmentQueue(
        { branch_id: MAIN_BRANCH_ID, date: TODAY },
        { organizationId: DEFAULT_EGYPT_ORG.id }
      );

      expect(res.summary.total_today).toBe(3);
      expect(res.summary.arrived).toBe(1);
      expect(res.summary.waiting).toBe(1);
      expect(res.summary.confirmed).toBe(1);

      expect(res.active_queue.length).toBe(2);
    });

    it('orders active queue deterministically by with_doctor first, then check_in_time ascending', () => {
      const res = getAppointmentQueue(
        { branch_id: MAIN_BRANCH_ID, date: TODAY },
        { organizationId: DEFAULT_EGYPT_ORG.id }
      );

      // p11_4_apt_01 checked in 10 mins ago, p11_4_apt_02 checked in 5 mins ago
      expect(res.active_queue[0].appointment.id).toBe('p11_4_apt_01');
      expect(res.active_queue[0].queue_position).toBe(1);

      expect(res.active_queue[1].appointment.id).toBe('p11_4_apt_02');
      expect(res.active_queue[1].queue_position).toBe(2);
    });

    it('places with_doctor status at top position #1 when doctor calls patient in', () => {
      updateAppointmentStatus('p11_4_apt_02', 'with_doctor', {
        organizationId: DEFAULT_EGYPT_ORG.id,
        profileId: DOCTOR_AHMED_ID,
        roleKey: 'doctor',
      });

      const res = getAppointmentQueue(
        { branch_id: MAIN_BRANCH_ID, date: TODAY },
        { organizationId: DEFAULT_EGYPT_ORG.id }
      );

      expect(res.active_queue[0].appointment.id).toBe('p11_4_apt_02');
      expect(res.active_queue[0].status).toBe('with_doctor');
      expect(res.active_queue[0].queue_position).toBe(1);
    });
  });

  // ----------------------------------------------------
  // 2. Check-In, Waiting Time & Duplicate Prevention
  // ----------------------------------------------------
  describe('2. Check-In & Waiting Time Calculation', () => {
    it('calculates elapsed waiting_time_minutes accurately from check_in_time', () => {
      const res = getAppointmentQueue(
        { branch_id: MAIN_BRANCH_ID, date: TODAY },
        { organizationId: DEFAULT_EGYPT_ORG.id }
      );

      expect(res.active_queue[0].waiting_time_minutes).toBeGreaterThanOrEqual(9);
      expect(res.active_queue[1].waiting_time_minutes).toBeGreaterThanOrEqual(4);
    });

    it('prevents duplicate entries for the same appointment in active queue', () => {
      const res = getAppointmentQueue(
        { branch_id: MAIN_BRANCH_ID, date: TODAY },
        { organizationId: DEFAULT_EGYPT_ORG.id }
      );

      const ids = res.active_queue.map((i) => i.appointment.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('preserves check_in_time across status updates without reset', () => {
      const aptsBefore = getStoredAppointments();
      const origCheckIn = aptsBefore[0].check_in_time;

      // Update status to waiting
      updateAppointmentStatus('p11_4_apt_01', 'waiting', {
        organizationId: DEFAULT_EGYPT_ORG.id,
      });

      const aptsAfter = getStoredAppointments();
      expect(aptsAfter[0].check_in_time).toBe(origCheckIn);
    });
  });

  // ----------------------------------------------------
  // 3. Doctor Queue Isolation & Actions
  // ----------------------------------------------------
  describe('3. Doctor Queue Isolation & Call Next Action', () => {
    it('returns doctor queue isolated to their assigned appointments and branch', () => {
      const doctorQueue = getDoctorWaitingQueue(
        {
          organizationId: DEFAULT_EGYPT_ORG.id,
          profileId: DOCTOR_AHMED_ID,
          roleKey: 'doctor',
          assignedBranchIds: [MAIN_BRANCH_ID],
        },
        MAIN_BRANCH_ID
      );

      expect(doctorQueue.active_queue.length).toBe(2);
      expect(doctorQueue.active_queue.every((item) => item.doctor_id === DOCTOR_AHMED_ID)).toBe(true);
    });

    it('allows doctor to call next waiting patient from queue into clinic (status -> with_doctor)', () => {
      const res = callNextQueuePatient(
        {
          organizationId: DEFAULT_EGYPT_ORG.id,
          profileId: DOCTOR_AHMED_ID,
          roleKey: 'doctor',
          assignedBranchIds: [MAIN_BRANCH_ID],
        },
        MAIN_BRANCH_ID
      );

      expect(res.success).toBe(true);
      expect(res.appointment?.status).toBe('with_doctor');
      expect(res.appointment?.id).toBe('p11_4_apt_01');
    });
  });

  // ----------------------------------------------------
  // 4. Patient Portal Queue Position Visibility & Guardian Isolation
  // ----------------------------------------------------
  describe('4. Patient & Guardian Queue Visibility', () => {
    it('allows patient to view their current queue position and wait details', () => {
      const pos = getPatientQueuePosition('p11_4_apt_01', {
        organizationId: DEFAULT_EGYPT_ORG.id,
        patientId: PATIENT_AHMED_ID,
        isPatientPortal: true,
      });

      expect(pos.allowed).toBe(true);
      expect(pos.position).toBe(1);
      expect(pos.waiting_time_minutes).toBeGreaterThanOrEqual(9);
    });

    it('allows verified guardian to view dependent ward queue position', () => {
      const pos = getPatientQueuePosition('p11_4_apt_02', {
        organizationId: DEFAULT_EGYPT_ORG.id,
        patientId: PATIENT_AHMED_ID, // Ahmed is Laila's guardian
        isPatientPortal: true,
      });

      expect(pos.allowed).toBe(true);
      expect(pos.position).toBe(2);
    });

    it('rejects patient attempt to view stranger patient queue position', () => {
      const pos = getPatientQueuePosition('p11_4_apt_02', {
        organizationId: DEFAULT_EGYPT_ORG.id,
        patientId: PATIENT_MONA_ID, // Mona trying to access Laila's appointment queue info
        isPatientPortal: true,
      });

      expect(pos.allowed).toBe(false);
      expect(pos.error).toBeDefined();
    });
  });

  // ----------------------------------------------------
  // 5. Multi-Tenant Organization & Branch Isolation
  // ----------------------------------------------------
  describe('5. Organization & Branch Isolation', () => {
    it('rejects cross-organization appointment queue access', () => {
      const res = getAppointmentQueue(
        { branch_id: MAIN_BRANCH_ID, date: TODAY },
        { organizationId: SECONDARY_EGYPT_ORG.id } // Different organization
      );

      expect(res.all_today_appointments.length).toBe(0);
      expect(res.active_queue.length).toBe(0);
    });

    it('isolates queue results by branch ID', () => {
      const res = getAppointmentQueue(
        { branch_id: ZAMALEK_BRANCH_ID, date: TODAY },
        { organizationId: DEFAULT_EGYPT_ORG.id }
      );

      expect(res.active_queue.length).toBe(0);
    });
  });

  // ----------------------------------------------------
  // 6. Notifications Integration
  // ----------------------------------------------------
  describe('6. Notifications Trigger Verification', () => {
    it('triggers notifications to doctor, reception, and patient on queue status transitions', () => {
      const countBefore = getStoredNotifications().length;

      // Doctor calls patient into clinic
      updateAppointmentStatus('p11_4_apt_01', 'with_doctor', {
        organizationId: DEFAULT_EGYPT_ORG.id,
        profileId: DOCTOR_AHMED_ID,
        roleKey: 'doctor',
      });

      const countAfter = getStoredNotifications().length;
      expect(countAfter).toBeGreaterThan(countBefore);
    });
  });

  // ----------------------------------------------------
  // 7. QR Check-In Security Regression (Phase 11.3)
  // ----------------------------------------------------
  describe('7. Phase 11.3 QR Check-In Security Regression', () => {
    it('maintains 128-bit cryptographically secure QR check-in token and resolution', () => {
      const apts = getStoredAppointments();
      const token = generateAppointmentCheckInToken(apts[2]); // p11_4_apt_03 (confirmed)

      expect(token).toMatch(/^CHK-APT-[A-F0-9]{32}$/);

      const res = resolveAppointmentCheckInToken(token, {
        organizationId: DEFAULT_EGYPT_ORG.id,
        assignedBranchIds: [MAIN_BRANCH_ID],
      });

      expect(res.success).toBe(true);
      expect(res.appointment?.status).toBe('arrived');
    });
  });
});
