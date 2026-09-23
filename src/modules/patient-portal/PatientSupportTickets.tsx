import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  Send,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientAuth } from './PatientAuthContext';
import {
  SupportTicket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../../types/complaints';
import {
  getFilteredSupportTickets,
  createSupportTicket,
  addTicketReply,
} from '../../lib/complaintStorage';

export const PatientSupportTickets: React.FC = () => {
  const { language } = useLanguage();
  const { session } = usePatientAuth();
  const isAr = language === 'ar';

  const patient = session?.selectedPatient;
  const orgId = session?.organization.id;

  // State
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // Form State
  const [newCategory, setNewCategory] = useState<TicketCategory>('Appointment');
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<TicketPriority>('normal');

  // Reply State
  const [replyMessage, setReplyMessage] = useState('');

  // Refresh
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  // Fetch Patient Tickets with Strict Privacy (forPatient: true filters out internal staff notes!)
  const patientTickets = useMemo(() => {
    if (!orgId || !patient) return [];
    return getFilteredSupportTickets({
      organizationId: orgId,
      patientId: patient.id,
      forPatient: true, // GUARANTEES INTERNAL NOTES ARE STRIPPED!
    });
  }, [orgId, patient?.id, refreshKey]);

  if (!session || !patient || !orgId) return null;

  // Active Ticket
  const activeTicket = useMemo(() => {
    if (!selectedTicketId) return patientTickets[0] || null;
    return patientTickets.find((t) => t.id === selectedTicketId) || patientTickets[0] || null;
  }, [patientTickets, selectedTicketId]);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) return;

    const result = createSupportTicket({
      organizationId: orgId,
      branchId: '11111111-1111-1111-1111-111111111111', // Default Cairo/primary branch
      patientId: patient.id,
      patientName: `${patient.first_name} ${patient.last_name}`,
      patientPhone: patient.phone,
      category: newCategory,
      subject: newSubject,
      description: newDescription,
      priority: newPriority,
    });

    setShowNewModal(false);
    setNewSubject('');
    setNewDescription('');
    setSelectedTicketId(result.ticket.id);
    refresh();
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyMessage.trim()) return;

    addTicketReply(activeTicket.id, {
      senderType: 'patient',
      senderId: patient.id,
      senderName: `${patient.first_name} ${patient.last_name}`,
      message: replyMessage,
      isInternal: false, // Patient replies are never internal
    });

    setReplyMessage('');
    refresh();
  };

  const categoriesList: { key: TicketCategory; ar: string; en: string }[] = [
    { key: 'Appointment', ar: 'المواعيد والحجوزات', en: 'Appointment' },
    { key: 'Reception', ar: 'معاملة الاستقبال والعيادة', en: 'Reception' },
    { key: 'Billing', ar: 'الفواتير والأسعار', en: 'Billing' },
    { key: 'Insurance', ar: 'التأمين الصحي والموافقات', en: 'Insurance' },
    { key: 'Clinical', ar: 'استفسار طبي أو آلام بعد العلاج', en: 'Clinical / Pain' },
    { key: 'Lab/Prosthetics', ar: 'مواعيد التركيبات والتحاليل', en: 'Lab / Prosthetics' },
    { key: 'Medication', ar: 'الأدوية والوصفات الطبية', en: 'Medication' },
    { key: 'Other', ar: 'ملاحظة أخرى', en: 'Other' },
  ];

  const getStatusBadge = (st: TicketStatus) => {
    switch (st) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            {isAr ? 'تم الاستلام' : 'Received'}
          </span>
        );
      case 'in_progress':
      case 'escalated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            {isAr ? 'قيد المتابعة والبحث' : 'In Progress'}
          </span>
        );
      case 'waiting_patient':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            {isAr ? 'بانتظار ردك' : 'Waiting Reply'}
          </span>
        );
      case 'resolved':
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            {isAr ? 'تم الإغلاق والحل' : 'Resolved'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 shadow-sm border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? 'خدمة الملاحظات والشكاوى المباشرة' : 'Direct Support & Complaints'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">
              {isAr ? 'الاستفسارات والشكاوى' : 'Inquiries & Complaints'}
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              {isAr
                ? 'يمكنك متابعة استفساراتك المباشرة وطرح ملاحظاتك على الإدارة والأطباء بكل سهولة'
                : 'Send your complaints, clinical questions, or billing feedback directly to clinic management'}
            </p>
          </div>

          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'تقديم شكوى / استفسار جديد' : 'Submit New Ticket'}</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        {/* Left Side: Tickets List */}
        <div className="w-full md:w-2/5 border-b md:border-b-0 md:border-l rtl:md:border-l rtl:md:border-r-0 border-r border-slate-200 bg-slate-50 divide-y divide-slate-200">
          <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              {isAr ? 'قائمة التذاكر والشكاوى' : 'Submitted Tickets'}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {patientTickets.length}
            </span>
          </div>

          {patientTickets.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold">{isAr ? 'لا توجد شكاوى أو استفسارات مسجلة' : 'No support tickets found'}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {isAr ? 'اضغط على "تقديم شكوى جديدة" للتواصل مع المركز' : 'Click "Submit New Ticket" to contact us'}
              </p>
            </div>
          ) : (
            patientTickets.map((tkt) => {
              const isSelected = activeTicket?.id === tkt.id;
              return (
                <div
                  key={tkt.id}
                  onClick={() => setSelectedTicketId(tkt.id)}
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-teal-50/90 border-r-4 rtl:border-r-4 border-teal-600'
                      : 'hover:bg-slate-100 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                      {tkt.ticket_number}
                    </span>
                    {getStatusBadge(tkt.status)}
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1">
                    {tkt.subject}
                  </h4>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                    <span>
                      📁 {categoriesList.find((c) => c.key === tkt.category)?.ar || tkt.category}
                    </span>
                    <span>{new Date(tkt.created_at).toLocaleDateString('ar-EG')}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Active Ticket Details */}
        <div className="flex-1 flex flex-col bg-white">
          {activeTicket ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Ticket Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-slate-200 text-slate-900 px-2 py-0.5 rounded">
                      {activeTicket.ticket_number}
                    </span>
                    {getStatusBadge(activeTicket.status)}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    {activeTicket.subject}
                  </h3>
                </div>

                <span className="text-xs text-slate-400 font-mono">
                  {new Date(activeTicket.created_at).toLocaleDateString('ar-EG')}
                </span>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
                {/* Description Box */}
                <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200">
                  <span className="block text-[11px] font-bold text-slate-500 mb-1">
                    {isAr ? 'نص الشكوى المقدمة:' : 'Original Submitted Complaint:'}
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {activeTicket.description}
                  </p>
                </div>

                {/* Resolution Notes Banner */}
                {activeTicket.resolution_notes && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <div className="flex items-center gap-2 font-bold text-xs mb-1">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>{isAr ? 'رد وإغلاق الإدارة النهائي' : 'Final Management Resolution'}</span>
                    </div>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      {activeTicket.resolution_notes}
                    </p>
                  </div>
                )}

                {/* Public Replies List (Internal staff notes are filtered out securely!) */}
                {activeTicket.replies.map((reply) => {
                  const isPatient = reply.sender_type === 'patient';
                  return (
                    <div
                      key={reply.id}
                      className={`p-3.5 rounded-xl border ${
                        isPatient
                          ? 'bg-teal-50 border-teal-200 text-slate-900 ltr:ml-6 rtl:mr-6'
                          : 'bg-white border-slate-200 text-slate-900 ltr:mr-6 rtl:ml-6'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1 font-bold">
                        <span>
                          {isPatient ? '👤 ' : '🏥 '}
                          {reply.sender_name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
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

              {/* Reply Box */}
              {activeTicket.status !== 'resolved' && activeTicket.status !== 'closed' && (
                <form
                  onSubmit={handleSendReply}
                  className="p-3 border-t border-slate-200 bg-white flex gap-2 shrink-0"
                >
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={2}
                    placeholder={
                      isAr
                        ? 'اكتب رداً أو استفساراً إضافياً لفريق المركز...'
                        : 'Type your reply or additional details...'
                    }
                    className="flex-1 text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={!replyMessage.trim()}
                    className="px-4 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors shrink-0"
                  >
                    <Send className="w-4 h-4 rtl:rotate-180" />
                    <span>{isAr ? 'إرسال' : 'Send'}</span>
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
              <p className="text-xs">{isAr ? 'اختر تذكرة لمشاهدة التفاصيل والردود' : 'Select a ticket to view details'}</p>
            </div>
          )}
        </div>
      </div>

      {/* NEW TICKET MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                {isAr ? 'تقديم شكوى أو استفسار جديد' : 'New Complaint / Inquiry'}
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5 mt-3 text-xs">
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
                    {isAr ? 'درجة الأهمية:' : 'Priority:'}
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-bold"
                  >
                    <option value="normal">{isAr ? 'عادية' : 'Normal'}</option>
                    <option value="urgent">{isAr ? 'عاجلة' : 'Urgent'}</option>
                    <option value="critical">{isAr ? 'حرجة جداً' : 'Critical'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isAr ? 'عنوان الشكوى / الملاحظة:' : 'Subject:'}
                </label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder={
                    isAr ? 'مثال: استفسار عن فاتورة أو مشكلة في الموعد' : 'e.g. Question about my invoice'
                  }
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isAr ? 'التفاصيل:' : 'Details:'}
                </label>
                <textarea
                  required
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder={
                    isAr
                      ? 'اكتب كافة التفاصيل ليتمكن فريق العيادة من البحث والمتابعة...'
                      : 'Please provide full details for our staff to investigate...'
                  }
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
                  {isAr ? 'إرسال الشكوى الآن' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
