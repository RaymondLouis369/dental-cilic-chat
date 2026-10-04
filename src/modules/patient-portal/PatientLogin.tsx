import React, { useState } from 'react';
import { isDevEnv } from '../../lib/env';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientAuth } from './PatientAuthContext';
import { ForgotPinModal } from './ForgotPinModal';
import { PatientRegisterModal } from './PatientRegisterModal';
import { ProfileChooserModal } from './ProfileChooserModal';
import {
  Phone,
  KeyRound,
  LogIn,
  UserPlus,
  ArrowRightLeft,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Users,
} from 'lucide-react';

interface PatientLoginProps {
  onSwitchToStaff: () => void;
}

export const PatientLogin: React.FC<PatientLoginProps> = ({ onSwitchToStaff }) => {
  const { t, language, setLanguage } = useLanguage();
  const { login } = usePatientAuth();

  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showProfileChooser, setShowProfileChooser] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const res = await login(mobile.trim(), pin.trim());
    setIsLoading(false);

    if (res.success) {
      if (res.profilesCount && res.profilesCount > 1) {
        setShowProfileChooser(true);
      }
    } else {
      const errKey = (res.errorKey as keyof typeof t.patientErrors) || 'patient_login_invalid_credentials';
      const msg = t.patientErrors[errKey] || 'بيانات تسجيل الدخول غير صحيحة.';
      setError(msg);
    }
  };

  const handleQuickDemo = (demoMobile: string, demoPin: string) => {
    setMobile(demoMobile);
    setPin(demoPin);
  };

  const handleRegisterSuccess = async (newMobile: string, newPin: string) => {
    setMobile(newMobile);
    setPin(newPin);
    await login(newMobile, newPin);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-100 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 start-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 end-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar for Language Toggle */}
      <div className="absolute top-4 end-4 z-20">
        <button
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition-colors"
        >
          {t.common.langSwitch}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/30 mb-2 shadow-lg">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t.patientAuth.loginTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {t.patientAuth.loginSubtitle}
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 bg-slate-800/90 backdrop-blur-md py-8 px-6 sm:px-8 shadow-2xl rounded-2xl border border-slate-700/80 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t.patientAuth.mobileLabel}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute top-3.5 start-3" />
                <input
                  type="tel"
                  id="patient-mobile-input"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder={t.patientAuth.mobilePlaceholder}
                  className="w-full ps-9 pe-3 py-2.5 text-sm bg-slate-900/80 text-white border border-slate-600 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none placeholder-slate-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  {t.patientAuth.pinLabel}
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPin(true)}
                  id="btn-forgot-pin"
                  className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
                >
                  {t.patientAuth.forgotPin}
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute top-3.5 start-3" />
                <input
                  type="password"
                  id="patient-pin-input"
                  maxLength={6}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder={t.patientAuth.pinPlaceholder}
                  className="w-full ps-9 pe-3 py-2.5 text-sm bg-slate-900/80 text-white border border-slate-600 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none placeholder-slate-500"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              id="btn-patient-login-submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md hover:shadow-teal-500/20 transition-all disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? t.common.loading : t.patientAuth.loginBtn}</span>
            </button>
          </form>

          {/* New Patient Registration Prompt */}
          <div className="pt-2 border-t border-slate-700 text-center">
            <button
              type="button"
              onClick={() => setShowRegister(true)}
              id="btn-open-patient-register"
              className="inline-flex items-center gap-2 text-xs font-semibold text-teal-300 hover:text-teal-200 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t.patientAuth.newPatientRegister}</span>
            </button>
          </div>

          {/* Development Demo Accounts Helper */}
          {isDevEnv() && (
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-2 text-xs">
              <span className="font-bold text-teal-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                {t.patientAuth.demoNoticeTitle}
              </span>

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('+201000000001', '7492')}
                  id="btn-demo-ahmed-guardian"
                  className="w-full text-start p-2 rounded-lg bg-slate-800 hover:bg-slate-700/90 text-slate-200 text-[11px] border border-slate-700 flex items-center justify-between transition-colors"
                >
                  <div>
                    <span className="font-bold text-white block">
                      د. أحمد محمد (ولي أمر العائلة)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      محمول: 01000000001 • PIN: 7492 (يشمل ليلى وعمر)
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono">
                    اختر
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('+201000000002', '8319')}
                  id="btn-demo-mona-independent"
                  className="w-full text-start p-2 rounded-lg bg-slate-800 hover:bg-slate-700/90 text-slate-200 text-[11px] border border-slate-700 flex items-center justify-between transition-colors"
                >
                  <div>
                    <span className="font-bold text-white block">
                      منى حسن (مريضة مستقلة)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      محمول: 01000000002 • PIN: 8319
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono">
                    اختر
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Switch to Staff Portal Link */}
          <div className="pt-2 border-t border-slate-700/80 text-center">
            <button
              type="button"
              onClick={onSwitchToStaff}
              id="btn-switch-to-staff-portal"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{t.patientAuth.switchToStaff}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ForgotPinModal
        isOpen={showForgotPin}
        onClose={() => setShowForgotPin(false)}
        initialMobile={mobile}
      />

      <PatientRegisterModal
        isOpen={showRegister}
        onClose={() => setShowRegister(false)}
        onSuccess={handleRegisterSuccess}
      />

      <ProfileChooserModal
        isOpen={showProfileChooser}
        onClose={() => setShowProfileChooser(false)}
      />
    </div>
  );
};
