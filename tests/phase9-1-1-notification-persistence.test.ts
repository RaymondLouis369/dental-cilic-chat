import { describe, it, expect, beforeEach } from 'vitest';
import {
  createNotification,
  getNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  resetNotificationsToSeeds,
  UserNotificationContext,
} from '../src/lib/notificationStorage';
import { DEFAULT_EGYPT_ORG, SECONDARY_EGYPT_ORG } from '../src/lib/storage';
import { Profile, Patient } from '../src/types';

describe('Phase 09.1.1: Persistent Notifications & Multi-Tenant RLS Policy Engine', () => {
  beforeEach(() => {
    resetNotificationsToSeeds();
  });

  const cairoBranchId = '11111111-1111-1111-1111-111111111111';
  const alexBranchId = '22222222-2222-2222-2222-222222222222';

  // Org 1 Staff
  const docProfile: Profile = {
    id: 'prof_doc_cairo_01',
    auth_user_id: 'auth_doc_cairo_01',
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

  const recProfile: Profile = {
    id: 'prof_rec_cairo_01',
    auth_user_id: 'auth_rec_cairo_01',
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

  const cairoBmProfile: Profile = {
    id: 'prof_bm_cairo_01',
    auth_user_id: 'auth_bm_cairo_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    role_id: 'role_bm',
    branch_id: cairoBranchId,
    display_name: 'مدير فرع المعادي',
    email: 'bm.cairo@dental.eg',
    role_key: 'branch_manager',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const alexBmProfile: Profile = {
    id: 'prof_bm_alex_02',
    auth_user_id: 'auth_bm_alex_02',
    organization_id: DEFAULT_EGYPT_ORG.id,
    role_id: 'role_bm',
    branch_id: alexBranchId,
    display_name: 'مدير فرع سموحة',
    email: 'bm.alex@dental.eg',
    role_key: 'branch_manager',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const centerManagerProfile: Profile = {
    id: 'prof_cm_01',
    auth_user_id: 'auth_cm_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    role_id: 'role_cm',
    branch_id: cairoBranchId,
    display_name: 'مدير عام المركز',
    email: 'center.manager@dental.eg',
    role_key: 'center_manager',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Org 2 Staff
  const org2StaffProfile: Profile = {
    id: 'prof_org2_doc_01',
    auth_user_id: 'auth_org2_doc_01',
    organization_id: SECONDARY_EGYPT_ORG.id,
    role_id: 'role_doc',
    branch_id: '33333333-3333-3333-3333-333333333333',
    display_name: 'د. طارق مؤسسة أخرى',
    email: 'dr.tarek@other-org.eg',
    role_key: 'doctor',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Org 1 Patients
  const patient1: Patient = {
    id: 'pat_09_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_code: 'EG-PAT-09-01',
    first_name: 'أحمد',
    last_name: 'محمود',
    primary_mobile: '01000000101',
    date_of_birth: '1995-05-15',
    preferred_language: 'ar',
    country_code: '+20',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const patient2: Patient = {
    id: 'pat_09_02',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_code: 'EG-PAT-09-02',
    first_name: 'منة',
    last_name: 'عصام',
    primary_mobile: '01000000102',
    date_of_birth: '1999-08-20',
    preferred_language: 'ar',
    country_code: '+20',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Org 2 Patient
  const org2Patient: Patient = {
    id: 'pat_org2_01',
    organization_id: SECONDARY_EGYPT_ORG.id,
    patient_code: 'EG-PAT-ORG2-01',
    first_name: 'عمر',
    last_name: 'فاروق',
    primary_mobile: '01200000201',
    date_of_birth: '1990-01-01',
    preferred_language: 'ar',
    country_code: '+20',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Contexts
  const docContext: UserNotificationContext = { kind: 'staff', profile: docProfile };
  const recContext: UserNotificationContext = { kind: 'staff', profile: recProfile };
  const cairoBmContext: UserNotificationContext = { kind: 'staff', profile: cairoBmProfile };
  const alexBmContext: UserNotificationContext = { kind: 'staff', profile: alexBmProfile };
  const cmContext: UserNotificationContext = { kind: 'staff', profile: centerManagerProfile };
  const org2StaffContext: UserNotificationContext = { kind: 'staff', profile: org2StaffProfile };

  const pat1Context: UserNotificationContext = {
    kind: 'patient',
    patient: patient1,
    organization_id: DEFAULT_EGYPT_ORG.id,
  };
  const pat2Context: UserNotificationContext = {
    kind: 'patient',
    patient: patient2,
    organization_id: DEFAULT_EGYPT_ORG.id,
  };
  const org2PatContext: UserNotificationContext = {
    kind: 'patient',
    patient: org2Patient,
    organization_id: SECONDARY_EGYPT_ORG.id,
  };

  it('verifies notification persistence with complete required schema fields', () => {
    const created = createNotification({
      organization_id: DEFAULT_EGYPT_ORG.id,
      branch_id: cairoBranchId,
      recipient_type: 'staff',
      recipient_id: docProfile.id,
      type: 'investigation_result',
      title_ar: 'تأكيد نتيجة الأشعة البانورامية',
      title_en: 'Panoramic X-Ray Result Confirmed',
      message_ar: 'تم رفع صورة الأشعة الخاصة بالمريض أحمد محمود',
      message_en: 'Panoramic image attached for patient Ahmed Mahmoud',
      related_entity_type: 'investigation',
      related_entity_id: 'inv_req_99',
    });

    expect(created.id).toBeDefined();
    expect(created.organization_id).toBe(DEFAULT_EGYPT_ORG.id);
    expect(created.branch_id).toBe(cairoBranchId);
    expect(created.recipient_type).toBe('staff');
    expect(created.recipient_id).toBe(docProfile.id);
    expect(created.type).toBe('investigation_result');
    expect(created.title_ar).toBe('تأكيد نتيجة الأشعة البانورامية');
    expect(created.title_en).toBe('Panoramic X-Ray Result Confirmed');
    expect(created.read).toBe(false);
    expect(created.created_at).toBeDefined();

    const userNotifs = getNotificationsForUser(docContext);
    const found = userNotifs.find((n) => n.id === created.id);
    expect(found).toBeDefined();
    expect(found?.title_ar).toBe('تأكيد نتيجة الأشعة البانورامية');
  });

  it('enforces strict organization isolation between Org 1 and Org 2', () => {
    const org1Notif = createNotification({
      organization_id: DEFAULT_EGYPT_ORG.id,
      recipient_type: 'role',
      target_role: 'doctor',
      type: 'system',
      title_ar: 'إشعار خاص بالمؤسسة الأولى',
      title_en: 'Org 1 Specific Alert',
      message_ar: 'رسالة سريعة',
      message_en: 'Quick message',
    });

    const org2Notif = createNotification({
      organization_id: SECONDARY_EGYPT_ORG.id,
      recipient_type: 'role',
      target_role: 'doctor',
      type: 'system',
      title_ar: 'إشعار خاص بالمؤسسة الثانية',
      title_en: 'Org 2 Specific Alert',
      message_ar: 'رسالة سريعة',
      message_en: 'Quick message',
    });

    const org1Notifs = getNotificationsForUser(docContext);
    const org2Notifs = getNotificationsForUser(org2StaffContext);

    expect(org1Notifs.some((n) => n.id === org1Notif.id)).toBe(true);
    expect(org1Notifs.some((n) => n.id === org2Notif.id)).toBe(false);

    expect(org2Notifs.some((n) => n.id === org2Notif.id)).toBe(true);
    expect(org2Notifs.some((n) => n.id === org1Notif.id)).toBe(false);
  });

  it('enforces role-based and profile-based recipient isolation', () => {
    const recNotif = createNotification({
      organization_id: DEFAULT_EGYPT_ORG.id,
      branch_id: cairoBranchId,
      recipient_type: 'role',
      target_role: 'receptionist',
      type: 'reception_task',
      title_ar: 'تأكيد القيد العائلي للمريض',
      title_en: 'Confirm Family Record Task',
      message_ar: 'مهمة خاصة بالاستقبال',
      message_en: 'Reception task',
    });

    const docSpecificNotif = createNotification({
      organization_id: DEFAULT_EGYPT_ORG.id,
      branch_id: cairoBranchId,
      recipient_type: 'staff',
      recipient_id: docProfile.id,
      type: 'system',
      title_ar: 'تنبيه شخصي للدكتور كريم',
      title_en: 'Personal Alert for Dr. Karim',
      message_ar: 'مهمة سرية',
      message_en: 'Private task',
    });

    const recList = getNotificationsForUser(recContext);
    const docList = getNotificationsForUser(docContext);

    expect(recList.some((n) => n.id === recNotif.id)).toBe(true);
    expect(recList.some((n) => n.id === docSpecificNotif.id)).toBe(false);

    expect(docList.some((n) => n.id === docSpecificNotif.id)).toBe(true);
    expect(docList.some((n) => n.id === recNotif.id)).toBe(false);
  });

  it('enforces branch isolation between Cairo and Alexandria branches with Center Manager override', () => {
    const alexBmNotif = createNotification({
      organization_id: DEFAULT_EGYPT_ORG.id,
      branch_id: alexBranchId,
      recipient_type: 'role',
      target_role: 'branch_manager',
      type: 'system',
      title_ar: 'تقرير فرع سموحة بالإسكندرية',
      title_en: 'Smouha Branch Report',
      message_ar: 'تقرير مالي',
      message_en: 'Financial report',
    });

    const alexCmNotif = createNotification({
      organization_id: DEFAULT_EGYPT_ORG.id,
      branch_id: alexBranchId,
      recipient_type: 'role',
      target_role: 'center_manager',
      type: 'system',
      title_ar: 'تنبيه للمدير العام بفرع الإسكندرية',
      title_en: 'Center Manager Alert at Alex Branch',
      message_ar: 'تحديث الحسابات',
      message_en: 'Accounts update',
    });

    const cairoBmList = getNotificationsForUser(cairoBmContext);
    const alexBmList = getNotificationsForUser(alexBmContext);
    const cmList = getNotificationsForUser(cmContext);

    // Cairo BM cannot see Alex Branch Manager notification
    expect(cairoBmList.some((n) => n.id === alexBmNotif.id)).toBe(false);
    // Alex BM sees Alex Branch Manager notification
    expect(alexBmList.some((n) => n.id === alexBmNotif.id)).toBe(true);

    // Center Manager overrides branch isolation and receives center_manager notification for Alex Branch
    expect(cairoBmList.some((n) => n.id === alexCmNotif.id)).toBe(false);
    expect(cmList.some((n) => n.id === alexCmNotif.id)).toBe(true);
  });

  it('enforces patient privacy and cross-patient isolation', () => {
    const pat1Notif = createNotification({
      organization_id: DEFAULT_EGYPT_ORG.id,
      branch_id: cairoBranchId,
      recipient_type: 'patient',
      recipient_id: patient1.id,
      type: 'consent_required',
      title_ar: 'إقرار موافقة جراحة أسنان',
      title_en: 'Surgery Consent Form',
      message_ar: 'يرجى التوقيع',
      message_en: 'Please sign',
    });

    const pat1List = getNotificationsForUser(pat1Context);
    const pat2List = getNotificationsForUser(pat2Context);
    const staffList = getNotificationsForUser(docContext);

    expect(pat1List.some((n) => n.id === pat1Notif.id)).toBe(true);
    expect(pat2List.some((n) => n.id === pat1Notif.id)).toBe(false);
    expect(staffList.some((n) => n.id === pat1Notif.id)).toBe(false);
  });

  it('updates read status and timestamp on markNotificationAsRead', () => {
    const notif = createNotification({
      organization_id: DEFAULT_EGYPT_ORG.id,
      branch_id: cairoBranchId,
      recipient_type: 'staff',
      recipient_id: docProfile.id,
      type: 'system',
      title_ar: 'اختبار قراءة التنبيه',
      title_en: 'Mark Read Test',
      message_ar: 'رسالة فحص',
      message_en: 'Test message',
    });

    expect(notif.read).toBe(false);

    const success = markNotificationAsRead(notif.id, docContext);
    expect(success).toBe(true);

    const updatedList = getNotificationsForUser(docContext);
    const updatedItem = updatedList.find((n) => n.id === notif.id);

    expect(updatedItem?.read).toBe(true);
    expect(updatedItem?.read_at).toBeDefined();
  });

  it('marks all unread notifications as read for authorized user context', () => {
    createNotification({
      organization_id: DEFAULT_EGYPT_ORG.id,
      branch_id: cairoBranchId,
      recipient_type: 'staff',
      recipient_id: docProfile.id,
      type: 'system',
      title_ar: 'تنبيه جماعي 1',
      title_en: 'Bulk Alert 1',
      message_ar: 'مضمون 1',
      message_en: 'Content 1',
    });

    createNotification({
      organization_id: DEFAULT_EGYPT_ORG.id,
      branch_id: cairoBranchId,
      recipient_type: 'staff',
      recipient_id: docProfile.id,
      type: 'system',
      title_ar: 'تنبيه جماعي 2',
      title_en: 'Bulk Alert 2',
      message_ar: 'مضمون 2',
      message_en: 'Content 2',
    });

    const initialUnreadCount = getNotificationsForUser(docContext).filter((n) => !n.read).length;
    expect(initialUnreadCount).toBeGreaterThanOrEqual(2);

    const markedCount = markAllNotificationsAsRead(docContext);
    expect(markedCount).toBeGreaterThanOrEqual(2);

    const finalUnreadCount = getNotificationsForUser(docContext).filter((n) => !n.read).length;
    expect(finalUnreadCount).toBe(0);
  });

  it('rejects unauthorized access when attempting to mark read for another user or organization', () => {
    const docNotif = createNotification({
      organization_id: DEFAULT_EGYPT_ORG.id,
      branch_id: cairoBranchId,
      recipient_type: 'staff',
      recipient_id: docProfile.id,
      type: 'system',
      title_ar: 'تنبيه سرّي للدكتور كريم',
      title_en: 'Secret Alert for Dr. Karim',
      message_ar: 'مضمون خفي',
      message_en: 'Secret content',
    });

    // Receptionist tries to mark doctor's personal notification as read
    const recResult = markNotificationAsRead(docNotif.id, recContext);
    expect(recResult).toBe(false);

    // Staff from Org 2 tries to mark Org 1 notification as read
    const org2Result = markNotificationAsRead(docNotif.id, org2StaffContext);
    expect(org2Result).toBe(false);

    // Verify item remains unread
    const docList = getNotificationsForUser(docContext);
    const item = docList.find((n) => n.id === docNotif.id);
    expect(item?.read).toBe(false);
  });
});
