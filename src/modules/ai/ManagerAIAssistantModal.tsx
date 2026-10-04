import React, { useState } from 'react';
import { Bot, TrendingUp, AlertTriangle, Play, X, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import {
  generateManagerOperationalReport,
  executeAIAction,
} from '../../lib/ai/clinicKnowledgeBase';
import { AIRecommendedAction, AIRiskSignal } from '../../lib/ai/types';
import { AIActionConfirmationModal } from './AIActionConfirmationModal';

interface ManagerAIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManagerAIAssistantModal: React.FC<ManagerAIAssistantModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { language } = useLanguage();
  const { session } = useAuth();
  const isAr = language === 'ar';

  const orgId = session?.organization?.id || '11111111-1111-1111-1111-111111111111';

  const [activeAction, setActiveAction] = useState<AIRecommendedAction | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const report = generateManagerOperationalReport({}, orgId, isAr ? 'ar' : 'en');

  const handleOpenActionModal = (act: AIRecommendedAction) => {
    setActiveAction(act);
    setIsConfirmationOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!activeAction || !session?.profile?.id) return;
    setIsExecuting(true);
    try {
      const res = await executeAIAction(activeAction, session.profile.id, orgId);
      setIsConfirmationOpen(false);
      setActionSuccessMsg(res.message);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch {
      setActionSuccessMsg(isAr ? 'حدث خطأ أثناء تنفيذ الإجراء' : 'Error executing action');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <Bot className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  {isAr ? 'مساعد الذكاء الاصطناعي التشغيلي والإداري' : 'Operations & Manager AI Assistant'}
                  <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-700 rounded-full font-bold">
                    {isAr ? 'مصرح للمدراء' : 'Authorized Managers'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  {isAr ? 'تحليل الأداء التشغيلي، مؤشرات المخاطر المفسرة، والتوصية بالإجراءات الذكية' : 'Operational intelligence, explainable risk indicators, and action recommendations'}
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

          {actionSuccessMsg && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Operational Intelligence Report */}
          <div className="py-4 space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  {isAr ? 'ملخص الذكاء التشغيلي والتحليلي' : 'Operational Intelligence Summary'}
                </h4>
                <div className="flex items-center gap-1">
                  {report.sourceCategories.map((cat, idx) => (
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
                {report.reportText}
              </pre>
            </div>

            {/* Explainable Risk Signals */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                {isAr ? 'مؤشرات وإشارات المخاطر المرصودة (مفسرة مع الأدلة):' : 'Detected Risk Signals (Explainable Evidence):'}
              </h4>

              {report.riskSignals.length === 0 ? (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-medium rounded-xl">
                  {isAr ? 'لا توجد أي مخاطر تشغيلية أو تنبيهات عاجلة مرصودة حالياً.' : 'No operational risks or urgent alerts detected.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {report.riskSignals.map((signal, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                              signal.level === 'high' || signal.level === 'critical'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {signal.level}
                          </span>
                          <span className="font-bold text-xs text-slate-800">
                            {isAr ? signal.title_ar : signal.title_en}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600">
                        {isAr ? signal.description_ar : signal.description_en}
                      </p>

                      {signal.evidence.length > 0 && (
                        <div className="p-2 bg-slate-50 rounded-lg text-[11px] text-slate-500 space-y-1">
                          <span className="font-bold text-slate-700">{isAr ? 'الأدلة:' : 'Evidence:'}</span>
                          <ul className="list-disc list-inside space-y-0.5">
                            {signal.evidence.map((ev, eIdx) => (
                              <li key={eIdx}>{ev}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {signal.recommendedAction && (
                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                          <button
                            onClick={() => handleOpenActionModal(signal.recommendedAction!)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-indigo-200"
                          >
                            <Play className="w-3.5 h-3.5" />
                            {isAr ? signal.recommendedAction.title_ar : signal.recommendedAction.title_en}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors"
            >
              {isAr ? 'إغلاق المساعد الإداري' : 'Close Manager Assistant'}
            </button>
          </div>
        </div>
      </div>

      <AIActionConfirmationModal
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        action={activeAction}
        onConfirm={handleConfirmAction}
        isExecuting={isExecuting}
      />
    </>
  );
};
