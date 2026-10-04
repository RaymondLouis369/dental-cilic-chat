import React, { useState, useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { Patient } from '../../types/patient';
import {
  getPatientWallet,
  getStoredWalletTransactions,
  topUpPatientWallet,
  adjustPatientWallet,
  getPatientLoyaltyAccount,
  getStoredLoyaltyTransactions,
  adjustLoyaltyPoints,
} from '../../lib/financeAndInsuranceStorage';
import {
  X,
  Wallet,
  Award,
  PlusCircle,
  TrendingDown,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  User,
  History,
  ShieldAlert,
} from 'lucide-react';

interface PatientWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onSuccess?: () => void;
}

export const PatientWalletModal: React.FC<PatientWalletModalProps> = ({
  isOpen,
  onClose,
  patient,
  onSuccess,
}) => {
  const { language } = useLanguage();
  const { session } = useAuth();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'topup' | 'adjustment' | 'loyalty'>('topup');

  // Top-Up Form
  const [topUpAmount, setTopUpAmount] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Adjustment Form
  const [adjAmount, setAdjAmount] = useState<string>('');
  const [adjType, setAdjType] = useState<'refund' | 'adjustment'>('adjustment');
  const [adjNotes, setAdjNotes] = useState<string>('');

  // Loyalty Adjustment Form
  const [loyaltyPoints, setLoyaltyPoints] = useState<string>('');
  const [loyaltyNotes, setLoyaltyNotes] = useState<string>('');

  // Feedback State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const orgId = session?.organization?.id;
  const branchId = session?.profile?.branch_id;
  const staffId = session?.profile?.id || 'sys_staff';
  const staffName = session?.profile?.display_name || 'Staff Member';
  const userRole = session?.role?.key;

  const wallet = useMemo(() => {
    if (!patient || !orgId) return null;
    return getPatientWallet(patient.id, orgId);
  }, [patient?.id, orgId, refreshKey]);

  const walletTxs = useMemo(() => {
    if (!patient || !orgId) return [];
    return getStoredWalletTransactions(orgId, patient.id);
  }, [patient?.id, orgId, refreshKey]);

  const loyaltyAccount = useMemo(() => {
    if (!patient || !orgId) return null;
    return getPatientLoyaltyAccount(patient.id, orgId);
  }, [patient?.id, orgId, refreshKey]);

  const loyaltyTxs = useMemo(() => {
    if (!patient || !orgId) return [];
    return getStoredLoyaltyTransactions(orgId, patient.id);
  }, [patient?.id, orgId, refreshKey]);

  if (!isOpen || !patient) return null;

  const handleTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg(isAr ? 'يرجى إدخال مبلغ إيداع أكبر من صفر' : 'Please enter valid top-up amount');
      return;
    }

    const res = topUpPatientWallet({
      patientId: patient.id,
      organizationId: orgId!,
      branchId,
      amount: amt,
      reference: reference.trim(),
      notes: notes.trim(),
      createdBy: staffId,
      createdByName: staffName,
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Failed');
      return;
    }

    setSuccessMsg(isAr ? `تم إيداع مبلغ ${amt} ج.م في محفظة المريض بنجاح` : `Successfully topped up ${amt} EGP`);
    setTopUpAmount('');
    setReference('');
    setNotes('');
    setRefreshKey((k) => k + 1);
    if (onSuccess) onSuccess();
  };

  const handleAdjustWallet = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const amt = parseFloat(adjAmount);
    if (isNaN(amt) || amt === 0) {
      setErrorMsg(isAr ? 'يرجى إدخال قيمة التعديل' : 'Please enter adjustment amount');
      return;
    }

    if (!adjNotes.trim()) {
      setErrorMsg(isAr ? 'سبب التعديل إجباري لأغراض التدقيق المالي' : 'Audit reason is required');
      return;
    }

    const res = adjustPatientWallet({
      patientId: patient.id,
      organizationId: orgId!,
      branchId,
      amount: amt,
      type: adjType,
      notes: adjNotes,
      createdBy: staffId,
      createdByName: staffName,
      actorRole: userRole,
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Failed');
      return;
    }

    setSuccessMsg(isAr ? 'تم تطبيق التعديل على المحفظة بنجاح مع تسجيل سبب التدقيق' : 'Wallet adjustment applied successfully');
    setAdjAmount('');
    setAdjNotes('');
    setRefreshKey((k) => k + 1);
    if (onSuccess) onSuccess();
  };

  const handleAdjustLoyalty = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const pts = parseInt(loyaltyPoints, 10);
    if (isNaN(pts) || pts === 0) {
      setErrorMsg(isAr ? 'يرجى إدخال عدد النقاط' : 'Please enter valid points');
      return;
    }

    if (!loyaltyNotes.trim()) {
      setErrorMsg(isAr ? 'سبب تعديل النقاط إجباري' : 'Reason is required');
      return;
    }

    const res = adjustLoyaltyPoints({
      patientId: patient.id,
      organizationId: orgId!,
      branchId,
      points: pts,
      notes: loyaltyNotes,
      createdBy: staffId,
      actorRole: userRole,
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Failed');
      return;
    }

    setSuccessMsg(isAr ? 'تم تعديل نقاط الولاء للمريض بنجاح' : 'Loyalty points adjusted successfully');
    setLoyaltyPoints('');
    setLoyaltyNotes('');
    setRefreshKey((k) => k + 1);
    if (onSuccess) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600/30 text-teal-300 border border-teal-500/30 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {isAr ? 'إدارة محفظة المريض ونقاط الولاء' : 'Patient Wallet & Loyalty'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {patient.first_name} {patient.last_name} ({patient.patient_code})
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

        {/* Current Balances Header Bar */}
        <div className="bg-slate-50 p-4 px-6 border-b border-slate-200 flex justify-around text-center">
          <div>
            <span className="text-xs text-slate-500 block">{isAr ? 'رصيد المحفظة الحالي' : 'Wallet Balance'}</span>
            <span className="text-xl font-bold text-teal-700">{wallet?.balance || 0} ج.م</span>
          </div>

          <div className="w-px bg-slate-200 h-10" />

          <div>
            <span className="text-xs text-slate-500 block">{isAr ? 'نقاط الولاء المتاحة' : 'Loyalty Points'}</span>
            <span className="text-xl font-bold text-purple-700">{loyaltyAccount?.current_points || 0} {isAr ? 'نقطة' : 'pts'}</span>
          </div>
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

        {/* Mode Tabs */}
        <div className="p-6 space-y-6">
          <div className="flex border-b border-slate-200 gap-4">
            <button
              onClick={() => setActiveTab('topup')}
              className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'topup' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isAr ? 'إيداع رصيد بالمحفظة' : 'Top-Up Wallet'}</span>
            </button>

            <button
              onClick={() => setActiveTab('adjustment')}
              className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'adjustment' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isAr ? 'تعديل/استرداد إداري' : 'Wallet Adjustment'}</span>
            </button>

            <button
              onClick={() => setActiveTab('loyalty')}
              className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'loyalty' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>{isAr ? 'تعديل نقاط الولاء' : 'Adjust Loyalty'}</span>
            </button>
          </div>

          {/* TAB 1: TOP-UP WALLET */}
          {activeTab === 'topup' && (
            <form onSubmit={handleTopUp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'مبلغ الإيداع المالي (ج.م) *' : 'Top-Up Amount (EGP) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'رقم مرجع السداد / الإيصال' : 'Payment Reference / Receipt No'}
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. REC-99201"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'ملاحظات الإيداع' : 'Notes'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isAr ? 'ملاحظات اختيارية...' : 'Optional notes'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isAr ? 'إيداع المبلغ بالمحفظة' : 'Process Wallet Top-Up'}</span>
              </button>
            </form>
          )}

          {/* TAB 2: ADJUSTMENT */}
          {activeTab === 'adjustment' && (
            <form onSubmit={handleAdjustWallet} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{isAr ? 'نوع التعديل' : 'Type'}</label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
                  >
                    <option value="adjustment">{isAr ? 'تعديل رصيد' : 'Adjustment'}</option>
                    <option value="refund">{isAr ? 'استرداد نقدي' : 'Refund'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{isAr ? 'المبلغ (ج.م) *' : 'Amount *'}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    placeholder="e.g. 100 or -100"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'سبب التعديل التدقيقي (إجباري) *' : 'Audit Reason (Required) *'}
                </label>
                <textarea
                  required
                  rows={2}
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  placeholder={isAr ? 'اكتب سبب التعديل بالتفصيل لأغراض التدقيق المالي...' : 'Enter explicit audit reason...'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>{isAr ? 'تسجيل التعديل بحساب التدقيق' : 'Apply Audited Adjustment'}</span>
              </button>
            </form>
          )}

          {/* TAB 3: LOYALTY */}
          {activeTab === 'loyalty' && (
            <form onSubmit={handleAdjustLoyalty} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'عدد النقاط (موجب لإضافة، إشارة سالبة للخصم) *' : 'Points (+Add / -Deduct) *'}
                </label>
                <input
                  type="number"
                  required
                  value={loyaltyPoints}
                  onChange={(e) => setLoyaltyPoints(e.target.value)}
                  placeholder="e.g. 50 or -50"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'سبب تعديل النقاط (إجباري) *' : 'Adjustment Reason (Required) *'}
                </label>
                <input
                  type="text"
                  required
                  value={loyaltyNotes}
                  onChange={(e) => setLoyaltyNotes(e.target.value)}
                  placeholder={isAr ? 'سبب التعديل...' : 'Reason for adjusting loyalty points'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Award className="w-4 h-4" />
                <span>{isAr ? 'تحديث نقاط الولاء' : 'Save Loyalty Points Adjustment'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
