import React from 'react';
import {
  Receipt,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Printer,
  Download,
  Percent,
  FileText,
  Building2,
  BadgeAlert,
} from 'lucide-react';
import { useLanguage } from '../modules/i18n/LanguageContext';

export interface InvoiceItem {
  id?: string;
  code?: string;
  name_ar?: string;
  name_en?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
}

export type InsuranceApprovalStatus = 'approved' | 'pending' | 'rejected' | 'cash';

export interface InvoiceSummaryProps {
  /** Total service cost before insurance & discounts (in EGP or specified currency) */
  serviceCost?: number;

  /** Itemized list of services (optional) */
  items?: InvoiceItem[];

  /** Insurance coverage percentage (0 to 100). E.g., 80 for 80% */
  insuranceCoveragePercent?: number;

  /** Insurance amount covered by insurance company in EGP (auto-calculated if omitted) */
  insuranceAmount?: number;

  /** Patient copay percentage (0 to 100). E.g., 20 for 20% */
  patientCopayPercent?: number;

  /** Patient copay amount in EGP (auto-calculated if omitted) */
  patientCopayAmount?: number;

  /** Additional discount amount in EGP */
  discountAmount?: number;

  /** Additional discount percentage (if applicable) */
  discountPercent?: number;

  /** Tax or VAT amount in EGP */
  taxAmount?: number;

  /** Tax or VAT percentage (e.g., 14 for 14% VAT) */
  vatPercent?: number;

  /** Final net payable amount by patient (auto-calculated if omitted) */
  finalPayableAmount?: number;

  /** Currency display symbol/code. Default: 'EGP' / 'ج.م' */
  currency?: string;

  /** Insurance company / provider name (e.g. "Bupa Egypt", "MetLife") */
  insuranceCompany?: string;

  /** Insurance plan name (e.g. "Gold Plan 80/20") */
  insurancePlan?: string;

  /** Policy / Member ID string */
  policyNumber?: string;

  /** Approval claim status badge */
  approvalStatus?: InsuranceApprovalStatus;

  /** Explicit language choice ('ar' | 'en'). Auto-detects from LanguageContext if omitted */
  language?: 'ar' | 'en';

  /** Explicit layout direction ('rtl' | 'ltr') */
  dir?: 'rtl' | 'ltr';

  /** Whether to show itemized list of services (default: true if items are provided) */
  showItemizedList?: boolean;

  /** Compact mode for modals or sidebars */
  compact?: boolean;

  /** Hide header card bar */
  hideHeader?: boolean;

  /** Custom title override */
  title?: string;

  /** Custom container wrapper class name */
  className?: string;

  /** Callback when print button is clicked */
  onPrint?: () => void;

  /** Callback when download PDF/Receipt button is clicked */
  onDownload?: () => void;

  /** Callback when pay/checkout button is clicked */
  onPay?: () => void;

  /** Custom label for primary payment action button */
  payButtonLabel?: string;
}

/**
 * Format currency with proper Arabic/English digits and currency symbols.
 */
export function formatInvoiceAmount(
  amount: number,
  language: 'ar' | 'en',
  customCurrency?: string
): string {
  const safeAmount = isNaN(amount) ? 0 : amount;

  // Format number
  const formattedNumber = new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);

  // Currency label
  const defaultSymbol = language === 'ar' ? 'ج.م' : 'EGP';
  const symbol = customCurrency || defaultSymbol;

  return language === 'ar' ? `${formattedNumber} ${symbol}` : `${symbol} ${formattedNumber}`;
}

/**
 * InvoiceSummary Component
 * Reusable financial breakdown component for dental clinic invoices, billing claims,
 * and treatment plan quotes.
 */
