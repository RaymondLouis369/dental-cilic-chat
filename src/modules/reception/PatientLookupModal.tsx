import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  QrCode,
  CheckCircle2,
  AlertCircle,
  User,
  Phone,
  Calendar,
  Shield,
  ArrowRight,
  Clock,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getStoredAppointments,
  updateAppointmentStatus,
  addWaitingListEntry,
} from '../../lib/receptionAndBillingStorage';
import { getStoredPatients } from '../../lib/patientStorage';
import { Patient } from '../../types/patient';
import { Appointment } from '../../types/receptionAndBilling';

interface PatientLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient?: (patientId: string) => void;
  onCheckinSuccess?: () => void;
}

export const PatientLookupModal: React.FC<PatientLookupModalProps> = ({
  isOpen,
  onClose,
  onSelectPatient,
  onCheckinSuccess,
}) => {
  const { session } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [activeMode, setActiveMode] = useState<'search' | 'qr'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [qrToken, setQrToken] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const patients = useMemo(() => getStoredPatients(), []);
  const appointments = useMemo(() => getStoredAppointments(), []);

  // Filter patients
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.trim().toLowerCase();
    return patients.filter(
      (p) =>
        p.full_name_ar.toLowerCase().includes(q) ||
        p.full_name_en.toLowerCase().includes(q) ||
        p.patient_code.toLowerCase().includes(q) ||
        p.mobile_primary.includes(q)
    );
  }, [patients, searchTerm]);

  // Today's appointments for selected patient
  const todayStr = new Date().toISOString().split('T')[0];
  const patientTodayAppointments = useMemo(() => {
    if (!selectedPatient) return [];
    return appointments.filter(
      (a) => a.patient_id === selectedPatient.id && a.appointment_date === todayStr
    );
  }, [appointments, selectedPatient, todayStr]);

  // Handle QR code validation
  const handleQrSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);

    const token = qrToken.trim();
    if (!token) return;

    // Search patient by qr_token or patient_code
    const match = patients.find(
      (p) => p.qr_token === token || p.patient_code.toLowerCase() === token.toLowerCase()
    );

    if (match) {
      setSelectedPatient(match);
      setActionMessage({
        type: 'success',
        text: isAr
          ? `تم التحقق من هوية المريض بنجاح: ${match.full_name_ar}`
          : `Patient verified: ${match.full_name_en}`,
      });
    } else {
      setActionMessage({
        type: 'error',
        text: isAr
          ? 'رمز الـ QR أو كود المريض غير صحيح أو غير مسجل بالنظام'
          : 'Invalid or unregistered QR code / Patient Code',
      });
    }
  };

  const handleCheckinAppointment = (aptId: string) => {
    const ok = updateAppointmentStatus(aptId, 'arrived');
    if (ok) {
      setActionMessage({
        type: 'success',
        text: isAr ? 'تم تسجيل وصول المريض بالاستقبال بنجاح!' : 'Patient marked as Arrived!',
      });
      if (onCheckinSuccess) onCheckinSuccess();
    }
  };

  const handleSendToWaitingList = () => {
    if (!selectedPatient) return;
    try {
      addWaitingListEntry({
        organization_id: selectedPatient.organization_id,
        branch_id: session?.profile.branch_id || 'branch_cairo_nasrcity',
        patient_id: selectedPatient.id,
        status: 'waiting',
        priority: 'normal',
        chief_complaint: isAr ? 'حضور بالاستقبال بدون موعد مسبق' : 'Walk-in without appointment',
      });
      setActionMessage({
        type: 'success',
        text: isAr ? 'تمت إضافة المريض لقائمة الانتظار بنجاح' : 'Patient added to waiting list',
      });
      if (onCheckinSuccess) onCheckinSuccess();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 to-cyan-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Search className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isAr ? 'البحث عن مريض وتسجيل الوصول (Check-in)' : 'Patient Lookup & Quick Check-in'}
              </h2>
              <p className="text-xs text-teal-100">
                {isAr ? 'بالاسم أو رقم الموبايل أو كود الـ QR' : 'Search by Name, Mobile, or QR Code'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {actionMessage && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 ${
                actionMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveMode('search');
                setActionMessage(null);
              }}
              className={`flex-1 py-1.5 font-bold rounded-lg flex items-center justify-center gap-1.5 ${
                activeMode === 'search'
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isAr ? 'بحث بالبيانات' : 'Data Search'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('qr');
                setActionMessage(null);
              }}
              className={`flex-1 py-1.5 font-bold rounded-lg flex items-center justify-center gap-1.5 ${
                activeMode === 'qr'
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{isAr ? 'مسح رمز QR / الكود السريع' : 'QR Scan / Fast Token'}</span>
            </button>
          </div>

          {activeMode === 'search' ? (
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    isAr
                      ? 'اكتب اسم المريض، كود المريض (PAT-...)، أو رقم الموبايل...'
                      : 'Type patient name, code (PAT-...), or mobile...'
                  }
                  className="w-full px-3 py-2 ps-9 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
              </div>

              {searchTerm.trim() && (
                <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {searchResults.length === 0 ? (
                    <div className="p-3 text-center text-slate-500">
                      {isAr ? 'لم يتم العثور على مريض بهذه البيانات' : 'No patients found'}
                    </div>
                  ) : (
                    searchResults.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPatient(p)}
                        className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${
                          selectedPatient?.id === p.id
                            ? 'bg-teal-50 border-teal-500 font-bold text-teal-900'
                            : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-900">
                            {isAr ? p.full_name_ar : p.full_name_en}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {p.patient_code} • {p.gender === 'male' ? (isAr ? 'ذكر' : 'Male') : (isAr ? 'أنثى' : 'Female')}
                          </div>
                        </div>
                        <span className="font-mono text-slate-600">{p.mobile_primary}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleQrSubmit} className="space-y-3">
              <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-xl text-center space-y-2">
                <QrCode className="w-12 h-12 text-teal-700 mx-auto" />
                <p className="text-slate-700">
                  {isAr
                    ? 'امسح بطاقة المريض الرقمية أو الصق رمز التحقق السريع:'
                    : 'Scan patient QR code or paste verification token:'}
                </p>
                <input
                  type="text"
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  placeholder="QR-DENTAL-EGY-... أو PAT-000001"
                  className="w-full px-3 py-2 text-center font-mono font-bold bg-white border border-teal-300 rounded-xl"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm"
                >
                  {isAr ? 'التحقق الفوري واستدعاء الملف' : 'Verify & Retrieve Profile'}
                </button>
              </div>
            </form>
          )}

          {/* Selected Patient Card & Actions */}
          {selectedPatient && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isAr ? selectedPatient.full_name_ar : selectedPatient.full_name_en}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600">
                    <span className="font-mono font-bold text-teal-700">
                      {selectedPatient.patient_code}
                    </span>
                    <span>•</span>
                    <span className="font-mono">{selectedPatient.mobile_primary}</span>
                    <span>•</span>
                    <span>
                      {isAr ? 'تاريخ الميلاد:' : 'DOB:'} {selectedPatient.date_of_birth}
                    </span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {selectedPatient.status === 'active' ? (isAr ? 'نشط' : 'Active') : selectedPatient.status}
                </span>
              </div>

              {/* Today's Appointments */}
              <div className="pt-2 border-t border-slate-200">
                <div className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                  <span>{isAr ? 'مواعيد المريض اليوم:' : "Today's Appointments:"}</span>
                  <span className="text-slate-500 font-normal">
                    {patientTodayAppointments.length} {isAr ? 'موعد' : 'appointment(s)'}
                  </span>
                </div>

                {patientTodayAppointments.length > 0 ? (
                  <div className="space-y-2">
                    {patientTodayAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">
                            {apt.start_time} - {apt.end_time}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {isAr ? 'الحالة الحالية:' : 'Status:'}{' '}
                            <span className="font-bold text-teal-700">{apt.status}</span>
                          </div>
                        </div>

                        {apt.status !== 'arrived' && apt.status !== 'with_doctor' && apt.status !== 'completed' ? (
                          <button
                            type="button"
                            onClick={() => handleCheckinAppointment(apt.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isAr ? 'تسجيل وصول (Arrived)' : 'Check-in (Arrived)'}</span>
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700">
                            {isAr ? 'تم تسجيل الوصول' : 'Already Checked-in'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 flex items-center justify-between">
                    <span>{isAr ? 'لا يوجد موعد محجوز مسبقاً لهذا المريض اليوم.' : 'No appointment today.'}</span>
                    <button
                      type="button"
                      onClick={handleSendToWaitingList}
                      className="px-2.5 py-1 bg-amber-700 text-white font-bold rounded-lg hover:bg-amber-800"
                    >
                      {isAr ? 'إرسال للانتظار' : 'Queue Walk-In'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 font-semibold"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
