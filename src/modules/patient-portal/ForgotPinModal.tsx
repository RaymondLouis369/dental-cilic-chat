import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientAuth } from './PatientAuthContext';
import { KeyRound, Phone, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

interface ForgotPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMobile?: string;
}

export const ForgotPinModal: React.FC<ForgotPinModalProps> = ({
  isOpen,
  onClose,
  initialMobile = '',
}) => {
  const { t } = useLanguage();
  const { requestPinReset, submitPinReset } = usePatientAuth();

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [mobile, setMobile] = useState(initialMobile);
  const [token, setToken] = useState('');
  const [devMockToken, setDevMockToken] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const res = await requestPinReset(mobile);
    setIsLoading(false);

    // Uniform generic message always shown (no enumeration leak!)
    setMessage(t.patientAuth.genericForgotPinDispatched);
    if (res.mockToken) {
      setDevMockToken(res.mockToken);
      setToken(res.mockToken); // Auto-fill in dev mode for testing convenience
    }
    setStep('reset');
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (newPin !== confirmPin) {
      setError('تأكيد الرقم السري غير متطابق.');
      setIsLoading(false);
      return;
    }

    const res = await submitPinReset(mobile, token, newPin);
    setIsLoading(false);

    if (res.success) {
      setMessage('تمت إعادة تعيين الرقم السري بنجاح! يمكنك الآن تسجيل الدخول برقمك السري الجديد.');
      setTimeout(() => {
        onClose();
        setStep('request');
      }, 2500);
    } else {
      const errKey = res.errorKey || 'invalid_reset_token';
      const msg = t.patientErrors[errKey] || 'رمز التحقق أو الرقم السري غير صالح.';
      setError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-base">
              {t.patientAuth.forgotPin}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm"
          >
            ✕
          </button>
        </div>

        {step === 'request' ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              أدخل رقم هاتفك المحمول المسجل بالمركز الطبي لإرسال كود التحقق وإعادة ضبط الرقم السري:
            </p>

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
                  placeholder="01000000001"
                  className="w-full ps-9 pe-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              id="btn-request-reset-token"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              {isLoading ? t.common.loading : 'إرسال كود التحقق'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {message && (
              <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs leading-relaxed flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span>{message}</span>
              </div>
            )}

            {devMockToken && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-mono">
                {t.patientAuth.mockOtpDev} <span className="font-bold">{devMockToken}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.patientAuth.enterOtpLabel}
              </label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="رمز التحقق"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
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

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              id="btn-submit-reset-pin"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              {isLoading ? t.common.loading : t.patientAuth.resetPinBtn}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
