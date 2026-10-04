import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Download,
  Building2,
  Calendar,
  Filter,
  DollarSign,
  ShieldCheck,
  Percent,
  UserCheck,
  FlaskConical,
  PackageCheck,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Briefcase,
  Users,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import {
  calculateAdvancedBIMetrics,
  generateBIMetricsCsvExport,
  BIFilterParams,
} from '../../lib/biAnalyticsStorage';
import { getStoredBranches, getStoredStaffUsers } from '../../lib/storage';
import { ManagerAIAssistantModal } from '../ai/ManagerAIAssistantModal';
import { Bot } from 'lucide-react';

export const AdvancedManagementBI: React.FC = () => {
  const { language } = useLanguage();
  const { session, isOrgWideManager } = useAuth();
  const isAr = language === 'ar';

  const userRole = session?.role?.key || session?.profile?.role_key || 'receptionist';
  const isManager = ['center_manager', 'branch_manager'].includes(userRole) || isOrgWideManager;

  const orgId = session?.organization?.id || '11111111-1111-1111-1111-111111111111';

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>('all');

  const [csvSuccessMsg, setCsvSuccessMsg] = useState<string | null>(null);
  const [isManagerAiOpen, setIsManagerAiOpen] = useState(false);

  const branches = useMemo(() => getStoredBranches(), []);
  const doctors = useMemo(() => {
    return getStoredStaffUsers(orgId).filter(
      (u) => u.role_key === 'doctor' || u.display_name?.includes('د.') || u.display_name?.toLowerCase().includes('dr')
    );
  }, [orgId]);

  const filterParams: BIFilterParams = useMemo(
    () => ({
      organizationId: orgId,
      branchId: selectedBranchId,
      period: selectedPeriod,
      doctorId: selectedDoctorId,
      paymentType: selectedPaymentType,
    }),
    [orgId, selectedBranchId, selectedPeriod, selectedDoctorId, selectedPaymentType]
  );

  const metrics = useMemo(() => calculateAdvancedBIMetrics(filterParams), [filterParams]);

  const handleExportCsv = () => {
    const csvContent = generateBIMetricsCsvExport(metrics);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BI_Executive_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCsvSuccessMsg(isAr ? 'تم تصدير التقرير التنفيذي بنجاح' : 'BI Report exported successfully');
    setTimeout(() => setCsvSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isAr ? 'مؤشرات الأداء والتحليلات الإدارية المتقدمة (Management BI)' : 'Advanced Management BI & Executive Analytics'}
            </h2>
            <p className="text-xs text-slate-500">
              {isAr ? 'تحليل الإيرادات، كفاءة التشغيل، موافقات التأمين، والمخزون المالي' : 'Real-time revenue, operational capacity, insurance approvals & inventory BI'}
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-700"
          >
            <option value="all">{isAr ? 'جميع الفروع' : 'All Branches'}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-700"
          >
            <option value="all">{isAr ? 'كل الفترات' : 'All Periods'}</option>
            <option value="today">{isAr ? 'اليوم' : 'Today'}</option>
            <option value="this_week">{isAr ? 'هذا الأسبوع' : 'This Week'}</option>
            <option value="this_month">{isAr ? 'هذا الشهر' : 'This Month'}</option>
          </select>

          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-700"
          >
            <option value="all">{isAr ? 'جميع الأطباء' : 'All Doctors'}</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.display_name}
              </option>
            ))}
          </select>

          {isManager && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsManagerAiOpen(true)}
                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors"
              >
                <Bot className="w-4 h-4 text-indigo-200" />
                {isAr ? 'المساعد الذكي التشغيلي' : 'Operations AI Assistant'}
              </button>
              <button
                onClick={handleExportCsv}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                {isAr ? 'تصدير التقرير CSV' : 'Export CSV'}
              </button>
            </div>
          )}
        </div>
      </div>

      {csvSuccessMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {csvSuccessMsg}
        </div>
      )}

      {/* Row 1: Executive Financial KPIs */}
      {isManager && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-xs font-bold text-slate-500">{isAr ? 'إجمالي المبالغ الفلترة' : 'Gross Invoiced Revenue'}</div>
            <div className="text-xl font-black text-slate-900 font-mono">
              {metrics.grossInvoicedEgp.toLocaleString('ar-EG')} ج.م
            </div>
            <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 pt-1">
              <TrendingUp className="w-3 h-3" />
              {isAr ? 'حسب الفلاتر المحددة' : 'Based on active filters'}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-xs font-bold text-slate-500">{isAr ? 'إجمالي التحصيل الفعلي' : 'Total Collected'}</div>
            <div className="text-xl font-black text-emerald-700 font-mono">
              {metrics.totalCollectedEgp.toLocaleString('ar-EG')} ج.م
            </div>
            <div className="text-[10px] text-slate-500 pt-1">
              {isAr ? `نسبة التحصيل: ${metrics.collectionsTrendPercent}%` : `Collection Rate: ${metrics.collectionsTrendPercent}%`}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-xs font-bold text-slate-500">{isAr ? 'المتبقي غير المحصل' : 'Outstanding Balance'}</div>
            <div className="text-xl font-black text-rose-700 font-mono">
              {metrics.outstandingBalanceEgp.toLocaleString('ar-EG')} ج.م
            </div>
            <div className="text-[10px] text-rose-500 font-bold pt-1">
              {isAr ? 'ذمم مدينة معلقة' : 'Pending receivables'}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-xs font-bold text-slate-500">{isAr ? 'موافقات التأمين' : 'Insurance Approvals'}</div>
            <div className="text-xl font-black text-indigo-700 font-mono">
              {metrics.insuranceApprovalRatePercent}%
            </div>
            <div className="text-[10px] text-slate-500 pt-1">
              {isAr ? `معدل الرفض: ${metrics.insuranceRejectionRatePercent}%` : `Rejection Rate: ${metrics.insuranceRejectionRatePercent}%`}
            </div>
          </div>
        </div>
      )}

      {/* Row 2: Operational Utilization & Lab Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Appointment Utilization */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            {isAr ? 'كفاءة إشغال المواعيد والعيادات' : 'Appointment & Capacity Utilization'}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">{isAr ? 'نسبة الإشغال الكلية:' : 'Capacity Utilization:'}</span>
              <span className="font-bold text-slate-900 font-mono">{metrics.appointmentUtilizationRatePercent}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${metrics.appointmentUtilizationRatePercent}%` }} />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <div className="text-slate-500">{isAr ? 'عدم الحضور (No-Show):' : 'No-Show Rate:'}</div>
                <div className="font-bold text-amber-700 font-mono">{metrics.noShowRatePercent}%</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <div className="text-slate-500">{isAr ? 'نسبة الإلغاء:' : 'Cancellation Rate:'}</div>
                <div className="font-bold text-rose-700 font-mono">{metrics.cancellationRatePercent}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Lab & Prosthetics Performance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-emerald-600" />
            {isAr ? 'أداء المعامل وتركيبات الأسنان' : 'Lab & Prosthetic Operations'}
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="text-slate-600 text-[10px]">{isAr ? 'متوسط زمن التسليم:' : 'Avg Turnaround:'}</div>
              <div className="text-lg font-black text-emerald-900 font-mono mt-1">
                {metrics.avgLabTurnaroundDays} {isAr ? 'أيام' : 'days'}
              </div>
            </div>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
              <div className="text-slate-600 text-[10px]">{isAr ? 'طلبات معمل متأخرة:' : 'Overdue Orders:'}</div>
              <div className="text-lg font-black text-rose-900 font-mono mt-1">
                {metrics.overdueLabOrdersCount}
              </div>
            </div>
          </div>
        </div>

        {/* Inventory & Stock Control */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-amber-600" />
            {isAr ? 'المخزون والمستلزمات الطبية' : 'Inventory & Cost Control'}
          </h3>
          <div className="space-y-2 text-xs">
            {isManager && (
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-600">{isAr ? 'تقييم المخزون المتاح:' : 'Total Valuation:'}</span>
                <span className="font-bold text-slate-900 font-mono">{metrics.totalInventoryValuationEgp.toLocaleString('ar-EG')} ج.م</span>
              </div>
            )}
            <div className="flex items-center justify-between p-2.5 bg-amber-50 rounded-xl border border-amber-100">
              <span className="text-amber-800">{isAr ? 'أصناف تحت حد الطلب:' : 'Low-Stock Count:'}</span>
              <span className="font-extrabold text-amber-900 font-mono">{metrics.lowStockItemsCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Branch Performance Comparative Summary Table */}
      {isManager && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            {isAr ? 'مقارنة أداء الفروع (Cairo, Alex, Giza)' : 'Branch Performance Summary Table'}
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="p-3 font-bold">{isAr ? 'الفرع' : 'Branch'}</th>
                  <th className="p-3 font-bold">{isAr ? 'المفلتر (جنيه)' : 'Invoiced (EGP)'}</th>
                  <th className="p-3 font-bold">{isAr ? 'المحصل (جنيه)' : 'Collected (EGP)'}</th>
                  <th className="p-3 font-bold">{isAr ? 'عدد المواعيد' : 'Appointments'}</th>
                  <th className="p-3 font-bold">{isAr ? 'نسبة الإشغال' : 'Utilization'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.branchPerformanceList.map((b) => (
                  <tr key={b.branchId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{b.branchName}</td>
                    <td className="p-3 font-mono">{b.invoicedEgp.toLocaleString('ar-EG')} ج.م</td>
                    <td className="p-3 font-mono text-emerald-700">{b.collectedEgp.toLocaleString('ar-EG')} ج.م</td>
                    <td className="p-3 font-mono">{b.appointmentsCount}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono font-bold rounded-md">
                        {b.utilizationPercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ManagerAIAssistantModal
        isOpen={isManagerAiOpen}
        onClose={() => setIsManagerAiOpen(false)}
      />
    </div>
  );
};
