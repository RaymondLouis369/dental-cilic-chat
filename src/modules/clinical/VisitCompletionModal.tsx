import React, { useState } from 'react';
import { VisitCompletionChecklist, ClinicalVisit } from '../../types/clinical';
import { useLanguage } from '../i18n/LanguageContext';
import { completeClinicalVisit } from '../../lib/clinicalStorage';
import {
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  X,
  Stethoscope,
  Clock,
} from 'lucide-react';

interface VisitCompletionModalProps {
  visit: ClinicalVisit;
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

export const VisitCompletionModal: React.FC<VisitCompletionModalProps> = ({
  visit,
  isOpen,
  onClose,
  onCompleted,
}) => {
  const { isRtl } = useLanguage();
  const [checklist, setChecklist] = useState<VisitCompletionChecklist>({
    clinical_note_completed: true,
    treatment_status_updated: true,
    required_consent_requested: true,
    investigation_requested_if_needed: true,
    referral_created_if_needed: true,
    instructions_created_if_needed: true,
    prescription_completed_if_needed: true,
    follow_up_configured_if_needed: true,
  });
  const [closingNotes, setClosingNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleToggleCheck = (key: keyof VisitCompletionChecklist) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleConfirmCompletion = () => {
    setIsSubmitting(true);
    try {
      completeClinicalVisit({
        visitId: visit.id,
        checklist,
        doctorNotes: closingNotes.trim() || undefined,
      });
      onCompleted();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const checklistItems: {
    key: keyof VisitCompletionChecklist;
    label_ar: string;
    label_en: string;
    desc_ar: string;
    desc_en: string;
    required?: boolean;
  }[] = [
    {
      key: 'clinical_note_completed',
      label_ar: 'اكتمال وتوثيق الملاحظات السريرية والتشخيص',
      label_en: 'Clinical Note & Diagnosis Completed',
      desc_ar: 'توثيق الشكوى، نتائج الفحص، الإجراء المنفذ، والمواد المستخدمة.',
      desc_en: 'Complaint, findings, procedure, and materials recorded.',
      required: true,
    },
    {
      key: 'treatment_status_updated',
      label_ar: 'تحديث حالة الإجراءات والأسنان في خطة العلاج',
      label_en: 'Treatment Plan & Tooth Statuses Updated',
      desc_ar: 'تعديل حالة الخدمات المنجزة إلى مكتملة ومراجعة الخطوات القادمة.',
      desc_en: 'Marked completed procedures in plan and dental chart.',
      required: true,
    },
    {
      key: 'required_consent_requested',
      label_ar: 'طلب وتأكيد الإقرارات والموافقات الطبية المستنيرة',
      label_en: 'Required Informed Consents Requested/Signed',
      desc_ar: 'التأكد من توقيع إقرار الخطة العلاجية أو الجراحة إن لزم الأمر.',
      desc_en: 'Ensured informed consent is on file or requested at reception.',
    },
    {
      key: 'investigation_requested_if_needed',
      label_ar: 'طلب الأشعة أو الفحوصات والتحاليل المخبرية (إن وجدت)',
      label_en: 'Diagnostic Investigations & X-Rays Ordered (If needed)',
      desc_ar: 'إصدار طلبات البانوراما أو الـ CBCT أو التحاليل اللازمة.',
      desc_en: 'Issued requests for OPG, CBCT, or lab tests.',
    },
    {
      key: 'referral_created_if_needed',
      label_ar: 'إنشاء الإحالات الطبية الداخلية أو الخارجية (إن وجدت)',
      label_en: 'Specialist Referrals Created (If needed)',
      desc_ar: 'تحويل الحالة لأخصائي علاج جذور أو تقويم أو جراحة.',
      desc_en: 'Referred patient to specialist or external facility.',
    },
    {
      key: 'instructions_created_if_needed',
      label_ar: 'إصدار التوصيات وتعليمات ما بعد الجلسة للمريض',
      label_en: 'Post-Operative Instructions & Recommendations Issued',
      desc_ar: 'إنشاء تعليمات الرعاية وإرسالها لموظف الاستقبال عبر الواتساب.',
      desc_en: 'Prepared patient care guidelines & reception WhatsApp task.',
    },
    {
      key: 'prescription_completed_if_needed',
      label_ar: 'كتابة واعتماد الوصفة الطبية / الروشتة (إن لزم الأمر)',
      label_en: 'Medical Prescription Authored (If needed)',
      desc_ar: 'تحديد الجرعات والمضادات ومسكنات الألم مع مراعاة الحساسية.',
      desc_en: 'Prescribed medications taking allergies into account.',
    },
    {
      key: 'follow_up_configured_if_needed',
      label_ar: 'تحديد خطة وجدول موعد المتابعة القادم',
      label_en: 'Follow-up Plan & Next Visit Due Date Configured',
      desc_ar: 'تحديد الفاصل الزمني المطلوب وإرسال مهمة الحجز للاستقبال.',
      desc_en: 'Set follow-up interval and created reception booking task.',
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
      id="visit-completion-modal"
    >
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-950">
                {isRtl ? 'قائمة التحقق وإنهاء الجلسة السريرية' : 'Clinical Visit Completion Checklist'}
              </h3>
              <p className="text-xs text-emerald-700">
                {isRtl
                  ? 'مراجعة البنود السريرية قبل إغلاق الجلسة وتحديث حالة الموعد'
                  : 'Verify all clinical workflow steps before finalizing the visit.'}
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {isRtl
                ? 'ملاحظة أمان: لن يتم حظر إتمام الزيارة في حال كانت بعض البنود الاختيارية (كالإحالة أو الأشعة) غير مطلوبة لهذه الجلسة.'
                : 'Note: Optional items will not block visit completion if not clinically required.'}
            </p>
          </div>

          <div className="space-y-2.5">
            {checklistItems.map((item) => {
              const isChecked = checklist[item.key];
              return (
                <div
                  key={item.key}
                  onClick={() => handleToggleCheck(item.key)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    isChecked
                      ? 'bg-emerald-50/50 border-emerald-300'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-bold text-slate-900">
                        {isRtl ? item.label_ar : item.label_en}
                      </h5>
                      {item.required && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          {isRtl ? 'أساسي' : 'Required'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isRtl ? item.desc_ar : item.desc_en}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Optional Final Doctor Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isRtl ? 'ملاحظات الطبيب الختامية للجلسة (اختياري):' : 'Doctor Closing Notes (Optional):'}
            </label>
            <textarea
              rows={2}
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder={
                isRtl
                  ? 'أي ملاحظات خاصة بالتسليم أو تعليمات لفريق العمل...'
                  : 'Any specific handover notes or clinical remarks...'
              }
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 resize-none outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg"
          >
            {isRtl ? 'الرجوع للجلسة' : 'Back to Visit'}
          </button>
          <button
            type="button"
            id="confirm-complete-visit-btn"
            disabled={isSubmitting}
            onClick={handleConfirmCompletion}
            className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isRtl ? 'تأكيد إتمام الزيارة السريرية' : 'Complete Clinical Visit'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
