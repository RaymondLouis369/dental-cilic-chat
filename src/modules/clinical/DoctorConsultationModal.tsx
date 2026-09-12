import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { createDoctorConsultation } from '../../lib/clinicalStorage';
import { useAuth } from '../auth/AuthContext';
import {
  Users2,
  CheckCircle2,
  X,
  MessageSquareShare,
} from 'lucide-react';

interface DoctorConsultationModalProps {
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
  onConsultationCreated?: () => void;
}

export const DoctorConsultationModal: React.FC<DoctorConsultationModalProps> = ({
  patientId,
  isOpen,
  onClose,
  onConsultationCreated,
}) => {
  const { isRtl } = useLanguage();
  const { session } = useAuth();

  const [specialty, setSpecialty] = useState('علاج الجذور المجهري (Endodontics)');
  const [subject, setSubject] = useState('');
  const [reason, setReason] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [priority, setPriority] = useState<'routine' | 'urgent'>('routine');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !clinicalNotes.trim()) return;

    setIsSubmitting(true);
    try {
      createDoctorConsultation({
        patientId,
        requestingDoctorId: session?.profile.id || 'prof_doc_01',
        specialistDoctorId: 'prof_doc_02',
        specialty,
        subject,
        reason,
        clinicalNotes,
        priority,
        organizationId: session?.profile.organization_id,
      });

      if (onConsultationCreated) onConsultationCreated();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
      id="consultation-modal"
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-sky-50 border-b border-sky-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-sm">
              <Users2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-sky-950">
                {isRtl ? 'استشارة طبية بين الأطباء (رأي ثانٍ)' : 'Doctor-to-Doctor Clinical Consultation'}
              </h3>
              <p className="text-xs text-sky-700">
                {isRtl
                  ? 'طلب رأي استشاري ثانٍ ومناقشة تفاصيل الحالة المعقدة سريرياً'
                  : 'Collaborate and seek second opinions on complex patient cases.'}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isRtl ? 'التخصص المطلوب استشارته:' : 'Specialty Required:'}
              </label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="علاج الجذور المجهري (Endodontics)">علاج الجذور المجهري (Endodontics)</option>
                <option value="جراحة الفم والوجه والفكين (Oral Surgery)">جراحة الفم والوجه والفكين (Oral Surgery)</option>
                <option value="تقويم الأسنان والفكين (Orthodontics)">تقويم الأسنان والفكين (Orthodontics)</option>
                <option value="علاج وجراحة اللثة وزراعة الأسنان (Periodontics)">علاج وجراحة اللثة (Periodontics)</option>
                <option value="طب أسنان الأطفال وذوي الاحتياجات (Pediatric)">طب أسنان الأطفال (Pediatric)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isRtl ? 'درجة الأولوية:' : 'Priority:'}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'routine' | 'urgent')}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-bold"
              >
                <option value="routine">{isRtl ? 'عادي (Routine)' : 'Routine'}</option>
                <option value="urgent">{isRtl ? 'عاجل (Urgent)' : 'Urgent'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isRtl ? 'موضوع الاستشارة السريرية:' : 'Consultation Subject:'}
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={
                isRtl
                  ? 'مثال: تقييم إمكانية إعادة علاج الجذور لسن به انثقاب جانبي'
                  : 'e.g. Assessment of root perforation feasibility for retreatment'
              }
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isRtl ? 'السؤال السريري المطلوب الإجابة عنه:' : 'Clinical Question / Objective:'}
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isRtl
                  ? 'مثال: هل ينصح بالإصلاح المجهري باستخدام MTA أم الخلع والزرع الفوري؟'
                  : 'e.g. Is MTA repair recommended or extraction with immediate implant?'
              }
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isRtl ? 'الملاحظات السريرية والنتائج الإشعاعية:' : 'Clinical Findings & Radiographic Notes:'}
            </label>
            <textarea
              rows={4}
              required
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder={
                isRtl
                  ? 'شرح التاريخ السريري، عمق الجيوب اللثوية، نتائج فحص الحيوية، والأشعة المرفقة...'
                  : 'Describe symptoms, periodontal pocket depth, vitality test, and X-ray observations...'
              }
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 resize-none"
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
              id="save-consultation-btn"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isRtl ? 'إرسال طلب الاستشارة' : 'Submit Consultation Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
