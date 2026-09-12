import React, { useState } from 'react';
import { InstructionTemplateCategory } from '../../types/clinical';
import { useLanguage } from '../i18n/LanguageContext';
import {
  createDoctorRecommendation,
  DOCTOR_INSTRUCTION_TEMPLATES,
} from '../../lib/clinicalStorage';
import { useAuth } from '../auth/AuthContext';
import {
  BookOpen,
  CheckCircle2,
  X,
  Sparkles,
  Send,
  MessageSquare,
} from 'lucide-react';

interface RecommendationModalProps {
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
  onRecommendationCreated?: () => void;
}

export const RecommendationModal: React.FC<RecommendationModalProps> = ({
  patientId,
  isOpen,
  onClose,
  onRecommendationCreated,
}) => {
  const { isRtl } = useLanguage();
  const { session } = useAuth();

  const [category, setCategory] = useState<InstructionTemplateCategory>('post_extraction');
  const [title, setTitle] = useState('تعليمات ما بعد خلع الأسنان والعمليات الجراحية');
  const [instructionsAr, setInstructionsAr] = useState(
    DOCTOR_INSTRUCTION_TEMPLATES[0].instructions_ar
  );
  const [instructionsEn, setInstructionsEn] = useState(
    DOCTOR_INSTRUCTION_TEMPLATES[0].instructions_en
  );
  const [createTask, setCreateTask] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSelectTemplate = (tpl: (typeof DOCTOR_INSTRUCTION_TEMPLATES)[0]) => {
    setCategory(tpl.category);
    setTitle(isRtl ? tpl.title_ar : tpl.title_en);
    setInstructionsAr(tpl.instructions_ar);
    setInstructionsEn(tpl.instructions_en);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !instructionsAr.trim()) return;

    setIsSubmitting(true);
    try {
      createDoctorRecommendation({
        patientId,
        doctorId: session?.profile.id || 'prof_doc_01',
        category,
        title,
        instructionsAr,
        instructionsEn: instructionsEn || instructionsAr,
        createReceptionTask: createTask,
        organizationId: session?.profile.organization_id,
      });

      if (onRecommendationCreated) onRecommendationCreated();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
      id="recommendation-modal"
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-teal-50 border-b border-teal-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-teal-950">
                {isRtl ? 'تعليمات وتوصيات الطبيب للمريض' : 'Post-Op Instructions & Recommendations'}
              </h3>
              <p className="text-xs text-teal-700">
                {isRtl
                  ? 'تعليمات ما بعد الخلع، العناية بالزرعات، التقويم، ونظافة الفم'
                  : 'Templates for post-extraction, implants, ortho, and hygiene care.'}
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
          {/* Quick Template Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>{isRtl ? 'اختر نموذج تعليمات جاهز (Templates):' : 'Select Instruction Template:'}</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DOCTOR_INSTRUCTION_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.category}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`p-2 rounded-lg border text-xs font-bold text-left transition-all ${
                    category === tpl.category
                      ? 'bg-teal-50 border-teal-500 text-teal-950 ring-2 ring-teal-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate block">{isRtl ? tpl.title_ar : tpl.title_en}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isRtl ? 'عنوان التوصية / التعليمات:' : 'Instruction Title:'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
            />
          </div>

          {/* Instructions Arabic */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isRtl ? 'نص التعليمات السريرية (عربي):' : 'Clinical Instructions (Arabic):'}
            </label>
            <textarea
              rows={6}
              required
              value={instructionsAr}
              onChange={(e) => setInstructionsAr(e.target.value)}
              className="w-full text-xs p-3 rounded-lg border border-slate-300 font-sans leading-relaxed resize-none"
            />
          </div>

          {/* Auto WhatsApp Task for Reception */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <input
              type="checkbox"
              id="auto-task-whatsapp"
              checked={createTask}
              onChange={(e) => setCreateTask(e.target.checked)}
              className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="auto-task-whatsapp" className="text-xs text-emerald-950 cursor-pointer">
              <strong className="block font-bold flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>
                  {isRtl
                    ? 'إنشاء مهمة تلقائية لموظف الاستقبال (إرسال التعليمات عبر واتساب)'
                    : 'Auto-create Reception Task: Send instructions via WhatsApp'}
                </span>
              </strong>
              <span className="text-emerald-800 text-[11px] block mt-0.5">
                {isRtl
                  ? 'ستظهر المهمة فوراً في شاشة الاستقبال لإرسال النص لرقم هاتف المريض المسجل.'
                  : 'Task will appear in Reception queue with verified mobile number.'}
              </span>
            </label>
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
              id="save-recommendation-btn"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isRtl ? 'حفظ وإرسال التوصيات' : 'Save & Send Instructions'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
