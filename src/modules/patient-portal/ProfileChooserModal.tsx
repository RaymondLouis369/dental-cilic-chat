import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientAuth } from './PatientAuthContext';
import { calculateAge, getAgeGroup, Patient } from '../../types/patient';
import { Users, User, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface ProfileChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileChooserModal: React.FC<ProfileChooserModalProps> = ({ isOpen, onClose }) => {
  const { t, language } = useLanguage();
  const { session, selectPatientContext } = usePatientAuth();

  if (!isOpen || !session) return null;

  const isRtl = language === 'ar';
  const ChevronIcon = isRtl ? ChevronLeft : ChevronRight;

  const handleSelect = (patient: Patient) => {
    selectPatientContext(patient.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 mx-auto flex items-center justify-center mb-3 shadow-inner">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {t.patientAuth.chooseProfileTitle}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            {t.patientAuth.chooseProfileDesc}
          </p>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pt-1">
          {session.availableProfiles.map((p) => {
            const age = calculateAge(p.date_of_birth);
            const ageGroup = getAgeGroup(p.date_of_birth);
            const isSelected = session.selectedPatient.id === p.id;
            const isGuardian = session.authenticatedPatient.id === p.id;

            return (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                id={`btn-choose-profile-${p.patient_code}`}
                className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all text-start ${
                  isSelected
                    ? 'bg-teal-50/70 border-teal-500 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                    {p.first_name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {p.first_name} {p.middle_name || ''} {p.last_name}
                      </span>
                      {isGuardian ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-100 text-blue-800">
                          {t.patientPortal.guardian}
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-800">
                          {t.patientPortal.childBadge}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-mono block">
                      {p.patient_code} • {age} {t.patientPortal.years}
                    </span>
                  </div>
                </div>

                <ChevronIcon className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
        >
          {t.common.close}
        </button>
      </div>
    </div>
  );
};
