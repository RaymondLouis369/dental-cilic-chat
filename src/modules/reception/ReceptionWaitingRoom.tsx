import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Stethoscope,
  Building2,
  Calendar,
  Search,
  ArrowRight,
  RotateCcw,
  XCircle,
  QrCode,
  ShieldCheck,
  Sparkles,
  Phone,
  UserX,
  Play,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getAppointmentQueue,
  updateAppointmentStatus,
  QueueItem,
  AppointmentQueueSummary,
} from '../../lib/appointmentService';
import { getStoredBranches, getStoredStaffUsers, DEFAULT_EGYPT_ORG } from '../../lib/storage';
import { AppointmentStatus } from '../../types/appointment';

interface ReceptionWaitingRoomProps {
  selectedBranchId?: string;
  onSelectPatient?: (patientId: string) => void;
}

export const ReceptionWaitingRoom: React.FC<ReceptionWaitingRoomProps> = ({
  selectedBranchId: externalBranchId,
  onSelectPatient,
}) => {
  const { session } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const branches = useMemo(() => getStoredBranches(), []);
  const staff = useMemo(() => getStoredStaffUsers(), []);
  const doctors = useMemo(() => staff.filter((s) => s.role_key === 'doctor'), [staff]);

  const [branchId, setBranchId] = useState<string>(() => {
    return externalBranchId || branches[0]?.id || '11111111-1111-1111-1111-111111111111';
  });

  useEffect(() => {
    if (externalBranchId) {
      setBranchId(externalBranchId);
    }
  }, [externalBranchId]);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'queue' | 'all' | 'arrived' | 'waiting' | 'with_doctor' | 'completed' | 'no_show'>('queue');

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  // Poll real-time updates every 15s
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Caller Context for RLS
  const callerContext = useMemo(() => {
    return {
      organizationId: session?.profile?.organization_id || DEFAULT_EGYPT_ORG.id,
      profileId: session?.profile?.id,
      roleKey: session?.profile?.role_key,
      assignedBranchIds: session?.profile && 'branch_id' in session.profile && session.profile.branch_id ? [(session.profile as any).branch_id] : undefined,
      isOrgWideManager: session?.profile?.role_key === 'center_manager',
    };
  }, [session]);

  // Load Queue Data via Engine
  const queueResult = useMemo(() => {
    return getAppointmentQueue(
      {
        branch_id: branchId === 'all' ? undefined : branchId,
        doctor_id: selectedDoctorId === 'all' ? undefined : selectedDoctorId,
        date: selectedDate,
        organization_id: callerContext.organizationId,
      },
      callerContext
    );
  }, [branchId, selectedDoctorId, selectedDate, callerContext, refreshKey]);

  const { summary, active_queue, all_today_appointments } = queueResult;

  // Filter items by search query
  const filteredActiveQueue = useMemo(() => {
    if (!searchQuery.trim()) return active_queue;
    const q = searchQuery.toLowerCase().trim();
    return active_queue.filter(
      (item) =>
        item.patient_name.toLowerCase().includes(q) ||
        item.patient_code.toLowerCase().includes(q) ||
        item.doctor_name.toLowerCase().includes(q)
    );
  }, [active_queue, searchQuery]);

  const filteredAllAppointments = useMemo(() => {
    let result = all_today_appointments;
    if (activeTab !== 'queue' && activeTab !== 'all') {
      result = result.filter((a) => a.status === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((a) => {
        const doc = doctors.find((d) => d.id === a.doctor_id);
        return (
          a.patient_id.toLowerCase().includes(q) ||
          (doc && doc.display_name.toLowerCase().includes(q)) ||
          a.id.toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [all_today_appointments, activeTab, searchQuery, doctors]);

  // Handle status update actions
  const handleStatusChange = (appointmentId: string, newStatus: AppointmentStatus) => {
    const res = updateAppointmentStatus(appointmentId, newStatus, undefined, callerContext);
    if (res.success) {
      refresh();
    } else {
      alert(res.error || 'Failed to update appointment status');
    }
  };

  return (
    <div className="space-y-6 text-slate-800 text-xs">
      {/* Top Controls & Summary Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isAr ? 'غرفة الانتظار وإدارة الطابور بالاستقبال' : 'Reception Waiting Room & Queue Manager'}
              </h2>
              <p className="text-xs text-slate-500">
                {isAr ? 'متابعة تدفق المرضى بالعيادة وتنسيق الاستدعاء الفوري للطبيب' : 'Real-time patient queue flow & doctor calling board'}
              </p>
            </div>
          </div>

          <button
            onClick={refresh}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isAr ? 'تحديث البيانات' : 'Refresh Queue'}</span>
          </button>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-teal-600" />
              <span>{isAr ? 'الفرع:' : 'Branch:'}</span>
            </label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-teal-500"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Stethoscope className="w-3 h-3 text-teal-600" />
              <span>{isAr ? 'الطبيب المعالج:' : 'Doctor:'}</span>
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
            >
              <option value="all">{isAr ? 'جميع الأطباء بالفرع' : 'All Branch Doctors'}</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.display_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-teal-600" />
              <span>{isAr ? 'التاريخ:' : 'Date:'}</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Search className="w-3 h-3 text-teal-600" />
              <span>{isAr ? 'بحث بالاسم أو الكود:' : 'Search Patient:'}</span>
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'اسم المريض أو كود PAT-...' : 'Patient name or code...'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
            />
          </div>
        </div>

        {/* Real-time Status Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 pt-2">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase">{isAr ? 'محجوز / مؤكد' : 'Confirmed'}</div>
            <div className="text-lg font-black text-slate-800">{summary.confirmed}</div>
          </div>

          <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-center">
            <div className="text-[10px] font-bold text-cyan-800 uppercase">{isAr ? 'وصل بالاستقبال' : 'Arrived'}</div>
            <div className="text-lg font-black text-cyan-900">{summary.arrived}</div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <div className="text-[10px] font-bold text-amber-800 uppercase">{isAr ? 'في الانتظار' : 'Waiting'}</div>
            <div className="text-lg font-black text-amber-900">{summary.waiting}</div>
          </div>

          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-center">
            <div className="text-[10px] font-bold text-teal-800 uppercase">{isAr ? 'داخل للعيادة' : 'With Doctor'}</div>
            <div className="text-lg font-black text-teal-900">{summary.with_doctor}</div>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <div className="text-[10px] font-bold text-emerald-800 uppercase">{isAr ? 'مكتمل' : 'Completed'}</div>
            <div className="text-lg font-black text-emerald-900">{summary.completed}</div>
          </div>

          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
            <div className="text-[10px] font-bold text-rose-800 uppercase">{isAr ? 'لم يحضر' : 'No-Show'}</div>
            <div className="text-lg font-black text-rose-900">{summary.no_show}</div>
          </div>

          <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl text-center">
            <div className="text-[10px] font-bold text-slate-600 uppercase">{isAr ? 'ملغي' : 'Cancelled'}</div>
            <div className="text-lg font-black text-slate-700">{summary.cancelled}</div>
          </div>
        </div>
      </div>

      {/* Main Content Tabs: Active Waiting Queue vs Detailed Status Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 p-2 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 font-bold rounded-xl flex items-center gap-2 transition-all ${
              activeTab === 'queue'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{isAr ? 'طابور الانتظار النشط اليوم' : 'Active Waiting Queue'}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
              {filteredActiveQueue.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 font-bold rounded-xl flex items-center gap-2 transition-all ${
              activeTab === 'all'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isAr ? 'كافة مواعيد اليوم' : 'All Appointments Today'}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-800 font-mono">
              {all_today_appointments.length}
            </span>
          </button>
        </div>

        {activeTab === 'queue' ? (
          /* Active Queue View */
          <div className="p-5 space-y-4">
            {filteredActiveQueue.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-slate-800">
                  {isAr ? 'لا يوجد مرضى بانتظار العيادة حالياً' : 'No patients currently waiting in queue'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isAr ? 'تصل المواعيد المسجلة تلقائياً لهذا الجدول عند تسجيل وصول المريض بالاستقبال أو عبر QR' : 'Checked-in patients automatically appear in this active queue board.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredActiveQueue.map((item) => {
                  const isWithDoctor = item.status === 'with_doctor';
                  const isWaiting = item.status === 'waiting';

                  return (
                    <div
                      key={item.appointment.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                        isWithDoctor
                          ? 'bg-gradient-to-br from-teal-900 to-slate-900 text-white border-teal-700 shadow-md'
                          : isWaiting
                          ? 'bg-amber-50/80 border-amber-300 text-slate-800 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <div>
                        {/* Header Badge */}
                        <div className="flex items-center justify-between border-b pb-2 mb-2 border-current/10">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2.5 py-1 rounded-lg font-mono font-black text-xs ${
                                isWithDoctor
                                  ? 'bg-teal-500 text-white'
                                  : 'bg-teal-800 text-white'
                              }`}
                            >
                              #{item.queue_position}
                            </span>
                            <span className="font-bold text-xs">
                              {isWithDoctor
                                ? isAr ? 'مع الطبيب الآن' : 'With Doctor'
                                : isWaiting
                                ? isAr ? 'في الانتظار' : 'Waiting Queue'
                                : isAr ? 'وصل للتو' : 'Arrived'}
                            </span>
                          </div>

                          {item.is_late && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500 text-white">
                              {isAr ? 'وصول متأخر' : 'Late Arrival'}
                            </span>
                          )}
                        </div>

                        {/* Patient Info */}
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm">
                            {item.patient_name}
                          </h4>
                          <div className={`text-[11px] font-mono ${isWithDoctor ? 'text-teal-200' : 'text-slate-500'}`}>
                            {item.patient_code} • {isAr ? 'الموعد:' : 'Scheduled:'} {item.scheduled_time}
                          </div>
                        </div>

                        {/* Doctor Info */}
                        <div className="mt-2 pt-2 border-t border-current/10 text-[11px] flex items-center justify-between">
                          <span className={isWithDoctor ? 'text-teal-200' : 'text-slate-500'}>
                            {isAr ? 'الطبيب:' : 'Doctor:'}
                          </span>
                          <span className="font-bold">{item.doctor_name}</span>
                        </div>

                        {/* Waiting Time Calculator */}
                        <div className="mt-1 text-[11px] flex items-center justify-between">
                          <span className={isWithDoctor ? 'text-teal-200' : 'text-slate-500'}>
                            {isAr ? 'مدة الانتظار:' : 'Wait Time:'}
                          </span>
                          <span className="font-mono font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-md">
                            {item.waiting_time_minutes} {isAr ? 'دقيقة' : 'mins'}
                          </span>
                        </div>
                      </div>

                      {/* Reception Action Buttons */}
                      <div className="pt-3 border-t border-current/10 flex flex-wrap gap-1.5">
                        {item.status !== 'waiting' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.appointment.id, 'waiting')}
                            className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] transition-colors"
                          >
                            {isAr ? 'وضع بالانتظار' : 'Move to Waiting'}
                          </button>
                        )}

                        {item.status !== 'with_doctor' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.appointment.id, 'with_doctor')}
                            className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-[11px] transition-colors flex items-center justify-center gap-1"
                          >
                            <Play className="w-3 h-3" />
                            <span>{isAr ? 'استدعاء للطبيب' : 'Call to Doctor'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.appointment.id, 'completed')}
                          className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] transition-colors"
                        >
                          {isAr ? 'إكمال' : 'Complete'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.appointment.id, 'no_show')}
                          className="py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-[11px] transition-colors"
                        >
                          {isAr ? 'لم يحضر' : 'No-Show'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Table View for All Appointments */
          <div className="p-5 overflow-x-auto">
            <table className="w-full text-start border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                  <th className="p-3 text-start">{isAr ? 'الموعد' : 'Time'}</th>
                  <th className="p-3 text-start">{isAr ? 'المريض' : 'Patient'}</th>
                  <th className="p-3 text-start">{isAr ? 'الطبيب' : 'Doctor'}</th>
                  <th className="p-3 text-start">{isAr ? 'نوع الخدمة' : 'Type'}</th>
                  <th className="p-3 text-start">{isAr ? 'الحالة الحالية' : 'Status'}</th>
                  <th className="p-3 text-start">{isAr ? 'وقت الوصول' : 'Check-in Time'}</th>
                  <th className="p-3 text-end">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAllAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-teal-800">{apt.start_time}</td>
                    <td className="p-3 font-bold text-slate-900">{apt.patient_id}</td>
                    <td className="p-3">{doctors.find((d) => d.id === apt.doctor_id)?.display_name || 'Dr.'}</td>
                    <td className="p-3 font-semibold">{apt.appointment_type || 'general'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        apt.status === 'confirmed' ? 'bg-slate-100 text-slate-800' :
                        apt.status === 'arrived' ? 'bg-cyan-100 text-cyan-800' :
                        apt.status === 'waiting' ? 'bg-amber-100 text-amber-800' :
                        apt.status === 'with_doctor' ? 'bg-teal-100 text-teal-800' :
                        apt.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        apt.status === 'no_show' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {apt.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-500">
                      {apt.check_in_time ? apt.check_in_time.split('T')[1]?.substring(0, 5) : '—'}
                    </td>
                    <td className="p-3 text-end space-x-1">
                      {apt.status !== 'arrived' && apt.status !== 'with_doctor' && apt.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(apt.id, 'arrived')}
                          className="px-2.5 py-1 bg-cyan-700 hover:bg-cyan-800 text-white font-bold rounded-lg"
                        >
                          {isAr ? 'وصل' : 'Arrived'}
                        </button>
                      )}
                      {apt.status !== 'waiting' && apt.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(apt.id, 'waiting')}
                          className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg"
                        >
                          {isAr ? 'انتظار' : 'Queue'}
                        </button>
                      )}
                      {apt.status !== 'with_doctor' && apt.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(apt.id, 'with_doctor')}
                          className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg"
                        >
                          {isAr ? 'استدعاء' : 'Call'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
