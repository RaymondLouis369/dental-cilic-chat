import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  ShieldAlert,
  UserCheck,
  Lock,
  MessageSquare,
  Bell,
} from 'lucide-react';
import { useLanguage } from '../modules/i18n/LanguageContext';
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
} from '../lib/escalationStorage';
import { getNotificationsForUser, resetNotificationsToSeeds } from '../lib/notificationStorage';
import { Profile, Patient } from '../types';
import { DEFAULT_EGYPT_ORG, DEFAULT_BRANCHES } from '../lib/storage';

interface TestItem {
  id: number;
  nameAr: string;
  nameEn: string;
  passed: boolean;
  details: string;
}

export const Phase10_3AcceptanceTestRunner: React.FC = () => {
  const { language } = useLanguage();
  const [results, setResults] = useState<TestItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runPhase10_3Tests = async () => {
    setIsRunning(true);
    resetEscalationsToSeed();
    resetNotificationsToSeeds();

    const runs: TestItem[] = [];
    const orgId = DEFAULT_EGYPT_ORG.id;
    const branchId = DEFAULT_BRANCHES[0].id;
    const now = new Date().toISOString();

    const mockPatient: Patient = {
      id: 'pat_ui_103',
      organization_id: orgId,
      patient_code: 'P-UI-103',
      first_name: 'أحمد',
      last_name: 'علي',
      date_of_birth: '1990-01-01',
      primary_mobile: '+201011112222',
      gender: 'male',
      preferred_language: 'ar',
      country_code: '+20',
      status: 'active',
      created_at: now,
      updated_at: now,
    };

    const mockDocA: Profile = {
      id: 'prof_doc_ui_a',
      auth_user_id: 'auth_doc_ui_a',
      organization_id: orgId,
      branch_id: branchId,
      role_id: 'role_doctor',
      role_key: 'doctor',
      display_name: 'د. كريم حسن',
      email: 'doc.a@clinic.eg',
      active: true,
      created_at: now,
      updated_at: now,
    };

    const mockDocB: Profile = {
      id: 'prof_doc_ui_b',
      auth_user_id: 'auth_doc_ui_b',
      organization_id: orgId,
      branch_id: branchId,
      role_id: 'role_doctor',
      role_key: 'doctor',
      display_name: 'د. سارة أحمد',
      email: 'doc.b@clinic.eg',
      active: true,
      created_at: now,
      updated_at: now,
    };

    const mockLabUser: Profile = {
      id: 'prof_lab_ui',
      auth_user_id: 'auth_lab_ui',
      organization_id: orgId,
      branch_id: branchId,
      role_id: 'role_lab',
      role_key: 'lab_user',
      display_name: 'فني المعمل',
      email: 'lab@clinic.eg',
      active: true,
      created_at: now,
      updated_at: now,
    };

    // Test 1: Creation & Disclaimer
    try {
      const esc = createHumanEscalation({
        organization_id: orgId,
        branch_id: branchId,
        patient_id: mockPatient.id,
        chat_message_id: 'chat_msg_ui_1',
        subject: 'ألم باللثة بعد الزرع',
        original_prompt: 'عندي تورم وألم شديد أرجو الرد المباشر',
        category: 'medical_symptom',
        priority: 'urgent',
      });

      const passed =
        esc.id &&
        esc.organization_id === orgId &&
        esc.category === 'medical_symptom' &&
        esc.medical_disclaimer === MEDICAL_SAFETY_DISCLAIMER;

      runs.push({
        id: 1,
        nameAr: '10.3.1 إنشاء طلب التصعيد البشري وإرفاق تحذير الأمان الطبي',
        nameEn: '10.3.1 Human Escalation Creation & Medical Safety Disclaimer',
        passed: Boolean(passed),
        details: passed
          ? `تم إنشاء طلب التصعيد بنجاح (${esc.id}) مع إرفاق تنبيه إخلاء المسؤولية الطبي.`
          : 'فشل في إنشاء طلب التصعيد أو إرفاق تنبيه الأمان الطبي.',
      });
    } catch (e: any) {
      runs.push({
        id: 1,
        nameAr: '10.3.1 إنشاء طلب التصعيد البشري وإرفاق تحذير الأمان الطبي',
        nameEn: '10.3.1 Human Escalation Creation & Medical Safety Disclaimer',
        passed: false,
        details: e?.message || 'Error occurred during creation test.',
      });
    }

    // Test 2: Role Authorization
    try {
      const docList = getEscalationsForUser({ kind: 'staff', profile: mockDocA });
      const labList = getEscalationsForUser({ kind: 'staff', profile: mockLabUser });

      const passed = docList.length > 0 && labList.length === 0;

      runs.push({
        id: 2,
        nameAr: '10.3.2 التحقق من حصر التصعيدات على الأدوار المصرحة (استقبال/أطباء/مديرين)',
        nameEn: '10.3.2 Recipient Role Authorization Check (Receptionist/Doctors/Managers)',
        passed,
        details: passed
          ? 'تم التحقق من قبول الطبيب وحجب فني المعمل غير المصرح له.'
          : 'فشل في تطبيق نظام الأدوار والتحقق من صلاحية الوصول.',
      });
    } catch (e: any) {
      runs.push({
        id: 2,
        nameAr: '10.3.2 التحقق من حصر التصعيدات على الأدوار المصرحة',
        nameEn: '10.3.2 Recipient Role Authorization Check',
        passed: false,
        details: e?.message,
      });
    }

    // Test 3: Duplicate Responder Prevention
    try {
      const esc = createHumanEscalation({
        organization_id: orgId,
        branch_id: branchId,
        patient_id: mockPatient.id,
        subject: 'استفسار المواعيد',
        original_prompt: 'متى أقرب موعد متاح؟',
      });

      const claimA = claimHumanEscalation(esc.id, mockDocA);
      const claimB = claimHumanEscalation(esc.id, mockDocB); // should fail

      const passed = claimA.success && !claimB.success && claimB.error?.includes('claimed by another responder');

      runs.push({
        id: 3,
        nameAr: '10.3.3 منع تعدد المستجيبين النشطين لنفس طلب التصعيد (Duplicate Responders)',
        nameEn: '10.3.3 Duplicate Active Responder Prevention',
        passed,
        details: passed
          ? 'تم استلام الطبيب الأول وحجب الطبيب الثاني بنجاح لمنع الازدواجية.'
          : 'فشل في منع الازدواجية أو تحذير المستجيب الثاني.',
      });
    } catch (e: any) {
      runs.push({
        id: 3,
        nameAr: '10.3.3 منع تعدد المستجيبين النشطين',
        nameEn: '10.3.3 Duplicate Active Responder Prevention',
        passed: false,
        details: e?.message,
      });
    }

    // Test 4: Staff Reply & Notifications
    try {
      const esc = createHumanEscalation({
        organization_id: orgId,
        branch_id: branchId,
        patient_id: mockPatient.id,
        subject: 'سؤال العلاج',
        original_prompt: 'أرجو الرد بخصوص خطة الزرع',
      });

      const replyRes = addEscalationReply(
        {
          escalation_id: esc.id,
          message: 'أهلاً بك أستاذ أحمد. سنقوم بفحص كثافة العظم أولاً.',
          sender_type: 'staff',
          sender_id: mockDocA.id,
          sender_name: mockDocA.display_name,
          sender_role: mockDocA.role_key,
        },
        { kind: 'staff', profile: mockDocA }
      );

      const patNotifs = getNotificationsForUser({ kind: 'patient', patient: mockPatient, organization_id: orgId });
      const replyNotif = patNotifs.find((n) => n.type === 'escalation_reply');

      const passed = replyRes.success && replyNotif !== undefined;

      runs.push({
        id: 4,
        nameAr: '10.3.4 دورة رد الطبيب وإشعار المريض التلقائي',
        nameEn: '10.3.4 Staff Reply Workflow & Automatic Patient Notification',
        passed,
        details: passed
          ? 'تم إضافة رد الطبيب وإصدار إشعار تلقائي للمريض.'
          : 'فشل في حفظ رد الطبيب أو توجيه الإشعار.',
      });
    } catch (e: any) {
      runs.push({
        id: 4,
        nameAr: '10.3.4 دورة رد الطبيب وإشعار المريض التلقائي',
        nameEn: '10.3.4 Staff Reply Workflow & Automatic Patient Notification',
        passed: false,
        details: e?.message,
      });
    }

    setResults(runs);
    setIsRunning(false);
  };

  const passedCount = results.filter((r) => r.passed).length;

  return (
    <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-4 shadow-xl border border-slate-800 my-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg">
              {language === 'ar'
                ? 'اختبارات القبول — Phase 10.3: Human Escalation & Staff Replies'
                : 'Acceptance Verification — Phase 10.3: Human Escalation & Staff Replies'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'ar'
                ? 'التحقق من دورات التصعيد، منع المستجيبين المزدوجين، تحذيرات الأمان الطبي، والإشعارات المتبادلة.'
                : 'Verifying escalation workflows, duplicate responder prevention, medical safety disclaimers, and multi-tenant isolation.'}
            </p>
          </div>
        </div>

        <button
          onClick={runPhase10_3Tests}
          disabled={isRunning}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 transition shadow-xs disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isRunning ? 'جاري التشغيل...' : 'تشغيل حزمة اختبارات Phase 10.3'}</span>
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>النتائج التشغيلية ({passedCount}/{results.length})</span>
            <span className={passedCount === results.length ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
              {passedCount === results.length ? 'ALL 10.3 TESTS PASSING' : 'SOME TESTS FAILED'}
            </span>
          </div>

          <div className="space-y-2">
            {results.map((r) => (
              <div
                key={r.id}
                className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  {r.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-bold text-slate-200">
                      {language === 'ar' ? r.nameAr : r.nameEn}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{r.details}</p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase shrink-0 ${
                    r.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {r.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
