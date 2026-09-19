import React, { useState } from 'react';
import { FollowUpInterval, RecallType } from '../../types/clinical';
import { useLanguage } from '../i18n/LanguageContext';
import { createFollowUpPlan } from '../../lib/clinicalStorage';
import { useAuth } from '../auth/AuthContext';
import {
  CalendarClock,
  CheckCircle2,
  X,
  Calendar,
  MessageSquare,
  Tag,
} from 'lucide-react';

interface FollowUpModalProps {
  patientId: string;
  visitId?: string;
  isOpen: boolean;
  onClose: () => void;
  onFollowUpCreated?: () => void;
}

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
  patientId,
  visitId,
  isOpen,
  onClose,
  onFollowUpCreated,
}) => {
  const { isRtl } = useLanguage();
  const { session } = useAuth();

  const [recallType, setRecallType] = useState<RecallType>('post_operative');
  const [interval, setInterval] = useState<FollowUpInterval>('7_days');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [reason, setReason] = useState('متابعة التئام الجرح وإزالة خيوط الجراحة وفحص اللثة');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const recallTypes: { id: RecallType; label_ar: string; label_en: string }[] = [
    { id: 'post_operative', label_ar: 'متابعة بعد الجراحة (Post-op)', label_en: 'Post-operative' },
    { id: 'implant', label_ar: 'زراعة أسنان (Implant)', label_en: 'Implant' },
    { id: 'suture_removal', label_ar: 'إزالة خيوط الجراحة (Suture Removal)', label_en: 'Suture Removal' },
    { id: 'cleaning_hygiene', label_ar: 'تنظيف وتنضيد اللثة (Hygiene)', label_en: 'Cleaning/Hygiene' },
    { id: 'prosthetic', label_ar: 'تركيبات أسنان (Prosthetic)', label_en: 'Prosthetic' },
    { id: 'orthodontic', label_ar: 'متابعة تقويم (Orthodontic)', label_en: 'Orthodontic' },
    { id: 'general_treatment', label_ar: 'متابعة علاجية عامة (General)', label_en: 'General Treatment' },
  ];

  const intervals: {
    id: FollowUpInterval;
    days: number;
    label_ar: string;
    label_en: string;
  }[] = [
    { id: '2_days', days: 2, label_ar: 'بعد يومين (48 ساعة)', label_en: '2 Days (48 Hours)' },
    { id: '7_days', days: 7, label_ar: 'بعد أسبوع (7 أيام)', label_en: '1 Week (7 Days)' },
    { id: '14_days', days: 14, label_ar: 'بعد أسبوعين (14 يوماً)', label_en: '2 Weeks (14 Days)' },
    { id: '1_month', days: 30, label_ar: 'بعد شهر (30 يوماً)', label_en: '1 Month' },
    { id: '3_months', days: 90, label_ar: 'بعد 3 أشهر', label_en: '3 Months' },
    { id: '6_months', days: 180, label_ar: 'بعد 6 أشهر (فحص دوري)', label_en: '6 Months (Recall)' },
    { id: 'custom', days: 0, label_ar: 'تاريخ مخصص', label_en: 'Custom Date' },
  ];

  const handleSelectInterval = (intv: (typeof intervals)[0]) => {
    setInterval(intv.id);
    if (intv.id !== 'custom') {
      const d = new Date();
      d.setDate(d.getDate() + intv.days);
      setDueDate(d.toISOString().split('T')[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || !dueDate) return;

    setIsSubmitting(true);
    try {
      createFollowUpPlan({
        patientId,
        doctorId: session?.profile.id || 'prof_doc_01',
        branchId: session?.profile.branch_id || '11111111-1111-1111-1111-111111111111',
        visitId,
        recallType,
        dueDate,
        interval,
        reason,
        notes,
        organizationId: session?.profile.organization_id,
      });

      if (onFollowUpCreated) onFollowUpCreated();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
      id="follow-up-modal"
    >
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-950">
                {isRtl ? 'جدولة خطة متابعة وميعاد قادم' : 'Schedule Follow-Up Plan'}
              </h3>
              <p className="text-xs text-emerald-700">
                {isRtl
                  ? 'تحديد الفاصل الزمني وموعد المتابعة وإرسال مهمة الحجز للاستقبال'
                  : 'Set follow-up interval and auto-create reception booking task.'}
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
          {/* Recall Type Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isRtl ? 'نوع المتابعة والمراجعة (Recall Type):' : 'Recall & Follow-Up Type:'}</span>
            </label>
            <select
              value={recallType}
              onChange={(e) => setRecallType(e.target.value as RecallType)}
              id="followup-recall-type-select"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-semibold bg-slate-50 text-slate-800"
            >
              {recallTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {isRtl ? rt.label_ar : rt.label_en}
                </option>
              ))}
            </select>
          </div>

          {/* Preset Interval Buttons */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              {isRtl ? 'الفاصل الزمني للمتابعة:' : 'Follow-Up Interval:'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {intervals.map((intv) => {
                const isSelected = interval === intv.id;
                return (
                  <button
                    key={intv.id}
                    type="button"
                    onClick={() => handleSelectInterval(intv)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isRtl ? intv.label_ar : intv.label_en}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isRtl ? 'تاريخ الاستحقاق المحدد:' : 'Due Date:'}
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  setInterval('custom');
                }}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isRtl ? 'سبب وغرض المتابعة:' : 'Follow-up Reason:'}
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isRtl
                  ? 'مثال: فك الخياطة، متابعة التئام الطعم العظمي، متابعة علاج العصب...'
                  : 'e.g. Suture removal, check healing, crown delivery...'
              }
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isRtl ? 'ملاحظات وتوجيهات لموظف الاستقبال:' : 'Reception Notes:'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isRtl
                  ? 'يرجى حجز فترة 30 دقيقة والتأكيد مع المريض هاتفياً قبل الموعد بيوم...'
                  : 'Book 30 min slot and confirm with patient 1 day prior...'
              }
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 resize-none"
            />
          </div>

          {/* Auto Task Info */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
            <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              {isRtl
                ? 'سيتم تلقائياً إنشاء مهمة للاستقبال في قائمة المتابعات المطلوبة وتذكير المريض.'
                : 'A task will automatically be sent to reception to book and remind the patient.'}
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
              id="save-follow-up-plan-btn"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isRtl ? 'اعتماد خطة المتابعة' : 'Confirm Follow-Up'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
