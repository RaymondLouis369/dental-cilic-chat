import { describe, it, expect, beforeEach } from 'vitest';
import {
  createFollowUpPlan,
  getStoredFollowUpPlans,
  setStoredFollowUpPlans,
  getFilteredFollowUpPlans,
  updateFollowUpPlanStatus,
  rescheduleFollowUpPlan,
  recordFollowUpContactResult,
  getStoredDoctorTasks,
  setStoredDoctorTasks,
  getDoctorDashboardSummary,
} from '../src/lib/clinicalStorage';
import { getStoredNotifications, setStoredNotifications } from '../src/lib/notificationStorage';
import { RecallType, FollowUpStatus } from '../src/types/clinical';

describe('Recall & Follow-up Management System', () => {
  beforeEach(() => {
    // Clear storage before each test
    setStoredFollowUpPlans([]);
    setStoredDoctorTasks([]);
    setStoredNotifications([]);
  });

  it('creates follow-up plan with all required fields and supported recall types', () => {
    const recallTypes: RecallType[] = [
      'post_operative',
      'implant',
      'suture_removal',
      'cleaning_hygiene',
      'prosthetic',
      'orthodontic',
      'general_treatment',
    ];

    recallTypes.forEach((recallType, idx) => {
      const result = createFollowUpPlan({
        organizationId: 'org_test_01',
        branchId: 'branch_test_01',
        patientId: `pat_${idx}`,
        doctorId: 'doc_test_01',
        recallType,
        dueDate: '2026-10-20',
        reason: `Follow up for ${recallType}`,
        notes: 'Check progress and healing',
        status: 'scheduled',
      });

      expect(result.followUp).toBeDefined();
      expect(result.followUp.organization_id).toBe('org_test_01');
      expect(result.followUp.branch_id).toBe('branch_test_01');
      expect(result.followUp.patient_id).toBe(`pat_${idx}`);
      expect(result.followUp.doctor_id).toBe('doc_test_01');
      expect(result.followUp.recall_type).toBe(recallType);
      expect(result.followUp.due_date).toBe('2026-10-20');
      expect(result.followUp.notes).toBe('Check progress and healing');
      expect(result.followUp.status).toBe('scheduled');
    });

    const stored = getStoredFollowUpPlans();
    expect(stored.length).toBe(7);
  });

  it('automatically creates a Reception Task upon follow-up creation', () => {
    const { followUp, task } = createFollowUpPlan({
      organizationId: 'org_test_01',
      branchId: 'branch_test_01',
      patientId: 'pat_100',
      doctorId: 'doc_100',
      recallType: 'suture_removal',
      dueDate: '2026-10-25',
      reason: 'Suture Removal Session',
      createReceptionTask: true,
    });

    expect(task).toBeDefined();
    expect(task?.task_type).toBe('schedule_follow_up');
    expect(task?.patient_id).toBe('pat_100');
    expect(task?.organization_id).toBe('org_test_01');
    expect(task?.branch_id).toBe('branch_test_01');
    expect(task?.status).toBe('pending');
    expect(followUp.reception_task_id).toBe(task?.id);

    // Verify task stored in Doctor Tasks storage
    const storedTasks = getStoredDoctorTasks();
    expect(storedTasks.some((t) => t.id === task?.id)).toBe(true);
  });

  it('emits notifications to reception and patient portal', () => {
    createFollowUpPlan({
      organizationId: 'org_test_01',
      branchId: 'branch_test_01',
      patientId: 'pat_200',
      doctorId: 'doc_200',
      recallType: 'cleaning_hygiene',
      dueDate: '2026-10-28',
      reason: 'Routine Dental Cleaning',
    });

    const notifications = getStoredNotifications();
    expect(notifications.length).toBeGreaterThan(0);
    // Task creation emits reception task notification
    const receptionNotif = notifications.find(
      (n) => n.organization_id === 'org_test_01' && n.type === 'reception_task'
    );
    expect(receptionNotif).toBeDefined();
  });

  it('correctly filters due and overdue recalls', () => {
    const today = new Date().toISOString().split('T')[0];

    // Create overdue plan
    createFollowUpPlan({
      organizationId: 'org_test_01',
      branchId: 'branch_01',
      patientId: 'pat_overdue',
      doctorId: 'doc_01',
      recallType: 'post_operative',
      dueDate: '2026-01-01', // Past date
      reason: 'Past due follow-up',
      status: 'scheduled',
      createReceptionTask: false,
    });

    // Create future plan
    createFollowUpPlan({
      organizationId: 'org_test_01',
      branchId: 'branch_01',
      patientId: 'pat_future',
      doctorId: 'doc_01',
      recallType: 'orthodontic',
      dueDate: '2028-12-31', // Far future
      reason: 'Future ortho checkup',
      status: 'scheduled',
      createReceptionTask: false,
    });

    const dueOnly = getFilteredFollowUpPlans({
      organizationId: 'org_test_01',
      dueOnly: true,
    });

    expect(dueOnly.length).toBe(1);
    expect(dueOnly[0].patient_id).toBe('pat_overdue');
  });

  it('supports updating status across all valid statuses', () => {
    const { followUp } = createFollowUpPlan({
      organizationId: 'org_test_01',
      patientId: 'pat_status',
      doctorId: 'doc_01',
      dueDate: '2026-10-30',
      reason: 'Test Status Transition',
      createReceptionTask: true,
    });

    const validStatuses: FollowUpStatus[] = [
      'due',
      'contacted',
      'scheduled',
      'completed',
      'missed',
      'cancelled',
    ];

    validStatuses.forEach((st) => {
      const ok = updateFollowUpPlanStatus(followUp.id, st);
      expect(ok).toBe(true);

      const plans = getStoredFollowUpPlans();
      const updated = plans.find((p) => p.id === followUp.id);
      expect(updated?.status).toBe(st);
    });

    // Verify task completion sync when status is completed
    const tasks = getStoredDoctorTasks();
    const linkedTask = tasks.find((t) => t.id === followUp.reception_task_id);
    expect(linkedTask?.status).toBe('completed');
  });

  it('handles contact result recording and rescheduling', () => {
    const { followUp } = createFollowUpPlan({
      organizationId: 'org_test_01',
      patientId: 'pat_resched',
      doctorId: 'doc_01',
      dueDate: '2026-10-15',
      reason: 'Implant Checkup',
      createReceptionTask: false,
    });

    // Record contact result
    const contactOk = recordFollowUpContactResult(
      followUp.id,
      'Called patient, agreed to reschedule next week',
      'staff_rec_01',
      'contacted'
    );
    expect(contactOk).toBe(true);

    let plans = getStoredFollowUpPlans();
    let item = plans.find((p) => p.id === followUp.id);
    expect(item?.contact_result).toBe('Called patient, agreed to reschedule next week');
    expect(item?.last_contacted_by_id).toBe('staff_rec_01');
    expect(item?.status).toBe('contacted');

    // Reschedule
    const reschedOk = rescheduleFollowUpPlan(
      followUp.id,
      '2026-11-01',
      'Rescheduled per patient request',
      'staff_rec_01'
    );
    expect(reschedOk).toBe(true);

    plans = getStoredFollowUpPlans();
    item = plans.find((p) => p.id === followUp.id);
    expect(item?.due_date).toBe('2026-11-01');
    expect(item?.rescheduled_date).toBe('2026-10-15');
    expect(item?.status).toBe('scheduled');
    expect(item?.notes).toContain('Rescheduled per patient request');
  });

  it('enforces Organization Isolation strictly', () => {
    createFollowUpPlan({
      organizationId: 'org_alpha',
      branchId: 'branch_01',
      patientId: 'pat_alpha',
      doctorId: 'doc_alpha',
      dueDate: '2026-10-10',
      reason: 'Org Alpha FollowUp',
    });

    createFollowUpPlan({
      organizationId: 'org_beta',
      branchId: 'branch_01',
      patientId: 'pat_beta',
      doctorId: 'doc_beta',
      dueDate: '2026-10-10',
      reason: 'Org Beta FollowUp',
    });

    const alphaPlans = getFilteredFollowUpPlans({ organizationId: 'org_alpha' });
    const betaPlans = getFilteredFollowUpPlans({ organizationId: 'org_beta' });

    expect(alphaPlans.length).toBe(1);
    expect(alphaPlans[0].patient_id).toBe('pat_alpha');

    expect(betaPlans.length).toBe(1);
    expect(betaPlans[0].patient_id).toBe('pat_beta');
  });

  it('enforces Branch Isolation strictly', () => {
    createFollowUpPlan({
      organizationId: 'org_test_01',
      branchId: 'branch_north',
      patientId: 'pat_north',
      doctorId: 'doc_01',
      dueDate: '2026-10-10',
      reason: 'North Branch FollowUp',
    });

    createFollowUpPlan({
      organizationId: 'org_test_01',
      branchId: 'branch_south',
      patientId: 'pat_south',
      doctorId: 'doc_01',
      dueDate: '2026-10-10',
      reason: 'South Branch FollowUp',
    });

    const northPlans = getFilteredFollowUpPlans({
      organizationId: 'org_test_01',
      branchId: 'branch_north',
    });
    const southPlans = getFilteredFollowUpPlans({
      organizationId: 'org_test_01',
      branchId: 'branch_south',
    });

    expect(northPlans.length).toBe(1);
    expect(northPlans[0].patient_id).toBe('pat_north');

    expect(southPlans.length).toBe(1);
    expect(southPlans[0].patient_id).toBe('pat_south');
  });

  it('populates due follow-ups correctly in Doctor Dashboard Summary', () => {
    createFollowUpPlan({
      organizationId: 'org_test_01',
      branchId: 'branch_01',
      patientId: 'pat_doc_summary',
      doctorId: 'doc_summary_01',
      dueDate: '2026-01-01', // Due/overdue
      reason: 'Critical post-op check',
      status: 'scheduled',
      createReceptionTask: false,
    });

    const summary = getDoctorDashboardSummary({
      organizationId: 'org_test_01',
      doctorId: 'doc_summary_01',
      branchId: 'branch_01',
    });

    expect(summary.followUpsDue.length).toBe(1);
    expect(summary.followUpsDue[0].patient_id).toBe('pat_doc_summary');
    expect(summary.stats.follow_ups_due_count).toBe(1);
  });
});
