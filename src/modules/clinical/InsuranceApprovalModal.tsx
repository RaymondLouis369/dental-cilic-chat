import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, CheckCircle2, Clock, AlertTriangle, FileText, Info } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { TreatmentPlanService, InsuranceApprovalStatus } from '../../types/clinical';
import { updateTreatmentPlanServiceApproval } from '../../lib/clinicalStorage';

interface InsuranceApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: TreatmentPlanService | null;
  patientName?: string;
  onUpdated?: () => void;
}

export const InsuranceApprovalModal: React.FC<InsuranceApprovalModalProps> = ({
  isOpen,
  onClose,
  service,
  patientName,
  onUpdated,
}) => {
  const { language } = useLanguage();
  const { session } = useAuth();
  const isAr = language === 'ar';

  const [status, setStatus] = useState<InsuranceApprovalStatus>('pending_approval');
  const [approvedCoveragePct, setApprovedCoveragePct] = useState<number>(80);
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (service) {
      setStatus(service.approval_status || (service.requires_approval ? 'pending_approval' : 'direct_coverage'));
      const initialCoverage = service.approved_coverage_percentage !== undefined
        ? service.approved_coverage_percentage
        : (service.coverage_percentage ?? 80);
      setApprovedCoveragePct(initialCoverage);
      setNotes(service.override_audit?.notes || '');
    }
  }, [service]);

  if (!isOpen || !service) return null;

  const originalContractedPct = service.coverage_percentage ?? 80;
  const totalPrice = service.total_price || 0;
  const isOverride = approvedCoveragePct !== originalContractedPct;

  const effectivePct = status === 'rejected' ? 0 : approvedCoveragePct;
  const calculatedInsuranceCoverage = Math.round(((totalPrice * effectivePct) / 100) * 100) / 100;
  const calculatedPatientCopay = Math.round((totalPrice - calculatedInsuranceCoverage) * 100) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      updateTreatmentPlanServiceApproval({
        serviceId: service.id,
        approvalStatus: status,
        approvedCoveragePercentage: approvedCoveragePct,
        updatedByUserId: session?.profile?.id,
        updatedByName: (session?.profile as any)?.display_name || (session?.profile as any)?.full_name || (isAr ? 'موظف الاستقبال' : 'Reception Staff'),
        notes: notes.trim() || undefined,
      });

      if (onUpdated) onUpdated();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
      id="insurance-approval-modal"
    >
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isAr ? 'تحديث موافقة التأمين الطبي' : 'Update Insurance Approval'}
              </h3>
              <p className="text-xs text-slate-500">
                {patientName ? (isAr ? `المريض: ${patientName}` : `Patient: ${patientName}`) : (isAr ? 'إجراءات التغطية التأمينية' : 'Insurance coverage workflow')}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Service Summary Box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>{isAr ? service.service_name_ar : service.service_name_en}</span>
              <span className="font-mono">{totalPrice.toLocaleString('en-US')} EGP</span>
            </div>
            {service.tooth_number && (
              <p className="text-[11px] text-slate-500">
                {isAr ? `الأسنان المستهدفة: #${service.tooth_number}` : `Teeth: #${service.tooth_number}`}
              </p>
            )}
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              {isAr ? 'حالة موافقة شركة التأمين:' : 'Insurance Approval Status:'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('approved')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  status === 'approved'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{isAr ? 'معتمد (Approved)' : 'Approved'}</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('pending_approval')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  status === 'pending_approval'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-600" />
                <span>{isAr ? 'قيد الموافقة (Pending)' : 'Pending Approval'}</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('rejected')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  status === 'rejected'
                    ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>{isAr ? 'مرفوض (Rejected)' : 'Rejected'}</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('direct_coverage')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  status === 'direct_coverage'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>{isAr ? 'تغطية مباشرة (Direct)' : 'Direct Coverage'}</span>
              </button>
            </div>
          </div>

          {/* Coverage Percentage & Override Adjustment */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                {isAr ? 'نسبة تغطية التأمين المعتمدة (%):' : 'Approved Insurance Coverage (%):'}
              </label>
              <span className="text-[11px] text-slate-500">
                {isAr ? `النسبة التعاقدية الأصلية: ${originalContractedPct}%` : `Contracted: ${originalContractedPct}%`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={100}
                value={approvedCoveragePct}
                onChange={(e) => setApprovedCoveragePct(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-28 p-2.5 text-sm font-bold border border-slate-300 rounded-xl text-center focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-hidden"
              />
              <span className="text-xs text-slate-600 font-bold">%</span>
              {isOverride && (
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold">
                  {isAr ? 'تعديل استثنائي معتمد (Override)' : 'Approved Override'}
                </span>
              )}
            </div>
          </div>

          {/* Live Recalculated Breakdown */}
          <div className="p-3.5 bg-teal-50/60 border border-teal-200 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between items-center text-teal-900 font-medium">
              <span>{isAr ? 'تغطية شركة التأمين (Insurance Amount):' : 'Insurance Coverage Amount:'}</span>
              <span className="font-bold font-mono text-sm">{calculatedInsuranceCoverage.toLocaleString('en-US')} EGP</span>
            </div>
            <div className="flex justify-between items-center text-teal-900 font-medium">
              <span>{isAr ? 'مبلغ تحمل المريض (Patient Copay):' : 'Patient Copay Amount:'}</span>
              <span className="font-bold font-mono text-sm">{calculatedPatientCopay.toLocaleString('en-US')} EGP</span>
            </div>
          </div>

          {/* Notes / Pre-approval Reference */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isAr ? 'رقم الموافقة وملاحظات التأمين:' : 'Pre-approval Reference & Notes:'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isAr
                  ? 'مثال: تمت الموافقة المسبقة برقم AUTH-8820 بنسبة تغطية 75% بناءً على رد الشركة...'
                  : 'e.g. Pre-approved under reference AUTH-8820 with 75% coverage decision...'
              }
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-hidden resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isAr ? 'حفظ قرار التأمين' : 'Save Approval Decision'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
