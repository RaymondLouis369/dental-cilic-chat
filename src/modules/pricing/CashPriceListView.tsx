import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldCheck,
  Eye,
  Send,
  FileCheck,
  Search,
  Building2,
  XCircle,
  RefreshCw,
  CreditCard,
  Check,
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Info,
  ShieldAlert,
  Layers,
  Percent,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getStoredPriceLists,
  getStoredPriceListVersions,
  getStoredServices,
  getStoredInsuranceCompanies,
  getStoredInsurancePlans,
  getStoredInsurancePriceLists,
  getStoredInsurancePriceListItems,
  publishNewPriceListVersion,
  publishNewInsurancePriceListVersion,
} from '../../lib/receptionAndBillingStorage';
import {
  parseAndValidateExcelFile,
  generateSampleExcelBuffer,
  generateInsuranceExcelBuffer,
  exportActiveCashPriceListBuffer,
  exportActiveInsurancePriceListBuffer,
} from './excelParser';
import {
  PriceList,
  PriceListVersion,
  Service,
  ExcelImportResult,
  InsuranceCompany,
  InsurancePlan,
  InsurancePriceList,
  InsurancePriceListItem,
  ExcelRowValidation,
} from '../../types/receptionAndBilling';

export type PricingTab = 'cash' | 'insurance';
export type ExcelStep = 1 | 2 | 3 | 4 | 5;

