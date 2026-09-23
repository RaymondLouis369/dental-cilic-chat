/**
 * Phase 10.3 Acceptance Test Suite
 * Human Escalation & Staff Reply Workflow Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createHumanEscalation,
  getEscalationsForUser,
  getEscalationWithReplies,
  claimHumanEscalation,
  releaseHumanEscalation,
  addEscalationReply,
  resolveHumanEscalation,
  reopenHumanEscalation,
  resetEscalationsToSeed,
  isAuthorizedStaffRecipient,
  MEDICAL_SAFETY_DISCLAIMER,
} from '../src/lib/escalationStorage';
import { createNotification, getNotificationsForUser, resetNotificationsToSeeds } from '../src/lib/notificationStorage';
import { Profile, RoleKey, Patient } from '../src/types';
import { DEFAULT_EGYPT_ORG, DEFAULT_BRANCHES } from '../src/lib/storage';

import { getStoredPatients } from '../src/lib/patientStorage';

describe('Phase 10.3: Human Escalation & Staff Reply Workflow', () => {
  const mockOrgId = DEFAULT_EGYPT_ORG.id;
  const mockBranchId = DEFAULT_BRANCHES[0].id;
  const now = new Date().toISOString();

  const seedPatients = getStoredPatients();
  const mockPatientA = seedPatients[0]; // Ahmed Mohamed
  const mockPatientB = seedPatients.find((p) => p.id === 'd4444444-4444-4444-4444-444444444444') || seedPatients[1]; // Mona Salem

  const mockDoctorA: Profile = {
    id: 'prof_doc_a',
    auth_user_id: 'auth_doc_a',
    organization_id: mockOrgId,
    branch_id: mockBranchId,
    role_id: 'role_doc',
    role_key: 'doctor',
    display_name: 'د. كريم حسن',
    email: 'doc.a@clinic.eg',
    active: true,
    created_at: now,
    updated_at: now,
  };

  const mockDoctorB: Profile = {
    id: 'prof_doc_b',
    auth_user_id: 'auth_doc_b',
    organization_id: mockOrgId,
    branch_id: mockBranchId,
    role_id: 'role_doc',
    role_key: 'doctor',
    display_name: 'د. سارة أحمد',
    email: 'doc.b@clinic.eg',
    active: true,
    created_at: now,
    updated_at: now,
  };

  const mockReceptionist: Profile = {
    id: 'prof_rec_a',
    auth_user_id: 'auth_rec_a',
    organization_id: mockOrgId,
    branch_id: mockBranchId,
    role_id: 'role_rec',
    role_key: 'receptionist',
    display_name: 'منسق الاستقبال',
    email: 'rec@clinic.eg',
    active: true,
    created_at: now,
    updated_at: now,
  };

  const mockLabUser: Profile = {
    id: 'prof_lab_a',
    auth_user_id: 'auth_lab_a',
    organization_id: mockOrgId,
    branch_id: mockBranchId,
    role_id: 'role_lab',
    role_key: 'lab_user',
    display_name: 'فني المعمل',
    email: 'lab@clinic.eg',
    active: true,
    created_at: now,
    updated_at: now,
  };

  beforeEach(() => {
    resetEscalationsToSeed();
    resetNotificationsToSeeds();
  });

  it('1. Should create a human escalation record with complete schema and medical safety disclaimer', () => {
    const esc = createHumanEscalation({
      organization_id: mockOrgId,
      branch_id: mockBranchId,
      patient_id: mockPatientA.id,
      chat_message_id: 'chat_msg_100',
      subject: 'ألم شديد جداً باللثة بعد زراعة التاج',
      original_prompt: 'عندي تورم وألم خافض للضغط بعد العملية بـ 4 ساعات',
      category: 'medical_symptom',
      priority: 'urgent',
    });

    expect(esc.id).toBeDefined();
    expect(esc.organization_id).toBe(mockOrgId);
    expect(esc.branch_id).toBe(mockBranchId);
    expect(esc.patient_id).toBe(mockPatientA.id);
    expect(esc.category).toBe('medical_symptom');
    expect(esc.priority).toBe('urgent');
    expect(esc.status).toBe('pending');
    expect(esc.assigned_staff_id).toBeNull();
    expect(esc.medical_disclaimer).toBe(MEDICAL_SAFETY_DISCLAIMER);

    // Verify escalation notification was emitted to authorized staff roles
    const notifications = getNotificationsForUser({
      kind: 'staff',
      profile: mockDoctorA,
    });
    const escCreatedNotif = notifications.find((n) => n.type === 'escalation_created');
    expect(escCreatedNotif).toBeDefined();
    expect(escCreatedNotif?.related_entity_id).toBe(esc.id);
  });

  it('2. Should authorize correct staff recipient roles and reject unauthorized staff roles', () => {
    expect(isAuthorizedStaffRecipient('center_manager')).toBe(true);
    expect(isAuthorizedStaffRecipient('branch_manager')).toBe(true);
    expect(isAuthorizedStaffRecipient('doctor')).toBe(true);
    expect(isAuthorizedStaffRecipient('receptionist')).toBe(true);
    expect(isAuthorizedStaffRecipient('lab_user')).toBe(false);
    expect(isAuthorizedStaffRecipient('delivery_user')).toBe(false);

    // Lab user query receives empty list
    const labList = getEscalationsForUser({
      kind: 'staff',
      profile: mockLabUser,
    });
    expect(labList).toEqual([]);

    // Doctor A receives active escalations
    const docList = getEscalationsForUser({
      kind: 'staff',
      profile: mockDoctorA,
    });
    expect(docList.length).toBeGreaterThan(0);
  });

  it('3. Should prevent duplicate active responders for the same escalation', () => {
    const esc = createHumanEscalation({
      organization_id: mockOrgId,
      branch_id: mockBranchId,
      patient_id: mockPatientA.id,
      subject: 'استفسار عن سعر التبييض',
      original_prompt: 'هل يوجد خصم على التبييض بالليزر هذا الأسبوع؟',
      category: 'general',
    });

    // Doctor A claims escalation
    const claimResA = claimHumanEscalation(esc.id, mockDoctorA);
    expect(claimResA.success).toBe(true);
    expect(claimResA.escalation?.status).toBe('claimed');
    expect(claimResA.escalation?.assigned_staff_id).toBe(mockDoctorA.id);

    // Doctor B tries to claim or reply to the same escalation -> REJECTED!
    const claimResB = claimHumanEscalation(esc.id, mockDoctorB);
    expect(claimResB.success).toBe(false);
    expect(claimResB.error).toContain('claimed by another responder');

    const replyResB = addEscalationReply(
      {
        escalation_id: esc.id,
        message: 'أنا سأجيب عليه',
        sender_type: 'staff',
        sender_id: mockDoctorB.id,
        sender_name: mockDoctorB.display_name,
        sender_role: mockDoctorB.role_key,
      },
      { kind: 'staff', profile: mockDoctorB }
    );
    expect(replyResB.success).toBe(false);
    expect(replyResB.error).toContain('claimed by another responder');

    // Doctor A releases the escalation
    const releaseRes = releaseHumanEscalation(esc.id, mockDoctorA);
    expect(releaseRes.success).toBe(true);
    expect(releaseRes.escalation?.status).toBe('pending');
    expect(releaseRes.escalation?.assigned_staff_id).toBeNull();

    // Doctor B can now claim and reply
    const claimResBRetry = claimHumanEscalation(esc.id, mockDoctorB);
    expect(claimResBRetry.success).toBe(true);
    expect(claimResBRetry.escalation?.assigned_staff_id).toBe(mockDoctorB.id);
  });

  it('4. Should support full staff action lifecycle: claim, reply, resolve, reopen', () => {
    const esc = createHumanEscalation({
      organization_id: mockOrgId,
      branch_id: mockBranchId,
      patient_id: mockPatientA.id,
      subject: 'مواعيد الدكتور كريم للتقويم',
      original_prompt: 'متى يكون الدكتور متواجد بالفرع؟',
      category: 'treatment_inquiry',
    });

    // 1. Staff Reply (automatically claims if unassigned)
    const replyRes = addEscalationReply(
      {
        escalation_id: esc.id,
        message: 'الدكتور متواجد أيام الأحد والأربعاء من 4 إلى 9 مساءً.',
        sender_type: 'staff',
        sender_id: mockDoctorA.id,
        sender_name: mockDoctorA.display_name,
        sender_role: mockDoctorA.role_key,
      },
      { kind: 'staff', profile: mockDoctorA }
    );
    expect(replyRes.success).toBe(true);
    expect(replyRes.escalation?.status).toBe('claimed');
    expect(replyRes.escalation?.assigned_staff_id).toBe(mockDoctorA.id);

    // Verify patient received escalation_reply notification
    const patNotifs = getNotificationsForUser({
      kind: 'patient',
      patient: mockPatientA,
      organization_id: mockOrgId,
    });
    const replyNotif = patNotifs.find((n) => n.type === 'escalation_reply');
    expect(replyNotif).toBeDefined();

    // 2. Resolve escalation
    const resolveRes = resolveHumanEscalation(esc.id, mockDoctorA, 'تم إعطاء الموعد وتأكيده مع المريض');
    expect(resolveRes.success).toBe(true);
    expect(resolveRes.escalation?.status).toBe('resolved');
    expect(resolveRes.escalation?.resolved_by_id).toBe(mockDoctorA.id);

    // Verify patient received escalation_resolved notification
    const patResolvedNotifs = getNotificationsForUser({
      kind: 'patient',
      patient: mockPatientA,
      organization_id: mockOrgId,
    });
    const resolvedNotif = patResolvedNotifs.find((n) => n.type === 'escalation_resolved');
    expect(resolvedNotif).toBeDefined();

    // 3. Reopen escalation
    const reopenRes = reopenHumanEscalation(
      esc.id,
      { kind: 'patient', patient: mockPatientA, organization_id: mockOrgId },
      'عفواً أريد تعديل اليوم إلى الثلاثاء'
    );
    expect(reopenRes.success).toBe(true);
    expect(reopenRes.escalation?.status).toBe('reopened');
  });

  it('5. Should enforce strict patient isolation and prevent cross-patient data leaks', () => {
    const escA = createHumanEscalation({
      organization_id: mockOrgId,
      branch_id: mockBranchId,
      patient_id: mockPatientA.id,
      subject: 'خاصة بالمريض أحمد',
      original_prompt: 'سري للغاية',
    });

    // Patient A can see their escalation
    const listA = getEscalationsForUser({
      kind: 'patient',
      patient: mockPatientA,
      organization_id: mockOrgId,
    });
    expect(listA.some((e) => e.id === escA.id)).toBe(true);

    // Patient B CANNOT see Patient A's escalation
    const listB = getEscalationsForUser({
      kind: 'patient',
      patient: mockPatientB,
      organization_id: mockOrgId,
    });
    expect(listB.some((e) => e.id === escA.id)).toBe(false);

    // Patient B cannot fetch thread of Patient A's escalation
    const threadB = getEscalationWithReplies(escA.id, {
      kind: 'patient',
      patient: mockPatientB,
      organization_id: mockOrgId,
    });
    expect(threadB).toBeNull();
  });
});
