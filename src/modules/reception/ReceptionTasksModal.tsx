import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  User,
  Stethoscope,
  Phone,
  FileCheck,
  Calendar,
  Plus,
  ArrowRight,
  ClipboardList,
  ShieldCheck,
  Building2,
  FileSignature,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getStoredDoctorTasks,
  updateDoctorTaskStatus,
  createDoctorTask,
  getStoredConsentRequests,
  createConsentRequest,
} from '../../lib/clinicalStorage';
import { getStoredPatients } from '../../lib/patientStorage';
import { getStoredStaffUsers, getStoredBranches } from '../../lib/storage';
import { DoctorTask, DoctorTaskStatus, DoctorTaskType, ConsentRequest } from '../../types/clinical';
import { Patient } from '../../types/patient';
import { StaffUser } from '../../types';
import { ConsentSignModal } from '../clinical/ConsentSignModal';

interface ReceptionTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBranchId: string;
  onTaskUpdated?: () => void;
}

export const ReceptionTasksModal: React.FC<ReceptionTasksModalProps> = ({
  isOpen,
  onClose,
  selectedBranchId,
  onTaskUpdated,
}) => {
  const { session } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => {
    setRefreshKey((k) => k + 1);
    if (onTaskUpdated) onTaskUpdated();
  };

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create task inline state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPatientId, setNewPatientId] = useState('');
  const [newDoctorId, setNewDoctorId] = useState('');
  const [newTaskType, setNewTaskType] = useState<DoctorTaskType>('obtain_consent');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDetails, setNewTaskDetails] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'normal' | 'urgent'>('normal');

  // Consent sign modal state
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [selectedConsentToSign, setSelectedConsentToSign] = useState<ConsentRequest | null>(null);
  const [selectedTaskPatientName, setSelectedTaskPatientName] = useState<string>('');

  const handleOpenConsentSign = (task: DoctorTask) => {
    const patients = getStoredPatients();
    const patient = patients.find((p) => p.id === task.patient_id);
    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : '';
    setSelectedTaskPatientName(patientName);

    const consents = getStoredConsentRequests();
    let target = consents.find(
      (c) => c.reception_task_id === task.id || (c.patient_id === task.patient_id && (c.status === 'requested' || c.status === 'pending_signature'))
    );

    if (!target) {
      const newConsentRes = createConsentRequest({
        patientId: task.patient_id,
        doctorId: task.doctor_id || 'doc_001',
        consentType: 'treatment_plan_agreement',
        title: task.title || (isAr ? 'إقرار طبي مستنير' : 'Informed Medical Consent'),
        descriptionAr: task.details || 'الإقرار بالطريقة العلاجية والموافقة المستنيرة على خطة العلاج',
        descriptionEn: task.details || 'Informed consent agreement for clinical procedure',
        organizationId: task.organization_id,
      });
      target = newConsentRes.consent;
      target.reception_task_id = task.id;
    }

    setSelectedConsentToSign(target);
    setIsSignModalOpen(true);
  };

  // Load data
  const patients: Patient[] = useMemo(() => getStoredPatients(), [refreshKey]);
  const staff: StaffUser[] = useMemo(() => getStoredStaffUsers(), []);
  const doctors = useMemo(() => staff.filter((s) => s.role_id?.includes('doc') || s.display_name.startsWith('د.') || s.display_name.startsWith('Dr.')), [staff]);

  // Branch Authorization logic
  const branches = useMemo(() => getStoredBranches(), []);
  const userBranchId = (session?.profile as any)?.branch_id;
  const userRole = (session?.profile as any)?.role || session?.profile?.role_id;
  const isSuperAdminOrGlobal = !userBranchId || userRole === 'super_admin' || userRole === 'admin';

  // Effective branch authorized for the current user session
  const authorizedBranchId = isSuperAdminOrGlobal ? selectedBranchId : userBranchId;
  const currentBranchObj = useMemo(() => branches.find((b) => b.id === authorizedBranchId), [branches, authorizedBranchId]);

  const allTasks: DoctorTask[] = useMemo(() => {
    const raw = getStoredDoctorTasks();
    return raw.filter((t) => {
      // Scoping by Organization if present
      if (session?.profile?.organization_id && t.organization_id && t.organization_id !== session.profile.organization_id) {
        return false;
      }
      // Enforce authorized branch
      if (authorizedBranchId && authorizedBranchId !== 'all' && t.branch_id !== authorizedBranchId) {
        return false;
      }
      return true;
    });
  }, [authorizedBranchId, session?.profile?.organization_id, refreshKey]);

  // Filtered list
  const filteredTasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (typeFilter !== 'all' && t.task_type !== typeFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const patient = patients.find((p) => p.id === t.patient_id);
        const doctor = staff.find((s) => s.id === t.doctor_id);

        const patName = patient ? `${patient.first_name} ${patient.last_name}`.toLowerCase() : '';
        const patCode = patient?.patient_code?.toLowerCase() || '';
        const docName = doctor?.display_name?.toLowerCase() || '';
        const titleMatch = t.title.toLowerCase().includes(q);

        if (!patName.includes(q) && !patCode.includes(q) && !docName.includes(q) && !titleMatch) {
          return false;
        }
      }

      return true;
    });
  }, [allTasks, statusFilter, typeFilter, priorityFilter, searchQuery, patients, staff]);

  // Task Stats
  const stats = useMemo(() => {
    return {
      total: allTasks.length,
      pending: allTasks.filter((t) => t.status === 'pending').length,
      inProgress: allTasks.filter((t) => t.status === 'in_progress').length,
      completed: allTasks.filter((t) => t.status === 'completed').length,
      urgent: allTasks.filter((t) => t.status === 'pending' && t.priority === 'urgent').length,
    };
  }, [allTasks]);

  const handleStatusChange = (taskId: string, newStatus: DoctorTaskStatus) => {
    updateDoctorTaskStatus(taskId, newStatus, session?.profile.id);
    triggerRefresh();
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientId || !newTaskTitle.trim()) return;

    createDoctorTask({
      patientId: newPatientId,
      doctorId: newDoctorId || session?.profile.id || 'doc_001',
      branchId: authorizedBranchId !== 'all' ? authorizedBranchId : '11111111-1111-1111-1111-111111111111',
      taskType: newTaskType,
      title: newTaskTitle,
      details: newTaskDetails,
      priority: newTaskPriority,
      assignedToRole: 'receptionist',
    });

    setNewPatientId('');
    setNewTaskTitle('');
    setNewTaskDetails('');
    setShowCreateForm(false);
    triggerRefresh();
  };

  const getTaskTypeLabel = (type: DoctorTaskType) => {
    switch (type) {
      case 'obtain_consent':
        return isAr ? 'توقيع إقرار طبي' : 'Obtain Consent';
      case 'schedule_follow_up':
        return isAr ? 'جدولة مراجعة' : 'Schedule Follow-Up';
      case 'book_specialist':
        return isAr ? 'حجز لدى استشاري' : 'Book Specialist';
      case 'collect_required_document':
        return isAr ? 'استلام وثيقة / تقرير' : 'Collect Document';
      case 'send_instructions':
        return isAr ? 'إرسال تعليمات علاجية' : 'Send Instructions';
      case 'contact_patient':
        return isAr ? 'التواصل مع المريض' : 'Contact Patient';
      default:
        return type;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl my-6 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 via-slate-800 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center justify-center">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  {isAr ? 'مهام الاستقبال والتسليمات الطبية' : 'Reception Tasks & Clinical Handoffs'}
                </h2>
                {stats.urgent > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold animate-pulse">
                    {stats.urgent} {isAr ? 'عاجل' : 'Urgent'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-teal-200/80 mt-0.5">
                <span>
                  {isAr
                    ? 'متابعة الإحالات، توقيع الإقرارات، وجدولة توصيات الأطباء'
                    : 'Track doctor handoffs, patient consents, and follow-up scheduling'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-teal-900/60 text-teal-200 border border-teal-500/30 text-[10px] font-mono flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-teal-300" />
                  {currentBranchObj
                    ? isAr
                      ? currentBranchObj.name_ar
                      : currentBranchObj.name_en
                    : isAr
                    ? 'جميع الفروع المصرح بها'
                    : 'All Authorized Branches'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'مهمة جديدة' : 'New Task'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Create Task Form (Expandable) */}
        {showCreateForm && (
          <form
            onSubmit={handleCreateTask}
            className="p-4 bg-teal-50/70 border-b border-teal-200 space-y-3 shrink-0 text-xs animate-fadeIn"
          >
            <div className="flex items-center justify-between font-bold text-teal-950 mb-1">
              <span>{isAr ? 'إنشاء مهمة تسليم جديدة للاستقبال:' : 'Create New Handoff Task:'}</span>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="text-teal-700 hover:text-teal-900"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isAr ? 'المريض *:' : 'Patient *:'}
                </label>
                <select
                  required
                  value={newPatientId}
                  onChange={(e) => setNewPatientId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                >
                  <option value="">{isAr ? '-- اختر المريض --' : '-- Select Patient --'}</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.patient_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isAr ? 'نوع المهمة *:' : 'Task Type *:'}
                </label>
                <select
                  value={newTaskType}
                  onChange={(e) => setNewTaskType(e.target.value as DoctorTaskType)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                >
                  <option value="obtain_consent">{isAr ? 'توقيع إقرار طبي' : 'Obtain Consent'}</option>
                  <option value="schedule_follow_up">{isAr ? 'جدولة مراجعة' : 'Schedule Follow-Up'}</option>
                  <option value="book_specialist">{isAr ? 'حجز لدى استشاري' : 'Book Specialist'}</option>
                  <option value="collect_required_document">{isAr ? 'استلام وثيقة / تقرير' : 'Collect Document'}</option>
                  <option value="send_instructions">{isAr ? 'إرسال تعليمات' : 'Send Instructions'}</option>
                  <option value="contact_patient">{isAr ? 'التواصل مع المريض' : 'Contact Patient'}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isAr ? 'عنوان المهمة *:' : 'Task Title *:'}
                </label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder={isAr ? 'مثال: أخذ توقيع إقرار حشو عصب' : 'e.g., Collect RCT Consent'}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {isAr ? 'الأولوية:' : 'Priority:'}
                </label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as any)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                >
                  <option value="normal">{isAr ? 'عادي (Normal)' : 'Normal'}</option>
                  <option value="urgent">{isAr ? '🚨 عاجل (Urgent)' : 'Urgent'}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                {isAr ? 'تفاصيل إضافية:' : 'Additional Details:'}
              </label>
              <input
                type="text"
                value={newTaskDetails}
                onChange={(e) => setNewTaskDetails(e.target.value)}
                placeholder={isAr ? 'أي ملاحظات خاصة لموظف الاستقبال...' : 'Notes for reception desk...'}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg shadow-xs"
              >
                {isAr ? 'حفظ المهمة' : 'Save Task'}
              </button>
            </div>
          </form>
        )}

        {/* Stats & Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0 text-xs">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`p-2.5 rounded-xl border font-bold flex items-center justify-between transition-all ${
                statusFilter === 'pending'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{isAr ? 'معلقة (Pending)' : 'Pending'}</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]">
                {stats.pending}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('in_progress')}
              className={`p-2.5 rounded-xl border font-bold flex items-center justify-between transition-all ${
                statusFilter === 'in_progress'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{isAr ? 'قيد التنفيذ' : 'In Progress'}</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px]">
                {stats.inProgress}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`p-2.5 rounded-xl border font-bold flex items-center justify-between transition-all ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{isAr ? 'مكتملة (Completed)' : 'Completed'}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                {stats.completed}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`p-2.5 rounded-xl border font-bold flex items-center justify-between transition-all ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{isAr ? 'جميع المهام' : 'All Tasks'}</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px]">
                {stats.total}
              </span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث بالمريض أو الكود أو العنوان...' : 'Search patient or task...'}
                className="w-full ps-8 pe-3 py-1.5 bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <select
              id="task-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-1.5 px-3 bg-white border border-slate-300 rounded-lg font-medium"
            >
              <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="pending">{isAr ? '⏳ معلقة (Pending)' : 'Pending'}</option>
              <option value="in_progress">{isAr ? '🔄 قيد التنفيذ' : 'In Progress'}</option>
              <option value="completed">{isAr ? '✅ مكتملة' : 'Completed'}</option>
              <option value="cancelled">{isAr ? '❌ ملغاة' : 'Cancelled'}</option>
            </select>

            <select
              id="task-priority-filter"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full py-1.5 px-3 bg-white border border-slate-300 rounded-lg font-medium"
            >
              <option value="all">{isAr ? 'جميع الأولويات' : 'All Priorities'}</option>
              <option value="urgent">{isAr ? '🚨 عاجل (Urgent)' : 'Urgent'}</option>
              <option value="normal">{isAr ? '🔹 عادي (Normal)' : 'Normal'}</option>
              <option value="low">{isAr ? '▫️ منخفض (Low)' : 'Low'}</option>
            </select>

            <select
              id="task-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full py-1.5 px-3 bg-white border border-slate-300 rounded-lg font-medium"
            >
              <option value="all">{isAr ? 'جميع الأنواع' : 'All Task Types'}</option>
              <option value="obtain_consent">{isAr ? 'توقيع إقرار طبي' : 'Obtain Consent'}</option>
              <option value="schedule_follow_up">{isAr ? 'جدولة مراجعة' : 'Schedule Follow-Up'}</option>
              <option value="book_specialist">{isAr ? 'حجز لدى استشاري' : 'Book Specialist'}</option>
              <option value="collect_required_document">{isAr ? 'وثائق وتقارير' : 'Collect Document'}</option>
              <option value="send_instructions">{isAr ? 'تعليمات علاجية' : 'Send Instructions'}</option>
              <option value="contact_patient">{isAr ? 'التواصل مع المريض' : 'Contact Patient'}</option>
            </select>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <FileCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p>{isAr ? 'لا توجد مهام مطابقة للتصفية الحالية' : 'No tasks match current filter'}</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const patient = patients.find((p) => p.id === task.patient_id);
              const doctor = staff.find((s) => s.id === task.doctor_id);

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border text-xs transition-all space-y-2 ${
                    task.priority === 'urgent' && task.status === 'pending'
                      ? 'bg-red-50/60 border-red-200'
                      : task.status === 'completed'
                      ? 'bg-slate-50 border-slate-200 opacity-85'
                      : 'bg-white border-slate-200 hover:border-teal-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {/* Task Type Pill */}
                        <span className="px-2.5 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold text-[10px]">
                          {getTaskTypeLabel(task.task_type)}
                        </span>

                        {/* Priority Badge */}
                        {task.priority === 'urgent' && (
                          <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 font-extrabold text-[10px] flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-red-600" />
                            <span>{isAr ? 'عاجل' : 'Urgent'}</span>
                          </span>
                        )}

                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            task.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : task.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {task.status === 'completed'
                            ? isAr
                              ? 'مكتملة'
                              : 'Completed'
                            : task.status === 'in_progress'
                            ? isAr
                              ? 'قيد التنفيذ'
                              : 'In Progress'
                            : isAr
                            ? 'معلقة'
                            : 'Pending'}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm">{task.title}</h4>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono text-end shrink-0">
                      {new Date(task.created_at).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  {/* Patient & Doctor Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span className="font-bold text-slate-900">
                        {patient ? `${patient.first_name} ${patient.last_name}` : '—'}
                      </span>
                      <span className="text-teal-700 font-mono text-[11px]">
                        ({patient?.patient_code})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {isAr ? 'الطبيب الموصي:' : 'Doctor:'}{' '}
                        <strong className="text-slate-800">{doctor?.display_name || '—'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Task Details */}
                  {task.details && (
                    <p className="p-2 bg-amber-50/80 text-amber-900 border border-amber-200/60 rounded-lg text-[11px] italic">
                      "{task.details}"
                    </p>
                  )}

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="text-[11px] text-slate-500">
                      {task.completed_at && (
                        <span>
                          {isAr ? 'تم الإنجاز في:' : 'Completed:'}{' '}
                          {new Date(task.completed_at).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {task.task_type === 'obtain_consent' && task.status !== 'completed' && (
                        <button
                          type="button"
                          id={`sign-consent-task-btn-${task.id}`}
                          onClick={() => handleOpenConsentSign(task)}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-xs transition-all text-[11px]"
                        >
                          <FileSignature className="w-3.5 h-3.5" />
                          <span>{isAr ? 'توقيع الإقرار' : 'Sign Consent'}</span>
                        </button>
                      )}

                      {task.status !== 'completed' && (
                        <>
                          {task.status !== 'in_progress' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(task.id, 'in_progress')}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold transition-all text-[11px]"
                            >
                              {isAr ? 'قيد التنفيذ' : 'Mark In Progress'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStatusChange(task.id, 'completed')}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-xs transition-all text-[11px]"
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>{isAr ? 'إنجاز المهمة' : 'Complete Task'}</span>
                          </button>
                        </>
                      )}

                      {task.status === 'completed' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(task.id, 'pending')}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-[11px]"
                        >
                          {isAr ? 'إعادة لـ معلقة' : 'Reopen Task'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            {isAr ? 'إجمالي تسليمات الاستقبال:' : 'Total Handoff Tasks:'} {filteredTasks.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-xs"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>

      <ConsentSignModal
        isOpen={isSignModalOpen}
        onClose={() => {
          setIsSignModalOpen(false);
          setSelectedConsentToSign(null);
        }}
        consent={selectedConsentToSign}
        patientName={selectedTaskPatientName}
        onConsentUpdated={triggerRefresh}
      />
    </div>
  );
};

export const ReceptionTasks = ReceptionTasksModal;
