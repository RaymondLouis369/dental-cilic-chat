import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  CreditCard,
  Plus,
  Search,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  User,
  DollarSign,
  Calendar,
  Filter,
  Receipt,
  Check,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  InvoicePatientType,
  DentalService,
} from '../../types/receptionAndBilling';
import { Patient } from '../../types/patient';
import {
  getStoredInvoices,
  createInvoice,
  recordInvoicePayment,
  updateInvoiceStatus,
  getStoredServices,
  resolvePricing,
} from '../../lib/receptionAndBillingStorage';
import { getStoredPatients } from '../../lib/patientStorage';
import { getStoredStaffUsers, getStoredBranches } from '../../lib/storage';
import { InvoiceSummary } from '../../components/InvoiceSummary';
import { PaymentModal } from '../../components/PaymentModal';
import { CommissionCostBreakdown } from '../../components/CommissionCostBreakdown';
import { CommissionCostManagementModal } from './CommissionCostManagementModal';
import { Calculator } from 'lucide-react';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  initialInvoiceId?: string;
  onInvoiceUpdated?: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  patientId,
  initialInvoiceId,
  onInvoiceUpdated,
}) => {
  const { language } = useLanguage();
  const { session } = useAuth();
  const isAr = language === 'ar';

  const orgId = session?.organization?.id || 'org_dental_egy_01';
  const branchId = (session?.profile as any)?.branch_id || '11111111-1111-1111-1111-111111111111';

  // Active view: 'list' | 'detail' | 'create'
  const [view, setView] = useState<'list' | 'detail' | 'create'>(
    initialInvoiceId ? 'detail' : 'list'
  );

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    initialInvoiceId || null
  );

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Trigger re-render when storage updates
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => {
    setRefreshKey((k) => k + 1);
    if (onInvoiceUpdated) onInvoiceUpdated();
  };

  // Modal state for PaymentModal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCommissionCostModal, setShowCommissionCostModal] = useState(false);

  // Invoices List
  const invoices = useMemo(() => {
    let list = getStoredInvoices(orgId);
    if (patientId) {
      list = list.filter((i) => i.patient_id === patientId);
    }
    if (statusFilter !== 'all') {
      list = list.filter((i) => i.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.invoice_number.toLowerCase().includes(q) ||
          i.patient_name?.toLowerCase().includes(q) ||
          i.patient_code?.toLowerCase().includes(q) ||
          i.insurance_company_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orgId, patientId, statusFilter, searchQuery, refreshKey]);

  // Selected Invoice Detail
  const selectedInvoice = useMemo(() => {
    if (!selectedInvoiceId) return null;
    return invoices.find((i) => i.id === selectedInvoiceId) || getStoredInvoices().find((i) => i.id === selectedInvoiceId) || null;
  }, [selectedInvoiceId, invoices, refreshKey]);

  // Payment Recording State
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);

  // New Invoice Form State
  const [newPatientId, setNewPatientId] = useState<string>(patientId || '');
  const [newDoctorId, setNewDoctorId] = useState<string>('');
  const [newPatientType, setNewPatientType] = useState<InvoicePatientType>('cash');
  const [newInsuranceCompany, setNewInsuranceCompany] = useState<string>('');
  const [newPolicyNumber, setNewPolicyNumber] = useState<string>('');
  const [newDiscount, setNewDiscount] = useState<number>(0);
  const [newTax, setNewTax] = useState<number>(0);
  const [newNotes, setNewNotes] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<
    Array<{ serviceId: string; quantity: number }>
  >([]);

  // Master Data
  const patients = useMemo(() => getStoredPatients(), []);
  const doctors = useMemo(
    () => getStoredStaffUsers().filter((u) => u.role_key === 'doctor'),
    []
  );
  const services = useMemo(() => getStoredServices().filter((s) => s.active), []);

  if (!isOpen) return null;

  // Status Badge Renderer
  const renderStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isAr ? 'مدفوعة بالكامل' : 'Paid in Full'}
          </span>
        );
      case 'partially_paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <Clock className="w-3.5 h-3.5" />
            {isAr ? 'مدفوعة جزئياً' : 'Partially Paid'}
          </span>
        );
      case 'unpaid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200">
            <AlertCircle className="w-3.5 h-3.5" />
            {isAr ? 'غير مدفوعة' : 'Unpaid'}
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <XCircle className="w-3.5 h-3.5" />
            {isAr ? 'ملغاة' : 'Cancelled'}
          </span>
        );
    }
  };

  // Handle Payment Submit
  const handleCollectPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setPaymentError(null);
    setPaymentSuccess(false);

    const amt = parseFloat(paymentAmountInput);
    if (isNaN(amt) || amt <= 0) {
      setPaymentError(
        isAr ? 'برجاء أدخل مبلغ تحصيل صحيح أكبر من الصفر' : 'Please enter a valid payment amount greater than zero'
      );
      return;
    }

    const result = recordInvoicePayment(selectedInvoice.id, amt, session?.profile?.id);
    if (!result.success) {
      setPaymentError(result.error || (isAr ? 'حدث خطأ أثناء حفظ الدفعة' : 'Error recording payment'));
    } else {
      setPaymentSuccess(true);
      setPaymentAmountInput('');
      refresh();
      setTimeout(() => setPaymentSuccess(false), 3000);
    }
  };

  // Handle Create Invoice Submit
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientId) {
      alert(isAr ? 'برجاء اختيار المريض' : 'Please select a patient');
      return;
    }
    if (selectedServices.length === 0) {
      alert(isAr ? 'برجاء اختيار خدمة سنية واحدة على الأقل' : 'Please select at least one service');
      return;
    }

    const created = createInvoice({
      organizationId: orgId,
      branchId,
      patientId: newPatientId,
      doctorId: newDoctorId || undefined,
      patientType: newPatientType,
      insuranceCompanyId: newInsuranceCompany || undefined,
      insuranceCompanyName: newInsuranceCompany || undefined,
      policyNumber: newPolicyNumber || undefined,
      discountTotalAmount: newDiscount,
      taxTotalAmount: newTax,
      notes: newNotes,
      actorUserId: session?.profile?.id,
      items: selectedServices.map((s) => ({
        serviceId: s.serviceId,
        quantity: s.quantity,
      })),
    });

    setSelectedInvoiceId(created.id);
    setView('detail');
    refresh();
  };

  // Add service line to creation form
  const addServiceLine = (serviceId: string) => {
    if (!serviceId) return;
    setSelectedServices((prev) => {
      const existing = prev.find((item) => item.serviceId === serviceId);
      if (existing) {
        return prev.map((item) =>
          item.serviceId === serviceId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { serviceId, quantity: 1 }];
    });
  };

  const removeServiceLine = (serviceId: string) => {
    setSelectedServices((prev) => prev.filter((item) => item.serviceId !== serviceId));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto dir-auto"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {isAr ? 'فواتير الأسنان والحسابات' : 'Dental Invoices & Billing'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'إدارة فواتير المرضى النقديين والمؤمن عليهم والخدمات المتعددة'
                  : 'Manage cash and insured patient invoices with itemized service coverage'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCommissionCostModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900/60 hover:bg-teal-100 transition-colors"
            >
              <Calculator className="w-3.5 h-3.5 text-teal-600" />
              <span>{isAr ? 'عمولات الأطباء والتكاليف' : 'Commissions & Costs'}</span>
            </button>

            {view !== 'list' && (
              <button
                type="button"
                onClick={() => setView('list')}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                {isAr ? '← العودة لقائمة الفواتير' : '← Back to Invoices List'}
              </button>
            )}
            {view === 'list' && (
              <button
                type="button"
                onClick={() => setView('create')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                {isAr ? 'إصدار فاتورة جديدة' : 'New Invoice'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* VIEW 1: INVOICES LIST */}
          {view === 'list' && (
            <div className="space-y-5">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute top-3 right-3 text-slate-400 dir-rtl:right-3 dir-ltr:left-3 dir-ltr:right-auto" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      isAr
                        ? 'بحث برقم الفاتورة أو اسم المريض...'
                        : 'Search by invoice # or patient name...'
                    }
                    className="w-full text-xs pr-9 pl-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dir-rtl:pr-9 dir-rtl:pl-3 dir-ltr:pl-9 dir-ltr:pr-3"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
                    <option value="unpaid">{isAr ? 'غير مدفوعة' : 'Unpaid'}</option>
                    <option value="partially_paid">{isAr ? 'مدفوعة جزئياً' : 'Partially Paid'}</option>
                    <option value="paid">{isAr ? 'مدفوعة بالكامل' : 'Paid'}</option>
                    <option value="cancelled">{isAr ? 'ملغاة' : 'Cancelled'}</option>
                  </select>
                </div>
              </div>

              {/* Invoices Table */}
              {invoices.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                  <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {isAr ? 'لا توجد فواتير مطابقة للبحث' : 'No invoices matching your criteria'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-xs text-right dir-rtl:text-right dir-ltr:text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">{isAr ? 'رقم الفاتورة' : 'Invoice #'}</th>
                        <th className="p-3">{isAr ? 'المريض' : 'Patient'}</th>
                        <th className="p-3">{isAr ? 'نوع العميل' : 'Type'}</th>
                        <th className="p-3">{isAr ? 'إجمالي الخدمات' : 'Subtotal'}</th>
                        <th className="p-3">{isAr ? 'تغطية التأمين' : 'Insurance'}</th>
                        <th className="p-3">{isAr ? 'المستحق على المريض' : 'Patient Due'}</th>
                        <th className="p-3">{isAr ? 'المدفوع' : 'Paid'}</th>
                        <th className="p-3">{isAr ? 'المتبقي' : 'Remaining'}</th>
                        <th className="p-3">{isAr ? 'الحالة' : 'Status'}</th>
                        <th className="p-3 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                      {invoices.map((inv) => (
                        <tr
                          key={inv.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="p-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {inv.invoice_number}
                          </td>
                          <td className="p-3 font-medium">
                            {inv.patient_name || '—'}
                            {inv.patient_code && (
                              <span className="block text-[10px] text-slate-400 font-mono">
                                {inv.patient_code}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {inv.patient_type === 'insured' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                {inv.insurance_company_name || (isAr ? 'مؤمن' : 'Insured')}
                              </span>
                            ) : (
                              <span className="text-slate-500 dark:text-slate-400">
                                {isAr ? 'نقدي (Cash)' : 'Cash'}
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-semibold">{inv.subtotal_amount.toLocaleString()} ج.م</td>
                          <td className="p-3 text-slate-500">{inv.insurance_total_amount.toLocaleString()} ج.م</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            {inv.final_payable_amount.toLocaleString()} ج.م
                          </td>
                          <td className="p-3 text-emerald-600 dark:text-emerald-400 font-semibold">
                            {inv.paid_amount.toLocaleString()} ج.م
                          </td>
                          <td className="p-3 font-semibold text-rose-600 dark:text-rose-400">
                            {inv.remaining_balance.toLocaleString()} ج.م
                          </td>
                          <td className="p-3">{renderStatusBadge(inv.status)}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInvoiceId(inv.id);
                                setView('detail');
                              }}
                              className="px-2.5 py-1 text-xs font-medium rounded-md text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                            >
                              {isAr ? 'عرض التفاصيل' : 'View Details'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: INVOICE DETAILS & SUMMARY */}
          {view === 'detail' && selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-800/60 dark:to-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">
                      {selectedInvoice.invoice_number}
                    </span>
                    {renderStatusBadge(selectedInvoice.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <strong>{isAr ? 'المريض:' : 'Patient:'}</strong> {selectedInvoice.patient_name} ({selectedInvoice.patient_code})
                    </span>
                    {selectedInvoice.doctor_name && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <strong>{isAr ? 'الطبيب:' : 'Doctor:'}</strong> {selectedInvoice.doctor_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <strong>{isAr ? 'التاريخ:' : 'Date:'}</strong> {new Date(selectedInvoice.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                    </span>
                  </div>

                  {selectedInvoice.patient_type === 'insured' && (
                    <div className="mt-2 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 inline-flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>
                        <strong>{selectedInvoice.insurance_company_name}</strong>
                        {selectedInvoice.insurance_plan_name && ` — ${selectedInvoice.insurance_plan_name}`}
                        {selectedInvoice.policy_number && ` (${selectedInvoice.policy_number})`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Printer className="w-4 h-4 text-slate-500" />
                    {isAr ? 'طباعة الفاتورة' : 'Print Invoice'}
                  </button>
                  <button
                    type="button"
                    onClick={() => alert(isAr ? 'جاري تحميل ملف PDF للفاتورة...' : 'Downloading PDF invoice...')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    {isAr ? 'تحميل PDF' : 'Download PDF'}
                  </button>
                </div>
              </div>

              {/* Invoice Items Table (Transaction-time snapshot values preserved!) */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  {isAr ? 'بنود الخدمات الفطرية بالفاتورة (أسعار وقيم محسومة لا تتغير)' : 'Invoice Itemized Services (Preserved Transaction-time Snapshot)'}
                </h3>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-xs text-right dir-rtl:text-right dir-ltr:text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">{isAr ? 'كود الخدمة' : 'Service Code'}</th>
                        <th className="p-3">{isAr ? 'اسم الخدمة السنية' : 'Dental Service Name'}</th>
                        <th className="p-3 text-center">{isAr ? 'الكمية' : 'Qty'}</th>
                        <th className="p-3">{isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
                        <th className="p-3">{isAr ? 'الإجمالي القائم' : 'Gross Amount'}</th>
                        <th className="p-3">{isAr ? 'تغطية التأمين (%)' : 'Insurance Coverage (%)'}</th>
                        <th className="p-3">{isAr ? 'مبلغ التأمين' : 'Insurance Amt'}</th>
                        <th className="p-3">{isAr ? 'حصة المريض (Copay)' : 'Patient Copay'}</th>
                        <th className="p-3">{isAr ? 'المستحق النهائي' : 'Final Payable'}</th>
                        <th className="p-3 text-center">{isAr ? 'حالة الموافقة' : 'Approval'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                      {selectedInvoice.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-mono text-slate-500">{item.service_code}</td>
                          <td className="p-3 font-medium">
                            {isAr ? item.service_name_ar : item.service_name_en}
                          </td>
                          <td className="p-3 text-center font-bold">{item.quantity}</td>
                          <td className="p-3">{item.unit_price.toLocaleString()} ج.م</td>
                          <td className="p-3 font-semibold">{item.gross_amount.toLocaleString()} ج.م</td>
                          <td className="p-3">
                            {item.insurance_percentage > 0 ? (
                              <span className="text-emerald-600 font-bold">{item.insurance_percentage}%</span>
                            ) : (
                              <span className="text-slate-400">0%</span>
                            )}
                          </td>
                          <td className="p-3 text-emerald-600 dark:text-emerald-400 font-medium">
                            {item.insurance_amount.toLocaleString()} ج.م
                          </td>
                          <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                            {item.patient_copay_amount.toLocaleString()} ج.م
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            {item.final_payable_amount.toLocaleString()} ج.م
                          </td>
                          <td className="p-3 text-center">
                            {item.approval_status === 'approved' && (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 font-medium">
                                {isAr ? 'موافق عليه' : 'Approved'}
                              </span>
                            )}
                            {item.approval_status === 'pending' && (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 font-medium">
                                {isAr ? 'قيد الموافقة' : 'Pending'}
                              </span>
                            )}
                            {item.approval_status === 'cash' && (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium">
                                {isAr ? 'نقدي' : 'Cash'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* REUSE INVOICE SUMMARY COMPONENT */}
              <div className="pt-2">
                <InvoiceSummary
                  serviceCost={selectedInvoice.subtotal_amount}
                  insuranceCoveragePercent={
                    selectedInvoice.subtotal_amount > 0
                      ? Math.round((selectedInvoice.insurance_total_amount / selectedInvoice.subtotal_amount) * 100)
                      : 0
                  }
                  insuranceAmount={selectedInvoice.insurance_total_amount}
                  patientCopayAmount={selectedInvoice.patient_total_amount}
                  discountAmount={selectedInvoice.discount_total_amount}
                  taxAmount={selectedInvoice.tax_total_amount}
                  finalPayableAmount={selectedInvoice.final_payable_amount}
                  currency={selectedInvoice.currency}
                  insuranceCompany={selectedInvoice.insurance_company_name}
                  insurancePlan={selectedInvoice.insurance_plan_name}
                  policyNumber={selectedInvoice.policy_number}
                  approvalStatus={
                    selectedInvoice.patient_type === 'insured' ? 'approved' : 'cash'
                  }
                  items={selectedInvoice.items.map((i) => ({
                    id: i.id,
                    code: i.service_code,
                    name_ar: i.service_name_ar,
                    name_en: i.service_name_en,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                    total_price: i.gross_amount,
                  }))}
                  showItemizedList={false}
                />

                <CommissionCostBreakdown invoice={selectedInvoice} />
              </div>

              {/* PAYMENT COLLECTION SECTION & HISTORICAL PAYMENT AUDIT LOG */}
              <div className="space-y-4">
                {selectedInvoice.remaining_balance > 0 && selectedInvoice.status !== 'cancelled' && (
                  <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-amber-600" />
                        {isAr ? 'تحصيل دفعة مالية (جزئية / كليّة)' : 'Patient Payment Collection'}
                      </h4>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300">
                        {isAr
                          ? 'تحصيل نقدي، بطاقة ائتمانية، تحويل بنكي، أو محفظة إلكترونية مع تسجيل الموظف المستلم'
                          : 'Record cash, card, bank, or wallet payment with authenticated user logging'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        {isAr ? 'المتبقي:' : 'Due:'} {selectedInvoice.remaining_balance.toLocaleString()} ج.م
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPaymentModal(true)}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 transition-colors shadow-sm"
                      >
                        <DollarSign className="w-4 h-4" />
                        {isAr ? 'فتح شاشة التحصيل (Payment Modal)' : 'Open Payment Modal'}
                      </button>
                    </div>
                  </div>
                )}

                {/* PAYMENT HISTORY AUDIT TRAIL */}
                {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      {isAr ? 'سجل الدفعات المحصلة لهذه الفاتورة' : 'Payment History Audit Trail'}
                    </h4>

                    <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                      {selectedInvoice.payments.map((p) => (
                        <div key={p.id} className="py-2 flex items-center justify-between text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              +{p.amount.toLocaleString()} ج.م
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-800 font-semibold uppercase">
                              {p.payment_method === 'cash' ? (isAr ? 'نقدي' : 'Cash') :
                               p.payment_method === 'card' ? (isAr ? 'بطاقة' : 'Card') :
                               p.payment_method === 'bank' ? (isAr ? 'بنكي' : 'Bank') : (isAr ? 'محفظة' : 'Wallet')}
                            </span>
                            {p.reference_number && (
                              <span className="font-mono text-[10px] text-slate-500">
                                #{p.reference_number}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 flex items-center gap-3">
                            {p.received_by_name && (
                              <span>
                                {isAr ? 'استلم بواسطة:' : 'By:'} <strong>{p.received_by_name}</strong>
                              </span>
                            )}
                            <span>{new Date(p.created_at).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 3: CREATE NEW INVOICE */}
          {view === 'create' && (
            <form onSubmit={handleCreateInvoice} className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  {isAr ? '1. بيانات المريض وتأمين الفاتورة' : '1. Patient & Insurance Details'}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Select Patient */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'المريض *' : 'Patient *'}
                    </label>
                    <select
                      value={newPatientId}
                      onChange={(e) => {
                        const pId = e.target.value;
                        setNewPatientId(pId);
                        const pat = patients.find((p) => p.id === pId);
                        if (pat?.insurance_company) {
                          setNewPatientType('insured');
                          setNewInsuranceCompany(pat.insurance_company);
                        } else {
                          setNewPatientType('cash');
                          setNewInsuranceCompany('');
                        }
                      }}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      required
                    >
                      <option value="">{isAr ? '-- اختر المريض --' : '-- Select Patient --'}</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.first_name} {p.last_name} ({p.patient_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Doctor */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'الطبيب المعالج' : 'Attending Doctor'}
                    </label>
                    <select
                      value={newDoctorId}
                      onChange={(e) => setNewDoctorId(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">{isAr ? '-- اختر الطبيب --' : '-- Select Doctor --'}</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.display_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Patient Billing Type */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'نوع الفاتورة' : 'Billing Type'}
                    </label>
                    <select
                      value={newPatientType}
                      onChange={(e) => setNewPatientType(e.target.value as InvoicePatientType)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold"
                    >
                      <option value="cash">{isAr ? 'نقدي (Cash)' : 'Cash'}</option>
                      <option value="insured">{isAr ? 'تأمين طبي (Insured)' : 'Insured'}</option>
                    </select>
                  </div>

                  {/* Insurance Fields if Insured */}
                  {newPatientType === 'insured' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          {isAr ? 'شركة التأمين' : 'Insurance Company'}
                        </label>
                        <input
                          type="text"
                          value={newInsuranceCompany}
                          onChange={(e) => setNewInsuranceCompany(e.target.value)}
                          placeholder={isAr ? 'مثال: أكسا مصر / بوبا' : 'e.g. AXA Egypt / Bupa'}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          {isAr ? 'رقم البطاقة / الوثيقة' : 'Policy / Member ID'}
                        </label>
                        <input
                          type="text"
                          value={newPolicyNumber}
                          onChange={(e) => setNewPolicyNumber(e.target.value)}
                          placeholder="POL-123456"
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Service Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {isAr ? '2. اختيار الخدمات السنية للفاتورة' : '2. Select Invoice Dental Services'}
                  </h3>

                  <div className="flex items-center gap-2">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          addServiceLine(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 font-medium focus:outline-none"
                    >
                      <option value="">{isAr ? '+ إضافة خدمة سنية...' : '+ Add Service...'}</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} - {isAr ? s.name_ar : s.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedServices.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-400 text-xs">
                    {isAr
                      ? 'قم باختيار خدمة سنية واحدة أو أكثر لإضافتها إلى بند الفاتورة'
                      : 'Select one or more dental services to add to this invoice'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedServices.map((item, idx) => {
                      const srv = services.find((s) => s.id === item.serviceId);
                      const res = resolvePricing({
                        organizationId: orgId,
                        patientId: newPatientId,
                        serviceId: item.serviceId,
                        patientInsuranceCompanyId: newInsuranceCompany,
                      });

                      return (
                        <div
                          key={item.serviceId}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                              <span className="font-mono text-blue-600 dark:text-blue-400">
                                {srv?.code}
                              </span>
                              <span>{isAr ? srv?.name_ar : srv?.name_en}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex gap-3">
                              <span>
                                {isAr ? 'السعر القائم:' : 'List Price:'} {res.total_price} ج.م
                              </span>
                              {newPatientType === 'insured' && (
                                <span className="text-emerald-600 font-medium">
                                  {isAr ? 'تغطية التأمين:' : 'Insurance:'} {res.coverage_percentage}% ({res.insurance_coverage} ج.م)
                                </span>
                              )}
                              <span className="text-slate-800 dark:text-slate-200 font-medium">
                                {isAr ? 'حصة المريض:' : 'Copay:'} {res.patient_copay} ج.م
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.quantity > 1) {
                                    setSelectedServices((prev) =>
                                      prev.map((i) =>
                                        i.serviceId === item.serviceId
                                          ? { ...i, quantity: i.quantity - 1 }
                                          : i
                                      )
                                    );
                                  }
                                }}
                                className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                -
                              </button>
                              <span className="px-3 font-bold">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedServices((prev) =>
                                    prev.map((i) =>
                                      i.serviceId === item.serviceId
                                        ? { ...i, quantity: i.quantity + 1 }
                                        : i
                                    )
                                  );
                                }}
                                className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeServiceLine(item.serviceId)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Discount & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'خصم إضافي (ج.م)' : 'Additional Discount (EGP)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newDiscount}
                    onChange={(e) => setNewDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'ملاحظات الفاتورة' : 'Invoice Notes'}
                  </label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder={isAr ? 'أي تفاصيل خاصة بالسداد...' : 'Payment or invoice notes...'}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  {isAr ? 'إصدار الفاتورة وحفظها' : 'Issue & Save Invoice'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoice={selectedInvoice}
        onPaymentSuccess={() => {
          refresh();
        }}
      />

      <CommissionCostManagementModal
        isOpen={showCommissionCostModal}
        onClose={() => setShowCommissionCostModal(false)}
        onUpdated={() => {
          refresh();
        }}
      />
    </div>
  );
};
