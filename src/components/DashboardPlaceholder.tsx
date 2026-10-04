import React, { useState, useMemo } from 'react';
import {
  Building2,
  GitBranch,
  Users,
  ShieldCheck,
  MapPin,
  Sparkles,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Filter,
  Receipt,
  CreditCard,
  CheckCircle,
  Clock,
  PieChart,
  Calendar,
  Check,
  Banknote,
  ShieldAlert,
  BarChart3,
  Stethoscope,
  Briefcase,
  Layers,
  FlaskConical,
  PackageCheck,
  Syringe,
  TrendingUp,
  XCircle,
  ClipboardList,
  CheckSquare,
  ShieldQuestion,
} from 'lucide-react';
import { useAuth } from '../modules/auth/AuthContext';
import { useLanguage } from '../modules/i18n/LanguageContext';
import { RoleBadge } from '../modules/navigation/RoleBadge';
import {
  getStoredInvoices,
  getStoredCategories,
  getStoredServices,
  getStoredInsuranceCompanies,
  getStoredInsurancePlans,
  getStoredAppointments,
  getStoredLabMaterialCosts,
  getStoredImplantCases,
} from '../lib/receptionAndBillingStorage';
import { getStoredBranches, getStoredStaffUsers } from '../lib/storage';
import { getStoredDoctorTasks, getStoredLabOrders } from '../lib/clinicalStorage';
import { Invoice } from '../types/receptionAndBilling';
import { AdvancedManagementBI } from '../modules/analytics/AdvancedManagementBI';


