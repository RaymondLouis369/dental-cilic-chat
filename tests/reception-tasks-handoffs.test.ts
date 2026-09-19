import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDoctorTask,
  getReceptionHandoffTasks,
  updateDoctorTaskStatus,
  getStoredDoctorTasks,
} from '../src/lib/clinicalStorage';
import { resetPhase3StorageToSeeds } from '../src/lib/receptionAndBillingStorage';
import { DEFAULT_EGYPT_ORG } from '../src/lib/storage';

describe('Reception Tasks & Clinical Handoffs Engine', () => {
  beforeEach(() => {
    resetPhase3StorageToSeeds();
  });

  it('creates and retrieves reception handoff tasks filtered by branch', () => {
    const branch1 = '11111111-1111-1111-1111-111111111111';
    const branch2 = '22222222-2222-2222-2222-222222222222';

    const task1 = createDoctorTask({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: branch1,
      patientId: 'patient_001',
      doctorId: 'doc_001',
      taskType: 'obtain_consent',
      title: 'Obtain Root Canal Treatment Consent',
      details: 'Patient needs consent signed prior to starting 16 RCT',
      priority: 'urgent',
    });

    const task2 = createDoctorTask({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: branch2,
      patientId: 'patient_002',
      doctorId: 'doc_002',
      taskType: 'schedule_follow_up',
      title: 'Schedule 2-Week Post-Op Evaluation',
      priority: 'normal',
    });

    expect(task1).toBeDefined();
    expect(task1.id).toBeDefined();

    // Query handoff tasks for Branch 1
    const branch1Tasks = getReceptionHandoffTasks(DEFAULT_EGYPT_ORG.id, branch1);
    expect(branch1Tasks.some((t) => t.id === task1.id)).toBe(true);
    expect(branch1Tasks.some((t) => t.id === task2.id)).toBe(false);

    // Query all branches
    const allBranchTasks = getReceptionHandoffTasks(DEFAULT_EGYPT_ORG.id, 'all');
    expect(allBranchTasks.some((t) => t.id === task1.id)).toBe(true);
    expect(allBranchTasks.some((t) => t.id === task2.id)).toBe(true);
  });

  it('updates task status to in_progress and completed with staff tracking', () => {
    const task = createDoctorTask({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: '11111111-1111-1111-1111-111111111111',
      patientId: 'patient_001',
      doctorId: 'doc_001',
      taskType: 'book_specialist',
      title: 'Book Orthodontist Consultation',
      priority: 'normal',
    });

    expect(task.status).toBe('pending');

    // Move to in_progress
    const inProgressResult = updateDoctorTaskStatus(task.id, 'in_progress');
    expect(inProgressResult).toBe(true);

    let updatedTasks = getStoredDoctorTasks();
    let currentTask = updatedTasks.find((t) => t.id === task.id);
    expect(currentTask?.status).toBe('in_progress');

    // Complete task
    const receptionistId = 'staff_rec_001';
    const completedResult = updateDoctorTaskStatus(task.id, 'completed', receptionistId);
    expect(completedResult).toBe(true);

    updatedTasks = getStoredDoctorTasks();
    currentTask = updatedTasks.find((t) => t.id === task.id);
    expect(currentTask?.status).toBe('completed');
    expect(currentTask?.completed_by_staff_id).toBe(receptionistId);
    expect(currentTask?.completed_at).toBeDefined();
  });

  it('filters handoff tasks by pending status', () => {
    const pendingTasksBefore = getReceptionHandoffTasks(
      DEFAULT_EGYPT_ORG.id,
      '11111111-1111-1111-1111-111111111111',
      'pending'
    );

    const newTask = createDoctorTask({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: '11111111-1111-1111-1111-111111111111',
      patientId: 'patient_003',
      doctorId: 'doc_001',
      taskType: 'collect_required_document',
      title: 'Collect Lab X-Ray Report',
      priority: 'urgent',
    });

    const pendingTasksAfter = getReceptionHandoffTasks(
      DEFAULT_EGYPT_ORG.id,
      '11111111-1111-1111-1111-111111111111',
      'pending'
    );

    expect(pendingTasksAfter.length).toBe(pendingTasksBefore.length + 1);
    expect(pendingTasksAfter.some((t) => t.id === newTask.id)).toBe(true);
  });

  it('filters tasks by priority (urgent vs normal) and branch authorization', () => {
    const branch1 = '11111111-1111-1111-1111-111111111111';
    const branch2 = '22222222-2222-2222-2222-222222222222';

    const urgentTask = createDoctorTask({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: branch1,
      patientId: 'patient_001',
      doctorId: 'doc_001',
      taskType: 'obtain_consent',
      title: 'Urgent Pre-Surgical Consent',
      priority: 'urgent',
    });

    const normalTask = createDoctorTask({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: branch1,
      patientId: 'patient_002',
      doctorId: 'doc_001',
      taskType: 'contact_patient',
      title: 'Routine Courtesy Call',
      priority: 'normal',
    });

    const otherBranchUrgentTask = createDoctorTask({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: branch2,
      patientId: 'patient_003',
      doctorId: 'doc_002',
      taskType: 'obtain_consent',
      title: 'Branch 2 Urgent Task',
      priority: 'urgent',
    });

    const branch1Tasks = getStoredDoctorTasks().filter((t) => t.branch_id === branch1);

    const urgentFiltered = branch1Tasks.filter((t) => t.priority === 'urgent');
    expect(urgentFiltered.some((t) => t.id === urgentTask.id)).toBe(true);
    expect(urgentFiltered.some((t) => t.id === normalTask.id)).toBe(false);
    expect(urgentFiltered.some((t) => t.id === otherBranchUrgentTask.id)).toBe(false);

    const normalFiltered = branch1Tasks.filter((t) => t.priority === 'normal');
    expect(normalFiltered.some((t) => t.id === normalTask.id)).toBe(true);
    expect(normalFiltered.some((t) => t.id === urgentTask.id)).toBe(false);
  });
});
