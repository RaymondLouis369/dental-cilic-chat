import React, { useState, useMemo, useEffect } from 'react';
import {
  FlaskConical,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Tag,
  Layers,
  Sparkles,
  Building2,
  Calendar,
  X,
  Edit3,
  Save,
  ShieldCheck,
  PackageCheck,
  Eye,
  FileCode,
  Paperclip,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getStoredLabOrders,
  updateLabOrderStatus,
  updateLabOrderNotes,
  getUnreadLabChatMessageCount,
} from '../../lib/clinicalStorage';
import { LabOrder, LabOrderStatus } from '../../types/clinical';
import { hasPermission } from '../permissions/rolesAndPermissions';
import { LabOrderChatModal } from './LabOrderChatModal';

export const LabUserWorkspace: React.FC = () => {
  const { session } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedLabName, setSelectedLabName] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [selectedOrderForChat, setSelectedOrderForChat] = useState<LabOrder | null>(null);
  const [editingLabNotes, setEditingLabNotes] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Security check: Confirm if lab_user cannot access patient records directly
  const canReadPatientRecords = session ? hasPermission(session.role.key, 'patient.read') : false;

  const refreshOrders = () => {
    const all = getStoredLabOrders();
    // Enforce organization_id isolation
    const orgFiltered = session
      ? all.filter((o) => o.organization_id === session.organization.id)
      : all;
    setOrders(orgFiltered);
  };

  useEffect(() => {
    refreshOrders();
  }, [session]);

  // Extract distinct lab names for lab assignment dropdown filter
  const availableLabs = useMemo(() => {
    const labsSet = new Set<string>();
    orders.forEach((o) => {
      if (o.lab_name) labsSet.add(o.lab_name);
    });
    return Array.from(labsSet);
  }, [orders]);

  // Set default lab filter if empty
  useEffect(() => {
    if (selectedLabName === 'all' && availableLabs.length > 0 && session?.role.key === 'lab_user') {
      // Default to first lab for lab_user if specific assigned lab exists
      setSelectedLabName(availableLabs[0]);
    }
  }, [availableLabs, session]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Lab assignment isolation filter
      if (selectedLabName !== 'all' && order.lab_name !== selectedLabName) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && order.status !== selectedStatus) {
        return false;
      }

      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(query);
        const matchesServiceAr = order.service_name_ar?.toLowerCase().includes(query);
        const matchesServiceEn = order.service_name_en?.toLowerCase().includes(query);
        const matchesMaterial = order.material?.toLowerCase().includes(query);
        const matchesLab = order.lab_name?.toLowerCase().includes(query);
        const matchesTeeth = order.teeth.some((t) => t.includes(query));

        if (
          !matchesId &&
          !matchesServiceAr &&
          !matchesServiceEn &&
          !matchesMaterial &&
          !matchesLab &&
          !matchesTeeth
        ) {
          return false;
        }
      }

      return true;
    });
  }, [orders, selectedLabName, selectedStatus, searchTerm]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const inProduction = filteredOrders.filter((o) => o.status === 'in_production').length;
    const sentToLab = filteredOrders.filter((o) => o.status === 'sent_to_lab').length;
    const received = filteredOrders.filter((o) => o.status === 'received' || o.status === 'delivered').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const dueToday = filteredOrders.filter((o) => o.delivery_date === todayStr || o.required_delivery_date === todayStr).length;

    return { total, inProduction, sentToLab, received, dueToday };
  }, [filteredOrders]);

  const handleOpenDetailModal = (order: LabOrder) => {
    setSelectedOrder(order);
    setEditingLabNotes(order.lab_notes || '');
  };

  const handleUpdateStatus = (orderId: string, newStatus: LabOrderStatus) => {
    const success = updateLabOrderStatus(orderId, newStatus);
    if (success) {
      refreshOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      setStatusMessage(
        isAr ? `تم تحديث حالة الطلب إلى: ${getStatusLabel(newStatus, true)}` : `Lab Order status updated to: ${getStatusLabel(newStatus, false)}`
      );
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleSaveLabNotes = () => {
    if (!selectedOrder) return;
    const success = updateLabOrderNotes(selectedOrder.id, editingLabNotes);
    if (success) {
      refreshOrders();
      setSelectedOrder((prev) => (prev ? { ...prev, lab_notes: editingLabNotes } : null));
      setStatusMessage(isAr ? 'تم حفظ ملاحظات الفني بنجاح' : 'Lab technician notes saved successfully');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const getStatusLabel = (status: LabOrderStatus, ar: boolean) => {
    switch (status) {
      case 'draft':
        return ar ? 'مسودة' : 'Draft';
      case 'sent_to_lab':
        return ar ? 'تم الإرسال للمعمل' : 'Sent to Lab';
      case 'in_production':
        return ar ? 'قيد التصنيع بالمعمل' : 'In Production';
      case 'received':
        return ar ? 'تم الاستلام بالمركز' : 'Received at Clinic';
      case 'delivered':
        return ar ? 'تم التسليم للمعيادة' : 'Delivered';
      case 'fitted':
        return ar ? 'تم التركيب للمريض' : 'Fitted';
      case 'cancelled':
        return ar ? 'ملغي' : 'Cancelled';
      default:
        return status;
    }
  };

  const getStatusBadgeClass = (status: LabOrderStatus) => {
    switch (status) {
      case 'in_production':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'sent_to_lab':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'received':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'delivered':
      case 'fitted':
        return 'bg-teal-100 text-teal-900 border-teal-300';
      case 'cancelled':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  if (!session) return null;

  return (
    <div className="space-y-6 animate-fadeIn pb-12" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-indigo-900/50">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 shrink-0">
            <FlaskConical className="w-7 h-7 text-teal-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black tracking-tight">
                {isAr ? 'مساحة عمل فني معمل الأسنان' : 'Dental Technician Lab Workspace'}
              </h1>
              <span className="px-2.5 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full text-[10px] font-bold">
                {isAr ? 'بيانات تصنيع معملية فقط' : 'Manufacturing Data Only'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {isAr
                ? 'متابعة مواصفات تصنيع التركيبات السنية، الألوان، الهياكل وحالات الإنتاج بدون كشف البيانات الطبية السرية للمريض.'
                : 'Manage prosthetic manufacturing specs, materials, shades, and production statuses securely.'}
            </p>
          </div>
        </div>

        {/* Security Isolation Indicator */}
        <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-xs text-slate-200 shrink-0 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 font-bold text-teal-300">
            <ShieldCheck className="w-4 h-4" />
            <span>{isAr ? 'حماية البيانات الطبية (RLS)' : 'Clinical Data Protection'}</span>
          </div>
          <p className="text-[10px] text-slate-300">
            {canReadPatientRecords
              ? isAr ? 'صلاحيات ممتدة للمشرف' : 'Manager Scope Active'
              : isAr ? 'السجل الطبي الكامل للمريض حجب أمنياً' : 'Full Medical History Redacted'}
          </p>
        </div>
      </div>

      {/* Notification Toast */}
      {statusMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {isAr ? 'إجمالي طلبات المعمل' : 'Total Orders'}
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{stats.total}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
            {isAr ? 'قيد التصنيع والإنتاج' : 'In Production'}
          </span>
          <span className="text-2xl font-black text-purple-900 mt-1 block">{stats.inProduction}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
            {isAr ? 'بانتظار البدء (مرسل)' : 'Sent to Lab'}
          </span>
          <span className="text-2xl font-black text-blue-900 mt-1 block">{stats.sentToLab}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
            {isAr ? 'مطلوب تسليمه اليوم' : 'Due Today'}
          </span>
          <span className="text-2xl font-black text-amber-900 mt-1 block">{stats.dueToday}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isAr
                  ? 'بحث برقم الطلب، اسم الإجراء، الخامة، أرقام الأسنان...'
                  : 'Search by Order ID, Service, Material, Teeth...'
              }
              className="w-full ps-9 pe-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
          </div>

          {/* Lab Assignment Selector */}
          {availableLabs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 shrink-0">
                {isAr ? 'المعمل المسند:' : 'Assigned Lab:'}
              </span>
              <select
                value={selectedLabName}
                onChange={(e) => setSelectedLabName(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="all">{isAr ? 'جميع المعامل المسندة' : 'All Assigned Labs'}</option>
                {availableLabs.map((lab) => (
                  <option key={lab} value={lab}>
                    {lab}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedStatus === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {isAr ? 'الكل' : 'All Orders'}
          </button>
          <button
            onClick={() => setSelectedStatus('sent_to_lab')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedStatus === 'sent_to_lab'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            {isAr ? 'تم الإرسال للمعمل' : 'Sent to Lab'}
          </button>
          <button
            onClick={() => setSelectedStatus('in_production')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedStatus === 'in_production'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            {isAr ? 'قيد التصنيع' : 'In Production'}
          </button>
          <button
            onClick={() => setSelectedStatus('received')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedStatus === 'received'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {isAr ? 'تم المستلم بالمركز' : 'Received'}
          </button>
          <button
            onClick={() => setSelectedStatus('delivered')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedStatus === 'delivered'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
            }`}
          >
            {isAr ? 'تم التسليم' : 'Delivered'}
          </button>
        </div>
      </div>

      {/* Orders Grid / List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-xs text-center space-y-3">
          <FlaskConical className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">
            {isAr ? 'لا توجد طلبات معمل تطابق الفلترة الحالية' : 'No Lab Orders Found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isAr
              ? 'تأكد من اختيار المعمل المسند الصحيح أو تغيير حالة الفلترة والبحث.'
              : 'Try adjusting your search criteria or selecting a different status filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const todayStr = new Date().toISOString().split('T')[0];
            const isDueToday = order.delivery_date === todayStr || order.required_delivery_date === todayStr;
            const isOverdue = (order.required_delivery_date || order.delivery_date) < todayStr && order.status !== 'delivered' && order.status !== 'fitted';

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
              >
                {/* Header Row */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(
                        order.status
                      )}`}
                    >
                      {getStatusLabel(order.status, isAr)}
                    </span>
                  </div>

                  {/* Anonymized Patient Case Reference */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500">
                      {isAr ? 'معرف حالة المريض:' : 'Patient Identifier:'}
                    </span>
                    <span className="font-mono font-bold text-slate-800 bg-purple-50 text-purple-900 px-2 py-0.5 rounded border border-purple-150">
                      PAT-{order.patient_id.slice(0, 6)}
                    </span>
                  </div>

                  {/* Service & Product Type */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {isAr ? 'نوع التركيبة والإجراء:' : 'Service & Product Type:'}
                    </span>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">
                      {isAr ? order.service_name_ar : order.service_name_en}
                    </div>
                    {order.product_type && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[10px] font-bold">
                        {order.product_type}
                      </span>
                    )}
                  </div>

                  {/* Teeth & Units */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-700 font-semibold">
                      <span>{isAr ? 'الأسنان المطلوبة:' : 'Teeth:'}</span>
                      <span className="font-mono text-slate-900 font-bold">
                        {order.teeth.length > 0 ? `#${order.teeth.join(', #')}` : 'Full Arch'} ({order.tooth_count ?? (order.teeth.length || 1)} {isAr ? 'سن' : 'units'})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>{isAr ? 'الخامة والهيكل:' : 'Material & Framework:'}</span>
                      <span className="font-bold text-purple-900">
                        {order.material || 'Zirconia'} ({order.framework || 'Monolithic'})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>{isAr ? 'درجة اللون (Shade):' : 'Shade Spec:'}</span>
                      <span className="font-mono font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {order.shade_notes || 'Standard'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Row: Delivery Deadline & Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">
                      {isAr ? 'تاريخ التسليم المطلوبة:' : 'Required Delivery:'}
                    </span>
                    <span
                      className={`font-mono font-bold text-[11px] ${
                        isOverdue
                          ? 'text-rose-600 font-black'
                          : isDueToday
                          ? 'text-amber-600 font-black'
                          : 'text-slate-800'
                      }`}
                    >
                      {order.required_delivery_date || order.delivery_date}
                      {isOverdue && (isAr ? ' (متأخر)' : ' (Overdue)')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {(() => {
                      const unread = getUnreadLabChatMessageCount(order.id, session?.profile.id || '');
                      return (
                        <button
                          onClick={() => setSelectedOrderForChat(order)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold rounded-xl text-xs transition flex items-center gap-1 relative"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{isAr ? 'المحادثة' : 'Chat'}</span>
                          {unread > 0 && (
                            <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-black font-mono">
                              {unread}
                            </span>
                          )}
                        </button>
                      );
                    })()}

                    <button
                      onClick={() => handleOpenDetailModal(order)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تفاصيل التصنيع' : 'Manufacturing Specs'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manufacturing Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
                  <FlaskConical className="w-6 h-6 text-teal-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {isAr ? 'تفاصيل مواصفات التصنيع المعملي' : 'Prosthetic Manufacturing Specifications'}
                  </h3>
                  <p className="text-xs text-purple-200 font-mono">
                    Order ID: #{selectedOrder.id} • PAT-{selectedOrder.patient_id.slice(0, 6)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-xs max-h-[75vh] overflow-y-auto">
              {/* Status Update Control */}
              <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-purple-700" />
                    <span>{isAr ? 'تحديث حالة تصنيع الطلب:' : 'Update Production Status:'}</span>
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(
                      selectedOrder.status
                    )}`}
                  >
                    {getStatusLabel(selectedOrder.status, isAr)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {(['sent_to_lab', 'in_production', 'received', 'delivered', 'cancelled'] as LabOrderStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(selectedOrder.id, st)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          selectedOrder.status === st
                            ? 'bg-purple-900 text-white border-purple-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {getStatusLabel(st, isAr)}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Manufacturing Specs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Service & Product Type */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isAr ? 'الإجراء والنوع:' : 'Service & Product Type:'}
                  </span>
                  <div className="font-bold text-slate-900 text-xs">
                    {isAr ? selectedOrder.service_name_ar : selectedOrder.service_name_en}
                  </div>
                  <div className="text-slate-600 pt-1">
                    <span className="font-semibold">{isAr ? 'نوع المنتج: ' : 'Product Type: '}</span>
                    <span className="font-bold text-blue-900">{selectedOrder.product_type || 'Crown'}</span>
                  </div>
                </div>

                {/* Teeth & Units */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isAr ? 'الأسنان المطلوبة وعد الكرات:' : 'Teeth & Unit Count:'}
                  </span>
                  <div className="font-mono font-bold text-purple-900 text-xs">
                    {selectedOrder.teeth.length > 0 ? `#${selectedOrder.teeth.join(', #')}` : 'Full Arch'}
                  </div>
                  <div className="text-slate-600 pt-1">
                    <span className="font-semibold">{isAr ? 'عدد الوحدات: ' : 'Unit Count: '}</span>
                    <span className="font-bold text-slate-900">
                      {selectedOrder.tooth_count ?? (selectedOrder.teeth.length || 1)} {isAr ? 'وحدة' : 'units'}
                    </span>
                  </div>
                </div>

                {/* Material & Framework */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isAr ? 'خامة التصنيع والهيكل:' : 'Material & Framework Specs:'}
                  </span>
                  <div className="font-bold text-purple-900">
                    {selectedOrder.material || selectedOrder.materials_notes || 'Zirconia'}
                  </div>
                  <div className="text-slate-600 pt-1">
                    <span className="font-semibold">{isAr ? 'الهيكل (Framework): ' : 'Framework: '}</span>
                    <span className="font-mono font-bold bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
                      {selectedOrder.framework || 'Monolithic'}
                    </span>
                  </div>
                </div>

                {/* Stage & Shade */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isAr ? 'المرحلة واللون (Shade):' : 'Stage & Vita Shade:'}
                  </span>
                  <div className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                    Shade: {selectedOrder.shade_notes || 'Standard'}
                  </div>
                  <div className="pt-1">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold border inline-block ${
                        selectedOrder.try_in_or_final === 'try_in'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      }`}
                    >
                      {selectedOrder.try_in_or_final === 'try_in'
                        ? isAr
                          ? 'تجربة (Try-In Stage)'
                          : 'Try-In Stage'
                        : isAr
                        ? 'تسليم نهائي (Final Restoration)'
                        : 'Final Restoration'}
                    </span>
                  </div>
                </div>

                {/* Pontic & Abutment */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 sm:col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isAr ? 'تخصيص Pontic ودعامة Abutment:' : 'Pontic Design & Abutment Specs:'}
                  </span>
                  <div className="flex items-center gap-4 text-slate-800 font-medium">
                    <div>
                      <span className="font-semibold text-slate-500">{isAr ? 'تصميم Pontic: ' : 'Pontic: '}</span>
                      <span className="font-bold text-slate-900">{selectedOrder.pontic || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">{isAr ? 'الدعامة Abutment: ' : 'Abutment: '}</span>
                      <span className="font-bold text-slate-900">{selectedOrder.abutment || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attachment References (3D STL / PLY / Photos) */}
              {selectedOrder.attachment_refs && selectedOrder.attachment_refs.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-indigo-600" />
                    <span>{isAr ? 'ملفات المسح الضوئي والصور المرفقة:' : '3D Scans & Attachment References:'}</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedOrder.attachment_refs.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-800 shadow-2xs"
                      >
                        <FileCode className="w-3.5 h-3.5 text-purple-600" />
                        <span>{att}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Doctor Instructions */}
              {(selectedOrder.doctor_notes || selectedOrder.notes) && (
                <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-200 text-blue-950 space-y-1">
                  <span className="text-[11px] font-bold text-blue-800 block">
                    {isAr ? 'تعليمات طبيب الأسنان المعالج:' : 'Doctor Clinical Instructions:'}
                  </span>
                  <p className="text-xs">{selectedOrder.doctor_notes || selectedOrder.notes}</p>
                </div>
              )}

              {/* Editable Lab Technician Notes */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">
                  {isAr ? 'ملاحظات وتوجيهات فني المعمل (Lab Notes):' : 'Lab Technician Manufacturing Notes:'}
                </span>
                <textarea
                  rows={3}
                  value={editingLabNotes}
                  onChange={(e) => setEditingLabNotes(e.target.value)}
                  placeholder={
                    isAr
                      ? 'أضف ملاحظات التصنيع، سمك الهيكل، طبقة التلميع، أو تفاصيل الفحص الفني...'
                      : 'Enter technician manufacturing notes, margin clearance, glaze details...'
                  }
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveLabNotes}
                    className="px-4 py-2 bg-purple-900 hover:bg-purple-950 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isAr ? 'حفظ ملاحظات الفني' : 'Save Lab Notes'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  if (selectedOrder) setSelectedOrderForChat(selectedOrder);
                }}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold rounded-xl text-xs transition flex items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <span>{isAr ? 'فتح المحادثة الفنية' : 'Open Technical Chat'}</span>
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lab Order Technical Chat Modal */}
      {selectedOrderForChat && (
        <LabOrderChatModal
          order={selectedOrderForChat}
          onClose={() => {
            setSelectedOrderForChat(null);
            refreshOrders();
          }}
        />
      )}
    </div>
  );
};