export const DashboardPlaceholder: React.FC = () => {
  const { session, isOrgWideManager, accessibleBranches } = useAuth();
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  const userRole = session?.role?.key || session?.profile?.role_key || 'receptionist';
  const isManager =
    userRole === 'center_manager' ||
    userRole === 'branch_manager' ||
    isOrgWideManager;

  const orgId = session?.organization?.id;

  // Accessible branches for current user
  const accessibleBranchIds = useMemo(() => {
    if (isOrgWideManager || userRole === 'center_manager') {
      return getStoredBranches().map((b) => b.id);
    }
    return (accessibleBranches || []).map((b) => b.id);
  }, [isOrgWideManager, userRole, accessibleBranches]);

  // All branches list
  const allBranches = useMemo(() => getStoredBranches(), []);
  const branches = useMemo(() => {
    if (isOrgWideManager || userRole === 'center_manager') {
      return allBranches;
    }
    return allBranches.filter((b) => accessibleBranchIds.includes(b.id));
  }, [allBranches, isOrgWideManager, userRole, accessibleBranchIds]);

  const branchMap = useMemo(() => {
    const map: Record<string, string> = {};
    allBranches.forEach((b) => {
      map[b.id] = b.name;
    });
    return map;
  }, [allBranches]);

  // Master Reference Lists
  const staffUsers = useMemo(() => getStoredStaffUsers(orgId), [orgId]);
  const doctors = useMemo(() => {
    return staffUsers.filter(
      (u) =>
        u.role_key === 'doctor' ||
        u.role === 'doctor' ||
        u.display_name?.includes('د.') ||
        u.display_name?.toLowerCase().includes('dr')
    );
  }, [staffUsers]);

  const categories = useMemo(() => getStoredCategories(orgId), [orgId]);
  const services = useMemo(() => getStoredServices(), []);
  const insuranceCompanies = useMemo(() => getStoredInsuranceCompanies(), []);
  const insurancePlans = useMemo(() => getStoredInsurancePlans(), []);

  // Service lookup map
  const serviceMap = useMemo(() => {
    const map: Record<string, { category_id?: string; name_ar?: string; name_en?: string }> = {};
    services.forEach((s) => {
      map[s.id] = { category_id: s.category_id, name_ar: s.name_ar, name_en: s.name_en };
    });
    return map;
  }, [services]);

  // Filter States
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPayerType, setSelectedPayerType] = useState<string>('all');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all');
  const [selectedInsuranceCompanyId, setSelectedInsuranceCompanyId] = useState<string>('all');

  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Invoices Data
  const invoices: Invoice[] = useMemo(() => getStoredInvoices(orgId), [orgId]);

  // Filtered Services according to selected category
  const filteredServicesList = useMemo(() => {
    if (selectedCategoryId === 'all') return services;
    return services.filter((s) => s.category_id === selectedCategoryId);
  }, [services, selectedCategoryId]);

  // Helper check for Branch Authorization
  const isBranchAuthorized = (branchId?: string) => {
    if (!branchId) return true;
    if (selectedBranchId !== 'all') {
      return branchId === selectedBranchId;
    }
    return accessibleBranchIds.includes(branchId);
  };

  // Helper check for Date Period Filter
  const isDateInPeriod = (dateStr?: string) => {
    if (selectedPeriod === 'all' || !dateStr) return true;
    const itemDate = new Date(dateStr);
    const now = new Date();
    if (selectedPeriod === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      return dateStr.startsWith(todayStr);
    } else if (selectedPeriod === 'this_month') {
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Branch filter
      if (!isBranchAuthorized(inv.branch_id)) return false;

      // Status filter
      if (selectedStatus !== 'all' && inv.status !== selectedStatus) return false;

      // Payer Type filter
      if (selectedPayerType !== 'all' && inv.patient_type !== selectedPayerType) return false;

      // Period filter
      if (!isDateInPeriod(inv.created_at)) return false;

      // Doctor filter
      if (selectedDoctorId !== 'all') {
        const matchesDoc =
          inv.doctor_id === selectedDoctorId ||
          (inv.items && inv.items.some((it) => it.doctor_id === selectedDoctorId));
        if (!matchesDoc) return false;
      }

      // Insurance Company filter
      if (selectedInsuranceCompanyId !== 'all') {
        if (inv.insurance_company_id !== selectedInsuranceCompanyId) return false;
      }

      // Service Category & Service filters
      if (selectedCategoryId !== 'all' || selectedServiceId !== 'all') {
        if (!inv.items || inv.items.length === 0) return false;
        const matchesItem = inv.items.some((it) => {
          if (selectedServiceId !== 'all' && it.service_id !== selectedServiceId) {
            return false;
          }
          if (selectedCategoryId !== 'all') {
            const srvInfo = serviceMap[it.service_id];
            if (!srvInfo || srvInfo.category_id !== selectedCategoryId) return false;
          }
          return true;
        });
        if (!matchesItem) return false;
      }

      return true;
    });
  }, [
    invoices,
    selectedBranchId,
    selectedStatus,
    selectedPayerType,
    selectedPeriod,
    selectedDoctorId,
    selectedCategoryId,
    selectedServiceId,
    selectedInsuranceCompanyId,
    accessibleBranchIds,
    serviceMap,
  ]);

  // Load ancillary cost records
  const labMaterialCosts = useMemo(() => getStoredLabMaterialCosts(orgId), [orgId]);
  const implantCases = useMemo(() => getStoredImplantCases(orgId), [orgId]);

  // Financial & Operational KPI Calculations Engine
  const kpis = useMemo(() => {
    let grossTotal = 0;
    let insuranceTotal = 0;
    let patientTotal = 0;
    let paidTotal = 0;
    let remainingTotal = 0;

    let doctorCommissionsTotal = 0;
    let labCostsTotal = 0;
    let materialCostsTotal = 0;
    let clinicNetTotal = 0;

    filteredInvoices.forEach((inv) => {
      grossTotal += inv.subtotal_amount || inv.final_payable_amount || 0;
      insuranceTotal += inv.insurance_total_amount || 0;
      patientTotal += inv.patient_total_amount || 0;
      paidTotal += inv.paid_amount || 0;
      remainingTotal += inv.remaining_balance || 0;

      // Doctor Commission for invoice
      let invCommission = inv.total_doctor_commission || 0;
      let invLab = inv.total_lab_cost || 0;
      let invMat = inv.total_material_cost || 0;

      if (inv.items && inv.items.length > 0) {
        let itemsComm = 0;
        let itemsLab = 0;
        let itemsMat = 0;
        inv.items.forEach((it) => {
          if (selectedDoctorId === 'all' || it.doctor_id === selectedDoctorId) {
            itemsComm += it.calculated_commission || 0;
            itemsLab += it.lab_cost || 0;
            itemsMat += it.material_cost || 0;
          }
        });

        if (!invCommission && itemsComm > 0) invCommission = itemsComm;
        if (!invLab && itemsLab > 0) invLab = itemsLab;
        if (!invMat && itemsMat > 0) invMat = itemsMat;
      }

      doctorCommissionsTotal += invCommission;
      labCostsTotal += invLab;
      materialCostsTotal += invMat;

      const invClinicNet =
        inv.clinic_net_amount !== undefined
          ? inv.clinic_net_amount
          : (inv.paid_amount || inv.patient_total_amount) - (invCommission + invLab + invMat);

      clinicNetTotal += invClinicNet;
    });

    // Supplement Lab & Material Costs from independent ledger if invoice didn't capture them
    labMaterialCosts.forEach((record) => {
      if (!isBranchAuthorized(record.branch_id)) return;
      if (!isDateInPeriod(record.created_at)) return;
      if (record.type === 'lab' && labCostsTotal === 0) {
        labCostsTotal += record.actual_cost || 0;
      } else if (record.type === 'material' && materialCostsTotal === 0) {
        materialCostsTotal += record.actual_cost || 0;
      }
    });

    // Implant Costs KPI
    let implantCostsTotal = 0;
    implantCases.forEach((ic) => {
      if (!isBranchAuthorized(ic.branch_id)) return;
      if (!isDateInPeriod(ic.created_at)) return;
      if (selectedDoctorId !== 'all' && ic.doctor_id !== selectedDoctorId) return;

      let caseCost = ic.lab_cost || 0;
      if (ic.components && ic.components.length > 0) {
        ic.components.forEach((c) => {
          caseCost += c.actual_cost ?? (c.actual_quantity || 1) * (c.unit_cost || 0);
        });
      }
      implantCostsTotal += caseCost;
    });

    return {
      count: filteredInvoices.length,
      grossTotal: Math.round(grossTotal),
      insuranceTotal: Math.round(insuranceTotal),
      patientTotal: Math.round(patientTotal),
      paidTotal: Math.round(paidTotal),
      remainingTotal: Math.round(remainingTotal),
      doctorCommissionsTotal: Math.round(doctorCommissionsTotal),
      labCostsTotal: Math.round(labCostsTotal),
      materialCostsTotal: Math.round(materialCostsTotal),
      implantCostsTotal: Math.round(implantCostsTotal),
      clinicNetTotal: Math.round(clinicNetTotal - implantCostsTotal),
    };
  }, [
    filteredInvoices,
    labMaterialCosts,
    implantCases,
    selectedDoctorId,
    accessibleBranchIds,
  ]);

  // Operational KPIs: Pending Insurance Approvals, Pending Lab Orders, Pending Reception Tasks
  const operationalKpis = useMemo(() => {
    // 1. Pending Insurance Approvals
    let pendingInsuranceApprovalsCount = 0;
    filteredInvoices.forEach((inv) => {
      if (inv.items) {
        inv.items.forEach((it) => {
          if (it.approval_status === 'pending') {
            pendingInsuranceApprovalsCount++;
          }
        });
      }
    });

    // 2. Pending Lab Orders
    const labOrders = getStoredLabOrders();
    const pendingLabOrders = labOrders.filter((order) => {
      if (!isBranchAuthorized(order.branch_id)) return false;
      if (!isDateInPeriod(order.created_at)) return false;
      if (selectedDoctorId !== 'all' && order.doctor_id !== selectedDoctorId) return false;

      return (
        order.status === 'draft' ||
        order.status === 'sent_to_lab' ||
        order.status === 'in_production'
      );
    });

    // 3. Pending Reception Tasks
    const doctorTasks = getStoredDoctorTasks();
    const pendingReceptionTasks = doctorTasks.filter((task) => {
      if (!isBranchAuthorized(task.branch_id)) return false;
      if (!isDateInPeriod(task.created_at)) return false;
      if (selectedDoctorId !== 'all' && task.doctor_id !== selectedDoctorId) return false;

      return task.status === 'pending' || task.status === 'in_progress';
    });

    return {
      pendingInsuranceApprovals: pendingInsuranceApprovalsCount,
      pendingLabOrders: pendingLabOrders.length,
      pendingReceptionTasks: pendingReceptionTasks.length,
    };
  }, [filteredInvoices, selectedDoctorId, accessibleBranchIds]);

  // Appointment Summary Engine
  const appointmentSummary = useMemo(() => {
    const appointments = getStoredAppointments();

    const filteredAppointments = appointments.filter((app) => {
      if (!isBranchAuthorized(app.branch_id)) return false;
      if (!isDateInPeriod(app.appointment_date || app.created_at)) return false;
      if (selectedDoctorId !== 'all' && app.doctor_id !== selectedDoctorId) return false;
      return true;
    });

    let scheduled = 0;
    let completed = 0;
    let cancelled = 0;

    filteredAppointments.forEach((app) => {
      if (app.status === 'confirmed' || app.status === 'waiting' || app.status === 'rescheduled') {
        scheduled++;
      } else if (app.status === 'completed' || app.status === 'arrived' || app.status === 'with_doctor') {
        completed++;
      } else if (app.status === 'cancelled' || app.status === 'no_show') {
        cancelled++;
      }
    });

    return {
      total: filteredAppointments.length,
      scheduled,
      completed,
      cancelled,
    };
  }, [selectedDoctorId, accessibleBranchIds]);

  // CSV Export Handler with Complete Financial Summary
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) return;

    const headers = [
      isAr ? 'رقم الفاتورة' : 'Invoice Number',
      isAr ? 'التاريخ' : 'Date',
      isAr ? 'الفرع' : 'Branch',
      isAr ? 'اسم المريض' : 'Patient Name',
      isAr ? 'كود المريض' : 'Patient Code',
      isAr ? 'الطبيب المعالج' : 'Doctor Name',
      isAr ? 'نوع السداد' : 'Payer Type',
      isAr ? 'إجمالي الفاتورة (ج.م)' : 'Gross Amount (EGP)',
      isAr ? 'حصة التأمين (ج.م)' : 'Insurance Share (EGP)',
      isAr ? 'حصة المريض (ج.م)' : 'Patient Share (EGP)',
      isAr ? 'المبلغ المحصل (ج.م)' : 'Paid Amount (EGP)',
      isAr ? 'المتبقي (ج.م)' : 'Remaining Balance (EGP)',
      isAr ? 'عمولة الطبيب (ج.م)' : 'Doctor Commission (EGP)',
      isAr ? 'تكلفة المعمل (ج.م)' : 'Lab Cost (EGP)',
      isAr ? 'تكلفة المواد (ج.م)' : 'Material Cost (EGP)',
      isAr ? 'صافي العيادة (ج.م)' : 'Clinic Net (EGP)',
      isAr ? 'حالة الفاتورة' : 'Invoice Status',
    ];

    const rows = filteredInvoices.map((inv) => {
      const branchName = branchMap[inv.branch_id] || inv.branch_id || '';
      const payerTypeLabel =
        inv.patient_type === 'insured'
          ? isAr
            ? 'تأمين'
            : 'Insured'
          : isAr
          ? 'نقدي'
          : 'Cash';
      const statusLabel =
        inv.status === 'paid'
          ? isAr
            ? 'مدفوع بالكامل'
            : 'Paid'
          : inv.status === 'partially_paid'
          ? isAr
            ? 'مدفوع جزئياً'
            : 'Partially Paid'
          : isAr
          ? 'غير مدفوع'
          : 'Unpaid';

      let invCommission = inv.total_doctor_commission || 0;
      let invLab = inv.total_lab_cost || 0;
      let invMat = inv.total_material_cost || 0;

      if (inv.items) {
        inv.items.forEach((it) => {
          if (!invCommission && it.calculated_commission) invCommission += it.calculated_commission;
          if (!invLab && it.lab_cost) invLab += it.lab_cost;
          if (!invMat && it.material_cost) invMat += it.material_cost;
        });
      }

      const invClinicNet =
        inv.clinic_net_amount !== undefined
          ? inv.clinic_net_amount
          : (inv.paid_amount || inv.patient_total_amount) - (invCommission + invLab + invMat);

      return [
        `"${inv.invoice_number}"`,
        `"${inv.created_at ? inv.created_at.split('T')[0] : ''}"`,
        `"${branchName.replace(/"/g, '""')}"`,
        `"${(inv.patient_name || '').replace(/"/g, '""')}"`,
        `"${(inv.patient_code || '').replace(/"/g, '""')}"`,
        `"${(inv.doctor_name || '').replace(/"/g, '""')}"`,
        `"${payerTypeLabel}"`,
        inv.subtotal_amount || inv.final_payable_amount || 0,
        inv.insurance_total_amount || 0,
        inv.patient_total_amount || 0,
        inv.paid_amount || 0,
        inv.remaining_balance || 0,
        invCommission,
        invLab,
        invMat,
        invClinicNet,
        `"${statusLabel}"`,
      ];
    });

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename = `Financial_Report_${selectedBranchId}_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportSuccessMsg(
      isAr
        ? 'تم تصدير التقرير المالي بصيغة CSV بنجاح'
        : 'Financial report exported to CSV successfully!'
    );
    setTimeout(() => setExportSuccessMsg(null), 4000);
  };

  if (!session) return null;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-linear-to-r from-teal-800 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-700/60 border border-teal-500/30 text-teal-100 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>PHASE 08.3 — MANAGER DASHBOARD & FINANCIAL REPORTING</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {language === 'ar'
              ? `أهلاً بك، ${session.profile.display_name}`
              : `Welcome, ${session.profile.display_name}`}
          </h1>

          <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed">
            {language === 'ar'
              ? 'لوحة تحكم الإدارة والتقارير المحاسبية الشاملة لمتابعة الأداء المالي والعمولات وتكاليف المعامل والمستلزمات والموافقات والمواعيد عبر الفروع.'
              : 'Comprehensive Manager Dashboard & Accounting Reports to monitor financial performance, doctor commissions, lab/material costs, approvals, and appointments across branches.'}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
            <RoleBadge roleKey={session.role.key} className="bg-white/10 text-white border-white/20" />
            <span className="flex items-center gap-1 text-teal-200">
              <MapPin className="w-3.5 h-3.5" />
              {isOrgWideManager
                ? t.auth.orgWideAccess
                : `${t.auth.branchScopedAccess} (${accessibleBranches.map((b) => b.name).join(', ')})`}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {language === 'ar' ? 'المؤسسة الطبية' : 'Organization'}
            </span>
            <div className="text-sm font-bold text-slate-900 truncate">
              {session.organization.name}
            </div>
            <span className="text-[10px] text-teal-600 font-medium">
              {session.organization.country} • {session.organization.currency}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <GitBranch className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {language === 'ar' ? 'الفروع المتاحة لك' : 'Accessible Branches'}
            </span>
            <div className="text-lg font-bold text-slate-900">
              {isOrgWideManager ? `${allBranches.length} / ${allBranches.length} (All)` : `${branches.length} Branch`}
            </div>
            <span className="text-[10px] text-indigo-600 font-medium">
              {branches.map((b) => b.city).join(', ')}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {language === 'ar' ? 'الأدوار المعتمدة' : 'Internal Roles'}
            </span>
            <div className="text-lg font-bold text-slate-900">7 Active Roles</div>
            <span className="text-[10px] text-purple-600 font-medium">
              Doctor, Reception, Lab, etc.
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {language === 'ar' ? 'حالة الأمان و RLS' : 'RLS Status'}
            </span>
            <div className="text-sm font-bold text-slate-900">Enforced &amp; Active</div>
            <span className="text-[10px] text-emerald-600 font-medium">
              Org &amp; Branch Isolated
            </span>
          </div>
        </div>
      </div>

      {/* Manager Financial Reports & Analytics Section */}
      <div id="manager-financial-reports-section" className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-50 text-teal-800 rounded-2xl border border-teal-100">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isAr ? 'تقارير الإدارة ولوحة التحليلات المالية التشغيلية' : 'Manager Dashboard & Operational Analytics'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'متابعة حركة الفواتير، التحصيلات النقدية، عمولات الأطباء، تكاليف المعامل، المهام المعلقة، وتلخيص المواعيد'
                  : 'Track billing, cash collections, doctor commissions, lab costs, pending tasks, and appointment metrics'}
              </p>
            </div>
          </div>

          {/* Export to CSV Button */}
          <div className="flex items-center gap-2">
            <button
              id="export-financial-csv-btn"
              onClick={handleExportCSV}
              disabled={filteredInvoices.length === 0}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all ${
                filteredInvoices.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
              title={isAr ? 'تصدير الملخص المالي إلى ملف CSV للمحاسبة' : 'Export Financial Summary to CSV for accounting'}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isAr ? 'تصدير إلى CSV' : 'Export to CSV'}</span>
              <Download className="w-3.5 h-3.5 ms-1 opacity-80" />
            </button>
          </div>
        </div>

        {exportSuccessMsg && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{exportSuccessMsg}</span>
          </div>
        )}

        {/* Extended Filters Controls Bar (Branch, Date, Status, Payer, Doctor, Category, Service, Insurance) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-bold border-b border-slate-200 pb-2">
            <Filter className="w-4 h-4 text-teal-600" />
            <span>{isAr ? 'خيارات التصفية والتحديد' : 'Dashboard Filter Controls'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Branch Selector */}
            <div>
              <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'الفرع' : 'Branch'}</span>
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 transition-all"
              >
                <option value="all">{isAr ? 'جميع الفروع المتاحة' : 'All Accessible Branches'}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Time Period Filter */}
            <div>
              <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'الفترة الزمنية' : 'Time Period'}</span>
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 transition-all"
              >
                <option value="all">{isAr ? 'كل الأوقات' : 'All Time'}</option>
                <option value="today">{isAr ? 'اليوم فقط' : 'Today Only'}</option>
                <option value="this_month">{isAr ? 'الشهر الحالي' : 'This Month'}</option>
              </select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'حالة السداد' : 'Payment Status'}</span>
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 transition-all"
              >
                <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
                <option value="paid">{isAr ? 'مدفوع بالكامل' : 'Paid'}</option>
                <option value="partially_paid">{isAr ? 'مدفوع جزئياً' : 'Partially Paid'}</option>
                <option value="unpaid">{isAr ? 'غير مدفوع' : 'Unpaid'}</option>
              </select>
            </div>

            {/* Payer Type Filter */}
            <div>
              <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'نوع الدافع' : 'Payer Type'}</span>
              </label>
              <select
                value={selectedPayerType}
                onChange={(e) => setSelectedPayerType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 transition-all"
              >
                <option value="all">{isAr ? 'الكل (نقدي وتأمين)' : 'All (Cash & Insured)'}</option>
                <option value="cash">{isAr ? 'نقدي فقط (Cash)' : 'Cash Only'}</option>
                <option value="insured">{isAr ? 'تأمين فقط (Insured)' : 'Insured Only'}</option>
              </select>
            </div>

            {/* Doctor Filter */}
            <div>
              <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'الطبيب المعالج' : 'Doctor'}</span>
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 transition-all"
              >
                <option value="all">{isAr ? 'جميع الأطباء' : 'All Doctors'}</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.display_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Category Filter */}
            <div>
              <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'تصنيف الخدمة' : 'Service Category'}</span>
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setSelectedServiceId('all');
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 transition-all"
              >
                <option value="all">{isAr ? 'جميع التصنيفات' : 'All Categories'}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {isAr ? cat.name_ar : cat.name_en}
                  </option>
                ))}
              </select>
            </div>

            {/* Specific Service Filter */}
            <div>
              <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'الخدمة العلاجية' : 'Service'}</span>
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 transition-all"
              >
                <option value="all">{isAr ? 'جميع الخدمات' : 'All Services'}</option>
                {filteredServicesList.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {isAr ? srv.name_ar : srv.name_en} ({srv.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Insurance Company / Plan Filter */}
            <div>
              <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'شركة/خطة التأمين' : 'Insurance Company'}</span>
              </label>
              <select
                value={selectedInsuranceCompanyId}
                onChange={(e) => setSelectedInsuranceCompanyId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 transition-all"
              >
                <option value="all">{isAr ? 'جميع شركات التأمين' : 'All Insurance Companies'}</option>
                {insuranceCompanies.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {isAr ? comp.name_ar : comp.name_en}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Financial KPI Group 1 — Revenue & Billing */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            {isAr ? 'الإيرادات والتحصيلات الأساسية' : 'Gross Revenue & Cash Collections'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Total Invoiced */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                {isAr ? 'إجمالي الفواتير' : 'Gross Invoiced'}
              </span>
              <div className="text-base sm:text-lg font-black text-slate-900 font-mono">
                {kpis.grossTotal.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                {kpis.count} {isAr ? 'فاتورة' : 'invoices'}
              </span>
            </div>

            {/* Insurance Covered */}
            <div className="bg-purple-50/70 p-3.5 rounded-2xl border border-purple-200/80">
              <span className="text-[10px] font-bold text-purple-700 uppercase block mb-1">
                {isAr ? 'حصة التأمين' : 'Insurance Covered'}
              </span>
              <div className="text-base sm:text-lg font-black text-purple-900 font-mono">
                {kpis.insuranceTotal.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </div>
              <span className="text-[10px] text-purple-600 font-medium mt-0.5 block">
                {isAr ? 'مطالبات تأمينية' : 'Insurance claims'}
              </span>
            </div>

            {/* Patient Co-Pay Due */}
            <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-200/80">
              <span className="text-[10px] font-bold text-indigo-700 uppercase block mb-1">
                {isAr ? 'حصة المرضى' : 'Patient Co-Pay'}
              </span>
              <div className="text-base sm:text-lg font-black text-indigo-900 font-mono">
                {kpis.patientTotal.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </div>
              <span className="text-[10px] text-indigo-600 font-medium mt-0.5 block">
                {isAr ? 'مستحقات نقدية' : 'Direct copay'}
              </span>
            </div>

            {/* Paid / Collected */}
            <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                {isAr ? 'المحصل فعلياً' : 'Total Collected'}
              </span>
              <div className="text-base sm:text-lg font-black text-emerald-900 font-mono">
                {kpis.paidTotal.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">
                {isAr ? 'مدفوع نقدياً / بطاقة' : 'Collected revenue'}
              </span>
            </div>

            {/* Remaining Balance */}
            <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80">
              <span className="text-[10px] font-bold text-amber-800 uppercase block mb-1">
                {isAr ? 'المتبقي غير المحصل' : 'Outstanding Balance'}
              </span>
              <div className="text-base sm:text-lg font-black text-amber-900 font-mono">
                {kpis.remainingTotal.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </div>
              <span className="text-[10px] text-amber-700 font-medium mt-0.5 block">
                {isAr ? 'ذمم مدينة متبقية' : 'Uncollected receivables'}
              </span>
            </div>
          </div>
        </div>

        {/* Phase 08.3 Financial KPIs — Costs, Commissions & Clinic Net */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            {isAr ? 'مؤشرات العمولات والتكاليف وصافي العيادة (Phase 08.3 Financial KPIs)' : 'Commissions, Costs & Clinic Net (Phase 08.3 Financial KPIs)'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* 1. Doctor Commissions KPI */}
            <div className="bg-blue-50/80 p-3.5 rounded-2xl border border-blue-200/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-blue-700 uppercase">
                  {isAr ? 'عمولات الأطباء' : 'Doctor Commissions'}
                </span>
                <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-blue-950 font-mono">
                {kpis.doctorCommissionsTotal.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </div>
              <span className="text-[10px] text-blue-600 font-medium mt-0.5 block">
                {isAr ? 'حصة الأطباء المستحقة' : 'Doctor earn-outs'}
              </span>
            </div>

            {/* 2. Lab Costs KPI */}
            <div className="bg-orange-50/80 p-3.5 rounded-2xl border border-orange-200/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-orange-800 uppercase">
                  {isAr ? 'تكاليف المعامل' : 'Lab Costs'}
                </span>
                <FlaskConical className="w-3.5 h-3.5 text-orange-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-orange-950 font-mono">
                {kpis.labCostsTotal.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </div>
              <span className="text-[10px] text-orange-700 font-medium mt-0.5 block">
                {isAr ? 'مصاريف معامل التركيبات' : 'Dental lab fees'}
              </span>
            </div>

            {/* 3. Material Costs KPI */}
            <div className="bg-rose-50/80 p-3.5 rounded-2xl border border-rose-200/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-rose-800 uppercase">
                  {isAr ? 'تكاليف المواد' : 'Material Costs'}
                </span>
                <PackageCheck className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-rose-950 font-mono">
                {kpis.materialCostsTotal.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </div>
              <span className="text-[10px] text-rose-700 font-medium mt-0.5 block">
                {isAr ? 'مستلزمات العيادة' : 'Clinical consumables'}
              </span>
            </div>

            {/* 4. Implant Costs KPI */}
            <div className="bg-cyan-50/80 p-3.5 rounded-2xl border border-cyan-200/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-cyan-800 uppercase">
                  {isAr ? 'تكاليف الزراعة' : 'Implant Costs'}
                </span>
                <Syringe className="w-3.5 h-3.5 text-cyan-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-cyan-950 font-mono">
                {kpis.implantCostsTotal.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </div>
              <span className="text-[10px] text-cyan-700 font-medium mt-0.5 block">
                {isAr ? 'زرعات وطعوم عظمية' : 'Implants & grafts'}
              </span>
            </div>

            {/* 5. Clinic Net Amount KPI */}
            <div className="bg-teal-50/90 p-3.5 rounded-2xl border border-teal-300 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-teal-800 uppercase">
                  {isAr ? 'صافي العيادة' : 'Clinic Net Amount'}
                </span>
                <TrendingUp className="w-3.5 h-3.5 text-teal-700" />
              </div>
              <div className="text-base sm:text-lg font-black text-teal-950 font-mono">
                {kpis.clinicNetTotal.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </div>
              <span className="text-[10px] text-teal-700 font-medium mt-0.5 block">
                {isAr ? 'بعد الخصومات والتكاليف' : 'Net after cost deduction'}
              </span>
            </div>
          </div>
        </div>

        {/* Phase 08.3 Operational KPIs & Pending Workflows */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            {isAr ? 'مؤشرات المتابعة والمهام المعلقة (Operational & Pending Tasks KPIs)' : 'Operational & Pending Tasks KPIs'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 6. Pending Insurance Approvals KPI */}
            <div className="bg-purple-50/90 p-4 rounded-2xl border border-purple-200 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-purple-700 uppercase block">
                  {isAr ? 'موافقات التأمين المعلقة' : 'Pending Insurance Approvals'}
                </span>
                <div className="text-xl font-black text-purple-950 font-mono">
                  {operationalKpis.pendingInsuranceApprovals}
                </div>
                <span className="text-[10px] text-purple-600 font-medium block">
                  {isAr ? 'خدمات بانتظار موافقة الشركة' : 'Services awaiting pre-auth'}
                </span>
              </div>
              <div className="p-3 bg-purple-100/80 text-purple-700 rounded-2xl">
                <ShieldQuestion className="w-6 h-6" />
              </div>
            </div>

            {/* 7. Pending Lab Orders KPI */}
            <div className="bg-orange-50/90 p-4 rounded-2xl border border-orange-200 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-orange-800 uppercase block">
                  {isAr ? 'طلبات المعامل القائمة' : 'Pending Lab Orders'}
                </span>
                <div className="text-xl font-black text-orange-950 font-mono">
                  {operationalKpis.pendingLabOrders}
                </div>
                <span className="text-[10px] text-orange-700 font-medium block">
                  {isAr ? 'تركيبات وجسور قيد التصنيع' : 'Lab cases in production'}
                </span>
              </div>
              <div className="p-3 bg-orange-100/80 text-orange-700 rounded-2xl">
                <FlaskConical className="w-6 h-6" />
              </div>
            </div>

            {/* 8. Pending Reception Tasks KPI */}
            <div className="bg-blue-50/90 p-4 rounded-2xl border border-blue-200 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-blue-800 uppercase block">
                  {isAr ? 'مهام الاستقبال المعلقة' : 'Pending Reception Tasks'}
                </span>
                <div className="text-xl font-black text-blue-950 font-mono">
                  {operationalKpis.pendingReceptionTasks}
                </div>
                <span className="text-[10px] text-blue-700 font-medium block">
                  {isAr ? 'إقرارات ومتابعات تحتاج إجراء' : 'Consents & reception items'}
                </span>
              </div>
              <div className="p-3 bg-blue-100/80 text-blue-700 rounded-2xl">
                <ClipboardList className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* 9. Appointment Summary */}
        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {isAr ? 'ملخص المواعيد والزيارات (Appointment Summary)' : 'Appointment Summary'}
              </h3>
            </div>
            <span className="text-[11px] font-mono font-bold text-teal-700 bg-teal-100/60 px-2.5 py-0.5 rounded-full">
              {appointmentSummary.total} {isAr ? 'إجمالي المواعيد' : 'Total Appointments'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 block mb-0.5">
                {isAr ? 'كافة المواعيد المسجلة' : 'Total Registered'}
              </span>
              <div className="text-base font-bold text-slate-900 font-mono">
                {appointmentSummary.total}
              </div>
            </div>

            {/* Scheduled / Confirmed */}
            <div className="bg-white p-3 rounded-xl border border-blue-200/80">
              <span className="text-[10px] font-bold text-blue-700 block mb-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-600" />
                <span>{isAr ? 'مجدولة / مؤكدة' : 'Scheduled / Confirmed'}</span>
              </span>
              <div className="text-base font-bold text-blue-900 font-mono">
                {appointmentSummary.scheduled}
              </div>
            </div>

            {/* Completed / Arrived */}
            <div className="bg-white p-3 rounded-xl border border-emerald-200/80">
              <span className="text-[10px] font-bold text-emerald-700 block mb-0.5 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                <span>{isAr ? 'مكتملة / حضر' : 'Completed / Attended'}</span>
              </span>
              <div className="text-base font-bold text-emerald-900 font-mono">
                {appointmentSummary.completed}
              </div>
            </div>

            {/* Cancelled / No Show */}
            <div className="bg-white p-3 rounded-xl border border-red-200/80">
              <span className="text-[10px] font-bold text-red-700 block mb-0.5 flex items-center gap-1">
                <XCircle className="w-3 h-3 text-red-600" />
                <span>{isAr ? 'ملغاة / عدم حضور' : 'Cancelled / No Show'}</span>
              </span>
              <div className="text-base font-bold text-red-900 font-mono">
                {appointmentSummary.cancelled}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Invoices Summary Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              {isAr ? 'جدول الفواتير والتحصيلات التفصيلي' : 'Detailed Financial & Accounting Breakdown Table'} ({filteredInvoices.length})
            </span>
            <span className="text-slate-500 text-[11px]">
              {isAr ? 'يحتوي التقرير المصدر على كافة العمولات والتكاليف الدقيقة' : 'Exported CSV includes full commissions & cost details'}
            </span>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-bold">{isAr ? 'لا توجد فواتير مطابقة لخيارات التصفية المختارة' : 'No invoices matching filter criteria'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 text-start">{isAr ? 'الفاتورة والتاريخ' : 'Invoice & Date'}</th>
                    <th className="px-3 py-2.5 text-start">{isAr ? 'الفرع' : 'Branch'}</th>
                    <th className="px-3 py-2.5 text-start">{isAr ? 'المريض' : 'Patient'}</th>
                    <th className="px-3 py-2.5 text-start">{isAr ? 'الطبيب' : 'Doctor'}</th>
                    <th className="px-3 py-2.5 text-center">{isAr ? 'النوع' : 'Type'}</th>
                    <th className="px-3 py-2.5 text-end">{isAr ? 'الإجمالي' : 'Gross'}</th>
                    <th className="px-3 py-2.5 text-end">{isAr ? 'التأمين' : 'Insurance'}</th>
                    <th className="px-3 py-2.5 text-end">{isAr ? 'المحصل' : 'Paid'}</th>
                    <th className="px-3 py-2.5 text-end">{isAr ? 'العمولة' : 'Commission'}</th>
                    <th className="px-3 py-2.5 text-end">{isAr ? 'المعمل والمواد' : 'Lab & Mat'}</th>
                    <th className="px-3 py-2.5 text-end">{isAr ? 'الصافي' : 'Net'}</th>
                    <th className="px-3 py-2.5 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => {
                    const branchName = branchMap[inv.branch_id] || inv.branch_id;
                    const dateStr = inv.created_at ? inv.created_at.split('T')[0] : '—';

                    let invCommission = inv.total_doctor_commission || 0;
                    let invLab = inv.total_lab_cost || 0;
                    let invMat = inv.total_material_cost || 0;

                    if (inv.items) {
                      inv.items.forEach((it) => {
                        if (!invCommission && it.calculated_commission) invCommission += it.calculated_commission;
                        if (!invLab && it.lab_cost) invLab += it.lab_cost;
                        if (!invMat && it.material_cost) invMat += it.material_cost;
                      });
                    }

                    const invClinicNet =
                      inv.clinic_net_amount !== undefined
                        ? inv.clinic_net_amount
                        : (inv.paid_amount || inv.patient_total_amount) - (invCommission + invLab + invMat);

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5 font-mono font-bold text-teal-700">
                          <div>{inv.invoice_number}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{dateStr}</div>
                        </td>

                        <td className="px-3 py-2.5 text-slate-700 font-medium">
                          {branchName}
                        </td>

                        <td className="px-3 py-2.5">
                          <div className="font-bold text-slate-900">{inv.patient_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{inv.patient_code}</div>
                        </td>

                        <td className="px-3 py-2.5 text-slate-700">
                          {inv.doctor_name || '—'}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.patient_type === 'insured'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}
                          >
                            {inv.patient_type === 'insured' ? (isAr ? 'تأمين' : 'Insured') : (isAr ? 'نقدي' : 'Cash')}
                          </span>
                        </td>

                        <td className="px-3 py-2.5 text-end font-mono font-bold text-slate-900">
                          {(inv.subtotal_amount || inv.final_payable_amount || 0).toLocaleString()}
                        </td>

                        <td className="px-3 py-2.5 text-end font-mono text-purple-700 font-semibold">
                          {(inv.insurance_total_amount || 0).toLocaleString()}
                        </td>

                        <td className="px-3 py-2.5 text-end font-mono text-emerald-700 font-bold">
                          {(inv.paid_amount || 0).toLocaleString()}
                        </td>

                        <td className="px-3 py-2.5 text-end font-mono text-blue-700 font-semibold">
                          {invCommission.toLocaleString()}
                        </td>

                        <td className="px-3 py-2.5 text-end font-mono text-orange-700 font-semibold">
                          {(invLab + invMat).toLocaleString()}
                        </td>

                        <td className="px-3 py-2.5 text-end font-mono text-teal-800 font-black">
                          {invClinicNet.toLocaleString()}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.status === 'partially_paid'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {inv.status === 'paid'
                              ? isAr
                                ? 'مدفوع'
                                : 'Paid'
                              : inv.status === 'partially_paid'
                              ? isAr
                                ? 'جزئي'
                                : 'Partial'
                              : isAr
                              ? 'غير مدفوع'
                              : 'Unpaid'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Wave 3: Advanced Management BI & Executive Analytics */}
      <div className="pt-4 border-t border-slate-200">
        <AdvancedManagementBI />
      </div>
    </div>
  );
};

