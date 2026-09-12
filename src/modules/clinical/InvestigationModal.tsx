import React, { useState } from 'react';
import { InvestigationType, InvestigationUrgency } from '../../types/clinical';
import { useLanguage } from '../i18n/LanguageContext';
import { requestInvestigation } from '../../lib/clinicalStorage';
import { useAuth } from '../auth/AuthContext';
import {
  FileScan,
  CheckCircle2,
  X,
  Radio,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface InvestigationModalProps {
  patientId: string;
  visitId?: string;
  isOpen: boolean;
  onClose: () => void;
  onInvestigationRequested?: () => void;
}

export const InvestigationModal: React.FC<InvestigationModalProps> = ({
  patientId,
  visitId,
  isOpen,
  onClose,
  onInvestigationRequested,
}) => {
  const { isRtl } = useLanguage();
  const { session } = useAuth();

  const [type, setType] = useState<InvestigationType>('panoramic_opg');
  const [requestedTest, setRequestedTest] = useState('أشعة بانوراما رقمية كاملة للفكين (Panoramic OPG)');
  const [clinicalReason, setClinicalReason] = useState('');
  const [urgency, setUrgency] = useState<InvestigationUrgency>('routine');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const investigationOptions: {
    type: InvestigationType;
    label_ar: string;
    label_en: string;
    default_test_ar: string;
    default_test_en: string;
  }[] = [
    {
      type: 'panoramic_opg',
      label_ar: 'أشعة بانوراما للفكين (OPG)',
      label_en: 'Panoramic OPG X-Ray',
      default_test_ar: 'أشعة بانوراما رقمية كاملة للفكين (Panoramic OPG)',
      default_test_en: 'Digital Panoramic Radiograph (OPG)',
    },
    {
      type: 'periapical_xray',
      label_ar: 'أشعة سينية صغيرة للسن (Periapical / Bitewing)',
      label_en: 'Periapical / Bitewing X-Ray',
      default_test_ar: 'أشعة سينية موضعية حول الذروة (Periapical X-Ray)',
      default_test_en: 'Periapical Radiograph (PA)',
    },
    {
      type: 'cbct_3d',
      label_ar: 'أشعة مقطعية ثلاثية الأبعاد (CBCT 3D Scan)',
      label_en: 'Cone Beam CT 3D Scan',
      default_test_ar: 'أشعة مقطعية ثلاثية الأبعاد لمنطقة الزرع (CBCT)',
      default_test_en: 'Cone Beam Computed Tomography (CBCT)',
    },
    {
      type: 'blood_investigation',
      label_ar: 'تحاليل وفحوصات دم (CBC, INR, HbA1c)',
      label_en: 'Blood Tests (CBC, INR, HbA1c)',
      default_test_ar: 'تحليل سكر تراكمي HbA1c وسيولة الدم PT / INR',
      default_test_en: 'Complete Blood Count & Coagulation Profile (PT/INR)',
    },
    {
      type: 'biopsy_pathology',
      label_ar: 'خزعة وفحص نسيجي (Biopsy & Histopathology)',
      label_en: 'Biopsy & Histopathology',
      default_test_ar: 'خزعة نسيجية استئصالية / تشخيصية للأنسجة الرخوة',
      default_test_en: 'Excisional / Incisional Soft Tissue Biopsy',
    },
    {
      type: 'study_model',
      label_ar: 'طبعات ونماذج دراسة للتقويم / التركيبات',
      label_en: 'Study Cast & Diagnostic Wax-up',
      default_test_ar: 'طبعات دراسة رقمية ثلاثية الأبعاد / جبسية',
      default_test_en: 'Diagnostic Study Cast & Ortho Analysis',
    },
  ];

  const handleSelectType = (opt: (typeof investigationOptions)[0]) => {
    setType(opt.type);
    setRequestedTest(isRtl ? opt.default_test_ar : opt.default_test_en);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedTest.trim() || !clinicalReason.trim()) return;

    setIsSubmitting(true);
    try {
      requestInvestigation({
        patientId,
        doctorId: session?.profile.id || 'prof_doc_01',
        branchId: session?.profile.branch_id || '11111111-1111-1111-1111-111111111111',
        visitId,
        type,
        requestedTest,
        clinicalReason,
        urgency,
        notes,
        organizationId: session?.profile.organization_id,
      });

      if (onInvestigationRequested) onInvestigationRequested();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
      id="investigation-modal"
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-cyan-50 border-b border-cyan-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-sm">
              <FileScan className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-cyan-950">
                {isRtl ? 'طلب أشعة أو فحص مخبري وسريري' : 'Order Diagnostic Investigation / X-Ray'}
              </h3>
              <p className="text-xs text-cyan-700">
                {isRtl
                  ? 'أشعة بانوراما، CBCT، أشعة ذروية، وتحاليل الدم والسيولة'
                  : 'Order Panoramic, CBCT, Periapical, and Blood tests.'}
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
          {/* Investigation Type Quick Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              {isRtl ? 'نوع الفحص المطلوب:' : 'Select Investigation Type:'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {investigationOptions.map((opt) => {
                const isSelected = type === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => handleSelectType(opt)}
                    className={`p-2.5 text-left rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-cyan-50 border-cyan-500 text-cyan-950 ring-2 ring-cyan-500/20 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isSelected ? 'bg-cyan-600' : 'bg-slate-400'
                        }`}
                      />
                      <span>{isRtl ? opt.label_ar : opt.label_en}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Test Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isRtl ? 'اسم الفحص / الأشعة المحددة:' : 'Test / Procedure Name:'}
            </label>
            <input
              type="text"
              required
              value={requestedTest}
              onChange={(e) => setRequestedTest(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
            />
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isRtl ? 'درجة الاستعجال:' : 'Urgency Level:'}
            </label>
            <div className="flex gap-2">
              {(
                [
                  { id: 'routine', label_ar: 'عادي (Routine)', label_en: 'Routine' },
                  { id: 'urgent', label_ar: 'عاجل (Urgent)', label_en: 'Urgent' },
                  { id: 'stat', label_ar: 'فوري وحرج (STAT / Immediate)', label_en: 'STAT / Immediate' },
                ] as { id: InvestigationUrgency; label_ar: string; label_en: string }[]
              ).map((urg) => (
                <button
                  key={urg.id}
                  type="button"
                  onClick={() => setUrgency(urg.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    urgency === urg.id
                      ? urg.id === 'stat'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-cyan-600 text-white border-cyan-600'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {isRtl ? urg.label_ar : urg.label_en}
                </button>
              ))}
            </div>
          </div>

          {/* Clinical Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isRtl ? 'السبب والداعي السريري للطلب:' : 'Clinical Indication / Reason:'}
            </label>
            <textarea
              rows={2}
              required
              value={clinicalReason}
              onChange={(e) => setClinicalReason(e.target.value)}
              placeholder={
                isRtl
                  ? 'مثال: تقييم سماكة وارتفاع العظم حول السن #46 وموقع العصب السني السفلي قبل الزرع...'
                  : 'e.g. Assessment of alveolar bone height & inferior alveolar nerve before implant...'
              }
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 resize-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isRtl ? 'تعليمات إضافية لفني الأشعة أو المختبر:' : 'Notes for Radiologist / Lab Tech:'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isRtl ? 'مثال: التركيز على الربع الرابع بدقة عالية' : 'e.g. High resolution on Q4'}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
            />
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
              id="save-investigation-request-btn"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg shadow-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isRtl ? 'إرسال وحفظ طلب الفحص' : 'Submit Investigation Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
