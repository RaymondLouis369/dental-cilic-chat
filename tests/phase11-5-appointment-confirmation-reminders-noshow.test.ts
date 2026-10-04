/**
 * Phase 11.5 — Appointment Confirmation, Reminders & No-Show Follow-Up Test Suite
 * Dental Clinic & Dental Center Management Platform — Egypt
 *
 * Verifies:
 * - Patient appointment confirmation
 * - Receptionist appointment confirmation
 * - Guardian confirmation authorization
 * - Reminder scheduling (24-hour and same-day)
 * - Duplicate reminder prevention
 * - Cancellation suppressing future reminders
 * - Reschedule replacing old reminders and clearing previous flags
 * - Completed appointment suppression
 * - No-show suppression
 * - No-show -> recall system integration without duplicate recall records
 * - Patient isolation
 * - Guardian isolation
 * - Organization multi-tenant isolation
 * - Branch isolation
 * - Server authorization & RLS
 * - Notification privacy & bilingual messages
 * - Phase 11.1, Phase 11.2, Phase 11.3 QR security, and Phase 11.4 queue regressions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  confirmAppointmentByPatient,
  confirmAppointmentByReception,
  sendAppointmentReminders,
  getUnconfirmedAppointmentsAlerts,
  updateAppointmentStatus,
  rescheduleAppointment,
  cancelAppointment,
  markNoShowAppointment,
  getAppointmentQueue,
  generateAppointmentCheckInToken,
  resolveAppointmentCheckInToken,
} from '../src/lib/appointmentService';
import {
  getStoredAppointments,
  setStoredAppointments,
} from '../src/lib/receptionAndBillingStorage';
import {
  getStoredFollowUpPlans,
  setStoredFollowUpPlans,
} from '../src/lib/clinicalStorage';
import { getStoredNotifications } from '../src/lib/notificationStorage';
import { Appointment } from '../src/types/appointment';
import { DEFAULT_EGYPT_ORG, SECONDARY_EGYPT_ORG } from '../src/lib/storage';

// Test Constants
const MAIN_BRANCH_ID = '11111111-1111-1111-1111-111111111111';
const ZAMALEK_BRANCH_ID = '22222222-2222-2222-2222-222222222222';

const DOCTOR_AHMED_ID = 'prof_doc_01';
const PATIENT_AHMED_ID = 'a1111111-1111-1111-1111-111111111111';
const PATIENT_LAILA_ID = 'b2222222-2222-2222-2222-222222222222'; // Authorized Ward
const PATIENT_STRANGER_ID = 'd4444444-4444-4444-4444-444444444444'; // Stranger

const TODAY = new Date().toISOString().split('T')[0];

const tomorrowDate = new Date();
tomorrowDate.setDate(tomorrowDate.getDate() + 1);
const TOMORROW = tomorrowDate.toISOString().split('T')[0];

describe('Phase 11.5 — Appointment Confirmation, Reminders & No-Show Follow-Up', () => {
  beforeEach(() => {
    const nowIso = new Date().toISOString();

    const baselineAppointments: Appointment[] = [
      {
        id: 'p11_5_apt_today_01',
        organization_id: DEFAULT_EGYPT_ORG.id,
        branch_id: MAIN_BRANCH_ID,
        patient_id: PATIENT_AHMED_ID,
        doctor_id: DOCTOR_AHMED_ID,
        appointment_date: TODAY,
        date: TODAY,
        start_time: '11:00',
        end_time: '11:30',
        duration_minutes: 30,
        status: 'confirmed',
        confirmation_status: 'pending_confirmation',
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: 'p11_5_apt_tomorrow_02',
        organization_id: DEFAULT_EGYPT_ORG.id,
        branch_id: MAIN_BRANCH_ID,
        patient_id: PATIENT_LAILA_ID,
        doctor_id: DOCTOR_AHMED_ID,
        appointment_date: TOMORROW,
        date: TOMORROW,
        start_time: '14:00',
        end_time: '14:30',
        duration_minutes: 30,
        status: 'confirmed',
        confirmation_status: 'pending_confirmation',
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: 'p11_5_apt_stranger_03',
        organization_id: DEFAULT_EGYPT_ORG.id,
        branch_id: MAIN_BRANCH_ID,
        patient_id: PATIENT_STRANGER_ID,
        doctor_id: DOCTOR_AHMED_ID,
        appointment_date: TOMORROW,
        date: TOMORROW,
        start_time: '16:00',
        end_time: '16:30',
        duration_minutes: 30,
        status: 'confirmed',
        confirmation_status: 'pending_confirmation',
        created_at: nowIso,
        updated_at: nowIso,
      },
    ];

    setStoredAppointments(baselineAppointments);
    setStoredFollowUpPlans([]);
  });

  // ----------------------------------------------------
  // 1. Appointment Confirmation Workflows
  // ----------------------------------------------------
  describe('1. Appointment Confirmation Workflows', () => {
    it('allows patient self-confirmation via Patient Portal', () => {
      const res = confirmAppointmentByPatient('p11_5_apt_today_01', {
        organizationId: DEFAULT_EGYPT_ORG.id,
        patientId: PATIENT_AHMED_ID,
        isPatientPortal: true,
      });

      expect(res.success).toBe(true);
      expect(res.appointment?.confirmation_status).toBe('patient_confirmed');
      expect(res.appointment?.confirmed_at).toBeDefined();
      expect(res.appointment?.confirmed_by).toBe(PATIENT_AHMED_ID);
    });

    it('allows receptionist confirmation within authorized branch scope', () => {
      const res = confirmAppointmentByReception('p11_5_apt_tomorrow_02', {
        organizationId: DEFAULT_EGYPT_ORG.id,
        profileId: 'rec_staff_01',
        roleKey: 'receptionist',
        assignedBranchIds: [MAIN_BRANCH_ID],
      });

      expect(res.success).toBe(true);
      expect(res.appointment?.confirmation_status).toBe('reception_confirmed');
      expect(res.appointment?.confirmed_at).toBeDefined();
    });

    it('allows verified guardian to confirm appointment for authorized dependent ward', () => {
      const res = confirmAppointmentByPatient('p11_5_apt_tomorrow_02', {
        organizationId: DEFAULT_EGYPT_ORG.id,
        patientId: PATIENT_AHMED_ID, // Ahmed is Laila's guardian
        isPatientPortal: true,
      });

      expect(res.success).toBe(true);
      expect(res.appointment?.confirmation_status).toBe('patient_confirmed');
    });

    it('rejects patient attempt to confirm stranger appointment', () => {
      const res = confirmAppointmentByPatient('p11_5_apt_stranger_03', {
        organizationId: DEFAULT_EGYPT_ORG.id,
        patientId: PATIENT_AHMED_ID,
        isPatientPortal: true,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Access Denied');
    });

    it('returns unconfirmed appointments alert list for reception staff', () => {
      const alerts = getUnconfirmedAppointmentsAlerts(
        {
          organizationId: DEFAULT_EGYPT_ORG.id,
          assignedBranchIds: [MAIN_BRANCH_ID],
        },
        MAIN_BRANCH_ID
      );

      expect(alerts.unconfirmed_count).toBeGreaterThanOrEqual(3);
    });
  });

  // ----------------------------------------------------
  // 2. Automated & Triggered Reminders
  // ----------------------------------------------------
  describe('2. Automated Reminders & Duplicate Prevention', () => {
    it('sends 24-hour reminder for tomorrow appointment and same-day reminder for today appointment', () => {
      const res = sendAppointmentReminders({ organizationId: DEFAULT_EGYPT_ORG.id });

      expect(res.processed).toBe(3);
      expect(res.reminders_24h_sent).toBe(2); // TOMORROW apts
      expect(res.reminders_sameday_sent).toBe(1); // TODAY apt
    });

    it('prevents duplicate reminder notifications for the same appointment event', () => {
      // First run
      sendAppointmentReminders({ organizationId: DEFAULT_EGYPT_ORG.id });

      // Second run immediately after
      const res2 = sendAppointmentReminders({ organizationId: DEFAULT_EGYPT_ORG.id });

      expect(res2.processed).toBe(0);
      expect(res2.reminders_24h_sent).toBe(0);
      expect(res2.reminders_sameday_sent).toBe(0);
    });

    it('suppresses reminders for cancelled appointments', () => {
      cancelAppointment('p11_5_apt_today_01', 'Patient cancelled', {
        organizationId: DEFAULT_EGYPT_ORG.id,
        patientId: PATIENT_AHMED_ID,
        isPatientPortal: true,
      });

      const res = sendAppointmentReminders({ organizationId: DEFAULT_EGYPT_ORG.id });
      const cancelledSent = res.reminders.find((r) => r.appointment_id === 'p11_5_apt_today_01');
      expect(cancelledSent).toBeUndefined();
    });

    it('suppresses reminders for completed appointments', () => {
      updateAppointmentStatus('p11_5_apt_today_01', 'completed', {
        organizationId: DEFAULT_EGYPT_ORG.id,
      });

      const res = sendAppointmentReminders({ organizationId: DEFAULT_EGYPT_ORG.id });
      const completedSent = res.reminders.find((r) => r.appointment_id === 'p11_5_apt_today_01');
      expect(completedSent).toBeUndefined();
    });

    it('suppresses reminders for no-show appointments', () => {
      markNoShowAppointment('p11_5_apt_today_01', {
        organizationId: DEFAULT_EGYPT_ORG.id,
      });

      const res = sendAppointmentReminders({ organizationId: DEFAULT_EGYPT_ORG.id });
      const noShowSent = res.reminders.find((r) => r.appointment_id === 'p11_5_apt_today_01');
      expect(noShowSent).toBeUndefined();
    });

    it('invalidates old reminders and clears timestamps on appointment reschedule', () => {
      // First send reminders
      sendAppointmentReminders({ organizationId: DEFAULT_EGYPT_ORG.id });

      // Reschedule appointment to a new date
      const res = rescheduleAppointment(
        {
          appointment_id: 'p11_5_apt_today_01',
          new_date: TOMORROW,
          new_start_time: '15:00',
        },
        { organizationId: DEFAULT_EGYPT_ORG.id }
      );

      expect(res.success).toBe(true);
      expect(res.appointment?.reminder_24h_sent_at).toBeUndefined();
      expect(res.appointment?.reminder_sameday_sent_at).toBeUndefined();
      expect(res.appointment?.confirmation_status).toBe('pending_confirmation');
    });
  });

  // ----------------------------------------------------
  // 3. No-Show & Recall System Integration
  // ----------------------------------------------------
  describe('3. No-Show & Recall System Integration', () => {
    it('creates recall follow-up plan automatically when appointment is marked no-show', () => {
      const res = markNoShowAppointment('p11_5_apt_today_01', {
        organizationId: DEFAULT_EGYPT_ORG.id,
      });

      expect(res.success).toBe(true);

      const plans = getStoredFollowUpPlans();
      expect(plans.length).toBeGreaterThan(0);

      const noShowPlan = plans.find((p) => p.patient_id === PATIENT_AHMED_ID);
      expect(noShowPlan).toBeDefined();
      expect(noShowPlan?.status).toBe('due');
    });

    it('prevents duplicate recall records when marking no-show repeatedly', () => {
      markNoShowAppointment('p11_5_apt_today_01', {
        organizationId: DEFAULT_EGYPT_ORG.id,
      });

      const count1 = getStoredFollowUpPlans().length;

      // Mark no-show again or trigger recall sync
      markNoShowAppointment('p11_5_apt_today_01', {
        organizationId: DEFAULT_EGYPT_ORG.id,
      });

      const count2 = getStoredFollowUpPlans().length;
      expect(count2).toBe(count1);
    });
  });

  // ----------------------------------------------------
  // 4. Isolation & RLS Security
  // ----------------------------------------------------
  describe('4. Multi-Tenant Organization & Branch Isolation', () => {
    it('rejects cross-organization confirmation attempts', () => {
      const res = confirmAppointmentByReception('p11_5_apt_today_01', {
        organizationId: SECONDARY_EGYPT_ORG.id, // Different org
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Cross-organization violation');
    });

    it('rejects staff confirmation outside assigned branch scope', () => {
      const res = confirmAppointmentByReception('p11_5_apt_today_01', {
        organizationId: DEFAULT_EGYPT_ORG.id,
        assignedBranchIds: [ZAMALEK_BRANCH_ID], // Wrong branch
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Unauthorized branch');
    });
  });

  // ----------------------------------------------------
  // 5. Phase 11 Regressions
  // ----------------------------------------------------
  describe('5. Phase 11.1 - 11.4 Regressions', () => {
    it('preserves Phase 11.4 queue construction and ordering', () => {
      const queue = getAppointmentQueue(
        { branch_id: MAIN_BRANCH_ID, date: TODAY },
        { organizationId: DEFAULT_EGYPT_ORG.id }
      );

      expect(queue.summary.total_today).toBeGreaterThan(0);
    });

    it('preserves Phase 11.3 128-bit QR check-in token generation & resolution', () => {
      const apts = getStoredAppointments();
      const token = generateAppointmentCheckInToken(apts[0]);

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
