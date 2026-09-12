import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Edit2,
  Power,
  Search,
  Tag,
  Clock,
  ShieldAlert,
  Stethoscope,
  Check,
  AlertCircle,
  FolderTree,
  ListOrdered,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getStoredServices,
  getStoredServiceCategories,
  saveService,
  saveServiceCategory,
  deactivateServiceCategory,
  reactivateServiceCategory,
  deleteServiceCategory,
  deactivateService,
  reactivateService,
  isCategoryInUse,
} from '../../lib/receptionAndBillingStorage';
import { Service, ServiceCategory } from '../../types/receptionAndBilling';

export const ServiceCatalogView: React.FC = () => {
  const { session } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'services' | 'categories'>('services');
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  const services: Service[] = useMemo(() => getStoredServices(), [refreshKey]);
  const categories: ServiceCategory[] = useMemo(() => getStoredServiceCategories(), [refreshKey]);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Service Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceCode, setServiceCode] = useState('');
  const [serviceNameAr, setServiceNameAr] = useState('');
  const [serviceNameEn, setServiceNameEn] = useState('');
  const [serviceCategoryId, setServiceCategoryId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [requiresDoctor, setRequiresDoctor] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [isServiceActive, setIsServiceActive] = useState(true);
  const [serviceError, setServiceError] = useState<string | null>(null);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catCode, setCatCode] = useState('');
  const [catNameAr, setCatNameAr] = useState('');
  const [catNameEn, setCatNameEn] = useState('');
  const [catDisplayOrder, setCatDisplayOrder] = useState<number>(1);
  const [isCatActive, setIsCatActive] = useState(true);
  const [catError, setCatError] = useState<string | null>(null);
  const [catSuccessMsg, setCatSuccessMsg] = useState<string | null>(null);

  // Open modal for new service
  const handleAddNewService = () => {
    setEditingServiceId(null);
    setServiceCode(`SRV-${String(services.length + 1).padStart(3, '0')}`);
    setServiceNameAr('');
    setServiceNameEn('');
    const activeCats = categories.filter((c) => c.active !== false);
    setServiceCategoryId(activeCats[0]?.id || categories[0]?.id || '');
    setDurationMinutes(30);
    setRequiresDoctor(true);
    setRequiresApproval(false);
    setIsServiceActive(true);
    setServiceError(null);
    setIsServiceModalOpen(true);
  };

  // Open modal for editing service
  const handleEditService = (srv: Service) => {
    setEditingServiceId(srv.id);
    setServiceCode(srv.code);
    setServiceNameAr(srv.name_ar);
    setServiceNameEn(srv.name_en);
    setServiceCategoryId(srv.category_id || '');
    setDurationMinutes(srv.default_duration_minutes || srv.duration_minutes || 30);
    setRequiresDoctor(srv.requires_doctor);
    setRequiresApproval(srv.requires_approval);
    setIsServiceActive(srv.active !== false && srv.is_active !== false);
    setServiceError(null);
    setIsServiceModalOpen(true);
  };

  // Toggle active state for service
  const handleToggleServiceActive = (srv: Service) => {
    const currentActive = srv.active !== false && srv.is_active !== false;
    if (currentActive) {
      deactivateService(srv.id);
    } else {
      reactivateService(srv.id);
    }
    refresh();
  };

  // Save Service
  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    setServiceError(null);

    if (!serviceCode.trim() || !serviceNameAr.trim() || !serviceNameEn.trim()) {
      setServiceError(isAr ? 'كافة الحقول المطلوبة يجب ملؤها' : 'Code and Names are required');
      return;
    }

    const targetCategory = categories.find((c) => c.id === serviceCategoryId);
    if (targetCategory && !targetCategory.active && !editingServiceId) {
      setServiceError(
        isAr
          ? 'لا يمكن إضافة خدمة جديدة إلى تصنيف معطل. يرجى تفعيل التصنيف أولاً أو اختيار تصنيف نشط.'
          : 'Cannot add a new service to an inactive category. Please activate the category first.'
      );
      return;
    }

    try {
      saveService({
        id: editingServiceId || undefined,
        organization_id: session?.profile.organization_id || 'org_dental_egy_01',
        category_id: serviceCategoryId,
        code: serviceCode.trim().toUpperCase(),
        name_ar: serviceNameAr.trim(),
        name_en: serviceNameEn.trim(),
        default_duration_minutes: durationMinutes,
        duration_minutes: durationMinutes,
        requires_doctor: requiresDoctor,
        requires_approval: requiresApproval,
        active: isServiceActive,
        is_active: isServiceActive,
      });

      setIsServiceModalOpen(false);
      refresh();
    } catch (err: any) {
      setServiceError(err.message || 'Error saving service');
    }
  };

  // Category Modal Handlers
  const handleAddNewCategory = () => {
    setEditingCategoryId(null);
    setCatCode(`CAT-${String(categories.length + 1).padStart(2, '0')}`);
    setCatNameAr('');
    setCatNameEn('');
    setCatDisplayOrder(categories.length + 1);
    setIsCatActive(true);
    setCatError(null);
    setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (cat: ServiceCategory) => {
    setEditingCategoryId(cat.id);
    setCatCode(cat.code);
    setCatNameAr(cat.name_ar);
    setCatNameEn(cat.name_en);
    setCatDisplayOrder(cat.display_order || 1);
    setIsCatActive(cat.active !== false);
    setCatError(null);
    setIsCategoryModalOpen(true);
  };

  const handleToggleCategoryActive = (cat: ServiceCategory) => {
    const currentActive = cat.active !== false;
    if (currentActive) {
      deactivateServiceCategory(cat.id);
    } else {
      reactivateServiceCategory(cat.id);
    }
    refresh();
  };

  const handleDeleteCategory = (cat: ServiceCategory) => {
    const result = deleteServiceCategory(cat.id);
    if (!result.success) {
      alert(result.error);
    } else {
      refresh();
    }
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCatError(null);

    if (!catCode.trim() || !catNameAr.trim() || !catNameEn.trim()) {
      setCatError(isAr ? 'كود واسم التصنيف بالعربية والإنجليزية مطلوبان' : 'Code and Names are required');
      return;
    }

    try {
      saveServiceCategory({
        id: editingCategoryId || undefined,
        organization_id: session?.profile.organization_id || 'org_dental_egy_01',
        code: catCode.trim().toUpperCase(),
        name_ar: catNameAr.trim(),
        name_en: catNameEn.trim(),
        display_order: Number(catDisplayOrder),
        active: isCatActive,
      });

      setIsCategoryModalOpen(false);
      setCatSuccessMsg(isAr ? 'تم حفظ التصنيف بنجاح' : 'Category saved successfully');
      setTimeout(() => setCatSuccessMsg(null), 3000);
      refresh();
    } catch (err: any) {
      setCatError(err.message || 'Error saving category');
    }
  };

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (selectedCategory !== 'all' && s.category_id !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.code.toLowerCase().includes(q) ||
          s.name_ar.toLowerCase().includes(q) ||
          s.name_en.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [services, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-teal-50 text-teal-700 rounded-xl">
              <FolderTree className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {isAr ? 'كتالوج الخدمات والتصنيفات الطبية' : 'Service Catalog & Categories'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'هيكلية الإجراءات السنية المعرفة من الإدارة وربطها بالتصنيفات الطبية'
                  : 'Admin-managed hierarchy (Category → Services) with active status controls'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab & Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              onClick={() => setActiveTab('services')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'services'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 inline-block me-1" />
              {isAr ? 'الخدمات السنية' : 'Dental Services'} ({services.length})
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'categories'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 inline-block me-1" />
              {isAr ? 'إدارة التصنيفات' : 'Category Management'} ({categories.length})
            </button>
          </div>

          {activeTab === 'services' ? (
            <button
              onClick={handleAddNewService}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'إضافة خدمة جديدة' : 'Add Service'}</span>
            </button>
          ) : (
            <button
              onClick={handleAddNewCategory}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'إضافة تصنيف طبي' : 'Add Category'}</span>
            </button>
          )}
        </div>
      </div>

      {catSuccessMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{catSuccessMsg}</span>
        </div>
      )}

      {/* View: Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                {isAr ? 'التصنيفات المعتمدة في المركز' : 'Defined Clinical Categories'} ({categories.length})
              </span>
              <span className="text-slate-500 text-[11px]">
                {isAr
                  ? 'التصنيف المعطل يمنع إضافة خدمات جديدة إليه، مع الحفاظ على الخدمات التاريخية'
                  : 'Inactive categories prevent new service assignments while protecting historical records'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3 text-start">{isAr ? 'الترتيب' : 'Order'}</th>
                    <th className="px-3.5 py-3 text-start">{isAr ? 'كود التصنيف' : 'Code'}</th>
                    <th className="px-3.5 py-3 text-start">{isAr ? 'اسم التصنيف (عربي / English)' : 'Category Name'}</th>
                    <th className="px-3.5 py-3 text-center">{isAr ? 'عدد الخدمات' : 'Services Count'}</th>
                    <th className="px-3.5 py-3 text-center">{isAr ? 'حالة التفعيل' : 'Active Status'}</th>
                    <th className="px-3.5 py-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map((cat) => {
                    const catServices = services.filter((s) => s.category_id === cat.id);
                    const isUsed = isCategoryInUse(cat.id);
                    const isActive = cat.active !== false;

                    return (
                      <tr
                        key={cat.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          !isActive ? 'bg-slate-50/50 opacity-75' : ''
                        }`}
                      >
                        <td className="px-3.5 py-3 font-mono font-bold text-slate-500">
                          #{cat.display_order ?? 1}
                        </td>

                        <td className="px-3.5 py-3 font-mono font-bold text-teal-700">
                          {cat.code}
                        </td>

                        <td className="px-3.5 py-3">
                          <div className="font-bold text-slate-900">{cat.name_ar}</div>
                          <div className="text-[11px] text-slate-500">{cat.name_en}</div>
                        </td>

                        <td className="px-3.5 py-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold font-mono">
                            {catServices.length} {isAr ? 'خدمة' : 'services'}
                          </span>
                        </td>

                        <td className="px-3.5 py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}
                          >
                            {isActive ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
                          </span>
                        </td>

                        <td className="px-3.5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEditCategory(cat)}
                              title={isAr ? 'تعديل التصنيف' : 'Edit Category'}
                              className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleToggleCategoryActive(cat)}
                              title={
                                isActive
                                  ? isAr
                                    ? 'تعطيل التصنيف'
                                    : 'Deactivate Category'
                                  : isAr
                                  ? 'إعادة تفعيل التصنيف'
                                  : 'Reactivate Category'
                              }
                              className={`p-1.5 rounded-lg transition ${
                                isActive
                                  ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                                  : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteCategory(cat)}
                              title={
                                isUsed
                                  ? isAr
                                    ? 'لا يمكن حذفه لاستخدامه في خدمات مسجلة'
                                    : 'In use by services'
                                  : isAr
                                  ? 'حذف التصنيف'
                                  : 'Delete Category'
                              }
                              className={`p-1.5 rounded-lg transition ${
                                isUsed
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                              }`}
                              disabled={isUsed}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View: Services Tab */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs">
            <div>
              <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'تصفية حسب التصنيف الطبي' : 'Filter by Category'}</span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
              >
                <option value="all">{isAr ? 'جميع التصنيفات' : 'All Categories'}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {isAr ? c.name_ar : c.name_en} {c.active === false ? `(${isAr ? 'معطل' : 'Inactive'})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'بحث بالاسم أو الكود' : 'Search Code or Name'}</span>
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'مثال: SRV-001 أو خلع أو حشو...' : 'SRV-001, extraction, filling...'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
              />
            </div>
          </div>

          {/* Services Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                {isAr ? 'إجمالي الخدمات المعروضة:' : 'Total Services:'} {filteredServices.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3 text-start">{isAr ? 'الكود' : 'Code'}</th>
                    <th className="px-3.5 py-3 text-start">{isAr ? 'اسم الخدمة (عربي / English)' : 'Service Name'}</th>
                    <th className="px-3.5 py-3 text-start">{isAr ? 'التصنيف' : 'Category'}</th>
                    <th className="px-3.5 py-3 text-start">{isAr ? 'المدة' : 'Duration'}</th>
                    <th className="px-3.5 py-3 text-center">{isAr ? 'طبيب مطلوب؟' : 'Doctor Req.'}</th>
                    <th className="px-3.5 py-3 text-center">{isAr ? 'موافقة مسبقة؟' : 'Approval Req.'}</th>
                    <th className="px-3.5 py-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="px-3.5 py-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredServices.map((srv) => {
                    const category = categories.find((c) => c.id === srv.category_id);
                    const isActive = srv.active !== false && srv.is_active !== false;

                    return (
                      <tr
                        key={srv.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          !isActive ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="px-3.5 py-3 font-mono font-bold text-teal-700">
                          {srv.code}
                        </td>

                        <td className="px-3.5 py-3">
                          <div className="font-bold text-slate-900">{srv.name_ar}</div>
                          <div className="text-[11px] text-slate-500">{srv.name_en}</div>
                        </td>

                        <td className="px-3.5 py-3">
                          <span className="px-2 py-0.5 rounded-lg text-[11px] bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                            {category ? (isAr ? category.name_ar : category.name_en) : '—'}
                          </span>
                        </td>

                        <td className="px-3.5 py-3">
                          <span className="flex items-center gap-1 text-slate-600">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{srv.default_duration_minutes || srv.duration_minutes || 30} {isAr ? 'دقيقة' : 'mins'}</span>
                          </span>
                        </td>

                        <td className="px-3.5 py-3 text-center">
                          {srv.requires_doctor ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold">
                              <Stethoscope className="w-2.5 h-2.5" />
                              {isAr ? 'نعم' : 'Yes'}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">{isAr ? 'لا' : 'No'}</span>
                          )}
                        </td>

                        <td className="px-3.5 py-3 text-center">
                          {srv.requires_approval ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
                              <ShieldAlert className="w-2.5 h-2.5" />
                              {isAr ? 'مطلوبة' : 'Required'}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">{isAr ? 'لا' : 'No'}</span>
                          )}
                        </td>

                        <td className="px-3.5 py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}
                          >
                            {isActive ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
                          </span>
                        </td>

                        <td className="px-3.5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEditService(srv)}
                              title={isAr ? 'تعديل الخدمة' : 'Edit Service'}
                              className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleToggleServiceActive(srv)}
                              title={
                                isActive
                                  ? isAr
                                    ? 'تعطيل الخدمة'
                                    : 'Deactivate Service'
                                  : isAr
                                  ? 'تفعيل الخدمة'
                                  : 'Activate Service'
                              }
                              className={`p-1.5 rounded-lg transition ${
                                isActive
                                  ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                                  : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal (Add / Edit) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm">
                  {editingCategoryId
                    ? isAr
                      ? 'تعديل التصنيف الطبي'
                      : 'Edit Category'
                    : isAr
                    ? 'إضافة تصنيف طبي جديد'
                    : 'Add New Category'}
                </h3>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-5 space-y-4 text-xs">
              {catError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{catError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {isAr ? 'كود التصنيف' : 'Category Code'} *
                  </label>
                  <input
                    type="text"
                    value={catCode}
                    onChange={(e) => setCatCode(e.target.value)}
                    placeholder="e.g. ENDO, SURG"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {isAr ? 'ترتيب العرض' : 'Display Order'}
                  </label>
                  <input
                    type="number"
                    value={catDisplayOrder}
                    onChange={(e) => setCatDisplayOrder(Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {isAr ? 'اسم التصنيف بالعربية' : 'Category Name (Arabic)'} *
                </label>
                <input
                  type="text"
                  value={catNameAr}
                  onChange={(e) => setCatNameAr(e.target.value)}
                  placeholder="مثال: جراحة الفم والأسنان"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {isAr ? 'اسم التصنيف بالإنجليزية' : 'Category Name (English)'} *
                </label>
                <input
                  type="text"
                  value={catNameEn}
                  onChange={(e) => setCatNameEn(e.target.value)}
                  placeholder="e.g. Oral Surgery"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="catActive"
                  checked={isCatActive}
                  onChange={(e) => setIsCatActive(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <label htmlFor="catActive" className="font-bold text-slate-800 cursor-pointer">
                  {isAr ? 'تفعيل التصنيف (يمكن إسناد خدمات له)' : 'Active Category'}
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isAr ? 'حفظ التصنيف' : 'Save Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Service Modal (Add / Edit) */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in">
            <div className="p-4 bg-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-200" />
                <h3 className="font-bold text-sm">
                  {editingServiceId
                    ? isAr
                      ? 'تعديل الخدمة السنية'
                      : 'Edit Dental Service'
                    : isAr
                    ? 'إضافة خدمة سنية جديدة'
                    : 'Add New Dental Service'}
                </h3>
              </div>
              <button
                onClick={() => setIsServiceModalOpen(false)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} className="p-5 space-y-4 text-xs">
              {serviceError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{serviceError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {isAr ? 'كود الخدمة' : 'Service Code'} *
                  </label>
                  <input
                    type="text"
                    value={serviceCode}
                    onChange={(e) => setServiceCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {isAr ? 'التصنيف الطبي' : 'Category'} *
                  </label>
                  <select
                    value={serviceCategoryId}
                    onChange={(e) => setServiceCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} disabled={!c.active && !editingServiceId}>
                        {isAr ? c.name_ar : c.name_en} {c.active === false ? `(${isAr ? 'معطل' : 'Inactive'})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {isAr ? 'اسم الخدمة بالعربية' : 'Arabic Name'} *
                </label>
                <input
                  type="text"
                  value={serviceNameAr}
                  onChange={(e) => setServiceNameAr(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {isAr ? 'اسم الخدمة بالإنجليزية' : 'English Name'} *
                </label>
                <input
                  type="text"
                  value={serviceNameEn}
                  onChange={(e) => setServiceNameEn(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {isAr ? 'المدة التقديرية للإجراء (بالدقائق)' : 'Duration (Minutes)'} *
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                >
                  <option value={15}>15 {isAr ? 'دقيقة' : 'mins'}</option>
                  <option value={20}>20 {isAr ? 'دقيقة' : 'mins'}</option>
                  <option value={30}>30 {isAr ? 'دقيقة' : 'mins'}</option>
                  <option value={45}>45 {isAr ? 'دقيقة' : 'mins'}</option>
                  <option value={60}>60 {isAr ? 'دقيقة' : 'mins'}</option>
                  <option value={90}>90 {isAr ? 'دقيقة' : 'mins'}</option>
                </select>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="srvRequiresDoctor"
                    checked={requiresDoctor}
                    onChange={(e) => setRequiresDoctor(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <label htmlFor="srvRequiresDoctor" className="font-bold text-slate-800 cursor-pointer">
                    {isAr ? 'تتطلب طبيب أسنان مرخص' : 'Requires Licensed Dentist'}
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="srvRequiresApproval"
                    checked={requiresApproval}
                    onChange={(e) => setRequiresApproval(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <label htmlFor="srvRequiresApproval" className="font-bold text-slate-800 cursor-pointer">
                    {isAr ? 'تتطلب موافقة تأمين مسبقة' : 'Requires Pre-authorization'}
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="srvActive"
                    checked={isServiceActive}
                    onChange={(e) => setIsServiceActive(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <label htmlFor="srvActive" className="font-bold text-slate-800 cursor-pointer">
                    {isAr ? 'تفعيل الخدمة في النظام' : 'Active in System'}
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isAr ? 'حفظ الخدمة' : 'Save Service'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
