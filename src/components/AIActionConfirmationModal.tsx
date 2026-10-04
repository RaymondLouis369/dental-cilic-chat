import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, X, Sparkles, Loader2 } from 'lucide-react';
import { useLanguage } from '../modules/i18n/LanguageContext';
import { AIActionProposal } from '../lib/ai/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  proposal: AIActionProposal | null;
  onConfirm: (proposal: AIActionProposal) => Promise<void>;
}

export const AIActionConfirmationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  proposal,
  onConfirm,
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [isExecuting, setIsExecuting] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen || !proposal) return null;

  const handleApprove = async () => {
    setIsExecuting(true);
    setResultMsg(null);
    try {
      await onConfirm(proposal);
      setResultMsg({
        type: 'success',
        text: isAr ? 'تم اعتماد وتنفيذ إجراء الذكاء الاصطناعي بنجاح وتسجيله في سجل الأمان.' : 'AI action approved and executed successfully.',
      });
      setTimeout(() => {
        setIsExecuting(false);
        setResultMsg(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setIsExecuting(false);
      setResultMsg({
        type: 'error',
        text: err.message || (isAr ? 'حدث خطأ أثناء تنفيذ الإجراء' : 'Error executing action'),
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 bg-gradient-to-r from-indigo-900 to-purple-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-400/30">
              <Sparkles className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {isAr ? 'تأكيد إجراء الذكاء الاصطناعي المقترح' : 'Confirm AI Action Recommendation'}
              </h3>
              <p className="text-xs text-purple-200">
                {isAr ? 'يتطلب موافقة موظف مصرح قبل التنفيذ' : 'Requires explicit authorized approval'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-purple-200 hover:text-white rounded-lg hover:bg-purple-800/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Action Title & Source Badge */}
          <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 px-2.5 py-1 bg-purple-200/60 rounded-md">
                {isAr ? proposal.titleAr : proposal.titleEn}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                [{isAr ? 'المصدر' : 'Source'}: {proposal.sourceAttribution}]
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {isAr ? proposal.descriptionAr : proposal.descriptionEn}
            </p>
          </div>

          {/* Details & Target Entity */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 block font-normal">{isAr ? 'الكيان المستهدف:' : 'Target Entity:'}</span>
              <span className="font-bold text-slate-800">{proposal.targetEntity}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-normal">{isAr ? 'معرف الكيان:' : 'Target ID:'}</span>
              <span className="font-mono text-slate-700 text-[11px]">{proposal.targetId}</span>
            </div>
          </div>

          {/* Safety Warning Banner */}
          <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {isAr
                ? 'تنبيه أمان: هذا الإجراء سيقوم بإجراء تغييرات فعلية بالنظام. لا يتم التنفيذ إلا بموافقة صريحة من مستخدم مصرح له.'
                : 'Security Advisory: Executing this proposal will make live system mutations. Proceed only with authorized intent.'}
            </p>
          </div>

          {/* Feedback Result Message */}
          {resultMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                resultMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{resultMsg.text}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handleApprove}
            disabled={isExecuting}
            className="px-5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isAr ? 'جاري التنفيذ...' : 'Executing...'}</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-purple-200" />
                <span>{isAr ? 'اعتماد وتنفيذ الإجراء' : 'Approve & Execute Action'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
