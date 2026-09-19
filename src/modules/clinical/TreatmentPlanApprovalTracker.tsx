import React from 'react';
import { TreatmentPlanService, InsuranceApprovalStatus } from '../../types/clinical';
import { ShieldCheck, Clock, CheckCircle2, AlertCircle, Edit3 } from 'lucide-react';

interface TreatmentPlanApprovalTrackerProps {
  services: TreatmentPlanService[];
  isRtl?: boolean;
  onOpenApprovalModal?: (service: TreatmentPlanService) => void;
}

export const TreatmentPlanApprovalTracker: React.FC<TreatmentPlanApprovalTrackerProps> = ({
  services,
  isRtl = false,
  onOpenApprovalModal,
}) => {
  if (!services || services.length === 0) return null;

  const getEffectiveStatus = (s: TreatmentPlanService): InsuranceApprovalStatus => {
    return s.approval_status || (s.requires_approval ? 'pending_approval' : 'direct_coverage');
  };

  const pendingServices = services.filter((s) => getEffectiveStatus(s) === 'pending_approval');
  const approvedServices = services.filter((s) => getEffectiveStatus(s) === 'approved');
  const rejectedServices = services.filter((s) => getEffectiveStatus(s) === 'rejected');
  const directServices = services.filter((s) => getEffectiveStatus(s) === 'direct_coverage');

  const totalInsuranceCoverage = services.reduce((acc, s) => acc + (s.insurance_coverage_amount || 0), 0);
  const totalPatientCopay = services.reduce((acc, s) => acc + (s.patient_copay_amount || 0), 0);

  return (
    <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {isRtl ? 'شريط تتبع موافقات التأمين (Real-Time Approval Tracker):' : 'Insurance Approval Tracker:'}
          </h5>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="text-slate-600">
            {isRtl ? 'إجمالي تغطية التأمين:' : 'Total Insurance:'}{' '}
            <strong className="text-emerald-700 font-mono">{totalInsuranceCoverage.toLocaleString('en-US')} EGP</strong>
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-600">
            {isRtl ? 'تحمل المريض:' : 'Patient Copay:'}{' '}
            <strong className="text-amber-800 font-mono">{totalPatientCopay.toLocaleString('en-US')} EGP</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Pending */}
        <div
          onClick={() => pendingServices.length > 0 && onOpenApprovalModal?.(pendingServices[0])}
          className={`p-2.5 rounded-lg border text-xs transition-all ${
            pendingServices.length > 0
              ? 'bg-amber-50 border-amber-300 text-amber-900 cursor-pointer hover:bg-amber-100 shadow-2xs'
              : 'bg-white border-slate-200 text-slate-500'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold flex items-center gap-1 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              {isRtl ? 'قيد الموافقة (Pending)' : 'Pending Approval'}
            </span>
            <span className="font-black font-mono text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
              {pendingServices.length}
            </span>
          </div>
          <p className="text-[10px] opacity-80 flex items-center gap-1">
            {pendingServices.length > 0 ? (
              <>
                <Edit3 className="w-3 h-3 text-amber-700" />
                {isRtl ? 'انقر لتعديل/تحديث الموافقة' : 'Click to override status'}
              </>
            ) : (
              isRtl ? 'لا يوجد طلبات معلقة' : 'No pending approvals'
            )}
          </p>
        </div>

        {/* Approved */}
        <div className="p-2.5 rounded-lg border bg-white border-slate-200 text-slate-700 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold flex items-center gap-1 text-emerald-800 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {isRtl ? 'معتمد (Approved)' : 'Approved'}
            </span>
            <span className="font-black font-mono text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              {approvedServices.length}
            </span>
          </div>
          <p className="text-[10px] text-slate-500">
            {approvedServices.length} {isRtl ? 'إجراءات تم اعتمادها' : 'procedures approved'}
          </p>
        </div>

        {/* Rejected */}
        <div className="p-2.5 rounded-lg border bg-white border-slate-200 text-slate-700 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold flex items-center gap-1 text-rose-800 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              {isRtl ? 'مرفوض (Rejected)' : 'Rejected'}
            </span>
            <span className="font-black font-mono text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
              {rejectedServices.length}
            </span>
          </div>
          <p className="text-[10px] text-slate-500">
            {rejectedServices.length} {isRtl ? 'إجراءات مرفوضة' : 'procedures rejected'}
          </p>
        </div>

        {/* Direct Coverage */}
        <div className="p-2.5 rounded-lg border bg-white border-slate-200 text-slate-700 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold flex items-center gap-1 text-blue-800 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              {isRtl ? 'تغطية مباشرة (Direct)' : 'Direct Coverage'}
            </span>
            <span className="font-black font-mono text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              {directServices.length}
            </span>
          </div>
          <p className="text-[10px] text-slate-500">
            {directServices.length} {isRtl ? 'مباشرة بدون إذن' : 'no approval needed'}
          </p>
        </div>
      </div>
    </div>
  );
};

interface InsuranceApprovalStatusBadgeProps {
  service: TreatmentPlanService;
  isRtl?: boolean;
  onOpenApprovalModal?: (service: TreatmentPlanService) => void;
}

export const InsuranceApprovalStatusBadge: React.FC<InsuranceApprovalStatusBadgeProps> = ({
  service,
  isRtl = false,
  onOpenApprovalModal,
}) => {
  const approvalStatus: InsuranceApprovalStatus =
    service.approval_status || (service.requires_approval ? 'pending_approval' : 'direct_coverage');
  const apprCovPct = service.approved_coverage_percentage ?? service.coverage_percentage ?? 0;
  const isOverridden = !!service.override_audit;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onOpenApprovalModal?.(service)}
        title={
          isOverridden
            ? `${isRtl ? 'معدل يدوياً بواسطة' : 'Manually overridden by'} ${service.override_audit?.updated_by_name || 'Staff'}`
            : (isRtl ? 'انقر لتعديل حالة الموافقة والتغطية' : 'Click to override status/coverage')
        }
        className={`px-2 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
          approvalStatus === 'approved'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
            : approvalStatus === 'pending_approval'
            ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 animate-pulse'
            : approvalStatus === 'rejected'
            ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            : 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
        }`}
      >
        {approvalStatus === 'approved' && (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {isRtl ? `معتمد (${apprCovPct}%)` : `Approved (${apprCovPct}%)`}
          </span>
        )}
        {approvalStatus === 'pending_approval' && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            {isRtl ? 'مطلوب موافقة مسبقة' : 'Pre-approval Required'}
          </span>
        )}
        {approvalStatus === 'rejected' && (
          <span className="flex items-center gap-1 text-rose-800">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            {isRtl ? 'مرفوض (تحمل كامل)' : 'Rejected (100% Copay)'}
          </span>
        )}
        {approvalStatus === 'direct_coverage' && (
          <span className="flex items-center gap-1 text-blue-800">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            {isRtl ? `تغطية مباشرة (${apprCovPct}%)` : `Direct Coverage (${apprCovPct}%)`}
          </span>
        )}
      </button>

      {isOverridden && (
        <span
          className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200"
          title={`${isRtl ? 'تم التعديل اليدوي من قِبل الاستقبال' : 'Manual override applied'}: ${service.override_audit?.notes || ''}`}
        >
          OVR
        </span>
      )}
    </div>
  );
};
