import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Paperclip,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Tag,
  User,
  FlaskConical,
  Stethoscope,
  SlidersHorizontal,
  FileText,
  AlertCircle,
  Filter,
  Check,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  LabOrder,
  LabOrderChatMessage,
  LabOrderChatTopic,
  LabOrderChatStatus,
} from '../../types/clinical';
import {
  isUserAuthorizedForLabOrderChat,
  getLabOrderChatMessages,
  addLabOrderChatMessage,
  markLabOrderMessagesAsRead,
  getLabOrderChatStatus,
  updateLabOrderChatStatus,
} from '../../lib/clinicalStorage';

interface LabOrderChatModalProps {
  order: LabOrder;
  onClose: () => void;
}

export const LabOrderChatModal: React.FC<LabOrderChatModalProps> = ({ order, onClose }) => {
  const { session } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const userRole = session?.role.key || 'patient';
  const userOrgId = session?.organization.id || '';
  const userId = session?.profile.id || '';
  const userName = session?.profile.display_name || (isAr ? 'مستخدم النظام' : 'System User');

  // Security check: Verify authorization for this lab order chat
  const isAuthorized = isUserAuthorizedForLabOrderChat(userRole, userOrgId, order.organization_id);

  const [messages, setMessages] = useState<LabOrderChatMessage[]>([]);
  const [threadStatus, setThreadStatus] = useState<LabOrderChatStatus>('open');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>('all');
  
  // New Message Form State
  const [newMessageText, setNewMessageText] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<LabOrderChatTopic>('general');
  const [attachmentRefInput, setAttachmentRefInput] = useState('');
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refreshChat = () => {
    if (!isAuthorized) return;
    const msgs = getLabOrderChatMessages(order.id, userRole, userOrgId);
    setMessages(msgs);
    setThreadStatus(getLabOrderChatStatus(order.id));
    markLabOrderMessagesAsRead(order.id, userId, userRole, userOrgId);
  };

  useEffect(() => {
    refreshChat();
  }, [order.id, userRole, userOrgId, isAuthorized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedTopicFilter]);

  const filteredMessages = useMemo(() => {
    if (selectedTopicFilter === 'all') return messages;
    return messages.filter((m) => m.topic === selectedTopicFilter);
  }, [messages, selectedTopicFilter]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!newMessageText.trim()) {
      setErrorMsg(isAr ? 'يرجى كتابة نص الرسالة قبل الإرسال' : 'Please type a message before sending.');
      return;
    }

    setIsSubmitting(true);
    const created = addLabOrderChatMessage({
      lab_order_id: order.id,
      organization_id: order.organization_id,
      sender_id: userId,
      sender_name: userName,
      sender_role: userRole,
      message: newMessageText,
      topic: selectedTopic,
      attachment_ref: attachmentRefInput,
    });

    setIsSubmitting(false);

    if (created) {
      setNewMessageText('');
      setAttachmentRefInput('');
      setShowAttachmentInput(false);
      refreshChat();
    } else {
      setErrorMsg(
        isAr
          ? 'عذراً، فشل إرسال الرسالة. يرجى التأكد من صلاحيات الدخول للمعمل'
          : 'Failed to send message. Please verify authorization.'
      );
    }
  };

  const handleToggleThreadStatus = () => {
    const nextStatus: LabOrderChatStatus = threadStatus === 'open' ? 'resolved' : 'open';
    const ok = updateLabOrderChatStatus(order.id, nextStatus, userRole, userOrgId);
    if (ok) {
      setThreadStatus(nextStatus);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'doctor':
        return {
          label: isAr ? 'طبيب أسنان' : 'Dentist',
          bg: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: <Stethoscope className="w-3 h-3 text-blue-600" />,
        };
      case 'lab_user':
        return {
          label: isAr ? 'فني معمل' : 'Lab Tech',
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          icon: <FlaskConical className="w-3 h-3 text-amber-600" />,
        };
      case 'prosthetic_coordinator':
        return {
          label: isAr ? 'منسق تركيبات' : 'Prosthetic Coordinator',
          bg: 'bg-purple-100 text-purple-900 border-purple-300',
          icon: <User className="w-3 h-3 text-purple-600" />,
        };
      default:
        return {
          label: isAr ? 'موظف المركز' : 'Clinic Staff',
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: <User className="w-3 h-3 text-slate-600" />,
        };
    }
  };

  const getTopicLabel = (topic?: LabOrderChatTopic) => {
    switch (topic) {
      case 'shade':
        return { label: isAr ? 'لون التركيبة (Shade)' : 'Shade', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'material':
        return { label: isAr ? 'خامة التصنيع (Material)' : 'Material', bg: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'design':
        return { label: isAr ? 'التصميم والحدود (Design)' : 'Design', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      case 'tooth_selection':
        return { label: isAr ? 'اختيار الأسنان (Teeth)' : 'Tooth Selection', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'try_in_final':
        return { label: isAr ? 'بروفا / نهائي (Stage)' : 'Try-in/Final', bg: 'bg-sky-50 text-sky-800 border-sky-200' };
      case 'modification':
        return { label: isAr ? 'طلب تعديل (Modification)' : 'Modification', bg: 'bg-rose-50 text-rose-800 border-rose-200' };
      case 'delivery_manufacturing':
        return { label: isAr ? 'تصنيع وشحن (Logistics)' : 'Delivery/Mfg', bg: 'bg-teal-50 text-teal-800 border-teal-200' };
      default:
        return { label: isAr ? 'ملاحظة عامة' : 'General', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full flex flex-col h-[90vh] max-h-[720px] overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md shrink-0">
              <MessageSquare className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">
                  {isAr ? 'محادثة طلب المعمل' : 'Lab Order Technical Chat'}
                </h3>
                <span className="px-2 py-0.5 bg-white/20 text-purple-200 rounded-md font-mono font-bold text-xs">
                  #{order.id.slice(-6)}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    threadStatus === 'open'
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                      : 'bg-slate-500/30 text-slate-300 border-slate-400/30'
                  }`}
                >
                  {threadStatus === 'open'
                    ? isAr
                      ? 'نشطة (Open)'
                      : 'Active (Open)'
                    : isAr
                    ? 'منتهية (Resolved)'
                    : 'Resolved'}
                </span>
              </div>
              <p className="text-xs text-purple-200 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>{isAr ? order.service_name_ar : order.service_name_en}</span>
                {order.teeth.length > 0 && (
                  <span className="font-mono text-amber-300 font-bold">
                    (Teeth: #{order.teeth.join(', #')})
                  </span>
                )}
                {order.lab_name && (
                  <span className="bg-white/15 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                    {order.lab_name}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthorized && (
              <button
                type="button"
                onClick={handleToggleThreadStatus}
                title={isAr ? 'تغيير حالة المحادثة' : 'Toggle Chat Status'}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-purple-100 transition-all border border-white/10"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {threadStatus === 'open'
                    ? isAr
                      ? 'إغلاق المحادثة'
                      : 'Mark Resolved'
                    : isAr
                    ? 'إعادة فتح'
                    : 'Re-open'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security / Authorization Guard */}
        {!isAuthorized ? (
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto border border-red-200">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h4 className="text-base font-bold text-slate-900">
                {isAr ? 'غير مصرح بالوصول للمحادثة الداخلية' : 'Access Restricted to Authorized Staff'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isAr
                  ? 'محادثة المعمل محصورة فقط بالطبيب المعالج، فني معمل التركيبات، ومنسق المعامل بالمركز. غير مسموح للمرضى أو مناديب التوصيل بدخول هذه المحادثة الفنية.'
                  : 'Internal Lab Order communication is restricted exclusively to attending dentists, dental lab technicians, and prosthetic coordinators. Patient and Delivery User access is strictly denied.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all shadow-md"
            >
              {isAr ? 'إغلاق النافذة' : 'Close Window'}
            </button>
          </div>
        ) : (
          <>
            {/* Topic Filter Tabs Bar */}
            <div className="bg-slate-50 border-b border-slate-200 p-2 sm:px-4 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap flex items-center gap-1 me-1">
                <Filter className="w-3 h-3 text-slate-400" />
                {isAr ? 'التصنيف:' : 'Topic:'}
              </span>

              {[
                { id: 'all', label: isAr ? 'الكل' : 'All Topics' },
                { id: 'shade', label: isAr ? 'اللون (Shade)' : 'Shade' },
                { id: 'material', label: isAr ? 'الخامة' : 'Material' },
                { id: 'design', label: isAr ? 'التصميم' : 'Design' },
                { id: 'tooth_selection', label: isAr ? 'الأسنان' : 'Teeth' },
                { id: 'try_in_final', label: isAr ? 'البروفا' : 'Try-in' },
                { id: 'modification', label: isAr ? 'تعديلات' : 'Modifications' },
                { id: 'delivery_manufacturing', label: isAr ? 'التوصيل' : 'Delivery' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedTopicFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedTopicFilter === tab.id
                      ? 'bg-purple-900 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Messages Scrollable Container */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
              {filteredMessages.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto border border-purple-200">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h5 className="text-xs font-bold text-slate-700">
                    {isAr ? 'لا توجد رسائل في هذا التصنيف' : 'No messages found'}
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    {isAr
                      ? 'ابدأ المحادثة الفنية مع معمل الأسنان أو الطبيب بالأسفل'
                      : 'Start the technical lab order discussion below.'}
                  </p>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isMine = msg.sender_id === userId;
                  const roleBadge = getRoleBadge(msg.sender_role);
                  const topicTag = getTopicLabel(msg.topic);

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-1`}
                    >
                      {/* Sender Info Line */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 px-1">
                        <span className="font-bold text-slate-900">{msg.sender_name}</span>
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${roleBadge.bg}`}
                        >
                          {roleBadge.icon}
                          {roleBadge.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Message Bubble Card */}
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-2xs border space-y-2 ${
                          isMine
                            ? 'bg-purple-900 text-white rounded-tr-xs border-purple-800'
                            : 'bg-white text-slate-900 rounded-tl-xs border-slate-200'
                        }`}
                      >
                        {/* Topic Pill */}
                        {msg.topic && (
                          <div className="flex items-center gap-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                isMine
                                  ? 'bg-white/15 text-purple-100 border-white/20'
                                  : topicTag.bg
                              }`}
                            >
                              {topicTag.label}
                            </span>
                          </div>
                        )}

                        {/* Message Content */}
                        <p className="text-xs leading-relaxed whitespace-pre-wrap font-sans">
                          {msg.message}
                        </p>

                        {/* Attachment Reference Badge */}
                        {msg.attachment_ref && (
                          <div
                            className={`flex items-center gap-1.5 p-2 rounded-xl text-[11px] font-mono border ${
                              isMine
                                ? 'bg-white/10 text-purple-100 border-white/15'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}
                          >
                            <Paperclip className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span className="truncate font-bold">{msg.attachment_ref}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div className="bg-red-50 p-2.5 border-t border-red-200 text-red-800 text-xs font-bold flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMsg(null)}
                  className="text-red-600 hover:text-red-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Message Input & Options Form */}
            <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-white border-t border-slate-200 space-y-2 shrink-0">
              
              {/* Optional Topic Picker & Attachment toggle */}
              <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">{isAr ? 'موضوع الرسالة:' : 'Topic:'}</span>
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value as LabOrderChatTopic)}
                    className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-purple-900 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="general">{isAr ? 'عام (General)' : 'General'}</option>
                    <option value="shade">{isAr ? 'لون التركيبة (Shade A1/A2...)' : 'Shade Selection'}</option>
                    <option value="material">{isAr ? 'خامة التصنيع (Zirconia/E-Max)' : 'Material Spec'}</option>
                    <option value="design">{isAr ? 'التصميم والحدود (Margin Design)' : 'Design Request'}</option>
                    <option value="tooth_selection">{isAr ? 'الأسنان والدعامات (Teeth)' : 'Tooth Selection'}</option>
                    <option value="try_in_final">{isAr ? 'بروفا / تسليم نهائي' : 'Try-in / Final'}</option>
                    <option value="modification">{isAr ? 'طلب تعديل (Modification)' : 'Modification'}</option>
                    <option value="delivery_manufacturing">{isAr ? 'التصنيع والتوصيل' : 'Delivery & Mfg'}</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAttachmentInput(!showAttachmentInput)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    showAttachmentInput || attachmentRefInput
                      ? 'bg-purple-100 text-purple-900 border border-purple-300'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>{isAr ? 'مرفق (Scan/File)' : 'Attachment Ref'}</span>
                </button>
              </div>

              {/* Attachment Reference Input Field */}
              {showAttachmentInput && (
                <div className="animate-fadeIn">
                  <input
                    type="text"
                    value={attachmentRefInput}
                    onChange={(e) => setAttachmentRefInput(e.target.value)}
                    placeholder={
                      isAr
                        ? 'أدخل اسم الملف أو الرابط المرجعي (مثال: Maxilla_Scan_3D.stl)'
                        : 'Enter attachment file ref (e.g. Maxilla_Scan_3D.stl or Photo_A2.jpg)'
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              {/* Text Input Row */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder={
                    isAr
                      ? 'اكتب استفسارك أو ملاحظات التصنيع واللون هنا...'
                      : 'Type technical note, shade details, or design questions...'
                  }
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-600 font-sans"
                />

                <button
                  type="submit"
                  disabled={isSubmitting || !newMessageText.trim()}
                  className="px-4 py-2.5 bg-purple-900 hover:bg-purple-950 text-white font-bold text-xs rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>{isAr ? 'إرسال' : 'Send'}</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
