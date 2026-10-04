import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Edit2,
  Check,
  AlertCircle,
  Stethoscope,
  Building2,
  Coffee,
  Power,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getStoredDoctorShifts,
  saveDoctorShift,
} from '../../lib/receptionAndBillingStorage';
import { getStoredBranches, getStoredStaffUsers, DEFAULT_EGYPT_ORG } from '../../lib/storage';
import {
  getDoctorWaitingQueue,
  callNextQueuePatient,
  updateAppointmentStatus,
} from '../../lib/appointmentService';
import { DoctorShift } from '../../types/receptionAndBilling';
import { Branch, StaffUser } from '../../types';

export const DoctorScheduleView: React.FC = () => {
  const { session } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  const shifts: DoctorShift[] = useMemo(() => getStoredDoctorShifts(), [refreshKey]);
  const branches: Branch[] = useMemo(() => getStoredBranches(), []);
  const staff: StaffUser[] = useMemo(() => getStoredStaffUsers(), []);

  const doctors = useMemo(
    () => staff.filter((s) => s.role_key === 'doctor'),
    [staff]
  );

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    if (session?.profile && 'branch_id' in session.profile && session.profile.branch_id) {
      return (session.profile as any).branch_id;
    }
    return branches[0]?.id || '11111111-1111-1111-1111-111111111111';
  });
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    doctors[0]?.id || ''
  );

  // Edit / Add shift modal state
  const [isEditing, setIsEditing] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [formDoctorId, setFormDoctorId] = useState<string>('');
  const [formBranchId, setFormBranchId] = useState<string>('');
  const [formDay, setFormDay] = useState<number>(0);
  const [formStartTime, setFormStartTime] = useState<string>('09:00');
  const [formEndTime, setFormEndTime] = useState<string>('17:00');
  const [formBreakStart, setFormBreakStart] = useState<string>('13:00');
  const [formBreakEnd, setFormBreakEnd] = useState<string>('14:00');
  const [formSlotDuration, setFormSlotDuration] = useState<number>(30);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const daysOfWeek = useMemo(
    () => [
      { num: 0, ar: 'الأحد', en: 'Sunday' },
      { num: 1, ar: 'الاثنين', en: 'Monday' },
      { num: 2, ar: 'الثلاثاء', en: 'Tuesday' },
      { num: 3, ar: 'الأربعاء', en: 'Wednesday' },
      { num: 4, ar: 'الخميس', en: 'Thursday' },
      { num: 5, ar: 'الجمعة', en: 'Friday' },
      { num: 6, ar: 'السبت', en: 'Saturday' },
    ],
    []
  );

  // Open modal for new shift
  const handleAddNew = () => {
    setEditingShiftId(null);
    setFormDoctorId(selectedDoctorId || doctors[0]?.id || '');
    setFormBranchId(selectedBranchId || branches[0]?.id || '');
    setFormDay(0);
    setFormStartTime('09:00');
    setFormEndTime('17:00');
    setFormBreakStart('13:00');
    setFormBreakEnd('14:00');
    setFormSlotDuration(30);
    setFormIsActive(true);
    setError(null);
    setIsEditing(true);
  };

  // Open modal to edit existing shift
  const handleEdit = (shift: DoctorShift) => {
    setEditingShiftId(shift.id);
    setFormDoctorId(shift.doctor_id);
    setFormBranchId(shift.branch_id);
    setFormDay(shift.day_of_week);
    setFormStartTime(shift.start_time);
    setFormEndTime(shift.end_time);
    setFormBreakStart(shift.break_start || shift.break_start_time || '');
    setFormBreakEnd(shift.break_end || shift.break_end_time || '');
    setFormSlotDuration(shift.slot_duration_minutes);
    setFormIsActive(shift.active !== undefined ? shift.active : (shift.is_active ?? true));
    setError(null);
    setIsEditing(true);
  };

  // Toggle active state inline
  const handleToggleActive = (shift: DoctorShift) => {
    const currentActive = shift.active !== undefined ? shift.active : (shift.is_active ?? true);
    saveDoctorShift({
      ...shift,
      active: !currentActive,
      is_active: !currentActive,
    });
    refresh();
  };

  // Save shift
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formStartTime >= formEndTime) {
      setError(isAr ? 'وقت نهاية المناوبة يجب أن يكون بعد وقت البداية' : 'End time must be after start time');
      return;
    }

    if (formBreakStart && formBreakEnd) {
      if (formBreakStart >= formBreakEnd) {
        setError(isAr ? 'نهاية فترة الراحة يجب أن تكون بعد بدايتها' : 'Break end must be after break start');
        return;
      }
    }

    try {
      saveDoctorShift({
        id: editingShiftId || undefined,
        organization_id: session?.profile.organization_id || 'org_dental_egy_01',
        branch_id: formBranchId,
        doctor_id: formDoctorId,
        day_of_week: formDay,
        start_time: formStartTime,
        end_time: formEndTime,
        break_start_time: formBreakStart || undefined,
        break_end_time: formBreakEnd || undefined,
        slot_duration_minutes: formSlotDuration,
        is_active: formIsActive,
      });

      setSuccessMsg(isAr ? 'تم حفظ جدول الطبيب بنجاح' : 'Shift saved successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
      setIsEditing(false);
      refresh();
    } catch (err: any) {
      setError(err.message || 'Error saving shift');
    }
  };

  // Doctor Caller Context
  const doctorCallerContext = useMemo(() => {
    return {
      organizationId: session?.profile?.organization_id || DEFAULT_EGYPT_ORG.id,
      profileId: session?.profile?.id || selectedDoctorId || doctors[0]?.id,
      roleKey: (session?.profile?.role_key || 'doctor') as any,
      assignedBranchIds: selectedBranchId !== 'all' ? [selectedBranchId] : undefined,
      isOrgWideManager: session?.profile?.role_key === 'center_manager',
    };
  }, [session, selectedDoctorId, doctors, selectedBranchId]);

  // Active Doctor Queue Data
  const doctorQueueData = useMemo(() => {
    return getDoctorWaitingQueue(doctorCallerContext, selectedBranchId === 'all' ? undefined : selectedBranchId);
  }, [doctorCallerContext, selectedBranchId, refreshKey]);

  const handleCallNext = () => {
    const res = callNextQueuePatient(doctorCallerContext, selectedBranchId === 'all' ? undefined : selectedBranchId);
    if (res.success) {
      setSuccessMsg(isAr ? 'تم استدعاء المريض التالي بنجاح!' : 'Next patient called successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
      refresh();
    } else {
      setError(res.error || (isAr ? 'لا يوجد مرضى بانتظار العيادة حالياً' : 'No waiting patients in queue'));
      setTimeout(() => setError(null), 3000);
    }
  };

  // Filtered shifts for grid view
  const visibleShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (selectedBranchId !== 'all' && s.branch_id !== selectedBranchId) return false;
      if (selectedDoctorId !== 'all' && s.doctor_id !== selectedDoctorId) return false;
      return true;
    });
  }, [shifts, selectedBranchId, selectedDoctorId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-teal-50 text-teal-700 rounded-xl">
              <Calendar className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {isAr ? 'جداول الأطباء ومناوبات العمل' : 'Doctor Shifts & Scheduling'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'تهيئة فترات العمل، أوقات الراحة، ومدة الكشوفات لكل فرع'
                  : 'Configure working hours, breaks, and slot durations per branch'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? 'إضافة فترة عمل جديدة' : 'Add Shift'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Active Doctor Waiting Queue Section */}
      <div className="bg-gradient-to-br from-teal-900 to-slate-900 text-white p-5 rounded-2xl border border-teal-700 shadow-md space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-teal-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center justify-center font-bold">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {isAr ? 'طابور المرضى النشط للطبيب اليوم' : 'Doctor Active Patient Waiting Queue'}
              </h3>
              <p className="text-[11px] text-teal-200">
                {isAr ? 'عرض المرضى في قائمة الانتظار الحالية واستدعاء الدخول للعيادة' : 'Live waiting queue for authorized branch'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCallNext}
            disabled={doctorQueueData.active_queue.length === 0}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Stethoscope className="w-4 h-4" />
            <span>{isAr ? '⚡ استدعاء المريض التالي بالطابور' : '⚡ Call Next Patient'}</span>
          </button>
        </div>

        {doctorQueueData.active_queue.length === 0 ? (
          <div className="p-4 bg-teal-950/40 rounded-xl border border-teal-800/50 text-center text-teal-200">
            {isAr ? 'لا يوجد مرضى في طابور الانتظار حالياً لهذه العيادة.' : 'No waiting patients in queue for this branch right now.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {doctorQueueData.active_queue.map((item) => (
              <div
                key={item.appointment.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 ${
                  item.status === 'with_doctor'
                    ? 'bg-teal-600 text-white border-teal-400 font-bold shadow-md'
                    : 'bg-teal-950/60 text-teal-100 border-teal-800'
                }`}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="px-2 py-0.5 rounded font-mono font-black text-[11px] bg-black/30">
                    #{item.queue_position}
                  </span>
                  <span className="font-bold text-[11px] uppercase">
                    {item.status === 'with_doctor'
                      ? isAr ? 'داخل بالعيادة' : 'With Doctor'
                      : isAr ? 'في الانتظار' : 'Waiting'}
                  </span>
                </div>

                <div>
                  <div className="font-bold text-sm text-white">{item.patient_name}</div>
                  <div className="text-[11px] text-teal-200 font-mono">
                    {item.patient_code} • {item.scheduled_time}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-teal-300 mt-1">
                    <span>{isAr ? 'انتظار:' : 'Wait:'} {item.waiting_time_minutes} {isAr ? 'دقيقة' : 'mins'}</span>
                    <span className={`px-1.5 py-0.5 rounded font-bold ${
                      item.appointment.confirmation_status === 'patient_confirmed' || item.appointment.confirmation_status === 'reception_confirmed'
                        ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                        : 'bg-amber-500/30 text-amber-200 border border-amber-400/30'
                    }`}>
                      {item.appointment.confirmation_status === 'patient_confirmed'
                        ? (isAr ? 'مؤكد (مريض)' : 'Confirmed (Patient)')
                        : item.appointment.confirmation_status === 'reception_confirmed'
                        ? (isAr ? 'مؤكد (استقبال)' : 'Confirmed (Reception)')
                        : (isAr ? 'غير مؤكد' : 'Unconfirmed')}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex gap-1">
                  {item.status !== 'with_doctor' && (
                    <button
                      type="button"
                      onClick={() => {
                        updateAppointmentStatus(item.appointment.id, 'with_doctor', undefined, doctorCallerContext);
                        refresh();
                      }}
                      className="flex-1 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-[10px]"
                    >
                      {isAr ? 'ادخل العيادة' : 'Call In'}
                    </button>
                  )}
                  {item.status === 'with_doctor' && (
                    <button
                      type="button"
                      onClick={() => {
                        updateAppointmentStatus(item.appointment.id, 'completed', undefined, doctorCallerContext);
                        refresh();
                      }}
                      className="flex-1 py-1 bg-white hover:bg-slate-100 text-teal-950 font-bold rounded-lg text-[10px]"
                    >
                      {isAr ? 'إكمال الزيارة' : 'Mark Completed'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs">
        <div>
          <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-teal-600" />
            <span>{isAr ? 'تصفية حسب الفرع' : 'Filter by Branch'}</span>
          </label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
          >
            <option value="all">{isAr ? 'جميع الفروع' : 'All Branches'}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.city})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
            <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
            <span>{isAr ? 'تصفية حسب الطبيب' : 'Filter by Doctor'}</span>
          </label>
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
          >
            <option value="all">{isAr ? 'جميع الأطباء' : 'All Doctors'}</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.display_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Visual Schedule Cards / Days Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleShifts.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-xs">
            <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p>{isAr ? 'لا توجد مناوبات عمل مسجلة لهذه التصفية' : 'No shifts found'}</p>
          </div>
        ) : (
          visibleShifts.map((shift) => {
            const doctor = staff.find((s) => s.id === shift.doctor_id);
            const branch = branches.find((b) => b.id === shift.branch_id);
            const dayName = daysOfWeek.find((d) => d.num === shift.day_of_week);

            return (
              <div
                key={shift.id}
                className={`p-5 rounded-2xl border transition-all text-xs flex flex-col justify-between ${
                  shift.is_active
                    ? 'bg-white border-slate-200 shadow-sm'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-teal-800">
                        {isAr ? dayName?.ar : dayName?.en}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm mt-2">
                        {doctor?.display_name || '—'}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {branch ? branch.name : '—'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(shift)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        shift.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-200 text-slate-600 border-slate-300'
                      }`}
                      title={isAr ? 'تفعيل / تعطيل' : 'Toggle active'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Timing details */}
                  <div className="mt-4 space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        <span>{isAr ? 'فترة العمل:' : 'Hours:'}</span>
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {shift.start_time} - {shift.end_time}
                      </span>
                    </div>

                    {shift.break_start_time && shift.break_end_time && (
                      <div className="flex items-center justify-between text-amber-800">
                        <span className="flex items-center gap-1">
                          <Coffee className="w-3.5 h-3.5 text-amber-600" />
                          <span>{isAr ? 'فترة الراحة:' : 'Break:'}</span>
                        </span>
                        <span className="font-mono font-bold">
                          {shift.break_start_time} - {shift.break_end_time}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-slate-600">
                      <span>{isAr ? 'مدة الكشف:' : 'Slot Duration:'}</span>
                      <span className="font-bold text-teal-700">
                        {shift.slot_duration_minutes} {isAr ? 'دقيقة' : 'mins'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(shift)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تعديل' : 'Edit'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit / Add Shift Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md my-8 overflow-hidden">
            <div className="bg-teal-700 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingShiftId
                  ? isAr
                    ? 'تعديل مناوبة الطبيب'
                    : 'Edit Doctor Shift'
                  : isAr
                  ? 'إضافة مناوبة عمل جديدة'
                  : 'Add Doctor Shift'}
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Doctor */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {isAr ? 'طبيب الأسنان' : 'Doctor'}
                </label>
                <select
                  value={formDoctorId}
                  onChange={(e) => setFormDoctorId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Branch */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {isAr ? 'فرع العيادة' : 'Branch'}
                </label>
                <select
                  value={formBranchId}
                  onChange={(e) => setFormBranchId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Day of Week */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {isAr ? 'يوم الأسبوع' : 'Day of Week'}
                </label>
                <select
                  value={formDay}
                  onChange={(e) => setFormDay(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                >
                  {daysOfWeek.map((d) => (
                    <option key={d.num} value={d.num}>
                      {isAr ? d.ar : d.en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start & End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {isAr ? 'بداية الدوام' : 'Start Time'}
                  </label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {isAr ? 'نهاية الدوام' : 'End Time'}
                  </label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Break Start & End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {isAr ? 'بداية الراحة' : 'Break Start'}
                  </label>
                  <input
                    type="time"
                    value={formBreakStart}
                    onChange={(e) => setFormBreakStart(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {isAr ? 'نهاية الراحة' : 'Break End'}
                  </label>
                  <input
                    type="time"
                    value={formBreakEnd}
                    onChange={(e) => setFormBreakEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Slot Duration */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {isAr ? 'مدة الكشف (بالدقائق)' : 'Slot Duration (Minutes)'}
                </label>
                <select
                  value={formSlotDuration}
                  onChange={(e) => setFormSlotDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                >
                  <option value={15}>15 {isAr ? 'دقيقة' : 'mins'}</option>
                  <option value={20}>20 {isAr ? 'دقيقة' : 'mins'}</option>
                  <option value={30}>30 {isAr ? 'دقيقة' : 'mins'}</option>
                  <option value={45}>45 {isAr ? 'دقيقة' : 'mins'}</option>
                  <option value={60}>60 {isAr ? 'دقيقة' : 'mins'}</option>
                </select>
              </div>

              {/* Active switch */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="shiftActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <label htmlFor="shiftActive" className="font-bold text-slate-800 cursor-pointer">
                  {isAr ? 'تفعيل هذه المناوبة' : 'Active Shift'}
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isAr ? 'حفظ المناوبة' : 'Save Shift'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
