import React, { useState, useMemo } from 'react';
import {
  Stethoscope,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ClipboardList,
  UserCheck,
  Send,
  HelpCircle,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { getStoredPatients } from '../../lib/patientStorage';
import {
  summarizePatientClinicalTimeline,
  prepareClinicalDraft,
  DoctorClinicalSummary,
} from '../../lib/ai/doctorAIAssistant';
import { AIActionProposal } from '../../lib/ai/types';
import { AIActionConfirmationModal } from '../../components/AIActionConfirmationModal';
import { executeApprovedAIAction } from '../../lib/ai/actionExecutionEngine';

export const DoctorAIAssistantView: React.FC = () => {
  const { language } = useLanguage();
  const { session } = useAuth();
  const isAr = language === 'ar';

  const orgId = session?.organization?.id || '11111111-1111-1111-1111-111111111111';
  const doctorId = session?.profile?.id || 'doc_01';

  // State
  const patients = useMemo(() => getStoredPatients(), []);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || 'a1111111-1111-1111-1111-111111111111');
  const [patientSearch, setPatientSearch] = useState('');

  // Drafts State
  const [activeDraft, setActiveDraft] = useState<{ titleAr: string; titleEn: string; contentAr: string; contentEn: string } | null>(null);

  // Modal State
  const [selectedProposal, setSelectedProposal] = useState<AIActionProposal | null>(null);

  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients;
    const q = patientSearch.toLowerCase();
    return patients.filter(
      (p) =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
        p.patient_code.toLowerCase().includes(q)
    );
  }, [patients, patientSearch]);

  // Compute Clinical Summary
  const summary: DoctorClinicalSummary | { error: string } = useMemo(() => {
    return summarizePatientClinicalTimeline(selectedPatientId, orgId, doctorId);
  }, [selectedPatientId, orgId, doctorId]);

  const isError = 'error' in summary;
  const activeSummary = !isError ? (summary as DoctorClinicalSummary) : null;

  const handleGenerateDraft = (type: 'soap_note' | 'referral' | 'recall_recommendation') => {
    const draft = prepareClinicalDraft(type, selectedPatientId, orgId);
    setActiveDraft(draft);
  };

  const handleExecuteAction = async (proposal: AIActionProposal) => {
    const res = await executeApprovedAIAction({
      proposal,
      actorUserId: doctorId,
      actorUserName: session?.profile ? session.profile.display_name : 'الدكتور المعالج',
      actorUserRole: session?.role?.key || 'dentist',
      organizationId: orgId,
    });
    if (!res.success) {
      throw new Error(res.error || (isAr ? 'فشل تنفيذ الإجراء' : 'Failed to execute action'));
    }
  };

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-teal-900 via-indigo-900 to-purple-900 text-white rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-teal-500/20 rounded-2xl border border-teal-400/30 shrink-0">
            <Stethoscope className="w-7 h-7 text-teal-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <span>{isAr ? 'المساعد الذكي للطبابة والجراحة' : 'Doctor AI Clinical Workspace'}</span>
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-teal-400/20 text-teal-200 border border-teal-300/30 rounded-full">
                Wave 04
              </span>
            </h1>
            <p className="text-xs text-teal-100/80 mt-1 max-w-xl">
              {isAr
                ? 'تحليل السجل السريري للمريض، كشف نواقص التوثيق، إعداد مسودات SOAP والتحويلات، واقتراح إجراءات استرشادية تتطلب اعتمادك.'
                : 'Authorized patient timeline summary, documentation audit, draft SOAP/referrals, and advisory action proposals requiring doctor approval.'}
            </p>
          </div>
        </div>

        {/* Patient Selector */}
        <div className="w-full md:w-72 bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/20">
          <label className="block text-[11px] font-semibold text-teal-200 mb-1">
            {isAr ? 'اختر المريض للتحليل السريري:' : 'Select Patient for AI Analysis:'}
          </label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="w-full bg-slate-900 text-white text-xs font-semibold p-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_name} ({p.patient_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {isError ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold">
          {'error' in summary && summary.error}
        </div>
      ) : activeSummary ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Clinical Timeline Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Clinical Overview Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <ClipboardList className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-bold text-sm text-slate-800">
                    {isAr ? 'الملخص السريري الشامل' : 'Clinical Summary & Diagnosis'}
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                  [{isAr ? 'المصدر' : 'Source'}: {activeSummary.sourceCategory}]
                </span>
              </div>

              {/* Medical Alerts Banner */}
              {activeSummary.medicalAlerts.length > 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-900 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {isAr ? 'تحذيرات طبية حرجة: ' : 'Critical Medical Alerts: '}
                    {activeSummary.medicalAlerts.join(', ')}
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{isAr ? 'لا توجد تحذيرات طبية مسجلة لهذا المريض' : 'No critical medical alerts recorded'}</span>
                </div>
              )}

              {/* Narrative Text */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">
                {isAr ? activeSummary.summaryTextAr : activeSummary.summaryTextEn}
              </div>

              {/* Progress Counters */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <span className="text-xs text-indigo-600 block">{isAr ? 'المراحل المكتملة' : 'Completed Phases'}</span>
                  <span className="text-base font-bold text-indigo-900">
                    {activeSummary.completedPhasesCount} / {activeSummary.totalPhasesCount}
                  </span>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl">
                  <span className="text-xs text-purple-600 block">{isAr ? 'الروشتات' : 'Prescriptions'}</span>
                  <span className="text-base font-bold text-purple-900">{activeSummary.prescriptionsCount}</span>
                </div>
                <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl">
                  <span className="text-xs text-teal-600 block">{isAr ? 'طلبات المعمل' : 'Lab Orders'}</span>
                  <span className="text-base font-bold text-teal-900">{activeSummary.labOrdersCount}</span>
                </div>
              </div>
            </div>

            {/* Documentation Audit Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-800">
                  {isAr ? 'فحص نواقص التوثيق الطبي' : 'Documentation Field Audit'}
                </h3>
              </div>

              {activeSummary.missingDocumentation.length > 0 ? (
                <ul className="space-y-2 text-xs">
                  {activeSummary.missingDocumentation.map((item, idx) => (
                    <li key={idx} className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-amber-900 flex items-center gap-2 font-medium">
                      <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'التوثيق الطبي للمريض مكتمل 100%' : 'Medical documentation is fully complete'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Draft Generator & Recommended Actions Column */}
          <div className="space-y-6">
            {/* Clinical Draft Assistant */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-sm text-slate-800">
                  {isAr ? 'صياغة المسودات السريرية' : 'Prepare Clinical Draft'}
                </h3>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleGenerateDraft('soap_note')}
                  className="w-full text-right p-3 bg-purple-50 hover:bg-purple-100/80 text-purple-900 rounded-xl border border-purple-200 text-xs font-bold transition-colors flex items-center justify-between"
                >
                  <span>{isAr ? 'مسودة ملاحظات الكشف (SOAP Draft)' : 'Draft SOAP Clinical Note'}</span>
                  <FileText className="w-4 h-4 text-purple-600" />
                </button>
                <button
                  onClick={() => handleGenerateDraft('referral')}
                  className="w-full text-right p-3 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-900 rounded-xl border border-indigo-200 text-xs font-bold transition-colors flex items-center justify-between"
                >
                  <span>{isAr ? 'مسودة تحويل استشاري' : 'Draft Specialist Referral'}</span>
                  <Send className="w-4 h-4 text-indigo-600" />
                </button>
                <button
                  onClick={() => handleGenerateDraft('recall_recommendation')}
                  className="w-full text-right p-3 bg-teal-50 hover:bg-teal-100/80 text-teal-900 rounded-xl border border-teal-200 text-xs font-bold transition-colors flex items-center justify-between"
                >
                  <span>{isAr ? 'مسودة توصية المتابعة' : 'Draft Recall Recommendation'}</span>
                  <UserCheck className="w-4 h-4 text-teal-600" />
                </button>
              </div>

              {/* Active Draft Output */}
              {activeDraft && (
                <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-2 border border-slate-800 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-300 border-b border-slate-800 pb-2">
                    <span>{isAr ? activeDraft.titleAr : activeDraft.titleEn}</span>
                    <span className="text-[10px] bg-purple-900/60 px-2 py-0.5 rounded text-purple-200">
                      [Draft / Advisory]
                    </span>
                  </div>
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                    {isAr ? activeDraft.contentAr : activeDraft.contentEn}
                  </pre>
                </div>
              )}
            </div>

            {/* Proposed Doctor Actions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <CheckCircle2 className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-sm text-slate-800">
                  {isAr ? 'توصيات تحتاج اعتمادك' : 'Recommended Doctor Actions'}
                </h3>
              </div>

              {activeSummary.proposedActions.length > 0 ? (
                <div className="space-y-3">
                  {activeSummary.proposedActions.map((prop) => (
                    <div key={prop.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>{isAr ? prop.titleAr : prop.titleEn}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {isAr ? prop.descriptionAr : prop.descriptionEn}
                      </p>
                      <button
                        onClick={() => setSelectedProposal(prop)}
                        className="w-full mt-1 py-2 px-3 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{isAr ? 'مراجعة واعتماد الإجراء' : 'Review & Approve Action'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-2">
                  {isAr ? 'لا توجد توصيات إجراءات عاجلة معلقة لهذا المريض.' : 'No urgent action proposals pending for this patient.'}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Confirmation Modal */}
      <AIActionConfirmationModal
        isOpen={!!selectedProposal}
        onClose={() => setSelectedProposal(null)}
        proposal={selectedProposal}
        onConfirm={handleExecuteAction}
      />
    </div>
  );
};