export const CashPriceListView: React.FC = () => {
  const { session } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<PricingTab>('cash');
  const [currentStep, setCurrentStep] = useState<ExcelStep>(1);

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  // Storage Data
  const priceLists: PriceList[] = useMemo(() => getStoredPriceLists() || [], [refreshKey]);
  const versions: PriceListVersion[] = useMemo(
    () => getStoredPriceListVersions() || [],
    [refreshKey]
  );
  const services: Service[] = useMemo(() => getStoredServices() || [], [refreshKey]);

  const insuranceCompanies: InsuranceCompany[] = useMemo(
    () => getStoredInsuranceCompanies() || [],
    [refreshKey]
  );
  const insurancePlans: InsurancePlan[] = useMemo(
    () => getStoredInsurancePlans() || [],
    [refreshKey]
  );
  const insurancePriceLists: InsurancePriceList[] = useMemo(
    () => getStoredInsurancePriceLists() || [],
    [refreshKey]
  );
  const insurancePriceListItems: InsurancePriceListItem[] = useMemo(
    () => getStoredInsurancePriceListItems() || [],
    [refreshKey]
  );

  // Selected Insurance Company & Plan for Insurance Tab
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    insuranceCompanies[0]?.id || ''
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  const plansForCompany = useMemo(() => {
    return (insurancePlans || []).filter((p) => p.company_id === selectedCompanyId);
  }, [insurancePlans, selectedCompanyId]);

  const selectedCompany = useMemo(
    () => (insuranceCompanies || []).find((c) => c.id === selectedCompanyId),
    [insuranceCompanies, selectedCompanyId]
  );

  const selectedPlan = useMemo(
    () => (insurancePlans || []).find((p) => p.id === selectedPlanId),
    [insurancePlans, selectedPlanId]
  );

  const activeIPL = useMemo(
    () =>
      (insurancePriceLists || []).find(
        (ipl) =>
          ipl.company_id === selectedCompanyId &&
          (selectedPlanId ? ipl.plan_id === selectedPlanId : true)
      ),
    [insurancePriceLists, selectedCompanyId, selectedPlanId]
  );

  const activeIPLItems = useMemo(() => {
    if (!activeIPL) return [];
    return (insurancePriceListItems || []).filter(
      (i) => i.insurance_price_list_id === activeIPL.id
    );
  }, [insurancePriceListItems, activeIPL]);

  const insuranceStats = useMemo(() => {
    const totalCount = activeIPLItems.length;
    const requiresApproval = activeIPLItems.filter((i) => i.requires_approval).length;
    const noApproval = totalCount - requiresApproval;
    const avgCopay =
      totalCount > 0
        ? Math.round(
            activeIPLItems.reduce((acc, curr) => acc + (curr.patient_copay_percentage || 20), 0) /
              totalCount
          )
        : selectedPlan?.patient_copay_percentage_default || 20;
    const avgCoverage = 100 - avgCopay;

    return {
      totalCount,
      requiresApproval,
      noApproval,
      avgCopay,
      avgCoverage,
    };
  }, [activeIPLItems, selectedPlan]);

  // Primary cash price list & version
  const defaultCashList = useMemo(
    () => (priceLists || []).find((pl) => pl.type === 'cash') || priceLists[0],
    [priceLists]
  );

  const listVersions = useMemo(() => {
    if (!defaultCashList) return [];
    return (versions || []).filter((v) => v.price_list_id === defaultCashList.id);
  }, [versions, defaultCashList]);

  const publishedVersion = useMemo(
    () => listVersions.find((v) => v.status === 'published'),
    [listVersions]
  );

  // Excel Import Flow States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [excelResult, setExcelResult] = useState<ExcelImportResult | null>(null);
  const [notes, setNotes] = useState<string>('تحديث معتمد لأسعار الربع السنوي 2026');
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<boolean>(false);
  const [publishedVersionTag, setPublishedVersionTag] = useState<string>('');

  // Filters for Preview Table in Step 4
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'errors'>('all');
  const [previewSearch, setPreviewSearch] = useState('');

  // Active Catalog Search Filter
  const [catalogSearch, setCatalogSearch] = useState('');

  // Check role permission
  const canManagePricing = session?.role.key === 'center_manager';

  // Handle File Selection (Step 2)
  const handleFileChange = async (file: File) => {
    setErrorMessage(null);
    setSelectedFile(file);
    setIsParsing(true);

    try {
      const result = await parseAndValidateExcelFile(file);
      setExcelResult(result);
      setIsParsing(false);
      setCurrentStep(3); // Auto-advance to Validation Results
    } catch (err: any) {
      setIsParsing(false);
      setErrorMessage(
        isAr
          ? `فشل في معالجة وقراءة ملف الإكسل: ${err.message}`
          : `Failed to parse Excel file: ${err.message}`
      );
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Download Sample Template
  const handleDownloadSample = () => {
    const buffer =
      activeTab === 'cash'
        ? generateSampleExcelBuffer()
        : generateInsuranceExcelBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      activeTab === 'cash'
        ? 'Cash_Price_List_Template_Egypt.xlsx'
        : 'Insurance_Contract_Tariff_Template_Egypt.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Active Live Catalog to Excel for batch update
  const handleExportActiveCatalog = () => {
    let buffer: Uint8Array;
    let filename: string;

    if (activeTab === 'cash') {
      buffer = exportActiveCashPriceListBuffer(services);
      filename = `Active_Cash_Price_List_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else {
      const activeIPL = (insurancePriceLists || []).find(
        (ipl) =>
          ipl.company_id === selectedCompanyId &&
          (selectedPlanId ? ipl.plan_id === selectedPlanId : true)
      );
      const items = (insurancePriceListItems || []).filter(
        (i) => i.insurance_price_list_id === activeIPL?.id
      ).map((item) => ({
        ...item,
        service: (services || []).find((s) => s.id === item.service_id),
      }));

      buffer = exportActiveInsurancePriceListBuffer(items);
      const comp = (insuranceCompanies || []).find((c) => c.id === selectedCompanyId);
      filename = `Active_Insurance_Tariff_${comp?.code || 'Export'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    }

    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Publish new version
  const handlePublish = () => {
    if (!excelResult) return;
    setErrorMessage(null);

    try {
      if (activeTab === 'cash') {
        if (!defaultCashList) return;
        const res = publishNewPriceListVersion({
          priceListId: defaultCashList.id,
          effectiveFrom,
          notes,
          validRows: excelResult.rows.filter((r) => r.is_valid),
          publishedByStaffId: session?.profile.id || 'usr_staff_01',
        });
        if (res.success && res.newVersion) {
          setPublishedVersionTag(`PLV-2026-v${res.newVersion.version_number}`);
          setPublishSuccess(true);
          refresh();
        }
      } else {
        if (!selectedCompanyId) {
          setErrorMessage(
            isAr ? 'برجاء اختيار شركة التأمين المعتمدة' : 'Please select an insurance company'
          );
          return;
        }
        const company = (insuranceCompanies || []).find((c) => c.id === selectedCompanyId);
        const plan = (insurancePlans || []).find((p) => p.id === selectedPlanId);
        const nameTag = `${company?.name_ar || 'Insurance'} - ${
          plan?.name_ar || 'General Tariff'
        }`;

        const res = publishNewInsurancePriceListVersion({
          companyId: selectedCompanyId,
          planId: selectedPlanId || undefined,
          name: nameTag,
          validRows: excelResult.rows.filter((r) => r.is_valid),
          effectiveFrom,
          notes,
          actorUserId: session?.profile.id || 'usr_staff_01',
        });

        if (res.success) {
          setPublishedVersionTag(`IPL-${company?.code || 'INS'}-2026`);
          setPublishSuccess(true);
          refresh();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to publish new version');
    }
  };

  // Reset Excel Import Flow
  const handleResetFlow = () => {
    setCurrentStep(1);
    setSelectedFile(null);
    setExcelResult(null);
    setPublishSuccess(false);
    setErrorMessage(null);
  };

  // Filtered preview rows
  const filteredPreviewRows = useMemo(() => {
    if (!excelResult) return [];
    return (excelResult.rows || []).filter((r) => {
      if (previewFilter === 'valid' && !r.is_valid) return false;
      if (previewFilter === 'errors' && r.is_valid) return false;
      if (previewSearch.trim()) {
        const query = previewSearch.toLowerCase();
        const codeMatch = r.service_code?.toLowerCase().includes(query);
        const nameArMatch = r.service_name_ar?.toLowerCase().includes(query);
        const nameEnMatch = r.service_name_en?.toLowerCase().includes(query);
        return codeMatch || nameArMatch || nameEnMatch;
      }
      return true;
    });
  }, [excelResult, previewFilter, previewSearch]);

  // Current active catalog display
  const activeCatalogDisplay = useMemo(() => {
    if (activeTab === 'cash') {
      return (services || []).filter((s) => {
        if (!catalogSearch.trim()) return true;
        const q = catalogSearch.toLowerCase();
        return (
          s.code.toLowerCase().includes(q) ||
          s.name_ar.toLowerCase().includes(q) ||
          s.name_en.toLowerCase().includes(q)
        );
      });
    } else {
      // Insurance Catalog for selected company
      const activeIPL = (insurancePriceLists || []).find(
        (ipl) =>
          ipl.company_id === selectedCompanyId &&
          (selectedPlanId ? ipl.plan_id === selectedPlanId : true)
      );
      if (!activeIPL) return [];

      const items = (insurancePriceListItems || []).filter(
        (i) => i.insurance_price_list_id === activeIPL.id
      );

      return items
        .map((item) => {
          const srv = (services || []).find((s) => s.id === item.service_id);
          return {
            ...item,
            service: srv,
          };
        })
        .filter((i) => {
          if (!catalogSearch.trim()) return true;
          const q = catalogSearch.toLowerCase();
          return (
            i.service_code.toLowerCase().includes(q) ||
            i.service?.name_ar.toLowerCase().includes(q) ||
            i.service?.name_en.toLowerCase().includes(q)
          );
        });
    }
  }, [
    activeTab,
    services,
    insurancePriceLists,
    insurancePriceListItems,
    selectedCompanyId,
    selectedPlanId,
    catalogSearch,
  ]);

  return (
    <div className="space-y-6 text-slate-800">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {isAr
                  ? 'إدارة قوائم الأسعار واعتماد الإكسل الموحد'
                  : 'Price List Management & Excel Import Workflow'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'نظام خماسي الخطوات (تحميل → رفع → تدقيق → معاينة → اعتماد) لإدارة أسعار النقد والتأمين'
                  : 'Deterministic 5-Step Excel lifecycle (Download → Upload → Validate → Preview → Publish)'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentStep > 1 && (
            <button
              onClick={handleResetFlow}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{isAr ? 'إعادة ضبط العملية' : 'Reset Flow'}</span>
            </button>
          )}

          <button
            onClick={handleExportActiveCatalog}
            className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            title={isAr ? 'تصدير الأسعار الحالية لتعديلها دفعة واحدة' : 'Export Active Price List to Excel'}
          >
            <Download className="w-4 h-4" />
            <span>{isAr ? 'تصدير الأسعار النشطة (Excel)' : 'Export Active List (.xlsx)'}</span>
          </button>

          <button
            onClick={handleDownloadSample}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isAr ? 'تحميل نموذج فارغ' : 'Download Template'}</span>
          </button>
        </div>
      </div>

      {/* Primary Two-Tab Selector */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm text-xs font-bold">
        <button
          onClick={() => {
            setActiveTab('cash');
            handleResetFlow();
          }}
          className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2.5 ${
            activeTab === 'cash'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>{isAr ? 'قوائم الأسعار النقدية (Cash Tariff)' : 'Cash Price List'}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'cash' ? 'bg-teal-700 text-teal-100' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {(services || []).length} {isAr ? 'خدمة' : 'Services'}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('insurance');
            handleResetFlow();
          }}
          className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2.5 ${
            activeTab === 'insurance'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{isAr ? 'قوائم أسعار عقود التأمين (Insurance Tariff)' : 'Insurance Price List'}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'insurance' ? 'bg-teal-700 text-teal-100' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {(insuranceCompanies || []).length} {isAr ? 'شركات' : 'Companies'}
          </span>
        </button>
      </div>

      {!canManagePricing && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">
              {isAr ? 'تنبيه الصلاحيات الأمنية:' : 'Role Permission Notice:'}
            </span>
            <p className="text-[11px] text-amber-800 mt-0.5">
              {isAr
                ? 'تعديل ونشر قوائم الأسعار الجديدة متاح حصرياً لمدير المركز (Center Manager). يتوفر لك وضع القراءة والمعاينة الفنية.'
                : 'Only Center Managers have publication rights for price list versions. Read-only mode enabled.'}
            </p>
          </div>
        </div>
      )}

      {/* Insurance Tab Filter & Intuitive Relationship Architecture */}
      {activeTab === 'insurance' && (
        <div className="space-y-4">
          {/* Company & Plan Selector Sub-Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Building2 className="w-4.5 h-4.5 text-teal-600" />
                <span>{isAr ? 'تحديد نطاق التعاقد والشركة:' : 'Contract & Insurance Scope Selection:'}</span>
              </div>
              {selectedCompany && (
                <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-bold border border-teal-200">
                  {selectedCompany.code}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {isAr ? 'شركة التأمين المتعاقدة:' : 'Select Contracted Insurance Company:'}
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => {
                    setSelectedCompanyId(e.target.value);
                    setSelectedPlanId('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-teal-500 outline-none text-slate-900"
                >
                  {(insuranceCompanies || []).map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name_ar} ({comp.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {isAr ? 'خطة التغطية التأمينية المخصصة:' : 'Select Coverage Plan:'}
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-teal-500 outline-none text-slate-900"
                >
                  <option value="">{isAr ? '-- جميع خطط الشركة (تعريف عام) --' : '-- All Company Plans --'}</option>
                  {(plansForCompany || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name_ar} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Intuitive Card-Based Display for Insurance Plans */}
            {plansForCompany && plansForCompany.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block font-bold text-slate-800 text-[11px]">
                  {isAr ? 'بطاقات خطط التغطية التأمينية المتاحة (اضغط لاختيار الخطة):' : 'Insurance Plan Cards (Click to select plan):'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {/* All Plans Option Card */}
                  <button
                    type="button"
                    onClick={() => setSelectedPlanId('')}
                    className={`p-3 rounded-xl border text-start transition-all flex flex-col justify-between gap-1.5 ${
                      selectedPlanId === ''
                        ? 'bg-teal-50 border-teal-500 shadow-sm ring-2 ring-teal-200'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-slate-900 text-xs">{isAr ? 'جميع خطط الشركة' : 'All Company Plans'}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedPlanId === '' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isAr ? 'عام' : 'Global'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {isAr ? 'عرض القائمة العامة للتعاقد' : 'View global company tariff'}
                    </div>
                  </button>

                  {/* Individual Plan Cards */}
                  {plansForCompany.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    const cov = plan.coverage_percentage_default || 80;
                    const copay = plan.patient_copay_percentage_default || 20;

                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`p-3 rounded-xl border text-start transition-all flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? 'bg-teal-50 border-teal-500 shadow-sm ring-2 ring-teal-200'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-slate-900 text-xs truncate me-1">{plan.name_ar}</span>
                          <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 shrink-0">
                            {plan.code}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-600">
                          <span>{isAr ? `تغطية ${cov}%` : `Cov: ${cov}%`}</span>
                          <span className="font-bold text-teal-700">{isAr ? `تحمل ${copay}%` : `Copay: ${copay}%`}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Relationship Flow Architecture Card: Company -> Plan -> Price List */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white p-5 rounded-2xl shadow-sm border border-slate-800 space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-teal-300 border-b border-slate-700/60 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>{isAr ? 'علاقة شجرة الربط: الشركة ← خطة التغطية ← قائمة الأسعار المعتمدة' : 'Entity Hierarchy: Company → Plan → Assigned Price List'}</span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                {activeIPL ? activeIPL.id : 'No active tariff linked'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Tier 1: Company */}
              <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isAr ? '1. الشركة المتعاقدة' : '1. Company Entity'}
                </div>
                <div className="font-bold text-sm text-white truncate">{selectedCompany?.name_ar || '—'}</div>
                <div className="flex items-center gap-2 text-[10px] text-teal-300">
                  <span className="font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                    {selectedCompany?.code || 'N/A'}
                  </span>
                  <span>{selectedCompany?.active !== false ? (isAr ? 'عقد مباشر نشط' : 'Active Contract') : (isAr ? 'خصم غير مباشر' : 'Discount Only')}</span>
                </div>
              </div>

              {/* Tier 2: Plan */}
              <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isAr ? '2. خطة التغطية المحددة' : '2. Coverage Plan'}
                </div>
                <div className="font-bold text-sm text-teal-200 truncate">{selectedPlan?.name_ar || (isAr ? 'جميع خطط الشركة' : 'All Company Plans')}</div>
                <div className="flex items-center gap-2 text-[10px] text-slate-300 font-mono">
                  <span>{isAr ? `تغطية ${insuranceStats.avgCoverage}%` : `Cov: ${insuranceStats.avgCoverage}%`}</span>
                  <span>•</span>
                  <span>{isAr ? `تحمل ${insuranceStats.avgCopay}%` : `Copay: ${insuranceStats.avgCopay}%`}</span>
                </div>
              </div>

              {/* Tier 3: Assigned Price List */}
              <div className="p-3.5 bg-teal-900/60 rounded-xl border border-teal-700/60 space-y-1.5">
                <div className="text-[10px] font-bold text-teal-300 uppercase tracking-wider">
                  {isAr ? '3. قائمة الأسعار المعتمدة' : '3. Assigned Price List'}
                </div>
                <div className="font-bold text-sm text-white truncate">{activeIPL?.name || (isAr ? 'قائمة أسعار عامة' : 'General Tariff')}</div>
                <div className="flex items-center justify-between text-[10px] text-teal-200">
                  <span>{insuranceStats.totalCount} {isAr ? 'خدمة مسجلة' : 'Items'}</span>
                  <span className="px-2 py-0.5 bg-teal-500/20 text-emerald-300 rounded-full font-bold border border-emerald-400/30">
                    {isAr ? 'سارية ومطبقة' : 'Active Tariff'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* High-Level Summary Statistic Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-slate-500 font-semibold">{isAr ? 'إجمالي الخدمات التعاقدية' : 'Contracted Procedures'}</span>
                <h3 className="text-xl font-bold font-mono text-slate-900 mt-1">{insuranceStats.totalCount}</h3>
                <span className="text-[10px] text-slate-400">{isAr ? 'في قائمة الأسعار النشطة' : 'Active price items'}</span>
              </div>
              <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-slate-500 font-semibold">{isAr ? 'متوسط تحمل المريض' : 'Avg Patient Copay'}</span>
                <h3 className="text-xl font-bold font-mono text-teal-700 mt-1">{insuranceStats.avgCopay}%</h3>
                <span className="text-[10px] text-slate-400">{isAr ? `التغطية: ${insuranceStats.avgCoverage}%` : `Coverage: ${insuranceStats.avgCoverage}%`}</span>
              </div>
              <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl">
                <Percent className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>{isAr ? 'تتطلب موافقة مسبقة' : 'Requires Approval'}</span>
                </div>
                <h3 className="text-xl font-bold font-mono text-amber-950 mt-1">{insuranceStats.requiresApproval}</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300 inline-block mt-1">
                  {isAr ? 'موافقة مسبقة مطلوب' : 'Approval Required'}
                </span>
              </div>
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'تغطية مباشرة (بدون موافقة)' : 'No Approval Needed'}</span>
                </div>
                <h3 className="text-xl font-bold font-mono text-emerald-950 mt-1">{insuranceStats.noApproval}</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 inline-block mt-1">
                  {isAr ? 'بدون موافقة مسبقة' : 'Direct Coverage'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step-by-Step Interactive Workflow Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Progress Tracker Stepper Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between text-xs mb-3 font-bold text-slate-700">
            <span>
              {isAr ? 'مسار العمل الخماسي للأسعار' : '5-Step Price List Import Workflow'}
            </span>
            <span className="text-teal-700 font-mono">
              {isAr ? `الخطوة ${currentStep} من 5` : `Step ${currentStep} of 5`} (
              {Math.round((currentStep / 5) * 100)}%)
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {[
              {
                step: 1,
                titleAr: '1. تحميل النموذج',
                titleEn: '1. Download',
                icon: Download,
              },
              {
                step: 2,
                titleAr: '2. رفع الملف',
                titleEn: '2. Upload File',
                icon: Upload,
              },
              {
                step: 3,
                titleAr: '3. الفحص والتدقيق',
                titleEn: '3. Validate',
                icon: FileCheck,
              },
              {
                step: 4,
                titleAr: '4. معاينة الفروقات',
                titleEn: '4. Preview Diffs',
                icon: Eye,
              },
              {
                step: 5,
                titleAr: '5. الاعتماد والبث',
                titleEn: '5. Publish',
                icon: Send,
              },
            ].map((st) => {
              const Icon = st.icon;
              const isCompleted = currentStep > st.step;
              const isCurrent = currentStep === st.step;

              return (
                <button
                  key={st.step}
                  disabled={st.step > currentStep && !excelResult}
                  onClick={() => setCurrentStep(st.step as ExcelStep)}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    isCompleted
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : isCurrent
                      ? 'bg-teal-600 border-teal-600 text-white shadow-sm ring-2 ring-teal-300'
                      : 'bg-white border-slate-200 text-slate-400 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {isCompleted ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-[11px] font-bold whitespace-nowrap truncate max-w-full">
                    {isAr ? st.titleAr : st.titleEn}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Content Area */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex items-center gap-2.5">
              <XCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="font-semibold">{errorMessage}</p>
            </div>
          )}

          {/* STEP 1: DOWNLOAD TEMPLATE */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-5 bg-teal-50 border border-teal-200 rounded-2xl text-teal-900 text-xs">
                <Info className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm text-teal-950">
                    {isAr
                      ? 'الخطوة 1: تحميل نموذج الإكسل الموحد والتجهيز'
                      : 'Step 1: Download Standard Excel Template & Preparation'}
                  </h3>
                  <p className="mt-1 text-teal-800 leading-relaxed">
                    {isAr
                      ? 'قم بتحميل قالب الإكسل الجاهز لإدخال الأسعار. يضمن القالب مطابقة أكواد الخدمات (Service Code) والتصنيفات الطبية بدون أخطاء إملائية.'
                      : 'Download the pre-formatted Excel template. Ensure service codes and medical categories align with the practice directory.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 border border-slate-200 rounded-2xl bg-white space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="px-2.5 py-1 bg-teal-100 text-teal-800 text-[10px] font-bold rounded-full">
                      {isAr ? 'نموذج فارغ للخدمات' : 'Blank Template'}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-2">
                      {activeTab === 'cash'
                        ? isAr
                          ? 'قالب أسعار الخدمات النقدية'
                          : 'Cash Tariff Template'
                        : isAr
                        ? 'قالب أسعار التعاقدات التأمينية'
                        : 'Insurance Tariff Template'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {isAr
                        ? 'يتضمن الأعمدة الرئيسية المطلوبة للتحقق الرياضي والمنطقي'
                        : 'Includes required columns for price, code, and name validation.'}
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadSample}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isAr ? 'تحميل قالب الإكسل المعتمد' : 'Download Sample .XLSX'}</span>
                  </button>
                </div>

                <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50 space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm">
                    {isAr ? 'شروط الأعمدة المطلوبة في الملف:' : 'Required Column Specs:'}
                  </h4>
                  <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                    <li>
                      <strong className="text-slate-800">Service Code:</strong>{' '}
                      {isAr ? 'كود الخدمة الفريد (مثال: SRV-001)' : 'Unique code (e.g. SRV-001)'}
                    </li>
                    <li>
                      <strong className="text-slate-800">Service Name:</strong>{' '}
                      {isAr ? 'اسم الخدمة بالعربية والإنجليزية' : 'Service name in AR & EN'}
                    </li>
                    <li>
                      <strong className="text-slate-800">
                        {activeTab === 'cash' ? 'Cash Price:' : 'Contract Price:'}
                      </strong>{' '}
                      {isAr ? 'السعر بالجنيه المصري (رقم موجب)' : 'Price in EGP (positive number)'}
                    </li>
                    {activeTab === 'insurance' && (
                      <li>
                        <strong className="text-slate-800">Copay / Coverage %:</strong>{' '}
                        {isAr ? 'نسب التحمل والتغطية' : 'Coverage and copay percentages'}
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <span>{isAr ? 'الانتقال لخطوة رفع الملف' : 'Proceed to File Upload'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: UPLOAD FILE */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/50 hover:bg-teal-50 rounded-2xl p-8 text-center transition-all flex flex-col items-center justify-center space-y-3 cursor-pointer"
              >
                <div className="p-3 bg-white text-teal-600 rounded-2xl shadow-sm border border-teal-100">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {isAr ? 'قم بسحب وإفلات ملف الإكسل هنا' : 'Drag & Drop Excel File Here'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {isAr ? 'يدعم الملفات بصيغ (.xlsx, .xls, .csv)' : 'Supports .xlsx, .xls, .csv formats'}
                  </p>
                </div>

                <label className="cursor-pointer px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all inline-block">
                  <span>{isAr ? 'استعراض الجهاز واختيار الملف' : 'Browse Computer'}</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileChange(file);
                    }}
                  />
                </label>
              </div>

              {selectedFile && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                    <div>
                      <p className="font-bold text-slate-900">{selectedFile.name}</p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>

                  {isParsing ? (
                    <span className="text-teal-700 font-bold flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{isAr ? 'جاري الفحص...' : 'Validating...'}</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleFileChange(selectedFile)}
                      className="px-3.5 py-1.5 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-all"
                    >
                      {isAr ? 'بدء الفحص الآلي' : 'Start Validation'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: VALIDATION RESULTS */}
          {currentStep === 3 && excelResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold">{isAr ? 'إجمالي الصفوف' : 'Total Rows'}</span>
                    <h3 className="text-xl font-bold font-mono text-slate-900">{excelResult.total_rows}</h3>
                  </div>
                </div>

                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-emerald-800 font-semibold">{isAr ? 'صفوف صالحة للاعتماد' : 'Valid Rows'}</span>
                    <h3 className="text-xl font-bold font-mono text-emerald-950">{excelResult.valid_rows}</h3>
                  </div>
                </div>

                <div className={`p-5 rounded-2xl border shadow-sm flex items-center gap-3 ${
                  excelResult.invalid_rows > 0
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <div className={`p-2.5 rounded-xl ${
                    excelResult.invalid_rows > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-500'
                  }`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold">{isAr ? 'صفوف بها أخطاء' : 'Invalid Error Rows'}</span>
                    <h3 className="text-xl font-bold font-mono">{excelResult.invalid_rows}</h3>
                  </div>
                </div>
              </div>

              {/* Automated Validation Checks Summary */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
                <h4 className="font-bold text-slate-900 text-sm">
                  {isAr ? 'نتائج الفحص والتدقيق الآلي للملف:' : 'Automated Validation Rules Checklist:'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{isAr ? 'التحقق من وجود أكواد الخدمات الفريدة' : 'Service code presence check'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{isAr ? 'التحقق من عدم تكرار الأكواد في الملف' : 'Duplicate code check'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{isAr ? 'فحص القيم المادية (أسعار غير سالبة)' : 'Non-negative numeric price check'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{isAr ? 'فحص الأقسام والتصنيفات المعتمدة' : 'Medical category directory match'}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  {isAr ? 'إعادة رفع ملف آخر' : 'Re-upload File'}
                </button>

                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <span>{isAr ? 'الانتقال لمعاينة جدول الفروقات' : 'Proceed to Preview & Diffs'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PREVIEW DICTIONARY & DIFFS */}
          {currentStep === 4 && excelResult && (
            <div className="space-y-5">
              {/* Filter Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewFilter('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      previewFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isAr ? 'جميع الصفوف' : 'All Rows'} ({excelResult.rows.length})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('valid')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      previewFilter === 'valid'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    {isAr ? 'الصالحة فقط' : 'Valid Only'} ({excelResult.valid_rows})
                  </button>
                  {excelResult.invalid_rows > 0 && (
                    <button
                      onClick={() => setPreviewFilter('errors')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                        previewFilter === 'errors'
                          ? 'bg-red-600 text-white'
                          : 'bg-red-50 text-red-800 hover:bg-red-100'
                      }`}
                    >
                      {isAr ? 'الأخطاء فقط' : 'Errors Only'} ({excelResult.invalid_rows})
                    </button>
                  )}
                </div>

                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
                  <input
                    type="text"
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    placeholder={isAr ? 'بحث بالكود أو الاسم...' : 'Search preview rows...'}
                    className="w-full ps-9 pe-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm text-xs">
                <table className="w-full text-start">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-3 text-start">#</th>
                      <th className="px-3.5 py-3 text-start">{isAr ? 'حالة الصف' : 'Status'}</th>
                      <th className="px-3.5 py-3 text-start">{isAr ? 'كود الخدمة' : 'Code'}</th>
                      <th className="px-3.5 py-3 text-start">{isAr ? 'اسم الخدمة' : 'Service Name'}</th>
                      <th className="px-3.5 py-3 text-end">
                        {activeTab === 'cash' ? (isAr ? 'السعر النقدي' : 'Cash Price') : (isAr ? 'سعر التعاقد' : 'Agreed Price')}
                      </th>
                      <th className="px-3.5 py-3 text-center">{isAr ? 'التفاصيل / الأخطاء' : 'Details / Errors'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPreviewRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium">
                          {isAr ? 'لا توجد نتائج مطابقة للفلاتر' : 'No rows match filter criteria'}
                        </td>
                      </tr>
                    ) : (
                      filteredPreviewRows.map((r) => (
                        <tr
                          key={r.row_number}
                          className={!r.is_valid ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50'}
                        >
                          <td className="px-3.5 py-3 font-mono text-slate-400">{r.row_number}</td>
                          <td className="px-3.5 py-3">
                            {r.is_valid ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                {isAr ? 'سليم' : 'Valid'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                                {isAr ? 'خطأ' : 'Error'}
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-3 font-mono font-bold text-teal-700">{r.service_code}</td>
                          <td className="px-3.5 py-3 font-bold text-slate-900">
                            <div>{r.service_name_ar}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{r.service_name_en}</div>
                          </td>
                          <td className="px-3.5 py-3 text-end font-mono font-bold text-slate-900">
                            {r.cash_price.toLocaleString('en-US')} ج.م
                          </td>
                          <td className="px-3.5 py-3 text-center">
                            {r.is_valid ? (
                              <span className="text-slate-400 text-[11px]">{isAr ? 'جاهز للاعتماد' : 'Ready'}</span>
                            ) : (
                              <div className="text-red-700 text-[10px] font-bold space-y-0.5">
                                {(r.errors || []).map((err, i) => (
                                  <div key={i}>{err}</div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  {isAr ? 'الرجوع للنتائج' : 'Back'}
                </button>

                <button
                  disabled={excelResult.valid_rows === 0 || !canManagePricing}
                  onClick={() => setCurrentStep(5)}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <span>{isAr ? 'المتابعة لخطوة الاعتماد البث' : 'Proceed to Publication'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: PUBLISH VERSION */}
          {currentStep === 5 && excelResult && (
            <div className="space-y-6">
              {publishSuccess ? (
                <div className="p-8 bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-2xl shadow-sm text-center space-y-4 border border-emerald-800">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-300 border border-emerald-400/30">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-400/30 font-mono">
                      {publishedVersionTag}
                    </span>
                    <h3 className="text-xl font-bold mt-2">
                      {isAr ? 'تم نشر واعتماد قائمة الأسعار الجديدة بنجاح!' : 'Price List Published Successfully!'}
                    </h3>
                    <p className="text-xs text-emerald-200 mt-1">
                      {isAr
                        ? `تمت إضافة ${excelResult.valid_rows} خدمة معتمدة في قاعدة بيانات المركز بنجاح`
                        : `Successfully added ${excelResult.valid_rows} validated pricing items to practice records.`}
                    </p>
                  </div>

                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      onClick={handleResetFlow}
                      className="px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      {isAr ? 'اعتماد قائمة جديدة' : 'Upload Another Tariff'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-teal-900 text-xs">
                    <h4 className="font-bold text-sm text-teal-950">
                      {isAr ? 'تأكيد اعتماد وتطبيق قائمة الأسعار:' : 'Confirm Version Publication:'}
                    </h4>
                    <p className="mt-1 text-teal-800">
                      {isAr
                        ? `سيتم نشر إجمالي (${excelResult.valid_rows}) خدمة معتمدة وأرشفت الإصدارات السابقة للحفاظ على ثبات أسعار الفواتير التاريخية.`
                        : `Publishing will activate ${excelResult.valid_rows} validated items and archive prior versions for immutable billing integrity.`}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        {isAr ? 'تاريخ بداية السريان (Effective From):' : 'Effective From Date:'}
                      </label>
                      <input
                        type="date"
                        value={effectiveFrom}
                        onChange={(e) => setEffectiveFrom(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        {isAr ? 'ملاحظات الاعتماد والقرار:' : 'Approval Reference / Notes:'}
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={isAr ? 'مثال: تحديث معتمد للربع الأول 2026' : 'e.g. Q1 2026 Board Indexing'}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => setCurrentStep(4)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                    >
                      {isAr ? 'الرجوع للمعاينة' : 'Back'}
                    </button>

                    <button
                      onClick={handlePublish}
                      className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isAr ? 'تأكيد البث والاعتماد النهائي' : 'Publish & Activate Tariff'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active Directory Browser & Published Catalog Overview */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {activeTab === 'cash'
                ? isAr
                  ? 'دليل الأسعار النقدية النشط حالياً'
                  : 'Active Cash Price Directory'
                : isAr
                ? 'دليل تعاقدات أسعار التأمين النشط'
                : 'Active Insurance Tariff Directory'}
            </h3>
            <p className="text-slate-500 mt-0.5">
              {isAr ? 'عرض وتصفح جميع الأسعار المعتمدة للخدمات في النظام' : 'Browse active, published services and prices.'}
            </p>
          </div>

          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
            <input
              type="text"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder={isAr ? 'بحث في الأسعار الحالية...' : 'Search active tariff...'}
              className="w-full ps-9 pe-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>
        </div>

        {/* Directory Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
          <table className="w-full text-start">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3 text-start">{isAr ? 'كود الخدمة' : 'Code'}</th>
                <th className="px-3.5 py-3 text-start">{isAr ? 'اسم الخدمة' : 'Service Name'}</th>
                <th className="px-3.5 py-3 text-start">{isAr ? 'التصنيف الطبي' : 'Category'}</th>
                <th className="px-3.5 py-3 text-end">
                  {activeTab === 'cash'
                    ? isAr
                      ? 'السعر النقدي (ج.م)'
                      : 'Cash Price (EGP)'
                    : isAr
                    ? 'سعر التعاقد (ج.م)'
                    : 'Agreed Price (EGP)'}
                </th>
                {activeTab === 'insurance' && (
                  <>
                    <th className="px-3.5 py-3 text-center">{isAr ? 'تحمل المريض (Copay)' : 'Copay %'}</th>
                    <th className="px-3.5 py-3 text-center">{isAr ? 'حالة الموافقة الطبية' : 'Approval Status'}</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeCatalogDisplay.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'insurance' ? 6 : 4} className="px-4 py-8 text-center text-slate-400 font-medium">
                    {isAr ? 'لا توجد أسعار مسجلة لهذه الفئة حالياً' : 'No pricing records found'}
                  </td>
                </tr>
              ) : (
                activeCatalogDisplay.map((item: any, idx: number) => {
                  const sCode = item.code || item.service_code;
                  const sNameAr = item.name_ar || item.service?.name_ar || '—';
                  const sNameEn = item.name_en || item.service?.name_en || '—';
                  const sCat = item.category || item.service?.category || 'restorative';
                  const price = item.cash_price ?? item.insurance_price ?? 0;
                  const copay = item.patient_copay_percentage;
                  const reqApproval = item.requires_approval ?? item.service?.requires_approval ?? false;

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="px-3.5 py-3 font-mono font-bold text-teal-700">{sCode}</td>
                      <td className="px-3.5 py-3 font-bold text-slate-900">
                        <div>{sNameAr}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{sNameEn}</div>
                      </td>
                      <td className="px-3.5 py-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium">
                          {sCat}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-end font-mono font-bold text-emerald-700">
                        {price.toLocaleString('en-US')} ج.م
                      </td>
                      {activeTab === 'insurance' && (
                        <>
                          <td className="px-3.5 py-3 text-center font-mono font-bold text-amber-700">
                            {copay !== undefined ? `${copay}%` : '—'}
                          </td>
                          <td className="px-3.5 py-3 text-center">
                            {reqApproval ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold">
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                <span>{isAr ? 'تتطلب موافقة مسبقة' : 'Requires Approval'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{isAr ? 'بدون موافقة مسبقة' : 'No Approval'}</span>
                              </span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
