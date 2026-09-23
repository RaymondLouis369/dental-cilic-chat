import React, { useState, useEffect } from 'react';
import { useLanguage } from '../modules/i18n/LanguageContext';
import { Profile, RoleKey } from '../types';
import {
  HumanEscalation,
  EscalationReply,
  EscalationStatus,
  EscalationCategory,
} from '../types/escalation';
import {
  getEscalationsForUser,
  getEscalationWithReplies,
  claimHumanEscalation,
  releaseHumanEscalation,
  addEscalationReply,
  resolveHumanEscalation,
  reopenHumanEscalation,
  isAuthorizedStaffRecipient,
  MEDICAL_SAFETY_DISCLAIMER,
} from '../lib/escalationStorage';
import {
  ShieldAlert,
  UserCheck,
  MessageSquare,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
  Send,
  AlertTriangle,
  Lock,
  UserX,
  Stethoscope,
  Building2,
  Search,
} from 'lucide-react';

interface HumanEscalationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffProfile: Profile;
  accessibleBranchIds?: string[];
}

export const HumanEscalationsModal: React.FC<HumanEscalationsModalProps> = ({
  isOpen,
  onClose,
  staffProfile,
  accessibleBranchIds,
}) => {
  const { language } = useLanguage();
  const isRtl = language === 'ar';

  const [activeTab, setActiveTab] = useState<EscalationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEscalationId, setSelectedEscalationId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (!isOpen) return null;

  const isAuthorized = isAuthorizedStaffRecipient(staffProfile.role_key);

  const staffContext = {
    kind: 'staff' as const,
    profile: staffProfile,
    accessibleBranchIds,
  };

  const escalations = isAuthorized ? getEscalationsForUser(staffContext) : [];

  const filteredEscalations = escalations.filter((esc) => {
    if (activeTab !== 'all' && esc.status !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubj = esc.subject.toLowerCase().includes(q);
      const matchPrompt = esc.original_prompt.toLowerCase().includes(q);
      const matchStaff = (esc.assigned_staff_name || '').toLowerCase().includes(q);
      if (!matchSubj && !matchPrompt && !matchStaff) return false;
    }
    return true;
  });

  const selectedData = selectedEscalationId
    ? getEscalationWithReplies(selectedEscalationId, staffContext)
    : null;

  const handleClaim = (escId: string) => {
    setActionError(null);
    setActionSuccess(null);
    const res = claimHumanEscalation(escId, staffProfile);
    if (!res.success) {
      setActionError(res.error || 'Failed to claim escalation');
    } else {
      setActionSuccess(
        language === 'ar'
          ? 'تم استلام وتخصيص طلب التصعيد بنجاح'
          : 'Escalation successfully claimed'
      );
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  const handleRelease = (escId: string) => {
    setActionError(null);
    setActionSuccess(null);
    const res = releaseHumanEscalation(escId, staffProfile);
    if (!res.success) {
      setActionError(res.error || 'Failed to release escalation');
    } else {
      setActionSuccess(
        language === 'ar' ? 'تم ترك طلب التصعيد للموظفين الآخرين' : 'Escalation released'
      );
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEscalationId || !replyText.trim()) return;

    setActionError(null);
    setActionSuccess(null);

    const res = addEscalationReply(
      {
        escalation_id: selectedEscalationId,
        message: replyText,
        sender_type: 'staff',
        sender_id: staffProfile.id,
        sender_name: staffProfile.display_name,
        sender_role: staffProfile.role_key,
      },
      staffContext
    );

    if (!res.success) {
      setActionError(res.error || 'Failed to send reply');
    } else {
      setReplyText('');
      setActionSuccess(language === 'ar' ? 'تم إرسال الرد بنجاح للمريض' : 'Reply sent to patient');
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  const handleResolve = (escId: string) => {
    setActionError(null);
    setActionSuccess(null);
    const res = resolveHumanEscalation(
      escId,
      staffProfile,
      replyText.trim() ? replyText : undefined
    );
    if (!res.success) {
      setActionError(res.error || 'Failed to resolve escalation');
    } else {
      setReplyText('');
      setActionSuccess(
        language === 'ar' ? 'تم معالجة وإغلاق طلب التصعيد بنجاح' : 'Escalation resolved'
      );
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  const handleReopen = (escId: string) => {
    setActionError(null);
    setActionSuccess(null);
    const res = reopenHumanEscalation(
      escId,
      staffContext,
      language === 'ar' ? 'إعادة فتح بواسطة مسؤول العيادة' : 'Reopened by staff manager'
    );
    if (!res.success) {
      setActionError(res.error || 'Failed to reopen escalation');
    } else {
      setActionSuccess(
        language === 'ar' ? 'تم إعادة فتح طلب التصعيد' : 'Escalation reopened'
      );
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white">
                {language === 'ar' ? 'إدارة التصعيد الطبي والاستفسارات المباشرة' : 'Human Escalation & Staff Replies'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'ar'
                  ? `المستخدم: ${staffProfile.display_name} (${staffProfile.role_key})`
                  : `User: ${staffProfile.display_name} (${staffProfile.role_key})`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        {!isAuthorized ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {language === 'ar' ? 'غير مصرح بالوصول' : 'Access Denied'}
            </h3>
            <p className="text-sm text-slate-600 max-w-md">
              {language === 'ar'
                ? 'دورك الحالي غير مصرح له باستعراض أو معالجة طلبات التصعيد البشري. الصلاحيات محصورة بالمديرين الأطباء، موظفي الاستقبال، وأطباء الأسنان.'
                : 'Your staff role is not authorized to manage human escalations. Access is restricted to Medical Managers, Receptionists, and Dentists.'}
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Side: Escalation List */}
            <div className="w-full md:w-1/2 border-e border-slate-200 flex flex-col bg-slate-50">
              {/* Filter Tabs */}
              <div className="p-3 border-b border-slate-200 space-y-2 bg-white">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'all', label: language === 'ar' ? 'الكل' : 'All' },
                    { id: 'pending', label: language === 'ar' ? 'قيد الانتظار' : 'Pending' },
                    { id: 'claimed', label: language === 'ar' ? 'قيد المتابعة' : 'Claimed' },
                    { id: 'resolved', label: language === 'ar' ? 'المغلقة' : 'Resolved' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        activeTab === tab.id
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute top-2.5 start-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      language === 'ar'
                        ? 'بحث في عنوان الطلب أو نص الاستفسار...'
                        : 'Search subject or query...'
                    }
                    className="w-full ps-9 pe-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Status Alert Banners */}
              {actionError && (
                <div className="m-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}
              {actionSuccess && (
                <div className="m-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredEscalations.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    {language === 'ar' ? 'لا توجد طلبات تصعيد مطابقة' : 'No matching escalations found'}
                  </div>
                ) : (
                  filteredEscalations.map((esc) => {
                    const isSelected = esc.id === selectedEscalationId;
                    const isClaimedByMe = esc.assigned_staff_id === staffProfile.id;
                    const isClaimedByOther =
                      esc.assigned_staff_id && esc.assigned_staff_id !== staffProfile.id;

                    return (
                      <div
                        key={esc.id}
                        onClick={() => {
                          setSelectedEscalationId(esc.id);
                          setActionError(null);
                          setActionSuccess(null);
                        }}
                        className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-teal-50/80 border-teal-500 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              esc.priority === 'urgent'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : esc.priority === 'high'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {esc.priority === 'urgent'
                              ? language === 'ar' ? 'عاجل طارئ' : 'Urgent'
                              : esc.priority === 'high'
                              ? language === 'ar' ? 'أولوية مرتفعة' : 'High'
                              : language === 'ar' ? 'عادي' : 'Normal'}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              esc.status === 'pending'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : esc.status === 'claimed'
                                ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {esc.status === 'pending'
                              ? language === 'ar' ? 'بانتظار الاستلام' : 'Pending'
                              : esc.status === 'claimed'
                              ? language === 'ar' ? 'قيد المتابعة' : 'In Progress'
                              : language === 'ar' ? 'تمت المعالجة' : 'Resolved'}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-900 mb-1 line-clamp-1">{esc.subject}</h4>
                        <p className="text-slate-600 line-clamp-2 mb-2">{esc.original_prompt}</p>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(esc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          {esc.assigned_staff_name && (
                            <span className={`font-semibold ${isClaimedByMe ? 'text-teal-700' : 'text-slate-600'}`}>
                              {isClaimedByMe
                                ? language === 'ar' ? 'مستلم منك' : 'Claimed by You'
                                : esc.assigned_staff_name}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Side: Escalation Thread & Actions */}
            <div className="w-full md:w-1/2 flex flex-col bg-white">
              {!selectedData ? (
                <div className="flex-1 p-8 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                  <MessageSquare className="w-12 h-12 text-slate-300" />
                  <p className="text-xs">
                    {language === 'ar'
                      ? 'اختر طلب تصعيد من القائمة لعرض تفاصيل الاستفسار والرد المباشر'
                      : 'Select an escalation item from the list to view thread details'}
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Selected Item Header */}
                  <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                        {selectedData.escalation.subject}
                      </h3>

                      {/* Action buttons: Claim / Release / Resolve / Reopen */}
                      <div className="flex items-center gap-1.5">
                        {selectedData.escalation.status === 'pending' && (
                          <button
                            onClick={() => handleClaim(selectedData.escalation.id)}
                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{language === 'ar' ? 'استلام الطلب' : 'Claim'}</span>
                          </button>
                        )}

                        {selectedData.escalation.status === 'claimed' &&
                          selectedData.escalation.assigned_staff_id === staffProfile.id && (
                            <button
                              onClick={() => handleRelease(selectedData.escalation.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1"
                              title={language === 'ar' ? 'ترك الطلب لموظف آخر' : 'Release Escalation'}
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>{language === 'ar' ? 'ترك الطلب' : 'Release'}</span>
                            </button>
                          )}

                        {selectedData.escalation.status !== 'resolved' ? (
                          <button
                            onClick={() => handleResolve(selectedData.escalation.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{language === 'ar' ? 'إغلاق المعالجة' : 'Resolve'}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReopen(selectedData.escalation.id)}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>{language === 'ar' ? 'إعادة فتح' : 'Reopen'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Active Responder Banner */}
                    {selectedData.escalation.assigned_staff_name && (
                      <div className="p-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center justify-between">
                        <span className="font-semibold">
                          {language === 'ar'
                            ? `المستجيب النشط: ${selectedData.escalation.assigned_staff_name} (${selectedData.escalation.assigned_staff_role})`
                            : `Assigned Responder: ${selectedData.escalation.assigned_staff_name} (${selectedData.escalation.assigned_staff_role})`}
                        </span>
                        {selectedData.escalation.assigned_staff_id !== staffProfile.id && (
                          <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-bold">
                            {language === 'ar' ? 'مخصص لموظف آخر' : 'Claimed by other staff'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Original Prompt Card */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 block">
                        {language === 'ar' ? 'استفسار المريض الأصلي:' : 'Original Patient Prompt:'}
                      </span>
                      <p className="text-slate-800 font-medium leading-relaxed">
                        {selectedData.escalation.original_prompt}
                      </p>
                    </div>
                  </div>

                  {/* Reply Thread List */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
                    {selectedData.replies.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        {language === 'ar'
                          ? 'لا توجد ردود بعد. يمكنك كتابة أول رد للمريض بالأسفل.'
                          : 'No staff replies yet. Write a response below.'}
                      </div>
                    ) : (
                      selectedData.replies.map((rep) => {
                        const isStaff = rep.sender_type === 'staff';
                        return (
                          <div
                            key={rep.id}
                            className={`p-3 rounded-2xl text-xs space-y-1 max-w-[85%] ${
                              isStaff
                                ? 'bg-teal-600 text-white ms-auto rounded-te-none'
                                : 'bg-white border border-slate-200 text-slate-800 me-auto rounded-ts-none'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-[10px] opacity-80 border-b border-white/20 pb-1 mb-1">
                              <span className="font-bold">{rep.sender_name}</span>
                              <span>{new Date(rep.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="leading-relaxed whitespace-pre-wrap">{rep.message}</p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Reply Input Form */}
                  <form
                    onSubmit={handleSendReply}
                    className="p-3 bg-white border-t border-slate-200 space-y-2 shrink-0"
                  >
                    {/* Medical Safety Guardrail Reminder */}
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        {language === 'ar'
                          ? 'تنبيه أمان: يمنع كتابة روشتات أو تشخيصات جازمة نهائية عبر المحادثة الإلكترونية.'
                          : 'Safety Warning: Do not write prescriptions or final medical diagnoses in text messages.'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <textarea
                        rows={2}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={
                          language === 'ar'
                            ? 'اكتب رد العيادة المباشر للمريض هنا...'
                            : 'Write clinic response to patient...'
                        }
                        className="flex-1 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-teal-500 resize-none"
                      />

                      <button
                        type="submit"
                        disabled={!replyText.trim()}
                        className="px-4 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-all shrink-0 shadow-2xs"
                      >
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">{language === 'ar' ? 'إرسال' : 'Send'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
