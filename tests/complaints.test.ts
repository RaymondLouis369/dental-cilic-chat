import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSupportTicket,
  getFilteredSupportTickets,
  getSupportTicketById,
  updateSupportTicketStatus,
  assignSupportTicket,
  addTicketReply,
  escalateSupportTicket,
  resetComplaintsStorageToSeed,
} from '../src/lib/complaintStorage';
import { getNotificationsForUser, UserNotificationContext } from '../src/lib/notificationStorage';
import { DEFAULT_EGYPT_ORG, SECONDARY_EGYPT_ORG } from '../src/lib/storage';
import { Profile } from '../src/types';

describe('Phase 09.3: Complaints & Support Tickets Workflows', () => {
  const cairoBranchId = '11111111-1111-1111-1111-111111111111';
  const alexBranchId = '22222222-2222-2222-2222-222222222222';

  const patient1Id = 'pat_test_001';
  const patient2Id = 'pat_test_002';

  const recProfile: Profile = {
    id: 'staff_rec_01',
    auth_user_id: 'auth_rec_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    role_id: 'role_rec',
    branch_id: cairoBranchId,
    display_name: 'سارة استقبال',
    email: 'sara.rec@dental.eg',
    role_key: 'receptionist',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const docProfile: Profile = {
    id: 'staff_doc_01',
    auth_user_id: 'auth_doc_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    role_id: 'role_doc',
    branch_id: cairoBranchId,
    display_name: 'د. كريم حسن',
    email: 'dr.karim@dental.eg',
    role_key: 'doctor',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const staffContext: UserNotificationContext = {
    kind: 'staff',
    profile: recProfile,
  };

  const docContext: UserNotificationContext = {
    kind: 'staff',
    profile: docProfile,
  };

  beforeEach(() => {
    resetComplaintsStorageToSeed();
  });

  it('1. Ticket Creation: creates a ticket with correct ticket_number, status open, and triggers notifications', () => {
    const result = createSupportTicket({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: cairoBranchId,
      patientId: patient1Id,
      patientName: 'أحمد محمود',
      patientPhone: '01012345678',
      category: 'Reception',
      subject: 'تأخير في وقت الاستقبال',
      description: 'انتظرت أكثر من نصف ساعة قبل الدخول',
      priority: 'urgent',
    });

    expect(result.ticket).toBeDefined();
    expect(result.ticket.ticket_number).toMatch(/^TKT-\d{4}-\d+/);
    expect(result.ticket.status).toBe('open');
    expect(result.ticket.priority).toBe('urgent');
    expect(result.ticket.category).toBe('Reception');
    expect(result.ticket.organization_id).toBe(DEFAULT_EGYPT_ORG.id);
    expect(result.ticket.branch_id).toBe(cairoBranchId);
    expect(result.ticket.patient_id).toBe(patient1Id);
    expect(result.ticket.replies.length).toBe(1);

    // Check notification creation
    const notifications = getNotificationsForUser(staffContext);
    expect(notifications.some((n) => n.title_ar.includes(result.ticket.ticket_number))).toBe(true);
  });

  it('2. Organization & Branch Isolation: isolates tickets by org and branch', () => {
    // Ticket in Org 1 Cairo
    createSupportTicket({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: cairoBranchId,
      patientId: patient1Id,
      patientName: 'أحمد محمود',
      patientPhone: '01012345678',
      category: 'Appointment',
      subject: 'تأخير في موعد العيادة',
      description: 'انتظرت أكثر من 45 دقيقة',
      priority: 'normal',
    });

    // Ticket in Org 2 Alex
    createSupportTicket({
      organizationId: SECONDARY_EGYPT_ORG.id,
      branchId: alexBranchId,
      patientId: patient2Id,
      patientName: 'منى علي',
      patientPhone: '01198765432',
      category: 'Insurance',
      subject: 'تأخير الموافقة التأمينية',
      description: 'شركة التأمين ترغب في إعادة فحص الأشعة',
      priority: 'normal',
    });

    // Query Org 1 Cairo (2 seed tickets + 1 new = 3)
    const org1Tickets = getFilteredSupportTickets({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: cairoBranchId,
    });
    expect(org1Tickets.length).toBe(3);
    expect(org1Tickets.some((t) => t.patient_id === patient1Id)).toBe(true);

    // Query Org 2 Alex (0 seeds + 1 new = 1)
    const org2Tickets = getFilteredSupportTickets({
      organizationId: SECONDARY_EGYPT_ORG.id,
      branchId: alexBranchId,
    });
    expect(org2Tickets.length).toBe(1);
    expect(org2Tickets[0].patient_id).toBe(patient2Id);
  });

  it('3. Patient Isolation: patients can access only their own tickets', () => {
    createSupportTicket({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: cairoBranchId,
      patientId: patient1Id,
      patientName: 'أحمد محمود',
      patientPhone: '01012345678',
      category: 'Appointment',
      subject: 'شكوى المريض الأول',
      description: 'نص الشكوى الأول',
      priority: 'normal',
    });

    createSupportTicket({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: cairoBranchId,
      patientId: patient2Id,
      patientName: 'منى علي',
      patientPhone: '01198765432',
      category: 'Clinical',
      subject: 'شكوى المريض الثاني',
      description: 'نص الشكوى الثاني',
      priority: 'normal',
    });

    // Patient 1 query
    const patient1Tickets = getFilteredSupportTickets({
      organizationId: DEFAULT_EGYPT_ORG.id,
      patientId: patient1Id,
      forPatient: true,
    });
    expect(patient1Tickets.some((t) => t.subject === 'شكوى المريض الأول')).toBe(true);
    expect(patient1Tickets.every((t) => t.patient_id === patient1Id)).toBe(true);

    // Patient 2 query
    const patient2Tickets = getFilteredSupportTickets({
      organizationId: DEFAULT_EGYPT_ORG.id,
      patientId: patient2Id,
      forPatient: true,
    });
    expect(patient2Tickets.length).toBe(1);
    expect(patient2Tickets[0].patient_id).toBe(patient2Id);
    expect(patient2Tickets[0].subject).toBe('شكوى المريض الثاني');
  });

  it('4. Internal Notes Privacy: internal staff notes are hidden from patients (forPatient: true)', () => {
    const { ticket } = createSupportTicket({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: cairoBranchId,
      patientId: patient1Id,
      patientName: 'أحمد محمود',
      patientPhone: '01012345678',
      category: 'Clinical',
      subject: 'ألم شديد بعد الحشو',
      description: 'أشعر بألم في الضرس العشرين',
      priority: 'urgent',
    });

    // Public reply from staff
    addTicketReply(ticket.id, {
      senderType: 'staff',
      senderId: 'staff_doc_01',
      senderName: 'د. كريم حسن',
      message: 'أهلاً بك، يرجى المتابعة وتناول المسكن وسنقوم بمراجعة الفحص',
      isInternal: false,
    });

    // Internal note from staff
    addTicketReply(ticket.id, {
      senderType: 'staff',
      senderId: 'staff_rec_01',
      senderName: 'سارة استقبال',
      message: 'ملاحظة داخلية سرية للموظفين: المريض لديه متأخرات مالية وملاحظة علاج جذور سابق',
      isInternal: true,
    });

    // Fetch for Staff (forPatient: false)
    const staffTicketView = getSupportTicketById(ticket.id, false);
    expect(staffTicketView).toBeDefined();
    expect(staffTicketView?.replies.length).toBe(3);
    expect(staffTicketView?.replies.some((r) => r.is_internal)).toBe(true);

    // Fetch for Patient (forPatient: true)
    const patientTicketView = getSupportTicketById(ticket.id, true);
    expect(patientTicketView).toBeDefined();
    expect(patientTicketView?.replies.length).toBe(2);
    expect(patientTicketView?.replies.some((r) => r.is_internal)).toBe(false);
    expect(patientTicketView?.replies.every((r) => !r.is_internal)).toBe(true);
  });

  it('5. Assignment & Status Transitions: supports updating assignment, status, and resolution notes', () => {
    const { ticket } = createSupportTicket({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: cairoBranchId,
      patientId: patient1Id,
      patientName: 'أحمد محمود',
      patientPhone: '01012345678',
      category: 'Billing',
      subject: 'تعديل الخصم',
      description: 'طلب مراجعة الفاتورة',
      priority: 'normal',
    });

    // Update status to in_progress
    const res1 = updateSupportTicketStatus(ticket.id, 'in_progress', 'staff_mgr_01');
    expect(res1).toBe(true);

    // Assign
    assignSupportTicket(ticket.id, 'staff_mgr_01', 'مدير المركز');

    let updated = getSupportTicketById(ticket.id, false);
    expect(updated?.status).toBe('in_progress');
    expect(updated?.assigned_to).toBe('staff_mgr_01');

    // Resolve ticket
    const res2 = updateSupportTicketStatus(
      ticket.id,
      'resolved',
      'staff_mgr_01',
      'تم تعديل الفاتورة وإعادة حساب نسبة الخصم المصرح بها'
    );
    expect(res2).toBe(true);

    updated = getSupportTicketById(ticket.id, false);
    expect(updated?.status).toBe('resolved');
    expect(updated?.resolved_at).toBeDefined();
    expect(updated?.resolution_notes).toBe('تم تعديل الفاتورة وإعادة حساب نسبة الخصم المصرح بها');
  });

  it('6. Medical/Urgent Escalation: escalates ticket to critical, notifies target role, and creates internal note', () => {
    const { ticket } = createSupportTicket({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: cairoBranchId,
      patientId: patient1Id,
      patientName: 'أحمد محمود',
      patientPhone: '01012345678',
      category: 'Clinical',
      subject: 'مضاعفات بعد الجراحة',
      description: 'نزيف خفيف مستمر مع انتفاخ',
      priority: 'urgent',
    });

    const res = escalateSupportTicket(
      ticket.id,
      'doctor',
      'staff_rec_01',
      'تم تصعيد الشكوى فوراً للطبيب المعالج بسبب الأعراض الطبية الجراحية'
    );
    expect(res).toBe(true);

    const escalated = getSupportTicketById(ticket.id, false);
    expect(escalated).toBeDefined();
    expect(escalated?.status).toBe('escalated');
    expect(escalated?.priority).toBe('critical');

    // Internal note was added documenting escalation
    const internalReplies = escalated?.replies.filter((r) => r.is_internal);
    expect(internalReplies?.length).toBeGreaterThan(0);
    expect(internalReplies?.[0].message).toContain('تم تصعيد الشكوى إلى الدور القيادي');

    // Doctor context receives notification
    const notifications = getNotificationsForUser(docContext);
    expect(notifications.some((n) => n.title_ar.includes('تصعيد عاجل'))).toBe(true);
  });

  it('7. Patient Reply: allows patient to add replies, updates ticket timestamp, and notifies staff', () => {
    const { ticket } = createSupportTicket({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: cairoBranchId,
      patientId: patient1Id,
      patientName: 'أحمد محمود',
      patientPhone: '01012345678',
      category: 'Reception',
      subject: 'طلب تغيير موعد المعاينة',
      description: 'أرغب في تقديم الموعد ليوم الغد',
      priority: 'normal',
    });

    const reply = addTicketReply(ticket.id, {
      senderType: 'patient',
      senderId: patient1Id,
      senderName: 'أحمد محمود',
      message: 'هل يمكن تأكيد الموعد الساعة 4 بدلاً من 6؟',
      isInternal: false,
    });

    expect(reply).toBeDefined();
    expect(reply?.sender_type).toBe('patient');

    const updatedTicket = getSupportTicketById(ticket.id, false);
    expect(updatedTicket?.replies.length).toBe(2);
    expect(updatedTicket?.replies[1].message).toContain('ساعة 4');

    // Staff receives notification of patient reply
    const notifications = getNotificationsForUser(staffContext);
    expect(notifications.some((n) => n.title_ar.includes('رد مريض على التذكرة'))).toBe(true);
  });
});
