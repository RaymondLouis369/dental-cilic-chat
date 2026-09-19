import React, { useState, useMemo, useEffect } from 'react';
import {
  Truck,
  Search,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Building2,
  Calendar,
  X,
  Edit3,
  Save,
  ShieldCheck,
  PackageCheck,
  Navigation,
  FileText,
  AlertCircle,
  ScanLine,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getStoredLabOrders,
  updateDeliveryTransportStatus,
  updateLabOrderStatus,
} from '../../lib/clinicalStorage';
import { generateLabOrderQrPayload } from '../../lib/labQrUtils';
import { LabOrder, DeliveryTransportStatus } from '../../types/clinical';
import { hasPermission } from '../permissions/rolesAndPermissions';

export const DeliveryUserWorkspace: React.FC = () => {
  const { session } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransportStatus, setSelectedTransportStatus] = useState<string>('all');
  const [selectedCourierFilter, setSelectedCourierFilter] = useState<string>('all');

  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [isFailureModalOpen, setIsFailureModalOpen] = useState(false);
  const [failureOrderId, setFailureOrderId] = useState<string | null>(null);

  // QR Scanner Modal State
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [qrInputText, setQrInputText] = useState('');
  const [qrScanResult, setQrScanResult] = useState<{
    success: boolean;
    message: string;
    order?: LabOrder;
  } | null>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Security check: Confirm patient clinical record access is redacted
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

  // Extract distinct courier names for filtering
  const availableCouriers = useMemo(() => {
    const courierSet = new Set<string>();
    orders.forEach((o) => {
      if (o.delivery_courier_name) courierSet.add(o.delivery_courier_name);
    });
    return Array.from(courierSet);
  }, [orders]);

  // Filtered transport orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Must be a lab order relevant to transport (has courier or in active delivery statuses)
      const hasCourier = Boolean(order.delivery_courier_id || order.delivery_courier_name);

      // Filter by Courier if selected
      if (selectedCourierFilter !== 'all') {
        if (order.delivery_courier_name !== selectedCourierFilter) return false;
      }

      // Filter by transport status
      if (selectedTransportStatus !== 'all') {
        const status = order.delivery_transport_status || 'assigned';
        if (status !== selectedTransportStatus) return false;
      }

      // Filter by search query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(query);
        const matchesLab = (order.pickup_location || order.lab_name || '').toLowerCase().includes(query);
        const matchesBranch = (order.destination_branch_name || '').toLowerCase().includes(query);
        const matchesCourier = (order.delivery_courier_name || '').toLowerCase().includes(query);
        const matchesServiceAr = (order.service_name_ar || '').toLowerCase().includes(query);
        const matchesServiceEn = (order.service_name_en || '').toLowerCase().includes(query);

        if (
          !matchesId &&
          !matchesLab &&
          !matchesBranch &&
          !matchesCourier &&
          !matchesServiceAr &&
          !matchesServiceEn
        ) {
          return false;
        }
      }

      return true;
    });
  }, [orders, selectedCourierFilter, selectedTransportStatus, searchTerm]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const assigned = filteredOrders.filter(
      (o) => (o.delivery_transport_status || 'assigned') === 'assigned'
    ).length;
    const inTransit = filteredOrders.filter(
      (o) =>
        o.delivery_transport_status === 'picked_up' || o.delivery_transport_status === 'in_transit'
    ).length;
    const delivered = filteredOrders.filter((o) => o.delivery_transport_status === 'delivered').length;
    const failed = filteredOrders.filter((o) => o.delivery_transport_status === 'failed_delivery').length;

    return { total, assigned, inTransit, delivered, failed };
  }, [filteredOrders]);

  const handleUpdateStatus = (orderId: string, status: DeliveryTransportStatus, notes?: string) => {
    const success = updateDeliveryTransportStatus(orderId, status, notes);
    if (success) {
      refreshOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                delivery_transport_status: status,
                delivery_notes: notes !== undefined ? notes : prev.delivery_notes,
                status: status === 'delivered' ? 'delivered' : prev.status,
              }
            : null
        );
      }
      setStatusMessage(
        isAr
          ? `تم تحديث حالة الشحن والتوصيل إلى: ${getTransportStatusLabel(status, true)}`
          : `Transport status updated to: ${getTransportStatusLabel(status, false)}`
      );
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleOpenFailureModal = (orderId: string) => {
    setFailureOrderId(orderId);
    setFailureReason('');
    setIsFailureModalOpen(true);
  };

  const handleConfirmFailure = () => {
    if (!failureOrderId) return;
    handleUpdateStatus(failureOrderId, 'failed_delivery', failureReason || 'Failed delivery attempt');
    setIsFailureModalOpen(false);
    setFailureOrderId(null);
  };

  const handleSaveNotes = () => {
    if (!selectedOrder) return;
    const currentStatus = selectedOrder.delivery_transport_status || 'assigned';
    handleUpdateStatus(selectedOrder.id, currentStatus, editingNotes);
  };

  // QR Scan Match Handler
  const handleProcessQrScan = (rawInput?: string) => {
    const payload = (rawInput || qrInputText).trim();
    if (!payload) return;

    const matched = orders.find(
      (o) =>
        o.id === payload ||
        generateLabOrderQrPayload(o.id) === payload ||
        payload.toLowerCase().includes(o.id.toLowerCase())
    );

    if (matched) {
      // Transition to delivered
      updateDeliveryTransportStatus(matched.id, 'delivered', 'Confirmed via QR Scan Verification');
      refreshOrders();
      setQrScanResult({
        success: true,
        message: isAr
          ? `تم التحقق بنجاح من رمز QR وتحديث حالة التسليم للطلب #${matched.id.slice(-8)}`
          : `QR Verified successfully! Order #${matched.id.slice(-8)} marked as DELIVERED.`,
        order: matched,
      });
    } else {
      setQrScanResult({
        success: false,
        message: isAr
          ? 'رمز QR غير مطابق لأي طلب توصيل مصرح به في هذه المؤسسة.'
          : 'Invalid QR payload or unauthorized transport order.',
      });
    }
  };

  const getTransportStatusLabel = (status: DeliveryTransportStatus | undefined, ar: boolean) => {
    switch (status) {
      case 'picked_up':
        return ar ? 'تم الاستلام من المعمل' : 'Picked Up from Lab';
      case 'in_transit':
        return ar ? 'جاري النقل والتوصيل (في الطريق)' : 'In Transit';
      case 'delivered':
        return ar ? 'تم التسليم للعيادة' : 'Delivered to Clinic';
      case 'failed_delivery':
        return ar ? 'تعذر التسليم' : 'Delivery Failed';
      case 'assigned':
      default:
        return ar ? 'تم التكليف بالمهمة' : 'Assigned';
    }
  };

  const getTransportStatusBadgeClass = (status: DeliveryTransportStatus | undefined) => {
    switch (status) {
      case 'picked_up':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'in_transit':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'delivered':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'failed_delivery':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      case 'assigned':
      default:
        return 'bg-blue-100 text-blue-900 border-blue-300';
    }
  };

  if (!session) return null;

  return (
    <div className="space-y-6 animate-fadeIn pb-12" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-indigo-950 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-rose-900/50">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 shrink-0">
            <Truck className="w-7 h-7 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black tracking-tight">
                {isAr ? 'مساحة عمل مندوب شحن وتوصيل المعامل' : 'Dental Logistics & Courier Dispatch Workspace'}
              </h1>
              <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full text-[10px] font-bold">
                {isAr ? 'بيانات الشحن والتوصيل فقط' : 'Transport Scope Only'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {isAr
                ? 'استلام حالات التركيبات والتعويضات السنية من المعامل الشريكة وتوصيلها بأمان لفروع العيادات المعتمدة.'
                : 'Manage prosthetic case pickups from labs and transit deliveries to clinic branches securely.'}
            </p>
          </div>
        </div>

        {/* Security & Quick Scan Action */}
        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => {
              setIsQrScannerOpen(true);
              setQrInputText('');
              setQrScanResult(null);
            }}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-lg border border-rose-400/30"
          >
            <ScanLine className="w-4 h-4" />
            <span>{isAr ? 'مسح QR التسليم' : 'Scan Delivery QR'}</span>
          </button>

          <div className="hidden lg:flex bg-white/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/10 text-xs text-slate-200 flex-col gap-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>{isAr ? 'بيانات طبية محجوبة (RLS)' : 'Clinical Privacy Enforced'}</span>
            </div>
          </div>
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

      {/* Transport Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {isAr ? 'إجمالي مهمات التوصيل' : 'Total Tasks'}
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{stats.total}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
            {isAr ? 'مكلفة بالمهمة' : 'Assigned'}
          </span>
          <span className="text-2xl font-black text-blue-900 mt-1 block">{stats.assigned}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
            {isAr ? 'في الطريق / تم الاستلام' : 'In Transit / Picked Up'}
          </span>
          <span className="text-2xl font-black text-purple-900 mt-1 block">{stats.inTransit}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
            {isAr ? 'تم التسليم بنجاح' : 'Delivered'}
          </span>
          <span className="text-2xl font-black text-emerald-900 mt-1 block">{stats.delivered}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
            {isAr ? 'تعذر التسليم' : 'Failed'}
          </span>
          <span className="text-2xl font-black text-rose-900 mt-1 block">{stats.failed}</span>
        </div>
      </div>

      {/* Search and Filters */}
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
                  ? 'بحث برقم الطلب، اسم المعمل، فرع العيادة المستهدفة، أو المندوب...'
                  : 'Search by Order ID, Pickup Lab, Destination Branch, or Courier...'
              }
              className="w-full ps-9 pe-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
            />
          </div>

          {/* Courier Selector Filter */}
          {availableCouriers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 shrink-0">
                {isAr ? 'مندوب الشحن:' : 'Assigned Courier:'}
              </span>
              <select
                value={selectedCourierFilter}
                onChange={(e) => setSelectedCourierFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-rose-950 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="all">{isAr ? 'جميع المندوبين' : 'All Couriers'}</option>
                {availableCouriers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Transport Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
          <button
            onClick={() => setSelectedTransportStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedTransportStatus === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {isAr ? 'جميع الشحنات' : 'All Shipments'}
          </button>
          <button
            onClick={() => setSelectedTransportStatus('assigned')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedTransportStatus === 'assigned'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            {isAr ? 'بانتظار الاستلام (Assigned)' : 'Assigned'}
          </button>
          <button
            onClick={() => setSelectedTransportStatus('picked_up')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedTransportStatus === 'picked_up'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            {isAr ? 'تم الاستلام من المعمل' : 'Picked Up'}
          </button>
          <button
            onClick={() => setSelectedTransportStatus('in_transit')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedTransportStatus === 'in_transit'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            {isAr ? 'في الطريق (In Transit)' : 'In Transit'}
          </button>
          <button
            onClick={() => setSelectedTransportStatus('delivered')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedTransportStatus === 'delivered'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {isAr ? 'تم التسليم للعيادة' : 'Delivered'}
          </button>
          <button
            onClick={() => setSelectedTransportStatus('failed_delivery')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedTransportStatus === 'failed_delivery'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            {isAr ? 'تعذر التسليم' : 'Failed'}
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-xs text-center space-y-3">
          <Truck className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">
            {isAr ? 'لا توجد مهمات توصيل تطابق الفلترة' : 'No Transport Tasks Found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isAr
              ? 'تأكد من اختيار المندوب المسند الصحيح أو تغيير حالة البحث والفلترة.'
              : 'Adjust your search parameters or check another shipment status tab.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const transportStatus = order.delivery_transport_status || 'assigned';
            const todayStr = new Date().toISOString().split('T')[0];
            const isDueToday =
              order.delivery_date === todayStr || order.required_delivery_date === todayStr;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
              >
                {/* Header Info */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getTransportStatusBadgeClass(
                        transportStatus
                      )}`}
                    >
                      {getTransportStatusLabel(transportStatus, isAr)}
                    </span>
                  </div>

                  {/* Anonymized Patient Identifier */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500">
                      {isAr ? 'معرف حالة المريض:' : 'Patient Identifier:'}
                    </span>
                    <span className="font-mono font-bold text-slate-800 bg-rose-50 text-rose-900 px-2 py-0.5 rounded border border-rose-150">
                      PAT-{order.patient_id.slice(0, 6)}
                    </span>
                  </div>

                  {/* Pickup & Destination Locations */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-2 text-xs">
                    {/* Pickup Lab */}
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">
                          {isAr ? 'موقع الاستلام (المعمل):' : 'Pickup Location (Lab):'}
                        </span>
                        <span className="font-bold text-slate-900 block">
                          {order.pickup_location || order.lab_name || 'Partner Dental Lab'}
                        </span>
                      </div>
                    </div>

                    {/* Destination Clinic Branch */}
                    <div className="flex items-start gap-2 pt-1 border-t border-slate-200/60">
                      <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">
                          {isAr ? 'موقع التسليم (فرع العيادة):' : 'Destination (Clinic Branch):'}
                        </span>
                        <span className="font-bold text-slate-900 block">
                          {order.destination_branch_name || 'Cairo Central Branch'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timestamps & Item Spec */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 font-semibold block">
                        {isAr ? 'وقت الاستلام:' : 'Pickup Time:'}
                      </span>
                      <span className="font-mono font-bold text-slate-800 block mt-0.5">
                        {order.delivery_pickup_time
                          ? new Date(order.delivery_pickup_time).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : isAr ? 'غير مستلم بعد' : 'Pending Pickup'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 font-semibold block">
                        {isAr ? 'تاريخ التسليم المتوقع:' : 'Expected Date:'}
                      </span>
                      <span
                        className={`font-mono font-bold block mt-0.5 ${
                          isDueToday ? 'text-rose-600 font-black' : 'text-slate-800'
                        }`}
                      >
                        {order.required_delivery_date || order.delivery_date}
                      </span>
                    </div>
                  </div>

                  {/* Delivery Notes preview if exists */}
                  {order.delivery_notes && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <p className="line-clamp-2">{order.delivery_notes}</p>
                    </div>
                  )}
                </div>

                {/* Workflow Actions */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {/* Confirm Pickup */}
                    {transportStatus === 'assigned' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'picked_up')}
                        className="flex-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition shadow-xs"
                      >
                        {isAr ? 'تأكيد الاستلام من المعمل' : 'Confirm Pickup'}
                      </button>
                    )}

                    {/* Mark In Transit */}
                    {transportStatus === 'picked_up' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'in_transit')}
                        className="flex-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition shadow-xs"
                      >
                        {isAr ? 'البدء بالنقل (في الطريق)' : 'Start Transit'}
                      </button>
                    )}

                    {/* Mark Delivered */}
                    {(transportStatus === 'picked_up' || transportStatus === 'in_transit') && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'delivered')}
                        className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-xs"
                      >
                        {isAr ? 'تأكيد التسليم للعيادة' : 'Mark Delivered'}
                      </button>
                    )}

                    {/* Report Failure */}
                    {transportStatus !== 'delivered' && (
                      <button
                        onClick={() => handleOpenFailureModal(order.id)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold rounded-xl text-xs transition"
                      >
                        {isAr ? 'تعذر' : 'Fail'}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setEditingNotes(order.delivery_notes || '');
                    }}
                    className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'ملاحظات والتفاصيل' : 'Transport Notes & Details'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Scanner Action Modal */}
      {isQrScannerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-rose-900 via-purple-900 to-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ScanLine className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold">
                  {isAr ? 'التحقق من رمز QR وتأكيد التسليم' : 'QR Scan Verification & Auto-Delivery'}
                </h3>
              </div>
              <button
                onClick={() => setIsQrScannerOpen(false)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                {isAr
                  ? 'امسح رمز QR الخاص بكرت الشحنة أو أدخل كود الشحنة (مثال: LAB-ORD-lab_ord_seed_1) لتغيير الحالة فورياً إلى تم التسليم.'
                  : 'Scan the Lab Order QR payload or enter the tracking code string to confirm immediate delivery to reception.'}
              </p>

              <div className="space-y-2">
                <label className="font-bold text-slate-700 block">
                  {isAr ? 'كود الشحنة أو رمز QR المصنع:' : 'Tracking Code / Payload String:'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={qrInputText}
                    onChange={(e) => setQrInputText(e.target.value)}
                    placeholder="LAB-ORD-..."
                    className="flex-1 p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                  <button
                    onClick={() => handleProcessQrScan()}
                    className="px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition"
                  >
                    {isAr ? 'تأكيد' : 'Verify'}
                  </button>
                </div>
              </div>

              {/* Sample Quick Testing Presets */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block mb-1">
                  {isAr ? 'اختصارات شحنات التجربة:' : 'Quick Testing Payloads:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {orders.slice(0, 3).map((o) => (
                    <button
                      key={o.id}
                      onClick={() => {
                        const code = generateLabOrderQrPayload(o.id);
                        setQrInputText(code);
                        handleProcessQrScan(code);
                      }}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-bold rounded-lg"
                    >
                      #{o.id.slice(-6)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scan Result Feedback */}
              {qrScanResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs font-bold flex items-start gap-2.5 ${
                    qrScanResult.success
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  {qrScanResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p>{qrScanResult.message}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsQrScannerOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Failure Reason Modal */}
      {isFailureModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>{isAr ? 'تسجيل سبب تعذر التسليم' : 'Report Delivery Failure'}</span>
            </div>
            <p className="text-slate-600">
              {isAr
                ? 'يرجى كتابة سبب عدم تمكن المندوب من تسليم الشحنة للفرع (مثال: الفرع مغلق، عدم مطابقة العينة...)'
                : 'Enter the specific reason for failed delivery attempt.'}
            </p>

            <textarea
              rows={3}
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              placeholder={isAr ? 'أدخل السبب بالتفصيل...' : 'Reason for failed attempt...'}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsFailureModalOpen(false)}
                className="px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded-xl"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmFailure}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
              >
                {isAr ? 'حفظ الحظر' : 'Save Failure'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold">
                  {isAr ? 'تفاصيل وملاحظات الشحنة والتوصيل' : 'Shipment Details & Courier Notes'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  {isAr ? 'ملاحظات مندوب التوصيل:' : 'Courier Transport Notes:'}
                </span>
                <textarea
                  rows={4}
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder={
                    isAr
                      ? 'سجل ملاحظات النقل، أرقام التواصل، حالة الطرد الفنية...'
                      : 'Add courier notes, contact info, thermal box specs...'
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl"
                >
                  {isAr ? 'إلغاء' : 'Close'}
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="px-4 py-2 bg-rose-900 hover:bg-rose-950 text-white font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{isAr ? 'حفظ الملاحظات' : 'Save Notes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
