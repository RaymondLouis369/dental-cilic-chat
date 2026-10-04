import React, { useState, useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import {
  getStoredPriorApprovals,
  createInsurancePriorApproval,
  updatePriorApprovalStatus,
  getStoredClaims,
  createInsuranceClaimFromInvoice,
  postClaimSettlement,
} from '../../lib/financeAndInsuranceStorage';
import { getStoredInvoices, getStoredServices, getStoredInsuranceCompanies } from '../../lib/receptionAndBillingStorage';
import {
  X,
  Shield,
  FileCheck,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  Building2,
  FileText,
  Send,
} from 'lucide-react';

interface InsuranceClaimsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const InsuranceClaimsModal: React.FC<InsuranceClaimsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { language } = useLanguage();
  const { session } = useAuth();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'approvals' | 'claims' | 'settlement'>('claims');

  // Settlement Form State
  const [selectedClaimId, setSelectedClaimId] = useState<string>('');
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [writeOffAmount, setWriteOffAmount] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [transferToPatient, setTransferToPatient] = useState<boolean>(true);

  // Feedback State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const orgId = session?.organization?.id;
  const branchId = session?.profile?.branch_id || '11111111-1111-1111-1111-111111111111';
  const staffId = session?.profile?.id || 'sys_staff';
  const userRole = session?.role?.key;

  const priorApprovals = useMemo(() => {
    if (!orgId) return [];
    return getStoredPriorApprovals(orgId);
  }, [orgId, refreshKey]);

  const claims = useMemo(() => {
    if (!orgId) return [];
    return getStoredClaims(orgId);
  }, [orgId, refreshKey]);

  const insuredInvoices = useMemo(() => {
    if (!orgId) return [];
    return getStoredInvoices(orgId).filter((i) => i.patient_type === 'insured' && i.insurance_company_id);
  }, [orgId, refreshKey]);

  if (!isOpen) return null;

  const handleCreateClaimFromInvoice = (invoiceId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = createInsuranceClaimFromInvoice({
      invoiceId,
      organizationId: orgId!,
      branchId,
      createdBy: staffId,
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to create claim');
      return;
    }

    setSuccessMsg(isAr ? 'تم إنشاء المطالبة التأمينية بنجاح وإدراجها بجدول المطالبات' : 'Insurance claim generated successfully!');
    setRefreshKey((k) => k + 1);
    if (onSuccess) onSuccess();
  };

  const handleApprovePA = (approvalId: string, status: 'approved' | 'rejected') => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = updatePriorApprovalStatus({
      approvalId,
      organizationId: orgId!,
      newStatus: status,
      actorRole: userRole,
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Failed');
      return;
    }

    setSuccessMsg(isAr ? `تم تحديث حالة طلب الموافقة المسبقة إلى (${status === 'approved' ? 'معتمدة' : 'مرفوضة'})` : 'Status updated');
    setRefreshKey((k) => k + 1);
    if (onSuccess) onSuccess();
  };

  const handlePostSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedClaimId) {
      setErrorMsg(isAr ? 'يرجى اختيار المطالبة التأمينية المراد تسويتها' : 'Select a claim');
      return;
    }

    const payout = parseFloat(payoutAmount) || 0;
    const writeOff = parseFloat(writeOffAmount) || 0;

    const res = postClaimSettlement({
      organizationId: orgId!,
      branchId,
      claimId: selectedClaimId,
      payoutAmount: payout,
      writeOffAmount: writeOff,
      rejectionReason: rejectionReason.trim(),
      transferToPatientBalance: transferToPatient,
      postedBy: staffId,
      actorRole: userRole,
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to post settlement');
      return;
    }

    setSuccessMsg(isAr ? 'تم تسجيل التسوية التأمينية وتحديث الحسابات بنجاح' : 'Settlement posted successfully!');
    setSelectedClaimId('');
    setPayoutAmount('');
    setWriteOffAmount('');
    setRejectionReason('');
    setRefreshKey((k) => k + 1);
    if (onSuccess) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600/30 text-teal-300 border border-teal-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {isAr ? 'إدارة المطالبات والموافقات التأمينية' : 'Insurance Claims & Prior Approvals'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr ? 'متابعة موافقات التأمين وتوليد المطالبات والتسويات المالية' : 'Manage approvals, generate claims, and post settlements.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="p-6 space-y-6">
          <div className="flex border-b border-slate-200 gap-4">
            <button
              onClick={() => setActiveTab('claims')}
              className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'claims' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{isAr ? 'المطالبات التأمينية' : 'Claims'} ({claims.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('approvals')}
              className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'approvals' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>{isAr ? 'الموافقات المسبقة' : 'Prior Approvals'} ({priorApprovals.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('settlement')}
              className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'settlement' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>{isAr ? 'تسوية تحصيل المطالبات' : 'Settlement Posting'}</span>
            </button>
          </div>

          {/* TAB 1: CLAIMS */}
          {activeTab === 'claims' && (
            <div className="space-y-6">
              {/* Unclaimed Insured Invoices Section */}
              {insuredInvoices.length > 0 && (
                <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100 space-y-3">
                  <h4 className="font-bold text-teal-900 text-xs flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-teal-700" />
                    <span>{isAr ? 'فواتير تأمينية جاهزة لإنشاء مطالبة' : 'Insured Invoices Ready for Claim Generation'}</span>
                  </h4>

                  <div className="space-y-2">
                    {insuredInvoices.map((inv) => (
                      <div key={inv.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{inv.invoice_number}</span>
                          <span className="text-slate-500 block">{inv.patient_name} • {inv.insurance_company_name} ({inv.insurance_total_amount} ج.م)</span>
                        </div>

                        <button
                          onClick={() => handleCreateClaimFromInvoice(inv.id)}
                          className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs transition-colors"
                        >
                          {isAr ? 'إنشاء مطالبة' : 'Generate Claim'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Claims List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {claims.length > 0 ? (
                  claims.map((clm) => (
                    <div key={clm.id} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 hover:border-teal-300 transition-all">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{clm.claim_number}</span>
                          <span className="text-xs text-slate-500 block">{clm.patient_name} • {clm.insurance_company_name}</span>
                        </div>

                        <div className="text-right">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            clm.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            clm.status === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {clm.status}
                          </span>
                          <span className="font-bold text-slate-900 text-sm block mt-1">{clm.total_claimed_amount} ج.م</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    {isAr ? 'لا توجد مطالبات تأمينية مسجلة' : 'No claims found.'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PRIOR APPROVALS */}
          {activeTab === 'approvals' && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {priorApprovals.length > 0 ? (
                priorApprovals.map((pa) => (
                  <div key={pa.id} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{pa.approval_number}</span>
                        <span className="text-xs text-slate-500 block">{pa.patient_name} • {pa.insurance_company_name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {pa.status === 'pending_approval' && (
                          <>
                            <button
                              onClick={() => handleApprovePA(pa.id, 'approved')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isAr ? 'اعتماد' : 'Approve'}</span>
                            </button>

                            <button
                              onClick={() => handleApprovePA(pa.id, 'rejected')}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{isAr ? 'رفض' : 'Reject'}</span>
                            </button>
                          </>
                        )}
                        <span className="font-bold text-teal-700 text-sm">{pa.total_approved_amount} ج.م</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  {isAr ? 'لا توجد طلبات موافقة مسبقة' : 'No prior approvals found.'}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SETTLEMENT POSTING */}
          {activeTab === 'settlement' && (
            <form onSubmit={handlePostSettlement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'اختر المطالبة التأمينية المراد تسويتها *' : 'Select Claim for Settlement *'}
                </label>
                <select
                  required
                  value={selectedClaimId}
                  onChange={(e) => setSelectedClaimId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  <option value="">{isAr ? '-- اختر المطالبة --' : '-- Select Claim --'}</option>
                  {claims.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.claim_number} - {c.patient_name} ({c.insurance_company_name}) - {c.total_claimed_amount} ج.م [{c.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isAr ? 'المبلغ المحصّل الفعلي من التأمين (ج.م) *' : 'Payout Amount Received (EGP) *'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="e.g. 800"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isAr ? 'المبلغ المغطى كشطب/خصم (Write-off)' : 'Write-Off Amount (EGP)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={writeOffAmount}
                    onChange={(e) => setWriteOffAmount(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs block">
                    {isAr ? 'تحويل المتبقي المرفوض على حساب المريض' : 'Transfer Unpaid Shortfall to Patient Debt'}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {isAr ? 'عند تفعيل الخيار، يتم تحديث الفاتورة ليصبح المريض مطالباً بسداد الفرق المرفوض من التأمين' : 'If enabled, transfers unpaid insurance shortfall to patient balance.'}
                  </span>
                </div>

                <input
                  type="checkbox"
                  checked={transferToPatient}
                  onChange={(e) => setTransferToPatient(e.target.checked)}
                  className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'سبب الرفض / ملاحظات التسوية' : 'Rejection Reason / Settlement Notes'}
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={isAr ? 'ملاحظات التسوية...' : 'Settlement notes...'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                <span>{isAr ? 'تسجيل التسوية الماليّة للمطالبة' : 'Post Settlement & Update Invoices'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
