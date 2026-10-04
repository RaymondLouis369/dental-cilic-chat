import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  BarChart3,
  Building2,
  Boxes,
  Truck,
  MessageSquare,
  FileSpreadsheet,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { DEFAULT_BRANCHES } from '../../lib/storage';
import {
  generateManagerAIReport,
  AIRiskSignal,
} from '../../lib/ai/managerAIAssistant';
import { AIActionProposal } from '../../lib/ai/types';
import { AIActionConfirmationModal } from '../../components/AIActionConfirmationModal';
import { executeApprovedAIAction } from '../../lib/ai/actionExecutionEngine';

export const ManagerAIAssistantView: React.FC = () => {
  const { language } = useLanguage();
  const { session } = useAuth();
  const isAr = language === 'ar';

  const orgId = session?.organization?.id || '11111111-1111-1111-1111-111111111111';
  const managerId = session?.profile?.id || 'mgr_01';
  const userRole = session?.role?.key || 'center_manager';

  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedProposal, setSelectedProposal] = useState<AIActionProposal | null>(null);

  // Compute AI Report
  const report = useMemo(() => {
    return generateManagerAIReport(orgId, selectedBranchId);
  }, [orgId, selectedBranchId]);

  const handleExecuteAction = async (proposal: AIActionProposal) => {
    const res = await executeApprovedAIAction({
      proposal,
      actorUserId: managerId,
      actorUserName: session?.profile ? session.profile.display_name : 'مدير المركز',
      actorUserRole: userRole,
      organizationId: orgId,
      branchId: selectedBranchId !== 'all' ? selectedBranchId : undefined,
    });
    if (!res.success) {
      throw new Error(res.error || (isAr ? 'فشل تنفيذ الإجراء' : 'Failed to execute action'));
    }
  };

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-500/20 rounded-2xl border border-purple-400/30 shrink-0">
            <TrendingUp className="w-7 h-7 text-purple-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <span>{isAr ? 'المساعد الذكي للعمليات والإدارة التنفيذية' : 'Operations & Management AI Assistant'}</span>
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-purple-400/20 text-purple-200 border border-purple-300/30 rounded-full">
                Wave 04
              </span>
            </h1>
            <p className="text-xs text-purple-100/80 mt-1 max-w-xl">
              {isAr
                ? 'تحليل المخاطر التشغيلية، توقعات نسب عدم الحضور، رصد نواقص المخزون وتأخيرات المعمل، واقتراح قرارات إدارية معتمدة.'
                : 'Explainable forecasting, risk signals, inventory reorder risks, lab turnaround alerts, and manager action proposals.'}
            </p>
          </div>
        </div>

        {/* Branch Selector */}
        <div className="w-full md:w-64 bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/20">
          <label className="block text-[11px] font-semibold text-purple-200 mb-1 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'نطاق الفرع المخصص:' : 'Target Branch Scope:'}</span>
          </label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="w-full bg-slate-900 text-white text-xs font-semibold p-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="all">{isAr ? 'جميع الفروع (المقر الرئيسي)' : 'All Branches (Organization Wide)'}</option>
            {DEFAULT_BRANCHES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Narrative BI AI Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-sm text-slate-800">
              {isAr ? 'الملخص التنفيذي ومؤشرات الأداء' : 'Executive AI BI Report'}
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
            [{isAr ? 'المصدر' : 'Source'}: Financial Data & Clinic Database]
          </span>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
          {isAr ? report.biSummaryTextAr : report.biSummaryTextEn}
        </div>
      </div>

      {/* Risk Signals Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h2 className="font-bold text-sm text-slate-800">
            {isAr ? 'مؤشرات التنبؤ وإشارات المخاطر التشغيلية' : 'Explainable Risk Signals & Risk Forecasting'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.riskSignals.map((sig) => (
            <div
              key={sig.id}
              className={`p-5 rounded-2xl border shadow-xs space-y-3 ${
                sig.riskLevel === 'high'
                  ? 'bg-rose-50/50 border-rose-200'
                  : 'bg-amber-50/50 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">{isAr ? sig.titleAr : sig.titleEn}</span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                    sig.riskLevel === 'high'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {sig.riskLevel} Risk
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {isAr ? sig.explanationAr : sig.explanationEn}
              </p>

              <div className="flex items-center justify-between text-[11px] text-slate-500 bg-white/80 p-2 rounded-lg border border-slate-200/60">
                <span>{sig.dataSummary}</span>
                <span className="font-bold">[{sig.sourceCategory}]</span>
              </div>

              {sig.proposedAction && (
                <button
                  onClick={() => setSelectedProposal(sig.proposedAction!)}
                  className="w-full mt-2 py-2 px-3 bg-indigo-900 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-300" />
                  <span>{isAr ? 'اعتماد التوصية التنفيذية' : 'Review & Approve Action Proposal'}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

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
