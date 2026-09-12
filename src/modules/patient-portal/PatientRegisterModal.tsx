import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientAuth } from './PatientAuthContext';
import { registerNewPatient } from '../../lib/patientStorage';
import { DEFAULT_EGYPT_ORG } from '../../lib/storage';
import { UserPlus, Phone, Calendar, Mail, KeyRound, AlertCircle, Sparkles } from 'lucide-react';

interface PatientRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (mobile: string, pin: string) => void;
}

export const PatientRegisterModal: React.FC<PatientRegisterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useLanguage();

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (pin !== confirmPin) {
      setError('تأكيد الرقم السري غير متطابق.');
      setIsLoading(false);
      return;
    }

    const res = await registerNewPatient({
      organizationId: DEFAULT_EGYPT_ORG.id,
      fullName: fullName.trim(),
      mobile: mobile.trim(),
      dateOfBirth: dob,
      gender,
      email: email.trim() || undefined,
      preferredLanguage: 'ar',
      pin,
    });

    setIsLoading(false);

    if (res.success && res.patient) {
      onSuccess(mobile, pin);
      onClose();
    } else {
      const errKey = (res.error as keyof typeof t.patientErrors) || 'patient_login_invalid_credentials';
      const msg = t.patientErrors[errKey] || res.error || 'فشل تسجيل المريض الجديد.';
      setError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-base">
              {t.patientAuth.registerTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.patientAuth.fullName}
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="مثال: ياسمين طارق خليل"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.patientAuth.mobileLabel}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute top-3 start-3" />
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="01012345678"
                  className="w-full ps-9 pe-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.patientAuth.dob}
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute top-3 start-3" />
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full ps-9 pe-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.patientAuth.gender}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg border ${
                    gender === 'female'
                      ? 'bg-teal-50 border-teal-600 text-teal-800'
                      : 'bg-white border-slate-300 text-slate-600'
                  }`}
                >
                  أنثى
                </button>
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg border ${
                    gender === 'male'
                      ? 'bg-teal-50 border-teal-600 text-teal-800'
                      : 'bg-white border-slate-300 text-slate-600'
                  }`}
                >
                  ذكر
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.patientProfile.email} (اختياري)
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
          </div>

          {/* Secure PIN Creation */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <KeyRound className="w-4 h-4 text-teal-600" />
              <span>إنشاء الرقم السري الخاص (Fixed PIN)</span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              يجب أن يتكون من 4 إلى 6 أرقام. تجنب استخدام سنة ميلادك أو أرقام من هاتفك المحمول.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {t.patientAuth.pinLabel}
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {t.patientAuth.confirmPinLabel}
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              id="btn-submit-register-patient"
              className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? t.common.loading : t.patientAuth.registerBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
