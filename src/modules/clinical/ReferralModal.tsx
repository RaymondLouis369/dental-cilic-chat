import React, { useState } from 'react';
import { ReferralType, ReferralPriority, SpecialtyType } from '../../types/clinical';
import { useLanguage } from '../i18n/LanguageContext';
import { createReferral } from '../../lib/clinicalStorage';
import { useAuth } from '../auth/AuthContext';
import {
  Share2,
  CheckCircle2,
  X,
  UserCheck,
  Building,
} from 'lucide-react';

interface ReferralModalProps {
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
  onReferralCreated?: () => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({
  patientId,
  isOpen,
  onClose,
  onReferralCreated,
}) => {
  const { isRtl } = useLanguage();
  const { session } = useAuth();

  const [referralType, setReferralType] = useState<ReferralType>('internal');
  const [specialty, setSpecialty] = useState<SpecialtyType | string>('endodontics');
  const [targetFacilityName, setTargetFacilityName] = useState('');
  const [reason, setReason] = useState('');
  const [clinicalSummary, setClinicalSummary] = useState('');
  const [priority, setPriority] = useState<ReferralPriority>('routine');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const specialties: { id: SpecialtyType; label_ar: string; label_en: string }[] = [
    { id: 'endodontics', label_ar: 'علاج جذور وعصب الأسنان (Endodontics)', label_en: 'Endodontics' },
    { id: 'oral_surgery', label_ar: 'جراحة الفم والوجه والفكين (Oral Surgery)', label_en: 'Oral Surgery' },
    { id: 'orthodontics', label_ar: 'تقويم الأسنان والفكين (Orthodontics)', label_en: 'Orthodontics' },
    { id: 'periodontics', label_ar: 'علاج وجراحة اللثة (Periodontics)', label_en: 'Periodontics' },
    { id: 'implantology', label_ar: 'زراعة الأسنان والتعويضات (Implantology)', label_en: 'Implantology' },
    { id: 'pediatric', label_ar: 'طب أسنان الأطفال (Pediatric Dentistry)', label_en: 'Pediatric Dentistry' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || !clinicalSummary.trim()) return;

    setIsSubmitting(true);
    try {
      createReferral({
        patientId,
        referringDoctorId: session?.profile.id || 'prof_doc_01',
        referralType,
        specialty,
        targetFacilityName: referralType === 'external' ? targetFacilityName : undefined,
        reason,
        clinicalSummary,
        priority,
        organizationId: session?.profile.organization_id,
      });

      if (onReferralCreated) onReferralCreated();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
      id="referral-modal"
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-indigo-950">
                {isRtl ? 'تحويل المريض / إحالة تخصصية' : 'Create Clinical Referral'}
              </h3>
              <p className="text-xs text-indigo-700">
                {isRtl
                  ? 'إحالة داخلية لزميل استشاري بالمركز أو إحالة خارجية لمستشفى/معهد تخصصي'
                  : 'Refer patient internally to a clinic specialist or externally.'}
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
          {/* Internal vs External Toggle */}
          <div className="flex items-center gap-3 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setReferralType('internal')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                referralType === 'internal'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>{isRtl ? 'إحالة داخلية (طبيب / أخصائي بالمركز)' : 'Internal Referral (In-Clinic Specialist)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setReferralType('external')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                referralType === 'external'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>{isRtl ? 'إحالة خارجية (مستشفى / مركز تخصصي)' : 'External Referral (Hospital / Facility)'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Specialty */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isRtl ? 'التخصص الطبي المستهدف:' : 'Target Specialty:'}
              </label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              >
                {specialties.map((s) => (
                  <option key={s.id} value={s.id}>
                    {isRtl ? s.label_ar : s.label_en}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isRtl ? 'درجة الأولوية:' : 'Referral Priority:'}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ReferralPriority)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-bold"
              >
                <option value="routine">{isRtl ? 'عادي (Routine)' : 'Routine'}</option>
                <option value="urgent">{isRtl ? 'عاجل (Urgent)' : 'Urgent'}</option>
                <option value="emergency">{isRtl ? 'طارئ (Emergency)' : 'Emergency'}</option>
              </select>
            </div>
          </div>

          {/* External Facility Name if external */}
          {referralType === 'external' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isRtl ? 'اسم المستشفى أو المركز الخارجي المحال إليه:' : 'Target Hospital / Facility Name:'}
              </label>
              <input
                type="text"
                required
                value={targetFacilityName}
                onChange={(e) => setTargetFacilityName(e.target.value)}
                placeholder={
                  isRtl
                    ? 'مثال: مستشفى قصر العيني - قسم جراحة الوجه والفكين'
                    : 'e.g. Kasr Al-Ainy Hospital - Maxillofacial Surgery Dept'
                }
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isRtl ? 'سبب الإحالة المطلوب:' : 'Reason for Referral:'}
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isRtl
                  ? 'مثال: علاج جذور متقدم لقنوات منحنية بشدة وأداة مكسورة سابقة'
                  : 'e.g. Complex root canal retreatment with calcified curved canals'
              }
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
            />
          </div>

          {/* Clinical Summary */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isRtl ? 'الملخص السريري ومعلومات الحالة:' : 'Clinical Summary & Case History:'}
            </label>
            <textarea
              rows={3}
              required
              value={clinicalSummary}
              onChange={(e) => setClinicalSummary(e.target.value)}
              placeholder={
                isRtl
                  ? 'ملخص الفحص السريري، الأعراض، الأسنان المتأثرة، وأي علاجات سابقة...'
                  : 'Clinical findings, symptoms, affected teeth, and prior interventions...'
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
              id="save-referral-btn"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isRtl ? 'إرسال وحفظ الإحالة السريرية' : 'Create Referral'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
