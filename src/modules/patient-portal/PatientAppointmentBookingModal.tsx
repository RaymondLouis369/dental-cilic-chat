import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  Building2,
  Stethoscope,
  Check,
  AlertCircle,
  QrCode,
  User,
  Users,
  FileText,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Phone,
  RotateCcw,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientAuth } from './PatientAuthContext';
import {
  getStoredBranches,
  getStoredStaffUsers,
  DEFAULT_EGYPT_ORG,
} from '../../lib/storage';
import {
  getDoctorAvailableSlots,
  getStoredServices,
} from '../../lib/receptionAndBillingStorage';
import {
  createAppointment,
  checkAppointmentConflict,
  generateAppointmentCheckInToken,
  resolveAppointmentCheckInToken,
  checkInAppointment,
} from '../../lib/appointmentService';
import { getStoredTreatmentPlans } from '../../lib/clinicalStorage';
import { simulatePatientRLS } from '../../lib/patientStorage';
import { AppointmentType, Appointment } from '../../types/appointment';
import { Patient } from '../../types/patient';

interface PatientAppointmentBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialBranchId?: string;
  initialDoctorId?: string;
}

export const PatientAppointmentBookingModal: React.FC<PatientAppointmentBookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialBranchId,
  initialDoctorId,
}) => {
  const { language } = useLanguage();
  const { session } = usePatientAuth();
  const isAr = language === 'ar';

  const [step, setStep] = useState<'form' | 'confirmation'>('form');

  // Active caller patient & profiles
  const authPatient = session?.authenticatedPatient;
  const activePatient = session?.selectedPatient;
  const availableProfiles = session?.availableProfiles || [];

  // Form State
  const [targetPatientId, setTargetPatientId] = useState<string>(
    activePatient?.id || authPatient?.id || ''
  );
  const [branchId, setBranchId] = useState<string>('');
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('consultation');
  const [doctorId, setDoctorId] = useState<string>('first_available');
  const [bookingDate, setBookingDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>('');
  const [treatmentPlanId, setTreatmentPlanId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // States
  const [availableSlots, setAvailableSlots] = useState<{ slot: string; available: boolean }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null);

  // Sources
  const branches = useMemo(() => getStoredBranches(), []);
  const staff = useMemo(() => getStoredStaffUsers(), []);
  const doctors = useMemo(
    () => staff.filter((s) => s.role_key === 'doctor' && (s.active ?? (s as any).is_active ?? true)),
    [staff]
  );

  // Sync default branch
  useEffect(() => {
    if (initialBranchId) {
      setBranchId(initialBranchId);
    } else if (!branchId && branches.length > 0) {
      setBranchId(branches[0].id);
    }
  }, [branches, initialBranchId, branchId]);

  // Sync default doctor
  useEffect(() => {
    if (initialDoctorId) {
      setDoctorId(initialDoctorId);
    }
  }, [initialDoctorId]);

  // Sync target patient
  useEffect(() => {
    if (activePatient) {
      setTargetPatientId(activePatient.id);
    }
  }, [activePatient]);

  // Load available time slots from Phase 11.1 engine whenever doctor, branch, or date changes
  useEffect(() => {
    if (branchId && bookingDate) {
      const slotObjs = getDoctorAvailableSlots(doctorId, branchId, bookingDate);
      setAvailableSlots(slotObjs);
      const availables = slotObjs.filter((s) => s.available).map((s) => s.slot);
      if (availables.length > 0) {
        setSelectedSlotTime(availables[0]);
      } else {
        setSelectedSlotTime('');
      }
    }
  }, [doctorId, branchId, bookingDate]);

  // Filter treatment plans for target patient
  const targetTreatmentPlans = useMemo(() => {
    if (!targetPatientId) return [];
    return getStoredTreatmentPlans().filter(
      (tp) => tp.patient_id === targetPatientId && tp.status !== 'cancelled'
    );
  }, [targetPatientId]);

  if (!isOpen || !session) return null;

  const selectedPatientObj = availableProfiles.find((p) => p.id === targetPatientId) || activePatient;

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!targetPatientId) {
      setError(isAr ? 'برجاء اختيار المريض' : 'Please select target patient');
      return;
    }
    if (!branchId) {
      setError(isAr ? 'برجاء اختيار الفرع' : 'Please select clinic branch');
      return;
    }
    if (!selectedSlotTime) {
      setError(
        isAr
          ? 'لا توجد فترات زمنية متاحة في هذا التاريخ. برجاء اختيار تاريخ آخر.'
          : 'No available slots on this date. Please select another date.'
      );
      return;
    }

    setLoading(true);

    try {
      // 1. Verify Guardian/Patient Authorization RLS
      const rlsCheck = simulatePatientRLS(
        authPatient?.id || targetPatientId,
        targetPatientId,
        session.organization.id
      );

      if (!rlsCheck.allowed) {
        setError(rlsCheck.error || (isAr ? 'غير مصرح بحجز موعد لهذا المريض' : 'Unauthorized patient context'));
        setLoading(false);
        return;
      }

      // If "first_available" was selected, resolve the first doctor who has this slot free
      let finalDoctorId = doctorId;
      if (doctorId === 'first_available' || doctorId === 'any') {
        const freeDoc = doctors.find((d) => {
          const dSlots = getDoctorAvailableSlots(d.id, branchId, bookingDate);
          return dSlots.some((s) => s.slot === selectedSlotTime && s.available);
        });
        finalDoctorId = freeDoc ? freeDoc.id : doctors[0]?.id || 'prof_doc_01';
      }

      // 2. Server-side Revalidation immediately before save (prevents double booking)
      const conflictCheck = checkAppointmentConflict({
        doctorId: finalDoctorId,
        date: bookingDate,
        startTime: selectedSlotTime,
        endTime: undefined, // calculated inside
      });

      if (conflictCheck.has_conflict) {
        setError(
          isAr
            ? 'تم حجز هذه الفترة من قبل مريض آخر فوراً. برجاء اختيار فترة زمنية أخرى.'
            : 'Slot was just taken by another request. Please choose another time slot.'
        );
        // Refresh available slots
        const refreshed = getDoctorAvailableSlots(doctorId, branchId, bookingDate);
        setAvailableSlots(refreshed);
        setLoading(false);
        return;
      }

      // 3. Execute Appointment Creation via Engine
      const res = createAppointment(
        {
          organization_id: session.organization.id,
          branch_id: branchId,
          patient_id: targetPatientId,
          doctor_id: finalDoctorId,
          date: bookingDate,
          start_time: selectedSlotTime,
          appointment_type: appointmentType,
          treatment_plan_id: treatmentPlanId || undefined,
          notes,
        },
        {
          organizationId: session.organization.id,
          profileId: targetPatientId,
          patientId: targetPatientId,
          isPatientPortal: true,
        }
      );

      if (!res.success || !res.appointment) {
        setError(res.error || (isAr ? 'فشل حجز الموعد' : 'Failed to book appointment'));
        setLoading(false);
        return;
      }

      setCreatedAppointment(res.appointment);
      setStep('confirmation');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSelfCheckIn = () => {
    if (!createdAppointment) return;
    try {
      const res = checkInAppointment(createdAppointment.id, {
        organizationId: session.organization.id,
        patientId: targetPatientId,
        isPatientPortal: true,
      });

      if (res.success) {
        setCreatedAppointment((prev) => (prev ? { ...prev, status: 'arrived' } : null));
        alert(
          isAr
            ? 'تم تسجيل وصولك للعيادة بنجاح! تم تنبيه موظفي الاستقبال والطبيب المعالج.'
            : 'Check-in successful! Reception and doctor have been notified.'
        );
      }
    } catch (err: any) {
      alert(err.message || 'Check-in error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 to-emerald-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isAr ? 'حجز موعد طبي في العيادة' : 'Book Dental Appointment'}
              </h2>
              <p className="text-xs text-teal-100">
                {session.organization.name} — {isAr ? 'بوابة المرضى المباشرة' : 'Patient Portal Direct'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'form' ? (
          <form onSubmit={handleBookSubmit} className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Target Patient / Dependent Ward Picker */}
            {availableProfiles.length > 1 && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-teal-600" />
                  <span>{isAr ? 'حجز الموعد لحساب المريض:' : 'Book Appointment For:'}</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableProfiles.map((p) => {
                    const isSelected = targetPatientId === p.id;
                    const isSelf = p.id === authPatient?.id;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setTargetPatientId(p.id)}
                        className={`p-2.5 rounded-xl border text-start flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-600 font-bold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-800 hover:border-teal-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold">{p.first_name} {p.last_name}</div>
                          <div className={`text-[10px] ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                            {isSelf ? (isAr ? 'الحساب الرئيسي' : 'Self') : (isAr ? 'تابع / فرد أسرة' : 'Dependent')} ({p.patient_code})
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Branch Selection */}
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'فرع العيادة' : 'Clinic Branch'}</span>
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-teal-500"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Appointment Type & Treatment Plan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                  <span>{isAr ? 'نوع الموعد' : 'Appointment Type'}</span>
                </label>
                <select
                  value={appointmentType}
                  onChange={(e) => setAppointmentType(e.target.value as AppointmentType)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium"
                >
                  <option value="consultation">{isAr ? 'استشارة وكشف عام' : 'Consultation'}</option>
                  <option value="treatment">{isAr ? 'جلسة علاج أسنان' : 'Treatment'}</option>
                  <option value="follow_up">{isAr ? 'جلسة متابعة واستدعاء' : 'Follow-Up'}</option>
                  <option value="cleaning">{isAr ? 'تنظيف وتلميع أسنان' : 'Cleaning'}</option>
                  <option value="prosthetic">{isAr ? 'تركيبات وجسور' : 'Prosthetic'}</option>
                  <option value="orthodontic">{isAr ? 'شد وتقويم أسنان' : 'Orthodontic'}</option>
                  <option value="emergency">{isAr ? 'حالة طارئة (طوارئ)' : 'Emergency'}</option>
                  <option value="general">{isAr ? 'كشف عام' : 'General'}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-teal-600" />
                  <span>{isAr ? 'ربط بخطة علاجية (اختياري)' : 'Link Treatment Plan'}</span>
                </label>
                <select
                  value={treatmentPlanId}
                  onChange={(e) => setTreatmentPlanId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                >
                  <option value="">{isAr ? 'بدون ربط (خدمة مباشرة)' : 'Direct Visit / None'}</option>
                  {targetTreatmentPlans.map((tp) => (
                    <option key={tp.id} value={tp.id}>
                      {tp.title || 'Plan'} (#{tp.id.substring(0, 8)}) - {tp.status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Doctor Selection */}
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'اختيار الطبيب المعالج' : 'Doctor Selection'}</span>
              </label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium"
              >
                <option value="first_available">
                  ⚡ {isAr ? 'أول طبيب متاح (أسرع موعد)' : 'First Available Doctor (Fastest)'}
                </option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.display_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date & Time Slot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  <span>{isAr ? 'تاريخ الموعد' : 'Date'}</span>
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  <span>{isAr ? 'الفترة الزمنية المتاحة' : 'Available Time Slot'}</span>
                </label>

                {availableSlots.length === 0 ? (
                  <div className="p-2.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[11px]">
                    {isAr ? 'لا توجد مواعيد متاحة في هذا اليوم' : 'No open slots on this date'}
                  </div>
                ) : (
                  <select
                    value={selectedSlotTime}
                    onChange={(e) => setSelectedSlotTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-teal-800"
                  >
                    {availableSlots.map((s) => (
                      <option key={s.slot} value={s.slot} disabled={!s.available}>
                        {s.slot} {s.available ? (isAr ? '(متاح)' : '(Available)') : (isAr ? '(محجوز)' : '(Booked)')}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {isAr ? 'ملاحظات أو الشكوى الأولية (اختياري)' : 'Chief Complaint / Notes (Optional)'}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isAr ? 'اكتب الشكوى أو أي ملاحظات لطاقم الاستقبال...' : 'Any symptoms or special requests...'}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl font-semibold text-slate-700"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={loading || !selectedSlotTime}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                {loading ? (
                  <span>{isAr ? 'جاري التحقق والحجز...' : 'Verifying & Booking...'}</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{isAr ? 'تأكيد الحجز الفوري' : 'Confirm & Book Slot'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Confirmation View & Check-in QR Token */
          <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
              <div>
                <h3 className="font-bold text-emerald-900 text-sm">
                  {isAr ? 'تم تأكيد حجز الموعد بنجاح!' : 'Appointment Confirmed Successfully!'}
                </h3>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  {isAr
                    ? 'تم إرسال إشعار التأكيد للاستقبال وطبيب العيادة.'
                    : 'Confirmation notification dispatched to reception & dentist.'}
                </p>
              </div>
            </div>

            {createdAppointment && (
              <div className="space-y-3">
                {/* Appointment Detail Summary Card */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">{isAr ? 'المريض:' : 'Patient:'}</span>
                    <span className="font-bold text-slate-900">
                      {selectedPatientObj?.first_name} {selectedPatientObj?.last_name} ({selectedPatientObj?.patient_code})
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">{isAr ? 'التاريخ والوقت:' : 'Date & Time:'}</span>
                    <span className="font-mono font-bold text-teal-800">
                      {createdAppointment.appointment_date} ({createdAppointment.start_time} - {createdAppointment.end_time})
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">{isAr ? 'الفرع:' : 'Branch:'}</span>
                    <span className="font-bold text-slate-900">
                      {branches.find((b) => b.id === createdAppointment.branch_id)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">{isAr ? 'الطبيب:' : 'Doctor:'}</span>
                    <span className="font-bold text-slate-900">
                      {doctors.find((d) => d.id === createdAppointment.doctor_id)?.display_name || 'Dr. Assigned'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isAr ? 'حالة الموعد:' : 'Status:'}</span>
                    <span className="font-bold text-emerald-700 uppercase">
                      {createdAppointment.status}
                    </span>
                  </div>
                </div>

                {/* QR Check-in Token Card */}
                <div className="p-5 bg-gradient-to-br from-teal-900 to-slate-900 text-white rounded-2xl border border-teal-700 shadow-md text-center space-y-3">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-teal-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{isAr ? 'رمز تسجيل الوصول السريع الخالي من البيانات الحساسة' : 'Non-Sensitive Check-In QR Reference'}</span>
                  </div>

                  <div className="p-3 bg-white rounded-xl inline-block shadow-inner mx-auto">
                    <QrCode className="w-24 h-24 text-slate-900" />
                  </div>

                  <div className="font-mono text-sm font-black tracking-widest text-teal-300">
                    {generateAppointmentCheckInToken(createdAppointment)}
                  </div>

                  <p className="text-[11px] text-slate-300">
                    {isAr
                      ? 'امسح هذا الرمز عند وصولك للعيادة أو اضغط زر تسجيل الوصول الذاتي أدناه.'
                      : 'Show this code at reception or click Self Check-In upon arrival.'}
                  </p>

                  <button
                    type="button"
                    onClick={handleSelfCheckIn}
                    disabled={createdAppointment.status === 'arrived'}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {createdAppointment.status === 'arrived'
                        ? isAr ? 'تم تسجيل الوصول للعيادة بنجاح' : 'Already Checked-in'
                        : isAr ? 'تسجيل الوصول الآن (Check-in Now)' : 'Check-In Now (Self)'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-sm"
              >
                {isAr ? 'إغلاق وإكمال' : 'Close & Done'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
