import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  PhoneCall,
  Calendar,
  X,
  User,
  Stethoscope,
  Building2,
  Tag,
  RefreshCw,
  Plus,
  MessageSquare,
  ChevronRight,
  FileText,
  UserCheck,
  Ban,
  Check,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getStoredFollowUpPlans,
  updateFollowUpPlanStatus,
  rescheduleFollowUpPlan,
  recordFollowUpContactResult,
  createFollowUpPlan,
} from '../../lib/clinicalStorage';
import { getStoredPatients } from '../../lib/patientStorage';
import { getStoredStaffUsers, getStoredBranches } from '../../lib/storage';
import { FollowUpPlan, RecallType, FollowUpStatus } from '../../types/clinical';
import { Patient } from '../../types/patient';
import { StaffUser, Branch } from '../../types';

interface RecallFollowUpManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBranchId?: string;
  onFollowUpUpdated?: () => void;
}

export const RecallFollowUpManagementModal: React.FC<RecallFollowUpManagementModalProps> = ({
  isOpen,
  onClose,
  selectedBranchId = 'all',
  onFollowUpUpdated,
}) => {
  const { session } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => {
    setRefreshKey((k) => k + 1);
    if (onFollowUpUpdated) onFollowUpUpdated();
  };

  // Filters state
  const [activeTab, setActiveTab] = useState<'due_overdue' | 'all'>('due_overdue');
  const [searchQuery, setSearchQuery] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState(selectedBranchId);
  const [recallTypeFilter, setRecallTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Contact Result Modal state
  const [contactModalItem, setContactModalItem] = useState<FollowUpPlan | null>(null);
  const [contactResultText, setContactResultText] = useState('');
  const [nextStatus, setNextStatus] = useState<FollowUpStatus>('contacted');

  // Reschedule Modal state
  const [rescheduleModalItem, setRescheduleModalItem] = useState<FollowUpPlan | null>(null);
  const [newDueDate, setNewDueDate] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');

  // Create New FollowUp Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPatientId, setNewPatientId] = useState('');
  const [newDoctorId, setNewDoctorId] = useState('');
  const [newRecallType, setNewRecallType] = useState<RecallType>('cleaning_hygiene');
  const [newDueDateInput, setNewDueDateInput] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [newReason, setNewReason] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Data sources
  const patients: Patient[] = useMemo(() => getStoredPatients(), [refreshKey]);
  const staffUsers: StaffUser[] = useMemo(() => getStoredStaffUsers(), []);
  const branches: Branch[] = useMemo(() => getStoredBranches(), []);
  const doctors = useMemo(
    () => staffUsers.filter((u) => u.role_key === 'doctor' || u.role_key === 'dentist'),
    [staffUsers]
  );

  const rawPlans: FollowUpPlan[] = useMemo(() => getStoredFollowUpPlans(), [refreshKey]);

  // Enrich plans with patient & doctor info
  const enrichedPlans = useMemo(() => {
    return rawPlans.map((plan) => {
      const patient = patients.find((p) => p.id === plan.patient_id);
      const doctor = staffUsers.find((s) => s.id === plan.doctor_id);
      const branch = branches.find((b) => b.id === plan.branch_id);
      return {
        ...plan,
        patientName: patient ? `${patient.first_name} ${patient.last_name}` : plan.patient_id,
        patientCode: patient?.patient_code || '',
        patientMobile: patient?.mobile_number || '',
        doctorName: doctor ? (isAr ? doctor.full_name_ar : doctor.full_name_en) : plan.doctor_id,
        branchName: branch ? (isAr ? branch.name_ar : branch.name_en) : plan.branch_id,
      };
    });
  }, [rawPlans, patients, staffUsers, branches, isAr]);

  // Filtered List
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const filteredPlans = useMemo(() => {
    return enrichedPlans.filter((plan) => {
      // Organization scope
      if (session?.profile?.organization_id && plan.organization_id !== session.profile.organization_id) {
        return false;
      }
      // Branch filter
      if (branchFilter !== 'all' && plan.branch_id !== branchFilter) {
        return false;
      }
      // Doctor filter
      if (doctorFilter !== 'all' && plan.doctor_id !== doctorFilter) {
        return false;
      }
      // Recall type filter
      if (recallTypeFilter !== 'all' && plan.recall_type !== recallTypeFilter) {
        return false;
      }
      // Tab filter
      if (activeTab === 'due_overdue') {
        const isDueOrOverdue =
          plan.status === 'due' ||
          (plan.due_date <= todayStr && plan.status !== 'completed' && plan.status !== 'cancelled');
        if (!isDueOrOverdue) return false;
      }
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'due') {
          const isDue = plan.status === 'due' || (plan.due_date <= todayStr && (plan.status === 'scheduled' || plan.status === 'pending'));
          if (!isDue) return false;
        } else if (plan.status !== statusFilter) {
          return false;
        }
      }
      // Date range filter
      if (startDate && plan.due_date < startDate) return false;
      if (endDate && plan.due_date > endDate) return false;

      // Search query (patient name, code, phone, reason, notes)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          plan.patientName.toLowerCase().includes(q) ||
          plan.patientCode.toLowerCase().includes(q) ||
          plan.patientMobile.includes(q) ||
          plan.reason.toLowerCase().includes(q) ||
          plan.notes?.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [
    enrichedPlans,
    session?.profile?.organization_id,
    branchFilter,
    doctorFilter,
    recallTypeFilter,
    activeTab,
    statusFilter,
    todayStr,
    startDate,
    endDate,
    searchQuery,
  ]);

  // Counts
  const dueOverdueCount = useMemo(() => {
    return enrichedPlans.filter(
      (p) =>
        (branchFilter === 'all' || p.branch_id === branchFilter) &&
        (p.status === 'due' || (p.due_date <= todayStr && p.status !== 'completed' && p.status !== 'cancelled'))
    ).length;
  }, [enrichedPlans, branchFilter, todayStr]);

  if (!isOpen) return null;

  const recallTypeLabels: Record<RecallType, { ar: string; en: string; color: string }> = {
    post_operative: { ar: 'بعد الجراحة', en: 'Post-Op', color: 'bg-rose-100 text-rose-800 border-rose-200' },
    implant: { ar: 'زراعة الأسنان', en: 'Implant', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    suture_removal: { ar: 'فك الخياطة', en: 'Suture Removal', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    cleaning_hygiene: { ar: 'تنظيف وبصاق', en: 'Hygiene', color: 'bg-teal-100 text-teal-800 border-teal-200' },
    prosthetic: { ar: 'تركيبات', en: 'Prosthetic', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    orthodontic: { ar: 'تقويم', en: 'Orthodontic', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    general_treatment: { ar: 'علاج عام', en: 'General', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  };

  const statusBadges: Record<FollowUpStatus, { ar: string; en: string; class: string }> = {
    scheduled: { ar: 'مجدول', en: 'Scheduled', class: 'bg-blue-50 text-blue-700 border-blue-200' },
    due: { ar: 'مستحق الان', en: 'Due Now', class: 'bg-amber-100 text-amber-800 border-amber-300 font-bold animate-pulse' },
    contacted: { ar: 'تم التواصل', en: 'Contacted', class: 'bg-purple-50 text-purple-700 border-purple-200' },
    completed: { ar: 'مكتمل', en: 'Completed', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    missed: { ar: 'لم يحضر', en: 'Missed', class: 'bg-rose-50 text-rose-700 border-rose-200' },
    cancelled: { ar: 'ملغى', en: 'Cancelled', class: 'bg-slate-100 text-slate-600 border-slate-200' },
    pending: { ar: 'قيد الانتظار', en: 'Pending', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  };

  const handleRecordContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactModalItem) return;
    recordFollowUpContactResult(
      contactModalItem.id,
      contactResultText.trim(),
      session?.profile?.id,
      nextStatus
    );
    setContactModalItem(null);
    setContactResultText('');
    triggerRefresh();
  };

  const handleReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleModalItem || !newDueDate) return;
    rescheduleFollowUpPlan(
      rescheduleModalItem.id,
      newDueDate,
      rescheduleNotes.trim(),
      session?.profile?.id
    );
    setRescheduleModalItem(null);
    setNewDueDate('');
    setRescheduleNotes('');
    triggerRefresh();
  };

  const handleCreateFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientId || !newDoctorId || !newDueDateInput || !newReason.trim()) return;

    createFollowUpPlan({
      patientId: newPatientId,
      doctorId: newDoctorId,
      branchId: branchFilter !== 'all' ? branchFilter : session?.profile?.branch_id || '11111111-1111-1111-1111-111111111111',
      recallType: newRecallType,
      dueDate: newDueDateInput,
      interval: 'custom',
      reason: newReason,
      notes: newNotes,
      status: 'scheduled',
      organizationId: session?.profile?.organization_id,
    });

    setShowCreateModal(false);
    setNewPatientId('');
    setNewDoctorId('');
    setNewReason('');
    setNewNotes('');
    triggerRefresh();
  };

  const handleMarkComplete = (id: string) => {
    updateFollowUpPlanStatus(id, 'completed', undefined, session?.profile?.id);
    triggerRefresh();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-fadeIn">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-xs">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isAr ? 'إدارة المتابعات والاستدعاءات الطبية (Recall & Follow-Up)' : 'Recall & Follow-Up Management'}
              </h2>
              <p className="text-xs text-teal-200/90">
                {isAr
                  ? 'متابعة المرضى المستحقين للاستدعاء، تسجيل نتائج التواصل، وإعادة الجدولة'
                  : 'Track due patient recalls, log contact outcomes, and reschedule follow-ups.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              id="open-create-recall-modal-btn"
              className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'إنشاء استدعاء جديد' : 'New Recall'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters & Control Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          {/* Main View Tabs */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('due_overdue')}
                id="tab-due-overdue-recalls"
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'due_overdue'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>{isAr ? 'قائمة الاستدعاءات المستحقة' : 'Due & Overdue Recalls'}</span>
                {dueOverdueCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
                    {dueOverdueCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('all')}
                id="tab-all-recalls"
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'جميع المتابعات' : 'All Recalls'}</span>
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث باسم المريض، كود المريض، الهاتف، أو السبب...' : 'Search by patient name, code, mobile or reason...'}
                id="recall-search-input"
                className="w-full text-xs ps-9 pe-3 py-2 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
            {/* Branch Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                {isAr ? 'الفرع:' : 'Branch:'}
              </label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                id="recall-branch-filter"
                className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="all">{isAr ? 'جميع الفروع' : 'All Branches'}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {isAr ? b.name_ar : b.name_en}
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                {isAr ? 'الطبيب:' : 'Doctor:'}
              </label>
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                id="recall-doctor-filter"
                className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="all">{isAr ? 'جميع الأطباء' : 'All Doctors'}</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {isAr ? d.full_name_ar : d.full_name_en}
                  </option>
                ))}
              </select>
            </div>

            {/* Recall Type Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                {isAr ? 'نوع المتابعة:' : 'Recall Type:'}
              </label>
              <select
                value={recallTypeFilter}
                onChange={(e) => setRecallTypeFilter(e.target.value)}
                id="recall-type-filter"
                className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="all">{isAr ? 'جميع الأنواع' : 'All Types'}</option>
                <option value="post_operative">{isAr ? 'بعد الجراحة' : 'Post-Op'}</option>
                <option value="implant">{isAr ? 'زراعة الأسنان' : 'Implant'}</option>
                <option value="suture_removal">{isAr ? 'فك الخياطة' : 'Suture Removal'}</option>
                <option value="cleaning_hygiene">{isAr ? 'تنظيف وتنضيد' : 'Hygiene'}</option>
                <option value="prosthetic">{isAr ? 'تركيبات' : 'Prosthetic'}</option>
                <option value="orthodontic">{isAr ? 'تقويم' : 'Orthodontic'}</option>
                <option value="general_treatment">{isAr ? 'علاج عام' : 'General'}</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                {isAr ? 'الحالة:' : 'Status:'}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                id="recall-status-filter"
                className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
                <option value="due">{isAr ? 'مستحق الآن' : 'Due Now'}</option>
                <option value="scheduled">{isAr ? 'مجدول' : 'Scheduled'}</option>
                <option value="contacted">{isAr ? 'تم التواصل' : 'Contacted'}</option>
                <option value="completed">{isAr ? 'مكتمل' : 'Completed'}</option>
                <option value="missed">{isAr ? 'لم يحضر' : 'Missed'}</option>
                <option value="cancelled">{isAr ? 'ملغى' : 'Cancelled'}</option>
              </select>
            </div>

            {/* Date Range Picker */}
            <div className="flex items-center gap-1">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                  {isAr ? 'من:' : 'From:'}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-[11px] p-1 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                  {isAr ? 'إلى:' : 'To:'}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-[11px] p-1 rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recall Items List Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredPlans.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <CalendarClock className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-medium">
                {isAr ? 'لا توجد خطط متابعة أو استدعاءات مطابقة للفلاتر.' : 'No recall or follow-up plans match the selected filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPlans.map((plan) => {
                const isOverdue = plan.due_date <= todayStr && plan.status !== 'completed' && plan.status !== 'cancelled';
                const recallTypeConfig = recallTypeLabels[plan.recall_type || 'general_treatment'];
                const statusBadge = statusBadges[plan.status] || statusBadges.scheduled;

                return (
                  <div
                    key={plan.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isOverdue
                        ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-teal-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      {/* Left info */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Recall Type Badge */}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${recallTypeConfig.color}`}
                          >
                            {isAr ? recallTypeConfig.ar : recallTypeConfig.en}
                          </span>

                          {/* Status Badge */}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${statusBadge.class}`}
                          >
                            {isAr ? statusBadge.ar : statusBadge.en}
                          </span>

                          {/* Branch Badge */}
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {plan.branchName}
                          </span>
                        </div>

                        {/* Patient & Doctor Name */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <User className="w-4 h-4 text-teal-600" />
                            <span className="text-sm font-bold text-slate-900">
                              {plan.patientName}
                            </span>
                            {plan.patientCode && (
                              <span className="text-xs font-mono text-slate-400">
                                ({plan.patientCode})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                            <span>{plan.doctorName}</span>
                          </div>

                          {plan.patientMobile && (
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <PhoneCall className="w-3.5 h-3.5 text-teal-600" />
                              <span className="font-mono">{plan.patientMobile}</span>
                            </div>
                          )}
                        </div>

                        {/* Reason & Notes */}
                        <p className="text-xs font-medium text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="font-bold text-slate-900 me-1">
                            {isAr ? 'السبب:' : 'Reason:'}
                          </span>
                          {plan.reason}
                          {plan.notes && (
                            <span className="block text-[11px] text-slate-500 mt-1 italic">
                              {isAr ? 'ملاحظات:' : 'Notes:'} {plan.notes}
                            </span>
                          )}
                        </p>

                        {/* Contact Result if available */}
                        {plan.contact_result && (
                          <div className="text-xs text-purple-900 bg-purple-50 p-2 rounded-lg border border-purple-200 flex items-start gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold me-1">
                                {isAr ? 'نتيجة التواصل:' : 'Contact Result:'}
                              </span>
                              {plan.contact_result}
                              {plan.last_contacted_at && (
                                <span className="text-[10px] text-purple-600 block mt-0.5">
                                  {new Date(plan.last_contacted_at).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Date & Action Controls */}
                      <div className="flex flex-col items-end gap-2 shrink-0 w-full sm:w-auto">
                        <div className="text-end">
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1 justify-end">
                            <Calendar className="w-3.5 h-3.5 text-teal-600" />
                            <span>{plan.due_date}</span>
                          </div>
                          {isOverdue && (
                            <span className="text-[10px] font-bold text-rose-600 block">
                              {isAr ? '⚠️ تجاوز موعد الاستدعاء' : '⚠️ Overdue Recall'}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Record Contact Result */}
                          <button
                            onClick={() => {
                              setContactModalItem(plan);
                              setContactResultText(plan.contact_result || '');
                            }}
                            id={`record-contact-btn-${plan.id}`}
                            className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 flex items-center gap-1 transition-all"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>{isAr ? 'تسجيل نتيجة الاتصال' : 'Log Contact'}</span>
                          </button>

                          {/* Reschedule */}
                          <button
                            onClick={() => {
                              setRescheduleModalItem(plan);
                              setNewDueDate(plan.due_date);
                            }}
                            id={`reschedule-btn-${plan.id}`}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 flex items-center gap-1 transition-all"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>{isAr ? 'إعادة جدولة' : 'Reschedule'}</span>
                          </button>

                          {/* Mark Complete */}
                          {plan.status !== 'completed' && (
                            <button
                              onClick={() => handleMarkComplete(plan.id)}
                              id={`complete-btn-${plan.id}`}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs flex items-center gap-1 transition-all"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isAr ? 'إكمال' : 'Complete'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            {isAr
              ? `إجمالي الاستدعاءات المعروضة: ${filteredPlans.length}`
              : `Total Recalls Displayed: ${filteredPlans.length}`}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-900 transition-all"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>

      {/* Sub-Modal 1: Contact Result Modal */}
      {contactModalItem && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-purple-600" />
                <span>{isAr ? 'تسجيل نتيجة التواصل مع المريض' : 'Record Patient Contact Result'}</span>
              </h3>
              <button onClick={() => setContactModalItem(null)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <form onSubmit={handleRecordContact} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isAr ? 'نتيجة الاتصال والملاحظات:' : 'Contact Outcome & Notes:'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={contactResultText}
                  onChange={(e) => setContactResultText(e.target.value)}
                  placeholder={
                    isAr
                      ? 'مثال: تم التواصل هاتفياً ووافق المريض على الحضور بالموعد المحدد...'
                      : 'e.g. Spoke with patient on phone, confirmed attendance...'
                  }
                  id="contact-result-textarea"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 resize-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isAr ? 'تحديث حالة المتابعة إلى:' : 'Update Status To:'}
                </label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as FollowUpStatus)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 font-semibold"
                >
                  <option value="contacted">{isAr ? 'تم التواصل (Contacted)' : 'Contacted'}</option>
                  <option value="scheduled">{isAr ? 'مجدول ومؤكد (Scheduled)' : 'Scheduled'}</option>
                  <option value="completed">{isAr ? 'مكتمل بالكامل (Completed)' : 'Completed'}</option>
                  <option value="missed">{isAr ? 'لم يرد / لم يحضر (Missed)' : 'Missed'}</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setContactModalItem(null)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  id="save-contact-result-btn"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  {isAr ? 'حفظ النتيجة' : 'Save Outcome'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Modal 2: Reschedule Modal */}
      {rescheduleModalItem && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-600" />
                <span>{isAr ? 'إعادة جدولة موعد المتابعة' : 'Reschedule Follow-Up Date'}</span>
              </h3>
              <button onClick={() => setRescheduleModalItem(null)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <form onSubmit={handleReschedule} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isAr ? 'تاريخ المتابعة الجديد:' : 'New Due Date:'}
                </label>
                <input
                  type="date"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  id="reschedule-new-date-input"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isAr ? 'سبب أو ملاحظات إعادة الجدولة:' : 'Reschedule Reason/Notes:'}
                </label>
                <textarea
                  rows={2}
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  placeholder={isAr ? 'مثال: بناءً على طلب المريض للسفر...' : 'e.g. Patient requested delay due to travel...'}
                  id="reschedule-notes-textarea"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setRescheduleModalItem(null)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  id="save-reschedule-btn"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {isAr ? 'تأكيد إعادة الجدولة' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Modal 3: Create New Recall Follow-Up */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-teal-600" />
                <span>{isAr ? 'إنشاء استدعاء ومتابعة جديدة' : 'Create New Recall & Follow-Up'}</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <form onSubmit={handleCreateFollowUp} className="space-y-4 text-xs">
              {/* Select Patient */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isAr ? 'اختيار المريض:' : 'Select Patient:'}
                </label>
                <select
                  required
                  value={newPatientId}
                  onChange={(e) => setNewPatientId(e.target.value)}
                  id="new-recall-patient-select"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">{isAr ? '-- اختر المريض --' : '-- Select Patient --'}</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.patient_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Doctor */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isAr ? 'الطبيب المعالج:' : 'Attending Doctor:'}
                </label>
                <select
                  required
                  value={newDoctorId}
                  onChange={(e) => setNewDoctorId(e.target.value)}
                  id="new-recall-doctor-select"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">{isAr ? '-- اختر الطبيب --' : '-- Select Doctor --'}</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {isAr ? d.full_name_ar : d.full_name_en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recall Type */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isAr ? 'نوع المتابعة والاستدعاء:' : 'Recall Type:'}
                </label>
                <select
                  value={newRecallType}
                  onChange={(e) => setNewRecallType(e.target.value as RecallType)}
                  id="new-recall-type-select"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-semibold"
                >
                  <option value="post_operative">{isAr ? 'بعد الجراحة (Post-op)' : 'Post-operative'}</option>
                  <option value="implant">{isAr ? 'زراعة الأسنان (Implant)' : 'Implant'}</option>
                  <option value="suture_removal">{isAr ? 'فك الخياطة (Suture Removal)' : 'Suture Removal'}</option>
                  <option value="cleaning_hygiene">{isAr ? 'تنظيف وتنضيد اللثة (Cleaning/Hygiene)' : 'Cleaning/Hygiene'}</option>
                  <option value="prosthetic">{isAr ? 'تركيبات أسنان (Prosthetic)' : 'Prosthetic'}</option>
                  <option value="orthodontic">{isAr ? 'متابعة تقويم (Orthodontic)' : 'Orthodontic'}</option>
                  <option value="general_treatment">{isAr ? 'علاج عام (General)' : 'General Treatment'}</option>
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isAr ? 'تاريخ الاستحقاق المحدد:' : 'Due Date:'}
                </label>
                <input
                  type="date"
                  required
                  value={newDueDateInput}
                  onChange={(e) => setNewDueDateInput(e.target.value)}
                  id="new-recall-duedate-input"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isAr ? 'سبب وغرض الاستدعاء:' : 'Reason / Objective:'}
                </label>
                <input
                  type="text"
                  required
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder={isAr ? 'مثال: فحص التئام اللثة وفك الخيوط...' : 'e.g. Check healing and remove sutures...'}
                  id="new-recall-reason-input"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isAr ? 'ملاحظات وتوجيهات للاستقبال:' : 'Reception Notes:'}
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder={isAr ? 'ملاحظات إضافية...' : 'Additional instructions...'}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-bold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  id="submit-create-recall-btn"
                  className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-xs"
                >
                  {isAr ? 'حفظ وإنشاء المهمة' : 'Create Recall Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
