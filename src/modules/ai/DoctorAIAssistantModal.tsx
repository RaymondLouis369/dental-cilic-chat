import React, { useState } from 'react';
import { Bot, FileText, CheckSquare, Sparkles, X, AlertCircle, Copy, Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { getStoredPatients } from '../../lib/patientStorage';
import {
  generateDoctorClinicalSummary,
  generateDoctorDocumentationDraft,
} from '../../lib/ai/clinicKnowledgeBase';
import { AISourceCategory } from '../../lib/ai/types';

interface DoctorAIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPatientId?: string;
}

export const DoctorAIAssistantModal: React.FC<DoctorAIAssistantModalProps> = ({
  isOpen,
  onClose,
  defaultPatientId,
}) => {
  const { language } = useLanguage();
  const { session } = useAuth();
  const isAr = language === 'ar';

  const orgId = session?.organization?.id || '11111111-1111-1111-1111-111111111111';
  const patients = getStoredPatients();

  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    defaultPatientId || patients[0]?.id || ''
  );
  const [draftType, setDraftType] = useState<'soap_note' | 'prescription' | 'visit_summary'>('soap_note');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const clinicalSummary = generateDoctorClinicalSummary(
    selectedPatientId,
    orgId,
    isAr ? 'ar' : 'en'
  );

  const docDraft = generateDoctorDocumentationDraft(
    selectedPatientId,
    draftType,
    orgId,
    isAr ? 'ar' : 'en'
  );

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(docDraft.draftText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200">
              <Bot className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                {isAr ? 'مساعد الطبيب الذكي والذكاء السريري' : 'Doctor AI Assistant & Clinical Intelligence'}
                <span className="px-2 py-0.5 text-[10px] bg-indigo-100 text-indigo-700 rounded-full font-bold">
                  {isAr ? 'استشاري / مسودة' : 'Advisory / Draft'}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {isAr ? 'تلخيص السجل الطبي، اكتشاف النواقص الإدارية، وإعداد مسودات الملاحظات السريرية' : 'Clinical timeline summary, missing fields audit, and non-final documentation drafting'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Selection & Context */}
        <div className="py-4 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
              {isAr ? 'اختيار ملف المريض:' : 'Select Patient File:'}
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.patient_code})
                </option>
              ))}
            </select>
          </div>

          {/* Clinical Timeline & Summary */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                {isAr ? 'الملخص السريري ومسار العلاج' : 'Clinical Timeline Summary'}
              </h4>
              <div className="flex items-center gap-1.5">
                {clinicalSummary.sourceCategories.map((cat, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 text-[10px] bg-slate-200/70 text-slate-700 rounded-md font-semibold"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
            <pre className="text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-lg border border-slate-100">
              {clinicalSummary.summary}
            </pre>
          </div>

          {/* Missing Documentation Fields Checklist */}
          {clinicalSummary.missingFields.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-2">
              <div className="font-bold text-amber-800 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-amber-600" />
                {isAr ? 'حقول ونواقص توثيق مطلوبة في ملف المريض:' : 'Missing Documentation Fields Audit:'}
              </div>
              <div className="flex flex-wrap gap-2">
                {clinicalSummary.missingFields.map((field, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-white border border-amber-200 text-amber-900 font-medium rounded-lg text-[11px]"
                  >
                    • {field}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Non-Final Documentation Draft Generator */}
          <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                {isAr ? 'إعداد مسودة وثيقة سريرية (استشاري فقط)' : 'Draft Non-Final Clinical Documentation'}
              </h4>
              <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-indigo-100">
                <button
                  onClick={() => setDraftType('soap_note')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                    draftType === 'soap_note'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  SOAP
                </button>
                <button
                  onClick={() => setDraftType('prescription')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                    draftType === 'prescription'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {isAr ? 'روشتة' : 'Prescription'}
                </button>
                <button
                  onClick={() => setDraftType('visit_summary')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                    draftType === 'visit_summary'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {isAr ? 'ملخص الزيارة' : 'Visit Summary'}
                </button>
              </div>
            </div>

            <div className="relative bg-white p-3.5 rounded-xl border border-slate-200">
              <pre className="text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed">
                {docDraft.draftText}
              </pre>
              <button
                onClick={handleCopyDraft}
                className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ المسودة' : 'Copy Draft')}
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200/60">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                {isAr
                  ? 'ملاحظة هامة: المخرجات المولدة بواسطة الذكاء الاصطناعي هي مسودات استشارية فقط. يلزم اعتماد وتوقيع الطبيب المعالج صراحة قبل الاعتماد في السجل الطبي.'
                  : 'Important Safety Disclaimer: AI generated outputs are drafts for clinical preview only. Explicit doctor approval and signature required before persisting.'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
          >
            {isAr ? 'إغلاق المساعد الذكي' : 'Close Assistant'}
          </button>
        </div>
      </div>
    </div>
  );
};
