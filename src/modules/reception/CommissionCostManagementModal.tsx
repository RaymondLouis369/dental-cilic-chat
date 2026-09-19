import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Percent,
  FlaskConical,
  Package,
  ShieldAlert,
  Trash2,
  Check,
  Building2,
  UserCheck,
  Calculator,
  RefreshCw,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import {
  DoctorCommissionRule,
  LabMaterialCostRecord,
  CommissionBaseType,
  CostType,
  ImplantComponentType,
  ImplantComponentItem,
  ImplantCaseRecord,
} from '../../types/receptionAndBilling';
import {
  getStoredCommissionRules,
  upsertCommissionRule,
  deleteCommissionRule,
  getStoredLabMaterialCosts,
  recordLabMaterialCost,
  getStoredServices,
  getStoredImplantCases,
  upsertImplantCase,
  calculateImplantFinancialBreakdown,
  calculateComponentConsumedCost,
} from '../../lib/receptionAndBillingStorage';
import { getStoredStaffUsers } from '../../lib/storage';

export interface CommissionCostManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export const CommissionCostManagementModal: React.FC<CommissionCostManagementModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { session } = useAuth();
  const currentRole = session?.role?.key || session?.profile?.role_key || 'receptionist';

  const [activeTab, setActiveTab] = useState<'commission_rules' | 'lab_material_costs' | 'implant_costs'>('commission_rules');
  const [refreshKey, setRefreshKey] = useState(0);

  // Authorization check
  const isAuthorized =
    currentRole === 'center_manager' ||
    currentRole === 'branch_manager' ||
    session?.profile?.id === 'usr_center_mgr' ||
    session?.profile?.id === 'usr_branch_mgr';

  // Rule Form state
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleDoctorId, setRuleDoctorId] = useState<string>('all');
  const [ruleServiceId, setRuleServiceId] = useState<string>('all');
  const [rulePct, setRulePct] = useState<number>(20);
  const [ruleBase, setRuleBase] = useState<CommissionBaseType>('gross');
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [ruleSuccess, setRuleSuccess] = useState<string | null>(null);

  // Cost Entry Form state
  const [costType, setCostType] = useState<CostType>('lab');
  const [costVendor, setCostVendor] = useState<string>('');
  const [costItemAr, setCostItemAr] = useState<string>('');
  const [costItemEn, setCostItemEn] = useState<string>('');
  const [costQty, setCostQty] = useState<number>(1);
  const [costUnitCost, setCostUnitCost] = useState<number>(100);
  const [costSourceRef, setCostSourceRef] = useState<string>('');
  const [costError, setCostError] = useState<string | null>(null);
  const [costSuccess, setCostSuccess] = useState<string | null>(null);

  // Implant Component Form state (Phase 7.4)
  const [impCompType, setImpCompType] = useState<ImplantComponentType>('implant');
  const [impVendor, setImpVendor] = useState<string>('Delta Dental Supplies');
  const [impItemName, setImpItemName] = useState<string>('');
  const [impPlannedQty, setImpPlannedQty] = useState<number>(1);
  const [impActualQty, setImpActualQty] = useState<number>(1);
  const [impUnitCost, setImpUnitCost] = useState<number>(1200);
  const [impActualCost, setImpActualCost] = useState<number>(1200);
  const [impDate, setImpDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [impRef, setImpRef] = useState<string>('');
  const [impNotes, setImpNotes] = useState<string>('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('case_imp_001');
  const [impError, setImpError] = useState<string | null>(null);
  const [impSuccess, setImpSuccess] = useState<string | null>(null);

  // Data fetching
  const commissionRules = useMemo(() => {
    return getStoredCommissionRules();
  }, [refreshKey]);

  const labMaterialCosts = useMemo(() => {
    return getStoredLabMaterialCosts();
  }, [refreshKey]);

  const implantCases = useMemo(() => {
    return getStoredImplantCases();
  }, [refreshKey]);

  const staffDoctors = useMemo(() => {
    return getStoredStaffUsers().filter(
      (s) => s.role_key === 'doctor' || s.display_name?.includes('د.') || s.display_name?.includes('Dr.')
    );
  }, []);

  const services = useMemo(() => {
    return getStoredServices();
  }, []);

  if (!isOpen) return null;

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    if (onUpdated) onUpdated();
  };

  const resetRuleForm = () => {
    setEditingRuleId(null);
    setRuleDoctorId('all');
    setRuleServiceId('all');
    setRulePct(20);
    setRuleBase('gross');
    setRuleError(null);
    setRuleSuccess(null);
  };

  const handleEditRule = (rule: DoctorCommissionRule) => {
    setEditingRuleId(rule.id);
    setRuleDoctorId(rule.doctor_id || 'all');
    setRuleServiceId(rule.service_id || 'all');
    setRulePct(rule.commission_percentage);
    setRuleBase(rule.commission_base);
    setRuleError(null);
    setRuleSuccess(null);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    setRuleError(null);
    setRuleSuccess(null);

    const res = upsertCommissionRule(
      {
        id: editingRuleId || undefined,
        doctor_id: ruleDoctorId,
        service_id: ruleServiceId,
        commission_percentage: rulePct,
        commission_base: ruleBase,
        active: true,
      },
      session?.profile?.id,
      currentRole
    );

    if (!res.success) {
      setRuleError(res.error || 'حدث خطأ أثناء حفظ قاعدة العمولة');
      return;
    }

    setRuleSuccess(isAr ? 'تم حفظ قاعدة العمولة بنجاح' : 'Commission rule saved successfully');
    resetRuleForm();
    handleRefresh();
  };

  const handleDeleteRule = (ruleId: string) => {
    if (!confirm(isAr ? 'هل أنت تأكد من حذف قاعدة العمولة هذه؟' : 'Are you sure you want to delete this rule?')) return;
    const ok = deleteCommissionRule(ruleId, currentRole);
    if (ok) {
      handleRefresh();
    } else {
      setRuleError(isAr ? 'غير مصرح لك بالحذف' : 'Not authorized to delete');
    }
  };

  const handleSaveCost = (e: React.FormEvent) => {
    e.preventDefault();
    setCostError(null);
    setCostSuccess(null);

    if (!costVendor.trim()) {
      setCostError(isAr ? 'يرجى إدخال اسم المورد أو المورد/المعمل' : 'Please enter vendor or supplier name');
      return;
    }

    if (!costItemAr.trim() && !costItemEn.trim()) {
      setCostError(isAr ? 'يرجى إدخال مسمى البند أو الخامة' : 'Please enter item name');
      return;
    }

    recordLabMaterialCost(
      {
        organization_id: '11111111-1111-1111-1111-111111111111',
        type: costType,
        supplier_vendor: costVendor.trim(),
        item_name_ar: costItemAr.trim() || costItemEn.trim(),
        item_name_en: costItemEn.trim() || costItemAr.trim(),
        quantity: costQty,
        unit_cost: costUnitCost,
        actual_cost: costQty * costUnitCost,
        source_reference: costSourceRef.trim() || undefined,
        created_by_name: session?.profile?.display_name || session?.profile?.email,
      },
      session?.profile?.id
    );

    setCostSuccess(isAr ? 'تم تسجيل التكلفة بنجاح' : 'Cost recorded successfully');
    setCostVendor('');
    setCostItemAr('');
    setCostItemEn('');
    setCostQty(1);
    setCostUnitCost(100);
    setCostSourceRef('');
    handleRefresh();
  };

  const fmt = (amt: number) => {
    return new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto dir-rtl:text-right dir-ltr:text-left">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-300">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {isAr ? 'إدارة عمولات الأطباء وتكاليف المعامل والمستلزمات' : 'Doctor Commissions & Cost Management'}
              </h3>
              <p className="text-xs text-slate-300">
                {isAr
                  ? 'ضبط قواعد نسبة عمولة الطبيب وتحديد أساس الحساب والتكاليف المباشرة'
                  : 'Configure commission rules, base amounts, and lab/material costs'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Warning if Unauthorized */}
        {!isAuthorized ? (
          <div className="p-8 text-center bg-amber-50 text-amber-900">
            <ShieldAlert className="w-12 h-12 text-amber-600 mx-auto mb-3" />
            <h4 className="text-lg font-bold mb-1">
              {isAr ? 'صلاحيات غير كافية' : 'Insufficient Authorization'}
            </h4>
            <p className="text-sm text-amber-700 max-w-md mx-auto mb-4">
              {isAr
                ? 'تحديد وتعديل قواعد العمولات مقتصر على مديري المركز والفرع والإدارة المالية لحماية الأرباح.'
                : 'Configuring commission rules is restricted to center and branch managers.'}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
              <button
                onClick={() => setActiveTab('commission_rules')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold border-b-2 transition-colors ${
                  activeTab === 'commission_rules'
                    ? 'border-teal-600 text-teal-700 bg-white shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Percent className="w-4 h-4" />
                <span>{isAr ? 'قواعد عمولات الأطباء' : 'Doctor Commission Rules'}</span>
                <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                  {commissionRules.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('lab_material_costs')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold border-b-2 transition-colors ${
                  activeTab === 'lab_material_costs'
                    ? 'border-teal-600 text-teal-700 bg-white shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                <span>{isAr ? 'سجل تكاليف المعامل والمستلزمات' : 'Lab & Material Costs Log'}</span>
                <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                  {labMaterialCosts.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('implant_costs')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold border-b-2 transition-colors ${
                  activeTab === 'implant_costs'
                    ? 'border-teal-600 text-teal-700 bg-white shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="w-4 h-4 text-purple-600" />
                <span>{isAr ? 'تخصيص تكاليف زراعة الأسنان (Phase 7.4)' : 'Implant Cost Allocation'}</span>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-mono font-bold">
                  {implantCases.length}
                </span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {activeTab === 'commission_rules' && (
                <div className="space-y-6">
                  {/* Add / Edit Form */}
                  <form onSubmit={handleSaveRule} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Plus className="w-4 h-4 text-teal-600" />
                        <span>
                          {editingRuleId
                            ? isAr
                              ? 'تعديل قاعدة عمولة'
                              : 'Edit Commission Rule'
                            : isAr
                            ? 'إضافة قاعدة عمولة جديدة'
                            : 'Add New Commission Rule'}
                        </span>
                      </h4>

                      {editingRuleId && (
                        <button
                          type="button"
                          onClick={resetRuleForm}
                          className="text-xs text-slate-500 hover:text-slate-800 underline"
                        >
                          {isAr ? 'إلغاء التعديل' : 'Cancel Editing'}
                        </button>
                      )}
                    </div>

                    {ruleError && (
                      <div className="p-3 mb-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                        {ruleError}
                      </div>
                    )}
                    {ruleSuccess && (
                      <div className="p-3 mb-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-200">
                        {ruleSuccess}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Doctor Select */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {isAr ? 'الطبيب المعالج' : 'Doctor'}
                        </label>
                        <select
                          value={ruleDoctorId}
                          onChange={(e) => setRuleDoctorId(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="all">{isAr ? 'جميع الأطباء (قاعدة عامة)' : 'All Doctors (Global Default)'}</option>
                          {staffDoctors.map((doc) => (
                            <option key={doc.id} value={doc.id}>
                              {doc.display_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Service Select */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {isAr ? 'الخدمة العلاجية' : 'Dental Service'}
                        </label>
                        <select
                          value={ruleServiceId}
                          onChange={(e) => setRuleServiceId(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="all">{isAr ? 'جميع الخدمات العلاجية' : 'All Dental Services'}</option>
                          {services.map((srv) => (
                            <option key={srv.id} value={srv.id}>
                              {isAr ? srv.name_ar : srv.name_en} ({srv.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Commission Percentage */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {isAr ? 'نسبة العمولة (%)' : 'Commission Percentage (%)'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={rulePct}
                          onChange={(e) => setRulePct(parseFloat(e.target.value) || 0)}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-mono font-bold focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      {/* Explicit Commission Base */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {isAr ? 'أساس احتساب العمولة (Explicit Base)' : 'Explicit Commission Base'}
                        </label>
                        <div className="flex gap-2">
                          <label
                            className={`flex-1 flex items-center justify-center p-2 rounded-lg border cursor-pointer text-xs font-bold transition-all ${
                              ruleBase === 'gross'
                                ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="radio"
                              name="commBase"
                              value="gross"
                              checked={ruleBase === 'gross'}
                              onChange={() => setRuleBase('gross')}
                              className="sr-only"
                            />
                            <span>{isAr ? 'إجمالي سعر الخدمة (Gross)' : 'Gross Service Amount'}</span>
                          </label>

                          <label
                            className={`flex-1 flex items-center justify-center p-2 rounded-lg border cursor-pointer text-xs font-bold transition-all ${
                              ruleBase === 'net_after_costs'
                                ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="radio"
                              name="commBase"
                              value="net_after_costs"
                              checked={ruleBase === 'net_after_costs'}
                              onChange={() => setRuleBase('net_after_costs')}
                              className="sr-only"
                            />
                            <span>{isAr ? 'الصافي بعد التكاليف (Net)' : 'Net After Costs'}</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isAr ? 'حفظ القاعدة' : 'Save Rule'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Rules List Table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-right dir-rtl:text-right dir-ltr:text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">{isAr ? 'الطبيب' : 'Doctor'}</th>
                          <th className="p-3">{isAr ? 'الخدمة' : 'Service'}</th>
                          <th className="p-3">{isAr ? 'النسبة' : 'Percentage'}</th>
                          <th className="p-3">{isAr ? 'أساس الحساب' : 'Commission Base'}</th>
                          <th className="p-3">{isAr ? 'أنشئ بواسطة' : 'Created By'}</th>
                          <th className="p-3 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {commissionRules.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="p-3 font-semibold text-slate-900">
                              {r.doctor_name || (r.doctor_id === 'all' ? (isAr ? 'جميع الأطباء' : 'All Doctors') : r.doctor_id)}
                            </td>
                            <td className="p-3 text-slate-700">
                              {isAr ? r.service_name_ar : r.service_name_en}
                            </td>
                            <td className="p-3 font-mono font-bold text-teal-700">{r.commission_percentage}%</td>
                            <td className="p-3">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  r.commission_base === 'net_after_costs'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {r.commission_base === 'net_after_costs'
                                  ? isAr
                                    ? 'الصافي بعد التكاليف'
                                    : 'Net After Costs'
                                  : isAr
                                  ? 'إجمالي الخدمة Gross'
                                  : 'Gross Amount'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500 text-[11px]">
                              {r.created_by || 'نظام المركز'}
                            </td>
                            <td className="p-3 text-center space-x-2 space-x-reverse">
                              <button
                                onClick={() => handleEditRule(r)}
                                className="text-teal-600 hover:text-teal-800 font-semibold text-xs"
                              >
                                {isAr ? 'تعديل' : 'Edit'}
                              </button>
                              <button
                                onClick={() => handleDeleteRule(r.id)}
                                className="text-red-500 hover:text-red-700 font-semibold text-xs mr-2"
                              >
                                {isAr ? 'حذف' : 'Delete'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'lab_material_costs' && (
                <div className="space-y-6">
                  {/* Record Cost Entry Form */}
                  <form onSubmit={handleSaveCost} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
                      <Plus className="w-4 h-4 text-teal-600" />
                      <span>
                        {isAr
                          ? 'تسجيل تكلفة معمل تركيبات أو خامة طقم علاج'
                          : 'Record Lab or Material Cost Entry'}
                      </span>
                    </h4>

                    {costError && (
                      <div className="p-3 mb-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                        {costError}
                      </div>
                    )}
                    {costSuccess && (
                      <div className="p-3 mb-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-200">
                        {costSuccess}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Type */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {isAr ? 'نوع التكلفة' : 'Cost Type'}
                        </label>
                        <select
                          value={costType}
                          onChange={(e) => setCostType(e.target.value as CostType)}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="lab">{isAr ? 'معمل تركيبات (Lab)' : 'Dental Lab'}</option>
                          <option value="material">{isAr ? 'خامات ومستلزمات (Material)' : 'Clinical Material'}</option>
                        </select>
                      </div>

                      {/* Supplier/Vendor */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {isAr ? 'اسم المورد / المعمل' : 'Supplier / Vendor'}
                        </label>
                        <input
                          type="text"
                          placeholder={isAr ? 'مثال: معمل النيل للتركيبات' : 'e.g. Nile Dental Lab'}
                          value={costVendor}
                          onChange={(e) => setCostVendor(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>

                      {/* Item Name */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {isAr ? 'مسمى البند / الخامة' : 'Item Name'}
                        </label>
                        <input
                          type="text"
                          placeholder={isAr ? 'مثال: تاج زركونيا عالي النقاء' : 'e.g. Zirconia Crown'}
                          value={costItemAr}
                          onChange={(e) => setCostItemAr(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {isAr ? 'الكمية' : 'Quantity'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={costQty}
                          onChange={(e) => setCostQty(parseInt(e.target.value) || 1)}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                        />
                      </div>

                      {/* Unit Cost */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {isAr ? 'تكلفة الوحدة (ج.م)' : 'Unit Cost (EGP)'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={costUnitCost}
                          onChange={(e) => setCostUnitCost(parseFloat(e.target.value) || 0)}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                        />
                      </div>

                      {/* Source Reference */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {isAr ? 'الرقم المرجعي / الفاتورة / أمر المعمل' : 'Reference Code / Lab Order'}
                        </label>
                        <input
                          type="text"
                          placeholder={isAr ? 'مثال: LAB-ORD-2026-001' : 'e.g. LAB-ORD-2026-001'}
                          value={costSourceRef}
                          onChange={(e) => setCostSourceRef(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-xs text-slate-600">
                        <span>{isAr ? 'إجمالي التكلفة التقديرية: ' : 'Total Actual Cost: '}</span>
                        <span className="font-mono font-bold text-slate-900">{fmt(costQty * costUnitCost)} ج.م</span>
                      </div>

                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isAr ? 'تسجيل التكلفة' : 'Record Cost'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Cost Records Table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-right dir-rtl:text-right dir-ltr:text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">{isAr ? 'النوع' : 'Type'}</th>
                          <th className="p-3">{isAr ? 'المورد / المعمل' : 'Supplier / Vendor'}</th>
                          <th className="p-3">{isAr ? 'اسم البند / الخامة' : 'Item Name'}</th>
                          <th className="p-3">{isAr ? 'الكمية' : 'Qty'}</th>
                          <th className="p-3">{isAr ? 'التكلفة الإجمالية' : 'Total Cost'}</th>
                          <th className="p-3">{isAr ? 'مرجع المورد' : 'Reference'}</th>
                          <th className="p-3">{isAr ? 'التاريخ' : 'Date'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {labMaterialCosts.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="p-3 font-semibold">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${
                                  c.type === 'lab'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-orange-100 text-orange-800'
                                }`}
                              >
                                {c.type === 'lab' ? <FlaskConical className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                                {c.type === 'lab'
                                  ? isAr
                                    ? 'معمل تركيبات'
                                    : 'Lab'
                                  : isAr
                                  ? 'مستلزمات خامات'
                                  : 'Material'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-900 font-medium">{c.supplier_vendor}</td>
                            <td className="p-3 text-slate-800">{isAr ? c.item_name_ar : c.item_name_en}</td>
                            <td className="p-3 font-mono">{c.quantity}</td>
                            <td className="p-3 font-mono font-bold text-red-600">{fmt(c.actual_cost)} ج.م</td>
                            <td className="p-3 font-mono text-slate-500 text-[11px]">{c.source_reference || '-'}</td>
                            <td className="p-3 text-slate-500 text-[11px]">{new Date(c.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Phase 7.4 Implant Cost Allocation Tab */}
              {activeTab === 'implant_costs' && (() => {
                const currentCase = implantCases.find((c) => c.id === selectedCaseId) || implantCases[0];

                const financialBreakdown = currentCase
                  ? calculateImplantFinancialBreakdown({
                      grossServiceAmount: 12000, // Patient Gross Price for Implant
                      insuranceAmount: 0,
                      patientAmount: 12000,
                      components: currentCase.components,
                      labCost: currentCase.lab_cost || 1200,
                      commissionPercentage: 20,
                      commissionBase: 'net_after_costs',
                      implantCaseId: currentCase.id,
                    })
                  : null;

                const handleSaveImplantComponent = (e: React.FormEvent) => {
                  e.preventDefault();
                  setImpError(null);
                  setImpSuccess(null);

                  if (!impItemName.trim()) {
                    setImpError(isAr ? 'يرجى إدخال اسم المكون' : 'Please enter component name');
                    return;
                  }

                  if (!currentCase) {
                    setImpError(isAr ? 'لم يتم العثور على حالة الزراعة' : 'Implant case not found');
                    return;
                  }

                  const newComp: ImplantComponentItem = {
                    id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    implant_case_id: currentCase.id,
                    component_type: impCompType,
                    supplier_vendor: impVendor.trim() || 'Delta Dental Supplies',
                    item_name: impItemName.trim(),
                    item_name_ar: impItemName.trim(),
                    item_name_en: impItemName.trim(),
                    planned_quantity: impPlannedQty,
                    actual_quantity: impActualQty,
                    unit_cost: impUnitCost,
                    actual_cost: impActualCost,
                    date: impDate,
                    reference: impRef.trim() || undefined,
                    notes: impNotes.trim() || undefined,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  };

                  const updatedList = [...currentCase.components, newComp];
                  const res = upsertImplantCase(
                    {
                      ...currentCase,
                      components: updatedList,
                    },
                    session?.profile?.id,
                    currentRole
                  );

                  if (res.success) {
                    setImpSuccess(isAr ? 'تم إضافة مكون الزراعة بنجاح' : 'Implant component added successfully');
                    setImpItemName('');
                    setImpRef('');
                    setImpNotes('');
                    handleRefresh();
                  } else {
                    setImpError(res.error || (isAr ? 'فشل الحفظ' : 'Save failed'));
                  }
                };

                const componentLabels: Record<ImplantComponentType, { ar: string; en: string }> = {
                  implant: { ar: 'زرعة أسنان (Implant)', en: 'Dental Implant' },
                  bone_graft: { ar: 'طعم عظمي (Bone Graft)', en: 'Bone Graft' },
                  membrane: { ar: 'غشاء كولاجين (Membrane)', en: 'Membrane' },
                  healing_abutment: { ar: 'دعامة التئام لثة (Healing Abutment)', en: 'Healing Abutment' },
                  cover_screw: { ar: 'مسمار غطاء الزرعة (Cover Screw)', en: 'Cover Screw' },
                  healing_cap: { ar: 'غطاء التئام مؤقت (Healing Cap)', en: 'Healing Cap' },
                  abutment: { ar: 'دعامة تعويضية نهائية (Abutment)', en: 'Prosthetic Abutment' },
                  scan_body: { ar: 'جسم المسح الرقمي (Scan Body)', en: 'Scan Body' },
                  prosthetic_screw: { ar: 'مسمار التركيبة النهائي (Prosthetic Screw)', en: 'Prosthetic Screw' },
                  other_accessories: { ar: 'مستلزمات وملحقات أخرى (Other Accessories)', en: 'Other Accessories' },
                };

                return (
                  <div className="space-y-6">
                    {/* Case Selector Header */}
                    <div className="p-4 bg-purple-900 text-white rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-purple-800 rounded-lg text-purple-200">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">
                            {isAr ? 'حالات تخصيص تكاليف زراعة الأسنان (Phase 7.4)' : 'Implant Cost Allocation Case'}
                          </h4>
                          <p className="text-xs text-purple-200">
                            {isAr
                              ? 'تتبع 10 مكونات رئيسية للزراعة وتخصيص التكاليف بين المخطط والفعلي مع عمولة الطبيب'
                              : 'Track 10 core implant components & allocate costs (planned vs actual)'}
                          </p>
                        </div>
                      </div>

                      {/* Select Case */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-purple-200 font-medium">
                          {isAr ? 'اختيار حالة الزراعة:' : 'Select Case:'}
                        </span>
                        <select
                          value={selectedCaseId}
                          onChange={(e) => setSelectedCaseId(e.target.value)}
                          className="text-xs p-2 rounded-lg bg-white text-slate-900 font-bold border border-purple-300 focus:ring-2 focus:ring-purple-400"
                        >
                          {implantCases.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.id} - {c.implant_brand || 'Implant Case'} ({isAr ? `سن ${c.tooth_number}` : `Tooth ${c.tooth_number}`})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Financial Summary Cards */}
                    {financialBreakdown && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-purple-900">
                          <span className="block text-[11px] text-purple-700 font-medium mb-1">
                            {isAr ? 'إجمالي تكلفة مستلزمات الزراعة' : 'Total Implant Material Cost'}
                          </span>
                          <span className="text-base font-black font-mono text-purple-950">
                            {fmt(financialBreakdown.total_implant_material_cost)} ج.م
                          </span>
                        </div>

                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-amber-900">
                          <span className="block text-[11px] text-amber-700 font-medium mb-1">
                            {isAr ? 'تكلفة معمل التركيبات' : 'Lab Cost'}
                          </span>
                          <span className="text-base font-black font-mono text-amber-950">
                            {fmt(financialBreakdown.lab_cost)} ج.م
                          </span>
                        </div>

                        <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-900">
                          <span className="block text-[11px] text-indigo-700 font-medium mb-1">
                            {isAr ? 'عمولة الطبيب (20% الصافي)' : 'Doctor Commission (Net)'}
                          </span>
                          <span className="text-base font-black font-mono text-indigo-950">
                            {fmt(financialBreakdown.doctor_commission)} ج.م
                          </span>
                        </div>

                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-white">
                          <span className="block text-[11px] text-emerald-300 font-medium mb-1">
                            {isAr ? 'صافي أرباح العيادة' : 'Clinic Net Amount'}
                          </span>
                          <span className="text-base font-black font-mono text-emerald-400">
                            {fmt(financialBreakdown.clinic_net_amount)} ج.م
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Component Addition Form */}
                    <form onSubmit={handleSaveImplantComponent} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
                        <Plus className="w-4 h-4 text-purple-600" />
                        <span>{isAr ? 'إضافة مكون زراعة جديد للحالة' : 'Add Implant Case Component'}</span>
                      </h4>

                      {impError && (
                        <div className="p-3 mb-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                          {impError}
                        </div>
                      )}
                      {impSuccess && (
                        <div className="p-3 mb-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-200">
                          {impSuccess}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Component Type */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {isAr ? 'نوع المكون (Component Type)' : 'Component Type'}
                          </label>
                          <select
                            value={impCompType}
                            onChange={(e) => setImpCompType(e.target.value as ImplantComponentType)}
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-medium"
                          >
                            {(Object.keys(componentLabels) as ImplantComponentType[]).map((typeKey) => (
                              <option key={typeKey} value={typeKey}>
                                {isAr ? componentLabels[typeKey].ar : componentLabels[typeKey].en}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Supplier / Vendor */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {isAr ? 'المورد / الشركات (Supplier / Vendor)' : 'Supplier / Vendor'}
                          </label>
                          <input
                            type="text"
                            placeholder={isAr ? 'مثال: Delta Dental Supplies' : 'e.g. Delta Dental Supplies'}
                            value={impVendor}
                            onChange={(e) => setImpVendor(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                          />
                        </div>

                        {/* Item Name */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {isAr ? 'اسم البند / الصنف' : 'Item Name'}
                          </label>
                          <input
                            type="text"
                            placeholder={isAr ? 'مثال: Straumann Healing Abutment 4mm' : 'e.g. Straumann Healing Abutment'}
                            value={impItemName}
                            onChange={(e) => setImpItemName(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                          />
                        </div>

                        {/* Planned Qty */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {isAr ? 'الكمية المخططة (Planned Qty)' : 'Planned Qty'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={impPlannedQty}
                            onChange={(e) => setImpPlannedQty(parseInt(e.target.value) || 1)}
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                          />
                        </div>

                        {/* Actual Qty */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {isAr ? 'الكمية الفعلية المستهلكة (Actual Qty)' : 'Actual Qty'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={impActualQty}
                            onChange={(e) => setImpActualQty(parseInt(e.target.value) || 0)}
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-mono font-bold text-purple-700"
                          />
                        </div>

                        {/* Unit Cost */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {isAr ? 'تكلفة الوحدة (Unit Cost)' : 'Unit Cost (EGP)'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={impUnitCost}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setImpUnitCost(val);
                              setImpActualCost(val * impActualQty);
                            }}
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                          />
                        </div>

                        {/* Actual Cost */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {isAr ? 'التكلفة الفعلية (Actual Cost)' : 'Actual Cost (EGP)'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={impActualCost}
                            onChange={(e) => setImpActualCost(parseFloat(e.target.value) || 0)}
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-mono font-bold text-purple-900"
                          />
                        </div>

                        {/* Date */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {isAr ? 'التاريخ (Date)' : 'Date'}
                          </label>
                          <input
                            type="date"
                            value={impDate}
                            onChange={(e) => setImpDate(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-mono"
                          />
                        </div>

                        {/* Reference / Batch / PO */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {isAr ? 'المرجع / الرقم التسلسلي (Ref/Batch/PO)' : 'Reference / Batch / PO'}
                          </label>
                          <input
                            type="text"
                            placeholder={isAr ? 'مثال: LOT-STR-991' : 'e.g. LOT-STR-991'}
                            value={impRef}
                            onChange={(e) => setImpRef(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs"
                        >
                          <Check className="w-4 h-4" />
                          <span>{isAr ? 'إضافة المكون إلى الحالة' : 'Add Component to Case'}</span>
                        </button>
                      </div>
                    </form>

                    {/* Components Table */}
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-xs text-right dir-rtl:text-right dir-ltr:text-left">
                        <thead className="bg-purple-50 text-purple-950 font-bold border-b border-purple-200">
                          <tr>
                            <th className="p-3">{isAr ? 'نوع المكون' : 'Component Type'}</th>
                            <th className="p-3">{isAr ? 'المورد / الشركة' : 'Supplier/Vendor'}</th>
                            <th className="p-3">{isAr ? 'اسم البند' : 'Item Name'}</th>
                            <th className="p-3 text-center">{isAr ? 'مخطط / فعلي' : 'Planned / Actual'}</th>
                            <th className="p-3">{isAr ? 'تكلفة الوحدة' : 'Unit Cost'}</th>
                            <th className="p-3">{isAr ? 'التكلفة الفعليه' : 'Consumed Cost'}</th>
                            <th className="p-3">{isAr ? 'المرجع' : 'Reference'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {currentCase?.components.map((comp) => {
                            const consumedCost = calculateComponentConsumedCost(comp);
                            return (
                              <tr key={comp.id} className="hover:bg-slate-50">
                                <td className="p-3 font-bold text-purple-900">
                                  {isAr ? componentLabels[comp.component_type]?.ar : componentLabels[comp.component_type]?.en}
                                </td>
                                <td className="p-3 text-slate-800 font-medium">{comp.supplier_vendor}</td>
                                <td className="p-3 text-slate-900 font-semibold">{comp.item_name}</td>
                                <td className="p-3 text-center font-mono font-bold">
                                  <span className="text-slate-500">{comp.planned_quantity}</span> /{' '}
                                  <span className="text-purple-700">{comp.actual_quantity}</span>
                                </td>
                                <td className="p-3 font-mono text-slate-700">{fmt(comp.unit_cost)} ج.م</td>
                                <td className="p-3 font-mono font-black text-purple-900">{fmt(consumedCost)} ج.م</td>
                                <td className="p-3 font-mono text-slate-500 text-[11px]">{comp.reference || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          </>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommissionCostManagementModal;
