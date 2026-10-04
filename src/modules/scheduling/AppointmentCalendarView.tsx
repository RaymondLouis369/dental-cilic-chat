import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Stethoscope,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Coffee,
  RotateCcw,
  Sparkles,
  LayoutGrid,
  CalendarDays,
  ListFilter,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Appointment, AppointmentType, AppointmentStatus } from '../../types/appointment';
import { Branch, StaffUser } from '../../types';
import { Patient } from '../../types/patient';

interface AppointmentCalendarViewProps {
  appointments: Appointment[];
  patients: Patient[];
  doctors: StaffUser[];
  branches: Branch[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedBranchId: string;
  onSelectBranchId?: (branchId: string) => void;
  selectedDoctorId?: string;
  onSelectDoctorId?: (doctorId: string) => void;
  onStatusChange?: (appointmentId: string, newStatus: AppointmentStatus) => void;
  onRescheduleClick?: (appointment: Appointment) => void;
  onCancelClick?: (appointment: Appointment) => void;
  onNewBookingClick?: () => void;
}

export const AppointmentCalendarView: React.FC<AppointmentCalendarViewProps> = ({
  appointments,
  patients,
  doctors,
  branches,
  selectedDate,
  onSelectDate,
  selectedBranchId,
  onSelectBranchId,
  selectedDoctorId,
  onSelectDoctorId,
  onStatusChange,
  onRescheduleClick,
  onCancelClick,
  onNewBookingClick,
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [calendarViewMode, setCalendarViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Time slots for grid (08:00 to 20:00, 30 min intervals)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 8; hour <= 20; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  // Filter base appointments by branch, doctor, type, status
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (selectedBranchId !== 'all' && apt.branch_id !== selectedBranchId) return false;
      if (selectedDoctorId && selectedDoctorId !== 'all' && apt.doctor_id !== selectedDoctorId) return false;
      if (typeFilter !== 'all' && apt.appointment_type !== typeFilter) return false;
      if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
      return true;
    });
  }, [appointments, selectedBranchId, selectedDoctorId, typeFilter, statusFilter]);

  // Day appointments
  const dayAppointments = useMemo(() => {
    return filteredAppointments.filter((apt) => {
      const aptDate = apt.appointment_date || apt.date;
      return aptDate === selectedDate;
    });
  }, [filteredAppointments, selectedDate]);

  // Week days calculation (Sunday to Saturday)
  const weekDays = useMemo(() => {
    const current = new Date(selectedDate);
    const dayOfWeek = current.getDay(); // 0 = Sunday
    const sunday = new Date(current);
    sunday.setDate(current.getDate() - dayOfWeek);

    const days: { dateStr: string; dayNameAr: string; dayNameEn: string; dayNumber: number }[] = [];
    const arNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const enNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNameAr: arNames[i],
        dayNameEn: enNames[i],
        dayNumber: d.getDate(),
      });
    }
    return days;
  }, [selectedDate]);

  // Month grid calculation
  const monthDays = useMemo(() => {
    const [yearStr, monthStr] = selectedDate.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; // 0-indexed

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = lastDay.getDate();

    const grid: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDate = new Date(year, month - 1, prevMonthLastDay - i);
      grid.push({
        dateStr: pDate.toISOString().split('T')[0],
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const cDate = new Date(year, month, i);
      grid.push({
        dateStr: cDate.toISOString().split('T')[0],
        dayNumber: i,
        isCurrentMonth: true,
      });
    }

    // Next month padding to reach multiple of 7
    const remaining = 7 - (grid.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const nDate = new Date(year, month + 1, i);
        grid.push({
          dateStr: nDate.toISOString().split('T')[0],
          dayNumber: i,
          isCurrentMonth: false,
        });
      }
    }

    return grid;
  }, [selectedDate]);

  // Date Navigation
  const handlePrevPeriod = () => {
    const d = new Date(selectedDate);
    if (calendarViewMode === 'day') {
      d.setDate(d.getDate() - 1);
    } else if (calendarViewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    onSelectDate(d.toISOString().split('T')[0]);
  };

  const handleNextPeriod = () => {
    const d = new Date(selectedDate);
    if (calendarViewMode === 'day') {
      d.setDate(d.getDate() + 1);
    } else if (calendarViewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    onSelectDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    onSelectDate(new Date().toISOString().split('T')[0]);
  };

  // Appointment Type config
  const typeConfig: Record<AppointmentType, { label_ar: string; label_en: string; color: string }> = {
    consultation: { label_ar: 'استشارة', label_en: 'Consultation', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    treatment: { label_ar: 'علاج', label_en: 'Treatment', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    follow_up: { label_ar: 'متابعة', label_en: 'Follow-Up', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    cleaning: { label_ar: 'تنظيف', label_en: 'Cleaning', color: 'bg-teal-100 text-teal-800 border-teal-200' },
    prosthetic: { label_ar: 'تركيبات', label_en: 'Prosthetic', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    orthodontic: { label_ar: 'تقويم', label_en: 'Orthodontic', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    emergency: { label_ar: 'طوارئ', label_en: 'Emergency', color: 'bg-rose-100 text-rose-800 border-rose-200' },
    general: { label_ar: 'عام', label_en: 'General', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  };

  const statusConfig: Record<AppointmentStatus, { label_ar: string; label_en: string; bg: string }> = {
    confirmed: { label_ar: 'مؤكد', label_en: 'Confirmed', bg: 'bg-blue-500 text-white' },
    arrived: { label_ar: 'وصل', label_en: 'Arrived', bg: 'bg-teal-500 text-white' },
    waiting: { label_ar: 'بالانتظار', label_en: 'Waiting', bg: 'bg-amber-500 text-white' },
    with_doctor: { label_ar: 'مع الطبيب', label_en: 'With Doctor', bg: 'bg-purple-600 text-white' },
    completed: { label_ar: 'مكتمل', label_en: 'Completed', bg: 'bg-emerald-600 text-white' },
    cancelled: { label_ar: 'ملغي', label_en: 'Cancelled', bg: 'bg-rose-500 text-white' },
    no_show: { label_ar: 'لم يحضر', label_en: 'No-Show', bg: 'bg-slate-500 text-white' },
    rescheduled: { label_ar: 'مؤجل', label_en: 'Rescheduled', bg: 'bg-indigo-500 text-white' },
    late: { label_ar: 'متأخر', label_en: 'Late', bg: 'bg-orange-500 text-white' },
  };

  return (
    <div className="space-y-4">
      {/* Top Calendar Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevPeriod}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
            title={isAr ? 'الفترة السابقة' : 'Previous Period'}
          >
            <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
          </button>

          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            {isAr ? 'اليوم' : 'Today'}
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onSelectDate(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-2xs"
          />

          <button
            type="button"
            onClick={handleNextPeriod}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
            title={isAr ? 'الفترة التالية' : 'Next Period'}
          >
            <ChevronRight className="w-5 h-5 rtl:rotate-180" />
          </button>
        </div>

        {/* View Mode Switcher: Day, Week, Month */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setCalendarViewMode('day')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              calendarViewMode === 'day'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isAr ? 'يومي' : 'Day'}
          </button>
          <button
            type="button"
            onClick={() => setCalendarViewMode('week')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              calendarViewMode === 'week'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isAr ? 'أسبوعي' : 'Week'}
          </button>
          <button
            type="button"
            onClick={() => setCalendarViewMode('month')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              calendarViewMode === 'month'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isAr ? 'شهري' : 'Month'}
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Appointment Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-700"
          >
            <option value="all">{isAr ? 'كل أنواع المواعيد' : 'All Types'}</option>
            <option value="consultation">{isAr ? 'استشارة' : 'Consultation'}</option>
            <option value="treatment">{isAr ? 'علاج' : 'Treatment'}</option>
            <option value="follow_up">{isAr ? 'متابعة' : 'Follow-Up'}</option>
            <option value="cleaning">{isAr ? 'تنظيف' : 'Cleaning'}</option>
            <option value="prosthetic">{isAr ? 'تركيبات' : 'Prosthetic'}</option>
            <option value="orthodontic">{isAr ? 'تقويم' : 'Orthodontic'}</option>
            <option value="emergency">{isAr ? 'طوارئ' : 'Emergency'}</option>
            <option value="general">{isAr ? 'عام' : 'General'}</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-700"
          >
            <option value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
            <option value="confirmed">{isAr ? 'مؤكد' : 'Confirmed'}</option>
            <option value="arrived">{isAr ? 'وصل' : 'Arrived'}</option>
            <option value="waiting">{isAr ? 'في الانتظار' : 'Waiting'}</option>
            <option value="with_doctor">{isAr ? 'مع الطبيب' : 'With Doctor'}</option>
            <option value="completed">{isAr ? 'مكتمل' : 'Completed'}</option>
            <option value="cancelled">{isAr ? 'ملغي' : 'Cancelled'}</option>
            <option value="no_show">{isAr ? 'لم يحضر' : 'No-Show'}</option>
          </select>

          {onNewBookingClick && (
            <button
              type="button"
              onClick={onNewBookingClick}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-2xs transition-colors"
            >
              + {isAr ? 'موعد جديد' : 'New Appointment'}
            </button>
          )}
        </div>
      </div>

      {/* 1. DAY VIEW */}
      {calendarViewMode === 'day' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>{isAr ? `جدول مواعيد يوم ${selectedDate}` : `Schedule for ${selectedDate}`}</span>
            <span>{dayAppointments.length} {isAr ? 'موعد مسجل' : 'appointments scheduled'}</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {timeSlots.map((time) => {
              const matchingApts = dayAppointments.filter((a) => a.start_time === time);

              return (
                <div key={time} className="flex items-start min-h-[60px] hover:bg-slate-50/50 transition-colors">
                  {/* Time Column */}
                  <div className="w-20 sm:w-24 p-3 text-center border-r border-slate-100 font-mono text-xs font-bold text-slate-500 bg-slate-50/40 shrink-0">
                    {time}
                  </div>

                  {/* Slots / Appointments Area */}
                  <div className="flex-1 p-2 flex flex-wrap gap-2 items-center">
                    {matchingApts.length === 0 ? (
                      <span className="text-[11px] text-slate-300 select-none pl-2">
                        —
                      </span>
                    ) : (
                      matchingApts.map((apt) => {
                        const patient = patients.find((p) => p.id === apt.patient_id);
                        const doctor = doctors.find((d) => d.id === apt.doctor_id);
                        const typeInfo = typeConfig[apt.appointment_type || 'general'] || typeConfig.general;
                        const statusInfo = statusConfig[apt.status] || statusConfig.confirmed;

                        return (
                          <div
                            key={apt.id}
                            onClick={() => setSelectedAppointment(apt)}
                            className={`cursor-pointer p-3 rounded-xl border transition-all shadow-2xs hover:shadow-sm w-full sm:w-auto min-w-[260px] ${
                              apt.status === 'cancelled'
                                ? 'bg-rose-50/50 border-rose-200 opacity-60'
                                : 'bg-white border-slate-200 hover:border-teal-400'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${statusInfo.bg}`}>
                                {isAr ? statusInfo.label_ar : statusInfo.label_en}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeInfo.color}`}>
                                {isAr ? typeInfo.label_ar : typeInfo.label_en}
                              </span>
                            </div>

                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span>{patient ? `${patient.first_name} ${patient.last_name}` : '—'}</span>
                              <span className="text-[10px] font-mono text-slate-400 font-normal">
                                ({patient?.patient_code})
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-600 flex items-center gap-1.5 mt-1">
                              <Stethoscope className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{doctor?.display_name || 'Dr. Assigned'}</span>
                              <span className="text-slate-300">•</span>
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="font-mono">{apt.start_time} - {apt.end_time}</span>
                            </div>

                            {apt.notes && (
                              <p className="text-[10px] text-slate-500 mt-1.5 line-clamp-1 italic bg-slate-50 p-1 rounded">
                                {apt.notes}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. WEEK VIEW */}
      {calendarViewMode === 'week' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>
              {isAr
                ? `الأسبوع من ${weekDays[0].dateStr} إلى ${weekDays[6].dateStr}`
                : `Week of ${weekDays[0].dateStr} to ${weekDays[6].dateStr}`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse divide-slate-200">
            {weekDays.map((wDay) => {
              const isSelectedDay = wDay.dateStr === selectedDate;
              const wApts = filteredAppointments.filter(
                (a) => (a.appointment_date || a.date) === wDay.dateStr
              );

              return (
                <div
                  key={wDay.dateStr}
                  onClick={() => onSelectDate(wDay.dateStr)}
                  className={`p-3 min-h-[300px] flex flex-col transition-colors ${
                    isSelectedDay ? 'bg-teal-50/40' : 'hover:bg-slate-50/50'
                  }`}
                >
                  <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-slate-500">
                        {isAr ? wDay.dayNameAr : wDay.dayNameEn}
                      </div>
                      <div
                        className={`text-sm font-black font-mono ${
                          isSelectedDay ? 'text-teal-700' : 'text-slate-900'
                        }`}
                      >
                        {wDay.dayNumber}
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {wApts.length}
                    </span>
                  </div>

                  <div className="flex-1 mt-2 space-y-1.5 overflow-y-auto max-h-[400px]">
                    {wApts.length === 0 ? (
                      <div className="text-[10px] text-slate-300 italic pt-4 text-center">
                        {isAr ? 'لا توجد مواعيد' : 'No appointments'}
                      </div>
                    ) : (
                      wApts.map((apt) => {
                        const pat = patients.find((p) => p.id === apt.patient_id);
                        const statusInfo = statusConfig[apt.status] || statusConfig.confirmed;

                        return (
                          <div
                            key={apt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAppointment(apt);
                            }}
                            className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs hover:border-teal-400 cursor-pointer space-y-1 text-xs"
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="font-bold text-slate-800">{apt.start_time}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${statusInfo.bg}`}>
                                {isAr ? statusInfo.label_ar : statusInfo.label_en}
                              </span>
                            </div>
                            <div className="font-bold text-slate-900 truncate">
                              {pat ? `${pat.first_name} ${pat.last_name}` : 'Patient'}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. MONTH VIEW */}
      {calendarViewMode === 'month' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 font-bold">
            <span>
              {isAr
                ? `الشهر المحدد: ${selectedDate.substring(0, 7)}`
                : `Selected Month: ${selectedDate.substring(0, 7)}`}
            </span>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-200 text-center font-bold text-xs text-slate-600 bg-slate-100/70 py-2">
            <span>{isAr ? 'الأحد' : 'Sun'}</span>
            <span>{isAr ? 'الاثنين' : 'Mon'}</span>
            <span>{isAr ? 'الثلاثاء' : 'Tue'}</span>
            <span>{isAr ? 'الأربعاء' : 'Wed'}</span>
            <span>{isAr ? 'الخميس' : 'Thu'}</span>
            <span>{isAr ? 'الجمعة' : 'Fri'}</span>
            <span>{isAr ? 'السبت' : 'Sat'}</span>
          </div>

          <div className="grid grid-cols-7 divide-x rtl:divide-x-reverse divide-y divide-slate-200">
            {monthDays.map((mDay) => {
              const isSelectedDay = mDay.dateStr === selectedDate;
              const mApts = filteredAppointments.filter(
                (a) => (a.appointment_date || a.date) === mDay.dateStr
              );

              return (
                <div
                  key={mDay.dateStr}
                  onClick={() => {
                    onSelectDate(mDay.dateStr);
                    setCalendarViewMode('day');
                  }}
                  className={`min-h-[90px] p-2 flex flex-col justify-between cursor-pointer transition-colors ${
                    !mDay.isCurrentMonth
                      ? 'bg-slate-50/50 text-slate-300'
                      : isSelectedDay
                      ? 'bg-teal-50/60 font-bold'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold ${
                        isSelectedDay
                          ? 'w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center'
                          : mDay.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {mDay.dayNumber}
                    </span>

                    {mApts.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-teal-600 text-white font-bold text-[10px]">
                        {mApts.length}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 space-y-0.5 max-h-[50px] overflow-hidden">
                    {mApts.slice(0, 2).map((apt) => {
                      const pat = patients.find((p) => p.id === apt.patient_id);
                      return (
                        <div
                          key={apt.id}
                          className="text-[9px] truncate bg-white p-0.5 rounded border border-slate-200 text-slate-700"
                        >
                          {apt.start_time} - {pat ? pat.first_name : 'Patient'}
                        </div>
                      );
                    })}
                    {mApts.length > 2 && (
                      <div className="text-[9px] text-teal-700 font-bold">
                        +{mApts.length - 2} {isAr ? 'آخرين' : 'more'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Appointment Detail / Action Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {isAr ? 'تفاصيل الموعد وإجراءات الحالة' : 'Appointment Details & Actions'}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">{isAr ? 'المريض' : 'Patient'}</span>
                <span className="font-bold text-slate-900">
                  {patients.find((p) => p.id === selectedAppointment.patient_id)?.first_name}{' '}
                  {patients.find((p) => p.id === selectedAppointment.patient_id)?.last_name}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">{isAr ? 'الطبيب' : 'Doctor'}</span>
                <span className="font-bold text-slate-900">
                  {doctors.find((d) => d.id === selectedAppointment.doctor_id)?.display_name}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">{isAr ? 'التاريخ والوقت' : 'Date & Time'}</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedAppointment.appointment_date || selectedAppointment.date} ({selectedAppointment.start_time} - {selectedAppointment.end_time})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">{isAr ? 'نوع الموعد' : 'Type'}</span>
                <span className="font-bold text-teal-700 capitalize">
                  {selectedAppointment.appointment_type || 'general'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">{isAr ? 'الحالة الحالية' : 'Status'}</span>
                <span className="font-bold text-blue-700 capitalize">
                  {selectedAppointment.status}
                </span>
              </div>
              {selectedAppointment.notes && (
                <div className="py-1">
                  <span className="text-slate-500 block mb-0.5">{isAr ? 'ملاحظات' : 'Notes'}</span>
                  <p className="bg-slate-50 p-2 rounded text-slate-700 font-mono text-[11px]">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Status Change Buttons */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
              {onStatusChange && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onStatusChange(selectedAppointment.id, 'arrived');
                      setSelectedAppointment(null);
                    }}
                    className="px-2.5 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-bold"
                  >
                    ✓ {isAr ? 'تسجيل وصول' : 'Check-in'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onStatusChange(selectedAppointment.id, 'completed');
                      setSelectedAppointment(null);
                    }}
                    className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold"
                  >
                    ✓ {isAr ? 'اكتمال' : 'Complete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onStatusChange(selectedAppointment.id, 'no_show');
                      setSelectedAppointment(null);
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold"
                  >
                    ✕ {isAr ? 'لم يحضر' : 'No-Show'}
                  </button>
                </>
              )}

              {onRescheduleClick && (
                <button
                  type="button"
                  onClick={() => {
                    const apt = selectedAppointment;
                    setSelectedAppointment(null);
                    onRescheduleClick(apt);
                  }}
                  className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold"
                >
                  ↻ {isAr ? 'إعادة جدولة' : 'Reschedule'}
                </button>
              )}

              {onCancelClick && selectedAppointment.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={() => {
                    const apt = selectedAppointment;
                    setSelectedAppointment(null);
                    onCancelClick(apt);
                  }}
                  className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold"
                >
                  ✕ {isAr ? 'إلغاء الموعد' : 'Cancel'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
