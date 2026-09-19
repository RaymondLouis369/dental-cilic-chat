import React, { useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientAuth } from './PatientAuthContext';
import { calculateAge, getAgeGroup } from '../../types/patient';
import { getStoredFollowUpPlans } from '../../lib/clinicalStorage';
import { getStoredStaffUsers } from '../../lib/storage';
import { RecallType } from '../../types/clinical';
import {
  QrCode,
  User,
  Users,
  Bell,
  Building2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MapPin,
  Calendar,
  Check,
  CalendarClock,
  Tag,
  Stethoscope,
  Clock,
} from 'lucide-react';

interface PatientHomeProps {
  onNavigate: (tab: 'profile' | 'digitalCard' | 'family' | 'notifications' | 'settings') => void;
}

export const PatientHome: React.FC<PatientHomeProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { session, selectPatientContext } = usePatientAuth();

  if (!session) return null;

  const patient = session.selectedPatient;
  const authPatient = session.authenticatedPatient;
  const isWard = authPatient.id !== patient.id;
  const age = calculateAge(patient.date_of_birth);
  const ageGroup = getAgeGroup(patient.date_of_birth);
  const isRtl = language === 'ar';
  const ChevronIcon = isRtl ? ChevronLeft : ChevronRight;

  const staff = useMemo(() => getStoredStaffUsers(), []);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Fetch upcoming/due follow-ups for this patient
  const upcomingFollowUps = useMemo(() => {
    const all = getStoredFollowUpPlans();
    return all.filter((f) => {
      if (f.patient_id !== patient.id) return false;
      // Show upcoming or due follow-ups only (exclude completed/cancelled)
      if (f.status === 'completed' || f.status === 'cancelled') return false;
      return true;
    }).sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [patient.id]);

  const recallLabels: Record<RecallType, { ar: string; en: string }> = {
    post_operative: { ar: 'متابعة بعد الجراحة', en: 'Post-Operative' },
    implant: { ar: 'زراعة الأسنان', en: 'Implant Check' },
    suture_removal: { ar: 'فك خياطة الجراحة', en: 'Suture Removal' },
    cleaning_hygiene: { ar: 'تنظيف وتلميع أسنان', en: 'Cleaning / Hygiene' },
    prosthetic: { ar: 'تجربة تركيبات الأسنان', en: 'Prosthetic Trial' },
    orthodontic: { ar: 'متابعة تقويم الأسنان', en: 'Orthodontic Follow-Up' },
    general_treatment: { ar: 'متابعة علاجية عامة', en: 'General Follow-Up' },
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-800 to-slate-900 text-white p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-400/30 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{session.organization.name}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t.patientPortal.welcome}، {patient.first_name}! 👋
          </h2>

          {isWard ? (
            <p className="text-sm text-teal-200 mt-2">
              {t.patientPortal.underGuardianship}:{' '}
              <span className="font-semibold text-white">
                {authPatient.first_name} {authPatient.last_name}
              </span>{' '}
              ({t.patientPortal.guardian})
            </p>
          ) : (
            <p className="text-sm text-teal-100/90 mt-2">
              {t.patientPortal.orgWideIdentityNote}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3 pt-2">
            <div className="bg-slate-800/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs">
              <span className="text-slate-400 block text-[10px]">
                {t.patientPortal.patientCode}
              </span>
              <span className="font-mono font-bold text-teal-300">
                {patient.patient_code}
              </span>
            </div>

            <div className="bg-slate-800/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs">
              <span className="text-slate-400 block text-[10px]">
                {t.patientPortal.age}
              </span>
              <span className="font-semibold text-white">
                {age} {t.patientPortal.years}{' '}
                <span className="text-teal-300 font-normal">
                  ({ageGroup === 'child' ? t.patientPortal.childBadge : t.patientPortal.adultBadge})
                </span>
              </span>
            </div>

            <div className="bg-slate-800/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300 font-medium">
                {t.digitalCard.validBadge}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Linked Profiles Quick Switch Bar (When multiple profiles share mobile number) */}
      {session.availableProfiles.length > 1 && (
        <div className="bg-white rounded-xl border border-teal-200/80 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm">
                  {t.profileDropdown.linkedAccounts}
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  {session.availableProfiles.length} {t.profileDropdown.profileCount}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.profileDropdown.sharedMobileNotice}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {session.availableProfiles.map((p) => {
              const isSelected = p.id === patient.id;
              return (
                <button
                  key={p.id}
                  onClick={() => selectPatientContext(p.id)}
                  id={`home-switch-profile-${p.patient_code}`}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {p.first_name[0]}
                  </div>
                  <span>
                    {p.first_name} {p.last_name}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming & Due Follow-Ups Section */}
      <div className="bg-white rounded-2xl border border-teal-200/90 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {isRtl ? 'مواعيد الاستدعاء والمتابعة القادمة' : 'Upcoming & Due Recalls'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isRtl ? 'المواعيد والمتابعات المحددة لك بواسطة طبيبك المعالج' : 'Scheduled follow-ups and recall visits assigned by your dentist'}
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
            {upcomingFollowUps.length} {isRtl ? 'متابعة' : 'Follow-up(s)'}
          </span>
        </div>

        {upcomingFollowUps.length === 0 ? (
          <div className="py-6 text-center text-slate-400 space-y-1">
            <Calendar className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-medium">
              {isRtl ? 'لا توجد مواعيد استدعاء أو متابعات قادمة مستحقة حالياً.' : 'No upcoming or due follow-ups scheduled at this time.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcomingFollowUps.map((fup) => {
              const doc = staff.find((s) => s.id === fup.doctor_id);
              const docName = doc ? (isRtl ? doc.full_name_ar : doc.full_name_en) : fup.doctor_id;
              const rLabel = recallLabels[fup.recall_type || 'general_treatment'];
              const isOverdue = fup.due_date <= todayStr;

              return (
                <div
                  key={fup.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isOverdue
                      ? 'bg-amber-50/60 border-amber-300'
                      : 'bg-slate-50/70 border-slate-200 hover:border-teal-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-200">
                        {isRtl ? rLabel.ar : rLabel.en}
                      </span>
                      {isOverdue ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                          {isRtl ? 'مستحق الآن' : 'Due Now'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">
                          {isRtl ? 'قادم' : 'Upcoming'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-bold text-slate-900">
                      {fup.reason}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Stethoscope className="w-3 h-3 text-slate-400" />
                        {docName}
                      </span>
                    </div>
                  </div>

                  <div className="text-start sm:text-end shrink-0">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1 sm:justify-end">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      <span>{fup.due_date}</span>
                    </div>
                    {fup.contact_result && (
                      <span className="text-[10px] text-purple-700 block mt-0.5">
                        {isRtl ? 'تم التواصل المسبق' : 'Contacted'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
          {t.patientPortal.quickActions}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action 1: Digital Card */}
          <button
            onClick={() => onNavigate('digitalCard')}
            id="action-nav-digital-card"
            className="flex items-start justify-between p-5 bg-white hover:bg-teal-50/50 rounded-xl border border-slate-200/80 shadow-sm transition-all hover:border-teal-300 group text-start"
          >
            <div className="space-y-1.5">
              <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <QrCode className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm mt-3">
                {t.patientPortal.digitalCard}
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t.digitalCard.subtitle}
              </p>
            </div>
            <ChevronIcon className="w-5 h-5 text-slate-400 group-hover:text-teal-600 transition-colors shrink-0 mt-1" />
          </button>

          {/* Action 2: My Profile */}
          <button
            onClick={() => onNavigate('profile')}
            id="action-nav-profile"
            className="flex items-start justify-between p-5 bg-white hover:bg-teal-50/50 rounded-xl border border-slate-200/80 shadow-sm transition-all hover:border-teal-300 group text-start"
          >
            <div className="space-y-1.5">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <User className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm mt-3">
                {t.patientPortal.profile}
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t.patientProfile.subtitle}
              </p>
            </div>
            <ChevronIcon className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0 mt-1" />
          </button>

          {/* Action 3: Family & Dependents */}
          <button
            onClick={() => onNavigate('family')}
            id="action-nav-family"
            className="flex items-start justify-between p-5 bg-white hover:bg-teal-50/50 rounded-xl border border-slate-200/80 shadow-sm transition-all hover:border-teal-300 group text-start"
          >
            <div className="space-y-1.5">
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm mt-3">
                {t.patientPortal.family}
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t.family.subtitle}
              </p>
            </div>
            <ChevronIcon className="w-5 h-5 text-slate-400 group-hover:text-purple-600 transition-colors shrink-0 mt-1" />
          </button>

          {/* Action 4: Notifications */}
          <button
            onClick={() => onNavigate('notifications')}
            id="action-nav-notifications"
            className="flex items-start justify-between p-5 bg-white hover:bg-teal-50/50 rounded-xl border border-slate-200/80 shadow-sm transition-all hover:border-teal-300 group text-start"
          >
            <div className="space-y-1.5">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Bell className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm mt-3">
                {t.patientPortal.notifications}
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t.patientPortal.noNotifications}
              </p>
            </div>
            <ChevronIcon className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition-colors shrink-0 mt-1" />
          </button>
        </div>
      </div>

      {/* Available Branches Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Building2 className="w-4 h-4 text-teal-600" />
          <span>{t.patientPortal.centerBranches}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                {t.patientPortal.cairoBranch}
              </span>
              <span className="text-[11px] text-slate-500">
                شارع 9، المعادي • +20 2 2358 1234
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                {t.patientPortal.alexBranch}
              </span>
              <span className="text-[11px] text-slate-500">
                شارع فوزي معاذ، سموحة • +20 3 4291 5678
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                {t.patientPortal.gizaBranch}
              </span>
              <span className="text-[11px] text-slate-500">
                شارع مصدق، الدقي • +20 2 3762 9876
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 italic">
          * {t.patientPortal.allEgyptianBranches}
        </p>
      </div>
    </div>
  );
};
