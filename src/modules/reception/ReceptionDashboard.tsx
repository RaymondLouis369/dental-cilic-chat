import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  CalendarClock,
  Clock,
  UserCheck,
  Plus,
  Search,
  QrCode,
  CheckCircle,
  AlertCircle,
  Stethoscope,
  Building2,
  Users,
  ChevronDown,
  XCircle,
  FileText,
  FileEdit,
  ArrowRight,
  Filter,
  Phone,
  Shield,
  Tag,
  FileScan,
  Share2,
  ClipboardList,
  FlaskConical,
  Receipt,
  MessageSquare,
  LayoutList,
  CalendarDays,
  RotateCcw,
} from 'lucide-react';
import { AppointmentCalendarView } from '../scheduling/AppointmentCalendarView';
import { RescheduleAppointmentModal } from '../scheduling/RescheduleAppointmentModal';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getStoredAppointments,
  getStoredWaitingList,
  getStoredServices,
  updateAppointmentStatus,
  updateWaitingListStatus,
} from '../../lib/receptionAndBillingStorage';
import {
  confirmAppointmentByReception,
  sendAppointmentReminders,
  getUnconfirmedAppointmentsAlerts,
} from '../../lib/appointmentService';
import { getStoredPatients } from '../../lib/patientStorage';
import { getStoredBranches, getStoredStaffUsers } from '../../lib/storage';
import {
  getStoredInvestigationRequests,
  getStoredReferrals,
  getStoredDoctorTasks,
  getStoredLabOrders,
} from '../../lib/clinicalStorage';
import { Appointment, WaitingListEntry, Service } from '../../types/receptionAndBilling';
import { Patient } from '../../types/patient';
import { StaffUser, Branch } from '../../types';

import { NewBookingModal } from './NewBookingModal';
import { WalkInModal } from './WalkInModal';
import { PatientLookupModal } from './PatientLookupModal';
import { CustomServiceModal } from './CustomServiceModal';
import { ReceptionTasksModal } from './ReceptionTasksModal';
import { LabOrderManagementDashboard } from './LabOrderManagementDashboard';
import { ReceptionWaitingRoom } from './ReceptionWaitingRoom';
import { InvoiceModal } from './InvoiceModal';
import { RecallFollowUpManagementModal } from './RecallFollowUpManagementModal';
import { ComplaintsManagementModal } from './ComplaintsManagementModal';
import { PatientWalletModal } from './PatientWalletModal';
import { InsuranceClaimsModal } from './InsuranceClaimsModal';
import { Wallet, Award } from 'lucide-react';

