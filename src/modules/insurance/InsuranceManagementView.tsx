import React, { useState, useMemo } from 'react';
import {
  Shield,
  Building2,
  FileCheck,
  Plus,
  Edit2,
  Check,
  AlertCircle,
  Percent,
  CreditCard,
  Calculator,
  Search,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getStoredInsuranceCompanies,
  getStoredInsurancePlans,
  getStoredInsuranceCardTemplates,
  getStoredServices,
  saveInsuranceCompany,
  resolvePricing,
} from '../../lib/receptionAndBillingStorage';
import {
  InsuranceCompany,
  InsurancePlan,
  InsuranceCardTemplate,
  Service,
  PricingResolutionResult,
} from '../../types/receptionAndBilling';

export const InsuranceManagementView: React.FC = () => {
  const { session } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'companies' | 'plans' | 'templates' | 'calculator'>('companies');

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  const companies: InsuranceCompany[] = useMemo(
    () => getStoredInsuranceCompanies() || [],
    [refreshKey]
  );
  const plans: InsurancePlan[] = useMemo(() => getStoredInsurancePlans() || [], [refreshKey]);
  const templates: InsuranceCardTemplate[] = useMemo(
    () => getStoredInsuranceCardTemplates() || [],
    [refreshKey]
  );
  const services: Service[] = useMemo(() => getStoredServices() || [], []);

  // Company Modal State
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [compNameAr, setCompNameAr] = useState('');
  const [compNameEn, setCompNameEn] = useState('');
  const [compCode, setCompCode] = useState('');
  const [compPhone, setCompPhone] = useState('');
  const [compEmail, setCompEmail] = useState('');
  const [compIsContracted, setCompIsContracted] = useState(true);
  const [compAllowsDiscount, setCompAllowsDiscount] = useState(false);
  const [compDiscountPct, setCompDiscountPct] = useState(15);
  const [compError, setCompError] = useState<string | null>(null);

  // Pricing Resolution Tester State
  const [testServiceId, setTestServiceId] = useState<string>(services[0]?.id || '');
  const [testCompanyId, setTestCompanyId] = useState<string>(companies[0]?.id || '');
  const [testPlanId, setTestPlanId] = useState<string>('');

  const plansForTestCompany = useMemo(() => {
    return (plans || []).filter((p) => p && p.company_id === testCompanyId);
  }, [plans, testCompanyId]);

  const testCalculation = useMemo(() => {
    if (!testServiceId) return null;
    return resolvePricing({
      serviceId: testServiceId,
      patientInsuranceCompanyId: testCompanyId || undefined,
      patientInsurancePlanId: testPlanId || undefined,
    });
  }, [testServiceId, testCompanyId, testPlanId]);

  // Handle open company modal
  const handleOpenAddCompany = () => {
    setEditingCompanyId(null);
    setCompNameAr('');
    setCompNameEn('');
    setCompCode(`INS-${String(((companies || []).length + 1)).padStart(2, '0')}`);
    setCompPhone('+20212345678');
    setCompEmail('');
    setCompIsContracted(true);
    setCompAllowsDiscount(false);
    setCompDiscountPct(15);
    setCompError(null);
    setIsCompanyModalOpen(true);
  };

  const handleEditCompany = (c: InsuranceCompany) => {
    setEditingCompanyId(c.id);
    setCompNameAr(c.name_ar);
    setCompNameEn(c.name_en);
    setCompCode(c.code);
    setCompPhone(c.contact_phone || '');
    setCompEmail(c.contact_email || '');
    setCompIsContracted(c.is_contracted);
    setCompAllowsDiscount(c.allows_non_contracted_discount);
    setCompDiscountPct(c.non_contracted_discount_percent || 15);
    setCompError(null);
    setIsCompanyModalOpen(true);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setCompError(null);

    if (!compNameAr.trim() || !compNameEn.trim() || !compCode.trim()) {
      setCompError(isAr ? 'الاسم والكود مطلوبان' : 'Name and Code are required');
      return;
    }

    try {
      saveInsuranceCompany({
        id: editingCompanyId || undefined,
        organization_id: session?.profile.organization_id || 'org_dental_egy_01',
        name_ar: compNameAr.trim(),
        name_en: compNameEn.trim(),
        code: compCode.trim().toUpperCase(),
        contact_phone: compPhone.trim() || undefined,
        contact_email: compEmail.trim() || undefined,
        is_contracted: compIsContracted,
        allows_non_contracted_discount: compAllowsDiscount,
        non_contracted_discount_percent: compAllowsDiscount ? compDiscountPct : 0,
        is_active: true,
      });

      setIsCompanyModalOpen(false);
      refresh();
    } catch (err: any) {
      setCompError(err.message || 'Failed to save company');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-teal-50 text-teal-700 rounded-xl">
              <Shield className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {isAr ? 'شركات وخطط التأمين الطبي والبطاقات' : 'Insurance Companies & Card Templates'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'إدارة التعاقدات التأمينية، نسب التغطية والتحمل، وقوالب بطاقات التأمين في مصر'
                  : 'Manage insurance agreements, coverage copays, and card layout templates in Egypt'}
              </p>
            </div>
          </div>
        </div>

        {activeTab === 'companies' && (
          <button
            onClick={handleOpenAddCompany}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'إضافة شركة تأمين' : 'Add Insurance Co.'}</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm text-xs font-bold">
        <button
          onClick={() => setActiveTab('companies')}
          className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'companies'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{isAr ? 'شركات التأمين' : 'Companies'} ({(companies || []).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'plans'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>{isAr ? 'خطط التغطية ونسب التحمل' : 'Coverage Plans'} ({(plans || []).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'templates'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>{isAr ? 'قوالب بطاقات التأمين' : 'Card Templates'} ({(templates || []).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'calculator'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>{isAr ? 'حاسبة فحص التسعير الحتمي' : 'Pricing Resolver Simulator'}</span>
        </button>
      </div>

      {/* Tab 1: Companies */}
      {activeTab === 'companies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(companies || []).map((comp) => (
            <div
              key={comp.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-teal-700 font-bold">{comp.code}</span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{comp.name_ar}</h3>
                    <p className="text-[11px] text-slate-500">{comp.name_en}</p>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      comp.is_contracted
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {comp.is_contracted
                      ? isAr
                        ? 'متعاقدة'
                        : 'Contracted'
                      : isAr
                      ? 'غير متعاقدة'
                      : 'Uncontracted'}
                  </span>
                </div>

                <div className="mt-4 space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px]">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>{isAr ? 'الهاتف:' : 'Phone:'}</span>
                    <span className="font-mono">{comp.contact_phone || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>{isAr ? 'البريد:' : 'Email:'}</span>
                    <span className="font-mono">{comp.contact_email || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>{isAr ? 'خصم لغير المتعاقد:' : 'Courtesy Discount:'}</span>
                    <span className="font-bold">
                      {comp.allows_non_contracted_discount
                        ? `${comp.non_contracted_discount_percent}%`
                        : isAr
                        ? 'غير متاح'
                        : 'None'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleEditCompany(comp)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تعديل' : 'Edit'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Coverage Plans */}
      {activeTab === 'plans' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
          <div className="p-4 border-b border-slate-200 font-bold text-slate-800">
            {isAr ? 'خطط التأمين المعتمدة ومحددات التغطية' : 'Approved Insurance Plans'}
          </div>

          <table className="w-full text-start">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3 text-start">{isAr ? 'كود الخطة' : 'Plan Code'}</th>
                <th className="px-3.5 py-3 text-start">{isAr ? 'اسم الخطة' : 'Plan Name'}</th>
                <th className="px-3.5 py-3 text-start">{isAr ? 'شركة التأمين' : 'Company'}</th>
                <th className="px-3.5 py-3 text-center">{isAr ? 'نسبة تغطية التأمين' : 'Insurance %'}</th>
                <th className="px-3.5 py-3 text-center">{isAr ? 'نسبة تحمل المريض (Copay)' : 'Copay %'}</th>
                <th className="px-3.5 py-3 text-end">{isAr ? 'الحد الأقصى السنوي' : 'Annual Max Limit'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(plans || []).map((p) => {
                const comp = (companies || []).find((c) => c && c.id === p.company_id);
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-3.5 py-3 font-mono font-bold text-teal-700">{p.code}</td>
                    <td className="px-3.5 py-3 font-bold text-slate-900">{p.name_ar}</td>
                    <td className="px-3.5 py-3 text-slate-600">
                      {comp ? comp.name_ar : '—'}
                    </td>
                    <td className="px-3.5 py-3 text-center font-bold text-emerald-700">
                      {p.default_coverage_percent}%
                    </td>
                    <td className="px-3.5 py-3 text-center font-bold text-amber-700">
                      {p.default_copay_percent}%
                    </td>
                    <td className="px-3.5 py-3 text-end font-mono text-slate-700">
                      {p.annual_max_limit
                        ? `${p.annual_max_limit.toLocaleString('en-US')} ج.م`
                        : isAr
                        ? 'مفتوح'
                        : 'Unlimited'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Card Templates */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-teal-900 text-xs">
            <span className="font-bold">
              {isAr ? 'أساس قوالب بطاقات التأمين (Foundation):' : 'Insurance Card Template Engine:'}
            </span>
            <p className="mt-0.5 text-teal-800">
              {isAr
                ? 'تهيئة الحقول المطلوبة (اسم العضو، رقم البطاقة، رقم الوثيقة، تاريخ الانتهاء) وإحداثيات المطابقة البصرية للمراحل المستقبلية (OCR).'
                : 'Configures required card fields (Member Name, ID, Policy No, Expiry) and layout mapping for future OCR integrations.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(templates || []).map((tpl) => {
              const comp = (companies || []).find((c) => c && c.id === tpl.company_id);
              return (
                <div
                  key={tpl.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-xs space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-teal-600" />
                      <h3 className="font-bold text-slate-900">{tpl.template_name}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 text-slate-700">
                      {comp?.name_ar}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="font-bold text-slate-800">
                      {isAr ? 'الحقول الإلزامية المعرفة بالقالب:' : 'Configured Fields:'}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(tpl.fields_config || []).map((f) => (
                        <div
                          key={f.field_key}
                          className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px]"
                        >
                          <div className="font-semibold text-slate-800">
                            {isAr ? f.label_ar : f.label_en}
                          </div>
                          <div className="text-slate-500 font-mono text-[10px]">
                            {f.field_key} {f.is_required && '• مطلوب'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Deterministic Pricing Simulator */}
      {activeTab === 'calculator' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <Calculator className="w-5 h-5 text-teal-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {isAr
                  ? 'محاكي دقة محرك التسعير الحتمي (Deterministic Pricing Engine)'
                  : 'Deterministic Pricing Simulator (No AI — Pure Math)'}
              </h2>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'تطبيق هرمية التسعير: المريض ← شركة التأمين ← خطة التأمين ← الخدمة السنية ← السعر النقدي / الخصم'
                  : 'Strict resolution hierarchy: Patient → Insurance Co → Plan → Service → Cash/Discount'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Select Service */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {isAr ? 'الخدمة السنية' : 'Dental Service'}
              </label>
              <select
                value={testServiceId}
                onChange={(e) => setTestServiceId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              >
                {(services || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {isAr ? s.name_ar : s.name_en} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Insurance Company */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {isAr ? 'شركة التأمين' : 'Insurance Company'}
              </label>
              <select
                value={testCompanyId}
                onChange={(e) => {
                  setTestCompanyId(e.target.value);
                  setTestPlanId('');
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              >
                <option value="">{isAr ? '-- غير مؤمن (نقدي فقط) --' : '-- Cash Only --'}</option>
                {(companies || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar} {!c.is_contracted ? (isAr ? '(غير متعاقدة)' : '(Uncontracted)') : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Plan */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {isAr ? 'خطة التأمين' : 'Insurance Plan'}
              </label>
              <select
                value={testPlanId}
                onChange={(e) => setTestPlanId(e.target.value)}
                disabled={!testCompanyId}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl disabled:opacity-50"
              >
                <option value="">{isAr ? '-- خطة افتراضية --' : '-- Default Plan --'}</option>
                {(plansForTestCompany || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name_ar} (تحمل {p.default_copay_percent}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Engine Output Display */}
          {testCalculation && (
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  {isAr ? 'النتيجة المحسوبة رياضياً:' : 'Calculation Output:'}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    testCalculation.pricing_tier === 'insurance_contract'
                      ? 'bg-emerald-100 text-emerald-800'
                      : testCalculation.pricing_tier === 'non_contracted_discount'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {testCalculation.pricing_tier === 'insurance_contract'
                    ? isAr
                      ? 'سعر تعاقد تأميني'
                      : 'Contracted'
                    : testCalculation.pricing_tier === 'non_contracted_discount'
                    ? isAr
                      ? 'خصم لشركة غير متعاقدة'
                      : 'Courtesy Discount'
                    : isAr
                    ? 'سعر نقدي عادي'
                    : 'Cash Standard'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500">
                    {isAr ? 'السعر الأساسي المعتمد:' : 'Base List Price:'}
                  </span>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {testCalculation.base_price.toLocaleString('en-US')} ج.م
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-xs text-emerald-700 font-semibold">
                    {isAr ? 'مساهمة شركة التأمين:' : 'Insurance Share:'}
                  </span>
                  <div className="text-base font-bold text-emerald-800 mt-0.5">
                    {testCalculation.insurance_coverage_amount.toLocaleString('en-US')} ج.م
                  </div>
                </div>

                <div className="p-3 bg-teal-50 rounded-xl border border-teal-300">
                  <span className="text-xs text-teal-800 font-bold">
                    {isAr ? 'المبلغ المستحق على المريض:' : 'Final Patient Copay:'}
                  </span>
                  <div className="text-xl font-black text-teal-900 mt-0.5">
                    {testCalculation.final_patient_price.toLocaleString('en-US')} ج.م
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{testCalculation.explanation}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Company Add/Edit Modal */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md my-8 overflow-hidden">
            <div className="bg-teal-700 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingCompanyId
                  ? isAr
                    ? 'تعديل شركة التأمين'
                    : 'Edit Company'
                  : isAr
                  ? 'إضافة شركة تأمين جديدة'
                  : 'Add Insurance Company'}
              </h3>
              <button
                onClick={() => setIsCompanyModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="p-6 space-y-4 text-xs">
              {compError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{compError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {isAr ? 'كود الشركة' : 'Company Code'} *
                </label>
                <input
                  type="text"
                  value={compCode}
                  onChange={(e) => setCompCode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {isAr ? 'الاسم بالعربية' : 'Arabic Name'} *
                </label>
                <input
                  type="text"
                  value={compNameAr}
                  onChange={(e) => setCompNameAr(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {isAr ? 'الاسم بالإنجليزية' : 'English Name'} *
                </label>
                <input
                  type="text"
                  value={compNameEn}
                  onChange={(e) => setCompNameEn(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {isAr ? 'الهاتف' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    value={compPhone}
                    onChange={(e) => setCompPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {isAr ? 'البريد الإلكتروني' : 'Email'}
                  </label>
                  <input
                    type="email"
                    value={compEmail}
                    onChange={(e) => setCompEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="compContracted"
                    checked={compIsContracted}
                    onChange={(e) => setCompIsContracted(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <label htmlFor="compContracted" className="font-bold text-slate-800 cursor-pointer">
                    {isAr ? 'شركة متعاقدة رسمياً مع العيادة' : 'Contracted with Dental Center'}
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="compDiscount"
                    checked={compAllowsDiscount}
                    onChange={(e) => setCompAllowsDiscount(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <label htmlFor="compDiscount" className="font-bold text-slate-800 cursor-pointer">
                    {isAr ? 'منح خصم مجاملة إذا كانت غير متعاقدة' : 'Allow Courtesy Discount if uncontracted'}
                  </label>
                </div>

                {compAllowsDiscount && (
                  <div className="ps-6">
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isAr ? 'نسبة الخصم (%)' : 'Discount Percentage (%)'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={compDiscountPct}
                      onChange={(e) => setCompDiscountPct(Number(e.target.value))}
                      className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCompanyModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isAr ? 'حفظ الشركة' : 'Save Company'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
