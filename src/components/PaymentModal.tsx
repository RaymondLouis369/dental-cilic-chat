import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Banknote,
  Landmark,
  Wallet,
  CheckCircle2,
  AlertCircle,
  User,
  Hash,
  DollarSign,
  Receipt,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../modules/i18n/LanguageContext';
import { useAuth } from '../modules/auth/AuthContext';
import {
  Invoice,
  InvoicePaymentRecord,
  PaymentMethod,
} from '../types/receptionAndBilling';
import { recordInvoicePayment } from '../lib/receptionAndBillingStorage';

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onPaymentSuccess?: (updatedInvoice: Invoice, newPayment: InvoicePaymentRecord) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onPaymentSuccess,
}) => {
  const { language } = useLanguage();
  const { session } = useAuth();
  const isAr = language === 'ar';

  // Form State
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Validation & Feedback State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Initialize form when invoice changes or modal opens
  useEffect(() => {
    if (invoice) {
      // Default amount to full remaining balance
      setPaymentAmount(invoice.remaining_balance > 0 ? invoice.remaining_balance.toString() : '0');
      setPaymentMethod('cash');
      setReferenceNumber('');
      setNotes('');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  // Real-time calculations
  const remaining = invoice.remaining_balance;
  const numAmount = parseFloat(paymentAmount) || 0;
  const newRemainingBalance = Math.max(0, Math.round((remaining - numAmount) * 100) / 100);
  const isFullPayment = numAmount > 0 && Math.abs(numAmount - remaining) < 0.01;
  const isPartialPayment = numAmount > 0 && numAmount < remaining - 0.001;

  // Authenticated receiver identity
  const receiverId = session?.profile?.id || 'sys_reception';
  const receiverName =
    session?.profile?.display_name ||
    session?.profile?.email ||
    (isAr ? 'موظف الاستقبال الحالي' : 'Current Receptionist');

  // Client-side real-time validation check
  const validateForm = (): boolean => {
    setErrorMsg(null);

    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg(isAr ? 'برجاء إدخال مبلغ دفع أفقياً أكبر من الصفر' : 'Payment amount must be greater than zero');
      return false;
    }

    if (numAmount > remaining + 0.001) {
      setErrorMsg(
        isAr
          ? `مبلغ التحصيل (${numAmount.toLocaleString()} ج.م) لا يمكن أن يتجاوز الرصيد المتبقي بالفاتورة (${remaining.toLocaleString()} ج.م)`
          : `Payment amount (${numAmount.toLocaleString()} EGP) cannot exceed remaining balance (${remaining.toLocaleString()} EGP)`
      );
      return false;
    }

    if ((paymentMethod === 'bank' || paymentMethod === 'card' || paymentMethod === 'wallet') && !referenceNumber.trim()) {
      setErrorMsg(
        isAr
          ? 'يرجى إدخال رقم المرجع / إيصال التحويل بالنسبة لوسائل الدفع غير النقدي'
          : 'Please enter transaction reference number for non-cash payment method'
      );
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const result = recordInvoicePayment(invoice.id, numAmount, {
        actorUserId: receiverId,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        receivedBy: receiverId,
        receivedByName: receiverName,
        notes: notes.trim() || undefined,
      });

      if (!result.success || !result.invoice || !result.payment) {
        setErrorMsg(result.error || (isAr ? 'فشل تسجيل الدفعة' : 'Failed to record payment'));
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(
        isAr
          ? `تم تحصيل الدفعة بنجاح بمبلغ ${numAmount.toLocaleString()} ج.م`
          : `Payment of ${numAmount.toLocaleString()} EGP recorded successfully!`
      );

      if (onPaymentSuccess) {
        onPaymentSuccess(result.invoice, result.payment);
      }

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred'));
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto dir-auto"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-blue-500/5 to-transparent dark:from-emerald-950/40 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isAr ? 'تحصيل دفعة مالية' : 'Record Payment Collection'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {invoice.invoice_number} — {invoice.patient_name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Financial Breakdown Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">
                {isAr ? 'صافي قيمة الفاتورة:' : 'Invoice Net Total:'}
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {invoice.final_payable_amount.toLocaleString()} ج.م
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">
                {isAr ? 'المدفوع سابقاً:' : 'Previously Paid:'}
              </span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {invoice.paid_amount.toLocaleString()} ج.م
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold">
              <span className="text-slate-900 dark:text-white">
                {isAr ? 'المتبقي الحالي:' : 'Current Balance Due:'}
              </span>
              <span className="text-rose-600 dark:text-rose-400 text-sm font-mono">
                {remaining.toLocaleString()} ج.م
              </span>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Message Alert */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Payment Amount Input & Quick Fill Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isAr ? 'مبلغ الدفعة المحصلة (ج.م) *' : 'Payment Amount (EGP) *'}
              </label>

              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPaymentAmount((remaining / 2).toFixed(2))}
                  className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-medium transition-colors"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentAmount(remaining.toString())}
                  className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors"
                >
                  {isAr ? 'كامل المتبقي (100%)' : 'Full Balance (100%)'}
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={remaining}
                value={paymentAmount}
                onChange={(e) => {
                  setPaymentAmount(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder={isAr ? `أدخل المبلغ حتى ${remaining} ج.م` : `Enter amount up to ${remaining} EGP`}
                className="w-full text-sm font-bold pl-3 pr-10 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dir-rtl:pr-3 dir-rtl:pl-10 dir-ltr:pl-3 dir-ltr:pr-10"
                required
              />
              <span className="absolute top-3.5 text-xs font-bold text-slate-400 dir-rtl:left-3.5 dir-rtl:right-auto dir-ltr:right-3.5 dir-ltr:left-auto">
                ج.م
              </span>
            </div>

            {/* Payment Impact Indicator */}
            {numAmount > 0 && numAmount <= remaining && (
              <div className="text-[11px] font-medium flex items-center justify-between px-1 text-slate-500 dark:text-slate-400">
                <span>
                  {isFullPayment ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      {isAr ? 'سداد كامل وسيتم إغلاق الفاتورة كـ "مدفوعة"' : 'Full payment - invoice will be marked as Paid'}
                    </span>
                  ) : isPartialPayment ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {isAr ? 'سداد جزئي للفاتورة' : 'Partial payment'}
                    </span>
                  ) : null}
                </span>

                <span>
                  {isAr ? 'المتبقي بعد السداد:' : 'New Balance After:'}{' '}
                  <strong className="text-slate-900 dark:text-white font-mono">{newRemainingBalance.toLocaleString()} ج.م</strong>
                </span>
              </div>
            )}
          </div>

          {/* Payment Method Selector (Cash, Card, Bank, Wallet) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              {isAr ? 'طريقة الدفع *' : 'Payment Method *'}
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Cash */}
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100 ring-2 ring-emerald-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Banknote className="w-5 h-5 text-emerald-600" />
                <span>{isAr ? 'نقدي (Cash)' : 'Cash'}</span>
              </button>

              {/* Card */}
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-all ${
                  paymentMethod === 'card'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950/80 dark:text-blue-100 ring-2 ring-blue-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>{isAr ? 'بطاقة ائتمان' : 'Card'}</span>
              </button>

              {/* Bank Transfer */}
              <button
                type="button"
                onClick={() => setPaymentMethod('bank')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-all ${
                  paymentMethod === 'bank'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-100 ring-2 ring-indigo-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Landmark className="w-5 h-5 text-indigo-600" />
                <span>{isAr ? 'تحويل بنكي' : 'Bank'}</span>
              </button>

              {/* Wallet */}
              <button
                type="button"
                onClick={() => setPaymentMethod('wallet')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-all ${
                  paymentMethod === 'wallet'
                    ? 'border-purple-500 bg-purple-50 text-purple-900 dark:bg-purple-950/80 dark:text-purple-100 ring-2 ring-purple-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Wallet className="w-5 h-5 text-purple-600" />
                <span>{isAr ? 'محفظة / InstaPay' : 'Wallet'}</span>
              </button>
            </div>
          </div>

          {/* Reference / Transaction Number Field (Conditional for non-cash) */}
          {(paymentMethod === 'bank' || paymentMethod === 'card' || paymentMethod === 'wallet') && (
            <div className="space-y-1 animate-in fade-in duration-150">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                {isAr
                  ? paymentMethod === 'wallet'
                    ? 'رقم المعاملة / تحويل InstaPay أو فودافون كاش *'
                    : paymentMethod === 'bank'
                    ? 'رقم إيصال التحويل البنكي / المرجع *'
                    : 'رقم الإيصال / التفويض بالبطاقة *'
                  : 'Transaction / Reference Number *'}
              </label>

              <div className="relative">
                <Hash className="w-4 h-4 absolute top-3 text-slate-400 dir-rtl:right-3 dir-ltr:left-3" />
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder={
                    isAr
                      ? 'أدخل رقم المرجع أو رقم الإيصال...'
                      : 'Enter reference or receipt number...'
                  }
                  className="w-full text-xs py-2.5 pr-9 pl-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono dir-rtl:pr-9 dir-rtl:pl-3 dir-ltr:pl-9 dir-ltr:pr-3"
                  required
                />
              </div>
            </div>
          )}

          {/* Authenticated Receiver Badge */}
          <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-500" />
              <span>{isAr ? 'الموظف المستلم (Received By):' : 'Received By:'}</span>
            </span>

            <span className="font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
              {receiverName}
            </span>
          </div>

          {/* Notes Input */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
              {isAr ? 'ملاحظات الدفعة (اختياري)' : 'Payment Notes (Optional)'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isAr ? 'أي إشارات أو ملاحظات إضافية...' : 'Additional payment remarks...'}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !!successMsg}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 transition-colors shadow-sm disabled:opacity-50"
            >
              <DollarSign className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? isAr
                    ? 'جاري التحصيل...'
                    : 'Processing...'
                  : isAr
                  ? `تأكيد تحصيل ${numAmount ? numAmount.toLocaleString() : 0} ج.م`
                  : `Confirm Payment of ${numAmount ? numAmount.toLocaleString() : 0} EGP`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
