import React from 'react';
import { ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { AIRecommendedAction } from '../../lib/ai/types';

interface AIActionConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: AIRecommendedAction | null;
  onConfirm: () => Promise<void>;
  isExecuting?: boolean;
}

export const AIActionConfirmationModal: React.FC<AIActionConfirmationModalProps> = ({
  isOpen,
  onClose,
  action,
  onConfirm,
  isExecuting = false,
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  if (!isOpen || !action) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                {isAr ? 'تأكيد اعتماد إجراء ذكي' : 'Confirm AI Action Execution'}
              </h3>
              <p className="text-xs text-slate-500">
                {isAr ? 'يتطلب هذا الإجراء موافقة صريحة من مستخدم مصرح له' : 'Explicit authorized user approval required'}
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

        <div className="py-4 space-y-4">
          <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 text-xs space-y-2">
            <div className="font-bold text-slate-800 text-sm">
              {isAr ? action.title_ar : action.title_en}
            </div>
            <p className="text-slate-600 leading-relaxed">
              {isAr ? action.description_ar : action.description_en}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-700">
              {isAr ? 'ضمانات الأمان والمراجعة:' : 'Security & Safety Guarantees:'}
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li>{isAr ? 'سيتم تسجيل الإجراء برقم مراجعة أمني غير قابل للتعديل' : 'Appends immutable audit record with user ID'}</li>
              <li>{isAr ? 'لن يتم تعديل بيانات السجل الطبي بشكل تلقائي دون إذن' : 'Does not autonomously modify clinical diagnosis or plans'}</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            disabled={isExecuting}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isExecuting
              ? (isAr ? 'جاري التنفيذ...' : 'Executing...')
              : (isAr ? 'تأكيد واعتماد الإجراء' : 'Confirm & Execute')}
          </button>
        </div>
      </div>
    </div>
  );
};
