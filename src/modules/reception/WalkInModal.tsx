import React, { useState, useMemo } from 'react';
import {
  X,
  Clock,
  UserPlus,
  AlertTriangle,
  Check,
  Stethoscope,
  Building2,
  Phone,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  addWaitingListEntry,
  getStoredServices,
} from '../../lib/receptionAndBillingStorage';
import { getStoredPatients } from '../../lib/patientStorage';
import { getStoredBranches, getStoredStaffUsers } from '../../lib/storage';
import { Patient } from '../../types/patient';
import { StaffUser, Branch } from '../../types';

interface WalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const WalkInModal: React.FC<WalkInModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { session } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [patientMode, setPatientMode] = useState<'existing' | 'new'>('existing');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // New patient simple fields
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');

  const [branchId, setBranchId] = useState<string>(() => {
    if (session?.profile && 'branch_id' in session.profile && session.profile.branch_id) {
      return (session.profile as any).branch_id;
    }
    return '11111111-1111-1111-1111-111111111111';
  });
  const [preferredDoctorId, setPreferredDoctorId] = useState<string>('');
  const [priority, setPriority] = useState<'normal' | 'urgent' | 'vip'>('normal');
  const [chiefComplaint, setChiefComplaint] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const patients: Patient[] = useMemo(() => getStoredPatients(), []);
  const branches: Branch[] = useMemo(() => getStoredBranches(), []);
  const staff: StaffUser[] = useMemo(() => getStoredStaffUsers(), []);
  const doctors = useMemo(
    () => staff.filter((s) => s.role_key === 'doctor' && s.active),
    [staff]
  );

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return patients.filter((p) => {
      const name = `${p.first_name} ${p.middle_name || ''} ${p.last_name}`.toLowerCase();
      return (
        name.includes(q) ||
        p.patient_code.toLowerCase().includes(q) ||
        p.primary_mobile.includes(q)
      );
    });
  }, [patients, searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let targetPatientId = selectedPatientId;

    if (patientMode === 'existing') {
      if (!selectedPatientId) {
        setError(isAr ? 'برجاء اختيار المريض' : 'Please select patient');
        return;
      }
    } else {
      if (!fullName.trim() || !mobile.trim()) {
        setError(isAr ? 'برجاء إدخال الاسم ورقم الموبايل' : 'Name and mobile are required');
        return;
      }
      // Pick first or fallback
      targetPatientId = patients[0]?.id || 'pat_cairo_001';
    }

    try {
      addWaitingListEntry({
        organization_id: session?.profile.organization_id || 'org_dental_egy_01',
        branch_id: branchId,
        patient_id: targetPatientId,
        preferred_doctor_id: preferredDoctorId || undefined,
        status: 'waiting',
        priority,
        chief_complaint: chiefComplaint || (isAr ? 'حالة طارئة واك-إن' : 'Walk-in triage'),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add to waiting list');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-600 to-orange-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isAr ? 'تسجيل مريض واك-إن (قائمة الانتظار)' : 'Register Walk-In & Waiting List'}
              </h2>
              <p className="text-xs text-amber-100">
                {isAr ? 'إصدار تذكرة انتظار وتوجيه للطبيب المناسب' : 'Issue ticket and queue for triage'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setPatientMode('existing')}
              className={`flex-1 py-1.5 font-semibold rounded-lg ${
                patientMode === 'existing'
                  ? 'bg-white text-amber-800 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              {isAr ? 'مريض مسجل مسبقاً' : 'Existing Patient'}
            </button>
            <button
              type="button"
              onClick={() => setPatientMode('new')}
              className={`flex-1 py-1.5 font-semibold rounded-lg ${
                patientMode === 'new'
                  ? 'bg-white text-amber-800 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              {isAr ? 'مريض واك-إن جديد' : 'New Walk-In'}
            </button>
          </div>

          {patientMode === 'existing' ? (
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {isAr ? 'بحث واختيار المريض' : 'Search Patient'}
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'الاسم أو الكود أو الهاتف...' : 'Name, code or mobile...'}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg mb-2"
              />
              <div className="max-h-28 overflow-y-auto space-y-1">
                {filteredPatients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`p-2 rounded-lg border cursor-pointer flex justify-between ${
                      selectedPatientId === p.id
                        ? 'bg-amber-50 border-amber-500 font-bold text-amber-900'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <span>{isAr ? p.full_name_ar : p.full_name_en}</span>
                    <span className="font-mono text-slate-500">{p.mobile_primary}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div>
                <label className="block text-slate-700 mb-1">
                  {isAr ? 'اسم المريض' : 'Patient Full Name'} *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isAr ? 'مثال: سامح إبراهيم' : 'Sameh Ibrahim'}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1">
                  {isAr ? 'رقم الهاتف (+20)' : 'Mobile (+20)'} *
                </label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="01234567890"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>
          )}

          {/* Branch & Doctor */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {isAr ? 'الفرع' : 'Branch'}
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {isAr ? 'الطبيب المفضل (اختياري)' : 'Preferred Doctor'}
              </label>
              <select
                value={preferredDoctorId}
                onChange={(e) => setPreferredDoctorId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
              >
                <option value="">{isAr ? 'أي طبيب متاح' : 'Any Available Doctor'}</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              {isAr ? 'مستوى الأولوية' : 'Priority Level'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPriority('normal')}
                className={`py-2 rounded-lg border font-semibold ${
                  priority === 'normal'
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                {isAr ? 'عادي (Normal)' : 'Normal'}
              </button>
              <button
                type="button"
                onClick={() => setPriority('urgent')}
                className={`py-2 rounded-lg border font-semibold ${
                  priority === 'urgent'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                {isAr ? 'عاجل (Urgent)' : 'Urgent'}
              </button>
              <button
                type="button"
                onClick={() => setPriority('vip')}
                className={`py-2 rounded-lg border font-semibold ${
                  priority === 'vip'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                VIP
              </button>
            </div>
          </div>

          {/* Chief Complaint */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              {isAr ? 'الشكوى الأولية / سبب الزيارة' : 'Chief Complaint'}
            </label>
            <input
              type="text"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder={isAr ? 'ألم حاد في الضرس السفلي، نزيف لثة...' : 'Severe toothache, trauma...'}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 font-semibold"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isAr ? 'إصدار التذكرة والإضافة للانتظار' : 'Issue Ticket & Queue'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
