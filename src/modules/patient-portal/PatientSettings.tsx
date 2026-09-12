import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientAuth } from './PatientAuthContext';
import {
  hashPin,
  verifyPin,
  validatePinRules,
} from './utils/pinSecurity';
import {
  getStoredAccounts,
  PATIENT_STORAGE_KEYS,
} from '../../lib/patientStorage';
import {
  KeyRound,
  Globe,
  LogOut,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const PatientSettings: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { session, logout } = usePatientAuth();

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  if (!session) return null;

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPin(true);
    setPinSuccess(false);
    setPinError(null);

    // 1. Verify current PIN against stored hash
    const isCurrentValid = await verifyPin(
      currentPin,
      session.account.pin_salt,
      session.account.pin_hash
    );

    if (!isCurrentValid) {
      setPinError('الرقم السري الحالي غير صحيح.');
      setIsUpdatingPin(false);
      return;
    }

    if (newPin !== confirmPin) {
      setPinError('تأكيد الرقم السري غير متطابق.');
      setIsUpdatingPin(false);
      return;
    }

    // 2. Validate new PIN rules
    const pinCheck = validatePinRules(newPin, {
      mobile: session.account.mobile_number,
      dob: session.authenticatedPatient.date_of_birth,
      patientCode: session.authenticatedPatient.patient_code,
    });

    if (!pinCheck.valid) {
      const errKey = pinCheck.errorKey || 'pin_trivial_sequence';
      const msg = t.patientErrors[errKey] || 'الرقم السري لا يطابق معايير الأمان.';
      setPinError(msg);
      setIsUpdatingPin(false);
      return;
    }

    // 3. Hash new PIN and update storage
    const accounts = getStoredAccounts();
    const accIndex = accounts.findIndex((a) => a.id === session.account.id);
    if (accIndex !== -1) {
      const newSalt = 'salt_' + Math.random().toString(36).substring(2, 10);
      const newHash = await hashPin(newPin, newSalt);

      accounts[accIndex].pin_salt = newSalt;
      accounts[accIndex].pin_hash = newHash;
      accounts[accIndex].updated_at = new Date().toISOString();
      localStorage.setItem(PATIENT_STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));

      // Update in-memory session account
      session.account.pin_salt = newSalt;
      session.account.pin_hash = newHash;
    }

    setIsUpdatingPin(false);
    setPinSuccess(true);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setTimeout(() => setPinSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          {t.patientPortal.settings}
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          إعدادات اللغة والأمان وتحديث الرقم السري لحساب المريض
        </p>
      </div>

      {/* Language Preference */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-teal-600" />
          <h3 className="font-bold text-slate-900 text-sm">
            {t.patientProfile.preferredLanguage}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => setLanguage('ar')}
            className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
              language === 'ar'
                ? 'bg-teal-50 border-teal-600 text-teal-800 shadow-xs'
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            العربية (RTL) — الافتراضية
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
              language === 'en'
                ? 'bg-teal-50 border-teal-600 text-teal-800 shadow-xs'
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            English (LTR)
          </button>
        </div>
      </div>

      {/* Change PIN Card */}
      <form
        onSubmit={handleChangePin}
        className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-teal-600" />
          <h3 className="font-bold text-slate-900 text-sm">
            {t.patientAuth.changePinTitle}
          </h3>
        </div>

        <p className="text-xs text-slate-500">
          يجب أن يتكون الرقم السري من 4 إلى 6 أرقام غير متطابقة مع تاريخ ميلادك أو رقم هاتفك.
        </p>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {t.patientAuth.currentPin}
          </label>
          <input
            type="password"
            maxLength={6}
            required
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value)}
            placeholder="••••"
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.patientAuth.newPinLabel}
            </label>
            <input
              type="password"
              maxLength={6}
              required
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="••••"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
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

        {pinSuccess && (
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>تم تحديث الرقم السري بنجاح وتشفيره بأمان.</span>
          </div>
        )}

        {pinError && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{pinError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isUpdatingPin}
          id="btn-update-pin"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-colors disabled:opacity-50"
        >
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>{isUpdatingPin ? t.common.loading : t.patientAuth.savePinBtn}</span>
        </button>
      </form>

      {/* Logout Session */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">تسجيل الخروج من البوابة</h3>
          <p className="text-xs text-slate-500">إنهاء جلسة المريض الحالية وتأمين البيانات</p>
        </div>

        <button
          onClick={logout}
          id="btn-patient-logout"
          className="inline-flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t.auth.logoutButton}</span>
        </button>
      </div>
    </div>
  );
};
