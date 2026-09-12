import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientAuth } from './PatientAuthContext';
import { calculateAge, getAgeGroup } from '../../types/patient';
import {
  User,
  Phone,
  Mail,
  Calendar,
  Building2,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export const PatientProfile: React.FC = () => {
  const { t, language } = useLanguage();
  const { session, updateProfile } = usePatientAuth();

  const patient = session?.selectedPatient;

  const [secondaryMobile, setSecondaryMobile] = useState(patient?.secondary_mobile || '');
  const [email, setEmail] = useState(patient?.email || '');
  const [preferredLang, setPreferredLang] = useState<'ar' | 'en'>(
    patient?.preferred_language || 'ar'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!patient || !session) return null;

  const age = calculateAge(patient.date_of_birth);
  const ageGroup = getAgeGroup(patient.date_of_birth);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(false);
    setErrorMessage(null);

    const res = await updateProfile({
      secondary_mobile: secondaryMobile.trim() || undefined,
      email: email.trim() || undefined,
      preferred_language: preferredLang,
    });

    setIsSaving(false);
    if (res.success) {
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);
    } else {
      setErrorMessage(res.error || 'Failed to update profile');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          {t.patientProfile.title}
        </h2>
        <p className="text-sm text-slate-600 mt-1">{t.patientProfile.subtitle}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm">
        {/* Read-only Immutable Fields */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              البيانات الثابتة المعتمدة بالمركز الطبي
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">
              {patient.patient_code}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-500 block mb-1">
                {t.patientProfile.fullName}
              </span>
              <span className="font-bold text-slate-800 block">
                {patient.first_name} {patient.middle_name || ''} {patient.last_name}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-500 block mb-1">
                {t.patientProfile.dob}
              </span>
              <span className="font-semibold text-slate-800 block">
                {patient.date_of_birth} ({age} {t.patientPortal.years} •{' '}
                {ageGroup === 'child' ? t.patientPortal.childBadge : t.patientPortal.adultBadge})
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-500 block mb-1">
                {t.patientProfile.primaryMobile}
              </span>
              <span className="font-mono text-slate-800 block dir-ltr text-start">
                {patient.primary_mobile}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-500 block mb-1">
                {t.patientProfile.orgScope}
              </span>
              <span className="font-medium text-slate-800 block">
                {session.organization.name}
              </span>
            </div>
          </div>
        </div>

        {/* Editable Contact Fields */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800">
            معلومات التواصل المفوض بتعديلها
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.patientProfile.secondaryMobile}
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute top-3 start-3" />
              <input
                type="tel"
                value={secondaryMobile}
                onChange={(e) => setSecondaryMobile(e.target.value)}
                placeholder="+20 1..."
                className="w-full ps-9 pe-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.patientProfile.email}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute top-3 start-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@example.eg"
                className="w-full ps-9 pe-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.patientProfile.preferredLanguage}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPreferredLang('ar')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                  preferredLang === 'ar'
                    ? 'bg-teal-50 border-teal-600 text-teal-800'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                العربية (RTL)
              </button>
              <button
                type="button"
                onClick={() => setPreferredLang('en')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                  preferredLang === 'en'
                    ? 'bg-teal-50 border-teal-600 text-teal-800'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                English (LTR)
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {successMessage && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{t.patientProfile.saveSuccess}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          type="submit"
          disabled={isSaving}
          id="btn-save-patient-profile"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? t.common.loading : t.patientProfile.saveBtn}</span>
        </button>

        {/* Security Notice */}
        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>{t.patientProfile.readOnlyNotice}</span>
        </div>
      </form>
    </div>
  );
};
