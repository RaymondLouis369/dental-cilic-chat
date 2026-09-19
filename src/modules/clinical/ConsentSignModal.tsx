import React, { useState, useEffect } from 'react';
import { ConsentRequest } from '../../types/clinical';
import { useLanguage } from '../i18n/LanguageContext';
import { signConsentRequest, declineConsentRequest } from '../../lib/clinicalStorage';
import { SignaturePad } from './SignaturePad';
import {
  FileSignature,
  CheckCircle2,
  X,
  ShieldCheck,
  AlertCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

interface ConsentSignModalProps {
  isOpen: boolean;
  onClose: () => void;
  consent: ConsentRequest | null;
  patientName?: string;
  onConsentUpdated?: () => void;
}

export const ConsentSignModal: React.FC<ConsentSignModalProps> = ({
  isOpen,
  onClose,
  consent,
  patientName = '',
  onConsentUpdated,
}) => {
  const { isRtl } = useLanguage();

  const [signerName, setSignerName] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (consent) {
      setSignerName(consent.signed_by_name || patientName || '');
      setSignatureDataUrl(consent.signature_data_url || null);
      setErrorMessage(null);
    }
  }, [consent, patientName]);

  if (!isOpen || !consent) return null;

  const handleConfirmSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!signerName.trim()) {
      setErrorMessage(
        isRtl ? 'يرجى إدخال اسم الموقع قبل الاعتماد' : 'Please enter the signer name'
      );
      return;
    }

    if (!signatureDataUrl) {
      setErrorMessage(
        isRtl
          ? 'يرجى التوقيع داخل المربع أولاً قبل الاعتماد'
          : 'Please draw your signature inside the box before confirming'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const success = signConsentRequest(
        consent.id,
        signerName,
        signatureDataUrl
      );

      if (success) {
        if (onConsentUpdated) onConsentUpdated();
        onClose();
      } else {
        setErrorMessage(
          isRtl ? 'حدث خطأ أثناء حفظ التوقيع' : 'Failed to save consent signature'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || (isRtl ? 'حدث خطأ غير متوقع' : 'An error occurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = () => {
    if (!consent) return;
    setIsSubmitting(true);
    try {
      const success = declineConsentRequest(consent.id);
      if (success) {
        if (onConsentUpdated) onConsentUpdated();
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isConfirmDisabled = !signatureDataUrl || !signerName.trim() || isSubmitting;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
      id="consent-sign-modal"
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-700 via-amber-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 text-amber-200 flex items-center justify-center">
              <FileSignature className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">
                  {isRtl ? 'التوقيع الرقمي للإقرار الطبي' : 'Digital Consent Signature'}
                </h3>
                <span className="px-2 py-0.5 rounded bg-amber-500/30 text-amber-200 text-[10px] font-bold uppercase">
                  {consent.consent_type}
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5">
                {patientName
                  ? `${isRtl ? 'المريض:' : 'Patient:'} ${patientName}`
                  : isRtl
                  ? 'يرجى مراجعة البنود والتوقيع أدناه'
                  : 'Please review terms and sign below'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirmSignature} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2 font-bold animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Consent Document Preview Box */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-amber-950 text-sm">{consent.title}</h4>
              <span className="text-[10px] font-mono text-amber-800">
                {new Date(consent.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
              </span>
            </div>
            <p className="text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
              {isRtl ? consent.description_ar : consent.description_en}
            </p>
          </div>

          {/* Signer Name Input */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              {isRtl ? 'اسم الموقع (المريض / الوصي القانوني) *:' : 'Signer Full Name (Patient / Guardian) *:'}
            </label>
            <input
              type="text"
              required
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder={isRtl ? 'أدخل الاسم الثلاثي للموقع' : 'Enter full legal name of signer'}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
            />
          </div>

          {/* HTML5 Canvas Signature Pad */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              {isRtl ? 'التوقيع الرقمي (باللمس أو القلم أو الماوس) *:' : 'Digital Signature *:'}
            </label>
            <SignaturePad
              onSignatureChange={(dataUrl) => setSignatureDataUrl(dataUrl)}
              isRtl={isRtl}
              height={170}
            />
          </div>

          {/* Legal Security Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 flex items-start gap-2 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p>
              {isRtl
                ? 'يتم تشفير هذا التوقيع الرقمي وحفظه كوثيقة قانونية معتمدة داخل الملف السريري للمريض مع طابع زمني دقيق.'
                : 'This digital signature is encrypted and stored as a timestamped audit record in the patient clinical record.'}
            </p>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleDecline}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-xs"
            >
              <XCircle className="w-4 h-4 text-red-600" />
              <span>{isRtl ? 'رفض الإقرار' : 'Decline Consent'}</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl text-xs"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>

              <button
                type="submit"
                id="confirm-consent-signature-btn"
                disabled={isConfirmDisabled}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all text-xs"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{isRtl ? 'اعتماد وحفظ التوقيع' : 'Confirm Signature'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
