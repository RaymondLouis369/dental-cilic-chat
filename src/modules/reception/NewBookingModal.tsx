import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  User,
  Phone,
  Calendar,
  Clock,
  Check,
  AlertCircle,
  Stethoscope,
  Building2,
  FileText,
  CreditCard,
  Baby,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getStoredServices,
  getDoctorAvailableSlots,
  bookAppointment,
  resolvePricing,
  getStoredInsuranceCompanies,
  getStoredDoctorShifts,
} from '../../lib/receptionAndBillingStorage';
import { getStoredPatients } from '../../lib/patientStorage';
import { getStoredBranches, getStoredStaffUsers } from '../../lib/storage';
import { Service, PricingResolutionResult } from '../../types/receptionAndBilling';
import { Patient } from '../../types/patient';
import { Branch, StaffUser } from '../../types';

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewBookingModal: React.FC<NewBookingModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { session } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [mode, setMode] = useState<'existing' | 'new'>('existing');

  // Existing patient state
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientSearch, setPatientSearch] = useState<string>('');

  // New patient fields
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [nationalId, setNationalId] = useState('');

  // Booking details
  const [branchId, setBranchId] = useState<string>('');
  const [doctorId, setDoctorId] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>('');
  const [serviceId, setServiceId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Insurance / Pricing
  const [isInsurance, setIsInsurance] = useState<boolean>(false);
  const [insuranceCompanyId, setInsuranceCompanyId] = useState<string>('');
  const [pricePreview, setPricePreview] = useState<PricingResolutionResult | null>(null);

  // States & Errors
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Data sources
  const patients: Patient[] = useMemo(() => getStoredPatients(), []);
  const branches: Branch[] = useMemo(() => getStoredBranches(), []);
  const staff: StaffUser[] = useMemo(() => getStoredStaffUsers(), []);
  const services: Service[] = useMemo(() => getStoredServices().filter((s) => s.active ?? s.is_active), []);
  const insuranceCompanies = useMemo(() => getStoredInsuranceCompanies(), []);

  // Filter doctors
  const doctors = useMemo(
    () => staff.filter((s) => s.role_key === 'doctor' && (s.active ?? (s as any).is_active)),
    [staff]
  );

  // Default branch based on session
  useEffect(() => {
    if (!branchId && branches.length > 0) {
      if (session?.profile && 'branch_id' in session.profile && session.profile.branch_id) {
        setBranchId((session.profile as any).branch_id);
      } else {
        setBranchId(branches[0].id);
      }
    }
  }, [branches, session, branchId]);

  // Default doctor
  useEffect(() => {
    if (!doctorId && doctors.length > 0) {
      setDoctorId(doctors[0].id);
    }
  }, [doctors, doctorId]);

  // Default service
  useEffect(() => {
    if (!serviceId && services.length > 0) {
      setServiceId(services[0].id);
    }
  }, [services, serviceId]);

  // Filter patients by search
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients.slice(0, 15);
    const q = patientSearch.toLowerCase();
    return patients.filter((p) => {
      const name = `${p.first_name} ${p.middle_name || ''} ${p.last_name}`.toLowerCase();
      return (
        name.includes(q) ||
        p.patient_code.toLowerCase().includes(q) ||
        p.primary_mobile.includes(q)
      );
    });
  }, [patients, patientSearch]);

  // Calculate age & pediatric detection
  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId),
    [patients, selectedPatientId]
  );

  const effectiveDob = mode === 'existing' ? selectedPatient?.date_of_birth : dob;
  const isPediatric = useMemo(() => {
    if (!effectiveDob) return false;
    const birthYear = new Date(effectiveDob).getFullYear();
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear < 18;
  }, [effectiveDob]);

  // Load available time slots whenever doctor, branch, or date changes
  useEffect(() => {
    if (doctorId && branchId && bookingDate) {
      const slots = getDoctorAvailableSlots(doctorId, branchId, bookingDate);
      setAvailableSlots(slots);
      if (slots.length > 0) {
        setSelectedSlotTime(slots[0]);
      } else {
        setSelectedSlotTime('');
      }
    }
  }, [doctorId, branchId, bookingDate]);

  // Update dynamic price preview
  useEffect(() => {
    if (serviceId) {
      const patient =
        mode === 'existing'
          ? selectedPatient
          : {
              insurance_company_id: isInsurance ? insuranceCompanyId : undefined,
            };

      const pricing = resolvePricing({
        serviceId,
        patientInsuranceCompanyId: isInsurance ? insuranceCompanyId : undefined,
        patientInsurancePlanId: undefined,
      });

      setPricePreview(pricing);
    }
  }, [serviceId, mode, selectedPatient, isInsurance, insuranceCompanyId]);

  const handleBook = async () => {
    setError(null);
    if (!branchId) {
      setError(isAr ? 'برجاء اختيار الفرع' : 'Please select branch');
      return;
    }
    if (!doctorId) {
      setError(isAr ? 'برجاء اختيار الطبيب' : 'Please select doctor');
      return;
    }
    if (!serviceId) {
      setError(isAr ? 'برجاء اختيار الخدمة المطلوبة' : 'Please select service');
      return;
    }
    if (!selectedSlotTime) {
      setError(isAr ? 'لا توجد فترات زمنية متاحة للطبيب في هذا التاريخ' : 'No available slots for this date');
      return;
    }

    setLoading(true);

    try {
      const selectedService = services.find((s) => s.id === serviceId);
      const durationMinutes = selectedService ? (selectedService.default_duration_minutes || selectedService.duration_minutes || 30) : 30;

      // Calculate end time
      const [hours, minutes] = selectedSlotTime.split(':').map(Number);
      const startDateTime = new Date();
      startDateTime.setHours(hours, minutes, 0, 0);
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);
      const endTimeStr = `${String(endDateTime.getHours()).padStart(2, '0')}:${String(endDateTime.getMinutes()).padStart(2, '0')}`;

      const res = bookAppointment({
        isNewPatient: mode === 'new',
        existingPatientId: mode === 'existing' ? selectedPatientId : undefined,
        newPatientData:
          mode === 'new'
            ? {
                first_name: firstName,
                middle_name: middleName,
                last_name: lastName,
                mobile_primary: mobile,
                date_of_birth: dob,
                gender,
                national_id: nationalId || undefined,
              }
            : undefined,
        appointmentData: {
          organization_id: session?.profile.organization_id || 'org_dental_egy_01',
          branch_id: branchId,
          doctor_id: doctorId,
          service_id: serviceId,
          appointment_date: bookingDate,
          start_time: selectedSlotTime,
          end_time: endTimeStr,
          status: 'confirmed',
          notes,
          booked_by_staff_id: session?.profile.id || 'usr_staff_01',
        },
      });

      if (!res.success) {
        setError(res.error || (isAr ? 'فشل حجز الموعد' : 'Failed to book appointment'));
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-teal-700 to-emerald-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isAr ? 'حجز موعد طبي جديد' : 'Book New Dental Appointment'}
              </h2>
              <p className="text-xs text-teal-100">
                {isAr
                  ? 'مكتب الاستقبال — ربط المريض وجدول مواعيد الطبيب'
                  : 'Reception Desk — Connect Patient with Doctor Schedule'}
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

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'existing'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAr ? 'مريض مسجل بالمركز' : 'Existing Registered Patient'}
            </button>
            <button
              type="button"
              onClick={() => setMode('new')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'new'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAr ? 'مريض جديد (فتح ملف سريع)' : 'New Patient (Quick Registration)'}
            </button>
          </div>

          {/* Patient Selection or Quick Registration */}
          {mode === 'existing' ? (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-800">
                {isAr ? 'البحث عن المريض' : 'Search & Select Patient'}
              </label>
              <input
                type="text"
                placeholder={
                  isAr
                    ? 'ابحث بالاسم، كود المريض (PAT-...)، أو الموبايل...'
                    : 'Search by name, patient code (PAT-...), or mobile...'
                }
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />

              <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1">
                {filteredPatients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      selectedPatientId === p.id
                        ? 'bg-teal-50 border-teal-500 text-teal-900 font-bold'
                        : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div>
                      <span className="font-semibold">
                        {isAr ? p.full_name_ar : p.full_name_en}
                      </span>
                      <span className="text-[11px] text-slate-500 ms-2">
                        ({p.patient_code})
                      </span>
                    </div>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {p.mobile_primary}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-teal-800 flex items-center justify-between">
                <span>{isAr ? 'بيانات المريض الجديد' : 'New Patient Details'}</span>
                <span className="text-[11px] font-normal text-slate-500">
                  {isAr ? 'أرقام الموبايل المشتركة مدعومة' : 'Shared mobile numbers supported'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    {isAr ? 'الاسم الأول' : 'First Name'} *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    placeholder={isAr ? 'مثال: أحمد' : 'Ahmed'}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    {isAr ? 'اسم الأب' : 'Middle Name'} *
                  </label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    placeholder={isAr ? 'مثال: محمود' : 'Mahmoud'}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    {isAr ? 'اسم العائلة' : 'Last Name'} *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    placeholder={isAr ? 'مثال: خليل' : 'Khalil'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    {isAr ? 'رقم الموبايل (+20)' : 'Mobile (+20)'} *
                  </label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    placeholder="01012345678"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    {isAr ? 'تاريخ الميلاد' : 'Date of Birth'} *
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    {isAr ? 'النوع' : 'Gender'}
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="male">{isAr ? 'ذكر' : 'Male'}</option>
                    <option value="female">{isAr ? 'أنثى' : 'Female'}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Pediatric Notice */}
          {isPediatric && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-amber-800 text-xs">
              <Baby className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">
                  {isAr
                    ? 'المريض طفل (أقل من 18 عاماً):'
                    : 'Pediatric Patient (< 18 years):'}
                </span>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  {isAr
                    ? 'يوصى باختيار أخصائي طب أسنان الأطفال (مثل د. منى كمال) أو طبيب متاح لحالات الطوارئ.'
                    : 'Recommended to select Pediatric Dental Specialist (e.g. Dr. Mona Kamal) or available clinician.'}
                </p>
              </div>
            </div>
          )}

          {/* Appointment Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Branch */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                {isAr ? 'فرع العيادة' : 'Branch'}
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                {isAr ? 'طبيب الأسنان' : 'Doctor / Dentist'}
              </label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.display_name} {d.is_active ? '' : '(غير متاح)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                {isAr ? 'تاريخ الموعد' : 'Appointment Date'}
              </label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Available Time Slots */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                {isAr ? 'الفترة المتاحة (الفترات الحرة)' : 'Available Shift Slot'}
              </label>
              {availableSlots.length > 0 ? (
                <select
                  value={selectedSlotTime}
                  onChange={(e) => setSelectedSlotTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 font-mono"
                >
                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  {isAr
                    ? 'لا توجد فترات شاغرة لهذا الطبيب في هذا اليوم'
                    : 'No available slots on this day'}
                </div>
              )}
            </div>
          </div>

          {/* Service & Pricing */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-teal-600" />
                  {isAr ? 'الخدمة السنية المطلوبة' : 'Requested Dental Service'}
                </label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {isAr ? s.name_ar : s.name_en} ({s.default_duration_minutes || s.duration_minutes || 30} {isAr ? 'دقيقة' : 'mins'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-teal-600" />
                  {isAr ? 'طريقة التسعير' : 'Pricing Type'}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInsurance(false)}
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                      !isInsurance
                        ? 'bg-teal-600 text-white border-teal-600 font-bold'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {isAr ? 'نقدي (Cash)' : 'Cash'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInsurance(true)}
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                      isInsurance
                        ? 'bg-teal-600 text-white border-teal-600 font-bold'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {isAr ? 'تأمين (Insurance)' : 'Insurance'}
                  </button>
                </div>
              </div>
            </div>

            {isInsurance && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {isAr ? 'شركة التأمين' : 'Insurance Company'}
                </label>
                <select
                  value={insuranceCompanyId}
                  onChange={(e) => setInsuranceCompanyId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  <option value="">
                    {isAr ? '-- اختر شركة التأمين --' : '-- Select Insurance Company --'}
                  </option>
                  {insuranceCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {isAr ? c.name_ar : c.name_en}{' '}
                      {!c.is_contracted ? (isAr ? '(غير متعاقدة)' : '(Uncontracted)') : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Resolved Pricing Engine Output */}
            {pricePreview && (
              <div className="p-3 bg-white rounded-lg border border-teal-200 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">
                    {isAr ? 'التسعير المحدد نظامياً:' : 'Deterministic Pricing:'}
                  </span>
                  <p className="text-[11px] text-slate-500">{pricePreview.explanation}</p>
                </div>
                <div className="text-end">
                  <div className="text-base font-black text-teal-700">
                    {pricePreview.final_patient_price.toLocaleString('en-US')} ج.م
                  </div>
                  {pricePreview.applied_discount_percent ? (
                    <span className="text-[10px] text-emerald-600">
                      خصم {pricePreview.applied_discount_percent}%
                    </span>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              {isAr ? 'ملاحظات الاستقبال (اختياري)' : 'Reception Notes (Optional)'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isAr
                  ? 'أي شكوى أولية أو متطلبات خاصة بالموعد...'
                  : 'Chief complaint or special requirements...'
              }
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={loading || (mode === 'existing' && !selectedPatientId)}
            onClick={handleBook}
            className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
          >
            {loading ? (
              <span>{isAr ? 'جاري الحجز...' : 'Booking...'}</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isAr ? 'تأكيد وحفظ الموعد' : 'Confirm & Book Appointment'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
