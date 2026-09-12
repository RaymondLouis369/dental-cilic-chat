import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientAuth } from './PatientAuthContext';
import { calculateAge, getAgeGroup, Patient } from '../../types/patient';
import {
  Users,
  User,
  ChevronDown,
  Check,
  ArrowRightLeft,
  Shield,
  Phone,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface ProfileDropdownProps {
  onNavigate?: (tab: 'home' | 'digitalCard' | 'profile' | 'family' | 'notifications' | 'settings') => void;
  onOpenChooserModal?: () => void;
  className?: string;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  onNavigate,
  onOpenChooserModal,
  className = '',
}) => {
  const { t, language } = useLanguage();
  const { session, selectPatientContext } = usePatientAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [switchedToast, setSwitchedToast] = useState<string | null>(null);

  if (!session) return null;

  const currentPatient = session.selectedPatient;
  const authPatient = session.authenticatedPatient;
  const availableProfiles = session.availableProfiles;
  const hasMultiple = availableProfiles.length > 1;
  const isRtl = language === 'ar';

  const currentAge = calculateAge(currentPatient.date_of_birth);
  const currentAgeGroup = getAgeGroup(currentPatient.date_of_birth);
  const isCurrentGuardian = currentPatient.id === authPatient.id;

  // Close dropdown on outside click or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectProfile = (patient: Patient) => {
    if (patient.id === currentPatient.id) {
      setIsOpen(false);
      return;
    }

    const res = selectPatientContext(patient.id);
    if (res.success) {
      setSwitchedToast(`${patient.first_name} ${patient.last_name}`);
      setTimeout(() => setSwitchedToast(null), 3000);
    }
    setIsOpen(false);
  };

  const formatMobileDisplay = (mobile: string) => {
    if (!mobile) return '';
    // Format Egyptian mobile numbers: e.g. +20 100 000 0001
    if (mobile.startsWith('+20') && mobile.length >= 12) {
      return `${mobile.slice(0, 3)} ${mobile.slice(3, 6)} ${mobile.slice(6, 9)} ${mobile.slice(9)}`;
    }
    return mobile;
  };

  return (
    <div className={`relative inline-block text-start ${className}`} ref={dropdownRef}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        id="btn-profile-dropdown-trigger"
        className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all select-none ${
          isOpen
            ? 'bg-teal-100/70 border-teal-400 shadow-sm ring-2 ring-teal-500/20'
            : 'bg-teal-50/80 hover:bg-teal-100/80 border-teal-200 text-teal-900 shadow-xs'
        }`}
        title={t.profileDropdown.switchProfileDesc}
      >
        {/* Avatar Circle */}
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0 ${
            isCurrentGuardian
              ? 'bg-gradient-to-tr from-teal-700 to-teal-500'
              : 'bg-gradient-to-tr from-amber-600 to-amber-500'
          }`}
        >
          {currentPatient.first_name[0] || 'م'}
        </div>

        {/* Text Details */}
        <div className="text-start leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 text-xs sm:text-sm">
              {currentPatient.first_name} {currentPatient.last_name}
            </span>

            {/* Linked Profiles Count Chip */}
            {hasMultiple && (
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-teal-200/80 text-teal-900">
                {availableProfiles.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-teal-700 font-medium">
            <span className="font-mono">{currentPatient.patient_code}</span>
            <span>•</span>
            <span>
              {isCurrentGuardian
                ? t.profileDropdown.guardianRole
                : t.profileDropdown.childRole}
            </span>
          </div>
        </div>

        {/* Animated Chevron */}
        <ChevronDown
          className={`w-4 h-4 text-teal-700 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      {/* Floating Success Toast (Brief Notification) */}
      {switchedToast && (
        <div className="absolute top-full mt-2 start-0 z-50 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-1 duration-200 whitespace-nowrap pointer-events-none">
          <Check className="w-3.5 h-3.5 text-teal-400" />
          <span>
            {t.profileDropdown.switchedSuccess} <strong>{switchedToast}</strong>
          </span>
        </div>
      )}

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="btn-profile-dropdown-trigger"
          className={`absolute z-50 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150 ${
            isRtl ? 'start-auto end-0 sm:start-0 sm:end-auto' : 'end-0 sm:start-0 sm:end-auto'
          }`}
        >
          {/* Header Banner: Shared Mobile Number Info */}
          <div className="p-4 bg-gradient-to-br from-slate-50 to-teal-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Users className="w-4 h-4 text-teal-600" />
                <span>{t.profileDropdown.linkedAccounts}</span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                {availableProfiles.length} {t.profileDropdown.profileCount}
              </span>
            </div>

            {/* Mobile Number Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-teal-200/70 text-xs font-mono text-slate-800 shadow-xs">
              <Phone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span dir="ltr" className="font-semibold">
                {formatMobileDisplay(authPatient.primary_mobile)}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              {t.profileDropdown.sharedMobileNotice}
            </p>
          </div>

          {/* List of Profiles */}
          <div className="max-h-72 overflow-y-auto p-2 space-y-1.5">
            {availableProfiles.map((profile) => {
              const age = calculateAge(profile.date_of_birth);
              const ageGroup = getAgeGroup(profile.date_of_birth);
              const isActive = profile.id === currentPatient.id;
              const isGuardian = profile.id === authPatient.id;

              return (
                <button
                  key={profile.id}
                  onClick={() => handleSelectProfile(profile)}
                  id={`btn-dropdown-profile-${profile.patient_code}`}
                  role="menuitem"
                  className={`w-full p-3 rounded-xl flex items-center justify-between text-start transition-all ${
                    isActive
                      ? 'bg-teal-50/90 border border-teal-400 text-teal-950 shadow-xs ring-1 ring-teal-400/30'
                      : 'bg-white hover:bg-slate-50 border border-slate-200/70 hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                        isGuardian
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {profile.first_name[0]}
                    </div>

                    {/* Patient Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {profile.first_name} {profile.middle_name || ''} {profile.last_name}
                        </span>

                        {isGuardian ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-100 text-blue-800 shrink-0">
                            {t.patientPortal.guardian}
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-800 shrink-0">
                            {t.patientPortal.childBadge}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                        <span>{profile.patient_code}</span>
                        <span>•</span>
                        <span className="font-sans">
                          {age} {t.patientPortal.years} ({ageGroup === 'child' ? t.patientPortal.childBadge : t.patientPortal.adultBadge})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Status / Switch Trigger */}
                  <div className="ms-2 shrink-0">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full shadow-2xs">
                        <Check className="w-3.5 h-3.5 text-teal-700" />
                        <span>{t.profileDropdown.activeBadge}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 group-hover:text-teal-700 bg-slate-100 hover:bg-teal-100 px-2 py-1 rounded-lg transition-colors">
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>{t.family.switchActive}</span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="p-3 bg-slate-50 flex items-center justify-between gap-2">
            {onNavigate && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onNavigate('family');
                }}
                id="btn-dropdown-manage-family"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline p-1"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{t.profileDropdown.manageFamily}</span>
              </button>
            )}

            {onOpenChooserModal && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenChooserModal();
                }}
                id="btn-dropdown-open-full-modal"
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 p-1 ms-auto"
              >
                <span>{t.profileDropdown.viewAllProfiles}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
