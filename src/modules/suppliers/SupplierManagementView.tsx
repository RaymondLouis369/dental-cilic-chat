import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Building2,
  Phone,
  FileText,
  Edit2,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Filter,
  Check,
  X,
  RefreshCw,
  FlaskConical,
  PackageCheck,
  Stethoscope,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { Supplier, SupplierType } from '../../types/receptionAndBilling';
import {
  getStoredSuppliers,
  upsertSupplier,
  toggleSupplierActive,
} from '../../lib/receptionAndBillingStorage';

export const SupplierManagementView: React.FC = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { session } = useAuth();

  const userRole = session?.role?.key || session?.profile?.role_key;
  const orgId = session?.organization?.id || session?.profile?.organization_id;

  const isAuthorized = userRole === 'center_manager' || userRole === 'branch_manager';

  // Filters & Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form State
  const [formNameAr, setFormNameAr] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formType, setFormType] = useState<SupplierType>('dental_materials');
  const [formPhone, setFormPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formActive, setFormActive] = useState(true);

  // Alert/Feedback state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch suppliers scoped to user's organization
  const suppliers = useMemo(() => {
    return getStoredSuppliers(orgId);
  }, [orgId, refreshKey]);

  // Derived Statistics
  const stats = useMemo(() => {
    const total = suppliers.length;
    const labs = suppliers.filter((s) => s.type === 'dental_lab').length;
    const implants = suppliers.filter((s) => s.type === 'implant_supplier').length;
    const active = suppliers.filter((s) => s.active).length;
    return { total, labs, implants, active };
  }, [suppliers]);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      // Type Filter
      if (selectedType !== 'all' && supplier.type !== selectedType) {
        return false;
      }
      // Status Filter
      if (selectedStatus === 'active' && !supplier.active) return false;
      if (selectedStatus === 'inactive' && supplier.active) return false;

      // Search Query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesAr = supplier.name_ar?.toLowerCase().includes(query);
        const matchesEn = supplier.name_en?.toLowerCase().includes(query);
        const matchesPhone = supplier.phone?.toLowerCase().includes(query);
        const matchesNotes = supplier.notes?.toLowerCase().includes(query);

        if (!matchesAr && !matchesEn && !matchesPhone && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [suppliers, selectedType, selectedStatus, searchTerm]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const openAddModal = () => {
    setEditingSupplier(null);
    setFormNameAr('');
    setFormNameEn('');
    setFormType('dental_materials');
    setFormPhone('');
    setFormNotes('');
    setFormActive(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormNameAr(supplier.name_ar || '');
    setFormNameEn(supplier.name_en || '');
    setFormType(supplier.type);
    setFormPhone(supplier.phone || '');
    setFormNotes(supplier.notes || '');
    setFormActive(supplier.active);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = upsertSupplier(
      {
        id: editingSupplier?.id,
        organization_id: orgId,
        name_ar: formNameAr,
        name_en: formNameEn,
        type: formType,
        phone: formPhone,
        notes: formNotes,
        active: formActive,
      },
      session?.profile?.id,
      userRole
    );

    if (!res.success) {
      setErrorMsg(res.error || (isAr ? 'حدث خطأ أثناء حفظ بيانات المورد' : 'Error saving supplier'));
      return;
    }

    setSuccessMsg(
      editingSupplier
        ? isAr
          ? 'تم تحديث بيانات المورد بنجاح'
          : 'Supplier updated successfully'
        : isAr
        ? 'تمت إضافة المورد الجديد بنجاح'
        : 'New supplier added successfully'
    );

    setIsModalOpen(false);
    handleRefresh();
  };

  const handleToggleActive = (supplier: Supplier) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = toggleSupplierActive(
      supplier.id,
      !supplier.active,
      session?.profile?.id,
      userRole,
      orgId
    );

    if (!res.success) {
      setErrorMsg(res.error || (isAr ? 'حدث خطأ أثناء تغيير الحالة' : 'Error toggling status'));
      return;
    }

    setSuccessMsg(
      !supplier.active
        ? isAr
          ? `تم تفعيل المورد (${supplier.name_ar}) بنجاح`
          : `Supplier (${supplier.name_en}) activated successfully`
        : isAr
        ? `تم تعطيل المورد (${supplier.name_ar})`
        : `Supplier (${supplier.name_en}) deactivated`
    );

    handleRefresh();
  };

  const getTypeBadge = (type: SupplierType) => {
    switch (type) {
      case 'dental_lab':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <FlaskConical className="w-3 h-3" />
            {isAr ? 'معمل تركيبات أسنان' : 'Dental Lab'}
          </span>
        );
      case 'implant_supplier':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
            <PackageCheck className="w-3 h-3" />
            {isAr ? 'مورد زراعات الأسنان' : 'Implant Supplier'}
          </span>
        );
      case 'dental_materials':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Stethoscope className="w-3 h-3" />
            {isAr ? 'خامات ومستلزمات أسنان' : 'Dental Materials'}
          </span>
        );
      case 'medical_supplies':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Building2 className="w-3 h-3" />
            {isAr ? 'مستلزمات طبية عامة' : 'Medical Supplies'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            <Truck className="w-3 h-3" />
            {isAr ? 'آخر / شركة أخرى' : 'Other Vendor'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isAr ? 'إدارة الموردين والشركات' : 'Supplier & Vendor Management'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAr
                ? 'دليل وتصنيف موردي المعامل، شركات الزراعات والخامات والمستلزمات الطبية'
                : 'Directory and categorization for dental lab vendors, implant & material suppliers'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleRefresh}
            className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition border border-slate-200"
            title={isAr ? 'تحديث البيانات' : 'Refresh'}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isAuthorized ? (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'إضافة مورد جديد' : 'Add New Supplier'}</span>
            </button>
          ) : (
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-200 text-slate-400 text-sm font-medium rounded-xl cursor-not-allowed opacity-75"
              title={
                isAr
                  ? 'الصلاحية مخصصة لمدير المركز أو مدير الفرع فقط'
                  : 'Restricted to Center/Branch Managers'
              }
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{isAr ? 'إضافة مورد (غير مصرح)' : 'Add Supplier (Restricted)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* RBAC Notice Banner for Non-Managers */}
      {!isAuthorized && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-900 text-sm">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-semibold">
              {isAr ? 'تنويه صلاحيات النظام (RBAC): ' : 'Role Notice (RBAC): '}
            </span>
            {isAr
              ? 'تتمتع برؤية دليل الموردين المعتمدين لمؤسستك. تعديل وإضافة وإيقاف الموردين مخصص لمدير المركز ومدير الفرع فقط.'
              : 'You have read access to your organization suppliers. Adding, editing, or deactivating suppliers is restricted to Center Managers and Branch Managers.'}
          </div>
        </div>
      )}

      {/* Status Messages */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">
            {isAr ? 'إجمالي الموردين' : 'Total Suppliers'}
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">
            {isAr ? 'معامل تركيبات الأسنان' : 'Dental Labs'}
          </div>
          <div className="text-2xl font-bold text-purple-600 mt-1">{stats.labs}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">
            {isAr ? 'موردي الزراعات' : 'Implant Suppliers'}
          </div>
          <div className="text-2xl font-bold text-teal-600 mt-1">{stats.implants}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">
            {isAr ? 'الموردين النشطين' : 'Active Vendors'}
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 rtl:left-3.5 rtl:right-auto" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isAr
                  ? 'بحث باسم المورد (عربي/إنجليزي)، رقم الهاتف، أو الملاحظات...'
                  : 'Search by supplier name, phone, or notes...'
              }
              className="w-full pr-10 pl-4 rtl:pr-10 rtl:pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-48 shrink-0">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="active">{isAr ? 'النشطين فقط' : 'Active Only'}</option>
              <option value="inactive">{isAr ? 'غير النشطين' : 'Inactive Only'}</option>
            </select>
          </div>
        </div>

        {/* Type Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 me-2">
            <Filter className="w-3.5 h-3.5" />
            {isAr ? 'نوع المورد:' : 'Category:'}
          </span>

          {[
            { key: 'all', labelAr: 'الكل', labelEn: 'All Types' },
            { key: 'dental_lab', labelAr: 'معامل تركيبات أسنان', labelEn: 'Dental Labs' },
            { key: 'implant_supplier', labelAr: 'موردي زراعة الأسنان', labelEn: 'Implant Suppliers' },
            { key: 'dental_materials', labelAr: 'خامات ومستلزمات أسنان', labelEn: 'Dental Materials' },
            { key: 'medical_supplies', labelAr: 'مستلزمات طبية عامة', labelEn: 'Medical Supplies' },
            { key: 'other', labelAr: 'شركات أخرى', labelEn: 'Other' },
          ].map((tab) => {
            const isActive = selectedType === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedType(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isAr ? tab.labelAr : tab.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* Supplier List */}
      <div className="space-y-3">
        {filteredSuppliers.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">
              {isAr ? 'لا يوجد موردين مطابقين للبحث' : 'No suppliers match your search'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {isAr
                ? 'جرب تغيير كلمة البحث أو فلاتر النوع والحالة، أو قم بإنشاء مورد جديد.'
                : 'Try clearing search filters or add a new supplier.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                className={`bg-white p-5 rounded-2xl border transition-all ${
                  supplier.active
                    ? 'border-slate-200 hover:border-teal-300 shadow-sm hover:shadow'
                    : 'border-slate-200 bg-slate-50/70 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTypeBadge(supplier.type)}
                      {supplier.active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {isAr ? 'نشط' : 'Active'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          {isAr ? 'غير نشط' : 'Inactive'}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {supplier.name_ar}
                    </h3>
                    {supplier.name_en && supplier.name_en !== supplier.name_ar && (
                      <div className="text-xs font-medium text-slate-500">
                        {supplier.name_en}
                      </div>
                    )}
                  </div>

                  {/* Actions for authorized managers */}
                  {isAuthorized && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(supplier)}
                        className="p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                        title={isAr ? 'تعديل البيانات' : 'Edit Supplier'}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(supplier)}
                        className={`p-2 rounded-lg transition ${
                          supplier.active
                            ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={
                          supplier.active
                            ? isAr
                              ? 'تعطيل المورد'
                              : 'Deactivate'
                            : isAr
                            ? 'تفعيل المورد'
                            : 'Activate'
                        }
                      >
                        {supplier.active ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Details Section */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  {supplier.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a
                        href={`tel:${supplier.phone}`}
                        className="font-mono text-slate-800 hover:text-teal-600 hover:underline"
                      >
                        {supplier.phone}
                      </a>
                    </div>
                  )}

                  {supplier.notes && (
                    <div className="flex items-start gap-2 text-slate-500">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <p className="line-clamp-2">{supplier.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingSupplier
                      ? isAr
                        ? 'تعديل بيانات المورد / الشركة'
                        : 'Edit Supplier / Vendor'
                      : isAr
                      ? 'إضافة مورد / شركة جديدة'
                      : 'Add New Supplier / Vendor'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAr
                      ? 'أدخل بيانات المورد ونوعه ورقم التواصل'
                      : 'Provide supplier details, category, and phone number'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Arabic Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'اسم المورد (باللغة العربية) *' : 'Arabic Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={formNameAr}
                  onChange={(e) => setFormNameAr(e.target.value)}
                  placeholder={isAr ? 'مثال: معمل النيل لتركيبات الأسنان' : 'e.g., Nile Dental Lab'}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* English Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'اسم المورد (باللغة الإنجليزية)' : 'English Name'}
                </label>
                <input
                  type="text"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  placeholder={isAr ? 'مثال: Nile Dental Laboratory' : 'e.g., Nile Dental Lab'}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Supplier Type Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'تصنيف / نوع المورد *' : 'Supplier Category *'}
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as SupplierType)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="dental_lab">
                    {isAr ? 'معمل تركيبات أسنان (Dental Lab)' : 'Dental Laboratory'}
                  </option>
                  <option value="implant_supplier">
                    {isAr ? 'مورد زراعات ومستلزمات العظم (Implant Supplier)' : 'Implant & Bone Graft Supplier'}
                  </option>
                  <option value="dental_materials">
                    {isAr ? 'خامات ومستلزمات طب أسنان (Dental Materials)' : 'Dental Materials & Consumables'}
                  </option>
                  <option value="medical_supplies">
                    {isAr ? 'مستلزمات وأجهزة طبية عامة (Medical Supplies)' : 'General Medical Supplies'}
                  </option>
                  <option value="other">
                    {isAr ? 'آخر / شركة أخرى (Other)' : 'Other Vendor'}
                  </option>
                </select>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'رقم الهاتف / التواصل' : 'Phone Number'}
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder={isAr ? 'مثال: 01012345678' : 'e.g. 01012345678'}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'ملاحظات وتفاصيل إضافية' : 'Notes & Details'}
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder={
                    isAr
                      ? 'أي تفاصيل عن المنتجات الموردة أو الضمان أو عنوان المقر...'
                      : 'Additional notes regarding products, warranty, address...'
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                ></textarea>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="supplier_active_check"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                />
                <label htmlFor="supplier_active_check" className="text-xs font-medium text-slate-700 select-none">
                  {isAr ? 'حالة المورد نشطة (متاح للاستخدام في التكاليف)' : 'Active Status (Available for cost entry)'}
                </label>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 text-sm font-medium rounded-xl transition"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl shadow-sm transition"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {editingSupplier
                      ? isAr
                        ? 'حفظ التعديلات'
                        : 'Update Supplier'
                      : isAr
                      ? 'إضافة المورد'
                      : 'Add Supplier'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
