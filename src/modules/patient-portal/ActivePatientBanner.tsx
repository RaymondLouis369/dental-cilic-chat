import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientAuth } from './PatientAuthContext';
import { calculateAge, getAgeGroup } from '../../types/patient';
import {
  User,
  ShieldCheck,
  ArrowRightLeft,
  Info,
  Sparkles,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface ActivePatientBannerProps {
  onOpenSwitcher?: () => void;
  className?: string;
}

export const ActivePatientBanner: React.FC<ActivePatientBannerProps> = ({
  onOpenSwitcher,
  className = '',
}) => {
  const { t, language } = useLanguage();
  const { session, selectPatientContext } = usePatientAuth();

  if (!session) return null;

  const currentPatient = session.selectedPatient;
  const authPatient = session.authenticatedPatient;
  const isGuardianView = currentPatient.id !== authPatient.id;
  const hasMultipleProfiles = session.availableProfiles.length > 1;
  const age = calculateAge(currentPatient.date_of_birth);
  const ageGroup = getAgeGroup(currentPatient.date_of_birth);

  return (
    <div
      id="active-patient-context-banner"
      className={`relative overflow-hidden rounded-2xl border transition-all shadow-xs ${
        isGuardianView
          ? 'bg-gradient-to-r from-amber-500/10 via-amber-50 to-white border-amber-300/80 text-amber-950'
          : 'bg-gradient-to-r from-teal-600/10 via-teal-50 to-white border-teal-300/80 text-teal-950'
      } ${className}`}
    >
      <div className="px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Left Side: Avatar + Active Patient Details */}
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Avatar Ring */}
          <div className="relative shrink-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white text-base shadow-sm ${
                isGuardianView
                  ? 'bg-gradient-to-tr from-amber-600 to-amber-500 ring-2 ring-amber-300'
                  : 'bg-gradient-to-tr from-teal-700 to-teal-500 ring-2 ring-teal-300'
              }`}
            >
              {currentPatient.first_name[0] || 'م'}
            </div>
            <div
              className={`absolute -bottom-1 -end-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[9px] ${
                isGuardianView ? 'bg-amber-600 text-white' : 'bg-teal-600 text-white'
              }`}
              title={isGuardianView ? t.activePatientBanner.badgeWard : t.activePatientBanner.badgeSelf}
            >
              {isGuardianView ? 'و' : '✓'}
            </div>
          </div>

          {/* Details */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500">
                {t.activePatientBanner.currentlyViewing}
              </span>

              <h2 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight truncate">
                {currentPatient.first_name} {currentPatient.middle_name || ''} {currentPatient.last_name}
              </h2>

              {/* Status / Role Tag */}
              {isGuardianView ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/80 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>{t.activePatientBanner.badgeWard}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-300/80 shrink-0">
                  <User className="w-3.5 h-3.5 text-teal-700" />
                  <span>{t.activePatientBanner.badgeSelf}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600 mt-0.5 flex-wrap">
              <span className="font-mono font-bold text-slate-800 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                {currentPatient.patient_code}
              </span>
              <span>•</span>
              <span>
                {age} {t.patientPortal.years} ({ageGroup === 'child' ? t.patientPortal.childBadge : t.patientPortal.adultBadge})
              </span>
              <span>•</span>
              <span className="text-slate-500 hidden sm:inline">
                {isGuardianView
                  ? t.activePatientBanner.viewingAsGuardian
                  : t.activePatientBanner.viewingAsSelf}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Switch Action & Medical Context Badge */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60">
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-500 max-w-xs leading-tight">
            <Info className="w-4 h-4 shrink-0 text-slate-400" />
            <span>{t.activePatientBanner.contextNotice}</span>
          </div>

          {hasMultipleProfiles && onOpenSwitcher && (
            <button
              type="button"
              onClick={onOpenSwitcher}
              id="btn-banner-switch-patient"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 ${
                isGuardianView
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                  : 'bg-teal-700 hover:bg-teal-800 text-white shadow-teal-700/20'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{t.activePatientBanner.switchQuick}</span>
              <span className="bg-white/20 text-white px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                {session.availableProfiles.length}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
