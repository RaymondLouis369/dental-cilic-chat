import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import {
  getDoctorDashboardSummary,
  getStoredDoctorTasks,
  updateDoctorTaskStatus,
} from '../../lib/clinicalStorage';
import { getStoredPatients } from '../../lib/patientStorage';
import {
  getStoredAppointments,
  getStoredServices,
  updateAppointmentStatus,
} from '../../lib/receptionAndBillingStorage';
import { Patient } from '../../types/patient';
import { Appointment } from '../../types/receptionAndBilling';
import {
  Calendar,
  Clock,
  UserCheck,
  Stethoscope,
  ListTodo,
  FileScan,
  Share2,
  FileSignature,
  CalendarClock,
  Search,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Play,
  Eye,
  Activity,
  ChevronRight,
} from 'lucide-react';

interface DoctorDashboardViewProps {
  onSelectPatient: (patientId: string, initialTab?: string) => void;
}

export const DoctorDashboardView: React.FC<DoctorDashboardViewProps> = ({
  onSelectPatient,
}) => {
  const { isRtl } = useLanguage();
  const { session } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  const doctorId = session?.profile.id || 'prof_doc_01';
  const branchId = session?.profile.branch_id || '11111111-1111-1111-1111-111111111111';

  const summary = getDoctorDashboardSummary(doctorId, branchId);
  const allPatients = getStoredPatients();
  const allServices = getStoredServices();
  const tasks = getStoredDoctorTasks().filter(
    (t) => t.doctor_id === doctorId || t.assigned_to_role === 'doctor'
  );

  const getPatientName = (p?: Patient) => {
    if (!p) return isRtl ? 'مريض غير محدد' : 'Unknown Patient';
    const name = [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');
    return name || (isRtl ? 'مريض غير محدد' : 'Unknown Patient');
  };

  const getPatientForAppointment = (apt: Appointment): Patient | undefined => {
    return allPatients.find((pt) => pt.id === apt.patient_id);
  };

  const getServiceNameForAppointment = (apt: Appointment): string => {
    const s = allServices.find((srv) => srv.id === apt.service_id);
    if (!s) return isRtl ? 'كشف واستشارة أسنان' : 'Dental Consultation';
    return isRtl ? s.name_ar : s.name_en;
  };

  const handleCallPatientToChair = (appointmentId?: string, patientId?: string) => {
    if (appointmentId && appointmentId !== 'apt_walk_in') {
      updateAppointmentStatus(appointmentId, 'with_doctor');
    }
    if (patientId) {
      onSelectPatient(patientId, 'notes');
    }
  };

  const handleCompleteTask = (taskId: string) => {
    updateDoctorTaskStatus(taskId, 'completed', session?.profile.id);
    setRefreshKey((k) => k + 1);
  };

  // Filter appointments
  const filteredAppointments = summary.todayAppointments.filter((apt) => {
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const p = getPatientForAppointment(apt);
      const name = getPatientName(p).toLowerCase();
      const code = (p?.patient_code || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    }
    return true;
  });

  const activeChairPatient = summary.currentPatient?.patient;
  const activeChairAppointment = summary.currentPatient?.appointment;

  return (
    <div className="space-y-6 pb-12" id="doctor-dashboard-view">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/80 border border-blue-400/30 flex items-center justify-center text-white shadow-inner">
            <Stethoscope className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">
              {isRtl ? 'لوحة تحكم الطبيب والعيادة السريرية' : 'Doctor Clinical Workspace Dashboard'}
            </h1>
            <p className="text-xs text-blue-200 mt-1">
              {isRtl
                ? `مرحباً د. ${session?.profile.display_name || 'أحمد الشناوي'} — إدارة الجلسات ومخططات الأسنان وقائمة الانتظار`
                : `Welcome Dr. ${session?.profile.display_name || 'Ahmed El-Shennawy'} — Manage chairs, dental charts, & clinical queue.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold bg-blue-950/80 px-3 py-1.5 rounded-lg border border-blue-800 text-blue-300">
            {new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Summary KPI Cards Grid (8 key doctor metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* 1. Today's Appointments */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold truncate">
              {isRtl ? 'مواعيد اليوم' : "Today's Appts"}
            </span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">
            {summary.stats?.today_appointments_count ?? summary.todayAppointments.length}
          </div>
        </div>

        {/* 2. Waiting Patients */}
        <div className="p-3.5 bg-white rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-bold truncate">
              {isRtl ? 'في الانتظار' : 'In Waiting'}
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-900 mt-2">
            {summary.stats?.waiting_patients_count ?? summary.waitingPatients.length}
          </div>
        </div>

        {/* 3. In Chair */}
        <div className="p-3.5 bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold truncate">
              {isRtl ? 'في الكرسي الآن' : 'In Chair'}
            </span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-900 mt-2">
            {summary.currentPatient ? 1 : 0}
          </div>
        </div>

        {/* 4. Pending Tasks */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold truncate">
              {isRtl ? 'مهام معلقة' : 'Pending Tasks'}
            </span>
            <ListTodo className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-purple-900 mt-2">
            {summary.stats?.pending_tasks_count ?? summary.pendingTasks.length}
          </div>
        </div>

        {/* 5. Investigations */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold truncate">
              {isRtl ? 'أشعة وفحوصات' : 'Investigations'}
            </span>
            <FileScan className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-xl font-black text-cyan-900 mt-2">
            {summary.stats?.pending_investigations_count ?? summary.pendingInvestigations.length}
          </div>
        </div>

        {/* 6. Referrals */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold truncate">
              {isRtl ? 'إحالات' : 'Referrals'}
            </span>
            <Share2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-900 mt-2">
            {summary.stats?.pending_referrals_count ?? summary.pendingReferrals.length}
          </div>
        </div>

        {/* 7. Pending Consents */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold truncate">
              {isRtl ? 'إقرارات مطلوبة' : 'Consents'}
            </span>
            <FileSignature className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-900 mt-2">
            {summary.stats?.pending_consents_count ?? summary.pendingConsents.length}
          </div>
        </div>

        {/* 8. Follow-ups Due */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold truncate">
              {isRtl ? 'متابعات مستحقة' : 'Follow-ups'}
            </span>
            <CalendarClock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-900 mt-2">
            {summary.stats?.follow_ups_due_count ?? summary.followUpsDue.length}
          </div>
        </div>
      </div>

      {/* Current Patient In-Chair Spotlight */}
      {activeChairPatient && (
        <div className="p-5 bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-2xl shadow-md border border-emerald-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-sm animate-pulse">
              ✓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-2 py-0.5 rounded">
                  {isRtl ? 'المريض الحالي بالعيادة (In Chair)' : 'Active In Chair'}
                </span>
                <span className="font-mono text-xs text-emerald-300 font-bold">
                  #{activeChairPatient.patient_code}
                </span>
              </div>
              <h3 className="text-lg font-black mt-1">
                {getPatientName(activeChairPatient)}
              </h3>
              <p className="text-xs text-emerald-200 mt-0.5">
                {activeChairAppointment
                  ? `${isRtl ? 'الخدمة: ' : 'Service: '}${getServiceNameForAppointment(activeChairAppointment)} • ${isRtl ? 'الوقت: ' : 'Time: '}${activeChairAppointment.start_time}`
                  : isRtl ? 'جلسة علاجية جارية' : 'Ongoing Clinical Session'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="open-active-patient-workspace-btn"
            onClick={() => onSelectPatient(activeChairPatient.id, 'notes')}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span>{isRtl ? 'فتح الملف السريري ومتابعة الجلسة' : 'Open Clinical Workspace'}</span>
            {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Waiting Room Queue */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">
              {isRtl ? 'قائمة انتظار المرضى بالعيادة (Waiting Queue)' : 'Waiting Patients Queue'}
            </h3>
          </div>
          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            {summary.waitingPatients.length} {isRtl ? 'مريض في الانتظار' : 'Patients Waiting'}
          </span>
        </div>

        {summary.waitingPatients.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-xs">
            {isRtl ? 'لا يوجد مرضى في غرفة الانتظار حالياً.' : 'No patients currently in waiting area.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.waitingPatients.map((wq, idx) => (
              <div
                key={wq.appointment?.id || wq.patient.id || `wait_${idx}`}
                className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col justify-between gap-3 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-slate-600">
                      #{wq.patient.patient_code}
                    </span>
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                      {wq.isWalkIn
                        ? isRtl ? `حضور مباشر ${wq.ticketNumber || ''}` : `Walk-In ${wq.ticketNumber || ''}`
                        : isRtl ? 'وصل العيادة' : 'Arrived'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1">
                    {getPatientName(wq.patient)}
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {wq.appointment
                      ? getServiceNameForAppointment(wq.appointment)
                      : isRtl ? 'استشارة عامة' : 'General Consultation'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-amber-200">
                  <span className="text-[11px] font-mono text-slate-500">
                    {wq.appointment
                      ? `${wq.appointment.start_time} - ${wq.appointment.end_time}`
                      : `${isRtl ? 'انتظار: ' : 'Wait: '}${wq.waitingMinutes} ${isRtl ? 'دقيقة' : 'min'}`}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCallPatientToChair(wq.appointment?.id || 'apt_walk_in', wq.patient.id)
                    }
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'استدعاء للكرسي' : 'Call to Chair'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Today's Appointments & Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Appointments List (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                {isRtl ? 'جدول مواعيد اليوم للطبيب' : "Today's Doctor Appointments"}
              </h3>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {['all', 'confirmed', 'arrived', 'with_doctor', 'completed'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    statusFilter === st
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'all'
                    ? isRtl ? 'الكل' : 'All'
                    : st === 'confirmed'
                    ? isRtl ? 'مؤكد' : 'Confirmed'
                    : st === 'arrived'
                    ? isRtl ? 'وصل' : 'Arrived'
                    : st === 'with_doctor'
                    ? isRtl ? 'بالجلسة' : 'In Session'
                    : isRtl ? 'مكتمل' : 'Completed'}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={
                isRtl ? 'بحث باسم المريض أو كود الملف السريري...' : 'Search by patient name or code...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          {/* Table */}
          {filteredAppointments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              {isRtl ? 'لا توجد مواعيد مطابقة لهذا الفلتر اليوم.' : 'No matching appointments today.'}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAppointments.map((apt) => {
                const pt = getPatientForAppointment(apt);
                const ptName = getPatientName(pt);
                const srvName = getServiceNameForAppointment(apt);

                return (
                  <div
                    key={apt.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 px-2 py-1 rounded">
                        {apt.start_time}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{ptName}</h4>
                          <span className="font-mono text-[10px] text-slate-400">
                            #{pt?.patient_code || 'PAT-000'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{srvName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          apt.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : apt.status === 'with_doctor'
                            ? 'bg-blue-100 text-blue-800'
                            : apt.status === 'arrived'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {apt.status}
                      </span>

                      <button
                        type="button"
                        id={`open-patient-file-${apt.patient_id}`}
                        onClick={() => onSelectPatient(apt.patient_id, 'chart')}
                        className="p-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-lg transition-all text-xs font-bold flex items-center gap-1"
                        title={isRtl ? 'فتح الملف السريري' : 'Open File'}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="text-[11px]">{isRtl ? 'الملف' : 'File'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Doctor Tasks & Follow-ups Column (1 Column) */}
        <div className="space-y-6">
          {/* Doctor Tasks */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {isRtl ? 'المهام السريرية المعلقة' : 'Clinical Tasks'}
                </h3>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                {tasks.filter((t) => t.status === 'pending').length}
              </span>
            </div>

            {tasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                {isRtl ? 'لا توجد مهام معلقة للطبيب.' : 'No pending tasks.'}
              </p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {tasks.map((tsk) => (
                  <div
                    key={tsk.id}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      tsk.status === 'completed'
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : 'bg-purple-50/40 border-purple-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-slate-900">{tsk.title}</h5>
                      {tsk.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => handleCompleteTask(tsk.id)}
                          className="text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-100 px-2 py-0.5 rounded"
                        >
                          ✓ {isRtl ? 'إنجاز' : 'Done'}
                        </button>
                      )}
                    </div>
                    {tsk.details && (
                      <p className="text-slate-600 text-[11px]">{tsk.details}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Due & Overdue Recalls */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {isRtl ? 'مواعيد المتابعة والاستدعاء المستحقة' : 'Due & Overdue Recalls'}
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                {summary.followUpsDue.length}
              </span>
            </div>

            {summary.followUpsDue.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                {isRtl ? 'لا توجد مواعيد متابعة مستحقة حالياً.' : 'No due follow-ups.'}
              </p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {summary.followUpsDue.map((fup) => {
                  const pt = allPatients.find((p) => p.id === fup.patient_id);
                  const ptName = getPatientName(pt);
                  return (
                    <div
                      key={fup.id}
                      className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/30 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-900 font-bold">{ptName}</strong>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          {fup.due_date}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{fup.reason}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400 capitalize">
                          {fup.recall_type ? fup.recall_type.replace('_', ' ') : 'General'}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectPatient(fup.patient_id, 'notes')}
                          className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline"
                        >
                          {isRtl ? 'عرض الملف' : 'View File'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Patient Switcher */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                {isRtl ? 'فتح أي ملف مريض سريري' : 'Quick Open Patient File'}
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              {isRtl
                ? 'اختر أي مريض للوصول المباشر لمخطط الأسنان والملاحظات'
                : 'Direct access to any patient dental chart.'}
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {allPatients.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPatient(p.id, 'chart')}
                  className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left flex items-center justify-between transition-all text-xs"
                >
                  <div>
                    <strong className="block text-slate-900">
                      {getPatientName(p)}
                    </strong>
                    <span className="text-[10px] text-slate-400 font-mono">
                      #{p.patient_code || 'PAT-000001'}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
