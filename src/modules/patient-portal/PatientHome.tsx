import React, { useState, useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientAuth } from './PatientAuthContext';
import { calculateAge, getAgeGroup } from '../../types/patient';
import { getStoredFollowUpPlans } from '../../lib/clinicalStorage';
import { getStoredStaffUsers, getStoredBranches } from '../../lib/storage';
import { getStoredAppointments } from '../../lib/receptionAndBillingStorage';
import {
  cancelAppointment,
  checkInAppointment,
  generateAppointmentCheckInToken,
  getPatientQueuePosition,
  confirmAppointmentByPatient,
  sendAppointmentReminders,
} from '../../lib/appointmentService';
import { Appointment } from '../../types/appointment';
import { RecallType } from '../../types/clinical';
import { PatientAppointmentBookingModal } from './PatientAppointmentBookingModal';
import {
  QrCode,
  User,
  Users,
  Bell,
  Building2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MapPin,
  Calendar,
  Check,
  CalendarClock,
  Tag,
  Stethoscope,
  Clock,
  Plus,
  XCircle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface PatientHomeProps {
  onNavigate: (tab: 'profile' | 'digitalCard' | 'family' | 'notifications' | 'tickets' | 'aiChat' | 'settings' | 'finance') => void;
}

export const PatientHome: React.FC<PatientHomeProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { session, selectPatientContext } = usePatientAuth();

  const patient = session?.selectedPatient;
  const authPatient = session?.authenticatedPatient;

  const staff = useMemo(() => getStoredStaffUsers(), []);
  const branches = useMemo(() => getStoredBranches(), []);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // UI Modals state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedQrAppointment, setSelectedQrAppointment] = useState<Appointment | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshAppointments = () => setRefreshKey((k) => k + 1);

  // Fetch authorized upcoming and previous appointments for this patient
  const patientAppointments = useMemo(() => {
    if (!patient || !session?.organization) return { upcoming: [], previous: [] };
    const all = getStoredAppointments().filter(
      (a) => a.patient_id === patient.id && a.organization_id === session.organization.id
    );

    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const upcoming: Appointment[] = [];
    const previous: Appointment[] = [];

    all.forEach((apt) => {
      const aptDate = apt.appointment_date || apt.date || '';
      const isPast =
        aptDate < todayStr ||
        (aptDate === todayStr && (apt.end_time || apt.start_time) < currentTimeStr && apt.status !== 'confirmed' && apt.status !== 'arrived') ||
        apt.status === 'completed' ||
        apt.status === 'cancelled' ||
        apt.status === 'no_show';

      if (isPast) {
        previous.push(apt);
      } else {
        upcoming.push(apt);
      }
    });

    upcoming.sort((a, b) =>
      `${a.appointment_date || a.date} ${a.start_time}`.localeCompare(`${b.appointment_date || b.date} ${b.start_time}`)
    );
    previous.sort((a, b) =>
      `${b.appointment_date || b.date} ${b.start_time}`.localeCompare(`${a.appointment_date || a.date} ${a.start_time}`)
    );

    return { upcoming, previous };
  }, [patient?.id, session?.organization?.id, todayStr, refreshKey]);

  // Fetch upcoming/due follow-ups for this patient
  const upcomingFollowUps = useMemo(() => {
    if (!patient) return [];
    const all = getStoredFollowUpPlans();
    return all.filter((f) => {
      if (f.patient_id !== patient.id) return false;
      if (f.status === 'completed' || f.status === 'cancelled') return false;
      return true;
    }).sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [patient?.id, refreshKey]);

  if (!session || !patient || !authPatient) return null;

  const isWard = authPatient.id !== patient.id;
  const age = calculateAge(patient.date_of_birth);
  const ageGroup = getAgeGroup(patient.date_of_birth);
  const isRtl = language === 'ar';
  const ChevronIcon = isRtl ? ChevronLeft : ChevronRight;

  const recallLabels: Record<RecallType, { ar: string; en: string }> = {
    post_operative: { ar: 'متابعة بعد الجراحة', en: 'Post-Operative' },
    implant: { ar: 'زراعة الأسنان', en: 'Implant Check' },
    suture_removal: { ar: 'فك خياطة الجراحة', en: 'Suture Removal' },
    cleaning_hygiene: { ar: 'تنظيف وتلميع أسنان', en: 'Cleaning / Hygiene' },
    prosthetic: { ar: 'تجربة تركيبات الأسنان', en: 'Prosthetic Trial' },
    orthodontic: { ar: 'متابعة تقويم الأسنان', en: 'Orthodontic Follow-Up' },
    general_treatment: { ar: 'متابعة علاجية عامة', en: 'General Follow-Up' },
  };

  const handleConfirmAppointment = (aptId: string) => {
    const res = confirmAppointmentByPatient(aptId, {
      organizationId: session.organization.id,
      patientId: patient.id,
      isPatientPortal: true,
    });

    if (res.success) {
      alert(
        isRtl
          ? 'تم تأكيد موعدك بنجاح! تم إشعار الطبيب وفريق الاستقبال.'
          : 'Appointment confirmed! Doctor and reception notified.'
      );
      refreshAppointments();
    } else {
      alert(res.error || 'Failed to confirm appointment');
    }
  };

  const handleCancelAppointment = (aptId: string) => {
    const reason = prompt(
      isRtl ? 'برجاء كتابة سبب إلغاء الموعد (اختياري):' : 'Please provide cancellation reason (optional):'
    );
    const res = cancelAppointment(aptId, reason || 'Cancelled by patient via portal', {
      organizationId: session.organization.id,
      patientId: patient.id,
      isPatientPortal: true,
    });

    if (res.success) {
      alert(isRtl ? 'تم إلغاء الموعد بنجاح.' : 'Appointment cancelled.');
      refreshAppointments();
    } else {
      alert(res.error || 'Failed to cancel appointment');
    }
  };

  const handleSelfCheckIn = (apt: Appointment) => {
    const res = checkInAppointment(apt.id, {
      organizationId: session.organization.id,
      patientId: patient.id,
      isPatientPortal: true,
    });

    if (res.success) {
      alert(
        isRtl
          ? 'تم تسجيل وصولك للعيادة بنجاح! تم إرسال إشعار لطبيبك ومكتب الاستقبال.'
          : 'Check-in confirmed! Reception & Doctor notified.'
      );
      refreshAppointments();
    } else {
      alert(res.error || 'Check-in failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-800 to-slate-900 text-white p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-400/30 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{session.organization.name}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t.patientPortal.welcome}، {patient.first_name}! 👋
          </h2>

          {isWard ? (
            <p className="text-sm text-teal-200 mt-2">
              {t.patientPortal.underGuardianship}:{' '}
              <span className="font-semibold text-white">
                {authPatient.first_name} {authPatient.last_name}
              </span>{' '}
              ({t.patientPortal.guardian})
            </p>
          ) : (
            <p className="text-sm text-teal-100/90 mt-2">
              {t.patientPortal.orgWideIdentityNote}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowBookingModal(true)}
              id="btn-banner-book-appointment"
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-900 font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isRtl ? 'حجز موعد جديد الآن' : 'Book New Appointment'}</span>
            </button>

            <div className="bg-slate-800/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs">
              <span className="text-slate-400 block text-[10px]">
                {t.patientPortal.patientCode}
              </span>
              <span className="font-mono font-bold text-teal-300">
                {patient.patient_code}
              </span>
            </div>

            <div className="bg-slate-800/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs">
              <span className="text-slate-400 block text-[10px]">
                {t.patientPortal.age}
              </span>
              <span className="font-semibold text-white">
                {age} {t.patientPortal.years}{' '}
                <span className="text-teal-300 font-normal">
                  ({ageGroup === 'child' ? t.patientPortal.childBadge : t.patientPortal.adultBadge})
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Linked Profiles Quick Switch Bar */}
      {session.availableProfiles.length > 1 && (
        <div className="bg-white rounded-xl border border-teal-200/80 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm">
                  {t.profileDropdown.linkedAccounts}
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  {session.availableProfiles.length} {t.profileDropdown.profileCount}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.profileDropdown.sharedMobileNotice}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {session.availableProfiles.map((p) => {
              const isSelected = p.id === patient.id;
              return (
                <button
                  key={p.id}
                  onClick={() => selectPatientContext(p.id)}
                  id={`home-switch-profile-${p.patient_code}`}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {p.first_name[0]}
                  </div>
                  <span>
                    {p.first_name} {p.last_name}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Authorized Appointments Section (Upcoming & Previous) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {isRtl ? 'مواعيد العيادة المجدولة' : 'Clinic Appointments'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isRtl
                  ? 'مواعيدك القادمة والسابقة وحالة تسجيل الوصول'
                  : 'Your upcoming & past visits at our center'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBookingModal(true)}
              id="btn-section-book-appointment"
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-2xs transition-all flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isRtl ? 'حجز موعد جديد' : 'Book Appointment'}</span>
            </button>

            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
              {patientAppointments.upcoming.length} {isRtl ? 'قادم' : 'Upcoming'}
            </span>
          </div>
        </div>

        {/* Upcoming appointments list */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            <span>{isRtl ? 'المواعيد القادمة' : 'Upcoming Appointments'}</span>
          </h4>

          {patientAppointments.upcoming.length === 0 ? (
            <div className="p-8 bg-slate-50 rounded-xl text-center space-y-2 text-slate-400 text-xs">
              <Calendar className="w-8 h-8 mx-auto text-slate-300" />
              <p>{isRtl ? 'لا توجد مواعيد قادمة مجدولة حالياً.' : 'No upcoming appointments scheduled.'}</p>
              <button
                type="button"
                onClick={() => setShowBookingModal(true)}
                className="px-3 py-1.5 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700"
              >
                + {isRtl ? 'احجز أول موعد الآن' : 'Book First Visit'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {patientAppointments.upcoming.map((apt) => {
                const doc = staff.find((s) => s.id === apt.doctor_id);
                const br = branches.find((b) => b.id === apt.branch_id);

                // Queue Position Calculation for Checked-in Patient
                const queueInfo = (apt.status === 'arrived' || apt.status === 'waiting' || apt.status === 'with_doctor')
                  ? getPatientQueuePosition(apt.id, {
                      organizationId: session.organization.id,
                      patientId: patient.id,
                      isPatientPortal: true,
                    })
                  : null;

                return (
                  <div
                    key={apt.id}
                    className="p-4 bg-teal-50/40 hover:bg-teal-50/80 border border-teal-200/80 rounded-2xl transition-all space-y-3"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-600 text-white capitalize">
                            {apt.appointment_type || 'general'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              apt.status === 'arrived'
                                ? 'bg-cyan-600 text-white'
                                : apt.status === 'waiting'
                                ? 'bg-amber-600 text-white'
                                : apt.status === 'with_doctor'
                                ? 'bg-teal-700 text-white'
                                : 'bg-white text-teal-900 border border-teal-300'
                            }`}
                          >
                            {apt.status === 'arrived' ? (isRtl ? 'وصل للمركز' : 'Arrived') :
                             apt.status === 'waiting' ? (isRtl ? 'في الانتظار' : 'Waiting Queue') :
                             apt.status === 'with_doctor' ? (isRtl ? 'مع الطبيب الآن' : 'With Doctor') : apt.status}
                          </span>

                          {/* Confirmation Status Tag */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              apt.confirmation_status === 'patient_confirmed' || apt.confirmation_status === 'reception_confirmed'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {apt.confirmation_status === 'patient_confirmed'
                              ? (isRtl ? 'مؤكد من المريض ✓' : 'Patient Confirmed ✓')
                              : apt.confirmation_status === 'reception_confirmed'
                              ? (isRtl ? 'مؤكد من الاستقبال ✓' : 'Reception Confirmed ✓')
                              : (isRtl ? 'بانتظار التأكيد' : 'Pending Confirmation')}
                          </span>

                          {/* Reminder Status Tags */}
                          {apt.reminder_24h_sent_at && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              🔔 {isRtl ? 'تم إرسال تذكير 24 س' : '24h Reminder Sent'}
                            </span>
                          )}
                          {apt.reminder_sameday_sent_at && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                              🔔 {isRtl ? 'تم إرسال تذكير نفس اليوم' : 'Same-Day Reminder Sent'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                          <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
                          <span>{doc?.display_name || 'Dr. Assigned'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{isRtl ? br?.name_ar || br?.name_en : br?.name_en}</span>
                        </div>
                      </div>

                      <div className="flex flex-col md:items-end justify-between gap-2 border-t md:border-t-0 pt-2 md:pt-0 border-teal-100">
                        <div className="text-start md:text-end shrink-0">
                          <div className="text-xs font-bold text-teal-900 font-mono">
                            {apt.appointment_date || apt.date}
                          </div>
                          <div className="text-xs font-semibold text-slate-600 font-mono mt-0.5">
                            {apt.start_time} - {apt.end_time}
                          </div>
                        </div>

                        {/* Quick Appointment Actions for Patient */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Confirm Appointment Action */}
                          {apt.confirmation_status !== 'patient_confirmed' && apt.confirmation_status !== 'reception_confirmed' && (
                            <button
                              type="button"
                              onClick={() => handleConfirmAppointment(apt.id)}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isRtl ? 'تأكيد الحضور' : 'Confirm Visit'}</span>
                            </button>
                          )}

                          {/* Check-In / QR Token */}
                          {apt.status !== 'arrived' && apt.status !== 'waiting' && apt.status !== 'with_doctor' && (
                            <button
                              type="button"
                              onClick={() => handleSelfCheckIn(apt)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{isRtl ? 'تسجيل وصول' : 'Check-In'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedQrAppointment(apt)}
                            className="px-2.5 py-1 bg-teal-100 hover:bg-teal-200 text-teal-800 rounded-lg text-[11px] font-bold flex items-center gap-1"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>{isRtl ? 'رمز QR' : 'QR Token'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowBookingModal(true)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{isRtl ? 'إعادة جدولة' : 'Reschedule'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCancelAppointment(apt.id)}
                            className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-[11px] font-semibold"
                          >
                            ✕ {isRtl ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Live Waiting Queue Banner for Checked-in Patient */}
                    {queueInfo && queueInfo.allowed && (
                      <div className="p-3 bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-xl flex items-center justify-between gap-3 text-xs shadow-inner">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold font-mono text-sm">
                            #{queueInfo.position || 1}
                          </div>
                          <div>
                            <div className="font-bold text-teal-200">
                              {apt.status === 'with_doctor'
                                ? (isRtl ? 'تفضل بالدخول لطبيبك المعالج الآن! 🩺' : 'Your turn! Please enter clinic now.')
                                : isRtl
                                ? `ترتيبك الحالي في قائمة الانتظار: #${queueInfo.position}`
                                : `Queue Position: #${queueInfo.position}`}
                            </div>
                            <div className="text-[10px] text-slate-300">
                              {isRtl
                                ? `إجمالي المنتظرين: ${queueInfo.total_waiting} • تم إرسال إشعار للعيادة والاستقبال`
                                : `Total waiting: ${queueInfo.total_waiting} • Reception & doctor notified`}
                            </div>
                          </div>
                        </div>

                        <div className="text-end font-mono shrink-0">
                          <span className="px-2 py-1 rounded bg-teal-800 text-teal-100 font-bold text-[10px]">
                            {queueInfo.waiting_time_minutes} {isRtl ? 'دقيقة انتظار' : 'mins wait'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Previous appointments list */}
        {patientAppointments.previous.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              {isRtl ? 'المواعيد السابقة' : 'Previous Appointments'}
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {patientAppointments.previous.slice(0, 5).map((apt) => {
                const doc = staff.find((s) => s.id === apt.doctor_id);
                return (
                  <div
                    key={apt.id}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">
                        {doc?.display_name || 'Doctor'} •{' '}
                        <span className="capitalize text-slate-500">
                          {apt.appointment_type || 'general'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {apt.appointment_date || apt.date} ({apt.start_time})
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        apt.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : apt.status === 'cancelled'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Upcoming & Due Follow-Ups Section */}
      <div className="bg-white rounded-2xl border border-teal-200/90 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {isRtl ? 'مواعيد الاستدعاء والمتابعة القادمة' : 'Upcoming & Due Recalls'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isRtl ? 'المواعيد والمتابعات المحددة لك بواسطة طبيبك المعالج' : 'Scheduled follow-ups assigned by dentist'}
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
            {upcomingFollowUps.length} {isRtl ? 'متابعة' : 'Follow-up(s)'}
          </span>
        </div>

        {upcomingFollowUps.length === 0 ? (
          <div className="py-6 text-center text-slate-400 space-y-1">
            <Calendar className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-medium">
              {isRtl ? 'لا توجد مواعيد استدعاء أو متابعات قادمة مستحقة حالياً.' : 'No upcoming follow-ups scheduled at this time.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcomingFollowUps.map((fup) => {
              const doc = staff.find((s) => s.id === fup.doctor_id);
              const docName = doc ? doc.display_name : fup.doctor_id;
              const rLabel = recallLabels[fup.recall_type || 'general_treatment'];
              const isOverdue = fup.due_date <= todayStr;

              return (
                <div
                  key={fup.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isOverdue
                      ? 'bg-amber-50/60 border-amber-300'
                      : 'bg-slate-50/70 border-slate-200 hover:border-teal-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-200">
                        {isRtl ? rLabel.ar : rLabel.en}
                      </span>
                      {isOverdue ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                          {isRtl ? 'مستحق الآن' : 'Due Now'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">
                          {isRtl ? 'قادم' : 'Upcoming'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-bold text-slate-900">
                      {fup.reason}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Stethoscope className="w-3 h-3 text-slate-400" />
                        {docName}
                      </span>
                    </div>
                  </div>

                  <div className="text-start sm:text-end shrink-0">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1 sm:justify-end">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      <span>{fup.due_date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <PatientAppointmentBookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        onSuccess={() => refreshAppointments()}
      />

      {/* QR Code Modal for specific appointment */}
      {selectedQrAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-5 text-center space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-xs">
                {isRtl ? 'رمز QR لتسجيل الوصول' : 'Check-In QR Token'}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedQrAppointment(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 inline-block shadow-xs">
              <QrCode className="w-28 h-28 text-slate-900 mx-auto" />
            </div>

            <div className="font-mono text-xs font-bold text-teal-800 bg-teal-50 p-2 rounded-lg border border-teal-200">
              {generateAppointmentCheckInToken(selectedQrAppointment)}
            </div>

            <p className="text-[11px] text-slate-500">
              {isRtl
                ? 'امسح هذا الرمز بالاستقبال أو اضغط زر تسجيل الوصول الفوري عند تواجدك بالمقر.'
                : 'Show at reception desk or tap Check-In upon arrival.'}
            </p>

            <button
              type="button"
              onClick={() => {
                handleSelfCheckIn(selectedQrAppointment);
                setSelectedQrAppointment(null);
              }}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm"
            >
              {isRtl ? 'تسجيل الوصول الآن (Check-in)' : 'Check-In Now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
