import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  Stethoscope,
  Building2,
  User,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { Appointment, DoctorSlot } from '../../types/appointment';
import { Patient } from '../../types/patient';
import { StaffUser, Branch } from '../../types';
import { generateDoctorSlots, rescheduleAppointment } from '../../lib/appointmentService';

interface RescheduleAppointmentModalProps {
  isOpen: boolean;
  appointment: Appointment | null;
  patient?: Patient;
  doctor?: StaffUser;
  branch?: Branch;
  onClose: () => void;
  onSuccess: () => void;
}

export const RescheduleAppointmentModal: React.FC<RescheduleAppointmentModalProps> = ({
  isOpen,
  appointment,
  patient,
  doctor,
  branch,
  onClose,
  onSuccess,
}) => {
  const { language } = useLanguage();
  const { session } = useAuth();
  const isAr = language === 'ar';

  const [newDate, setNewDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize new date with tomorrow or next working day
  useEffect(() => {
    if (appointment) {
      setNewDate(appointment.appointment_date || appointment.date || new Date().toISOString().split('T')[0]);
      setSelectedSlot('');
      setReason('');
      setError(null);
    }
  }, [appointment]);

  // Generate slots for doctor on new date
  const slots: DoctorSlot[] = useMemo(() => {
    if (!appointment || !newDate) return [];
    return generateDoctorSlots(
      appointment.doctor_id,
      appointment.branch_id,
      newDate,
      appointment.duration_minutes || 30
    );
  }, [appointment, newDate]);

  const availableSlots = useMemo(() => {
    return slots.filter((s) => s.is_available);
  }, [slots]);

  useEffect(() => {
    if (availableSlots.length > 0 && !selectedSlot) {
      setSelectedSlot(availableSlots[0].start_time);
    }
  }, [availableSlots, selectedSlot]);

  if (!isOpen || !appointment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !selectedSlot) {
      setError(isAr ? 'برجاء اختيار التاريخ والفترة الزمنية' : 'Please select date and slot');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const slotObj = slots.find((s) => s.start_time === selectedSlot);
      const endTime = slotObj?.end_time;

      const result = rescheduleAppointment(
        {
          appointment_id: appointment.id,
          new_date: newDate,
          new_start_time: selectedSlot,
          new_end_time: endTime,
          reason: reason.trim() || undefined,
        },
        {
          organizationId: appointment.organization_id,
          profileId: session?.profile?.id,
          roleKey: session?.profile?.role_key,
          assignedBranchIds: (session?.profile as any)?.assignedBranchIds,
          isOrgWideManager: session?.profile?.role_key === 'center_manager',
        }
      );

      if (!result.success) {
        setError(result.error || (isAr ? 'فشل إعادة الجدولة' : 'Failed to reschedule appointment'));
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 to-slate-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-300" />
            <h3 className="font-bold text-sm">
              {isAr ? 'إعادة جدولة الموعد' : 'Reschedule Appointment'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Appointment Context Summary */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-medium">{isAr ? 'المريض:' : 'Patient:'}</span>
              <span className="font-bold text-slate-900">
                {patient ? `${patient.first_name} ${patient.last_name}` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-medium">{isAr ? 'الطبيب المعالج:' : 'Doctor:'}</span>
              <span className="font-bold text-teal-800">{doctor?.display_name || 'Dr. Assigned'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-medium">{isAr ? 'الموعد الحالي:' : 'Current Appointment:'}</span>
              <span className="font-mono text-slate-900 font-bold">
                {appointment.appointment_date || appointment.date} ({appointment.start_time} - {appointment.end_time})
              </span>
            </div>
          </div>

          {/* New Date Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {isAr ? 'تاريخ الموعد الجديد' : 'New Appointment Date'}
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value);
                setSelectedSlot('');
              }}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 outline-hidden"
              required
            />
          </div>

          {/* Available Slots */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {isAr ? 'الفترات المتاحة للطبيب' : 'Available Doctor Slots'}
            </label>

            {slots.length === 0 ? (
              <p className="p-3 text-center bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
                {isAr ? 'لا يوجد جدول عمل للطبيب في هذا اليوم' : 'Doctor has no working shift on this date'}
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                {slots.map((s) => (
                  <button
                    key={s.start_time}
                    type="button"
                    disabled={!s.is_available}
                    onClick={() => setSelectedSlot(s.start_time)}
                    className={`py-2 px-1 text-center font-mono rounded-lg border text-xs font-bold transition-all ${
                      selectedSlot === s.start_time
                        ? 'bg-teal-600 text-white border-teal-700 shadow-2xs'
                        : s.is_available
                        ? 'bg-white hover:bg-teal-50 border-slate-300 text-slate-800'
                        : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed line-through'
                    }`}
                    title={s.conflict_reason || (s.is_available ? 'Available' : 'Unavailable')}
                  >
                    {s.start_time}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {isAr ? 'سبب إعادة الجدولة (اختياري)' : 'Reschedule Reason (Optional)'}
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isAr ? 'مثلاً: طلب المريض تغيير الموعد' : 'e.g. Patient requested schedule change'}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 outline-hidden"
            />
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading || !selectedSlot}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs"
            >
              {loading ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'تأكيد الموعد الجديد' : 'Confirm New Schedule')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
