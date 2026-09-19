import React from 'react';
import {
  Calculator,
  UserCheck,
  FlaskConical,
  Package,
  Building2,
  TrendingUp,
  Percent,
  Coins,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '../modules/i18n/LanguageContext';
import { Invoice, InvoiceItem, CommissionBaseType } from '../types/receptionAndBilling';

export interface CommissionCostBreakdownProps {
  invoice?: Invoice;
  item?: InvoiceItem;
  grossServiceAmount?: number;
  insuranceAmount?: number;
  patientAmount?: number;
  labCost?: number;
  materialCost?: number;
  supplierVendor?: string;
  doctorName?: string;
  commissionPercentage?: number;
  commissionBase?: CommissionBaseType;
  calculatedCommission?: number;
  clinicNetAmount?: number;
  currency?: string;
  compact?: boolean;
  className?: string;
}

export const CommissionCostBreakdown: React.FC<CommissionCostBreakdownProps> = ({
  invoice,
  item,
  grossServiceAmount: propGross,
  insuranceAmount: propInsurance,
  patientAmount: propPatient,
  labCost: propLab,
  materialCost: propMaterial,
  supplierVendor: propVendor,
  doctorName: propDoctor,
  commissionPercentage: propCommPct,
  commissionBase: propCommBase,
  calculatedCommission: propCommAmt,
  clinicNetAmount: propNet,
  currency = 'EGP',
  compact = false,
  className = '',
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  // Extract from invoice, item, or direct props
  const gross = propGross ?? item?.gross_amount ?? invoice?.subtotal_amount ?? 0;
  const insurance = propInsurance ?? item?.insurance_amount ?? invoice?.insurance_total_amount ?? 0;
  const patient = propPatient ?? item?.patient_copay_amount ?? invoice?.patient_total_amount ?? invoice?.final_payable_amount ?? 0;

  const lab = propLab ?? item?.lab_cost ?? invoice?.total_lab_cost ?? 0;
  const material = propMaterial ?? item?.material_cost ?? invoice?.total_material_cost ?? 0;
  const totalCosts = lab + material;

  const vendor = propVendor ?? item?.supplier_vendor;
  const doctor = propDoctor ?? item?.doctor_name ?? invoice?.doctor_name ?? (isAr ? 'طبيب المعالجة' : 'Attending Doctor');

  const commPct = propCommPct ?? item?.commission_percentage ?? 15;
  const commBase = propCommBase ?? item?.commission_base ?? 'gross';

  // Base calculation
  const commBaseAmount = commBase === 'net_after_costs' ? Math.max(0, gross - totalCosts) : gross;
  const commAmt = propCommAmt ?? item?.calculated_commission ?? invoice?.total_doctor_commission ?? Math.round((commBaseAmount * (commPct / 100)) * 100) / 100;

  // Clinic Net
  const clinicNet = propNet ?? item?.clinic_net_amount ?? invoice?.clinic_net_amount ?? Math.round((patient - lab - material - commAmt) * 100) / 100;

  const fmt = (amt: number) => {
    const val = isNaN(amt) ? 0 : amt;
    const formatted = new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
    const symbol = isAr ? 'ج.م' : currency;
    return isAr ? `${formatted} ${symbol}` : `${symbol} ${formatted}`;
  };

  return (
    <div
      id="commission-cost-breakdown-card"
      className={`bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm ${
        compact ? 'p-3.5 text-xs' : 'p-5 text-sm'
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 leading-tight">
              {isAr ? 'التحليل المالي للخدمة وعمولة الطبيب' : 'Doctor Commission & Cost Breakdown'}
            </h4>
            <p className="text-xs text-slate-500">
              {isAr ? 'حساب الصافي وتكاليف المعمل والمستلزمات' : 'Lab/material costs & net clinic revenue'}
            </p>
          </div>
        </div>

        {/* Base Badge */}
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            commBase === 'net_after_costs'
              ? 'bg-purple-100 text-purple-800 border border-purple-200'
              : 'bg-blue-100 text-blue-800 border border-blue-200'
          }`}
        >
          <Percent className="w-3 h-3" />
          {commBase === 'net_after_costs'
            ? isAr
              ? 'أساس العمولة: الصافي بعد التكاليف'
              : 'Base: Net After Costs'
            : isAr
            ? 'أساس العمولة: إجمالي الخدمة'
            : 'Base: Gross Service Amount'}
        </span>
      </div>

      {/* Grid details */}
      <div className="space-y-2">
        {/* Gross Service Amount */}
        <div className="flex items-center justify-between text-slate-700 py-0.5">
          <span className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-slate-400" />
            <span>{isAr ? 'إجمالي قيمة الخدمة (Gross Amount)' : 'Gross Service Amount'}</span>
          </span>
          <span className="font-mono font-medium text-slate-900">{fmt(gross)}</span>
        </div>

        {/* Insurance Coverage */}
        {insurance > 0 && (
          <div className="flex items-center justify-between text-teal-700 py-0.5">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-500" />
              <span>{isAr ? 'تغطية شركة التأمين' : 'Insurance Coverage'}</span>
            </span>
            <span className="font-mono font-medium text-teal-700">- {fmt(insurance)}</span>
          </div>
        )}

        {/* Patient Amount */}
        <div className="flex items-center justify-between text-slate-700 py-0.5 font-medium">
          <span className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-slate-400" />
            <span>{isAr ? 'حصيلة المريض (Patient Share)' : 'Patient Amount'}</span>
          </span>
          <span className="font-mono font-bold text-slate-800">{fmt(patient)}</span>
        </div>

        {/* Costs section */}
        <div className="pt-2 border-t border-slate-200 space-y-1.5">
          {/* Lab Cost */}
          <div className="flex items-center justify-between text-amber-800 bg-amber-50/70 px-2.5 py-1 rounded-lg border border-amber-100">
            <span className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-amber-600" />
              <span>
                {isAr ? 'تكلفة معمل التركيبات (Lab Cost)' : 'Lab Cost'}
                {vendor && <span className="text-xs text-amber-600 block opacity-85">({vendor})</span>}
              </span>
            </span>
            <span className="font-mono font-semibold text-amber-900">- {fmt(lab)}</span>
          </div>

          {/* Material Cost */}
          <div className="flex items-center justify-between text-orange-800 bg-orange-50/70 px-2.5 py-1 rounded-lg border border-orange-100">
            <span className="flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-600" />
              <span>{isAr ? 'تكلفة المستلزمات الخامات (Material Cost)' : 'Material Cost'}</span>
            </span>
            <span className="font-mono font-semibold text-orange-900">- {fmt(material)}</span>
          </div>
        </div>

        {/* Commission section */}
        <div className="pt-2 border-t border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-indigo-900 bg-indigo-50/80 px-2.5 py-1.5 rounded-lg border border-indigo-100">
            <span className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="font-semibold block">{doctor}</span>
                <span className="text-xs text-indigo-600 font-mono">
                  {isAr
                    ? `عمولة ${commPct}% من [${commBase === 'net_after_costs' ? 'الصافي' : 'الإجمالي'} = ${fmt(commBaseAmount)}]`
                    : `Commission ${commPct}% of [${commBase === 'net_after_costs' ? 'Net' : 'Gross'} = ${fmt(commBaseAmount)}]`}
                </span>
              </div>
            </span>
            <span className="font-mono font-bold text-indigo-900">- {fmt(commAmt)}</span>
          </div>
        </div>

        {/* Clinic Net Result */}
        <div className="pt-2">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 text-white shadow-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-xs text-slate-300 block">
                  {isAr ? 'صافي إيراد العيادة (Clinic Net Amount)' : 'Clinic Net Amount'}
                </span>
                <span className="text-xs text-emerald-300">
                  {isAr ? 'بعد خصم التكاليف وعمولة الطبيب' : 'After costs & doctor commission'}
                </span>
              </div>
            </div>
            <span className="font-mono text-lg font-black text-emerald-400">{fmt(clinicNet)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommissionCostBreakdown;
