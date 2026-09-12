import React, { useState } from 'react';
import { ConsentType, ConsentRequest } from '../../types/clinical';
import { useLanguage } from '../i18n/LanguageContext';
import {
  createConsentRequest,
  INFORMED_CONSENT_TEMPLATES,
} from '../../lib/clinicalStorage';
import { useAuth } from '../auth/AuthContext';
import {
  FileSignature,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface ConsentModalProps {
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
  onConsentCreated?: () => void;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  patientId,
  isOpen,
  onClose,
  onConsentCreated,
}) => {
  const { isRtl } = useLanguage();
  const { session } = useAuth();

  const [consentType, setConsentType] = useState<ConsentType>('treatment_plan_agreement');
  const [title, setTitle] = useState(INFORMED_CONSENT_TEMPLATES[0].title_ar);
  const [descAr, setDescAr] = useState(INFORMED_CONSENT_TEMPLATES[0].description_ar);
  const [descEn, setDescEn] = useState(INFORMED_CONSENT_TEMPLATES[0].description_en);
  const [signImmediately, setSignImmediately] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSelectTemplate = (tpl: (typeof INFORMED_CONSENT_TEMPLATES)[0]) => {
    setConsentType(tpl.type);
    setTitle(isRtl ? tpl.title_ar : tpl.title_en);
    setDescAr(tpl.description_ar);
    setDescEn(tpl.description_en);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !descAr.trim()) return;

    setIsSubmitting(true);
    try {
      createConsentRequest({
        patientId,
        doctorId: session?.profile.id || 'prof_doc_01',
        consentType,
        title,
        descriptionAr: descAr,
        descriptionEn: descEn || descAr,
        organizationId: session?.profile.organization_id,
      });

      if (onConsentCreated) onConsentCreated();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
      id="consent-modal"
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-sm">
              <FileSignature className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-950">
                {isRtl ? 'طلب إقرار وموافقة طبية مستنيرة' : 'Request Informed Consent'}
              </h3>
              <p className="text-xs text-amber-700">
                {isRtl
                  ? 'إقرار الخطة العلاجية، جراحة الخلع، زراعة الأسنان، وعلاج الجذور'
                  : 'Treatment agreements, surgical extraction, implants, and RCT consents.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Preset Types */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{isRtl ? 'اختر نموذج الإقرار الطبي المستنير:' : 'Select Consent Form Template:'}</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {INFORMED_CONSENT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.type}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                    consentType === tpl.type
                      ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="block truncate">{isRtl ? tpl.title_ar : tpl.title_en}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isRtl ? 'عنوان وثيقة الإقرار:' : 'Consent Title:'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isRtl ? 'نص وبنود الإقرار والمخاطر السريرية:' : 'Consent Terms & Clinical Disclosure:'}
            </label>
            <textarea
              rows={5}
              required
              value={descAr}
              onChange={(e) => setDescAr(e.target.value)}
              className="w-full text-xs p-3 rounded-lg border border-slate-300 font-sans leading-relaxed resize-none"
            />
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              {isRtl
                ? 'عند حفظ الطلب، يتم إنشاء مهمة في شاشة الاستقبال لأخذ التوقيع الرقمي للمريض أو المرافق القانوني وحفظه في الملف السريري.'
                : 'Upon creation, a task will be sent to Reception to collect the patient signature.'}
            </p>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              id="save-consent-request-btn"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isRtl ? 'طلب توقيع الإقرار الطبي' : 'Issue Consent Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
