import React, { useState, useMemo } from 'react';
import {
  FileEdit,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Building2,
  DollarSign,
  Tag,
  Search,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getStoredCustomPatientServices,
  reviewCustomPatientService,
  getStoredServices,
} from '../../lib/receptionAndBillingStorage';
import { getStoredPatients } from '../../lib/patientStorage';
import { getStoredBranches, getStoredStaffUsers } from '../../lib/storage';
import { CustomPatientService, Service } from '../../types/receptionAndBilling';

export const CustomServicesReviewView: React.FC = () => {
  const { session } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  const customServices = useMemo(
    () => getStoredCustomPatientServices(),
    [refreshKey]
  );
  const services: Service[] = useMemo(() => getStoredServices(), []);
  const patients = useMemo(() => getStoredPatients(), []);
  const branches = useMemo(() => getStoredBranches(), []);
  const staff = useMemo(() => getStoredStaffUsers(), []);

  // Review modal state
  const [selectedItem, setSelectedItem] = useState<CustomPatientService | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');
  const [assignedServiceId, setAssignedServiceId] = useState<string>('');
  const [supplierCost, setSupplierCost] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const filteredItems = useMemo(() => {
    return customServices.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [customServices, statusFilter]);

  const handleOpenReview = (item: CustomPatientService) => {
    setSelectedItem(item);
    setReviewAction('approved');
    setAssignedServiceId(services[0]?.id || '');
    setSupplierCost('');
    setAdminNotes('');
    setError(null);
  };

  const handleProcessReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setError(null);
    const costNum = supplierCost ? parseFloat(supplierCost) : undefined;
    if (costNum !== undefined && (isNaN(costNum) || costNum < 0)) {
      setError(isAr ? 'تكلفة المورد غير صالحة' : 'Invalid supplier cost');
      return;
    }

    try {
      reviewCustomPatientService({
        id: selectedItem.id,
        status: reviewAction,
        reviewedByStaffId: session?.profile.id || 'usr_staff_01',
        assignedStandardServiceId: reviewAction === 'approved' ? assignedServiceId || undefined : undefined,
        actualSupplierCost: costNum,
        adminNotes: adminNotes.trim() || undefined,
      });

      setSelectedItem(null);
      refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update review status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <FileEdit className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {isAr ? 'مراجعة واعتماد الأسعار المخصصة للمرضى' : 'Custom Services & Pricing Review Queue'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'قائمة الحالات الاستثنائية المسجلة من الاستقبال للموافقة وتعيين تكلفة المعمل أو المورد'
                  : 'Pending review queue for exceptional quotations, lab costs, and standard service mapping'}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'pending'
                ? 'bg-white text-indigo-800 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            {isAr ? 'بانتظار المراجعة (Pending)' : 'Pending'}
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'approved'
                ? 'bg-white text-indigo-800 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            {isAr ? 'معتمد (Approved)' : 'Approved'}
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'rejected'
                ? 'bg-white text-indigo-800 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            {isAr ? 'مرفوض (Rejected)' : 'Rejected'}
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'all'
                ? 'bg-white text-indigo-800 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            {isAr ? 'الكل' : 'All'}
          </button>
        </div>
      </div>

      {/* List / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p>{isAr ? 'لا توجد طلبات في هذه الحالة حالياً' : 'No custom pricing requests found'}</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const patient = patients.find((p) => p.id === item.patient_id);
            const branch = branches.find((b) => b.id === item.branch_id);
            const creator = staff.find((s) => s.id === item.created_by_staff_id);
            const reviewer = staff.find((s) => s.id === item.reviewed_by_staff_id);
            const assignedSrv = services.find((s) => s.id === item.assigned_standard_service_id);

            return (
              <div
                key={item.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">
                        {item.custom_service_name}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {patient ? (isAr ? patient.full_name_ar : patient.full_name_en) : '—'}{' '}
                        ({patient?.patient_code})
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status === 'approved'
                        ? isAr
                          ? 'معتمد'
                          : 'Approved'
                        : item.status === 'rejected'
                        ? isAr
                          ? 'مرفوض'
                          : 'Rejected'
                        : isAr
                        ? 'قيد المراجعة'
                        : 'Pending Review'}
                    </span>
                  </div>

                  <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-[11px]">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-600">
                        {isAr ? 'السعر المتفق عليه للمريض:' : 'Agreed Patient Price:'}
                      </span>
                      <span className="text-indigo-700 text-sm font-black">
                        {item.agreed_patient_price.toLocaleString('en-US')} ج.م
                      </span>
                    </div>

                    {item.actual_supplier_cost !== undefined && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span>{isAr ? 'تكلفة المعمل / المورد:' : 'Supplier Cost:'}</span>
                        <span className="font-mono font-bold text-slate-800">
                          {item.actual_supplier_cost.toLocaleString('en-US')} ج.م
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-slate-500">
                      <span>{isAr ? 'الفرع:' : 'Branch:'}</span>
                      <span>{branch ? (isAr ? branch.name_ar : branch.name_en) : '—'}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-500">
                      <span>{isAr ? 'مسجل الطلب:' : 'Created By:'}</span>
                      <span>{creator?.display_name || '—'}</span>
                    </div>

                    {assignedSrv && (
                      <div className="flex items-center justify-between text-teal-700 font-medium pt-1 border-t border-slate-200">
                        <span>{isAr ? 'الخدمة القياسية المربوطة:' : 'Standard Service:'}</span>
                        <span>{isAr ? assignedSrv.name_ar : assignedSrv.name_en}</span>
                      </div>
                    )}
                  </div>

                  {item.reason && (
                    <p className="mt-2 text-[11px] text-slate-600 italic bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                      "{item.reason}"
                    </p>
                  )}

                  {item.admin_notes && (
                    <p className="mt-1 text-[11px] text-emerald-800 bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                      <span className="font-bold">{isAr ? 'رد الإدارة: ' : 'Admin Notes: '}</span>
                      {item.admin_notes}
                    </p>
                  )}
                </div>

                {(item.status === 'pending_review' || (item.status as string) === 'pending') && session?.role.key === 'center_manager' && (
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleOpenReview(item)}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'مراجعة واعتماد' : 'Review & Decide'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Review Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md my-8 overflow-hidden">
            <div className="bg-indigo-700 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {isAr ? 'اعتماد أو رفض التسعير المخصص' : 'Review Custom Quotation'}
              </h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProcessReview} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Decision */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {isAr ? 'القرار الإداري' : 'Administrative Decision'}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction('approved')}
                    className={`flex-1 py-2 rounded-xl font-bold border transition-colors ${
                      reviewAction === 'approved'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {isAr ? 'موافقة واعتماد' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction('rejected')}
                    className={`flex-1 py-2 rounded-xl font-bold border transition-colors ${
                      reviewAction === 'rejected'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {isAr ? 'رفض السعر' : 'Reject'}
                  </button>
                </div>
              </div>

              {reviewAction === 'approved' && (
                <>
                  {/* Assign standard service */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      {isAr ? 'ربط بالخدمة القياسية في الكتالوج' : 'Map to Standard Catalog Service'}
                    </label>
                    <select
                      value={assignedServiceId}
                      onChange={(e) => setAssignedServiceId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                    >
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {isAr ? s.name_ar : s.name_en} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Supplier / Lab cost */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      {isAr ? 'تكلفة المورد أو المعمل (EGP)' : 'Supplier / Dental Lab Cost (EGP)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={supplierCost}
                      onChange={(e) => setSupplierCost(e.target.value)}
                      placeholder="1200"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </>
              )}

              {/* Admin Notes */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {isAr ? 'ملاحظات الإدارة' : 'Admin Justification / Notes'}
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={
                    isAr ? 'ملاحظات تظهر لموظف الاستقبال...' : 'Notes visible to reception...'
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                >
                  {isAr ? 'حفظ القرار' : 'Save Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
