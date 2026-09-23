import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  UserCheck,
  Plus,
  ArrowRight,
  ShieldAlert,
  Send,
  Lock,
  X,
  Building2,
  Phone,
  User,
  Check,
  ChevronDown,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import {
  SupportTicket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../../types/complaints';
import { StaffUser, Branch, RoleKey } from '../../types';
import { getStoredBranches, getStoredStaffUsers } from '../../lib/storage';
import { getStoredPatients } from '../../lib/patientStorage';
import { Patient } from '../../types/patient';
import {
  getFilteredSupportTickets,
  createSupportTicket,
  updateSupportTicketStatus,
  updateSupportTicketPriority,
  assignSupportTicket,
  escalateSupportTicket,
  addTicketReply,
} from '../../lib/complaintStorage';

interface ComplaintsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBranchId?: string;
}

export const ComplaintsManagementModal: React.FC<ComplaintsManagementModalProps> = ({
  isOpen,
  onClose,
  defaultBranchId,
}) => {
  const { language } = useLanguage();
  const { session } = useAuth();
  const isAr = language === 'ar';

  const orgId = session?.organization?.id || '11111111-1111-1111-1111-111111111111';
  const staffProfile = session?.profile;

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    defaultBranchId || staffProfile?.branch_id || 'all'
  );
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Ticket State
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Trigger refresh
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  // New Ticket Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newPatientId, setNewPatientId] = useState('');
  const [newCategory, setNewCategory] = useState<TicketCategory>('Appointment');
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<TicketPriority>('normal');

  // Escalation Modal State
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateRole, setEscalateRole] = useState<RoleKey>('doctor');
  const [escalateReason, setEscalateReason] = useState('');

  // Resolution Modal State
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Reply Composer State
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternalReply, setIsInternalReply] = useState(false);

  // Data Loading
  const branches: Branch[] = useMemo(() => getStoredBranches(), []);
  const staffList: StaffUser[] = useMemo(() => getStoredStaffUsers(), []);
  const patients: Patient[] = useMemo(() => getStoredPatients(), []);

  const tickets = useMemo(() => {
    return getFilteredSupportTickets({
      organizationId: orgId,
      branchId: selectedBranchId === 'all' ? undefined : selectedBranchId,
      category: categoryFilter,
      status: statusFilter,
      priority: priorityFilter,
      searchQuery,
      forPatient: false, // Staff view receives internal notes
    });
  }, [orgId, selectedBranchId, categoryFilter, statusFilter, priorityFilter, searchQuery, refreshKey]);

  // Active Ticket
  const activeTicket = useMemo(() => {
    if (!selectedTicketId) return tickets[0] || null;
    return tickets.find((t) => t.id === selectedTicketId) || tickets[0] || null;
  }, [tickets, selectedTicketId]);

  if (!isOpen) return null;

  // Handlers
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientId || !newSubject.trim() || !newDescription.trim()) return;

    const patient = patients.find((p) => p.id === newPatientId);
    const result = createSupportTicket({
      organizationId: orgId,
      branchId: selectedBranchId !== 'all' ? selectedBranchId : branches[0]?.id || '11111111-1111-1111-1111-111111111111',
      patientId: newPatientId,
      patientName: patient ? `${patient.first_name} ${patient.last_name}` : 'المريض',
      patientPhone: patient?.primary_mobile,
      category: newCategory,
      subject: newSubject,
      description: newDescription,
      priority: newPriority,
      createdByStaffId: staffProfile?.id,
    });

    setShowNewModal(false);
    setNewPatientId('');
    setNewSubject('');
    setNewDescription('');
    setSelectedTicketId(result.ticket.id);
    refresh();
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyMessage.trim()) return;

    addTicketReply(activeTicket.id, {
      senderType: 'staff',
      senderId: staffProfile?.id || 'staff_system',
      senderName: staffProfile?.display_name || 'فريق الاستقبال',
      senderRole: staffProfile?.role_key,
      message: replyMessage,
      isInternal: isInternalReply,
    });

    setReplyMessage('');
    setIsInternalReply(false);
    refresh();
  };

  const handleAssignStaff = (staffId: string) => {
    if (!activeTicket) return;
    const staff = staffList.find((s) => s.id === staffId);
    assignSupportTicket(
      activeTicket.id,
      staffId,
      staff?.display_name || 'موظف',
      staffProfile?.id
    );
    refresh();
  };

  const handleEscalateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !escalateReason.trim()) return;

    escalateSupportTicket(
      activeTicket.id,
      escalateRole,
      staffProfile?.id || 'staff_system',
      escalateReason
    );

    setShowEscalateModal(false);
    setEscalateReason('');
    refresh();
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !resolutionNotes.trim()) return;

    updateSupportTicketStatus(
      activeTicket.id,
      'resolved',
      staffProfile?.id,
      resolutionNotes
    );

    setShowResolveModal(false);
    setResolutionNotes('');
    refresh();
  };

  const categoriesList: { key: TicketCategory; ar: string; en: string }[] = [
    { key: 'Appointment', ar: 'المواعيد والحجوزات', en: 'Appointment' },
    { key: 'Reception', ar: 'خدمة الاستقبال والمعاملة', en: 'Reception' },
    { key: 'Billing', ar: 'الفواتير والحسابات', en: 'Billing' },
    { key: 'Insurance', ar: 'التأمين الصحي', en: 'Insurance' },
    { key: 'Clinical', ar: 'الشكاوى الطبية والسريرية', en: 'Clinical' },
    { key: 'Lab/Prosthetics', ar: 'معمل التركيبات والتحاليل', en: 'Lab / Prosthetics' },
    { key: 'Medication', ar: 'الأدوية والوصفات الطبية', en: 'Medication' },
    { key: 'Other', ar: 'ملاحظات أخرى', en: 'Other' },
  ];

  const getPriorityBadge = (prio: TicketPriority) => {
    switch (prio) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            {isAr ? 'حرج جـداً' : 'Critical'}
          </span>
        );
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            {isAr ? 'عاجـل' : 'Urgent'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {isAr ? 'عادي' : 'Normal'}
          </span>
        );
    }
  };

  const getStatusBadge = (st: TicketStatus) => {
    switch (st) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            {isAr ? 'جديدة' : 'Open'}
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            {isAr ? 'قيد المتابعة' : 'In Progress'}
          </span>
        );
      case 'waiting_patient':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            {isAr ? 'بانتظار رد المريض' : 'Waiting Patient'}
          </span>
        );
      case 'escalated':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
            <ShieldAlert className="w-3 h-3" />
            {isAr ? 'مُصعّدة قيادياً' : 'Escalated'}
          </span>
        );
      case 'resolved':
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            {isAr ? 'مغلقة ومحلولة' : 'Resolved'}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  {isAr ? 'إدارة الشكاوى وتذاكر الدعم' : 'Complaints & Support Tickets'}
                </h2>
                <span className="bg-teal-500/20 text-teal-300 text-xs px-2 py-0.5 rounded-full font-semibold border border-teal-500/30">
                  {tickets.length} {isAr ? 'تذكرة' : 'Tickets'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? 'متابعة استفسارات وشكاوى المرضى والتحقيق والرد والتصعيد القيادي'
                  : 'Track patient inquiries, complaints, investigation & escalation workflow'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'تسجيل تذكرة جديدة' : 'New Ticket'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-50 p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[300px]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rtl:right-3 ltr:left-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isAr ? 'بحث برقم التذكرة، اسم المريض، أو العنوان...' : 'Search ticket #, patient name, or subject...'
                }
                className="w-full text-xs pr-9 pl-3 py-1.5 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-medium"
            >
              <option value="all">{isAr ? 'جميع التصنيفات' : 'All Categories'}</option>
              {categoriesList.map((c) => (
                <option key={c.key} value={c.key}>
                  {isAr ? c.ar : c.en}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-medium"
            >
              <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="open">{isAr ? 'جديدة (Open)' : 'Open'}</option>
              <option value="in_progress">{isAr ? 'قيد المتابعة' : 'In Progress'}</option>
              <option value="waiting_patient">{isAr ? 'بانتظار المريض' : 'Waiting Patient'}</option>
              <option value="escalated">{isAr ? 'مُصعّدة (Escalated)' : 'Escalated'}</option>
              <option value="resolved">{isAr ? 'مغلقة ومحلولة' : 'Resolved'}</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-medium"
            >
              <option value="all">{isAr ? 'جميع الأولويات' : 'All Priorities'}</option>
              <option value="normal">{isAr ? 'عادية (Normal)' : 'Normal'}</option>
              <option value="urgent">{isAr ? 'عاجلة (Urgent)' : 'Urgent'}</option>
              <option value="critical">{isAr ? 'حرجة جداً (Critical)' : 'Critical'}</option>
            </select>

            {/* Branch Filter */}
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-medium"
            >
              <option value="all">{isAr ? 'جميع الفروع' : 'All Branches'}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Master-Detail Main Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left List Pane */}
          <div className="w-full md:w-2/5 border-l rtl:border-l rtl:border-r-0 border-r border-slate-200 overflow-y-auto bg-slate-50 divide-y divide-slate-200 shrink-0">
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold">{isAr ? 'لا توجد تذاكر دعم مطابقة' : 'No support tickets found'}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isAr ? 'قم بتعديل خيارات البحث أو أنشئ تذكرة جديدة' : 'Adjust search filters or create a ticket'}
                </p>
              </div>
            ) : (
              tickets.map((tkt) => {
                const isSelected = activeTicket?.id === tkt.id;
                return (
                  <div
                    key={tkt.id}
                    onClick={() => setSelectedTicketId(tkt.id)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-teal-50/90 border-r-4 rtl:border-r-4 border-teal-600'
                        : 'hover:bg-slate-100 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {tkt.ticket_number}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {getPriorityBadge(tkt.priority)}
                        {getStatusBadge(tkt.status)}
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1">
                      {tkt.subject}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-medium text-slate-700 truncate max-w-[160px]">
                        👤 {tkt.patient_name || 'مريض'}
                      </span>
                      <span>{new Date(tkt.created_at).toLocaleDateString('ar-EG')}</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-1.5">
                      <span className="truncate">
                        📁 {categoriesList.find((c) => c.key === tkt.category)?.ar || tkt.category}
                      </span>
                      <span>
                        💬 {tkt.replies.length} {isAr ? 'ردود' : 'replies'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Active Ticket Detail View */}
          <div className="hidden md:flex flex-1 flex-col overflow-hidden bg-white">
            {activeTicket ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Detail Header Toolbar */}
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold bg-slate-200 text-slate-900 px-2 py-0.5 rounded">
                        {activeTicket.ticket_number}
                      </span>
                      <span className="text-xs text-slate-500">
                        • {new Date(activeTicket.created_at).toLocaleString('ar-EG')}
                      </span>
                      {getPriorityBadge(activeTicket.priority)}
                      {getStatusBadge(activeTicket.status)}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {activeTicket.subject}
                    </h3>
                  </div>

                  {/* Quick Action Controls */}
                  <div className="flex items-center gap-2">
                    {/* Status Dropdown */}
                    <select
                      value={activeTicket.status}
                      onChange={(e) => {
                        updateSupportTicketStatus(activeTicket.id, e.target.value as any, staffProfile?.id);
                        refresh();
                      }}
                      className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white font-semibold"
                    >
                      <option value="open">{isAr ? 'جديدة' : 'Open'}</option>
                      <option value="in_progress">{isAr ? 'قيد المتابعة' : 'In Progress'}</option>
                      <option value="waiting_patient">{isAr ? 'بانتظار المريض' : 'Waiting Patient'}</option>
                      <option value="escalated">{isAr ? 'مُصعّدة' : 'Escalated'}</option>
                      <option value="resolved">{isAr ? 'مغلقة ومحلولة' : 'Resolved'}</option>
                    </select>

                    {/* Escalate Button */}
                    <button
                      onClick={() => setShowEscalateModal(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تصعيد قيادي' : 'Escalate'}</span>
                    </button>

                    {/* Resolve Button */}
                    <button
                      onClick={() => setShowResolveModal(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{isAr ? 'إنهاء وحل التذكرة' : 'Resolve'}</span>
                    </button>
                  </div>
                </div>

                {/* Patient & Staff Assignment Info Strip */}
                <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-700 gap-2 shrink-0">
                  <div className="flex items-center gap-3">
                    <span>
                      <User className="w-3.5 h-3.5 inline ml-1 text-slate-500" />
                      <strong>{isAr ? 'المريض:' : 'Patient:'}</strong> {activeTicket.patient_name}
                    </span>
                    {activeTicket.patient_phone && (
                      <span>
                        <Phone className="w-3.5 h-3.5 inline ml-1 text-slate-500" />
                        {activeTicket.patient_phone}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{isAr ? 'الموظف المسؤول:' : 'Assigned Staff:'}</span>
                    <select
                      value={activeTicket.assigned_to || ''}
                      onChange={(e) => handleAssignStaff(e.target.value)}
                      className="text-xs py-1 px-2 rounded border border-slate-300 bg-white font-medium"
                    >
                      <option value="">{isAr ? 'غير مسند لموظف' : 'Unassigned'}</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.display_name} ({s.role_key})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Timeline / Conversation Replies View */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
                  {/* Original Description Card */}
                  <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1">
                      <span>📌 {isAr ? 'الوصف الأصلي للشكوى / الطلب' : 'Original Description'}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(activeTicket.created_at).toLocaleString('ar-EG')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {activeTicket.description}
                    </p>
                  </div>

                  {/* Resolution Notes Card (if resolved) */}
                  {activeTicket.resolution_notes && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                      <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>{isAr ? 'ملاحظة حل الشكوى النهائية' : 'Final Resolution Notes'}</span>
                      </div>
                      <p className="text-xs text-emerald-800 leading-relaxed">
                        {activeTicket.resolution_notes}
                      </p>
                    </div>
                  )}

                  {/* Replies List */}
                  {activeTicket.replies.map((reply) => {
                    const isStaff = reply.sender_type === 'staff';

                    return (
                      <div
                        key={reply.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          reply.is_internal
                            ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-xs'
                            : isStaff
                            ? 'bg-teal-50/80 border-teal-200 text-slate-900 ltr:ml-6 rtl:mr-6'
                            : 'bg-white border-slate-200 text-slate-900 ltr:mr-6 rtl:ml-6'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-1.5 font-bold">
                            {reply.is_internal ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded border border-amber-300">
                                <Lock className="w-3 h-3 text-amber-700" />
                                {isAr ? 'ملاحظة سرية داخلية (للموظفين فقط)' : 'Internal Staff Note'}
                              </span>
                            ) : (
                              <span>
                                {isStaff ? '🩺 ' : '👤 '}
                                {reply.sender_name}
                                {reply.sender_role && ` (${reply.sender_role})`}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {new Date(reply.created_at).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                          {reply.message}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Composer Bar */}
                <form
                  onSubmit={handleSendReply}
                  className="p-3 border-t border-slate-200 bg-white shrink-0 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      {isAr ? 'إضافة رد أو ملاحظة جديدة:' : 'Add Response or Note:'}
                    </label>

                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors">
                      <input
                        type="checkbox"
                        checked={isInternalReply}
                        onChange={(e) => setIsInternalReply(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                      />
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>{isAr ? 'ملاحظة داخلية سرية (لا تظهر للمريض)' : 'Internal Staff Note Only'}</span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      rows={2}
                      placeholder={
                        isInternalReply
                          ? isAr
                            ? 'اكتب ملاحظة استقصائية داخلية للزملـاء...'
                            : 'Write internal investigation note for staff...'
                          : isAr
                          ? 'اكتب رداً رسمياً موحداً للمريض...'
                          : 'Write official response to patient...'
                      }
                      className="flex-1 text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 resize-none"
                    />

                    <button
                      type="submit"
                      disabled={!replyMessage.trim()}
                      className="px-4 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors shrink-0"
                    >
                      <Send className="w-4 h-4 rtl:rotate-180" />
                      <span>{isAr ? 'إرسـال' : 'Send'}</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
                <p className="text-xs">{isAr ? 'حدد تذكرة لعرض التفاصيل والمتابعة' : 'Select a ticket to view details'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NEW TICKET MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                {isAr ? 'تسجيل تذكرة / شكوى جديدة' : 'New Complaint / Support Ticket'}
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5 mt-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isAr ? 'المريض صاحب الشكوى:' : 'Patient:'}
                </label>
                <select
                  required
                  value={newPatientId}
                  onChange={(e) => setNewPatientId(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">{isAr ? '-- اختر المريض --' : '-- Select Patient --'}</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.primary_mobile})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isAr ? 'التصنيف:' : 'Category:'}
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {categoriesList.map((c) => (
                      <option key={c.key} value={c.key}>
                        {isAr ? c.ar : c.en}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isAr ? 'الأولوية:' : 'Priority:'}
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-bold"
                  >
                    <option value="normal">{isAr ? 'عادية (Normal)' : 'Normal'}</option>
                    <option value="urgent">{isAr ? 'عاجلة (Urgent)' : 'Urgent'}</option>
                    <option value="critical">{isAr ? 'حرجة جداً (Critical)' : 'Critical'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isAr ? 'عنوان الشكوى / الاستفسار:' : 'Subject:'}
                </label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder={isAr ? 'مثال: التأخر في مواعيد الاستقبال أو مشكلة فاتورة' : 'e.g. Reception delay'}
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isAr ? 'تفاصيل الشكوى الدقيقة:' : 'Detailed Description:'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder={isAr ? 'اكتب تفاصيل الشكوى كما ذكرها المريض...' : 'Enter exact complaint description...'}
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-teal-600 text-white font-bold"
                >
                  {isAr ? 'حفظ وتسجيل التذكرة' : 'Save Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ESCALATION MODAL */}
      {showEscalateModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 text-rose-700">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-bold text-sm">
                {isAr ? 'تصعيد الشكوى قيادياً' : 'Escalate Complaint'}
              </h3>
            </div>

            <form onSubmit={handleEscalateSubmit} className="space-y-3.5 mt-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isAr ? 'التصعيد إلى الدور القيادي المعني:' : 'Escalate To Role:'}
                </label>
                <select
                  value={escalateRole}
                  onChange={(e) => setEscalateRole(e.target.value as any)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white font-bold"
                >
                  <option value="doctor">{isAr ? 'الأطباء والمدير الطبي (Doctor / Clinical Lead)' : 'Doctor'}</option>
                  <option value="center_manager">{isAr ? 'مدير المركز (Center Manager)' : 'Center Manager'}</option>
                  <option value="branch_manager">{isAr ? 'مدير الفرع (Branch Manager)' : 'Branch Manager'}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isAr ? 'سبب التصعيد والتوجيه المطلوب:' : 'Reason for Escalation:'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder={isAr ? 'اكتب سبب التصعيد لاتخاذ إجراء عاجل...' : 'Reason for urgent escalation...'}
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEscalateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-bold"
                >
                  {isAr ? 'تأكيد التصعيد القيادي' : 'Confirm Escalation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLUTION MODAL */}
      {showResolveModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 text-emerald-700">
              <CheckCircle className="w-5 h-5" />
              <h3 className="font-bold text-sm">
                {isAr ? 'إنهاء وحل التذكرة رسمياً' : 'Resolve & Close Ticket'}
              </h3>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-3.5 mt-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isAr ? 'ملاحظة وحيثيات الإغلاق والحل:' : 'Resolution Notes:'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder={
                    isAr
                      ? 'اكتب إجراءات الحل التي تم اتخاذها للعميل...'
                      : 'Describe resolution actions taken for the patient...'
                  }
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 font-semibold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold"
                >
                  {isAr ? 'حفظ وإغلاق الشكوى' : 'Resolve & Close'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