export const InvoiceSummary: React.FC<InvoiceSummaryProps> = ({
  serviceCost,
  items,
  insuranceCoveragePercent,
  insuranceAmount,
  patientCopayPercent,
  patientCopayAmount,
  discountAmount,
  discountPercent,
  taxAmount,
  vatPercent,
  finalPayableAmount,
  currency,
  insuranceCompany,
  insurancePlan,
  policyNumber,
  approvalStatus,
  language: explicitLanguage,
  dir: explicitDir,
  showItemizedList = true,
  compact = false,
  hideHeader = false,
  title,
  className = '',
  onPrint,
  onDownload,
  onPay,
  payButtonLabel,
}) => {
  // Try to use LanguageContext if available
  let contextLang: 'ar' | 'en' = 'ar';
  try {
    const context = useLanguage();
    if (context && context.language) {
      contextLang = context.language;
    }
  } catch {
    // Fallback if rendered outside LanguageProvider
  }

  const lang = explicitLanguage || contextLang;
  const isAr = lang === 'ar';
  const direction = explicitDir || (isAr ? 'rtl' : 'ltr');

  // Calculate items total if serviceCost is omitted
  const derivedSubtotal = React.useMemo(() => {
    if (typeof serviceCost === 'number') return serviceCost;
    if (items && items.length > 0) {
      return items.reduce((acc, item) => {
        if (typeof item.total_price === 'number') return acc + item.total_price;
        const qty = item.quantity ?? 1;
        const price = item.unit_price ?? 0;
        return acc + qty * price;
      }, 0);
    }
    return 0;
  }, [serviceCost, items]);

  // Compute coverage, copay, discount, tax, and net payable safely
  const effectiveSubtotal = Math.max(0, derivedSubtotal);

  // Coverage %
  const effectiveCoveragePercent = React.useMemo(() => {
    if (typeof insuranceCoveragePercent === 'number') {
      return Math.min(100, Math.max(0, insuranceCoveragePercent));
    }
    return insuranceCompany || insurancePlan ? 80 : 0;
  }, [insuranceCoveragePercent, insuranceCompany, insurancePlan]);

  // Copay %
  const effectiveCopayPercent = React.useMemo(() => {
    if (typeof patientCopayPercent === 'number') {
      return Math.min(100, Math.max(0, patientCopayPercent));
    }
    return Math.max(0, 100 - effectiveCoveragePercent);
  }, [patientCopayPercent, effectiveCoveragePercent]);

  // Insurance Amount
  const effectiveInsuranceAmount = React.useMemo(() => {
    if (typeof insuranceAmount === 'number') return insuranceAmount;
    return (effectiveSubtotal * effectiveCoveragePercent) / 100;
  }, [insuranceAmount, effectiveSubtotal, effectiveCoveragePercent]);

  // Patient Copay Amount
  const rawCopayAmount = React.useMemo(() => {
    if (typeof patientCopayAmount === 'number') return patientCopayAmount;
    if (typeof insuranceAmount === 'number') {
      return Math.max(0, effectiveSubtotal - insuranceAmount);
    }
    return (effectiveSubtotal * effectiveCopayPercent) / 100;
  }, [patientCopayAmount, insuranceAmount, effectiveSubtotal, effectiveCopayPercent]);

  // Extra Discount
  const effectiveDiscount = React.useMemo(() => {
    if (typeof discountAmount === 'number') return discountAmount;
    if (typeof discountPercent === 'number') {
      return (rawCopayAmount * Math.min(100, Math.max(0, discountPercent))) / 100;
    }
    return 0;
  }, [discountAmount, discountPercent, rawCopayAmount]);

  const afterDiscountAmount = Math.max(0, rawCopayAmount - effectiveDiscount);

  // Tax/VAT
  const effectiveTax = React.useMemo(() => {
    if (typeof taxAmount === 'number') return taxAmount;
    if (typeof vatPercent === 'number') {
      return (afterDiscountAmount * Math.min(100, Math.max(0, vatPercent))) / 100;
    }
    return 0;
  }, [taxAmount, vatPercent, afterDiscountAmount]);

  // Final Net Payable Amount
  const computedFinalPayable = React.useMemo(() => {
    if (typeof finalPayableAmount === 'number') return finalPayableAmount;
    return afterDiscountAmount + effectiveTax;
  }, [finalPayableAmount, afterDiscountAmount, effectiveTax]);

  // Formatted Helper
  const fmt = (val: number) => formatInvoiceAmount(val, lang, currency);

  // Status Badge Helper
  const renderStatusBadge = () => {
    if (!approvalStatus && !insuranceCompany) return null;
    const status = approvalStatus || 'approved';

    let bg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    let icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    let text = isAr ? 'معتمد من التأمين' : 'Insurance Approved';

    if (status === 'pending') {
      bg = 'bg-amber-50 text-amber-800 border-amber-200';
      icon = <Clock className="w-4 h-4 text-amber-600" />;
      text = isAr ? 'قيد مراجعة الموافقة' : 'Approval Pending';
    } else if (status === 'rejected') {
      bg = 'bg-rose-50 text-rose-800 border-rose-200';
      icon = <XCircle className="w-4 h-4 text-rose-600" />;
      text = isAr ? 'المطالبة مرفوضة' : 'Claim Rejected';
    } else if (status === 'cash') {
      bg = 'bg-slate-100 text-slate-800 border-slate-200';
      icon = <CreditCard className="w-4 h-4 text-slate-600" />;
      text = isAr ? 'دفع نقدي مباشر' : 'Direct Cash Payment';
    }

    return (
      <span
        id="invoice-summary-status-badge"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${bg}`}
      >
        {icon}
        <span>{text}</span>
      </span>
    );
  };

  return (
    <div
      id="invoice-summary-card"
      dir={direction}
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-900 ${
        compact ? 'p-4' : 'p-6'
      } ${className}`}
    >
      {/* Header */}
      {!hideHeader && (
        <div
          id="invoice-summary-header"
          className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {title || (isAr ? 'ملخص الفاتورة والحساب' : 'Invoice & Billing Summary')}
              </h3>
              {insuranceCompany && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{insuranceCompany}</span>
                  {insurancePlan && <span className="text-slate-400">• {insurancePlan}</span>}
                  {policyNumber && <span className="text-slate-400">• ({policyNumber})</span>}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {renderStatusBadge()}

            {/* Quick Actions */}
            {(onPrint || onDownload) && (
              <div className="flex items-center gap-1">
                {onPrint && (
                  <button
                    id="invoice-summary-btn-print"
                    type="button"
                    onClick={onPrint}
                    title={isAr ? 'طباعة الفاتورة' : 'Print Invoice'}
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                )}
                {onDownload && (
                  <button
                    id="invoice-summary-btn-download"
                    type="button"
                    onClick={onDownload}
                    title={isAr ? 'تحميل الفاتورة' : 'Download Invoice'}
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Itemized Services Breakdown Table (Optional) */}
      {showItemizedList && items && items.length > 0 && (
        <div id="invoice-summary-itemized-section" className="mb-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            <span>{isAr ? 'تفاصيل الخدمات العلاجية' : 'Itemized Treatment Services'}</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-100 bg-slate-50/50">
            <table className="w-full text-xs text-right dir-rtl:text-right dir-ltr:text-left">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-500 bg-slate-100/60 font-medium">
                  <th className="py-2.5 px-3">{isAr ? 'الخدمة' : 'Service'}</th>
                  <th className="py-2.5 px-3 text-center">{isAr ? 'العدد' : 'Qty'}</th>
                  <th className="py-2.5 px-3 text-left dir-rtl:text-left dir-ltr:text-right">
                    {isAr ? 'السعر' : 'Unit Price'}
                  </th>
                  <th className="py-2.5 px-3 text-left dir-rtl:text-left dir-ltr:text-right">
                    {isAr ? 'الإجمالي' : 'Total'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {items.map((item, idx) => {
                  const name = isAr
                    ? item.name_ar || item.name_en || item.description
                    : item.name_en || item.name_ar || item.description;
                  const qty = item.quantity ?? 1;
                  const unitPrice = item.unit_price ?? 0;
                  const rowTotal = item.total_price ?? qty * unitPrice;

                  return (
                    <tr key={item.id || `item-${idx}`} className="hover:bg-slate-100/40">
                      <td className="py-2 px-3 font-medium text-slate-900">
                        <div className="flex items-center gap-1.5">
                          {item.code && (
                            <span className="font-mono text-[10px] bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded">
                              {item.code}
                            </span>
                          )}
                          <span>{name || (isAr ? 'خدمة طبية' : 'Dental Service')}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center font-mono">{qty}</td>
                      <td className="py-2 px-3 text-left dir-rtl:text-left dir-ltr:text-right font-mono text-slate-600">
                        {fmt(unitPrice)}
                      </td>
                      <td className="py-2 px-3 text-left dir-rtl:text-left dir-ltr:text-right font-mono font-semibold text-slate-900">
                        {fmt(rowTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Structured Cost Breakdown Lines */}
      <div id="invoice-summary-breakdown" className="space-y-2.5 text-sm">
        {/* 1. Gross Service Cost */}
        <div
          id="invoice-summary-line-subtotal"
          className="flex items-center justify-between text-slate-700 py-1"
        >
          <span className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-400" />
            <span>{isAr ? 'إجمالي قيمة الخدمات' : 'Total Service Costs'}</span>
          </span>
          <span className="font-mono font-semibold text-slate-900">
            {fmt(effectiveSubtotal)}
          </span>
        </div>

        {/* 2. Insurance Coverage Percentage & Share */}
        {effectiveCoveragePercent > 0 && (
          <div
            id="invoice-summary-line-insurance"
            className="flex items-center justify-between text-teal-800 bg-teal-50/70 px-3 py-2 rounded-xl border border-teal-100/80"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>
                {isAr ? 'تغطية شركة التأمين' : 'Insurance Coverage'}{' '}
                <span className="font-mono text-xs bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded-md font-semibold">
                  ({effectiveCoveragePercent}%)
                </span>
              </span>
            </span>
            <span className="font-mono font-bold text-teal-700">
              - {fmt(effectiveInsuranceAmount)}
            </span>
          </div>
        )}

        {/* 3. Patient Copay Percentage & Amount */}
        {effectiveCoveragePercent > 0 && (
          <div
            id="invoice-summary-line-copay"
            className="flex items-center justify-between text-slate-700 py-1"
          >
            <span className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-slate-400" />
              <span>
                {isAr ? 'نسبة تحمّل المريض' : 'Patient Copay Share'}{' '}
                <span className="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md">
                  ({effectiveCopayPercent}%)
                </span>
              </span>
            </span>
            <span className="font-mono font-medium text-slate-800">
              {fmt(rawCopayAmount)}
            </span>
          </div>
        )}

        {/* 4. Additional Discount */}
        {effectiveDiscount > 0 && (
          <div
            id="invoice-summary-line-discount"
            className="flex items-center justify-between text-emerald-800 bg-emerald-50/60 px-3 py-1.5 rounded-xl border border-emerald-100"
          >
            <span className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-emerald-600" />
              <span>
                {isAr ? 'خصم إضافي / تخفيض' : 'Additional Discount'}
                {discountPercent ? ` (${discountPercent}%)` : ''}
              </span>
            </span>
            <span className="font-mono font-semibold text-emerald-700">
              - {fmt(effectiveDiscount)}
            </span>
          </div>
        )}

        {/* 5. Tax / VAT */}
        {effectiveTax > 0 && (
          <div
            id="invoice-summary-line-vat"
            className="flex items-center justify-between text-slate-700 py-1"
          >
            <span className="flex items-center gap-2">
              <BadgeAlert className="w-4 h-4 text-slate-400" />
              <span>
                {isAr ? 'ضريبة القيمة المضافة' : 'VAT / Tax'}
                {vatPercent ? ` (${vatPercent}%)` : ''}
              </span>
            </span>
            <span className="font-mono font-medium text-slate-800">
              + {fmt(effectiveTax)}
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="pt-2 border-t border-slate-200 my-2" />

        {/* 6. Final Net Payable Amount Box */}
        <div
          id="invoice-summary-final-payable-box"
          className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-teal-900 to-slate-900 text-white shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-teal-300 backdrop-blur-sm">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-medium text-teal-200 uppercase tracking-wider block">
                {isAr ? 'المبلغ النهائي المطلوب سداده' : 'Final Payable Amount'}
              </span>
              <span className="text-xs text-slate-300">
                {isAr ? 'صافي الحساب المستحق على المريض' : 'Net amount due from patient'}
              </span>
            </div>
          </div>

          <div className="text-right dir-rtl:text-left dir-ltr:text-right">
            <span
              id="invoice-summary-final-amount"
              className="font-mono text-2xl font-black text-white tracking-tight block"
            >
              {fmt(computedFinalPayable)}
            </span>
          </div>
        </div>
      </div>

      {/* Pay Action Button (Optional) */}
      {onPay && (
        <div id="invoice-summary-pay-action" className="mt-5">
          <button
            id="invoice-summary-btn-pay"
            type="button"
            onClick={onPay}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>
              {payButtonLabel ||
                (isAr
                  ? `تحصيل المبلغ المستحق (${fmt(computedFinalPayable)})`
                  : `Collect Payable Amount (${fmt(computedFinalPayable)})`)}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default InvoiceSummary;
