import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
  ShieldCheck,
  Eye,
  Send,
  FileCheck,
  Search,
  Filter,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getStoredPriceLists,
  getStoredPriceListVersions,
  getStoredServices,
  publishNewPriceListVersion,
} from '../../lib/receptionAndBillingStorage';
import {
  parseAndValidateExcelFile,
  generateSampleExcelBuffer,
} from './excelParser';
import {
  PriceList,
  PriceListVersion,
  Service,
  ExcelImportResult,
} from '../../types/receptionAndBilling';

export const CashPriceListView: React.FC = () => {
  const { session } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  const priceLists: PriceList[] = useMemo(() => getStoredPriceLists(), [refreshKey]);
  const versions: PriceListVersion[] = useMemo(
    () => getStoredPriceListVersions(),
    [refreshKey]
  );
  const services: Service[] = useMemo(() => getStoredServices(), []);

  // Primary cash price list
  const defaultCashList = useMemo(
    () => priceLists.find((pl) => pl.type === 'cash') || priceLists[0],
    [priceLists]
  );

  // Versions for this list
  const listVersions = useMemo(() => {
    if (!defaultCashList) return [];
    return versions.filter((v) => v.price_list_id === defaultCashList.id);
  }, [versions, defaultCashList]);

  // Current published version
  const publishedVersion = useMemo(
    () => listVersions.find((v) => v.status === 'published'),
    [listVersions]
  );

  // Excel Import Flow States: 'idle' | 'parsing' | 'preview' | 'success'
  const [importStep, setImportStep] = useState<'idle' | 'parsing' | 'preview' | 'success'>('idle');
  const [excelResult, setExcelResult] = useState<ExcelImportResult | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [notes, setNotes] = useState<string>('تحديث معتمد لأسعار الربع السنوي 2026');
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search in published price list
  const [serviceSearch, setServiceSearch] = useState('');

  // Check role permission
  const canManagePricing = session?.role.key === 'center_manager';

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSelectedFileName(file.name);
    setImportStep('parsing');

    try {
      const result = await parseAndValidateExcelFile(file);
      setExcelResult(result);
      setImportStep('preview');
    } catch (err: any) {
      setErrorMessage(
        isAr
          ? `فشل في قراءة ملف الإكسل: ${err.message}`
          : `Failed to parse Excel file: ${err.message}`
      );
      setImportStep('idle');
    }
  };

  // Download Sample Template
  const handleDownloadSample = () => {
    const buffer = generateSampleExcelBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Dental_Cash_Price_List_Template_Egypt.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Publish new version
  const handlePublish = () => {
    if (!excelResult || !defaultCashList) return;
    setErrorMessage(null);

    try {
      publishNewPriceListVersion({
        priceListId: defaultCashList.id,
        effectiveFrom,
        notes,
        validatedRows: excelResult.validRows,
        publishedByStaffId: session?.profile.id || 'usr_staff_01',
      });

      setImportStep('success');
      refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to publish new version');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-teal-50 text-teal-700 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {isAr ? 'قوائم الأسعار النقدية واعتماد الإكسل' : 'Cash Price Lists & Excel Versioning'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'إدارة دورة حياة الأسعار، التدقيق الرياضي للملفات، وثبات أسعار المعاملات التاريخية'
                  : 'Manage pricing lifecycle (Draft → Validate → Preview → Publish) with immutable audit'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadSample}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{isAr ? 'تحميل قالب الإكسل المعتمد' : 'Download Sample Excel'}</span>
          </button>
        </div>
      </div>

      {!canManagePricing && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">
              {isAr ? 'تنبيه الصلاحيات الأمنية:' : 'Role Authorization Warning:'}
            </span>
            <p className="text-[11px] text-amber-700 mt-0.5">
              {isAr
                ? 'تعديل ونشر قوائم الأسعار محصور فقط بمدير المركز (Center Manager). يمكنك الاطلاع على الأسعار الحالية كقراءة فقط.'
                : 'Only Center Managers can upload, validate, and publish price lists. Read-only access granted.'}
            </p>
          </div>
        </div>
      )}

      {/* Published Active Version Card */}
      {publishedVersion && (
        <div className="bg-gradient-to-r from-teal-900 to-emerald-950 text-white p-6 rounded-2xl shadow-sm border border-teal-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
                  {isAr ? 'الإصدار النشط المعتمد' : 'Active Published Version'}
                </span>
                <span className="text-xs font-mono text-teal-200">
                  v{publishedVersion.version_number}.0
                </span>
              </div>
              <h2 className="text-lg font-bold mt-2">
                {isAr ? defaultCashList?.name_ar : defaultCashList?.name_en}
              </h2>
              <p className="text-xs text-teal-200/80 mt-1">
                {publishedVersion.notes || (isAr ? 'لا توجد ملاحظات' : 'No notes recorded')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-white/10 p-3.5 rounded-xl border border-white/10 backdrop-blur-sm">
              <div>
                <span className="text-teal-200">{isAr ? 'ساري من:' : 'Effective From:'}</span>
                <div className="font-bold font-mono text-white mt-0.5">
                  {publishedVersion.effective_from}
                </div>
              </div>
              <div>
                <span className="text-teal-200">{isAr ? 'تاريخ النشر:' : 'Published At:'}</span>
                <div className="font-bold font-mono text-white mt-0.5">
                  {publishedVersion.published_at?.split('T')[0] || '2026-01-01'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel Upload / Preview / Publish Engine (Only for Center Manager) */}
      {canManagePricing && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-bold text-slate-900">
                {isAr ? 'استيراد وتحديث الأسعار عبر ملف الإكسل (Excel Import)' : 'Excel Price List Importer'}
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              {isAr ? 'يدعم صيغ .xlsx و .xls و .csv' : 'Supports .xlsx, .xls, .csv'}
            </span>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {importStep === 'idle' && (
            <div className="p-8 border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl text-center bg-slate-50/50 transition-colors">
              <FileSpreadsheet className="w-12 h-12 text-teal-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-800">
                {isAr
                  ? 'اسحب ملف الإكسل هنا أو اضغط للاختيار من جهازك'
                  : 'Drag & drop Excel file here or click to browse'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isAr
                  ? 'يتم التحقق آلياً من الأكواد، الأسعار الموجبة، التصنيفات، ومنع التكرار'
                  : 'Automatically validates service codes, positive prices, categories, and duplicates'}
              </p>

              <label className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm">
                <Upload className="w-4 h-4" />
                <span>{isAr ? 'اختيار ملف الإكسل' : 'Select Excel File'}</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {importStep === 'parsing' && (
            <div className="p-12 text-center text-teal-700 space-y-3">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold">
                {isAr ? 'جاري فحص وتدقيق بيانات الملف...' : 'Validating Excel rows...'}
              </p>
            </div>
          )}

          {importStep === 'preview' && excelResult && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500">{isAr ? 'إجمالي الصفوف المفحوصة:' : 'Total Rows:'}</span>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {excelResult.totalRows}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-emerald-700 font-bold">{isAr ? 'الصفوف السليمة المعتمدة:' : 'Valid Rows:'}</span>
                  <div className="text-lg font-black text-emerald-800 mt-0.5">
                    {excelResult.validRows.length}
                  </div>
                </div>
                <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                  <span className="text-red-700 font-bold">{isAr ? 'الصفوف التي تحتوي أخطاء:' : 'Invalid Rows:'}</span>
                  <div className="text-lg font-black text-red-800 mt-0.5">
                    {excelResult.invalidRows.length}
                  </div>
                </div>
              </div>

              {/* Invalid rows warning table if any */}
              {excelResult.invalidRows.length > 0 && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-red-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>{isAr ? 'أخطاء تم رصدها بالملف (لن يتم استيرادها):' : 'Validation Errors in Rows:'}</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] text-red-700">
                    {excelResult.invalidRows.map((inv, idx) => (
                      <div key={idx} className="p-2 bg-white rounded border border-red-200">
                        <span className="font-bold">الصف {inv.row_index}: </span>
                        <span>{inv.service_code || 'بدون كود'} — {inv.errors.join(' | ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Table of Valid Rows */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">
                  {isAr ? 'معاينة الأسعار المعتمدة قبل النشر (Preview):' : 'Price Preview Before Publishing:'}
                </h4>
                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-start">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-3.5 py-2.5 text-start">{isAr ? 'الكود' : 'Code'}</th>
                        <th className="px-3.5 py-2.5 text-start">{isAr ? 'اسم الخدمة' : 'Service Name'}</th>
                        <th className="px-3.5 py-2.5 text-start">{isAr ? 'التصنيف' : 'Category'}</th>
                        <th className="px-3.5 py-2.5 text-end">{isAr ? 'السعر النقدي (EGP)' : 'Cash Price'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {excelResult.validRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3.5 py-2 font-mono font-bold text-teal-700">
                            {row.service_code}
                          </td>
                          <td className="px-3.5 py-2">
                            <span className="font-bold text-slate-900">{row.service_name_ar}</span>
                            <span className="text-slate-500 ms-1 text-[11px]">({row.service_name_en})</span>
                          </td>
                          <td className="px-3.5 py-2 text-slate-600">{row.category}</td>
                          <td className="px-3.5 py-2 text-end font-mono font-bold text-slate-900">
                            {row.cash_price.toLocaleString('en-US')} ج.م
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Publishing metadata inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {isAr ? 'تاريخ بدء سريان الأسعار الجديدة' : 'Effective From Date'}
                  </label>
                  <input
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {isAr ? 'ملاحظات الإصدار الجديد' : 'Version Notes'}
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setImportStep('idle')}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 font-semibold text-xs"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={excelResult.validRows.length === 0}
                  onClick={handlePublish}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isAr ? 'اعتماد ونشر الإصدار الجديد' : 'Publish New Version'} (
                    {excelResult.validRows.length} {isAr ? 'خدمة' : 'services'})
                  </span>
                </button>
              </div>
            </div>
          )}

          {importStep === 'success' && (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-emerald-900 text-sm">
                {isAr
                  ? 'تم اعتماد ونشر قائمة الأسعار الجديدة بنجاح!'
                  : 'New Price List Published Successfully!'}
              </h3>
              <p className="text-xs text-emerald-700">
                {isAr
                  ? 'تم أرشفة الإصدارات السابقة وتأمين أسعار الفواتير والمعاملات القديمة من أي تعديل بأثر رجعي.'
                  : 'Previous versions safely archived. Historical transactions remain immutable.'}
              </p>
              <button
                type="button"
                onClick={() => setImportStep('idle')}
                className="px-4 py-2 bg-emerald-700 text-white font-bold rounded-xl text-xs hover:bg-emerald-800"
              >
                {isAr ? 'تم' : 'Done'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Version History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-slate-900">
              {isAr ? 'سجل إصدارات قائمة الأسعار (Version History)' : 'Price List Version History'}
            </h3>
          </div>
          <span className="text-slate-500 font-mono">
            {listVersions.length} {isAr ? 'إصدار' : 'versions'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3 text-start">{isAr ? 'رقم الإصدار' : 'Version'}</th>
                <th className="px-3.5 py-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="px-3.5 py-3 text-start">{isAr ? 'ساري من' : 'Effective From'}</th>
                <th className="px-3.5 py-3 text-start">{isAr ? 'تاريخ النشر' : 'Published At'}</th>
                <th className="px-3.5 py-3 text-start">{isAr ? 'ملاحظات' : 'Notes'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listVersions.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-3.5 py-3 font-mono font-bold text-slate-900">
                    v{v.version_number}.0
                  </td>
                  <td className="px-3.5 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        v.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : v.status === 'archived'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {v.status === 'published'
                        ? isAr
                          ? 'منشور ونشط'
                          : 'Published'
                        : v.status === 'archived'
                        ? isAr
                          ? 'مؤرشف تاريخياً'
                          : 'Archived'
                        : v.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 font-mono text-slate-700">{v.effective_from}</td>
                  <td className="px-3.5 py-3 font-mono text-slate-500">
                    {v.published_at ? v.published_at.split('T')[0] : '—'}
                  </td>
                  <td className="px-3.5 py-3 text-slate-600">{v.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