export const ReceptionDashboard: React.FC = () => {
  const { session } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  // Selected Date (defaults to today's date in Africa/Cairo)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Selected Branch
  const branches: Branch[] = useMemo(() => getStoredBranches(), []);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    if (session?.profile && 'branch_id' in session.profile && session.profile.branch_id) {
      return (session.profile as any).branch_id;
    }
    return branches[0]?.id || '11111111-1111-1111-1111-111111111111';
  });

  // Reception Workspace Main Tab state ('appointments' | 'waiting_room' | 'lab_orders')
  const [receptionViewTab, setReceptionViewTab] = useState<'appointments' | 'waiting_room' | 'lab_orders'>('appointments');

  // Modals state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [showCustomServiceModal, setShowCustomServiceModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showComplaintsModal, setShowComplaintsModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [selectedPatientFile, setSelectedPatientFile] = useState<Patient | null>(null);

  // Search, Filter & View state
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [doctorFilter, setDoctorFilter] = useState<string>('all');
  const [rescheduleApt, setRescheduleApt] = useState<Appointment | null>(null);

  // Trigger re-fetch
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshData = () => setRefreshKey((k) => k + 1);

  // Load Data
  const appointments: Appointment[] = useMemo(
    () => getStoredAppointments(),
    [refreshKey]
  );
  const waitingList: WaitingListEntry[] = useMemo(
    () => getStoredWaitingList(),
    [refreshKey]
  );
  const patients: Patient[] = useMemo(() => getStoredPatients(), [refreshKey]);
  const staff: StaffUser[] = useMemo(() => getStoredStaffUsers(), []);
  const services: Service[] = useMemo(() => getStoredServices(), []);
  const investigations = useMemo(
    () => getStoredInvestigationRequests(),
    [refreshKey]
  );
  const referrals = useMemo(
    () => getStoredReferrals(),
    [refreshKey]
  );
  const doctorTasks = useMemo(
    () => getStoredDoctorTasks(),
    [refreshKey]
  );
  const labOrders = useMemo(
    () => getStoredLabOrders(),
    [refreshKey]
  );

  const activeLabOrdersCount = useMemo(() => {
    return labOrders.filter(
      (o) =>
        (selectedBranchId === 'all' || o.branch_id === selectedBranchId) &&
        o.status !== 'fitted' &&
        o.status !== 'cancelled'
    ).length;
  }, [labOrders, selectedBranchId]);

  const pendingDoctorTasksCount = useMemo(() => {
    return doctorTasks.filter(
      (t) =>
        (selectedBranchId === 'all' || t.branch_id === selectedBranchId) &&
        (t.status === 'pending' || t.status === 'in_progress')
    ).length;
  }, [doctorTasks, selectedBranchId]);

  // Caller context for reception staff
  const receptionCallerContext = useMemo(() => {
    return {
      organizationId: session?.profile?.organization_id || 'org_dental_egy_01',
      profileId: session?.profile?.id,
      userId: session?.profile?.id,
      roleKey: (session?.profile?.role_key || 'receptionist') as any,
      assignedBranchIds: selectedBranchId !== 'all' ? [selectedBranchId] : undefined,
      isOrgWideManager: session?.profile?.role_key === 'center_manager',
    };
  }, [session, selectedBranchId]);

  // Automatically trigger automated appointment reminders
  useEffect(() => {
    try {
      sendAppointmentReminders(receptionCallerContext);
    } catch {
      // ignore
    }
  }, [receptionCallerContext, refreshKey]);

  // Unconfirmed Appointments Alerts
  const unconfirmedAlerts = useMemo(() => {
    return getUnconfirmedAppointmentsAlerts(receptionCallerContext, selectedBranchId);
  }, [receptionCallerContext, selectedBranchId, refreshKey]);

  const handleReceptionConfirm = (aptId: string) => {
    const res = confirmAppointmentByReception(aptId, receptionCallerContext);
    if (res.success) {
      refreshData();
    } else {
      alert(res.error || 'Failed to confirm appointment');
    }
  };

  // Real-time Branch Summary Stats ('Pending Appointments', 'Active Investigations', 'Referrals Pending', 'In Clinic Patients')
  const branchRealtimeStats = useMemo(() => {
    // 1. Pending Appointments (confirmed, waiting, or rescheduled for the selected branch & date)
    const pendingAppointmentsCount = appointments.filter(
      (a) =>
        (selectedBranchId === 'all' || a.branch_id === selectedBranchId) &&
        a.appointment_date === selectedDate &&
        (a.status === 'confirmed' || a.status === 'waiting' || a.status === 'rescheduled')
    ).length;

    // 2. Active Investigations (requested or pending for current branch)
    const activeInvestigationsCount = investigations.filter((inv) => {
      const doc = staff.find((s) => s.id === inv.doctor_id);
      const matchBranch =
        selectedBranchId === 'all' ||
        inv.branch_id === selectedBranchId ||
        doc?.branch_id === selectedBranchId;
      const isPendingStatus = inv.status === 'requested' || inv.status === 'pending';
      return matchBranch && isPendingStatus;
    }).length;

    // 3. Referrals Pending (sent, pending, or draft for current branch)
    const pendingReferralsCount = referrals.filter((ref) => {
      const doc = staff.find((s) => s.id === ref.referring_doctor_id);
      const targetDoc = staff.find((s) => s.id === ref.target_doctor_id);
      const matchBranch =
        selectedBranchId === 'all' ||
        doc?.branch_id === selectedBranchId ||
        targetDoc?.branch_id === selectedBranchId;
      const isPendingStatus =
        ref.status === 'pending' || ref.status === 'sent' || ref.status === 'draft';
      return matchBranch && isPendingStatus;
    }).length;

    // 4. In-Clinic Patients Present
    const activeInClinicCount = appointments.filter(
      (a) =>
        (selectedBranchId === 'all' || a.branch_id === selectedBranchId) &&
        a.appointment_date === selectedDate &&
        (a.status === 'arrived' || a.status === 'with_doctor' || a.status === 'waiting')
    ).length;

    return {
      pendingAppointmentsCount,
      activeInvestigationsCount,
      pendingReferralsCount,
      activeInClinicCount,
    };
  }, [
    appointments,
    investigations,
    referrals,
    selectedBranchId,
    selectedDate,
    patients,
    staff,
  ]);

  // Filter appointments for selected branch and date
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      // Branch filter
      if (selectedBranchId !== 'all' && apt.branch_id !== selectedBranchId) {
        return false;
      }
      // Date filter
      if (apt.appointment_date !== selectedDate) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && apt.status !== statusFilter) {
        return false;
      }
      // Doctor filter
      if (doctorFilter !== 'all' && apt.doctor_id !== doctorFilter) {
        return false;
      }
      // Appointment Type filter
      if (typeFilter !== 'all' && apt.appointment_type !== typeFilter) {
        return false;
      }
      // Search query (patient name, code, mobile, doctor name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pat = patients.find((p) => p.id === apt.patient_id);
        const doc = staff.find((s) => s.id === apt.doctor_id);

        const patientFullName = pat ? `${pat.first_name} ${pat.middle_name || ''} ${pat.last_name}`.trim().toLowerCase() : '';
        const matchPat =
          patientFullName.includes(q) ||
          pat?.patient_code.toLowerCase().includes(q) ||
          pat?.primary_mobile.includes(q);

        const matchDoc = doc?.display_name.toLowerCase().includes(q);

        if (!matchPat && !matchDoc) return false;
      }

      return true;
    });
  }, [appointments, selectedBranchId, selectedDate, statusFilter, searchQuery, patients, staff]);

  // Filter waiting list for selected branch
  const branchWaitingList = useMemo(() => {
    return waitingList.filter((item) => {
      if (selectedBranchId !== 'all' && item.branch_id !== selectedBranchId) {
        return false;
      }
      return item.status === 'waiting' || item.status === 'with_doctor';
    });
  }, [waitingList, selectedBranchId]);

  // Quick stats for selected branch and date
  const stats = useMemo(() => {
    const dayApts = appointments.filter(
      (a) =>
        (selectedBranchId === 'all' || a.branch_id === selectedBranchId) &&
        a.appointment_date === selectedDate
    );

    return {
      total: dayApts.length,
      confirmed: dayApts.filter((a) => a.status === 'confirmed').length,
      arrived: dayApts.filter((a) => a.status === 'arrived').length,
      waiting: dayApts.filter((a) => a.status === 'waiting').length,
      withDoctor: dayApts.filter((a) => a.status === 'with_doctor').length,
      completed: dayApts.filter((a) => a.status === 'completed').length,
      cancelled: dayApts.filter((a) => a.status === 'cancelled').length,
      noShow: dayApts.filter((a) => a.status === 'no_show').length,
    };
  }, [appointments, selectedBranchId, selectedDate]);

  // Appointment Status Updater
  const handleStatusChange = (appointmentId: string, newStatus: any) => {
    updateAppointmentStatus(appointmentId, newStatus);
    refreshData();
  };

  // Waiting list status updater
  const handleWaitingStatusChange = (entryId: string, newStatus: any) => {
    updateWaitingListStatus(entryId, newStatus);
    refreshData();
  };

  // Status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return {
          bg: 'bg-blue-100 text-blue-800 border-blue-200',
          label: isAr ? 'مؤكد' : 'Confirmed',
        };
      case 'arrived':
        return {
          bg: 'bg-teal-100 text-teal-800 border-teal-200',
          label: isAr ? 'وصل للمركز' : 'Arrived',
        };
      case 'waiting':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-200',
          label: isAr ? 'في الانتظار' : 'Waiting',
        };
      case 'with_doctor':
        return {
          bg: 'bg-purple-100 text-purple-800 border-purple-200',
          label: isAr ? 'مع الطبيب' : 'With Doctor',
        };
      case 'completed':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          label: isAr ? 'مكتمل' : 'Completed',
        };
      case 'cancelled':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-200',
          label: isAr ? 'ملغي' : 'Cancelled',
        };
      case 'no_show':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          label: isAr ? 'لم يحضر' : 'No-show',
        };
      case 'rescheduled':
        return {
          bg: 'bg-orange-100 text-orange-800 border-orange-200',
          label: isAr ? 'مُعاد جدولته' : 'Rescheduled',
        };
      case 'late':
        return {
          bg: 'bg-red-100 text-red-800 border-red-200',
          label: isAr ? 'متأخر' : 'Late',
        };
      default:
        return { bg: 'bg-slate-100 text-slate-800 border-slate-200', label: status };
    }
  };

  return (
    <div className="space-y-6">
      {/* Reception Workspace View Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setReceptionViewTab('appointments')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            receptionViewTab === 'appointments'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{isAr ? 'جدول المواعيد العام' : 'Appointments Calendar'}</span>
        </button>

        <button
          id="reception-waiting-room-tab-btn"
          onClick={() => setReceptionViewTab('waiting_room')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            receptionViewTab === 'waiting_room'
              ? 'bg-amber-700 text-white shadow-xs'
              : 'bg-white text-amber-900 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-500" />
          <span>{isAr ? 'غرفة الانتظار وطابور اليوم' : 'Waiting Room & Queue'}</span>
          {(stats.arrived + stats.waiting + stats.withDoctor) > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                receptionViewTab === 'waiting_room'
                  ? 'bg-amber-900 text-white'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              {stats.arrived + stats.waiting + stats.withDoctor}
            </span>
          )}
        </button>

        <button
          id="reception-lab-orders-tab-btn"
          onClick={() => setReceptionViewTab('lab_orders')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all relative ${
            receptionViewTab === 'lab_orders'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-white text-purple-900 hover:bg-purple-50 border border-purple-200'
          }`}
        >
          <FlaskConical className="w-4 h-4 text-purple-400" />
          <span>{isAr ? 'إدارة أوردات المعمل' : 'Lab Order Management'}</span>
          {activeLabOrdersCount > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                receptionViewTab === 'lab_orders'
                  ? 'bg-purple-900 text-white'
                  : 'bg-purple-100 text-purple-800 border border-purple-200'
              }`}
            >
              {activeLabOrdersCount}
            </span>
          )}
        </button>
      </div>

      {receptionViewTab === 'lab_orders' ? (
        <LabOrderManagementDashboard
          onBackToAppointments={() => setReceptionViewTab('appointments')}
        />
      ) : receptionViewTab === 'waiting_room' ? (
        <ReceptionWaitingRoom selectedBranchId={selectedBranchId} />
      ) : (
        <>
          {/* Top Header */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                  <UserCheck className="w-6 h-6" />
                </span>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    {isAr ? 'مكتب الاستقبال وإدارة المواعيد' : 'Reception & Appointment Desk'}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isAr
                      ? 'متابعة مواعيد اليوم، تسجيل الوصول، وقائمة الانتظار في جمهورية مصر العربية'
                      : "Today's schedule, patient arrivals, and waiting list in Egypt"}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowBookingModal(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'حجز موعد جديد' : 'New Booking'}</span>
              </button>

              <button
                onClick={() => setShowWalkInModal(true)}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Clock className="w-4 h-4" />
                <span>{isAr ? 'واك-إن / انتظار' : 'Walk-In'}</span>
              </button>

              <button
                onClick={() => setShowLookupModal(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span>{isAr ? 'فحص QR / وصول' : 'QR Check-in'}</span>
              </button>

              <button
                onClick={() => setShowCustomServiceModal(true)}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>{isAr ? 'سعر مخصص' : 'Custom Price'}</span>
              </button>

              <button
                id="reception-lab-orders-quick-btn"
                onClick={() => setReceptionViewTab('lab_orders')}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all relative"
              >
                <FlaskConical className="w-4 h-4 text-purple-200" />
                <span>{isAr ? 'أوردات المعمل' : 'Lab Orders'}</span>
                {activeLabOrdersCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-purple-900 text-white text-[10px] font-black rounded-full shadow-xs">
                    {activeLabOrdersCount}
                  </span>
                )}
              </button>

              <button
                id="reception-tasks-handoffs-btn"
                onClick={() => setShowTasksModal(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-teal-700 to-slate-800 hover:from-teal-800 hover:to-slate-900 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all relative"
              >
                <ClipboardList className="w-4 h-4 text-teal-300" />
                <span>{isAr ? 'مهام وتسليمات الأطباء' : 'Tasks & Handoffs'}</span>
                {pendingDoctorTasksCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full shadow-xs animate-pulse">
                    {pendingDoctorTasksCount}
                  </span>
                )}
              </button>

              <button
                id="reception-recall-followup-btn"
                onClick={() => setShowRecallModal(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-teal-800 to-emerald-900 hover:from-teal-900 hover:to-emerald-950 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all relative"
              >
                <CalendarClock className="w-4 h-4 text-emerald-300" />
                <span>{isAr ? 'المتابعة والاستدعاء' : 'Recalls & Follow-Ups'}</span>
              </button>

              <button
                id="reception-invoices-billing-btn"
                onClick={() => setShowInvoiceModal(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Receipt className="w-4 h-4 text-blue-200" />
                <span>{isAr ? 'الفواتير والحسابات' : 'Invoices & Billing'}</span>
              </button>

              <button
                id="reception-wallet-loyalty-btn"
                onClick={() => {
                  if (patients.length > 0) setSelectedPatientFile(patients[0]);
                  setShowWalletModal(true);
                }}
                className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Wallet className="w-4 h-4 text-teal-200" />
                <span>{isAr ? 'المحفظة والولاء' : 'Wallet & Loyalty'}</span>
              </button>

              <button
                id="reception-insurance-claims-btn"
                onClick={() => setShowInsuranceModal(true)}
                className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Shield className="w-4 h-4 text-indigo-200" />
                <span>{isAr ? 'المطالبات والتأمين' : 'Insurance Claims'}</span>
              </button>

              <button
                id="reception-complaints-tickets-btn"
                onClick={() => setShowComplaintsModal(true)}
                className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <MessageSquare className="w-4 h-4 text-rose-200" />
                <span>{isAr ? 'الشكاوى وتذاكر الدعم' : 'Complaints & Support'}</span>
              </button>
            </div>
          </div>

          {/* Unconfirmed Appointments Alert Banner */}
          {unconfirmedAlerts.unconfirmed_count > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 text-xs shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0 font-bold">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">
                    {isAr
                      ? `تنبيه: يوجد ${unconfirmedAlerts.unconfirmed_count} مواعيد قادمة بانتظار التأكيد`
                      : `Alert: ${unconfirmedAlerts.unconfirmed_count} upcoming appointment(s) pending confirmation`}
                  </div>
                  <div className="text-amber-800/80 mt-0.5">
                    {isAr
                      ? 'يرجى التواصل مع المرضى لتأكيد الحضور أو التأكيد بنقرة واحدة'
                      : 'Please contact patients or confirm visit with one click'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStatusFilter('confirmed')}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-all shrink-0"
              >
                {isAr ? 'عرض المواعيد غير المؤكدة' : 'View Unconfirmed'}
              </button>
            </div>
          )}

      {/* Filter & Date Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs">
        {/* Branch Selector */}
        <div>
          <label className="block text-slate-500 font-bold mb-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-teal-600" />
            <span>{isAr ? 'الفرع المحدد' : 'Branch Scope'}</span>
          </label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-teal-500"
          >
            {session?.role.key === 'center_manager' && (
              <option value="all">{isAr ? 'جميع الفروع (المركز بالكامل)' : 'All Branches'}</option>
            )}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.city})
              </option>
            ))}
          </select>
        </div>

        {/* Date Selector */}
        <div>
          <label className="block text-slate-500 font-bold mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            <span>{isAr ? 'تاريخ العرض' : 'Date'}</span>
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Search */}
        <div>
          <label className="block text-slate-500 font-bold mb-1 flex items-center gap-1">
            <Search className="w-3.5 h-3.5 text-teal-600" />
            <span>{isAr ? 'بحث سريع' : 'Search'}</span>
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isAr ? 'ابحث بالمريض أو الكود أو الطبيب...' : 'Patient, code, mobile, doctor...'
            }
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Real-time Branch Summary Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending Appointments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>{isAr ? 'المواعيد القادمة المعلقة' : 'Pending Appointments'}</span>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {branchRealtimeStats.pendingAppointmentsCount}
            </div>
            <p className="text-[11px] text-slate-400">
              {isAr ? 'مواعيد بانتظار الحضور والتأكيد اليوم' : 'Confirmed & waiting today'}
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl group-hover:scale-105 transition-all shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Active Investigations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <FileScan className="w-4 h-4 text-indigo-600" />
              <span>{isAr ? 'الفحوصات والأشعة النشطة' : 'Active Investigations'}</span>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {branchRealtimeStats.activeInvestigationsCount}
            </div>
            <p className="text-[11px] text-slate-400">
              {isAr ? 'طلبات تحاليل وأشعة بانتظار النتائج' : 'Radiology & lab orders pending'}
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-2xl group-hover:scale-105 transition-all shrink-0">
            <FileScan className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Referrals Pending */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <Share2 className="w-4 h-4 text-amber-600" />
              <span>{isAr ? 'الإحالات الطبية المعلقة' : 'Referrals Pending'}</span>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {branchRealtimeStats.pendingReferralsCount}
            </div>
            <p className="text-[11px] text-slate-400">
              {isAr ? 'إحالات استشاريين بانتظار المتابعة' : 'Consultant & hospital referrals'}
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-700 rounded-2xl group-hover:scale-105 transition-all shrink-0">
            <Share2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: In-Clinic Patients */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between relative overflow-hidden group hover:border-teal-300 transition-all">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <Users className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'المرضى المتواجدون بالفرع' : 'In-Clinic Patients'}</span>
            </div>
            <div className="text-2xl font-black text-teal-700 font-mono">
              {branchRealtimeStats.activeInClinicCount}
            </div>
            <p className="text-[11px] text-slate-400">
              {isAr ? 'حضور بالانتظار أو في الكشف' : 'Arrived, waiting, or in clinic'}
            </p>
          </div>
          <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl group-hover:scale-105 transition-all shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-medium">{isAr ? 'الكل' : 'Total'}</div>
          <div className="text-lg font-black mt-0.5">{stats.total}</div>
        </div>

        <div
          onClick={() => setStatusFilter('confirmed')}
          className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
            statusFilter === 'confirmed'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-medium">{isAr ? 'مؤكد' : 'Confirmed'}</div>
          <div className="text-lg font-black mt-0.5 text-blue-600 group-hover:text-blue-700">
            {stats.confirmed}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('arrived')}
          className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
            statusFilter === 'arrived'
              ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-medium">{isAr ? 'وصل' : 'Arrived'}</div>
          <div className="text-lg font-black mt-0.5 text-teal-600">{stats.arrived}</div>
        </div>

        <div
          onClick={() => setStatusFilter('waiting')}
          className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
            statusFilter === 'waiting'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-medium">{isAr ? 'بالانتظار' : 'Waiting'}</div>
          <div className="text-lg font-black mt-0.5 text-amber-600">{stats.waiting}</div>
        </div>

        <div
          onClick={() => setStatusFilter('with_doctor')}
          className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
            statusFilter === 'with_doctor'
              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-medium">{isAr ? 'مع الطبيب' : 'With Doctor'}</div>
          <div className="text-lg font-black mt-0.5 text-purple-600">{stats.withDoctor}</div>
        </div>

        <div
          onClick={() => setStatusFilter('completed')}
          className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
            statusFilter === 'completed'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-medium">{isAr ? 'اكتمل' : 'Completed'}</div>
          <div className="text-lg font-black mt-0.5 text-emerald-600">{stats.completed}</div>
        </div>

        <div
          onClick={() => setStatusFilter('cancelled')}
          className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
            statusFilter === 'cancelled'
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-medium">{isAr ? 'ملغي' : 'Cancelled'}</div>
          <div className="text-lg font-black mt-0.5 text-rose-600">{stats.cancelled}</div>
        </div>

        <div
          onClick={() => setStatusFilter('no_show')}
          className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
            statusFilter === 'no_show'
              ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-medium">{isAr ? 'لم يحضر' : 'No-Show'}</div>
          <div className="text-lg font-black mt-0.5 text-slate-600">{stats.noShow}</div>
        </div>
      </div>

      {/* Main Grid: Waiting List (Side) + Appointments (Main) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments Table / Calendar (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-bold text-slate-900">
                {isAr ? 'مواعيد اليوم المجدولة' : "Today's Appointments"} ({filteredAppointments.length})
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    viewMode === 'list'
                      ? 'bg-white text-teal-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  <span>{isAr ? 'قائمة' : 'List'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    viewMode === 'calendar'
                      ? 'bg-white text-teal-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تقويم' : 'Calendar'}</span>
                </button>
              </div>

              {/* Doctor filter */}
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
              >
                <option value="all">{isAr ? 'كل الأطباء' : 'All Doctors'}</option>
                {staff
                  .filter((s) => s.role_key === 'doctor')
                  .map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.display_name}
                    </option>
                  ))}
              </select>

              {/* Appointment Type filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
              >
                <option value="all">{isAr ? 'كل الأنواع' : 'All Types'}</option>
                <option value="consultation">{isAr ? 'استشارة' : 'Consultation'}</option>
                <option value="treatment">{isAr ? 'علاج' : 'Treatment'}</option>
                <option value="follow_up">{isAr ? 'متابعة' : 'Follow-Up'}</option>
                <option value="cleaning">{isAr ? 'تنظيف' : 'Cleaning'}</option>
                <option value="prosthetic">{isAr ? 'تركيبات' : 'Prosthetic'}</option>
                <option value="orthodontic">{isAr ? 'تقويم' : 'Orthodontic'}</option>
                <option value="emergency">{isAr ? 'طوارئ' : 'Emergency'}</option>
                <option value="general">{isAr ? 'عام' : 'General'}</option>
              </select>

              {(statusFilter !== 'all' || typeFilter !== 'all' || doctorFilter !== 'all') && (
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setTypeFilter('all');
                    setDoctorFilter('all');
                  }}
                  className="text-xs text-teal-600 hover:underline"
                >
                  {isAr ? 'إعادة ضبط' : 'Reset'}
                </button>
              )}
            </div>
          </div>

          {viewMode === 'calendar' ? (
            <div className="p-4">
              <AppointmentCalendarView
                appointments={appointments}
                patients={patients}
                doctors={staff.filter((s) => s.role_key === 'doctor')}
                branches={getStoredBranches()}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                selectedBranchId={selectedBranchId}
                selectedDoctorId={doctorFilter}
                onSelectDoctorId={setDoctorFilter}
                onStatusChange={(aptId, st) => handleStatusChange(aptId, st)}
                onRescheduleClick={(apt) => setRescheduleApt(apt)}
                onCancelClick={(apt) => handleStatusChange(apt.id, 'cancelled')}
                onNewBookingClick={() => setShowBookingModal(true)}
              />
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p>{isAr ? 'لا توجد مواعيد مسجلة تطابق التصفية الحالية' : 'No appointments matching filter'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3 text-start">{isAr ? 'الوقت' : 'Time'}</th>
                    <th className="px-3.5 py-3 text-start">{isAr ? 'المريض' : 'Patient'}</th>
                    <th className="px-3.5 py-3 text-start">{isAr ? 'الطبيب والخدمة' : 'Doctor & Service'}</th>
                    <th className="px-3.5 py-3 text-start">{isAr ? 'النوع' : 'Type'}</th>
                    <th className="px-3.5 py-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="px-3.5 py-3 text-center">{isAr ? 'إجراءات سريعة' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAppointments.map((apt) => {
                    const patient = patients.find((p) => p.id === apt.patient_id);
                    const doctor = staff.find((s) => s.id === apt.doctor_id);
                    const service = services.find((s) => s.id === apt.service_id);
                    const statusBadge = getStatusBadge(apt.status);

                    return (
                      <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Time */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900">
                            {apt.start_time} - {apt.end_time}
                          </div>
                        </td>

                        {/* Patient */}
                        <td className="px-3.5 py-3">
                          <div className="font-bold text-slate-900">
                            {patient ? `${patient.first_name} ${patient.last_name}` : '—'}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                            <span className="text-teal-700 font-bold">{patient?.patient_code}</span>
                            <span>•</span>
                            <span>{patient?.primary_mobile}</span>
                          </div>
                        </td>

                        {/* Doctor & Service */}
                        <td className="px-3.5 py-3">
                          <div className="font-semibold text-slate-800 flex items-center gap-1">
                            <Stethoscope className="w-3 h-3 text-teal-600" />
                            <span>{doctor?.display_name}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {service ? (isAr ? service.name_ar : service.name_en) : '—'}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                            {apt.appointment_type || 'general'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadge.bg}`}
                            >
                              {statusBadge.label}
                            </span>
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold ${
                                apt.confirmation_status === 'patient_confirmed' || apt.confirmation_status === 'reception_confirmed'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {apt.confirmation_status === 'patient_confirmed'
                                ? (isAr ? 'مؤكد (مريض)' : 'Patient Confirmed')
                                : apt.confirmation_status === 'reception_confirmed'
                                ? (isAr ? 'مؤكد (استقبال)' : 'Reception Confirmed')
                                : (isAr ? 'بانتظار التأكيد' : 'Pending Confirmation')}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Reception Confirm Button */}
                            {apt.confirmation_status !== 'patient_confirmed' && apt.confirmation_status !== 'reception_confirmed' && (
                              <button
                                type="button"
                                onClick={() => handleReceptionConfirm(apt.id)}
                                title={isAr ? 'تأكيد الموعد بواسطة الاستقبال' : 'Confirm Appointment'}
                                className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 font-bold transition-all"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Change status selector */}
                            <select
                              value={apt.status}
                              onChange={(e) => handleStatusChange(apt.id, e.target.value)}
                              className="px-2 py-1 text-[11px] bg-white border border-slate-300 rounded-lg font-medium"
                            >
                              <option value="confirmed">{isAr ? 'مؤكد' : 'Confirmed'}</option>
                              <option value="arrived">{isAr ? 'وصل' : 'Arrived'}</option>
                              <option value="waiting">{isAr ? 'في الانتظار' : 'Waiting'}</option>
                              <option value="with_doctor">{isAr ? 'مع الطبيب' : 'With Doctor'}</option>
                              <option value="completed">{isAr ? 'اكتمل' : 'Completed'}</option>
                              <option value="cancelled">{isAr ? 'إلغاء' : 'Cancelled'}</option>
                              <option value="no_show">{isAr ? 'لم يحضر' : 'No-Show'}</option>
                              <option value="late">{isAr ? 'متأخر' : 'Late'}</option>
                            </select>

                            {/* Reschedule Button */}
                            <button
                              type="button"
                              onClick={() => setRescheduleApt(apt)}
                              title={isAr ? 'إعادة جدولة الموعد' : 'Reschedule Appointment'}
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            {/* View Patient File */}
                            {patient && (
                              <button
                                type="button"
                                onClick={() => setSelectedPatientFile(patient)}
                                title={isAr ? 'فتح ملف المريض' : 'View Patient File'}
                                className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-lg"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Live Waiting List Section (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col h-full">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">
                {isAr ? 'صالة الانتظار المباشرة' : 'Live Waiting Room'}
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
              {branchWaitingList.length} {isAr ? 'في الانتظار' : 'waiting'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pt-3">
            {branchWaitingList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p>{isAr ? 'لا يوجد مرضى في صالة الانتظار حالياً' : 'No patients currently waiting'}</p>
              </div>
            ) : (
              branchWaitingList.map((entry) => {
                const patient = patients.find((p) => p.id === entry.patient_id);
                const doctor = staff.find((s) => s.id === entry.preferred_doctor_id);

                return (
                  <div
                    key={entry.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-amber-200 text-amber-900 text-[11px]">
                          {entry.ticket_number}
                        </span>
                        <span className="font-bold text-slate-900">
                          {patient ? `${patient.first_name} ${patient.last_name}` : '—'}
                        </span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          entry.priority === 'urgent'
                            ? 'bg-red-100 text-red-800'
                            : entry.priority === 'vip'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {entry.priority === 'urgent'
                          ? isAr
                            ? 'عاجل'
                            : 'Urgent'
                          : entry.priority === 'vip'
                          ? 'VIP'
                          : isAr
                          ? 'عادي'
                          : 'Normal'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center justify-between">
                      <span>
                        {isAr ? 'وقت الوصول:' : 'Check-in:'}{' '}
                        {new Date(entry.check_in_time).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {doctor && (
                        <span className="text-teal-700 font-medium">{doctor.display_name}</span>
                      )}
                    </div>

                    {entry.chief_complaint && (
                      <p className="text-[11px] text-slate-500 italic bg-white p-1.5 rounded border border-slate-200">
                        "{entry.chief_complaint}"
                      </p>
                    )}

                    {/* Waiting list actions */}
                    <div className="flex items-center gap-2 pt-1">
                      {entry.status === 'waiting' ? (
                        <button
                          type="button"
                          onClick={() => handleWaitingStatusChange(entry.id, 'with_doctor')}
                          className="flex-1 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Stethoscope className="w-3 h-3" />
                          <span>{isAr ? 'دخول للطبيب' : 'Enter Doctor'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleWaitingStatusChange(entry.id, 'completed')}
                          className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>{isAr ? 'اكتملت الزيارة' : 'Done'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleWaitingStatusChange(entry.id, 'cancelled')}
                        title={isAr ? 'إلغاء التذكرة' : 'Cancel Ticket'}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Patient File Modal */}
      {selectedPatientFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl my-8 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-700 to-slate-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-teal-200" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {isAr ? selectedPatientFile.full_name_ar : selectedPatientFile.full_name_en}
                  </h2>
                  <p className="text-xs text-teal-200 font-mono">
                    {selectedPatientFile.patient_code} • {selectedPatientFile.mobile_primary}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatientFile(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500">{isAr ? 'تاريخ الميلاد:' : 'DOB:'}</span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {selectedPatientFile.date_of_birth}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">{isAr ? 'النوع:' : 'Gender:'}</span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {selectedPatientFile.gender === 'male'
                      ? isAr
                        ? 'ذكر'
                        : 'Male'
                      : isAr
                      ? 'أنثى'
                      : 'Female'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">
                    {isAr ? 'الرقم القومي / جواز السفر:' : 'National ID:'}
                  </span>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {selectedPatientFile.national_id || (isAr ? 'غير مسجل' : 'Not recorded')}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">{isAr ? 'رمز QR الفريد:' : 'QR Token:'}</span>
                  <div className="font-mono text-teal-700 text-[11px] truncate mt-0.5">
                    {selectedPatientFile.qr_token || '—'}
                  </div>
                </div>
              </div>

              {selectedPatientFile.medical_notes && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-1">
                    {isAr ? 'التاريخ المرضي والملاحظات الطبية:' : 'Medical Notes:'}
                  </h4>
                  <p className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl">
                    {selectedPatientFile.medical_notes}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPatientFile(null)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 font-semibold"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* Sub-modals */}
      <NewBookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        onSuccess={refreshData}
      />
      <WalkInModal
        isOpen={showWalkInModal}
        onClose={() => setShowWalkInModal(false)}
        onSuccess={refreshData}
      />
      <PatientLookupModal
        isOpen={showLookupModal}
        onClose={() => setShowLookupModal(false)}
        onCheckinSuccess={refreshData}
      />
      <CustomServiceModal
        isOpen={showCustomServiceModal}
        onClose={() => setShowCustomServiceModal(false)}
        onSuccess={refreshData}
      />
      <ReceptionTasksModal
        isOpen={showTasksModal}
        onClose={() => setShowTasksModal(false)}
        selectedBranchId={selectedBranchId}
        onTaskUpdated={refreshData}
      />
      <RecallFollowUpManagementModal
        isOpen={showRecallModal}
        onClose={() => setShowRecallModal(false)}
        selectedBranchId={selectedBranchId}
        onFollowUpUpdated={refreshData}
      />
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        onInvoiceUpdated={refreshData}
      />
      <ComplaintsManagementModal
        isOpen={showComplaintsModal}
        onClose={() => setShowComplaintsModal(false)}
        defaultBranchId={selectedBranchId}
      />
      <PatientWalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        patient={selectedPatientFile || patients[0] || null}
        onSuccess={refreshData}
      />
      <InsuranceClaimsModal
        isOpen={showInsuranceModal}
        onClose={() => setShowInsuranceModal(false)}
        onSuccess={refreshData}
      />
      <RescheduleAppointmentModal
        isOpen={!!rescheduleApt}
        appointment={rescheduleApt}
        patient={patients.find((p) => p.id === rescheduleApt?.patient_id)}
        doctor={staff.find((s) => s.id === rescheduleApt?.doctor_id)}
        branch={getStoredBranches().find((b) => b.id === rescheduleApt?.branch_id)}
        onClose={() => setRescheduleApt(null)}
        onSuccess={refreshData}
      />
    </div>
  );
};
