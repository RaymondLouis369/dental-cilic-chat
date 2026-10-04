import React, { useState, useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientAuth } from './PatientAuthContext';
import { getPatientFinancialPortalData } from '../../lib/financeAndInsuranceStorage';
import { Invoice } from '../../types/receptionAndBilling';
import {
  Wallet,
  Award,
  Shield,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  DollarSign,
  Printer,
  ChevronDown,
  ChevronUp,
  Receipt,
  CreditCard,
  Building2,
  Lock,
  User,
} from 'lucide-react';

export const PatientFinancialPortal: React.FC = () => {
  const { language } = useLanguage();
  const { session } = usePatientAuth();
  const isAr = language === 'ar';

  const authPatient = session?.authenticatedPatient;
  const targetPatient = session?.selectedPatient;
  const organizationId = session?.organization?.id;

  const [activeSubTab, setActiveTab] = useState<'overview' | 'statement' | 'invoices' | 'wallet' | 'loyalty' | 'insurance'>('overview');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Fetch sanitized financial portal data using RLS-enforced storage function
  const financialData = useMemo(() => {
    if (!authPatient?.id || !targetPatient?.id || !organizationId) {
      return null;
    }
    return getPatientFinancialPortalData(authPatient.id, targetPatient.id, organizationId);
  }, [authPatient?.id, targetPatient?.id, organizationId]);

  if (!financialData || !financialData.allowed) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
        <Lock className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="font-bold text-rose-800 text-lg">
          {isAr ? 'غير مصرح بالوصول للسجلات المالية' : 'Financial Access Denied'}
        </h3>
        <p className="text-sm text-rose-600 max-w-md mx-auto">
          {financialData?.error || (isAr ? 'لا تملك الصلاحية الكافية لمطالعة الحسابات المالية لهذا الملف' : 'Unauthorized financial record access.')}
        </p>
      </div>
    );
  }

  const { summary, statement, invoices, wallet, walletTransactions, loyaltyAccount, loyaltyTransactions, priorApprovals } = financialData;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{isAr ? 'مدفوعة' : 'Paid'}</span>;
      case 'partially_paid':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">{isAr ? 'مدفوعة جزئياً' : 'Partially Paid'}</span>;
      case 'unpaid':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">{isAr ? 'غير مدفوعة' : 'Unpaid'}</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const handlePrintReceipt = (inv: Invoice) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="${isAr ? 'rtl' : 'ltr'}">
        <head>
          <title>${isAr ? 'إيصال سداد - ' : 'Payment Receipt - '}${inv.invoice_number}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
            .details { margin-bottom: 20px; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: ${isAr ? 'right' : 'left'}; }
            th { background: #f8fafc; }
            .totals { float: ${isAr ? 'left' : 'right'}; width: 250px; }
            .total-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
            .grand-total { font-weight: bold; font-size: 16px; border-top: 2px solid #0f766e; color: #0f766e; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${session?.organization?.name || 'مركز طب الأسنان'}</h2>
            <p>${isAr ? 'إيصال فاتورة وسداد مالي' : 'Official Invoice & Payment Receipt'}</p>
          </div>
          <div class="details">
            <div>
              <p><strong>${isAr ? 'رقم الفاتورة:' : 'Invoice No:'}</strong> ${inv.invoice_number}</p>
              <p><strong>${isAr ? 'اسم المريض:' : 'Patient Name:'}</strong> ${inv.patient_name || targetPatient?.first_name + ' ' + targetPatient?.last_name}</p>
              <p><strong>${isAr ? 'كود المريض:' : 'Patient Code:'}</strong> ${inv.patient_code || targetPatient?.patient_code}</p>
            </div>
            <div>
              <p><strong>${isAr ? 'التاريخ:' : 'Date:'}</strong> ${new Date(inv.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</p>
              <p><strong>${isAr ? 'الطبيب:' : 'Doctor:'}</strong> ${inv.doctor_name || '-'}</p>
              <p><strong>${isAr ? 'نوع الحساب:' : 'Patient Type:'}</strong> ${inv.patient_type === 'insured' ? (isAr ? 'مؤمن عليه' : 'Insured') : (isAr ? 'نقدي' : 'Cash')}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>${isAr ? 'الخدمة السنية' : 'Dental Service'}</th>
                <th>${isAr ? 'الكمية' : 'Qty'}</th>
                <th>${isAr ? 'السعر الإجمالي' : 'Gross Price'}</th>
                <th>${isAr ? 'تغطية التأمين' : 'Insurance'}</th>
                <th>${isAr ? 'حصة المريض' : 'Patient Copay'}</th>
              </tr>
            </thead>
            <tbody>
              ${inv.items.map((item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${isAr ? item.service_name_ar : item.service_name_en}</td>
                  <td>${item.quantity}</td>
                  <td>${item.gross_amount} ج.م</td>
                  <td>${item.insurance_amount} ج.م</td>
                  <td>${item.patient_copay_amount} ج.م</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div class="total-row"><span>${isAr ? 'الإجمالي:' : 'Subtotal:'}</span> <span>${inv.subtotal_amount} ج.م</span></div>
            <div class="total-row"><span>${isAr ? 'تغطية التأمين:' : 'Insurance Total:'}</span> <span>${inv.insurance_total_amount} ج.م</span></div>
            <div class="total-row"><span>${isAr ? 'المدفوع:' : 'Total Paid:'}</span> <span>${inv.paid_amount} ج.م</span></div>
            <div class="total-row grand-total"><span>${isAr ? 'المتبقي:' : 'Remaining:'}</span> <span>${inv.remaining_balance} ج.م</span></div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-200 border border-teal-400/30">
                {isAr ? 'البوابة المالية للعملاء' : 'Patient Financial Portal'}
              </span>
              <span className="text-xs text-teal-300">| {targetPatient?.first_name} {targetPatient?.last_name}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {isAr ? 'الحسابات والمحفظة والبرامج' : 'Financial Statement & Wallet'}
            </h2>
            <p className="text-sm text-teal-100/80 mt-1 max-w-xl">
              {isAr
                ? 'استعراض دقيق وشامل لجميع الفواتير، المدفوعات، رصيد المحفظة المسبقة، نقاط الولاء والتغطيات التأمينية'
                : 'Comprehensive overview of invoices, payments, prepaid wallet, loyalty rewards, and active insurance claims.'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 min-w-[200px] text-center">
            <span className="text-xs text-teal-200 font-medium block">
              {isAr ? 'المبلغ المتبقي المالي المستحق' : 'Current Outstanding Balance'}
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {summary?.current_outstanding_balance || 0} <span className="text-sm font-normal text-teal-200">ج.م</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'overview', label: isAr ? 'الملخص المالي' : 'Overview', icon: DollarSign },
          { id: 'statement', label: isAr ? 'كشف الحساب' : 'Account Statement', icon: FileText },
          { id: 'invoices', label: isAr ? 'الفواتير والإيصالات' : 'Invoices & Receipts', icon: Receipt },
          { id: 'wallet', label: isAr ? 'المحفظة المسبقة' : 'Prepaid Wallet', icon: Wallet },
          { id: 'loyalty', label: isAr ? 'نقاط الولاء' : 'Loyalty Rewards', icon: Award },
          { id: 'insurance', label: isAr ? 'التأمين والموافقات' : 'Insurance & Approvals', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              id={`tab-fin-${tab.id}`}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-medium block">{isAr ? 'إجمالي الفواتير' : 'Total Invoiced'}</span>
              <div className="text-xl font-bold text-slate-900">{summary?.total_invoiced || 0} ج.م</div>
              <span className="text-[11px] text-slate-400 block">{isAr ? 'مجموع فواتير الخدمات السنية' : 'Gross billed dental treatments'}</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-medium block">{isAr ? 'إجمالي المسدد' : 'Total Paid'}</span>
              <div className="text-xl font-bold text-emerald-600">{summary?.total_paid || 0} ج.م</div>
              <span className="text-[11px] text-slate-400 block">{isAr ? 'المبالغ المسددة بالفعل' : 'Total payments received'}</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-medium block">{isAr ? 'رصيد المحفظة المسبقة' : 'Wallet Balance'}</span>
              <div className="text-xl font-bold text-teal-600">{summary?.wallet_balance || 0} ج.م</div>
              <span className="text-[11px] text-slate-400 block">{isAr ? 'متاح للسداد المباشر' : 'Available prepaid balance'}</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-medium block">{isAr ? 'نقاط المكافآت' : 'Loyalty Points'}</span>
              <div className="text-xl font-bold text-purple-600">{summary?.loyalty_points || 0} {isAr ? 'نقطة' : 'pts'}</div>
              <span className="text-[11px] text-slate-400 block">{isAr ? 'برنامج الولاء والخصومات' : 'Available loyalty points'}</span>
            </div>
          </div>

          {/* Breakdown Summary Box */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'توزيع التغطية والمساهمة التأمينية' : 'Insurance & Copay Financial Breakdown'}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-500 block">{isAr ? 'المبلغ المغطى تأمينياً' : 'Insurance Covered Amount'}</span>
                  <span className="font-bold text-slate-900 text-base">{summary?.insurance_covered_amount || 0} ج.م</span>
                </div>
                <Shield className="w-6 h-6 text-teal-600" />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-500 block">{isAr ? 'حصة المريض (النسبة التحملية)' : 'Patient Copay Total'}</span>
                  <span className="font-bold text-slate-900 text-base">{summary?.patient_copay_amount || 0} ج.م</span>
                </div>
                <User className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACCOUNT STATEMENT */}
      {activeSubTab === 'statement' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              <span>{isAr ? 'كشف الحساب المالي الزمني' : 'Chronological Account Statement'}</span>
            </h3>
            <span className="text-xs text-slate-500">{statement?.length || 0} {isAr ? 'حركة تسجيلية' : 'entries'}</span>
          </div>

          {statement && statement.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 text-center">#</th>
                    <th className="p-3.5">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="p-3.5">{isAr ? 'المرجع / البيان' : 'Reference / Description'}</th>
                    <th className="p-3.5 text-rose-600">{isAr ? 'مدين (مستحق)' : 'Debit (+Debt)'}</th>
                    <th className="p-3.5 text-emerald-600">{isAr ? 'دائن (سداد)' : 'Credit (-Debt)'}</th>
                    <th className="p-3.5 text-teal-700">{isAr ? 'الرصيد المتبقي' : 'Running Balance'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {statement.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3.5 font-medium text-slate-700 whitespace-nowrap">
                        {new Date(item.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900">{isAr ? item.description_ar : item.description_en}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{item.reference_number}</div>
                      </td>
                      <td className="p-3.5 font-bold text-rose-600 whitespace-nowrap">
                        {item.debit_amount > 0 ? `${item.debit_amount} ج.م` : '-'}
                      </td>
                      <td className="p-3.5 font-bold text-emerald-600 whitespace-nowrap">
                        {item.credit_amount > 0 ? `${item.credit_amount} ج.م` : '-'}
                      </td>
                      <td className="p-3.5 font-extrabold text-teal-800 whitespace-nowrap">
                        {item.running_balance} ج.م
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm">
              {isAr ? 'لا توجد حرَكات مالية مسجلة بكشف الحساب حالياً' : 'No account statement records found.'}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INVOICES */}
      {activeSubTab === 'invoices' && (
        <div className="space-y-4">
          {invoices && invoices.length > 0 ? (
            invoices.map((inv) => (
              <div key={inv.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-teal-300">
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">{inv.invoice_number}</span>
                      {getStatusBadge(inv.status)}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>{isAr ? 'التاريخ:' : 'Date:'} {new Date(inv.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                      <span>•</span>
                      <span>{isAr ? 'الطبيب:' : 'Doctor:'} {inv.doctor_name || '-'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">{isAr ? 'المستحق النهائي' : 'Patient Payable'}</span>
                      <span className="font-bold text-teal-700 text-base">{inv.patient_total_amount} ج.م</span>
                    </div>

                    <button
                      onClick={() => handlePrintReceipt(inv)}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title={isAr ? 'طباعة إيصال الفاتورة' : 'Print Receipt'}
                    >
                      <Printer className="w-4 h-4" />
                      <span className="hidden sm:inline">{isAr ? 'إيصال' : 'Receipt'}</span>
                    </button>
                  </div>
                </div>

                {/* Items Summary Table */}
                <div className="p-4 bg-slate-50/50 overflow-x-auto">
                  <table className="w-full text-xs text-right">
                    <thead className="text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="pb-2">{isAr ? 'الخدمة السنية' : 'Service'}</th>
                        <th className="pb-2 text-center">{isAr ? 'الكمية' : 'Qty'}</th>
                        <th className="pb-2">{isAr ? 'السعر الكلي' : 'Gross'}</th>
                        <th className="pb-2 text-teal-600">{isAr ? 'التأمين' : 'Insurance'}</th>
                        <th className="pb-2 text-slate-900">{isAr ? 'حصة المريض' : 'Copay'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inv.items.map((it) => (
                        <tr key={it.id}>
                          <td className="py-2 font-medium text-slate-800">{isAr ? it.service_name_ar : it.service_name_en}</td>
                          <td className="py-2 text-center text-slate-600">{it.quantity}</td>
                          <td className="py-2 text-slate-600">{it.gross_amount} ج.م</td>
                          <td className="py-2 text-teal-600 font-medium">{it.insurance_amount} ج.م</td>
                          <td className="py-2 font-bold text-slate-900">{it.patient_copay_amount} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-500 text-sm border border-slate-200">
              {isAr ? 'لا توجد فواتير مالية مسجلة' : 'No invoices found.'}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: WALLET */}
      {activeSubTab === 'wallet' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">{isAr ? 'المحفظة المسبقة الدفع' : 'Prepaid Patient Wallet'}</h3>
                <p className="text-xs text-slate-500">{isAr ? 'رصيد مالي مسبق يُستخدم لسداد خدمات العيادة فورياً' : 'Prepaid balance used for instant invoice payments.'}</p>
              </div>
            </div>

            <div className="text-right bg-teal-50/50 p-3.5 px-6 rounded-2xl border border-teal-100">
              <span className="text-xs text-teal-700 block font-medium">{isAr ? 'الرصيد المتاح' : 'Available Balance'}</span>
              <span className="text-2xl font-extrabold text-teal-800">{wallet?.balance || 0} ج.م</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h4 className="font-bold text-slate-900 text-sm">{isAr ? 'سجل حرَكات المحفظة' : 'Wallet Transaction History'}</h4>
            </div>

            {walletTransactions && walletTransactions.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {walletTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          tx.type === 'credit' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {tx.type === 'credit' ? (isAr ? 'إيداع (+)' : 'Credit (+)') : (isAr ? 'خصم (-)' : 'Debit (-)')}
                        </span>
                        <span className="font-semibold text-slate-900 text-xs">{tx.notes || tx.reference}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 block">
                        {new Date(tx.created_at).toLocaleString(isAr ? 'ar-EG' : 'en-US')} • {tx.created_by_name || tx.created_by}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className={`font-bold text-sm block ${tx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'credit' ? `+${tx.amount}` : `-${tx.amount}`} ج.م
                      </span>
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'الرصيد بعد:' : 'Balance after:'} {tx.balance_after} ج.م</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-sm">
                {isAr ? 'لا توجد حرَكات مسجلة بالمحفظة' : 'No wallet transactions found.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: LOYALTY */}
      {activeSubTab === 'loyalty' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">{isAr ? 'برنامج المكافآت والولاء' : 'Loyalty Rewards Program'}</h3>
                <p className="text-xs text-slate-500">{isAr ? 'اكتسب نقاطاً عند كل سداد للخدمات واستبدلها بخصومات' : 'Earn loyalty points on paid invoices and redeem for discounts.'}</p>
              </div>
            </div>

            <div className="text-right bg-purple-50/50 p-3.5 px-6 rounded-2xl border border-purple-100">
              <span className="text-xs text-purple-700 block font-medium">{isAr ? 'النقاط الحالية' : 'Current Points'}</span>
              <span className="text-2xl font-extrabold text-purple-800">{loyaltyAccount?.current_points || 0} {isAr ? 'نقطة' : 'pts'}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h4 className="font-bold text-slate-900 text-sm">{isAr ? 'سجل اكتساب واستبدال النقاط' : 'Loyalty Points Log'}</h4>
            </div>

            {loyaltyTransactions && loyaltyTransactions.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {loyaltyTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          tx.type === 'earn' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {tx.type === 'earn' ? (isAr ? 'اكتساب' : 'Earned') : (isAr ? 'استبدال' : 'Redeemed')}
                        </span>
                        <span className="font-semibold text-slate-900 text-xs">{tx.notes}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 block">
                        {new Date(tx.created_at).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className={`font-bold text-sm block ${tx.points > 0 ? 'text-purple-600' : 'text-amber-600'}`}>
                        {tx.points > 0 ? `+${tx.points}` : tx.points} {isAr ? 'نقطة' : 'pts'}
                      </span>
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'الرصيد:' : 'Balance:'} {tx.points_balance_after}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-sm">
                {isAr ? 'لا توجد حرَكات مسجلة بنقاط الولاء' : 'No loyalty transactions found.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: INSURANCE & PRIOR APPROVALS */}
      {activeSubTab === 'insurance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{isAr ? 'التغطية التأمينية والموافقات المسبقة' : 'Insurance Coverage & Prior Approvals'}</h3>
              <p className="text-xs text-slate-500">
                {targetPatient?.insurance_company
                  ? `${isAr ? 'شركة التأمين المتعاقدة:' : 'Insurance Company:'} ${targetPatient.insurance_company}`
                  : (isAr ? 'لا توجد شركة تأمين مسجلة بالملف' : 'No primary insurance company listed.')}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h4 className="font-bold text-slate-900 text-sm">{isAr ? 'الموافقات التأمينية المسبقة' : 'Prior Approvals Status'}</h4>
            </div>

            {priorApprovals && priorApprovals.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {priorApprovals.map((pa) => (
                  <div key={pa.id} className="p-5 space-y-3 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{pa.approval_number}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            pa.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : pa.status === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {pa.status === 'approved' ? (isAr ? 'معتمدة' : 'Approved') : pa.status === 'rejected' ? (isAr ? 'مرفوضة' : 'Rejected') : (isAr ? 'قيد المراجعة' : 'Pending')}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 block mt-0.5">
                          {pa.insurance_company_name} • {pa.policy_number || ''}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">{isAr ? 'المبلغ المعتمد' : 'Approved Amount'}</span>
                        <span className="font-bold text-teal-700 text-base">{pa.total_approved_amount} ج.م</span>
                      </div>
                    </div>

                    {/* Approval Items */}
                    <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                      {pa.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-800">{isAr ? item.service_name_ar : item.service_name_en}</span>
                          <span className="text-slate-600 font-semibold">{item.approved_amount || item.requested_amount} ج.م</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-sm">
                {isAr ? 'لا توجد طلبات موافقة مسبقة مسجلة' : 'No prior approvals found.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
