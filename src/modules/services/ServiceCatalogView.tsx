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
  Trash2,
  Layers,
  Truck,
  Banknote,
  ShieldCheck,
  Lock,
  Filter,
  Building2,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getStoredServices,
  getStoredServiceCategories,
  getStoredSuppliers,
  getStoredPriceListItems,
  getStoredInsurancePriceListItems,
  saveService,
  saveServiceCategory,
  deactivateServiceCategory,
  reactivateServiceCategory,
  deleteServiceCategory,
  deactivateService,
  reactivateService,
  isCategoryInUse,
} from '../../lib/receptionAndBillingStorage';
import { Service, ServiceCategory, Supplier } from '../../types/receptionAndBilling';

export const ServiceCatalogView: React.FC = () => {
  const { session } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const userRole = session?.role?.key || session?.profile?.role_key || 'receptionist';
  const isManager = userRole === 'center_manager' || userRole === 'branch_manager';

  const [activeTab, setActiveTab] = useState<'services' | 'categories'>('services');
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  const services: Service[] = useMemo(() => getStoredServices(), [refreshKey]);
  const categories: ServiceCategory[] = useMemo(() => getStoredServiceCategories(), [refreshKey]);
  const suppliers: Supplier[] = useMemo(
    () => getStoredSuppliers(session?.profile?.organization_id),
    [refreshKey, session]
  );
  const priceListItems = useMemo(() => getStoredPriceListItems(), [refreshKey]);
  const insurancePriceListItems = useMemo(() => getStoredInsurancePriceListItems(), [refreshKey]);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Service Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceCode, setServiceCode] = useState('');
  const [serviceNameAr, setServiceNameAr] = useState('');
  const [serviceNameEn, setServiceNameEn] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceCategoryId, setServiceCategoryId] = useState('');
  const [serviceSupplierId, setServiceSupplierId] = useState('');
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
  const [catDescription, setCatDescription] = useState('');
  const [catDisplayOrder, setCatDisplayOrder] = useState<number>(1);
  const [isCatActive, setIsCatActive] = useState(true);
  const [catError, setCatError] = useState<string | null>(null);
  const [catSuccessMsg, setCatSuccessMsg] = useState<string | null>(null);

  // Open modal for new service
  const handleAddNewService = () => {
    if (!isManager) return;
    setEditingServiceId(null);
    setServiceCode(`SRV-${String(services.length + 1).padStart(3, '0')}`);
    setServiceNameAr('');
    setServiceNameEn('');
    setServiceDescription('');
    const activeCats = categories.filter((c) => c.active !== false);
    setServiceCategoryId(activeCats[0]?.id || categories[0]?.id || '');
    setServiceSupplierId('');
    setDurationMinutes(30);
    setRequiresDoctor(true);
    setRequiresApproval(false);
    setIsServiceActive(true);
    setServiceError(null);
    setIsServiceModalOpen(true);
  };

  // Open modal for editing service
  const handleEditService = (srv: Service) => {
    if (!isManager) return;
    setEditingServiceId(srv.id);
    setServiceCode(srv.code);
    setServiceNameAr(srv.name_ar);
    setServiceNameEn(srv.name_en);
    setServiceDescription(srv.description || srv.notes || '');
    setServiceCategoryId(srv.category_id || '');
    setServiceSupplierId(srv.default_supplier_id || '');
    setDurationMinutes(srv.default_duration_minutes || srv.duration_minutes || 30);
    setRequiresDoctor(srv.requires_doctor);
    setRequiresApproval(srv.requires_approval);
    setIsServiceActive(srv.active !== false && srv.is_active !== false);
    setServiceError(null);
    setIsServiceModalOpen(true);
  };

  // Toggle active state for service
  const handleToggleServiceActive = (srv: Service) => {
    if (!isManager) return;
    const currentActive = srv.active !== false && srv.is_active !== false;
    if (currentActive) {
      deactivateService(srv.id, session?.profile?.id, userRole);
    } else {
      reactivateService(srv.id, session?.profile?.id, userRole);
    }
    refresh();
  };

  // Save Service
  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    setServiceError(null);

    if (!isManager) {
      setServiceError(
        isAr
          ? 'غير مصرح لك بتعديل الخدمات. هذه الخاصية متاحة حصرياً للمدراء.'
          : 'Unauthorized. Manager role required.'
      );
      return;
    }

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

    const assignedSup = suppliers.find((s) => s.id === serviceSupplierId);

    try {
      saveService(
        {
          id: editingServiceId || undefined,
          organization_id: session?.profile?.organization_id || 'org_dental_egy_01',
          category_id: serviceCategoryId,
          code: serviceCode.trim().toUpperCase(),
          name_ar: serviceNameAr.trim(),
          name_en: serviceNameEn.trim(),
          description: serviceDescription.trim() || undefined,
          default_supplier_id: serviceSupplierId || undefined,
          default_supplier_name: assignedSup ? (assignedSup.name_ar || assignedSup.name_en) : undefined,
          default_duration_minutes: durationMinutes,
          duration_minutes: durationMinutes,
          requires_doctor: requiresDoctor,
          requires_approval: requiresApproval,
          active: isServiceActive,
          is_active: isServiceActive,
        },
        session?.profile?.id,
        userRole
      );

      setIsServiceModalOpen(false);
      refresh();
    } catch (err: any) {
      setServiceError(err.message || 'Error saving service');
    }
  };

  // Category Modal Handlers
  const handleAddNewCategory = () => {
    if (!isManager) return;
    setEditingCategoryId(null);
    setCatCode(`CAT-${String(categories.length + 1).padStart(2, '0')}`);
    setCatNameAr('');
    setCatNameEn('');
    setCatDescription('');
    setCatDisplayOrder(categories.length + 1);
    setIsCatActive(true);
    setCatError(null);
    setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (cat: ServiceCategory) => {
    if (!isManager) return;
    setEditingCategoryId(cat.id);
    setCatCode(cat.code);
    setCatNameAr(cat.name_ar);
    setCatNameEn(cat.name_en);
    setCatDescription(cat.description || '');
    setCatDisplayOrder(cat.display_order || 1);
    setIsCatActive(cat.active !== false);
    setCatError(null);
    setIsCategoryModalOpen(true);
  };

  const handleToggleCategoryActive = (cat: ServiceCategory) => {
    if (!isManager) return;
    const currentActive = cat.active !== false;
    if (currentActive) {
      deactivateServiceCategory(cat.id);
    } else {
      reactivateServiceCategory(cat.id);
    }
    refresh();
  };

  const handleDeleteCategory = (cat: ServiceCategory) => {
    if (!isManager) return;
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

    if (!isManager) {
      setCatError(
        isAr ? 'غير مصرح لك بتعديل التصنيفات الطبية.' : 'Unauthorized to edit categories.'
      );
      return;
    }

    if (!catCode.trim() || !catNameAr.trim() || !catNameEn.trim()) {
      setCatError(isAr ? 'كود واسم التصنيف بالعربية والإنجليزية مطلوبان' : 'Code and Names are required');
      return;
    }

    try {
      saveServiceCategory({
        id: editingCategoryId || undefined,
        organization_id: session?.profile?.organization_id || 'org_dental_egy_01',
        code: catCode.trim().toUpperCase(),
        name_ar: catNameAr.trim(),
        name_en: catNameEn.trim(),
        description: catDescription.trim() || undefined,
        display_order: Number(catDisplayOrder),
        active: isCatActive,
      });

      setIsCategoryModalOpen(false);
      setCatSuccessMsg(isAr ? 'تم حفظ التصنيف الطبي بنجاح' : 'Category saved successfully');
      setTimeout(() => setCatSuccessMsg(null), 3000);
      refresh();
    } catch (err: any) {
      setCatError(err.message || 'Error saving category');
    }
  };

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      // Category filter
      if (selectedCategory !== 'all' && s.category_id !== selectedCategory) {
        return false;
      }
      // Status filter
      const isActive = s.active !== false && s.is_active !== false;
      if (statusFilter === 'active' && !isActive) return false;
      if (statusFilter === 'inactive' && isActive) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const supName = s.default_supplier_name ? s.default_supplier_name.toLowerCase() : '';
        const desc = (s.description || s.notes || '').toLowerCase();
        return (
          s.code.toLowerCase().includes(q) ||
          s.name_ar.toLowerCase().includes(q) ||
          s.name_en.toLowerCase().includes(q) ||
          desc.includes(q) ||
          supName.includes(q)
        );
      }
      return true;
    });
  }, [services, selectedCategory, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* RBAC Banner for Non-Managers */}
      {!isManager && (
        <div className="bg-amber-50 border-s-4 border-amber-500 p-4 rounded-xl text-xs text-amber-900 flex items-center gap-3 shadow-xs">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">
              {isAr
                ? 'عرض فقط — إعدادات الخدمات السنية محدودة لمدراء المراكز والفروع'
                : 'Read Only View — Dental service configuration is restricted to Center and Branch Managers'}
            </p>
            <p className="text-amber-700 mt-0.5">
              {isAr
                ? 'يمكنك استعراض كتالوج الخدمات، الأسعار النقدية، والتغطيات التأمينية، بينما يقتصر التعديل والإضافة على الإدارة.'
                : 'You can browse services, cash tariffs, and insurance links. Configurations are managed by Clinic Managers.'}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-teal-50 text-teal-700 rounded-xl">
              <FolderTree className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {isAr ? 'كتالوج الخدمات السنية وإعدادات الإدارة' : 'Dental Service Catalog & Configurations'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'إدارة الخدمات، الموردين المعتمدين، أسعار الكاش، والتغطيات التأمينية للمؤسسة'
                  : 'Manage services, vendor linkages, active cash tariffs, and insurance price-list links'}
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
              {isAr ? 'إدارة التصنيفات' : 'Categories'} ({categories.length})
            </button>
          </div>

          {isManager && (
            <>
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
            </>
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
                    <th className="px-3.5 py-3 text-start">{isAr ? 'الوصف الطبي' : 'Description'}</th>
                    <th className="px-3.5 py-3 text-center">{isAr ? 'عدد الخدمات' : 'Services Count'}</th>
                    <th className="px-3.5 py-3 text-center">{isAr ? 'حالة التفعيل' : 'Active Status'}</th>
                    {isManager && <th className="px-3.5 py-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>}
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

                        <td className="px-3.5 py-3 text-slate-600 max-w-xs">
                          {cat.description ? (
                            <span className="line-clamp-2">{cat.description}</span>
                          ) : (
                            <span className="text-slate-400 italic">{isAr ? 'بدون وصف' : 'No description'}</span>
                          )}
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

                        {isManager && (
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
                                disabled={isUsed}
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
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
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
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs">
            <div>
              <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'تصفية حسب التصنيف الطبي' : 'Filter by Category'}</span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
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
                <span>{isAr ? 'بحث بالكود أو الاسم أو المورد' : 'Search Code, Name, Supplier'}</span>
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'مثال: SRV-001 أو خلع أو معمل النيل...' : 'SRV-001, extraction, Nile Lab...'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'حالة التفعيل' : 'Active Status Filter'}</span>
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
              >
                <option value="all">{isAr ? 'جميع الحالات (النشط والمعطل)' : 'All Statuses'}</option>
                <option value="active">{isAr ? 'الخدمات النشطة فقط' : 'Active Only'}</option>
                <option value="inactive">{isAr ? 'الخدمات المعطلة فقط' : 'Inactive Only'}</option>
              </select>
            </div>
          </div>

          {/* Services Table / Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                {isAr ? 'إجمالي الخدمات المعروضة:' : 'Displayed Services:'} {filteredServices.length}
              </span>
              <span className="text-slate-500 text-[11px]">
                {isAr
                  ? 'عرض السعر النقدي المعتمد + عدد خطط التأمين المرتبطة + المورد المخصص'
                  : 'Displays active cash tariff, linked insurance plans count, and assigned supplier'}
              </span>
            </div>

            {filteredServices.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-bold">{isAr ? 'لا توجد خدمات مطابقة لخيارات البحث والتصفية' : 'No services matching criteria'}</p>
                <p className="text-slate-400 mt-1">{isAr ? 'جرّب تغيير التصنيف أو مسح عبارة البحث' : 'Try clearing filters or search input'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-3 text-start">{isAr ? 'الكود والخدمة' : 'Code & Service Name'}</th>
                      <th className="px-3.5 py-3 text-start">{isAr ? 'التصنيف والوصف' : 'Category & Details'}</th>
                      <th className="px-3.5 py-3 text-start">{isAr ? 'المورد المخصص' : 'Assigned Supplier'}</th>
                      <th className="px-3.5 py-3 text-center">{isAr ? 'سعر الكاش الحالي' : 'Active Cash Price'}</th>
                      <th className="px-3.5 py-3 text-center">{isAr ? 'ربط التأمين' : 'Insurance Links'}</th>
                      <th className="px-3.5 py-3 text-center">{isAr ? 'الموافقة المسبقة' : 'Approval Req.'}</th>
                      <th className="px-3.5 py-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                      {isManager && <th className="px-3.5 py-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredServices.map((srv) => {
                      const category = categories.find((c) => c.id === srv.category_id);
                      const isActive = srv.active !== false && srv.is_active !== false;

                      // Active cash price lookup
                      const cashItem = priceListItems.find((p) => p.service_id === srv.id && p.active !== false);

                      // Insurance links lookup
                      const insuranceLinks = insurancePriceListItems.filter(
                        (i) => i.service_id === srv.id && i.active !== false
                      );

                      // Supplier lookup
                      let supplierDisplay = srv.default_supplier_name;
                      if (srv.default_supplier_id) {
                        const matchedSup = suppliers.find((sup) => sup.id === srv.default_supplier_id);
                        if (matchedSup) {
                          supplierDisplay = isAr ? matchedSup.name_ar : matchedSup.name_en;
                        }
                      }

                      return (
                        <tr
                          key={srv.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            !isActive ? 'bg-slate-50/40 opacity-70' : ''
                          }`}
                        >
                          {/* Code & Name */}
                          <td className="px-3.5 py-3">
                            <div className="flex items-center gap-1.5 font-mono font-bold text-teal-700 text-[11px] mb-0.5">
                              <span>{srv.code}</span>
                              {srv.requires_doctor && (
                                <span className="p-0.5 bg-teal-50 text-teal-600 rounded-md" title={isAr ? 'طبيب مرخص' : 'Doctor Required'}>
                                  <Stethoscope className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-slate-900">{srv.name_ar}</div>
                            <div className="text-[11px] text-slate-500">{srv.name_en}</div>
                          </td>

                          {/* Category & Description */}
                          <td className="px-3.5 py-3 max-w-xs">
                            <div className="mb-1">
                              <span className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                                {category ? (isAr ? category.name_ar : category.name_en) : '—'}
                              </span>
                            </div>
                            {(srv.description || srv.notes) ? (
                              <p className="text-[11px] text-slate-500 line-clamp-2">
                                {srv.description || srv.notes}
                              </p>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">
                                {isAr ? 'بدون وصف إضافي' : 'No description'}
                              </span>
                            )}
                          </td>

                          {/* Assigned Supplier */}
                          <td className="px-3.5 py-3">
                            {supplierDisplay ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-semibold">
                                <Truck className="w-3 h-3 text-blue-600 shrink-0" />
                                <span>{supplierDisplay}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">
                                {isAr ? 'غير مخصص' : 'Unassigned'}
                              </span>
                            )}
                          </td>

                          {/* Cash Price */}
                          <td className="px-3.5 py-3 text-center">
                            {cashItem ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold font-mono">
                                <Banknote className="w-3 h-3 text-emerald-600" />
                                <span>{cashItem.cash_price.toLocaleString()} ج.م</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-mono">
                                {isAr ? 'غير مسعر' : 'Unpriced'}
                              </span>
                            )}
                          </td>

                          {/* Insurance Links */}
                          <td className="px-3.5 py-3 text-center">
                            {insuranceLinks.length > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-bold">
                                <ShieldCheck className="w-3 h-3 text-purple-600" />
                                <span>
                                  {insuranceLinks.length} {isAr ? 'خطط' : 'plans'}
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">
                                {isAr ? 'لا يوجد ربط' : 'None'}
                              </span>
                            )}
                          </td>

                          {/* Approval Req. */}
                          <td className="px-3.5 py-3 text-center">
                            {srv.requires_approval ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                <ShieldAlert className="w-3 h-3 text-amber-600" />
                                {isAr ? 'موافقة مسبقة' : 'Pre-approval'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                                {isAr ? 'تغطية مباشرة' : 'Direct'}
                              </span>
                            )}
                          </td>

                          {/* Active Status */}
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

                          {/* Manager Actions */}
                          {isManager && (
                            <td className="px-3.5 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleEditService(srv)}
                                  title={isAr ? 'تعديل إعدادات الخدمة والمورد' : 'Edit Service Configuration'}
                                  className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition"
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
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {isAr ? 'وصف التصنيف الطبي' : 'Category Description'}
                </label>
                <textarea
                  rows={2}
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  placeholder={isAr ? 'وصف تفصيلي للخدمات التابعة لهذا التصنيف...' : 'Detailed description of services under this category...'}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
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
                      ? 'تعديل إعدادات الخدمة السنية'
                      : 'Edit Service Configurations'
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
                  {isAr ? 'اسم الخدمة بالعربية (Name Arabic)' : 'Arabic Name'} *
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
                  {isAr ? 'اسم الخدمة بالإنجليزية (Name English)' : 'English Name'} *
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
                  {isAr ? 'وصف الخدمة الطبي والإرشادات (Description)' : 'Service Description'}
                </label>
                <textarea
                  rows={2}
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  placeholder={isAr ? 'إرشادات الإجراء الطبي، شروط التحضير، التفاصيل السريرية...' : 'Clinical guidelines, preparation steps, details...'}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg resize-none"
                />
              </div>

              {/* Supplier Assignment Dropdown */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isAr ? 'المورد أو المعمل المخصص (Supplier / Lab)' : 'Assigned Supplier / Vendor'}</span>
                </label>
                <select
                  value={serviceSupplierId}
                  onChange={(e) => setServiceSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium"
                >
                  <option value="">{isAr ? '— بدون تحديد مورد (مشتريات/معامل عامة) —' : '— No Specific Supplier —'}</option>
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {isAr ? sup.name_ar : sup.name_en} ({sup.type}) {sup.active === false ? `[${isAr ? 'معطل' : 'Inactive'}]` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {isAr
                    ? 'يتم ربط المعمل الخارجي أو شركة المستلزمات الافتراضية بهذه الخدمة لأغراض توجيه التكاليف'
                    : 'Links default laboratory or materials vendor for automatic cost routing'}
                </p>
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

              <div className="space-y-2 pt-2 border-t border-slate-100">
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
                    {isAr ? 'تتطلب موافقة تأمين مسبقة (Pre-authorization)' : 'Requires Insurance Pre-authorization'}
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
                    {isAr ? 'تفعيل الخدمة في كتالوج المركز' : 'Active in System Catalog'}
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
                  <span>{isAr ? 'حفظ التعديلات' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
