import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientAuth } from './PatientAuthContext';
import { routeAIQuery } from '../../lib/ai/aiRouter';
import { AISource } from '../../lib/ai/types';
import { DEFAULT_EGYPT_ORG, DEFAULT_BRANCHES } from '../../lib/storage';
import {
  createHumanEscalation,
  getEscalationsForUser,
  getEscalationWithReplies,
  addEscalationReply,
} from '../../lib/escalationStorage';
import { HumanEscalation, EscalationReply } from '../../types/escalation';
import {
  Sparkles,
  Send,
  Trash2,
  RotateCcw,
  Bot,
  User,
  Database,
  Cpu,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  Stethoscope,
  FileText,
  HelpCircle,
  Clock,
  CheckCircle2,
  UserCheck,
  MessageSquare,
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'staff';
  text: string;
  timestamp: string;
  source?: AISource;
  isMedicalEscalation?: boolean;
  status?: 'sending' | 'sent' | 'error';
  error?: string;
  category?: string;
  escalationId?: string;
  escalationStatus?: string;
  assignedStaffName?: string;
}

export const PatientAIChat: React.FC = () => {
  const { language } = useLanguage();
  const { session } = usePatientAuth();
  const isRtl = language === 'ar';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [failedMessage, setFailedMessage] = useState<{ id: string; prompt: string } | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentPatient = session?.selectedPatient;

  // Initialize in-memory session welcome message on mount / patient switch (No localStorage used for privacy)
  useEffect(() => {
    if (!currentPatient) return;
    const welcomeMsg: ChatMessage = {
      id: 'welcome_' + Date.now(),
      sender: 'assistant',
      text:
        language === 'ar'
          ? `مرحباً بك يا ${currentPatient.first_name}! 👋 أنا المساعد الذكي لمركز الأسنان. كيف يمكنني مساعدتك اليوم؟ يمكنك اختيار إحدى الأسئلة السريعة بالأسفل أو كتابة استفسارك.`
          : `Welcome ${currentPatient.first_name}! 👋 I am the Clinic AI Assistant. How can I help you today? Feel free to use the quick actions below or type your query.`,
      timestamp: new Date().toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      source: 'database',
      status: 'sent',
    };
    setMessages([welcomeMsg]);
  }, [currentPatient?.id, language]);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!session || !currentPatient) return null;

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputText).trim();
    if (!textToSend || isLoading) return;

    const userMsgId = 'usr_' + Date.now();
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: 'sent',
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputText('');
    setIsLoading(true);
    setFailedMessage(null);

    const authenticatedPatientId = session.authenticatedPatient.id;
    const sessionToken = `token_${authenticatedPatientId}`;

    const userContext = {
      organizationId: session.organization.id || DEFAULT_EGYPT_ORG.id,
      branchId: DEFAULT_BRANCHES[0].id,
      patientId: currentPatient.id,
      isAuthenticated: true,
    };

    try {
      // Attempt endpoint call first with Authorization Bearer header
      let aiResult;
      try {
        const response = await fetch('/api/ai/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            prompt: textToSend,
            targetPatientId: currentPatient.id,
            organizationId: session.organization.id || DEFAULT_EGYPT_ORG.id,
          }),
        });
        if (response.ok) {
          aiResult = await response.json();
        }
      } catch {
        // Fallback to client-side AI router
      }

      if (!aiResult) {
        aiResult = await routeAIQuery({
          prompt: textToSend,
          context: userContext,
        });
      }

      const botMsg: ChatMessage = {
        id: 'bot_' + Date.now(),
        sender: 'assistant',
        text: aiResult.text,
        timestamp: new Date().toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        source: aiResult.source,
        isMedicalEscalation: aiResult.isMedicalEscalation,
        status: 'sent',
        category: aiResult.category,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsgId = 'err_' + Date.now();
      const botErrorMsg: ChatMessage = {
        id: errorMsgId,
        sender: 'assistant',
        text:
          language === 'ar'
            ? 'تعذر الاتصال بمركز الخدمة الذكية حالياً. يرجى إعادة المحاولة.'
            : 'Could not connect to the AI Assistant. Please retry.',
        timestamp: new Date().toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        status: 'error',
        error: err?.message || 'Network error',
      };
      setMessages((prev) => [...prev, botErrorMsg]);
      setFailedMessage({ id: errorMsgId, prompt: textToSend });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (failedMessage) {
      handleSendMessage(failedMessage.prompt);
    }
  };

  const handleEscalateToStaff = (promptText: string, msgId: string) => {
    if (!currentPatient) return;

    const newEscalation = createHumanEscalation({
      organization_id: currentPatient.organization_id || DEFAULT_EGYPT_ORG.id,
      branch_id: DEFAULT_BRANCHES[0]?.id || null,
      patient_id: currentPatient.id,
      chat_message_id: msgId,
      subject: promptText.substring(0, 60),
      original_prompt: promptText,
      category: 'medical_symptom',
      priority: 'urgent',
    });

    const confirmationMsg: ChatMessage = {
      id: 'esc_confirm_' + Date.now(),
      sender: 'assistant',
      text:
        language === 'ar'
          ? `تم تصعيد طلبك بنجاح للستاف الطبي ومسؤول العيادة (رقم الطلب: #${newEscalation.id.slice(-6)}).\nحالة الطلب الآن: بانتظار استلام الطبيب المختص أو موظف الاستقبال.`
          : `Your request has been escalated to human clinic staff (#${newEscalation.id.slice(-6)}).\nStatus: Pending response from medical team.`,
      timestamp: new Date().toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isMedicalEscalation: true,
      escalationId: newEscalation.id,
      escalationStatus: newEscalation.status,
    };

    setMessages((prev) => [...prev, confirmationMsg]);
  };

  const handleClearChat = () => {
    const welcomeMsg: ChatMessage = {
      id: 'welcome_' + Date.now(),
      sender: 'assistant',
      text:
        language === 'ar'
          ? `تم مسح المحادثة. أهلاً بك يا ${currentPatient.first_name}! كيف يمكنني مساعدتك الآن؟`
          : `Chat cleared. Welcome ${currentPatient.first_name}! How can I help you now?`,
      timestamp: new Date().toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      source: 'database',
      status: 'sent',
    };
    setMessages([welcomeMsg]);
    setFailedMessage(null);
  };

  const quickActions = [
    {
      id: 'qa_booking',
      label: language === 'ar' ? 'حجز موعد جديد' : 'Booking',
      icon: Calendar,
      prompt: language === 'ar' ? 'كيف احجز موعد جديد؟' : 'How can I book a new appointment?',
    },
    {
      id: 'qa_treatment',
      label: language === 'ar' ? 'خطة العلاج' : 'My Treatment',
      icon: Stethoscope,
      prompt: language === 'ar' ? 'ما هي خطة العلاج الخاصة بي؟' : 'What is my treatment plan?',
    },
    {
      id: 'qa_account',
      label: language === 'ar' ? 'حسابي وبياناتي' : 'My Account',
      icon: User,
      prompt: language === 'ar' ? 'أريد استعراض بيانات حسابي ورقم المريض' : 'Show my account details and patient code',
    },
    {
      id: 'qa_next_visit',
      label: language === 'ar' ? 'الموعد القادم' : 'Next Visit',
      icon: Clock,
      prompt: language === 'ar' ? 'ما هو موعد زيارتي القادمة؟' : 'When is my next appointment?',
    },
    {
      id: 'qa_tasks',
      label: language === 'ar' ? 'المهام المطلوبة' : 'Required Tasks',
      icon: FileText,
      prompt: language === 'ar' ? 'ما هي المهام والمتابعات المطلوبة مني؟' : 'What are my required tasks or consents?',
    },
    {
      id: 'qa_complaints',
      label: language === 'ar' ? 'الشكاوى والاستفسارات' : 'Complaints & Support',
      icon: HelpCircle,
      prompt: language === 'ar' ? 'كيف يمكنني تقديم شكوى أو تذكرة دعم؟' : 'How do I submit a complaint or support ticket?',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[650px] max-w-4xl mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Chat Header */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-400/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-white">
                {language === 'ar' ? 'المساعد الذكي لبوابة المريض' : 'Patient Portal AI Assistant'}
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/30 text-teal-300 border border-teal-400/30">
                {language === 'ar' ? 'بيانات مؤمنة' : 'Secure Data'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {language === 'ar'
                ? `المريض النشط: ${currentPatient.first_name} ${currentPatient.last_name} (${currentPatient.patient_code})`
                : `Active Patient: ${currentPatient.first_name} ${currentPatient.last_name} (${currentPatient.patient_code})`}
            </p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          id="btn-clear-ai-chat"
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          title={language === 'ar' ? 'مسح المحادثة' : 'Clear Conversation'}
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">{language === 'ar' ? 'مسح المحادثة' : 'Clear Chat'}</span>
        </button>
      </div>

      {/* Quick Action Chips Bar */}
      <div className="bg-slate-50 border-b border-slate-200 p-3 overflow-x-auto no-scrollbar flex items-center gap-2">
        <span className="text-xs font-bold text-slate-500 whitespace-nowrap shrink-0 px-1">
          {language === 'ar' ? 'أسئلة سريعة:' : 'Quick Actions:'}
        </span>
        {quickActions.map((qa) => {
          const Icon = qa.icon;
          return (
            <button
              key={qa.id}
              onClick={() => handleSendMessage(qa.prompt)}
              id={`quick-action-${qa.id}`}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-300 text-xs font-semibold whitespace-nowrap transition-all shadow-2xs shrink-0 disabled:opacity-50"
            >
              <Icon className="w-3.5 h-3.5 text-teal-600" />
              <span>{qa.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border text-xs font-bold ${
                  isUser
                    ? 'bg-teal-600 text-white border-teal-700'
                    : 'bg-slate-900 text-teal-400 border-slate-800'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Content Bubble */}
              <div className={`max-w-[82%] sm:max-w-[75%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Source Badge for Assistant Responses */}
                {!isUser && msg.source && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    {msg.source === 'database' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Database className="w-3 h-3 text-emerald-600" />
                        <span>{language === 'ar' ? 'بيانات العيادة المعتمدة' : 'Clinic Database'}</span>
                      </span>
                    )}

                    {(msg.source === 'gemini_primary' || msg.source === 'gemini_fallback') && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        <span>{language === 'ar' ? 'ذكاء اصطناعي (Gemini)' : 'AI Assistant'}</span>
                      </span>
                    )}

                    {msg.source === 'fallback_system' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                        <Cpu className="w-3 h-3 text-slate-500" />
                        <span>{language === 'ar' ? 'نظام العيادة' : 'Clinic System'}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Bubble Frame */}
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-teal-600 text-white rounded-tr-none shadow-xs'
                      : msg.status === 'error'
                      ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-tl-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-2xs'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Medical Escalation Warning Banner */}
                {msg.isMedicalEscalation && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start justify-between gap-2 mt-2">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">
                          {language === 'ar' ? 'تنبيه استشارة طبية عاجلة:' : 'Urgent Medical Advisory:'}
                        </span>
                        <span>
                          {language === 'ar'
                            ? 'تم إخطار فريق الاستقبال والتمريض بالعيادة للبدء في ترتيب الاستشارة الطبية العاجلة للحفاظ على سلامتكم.'
                            : 'Clinic reception and nursing staff have been notified regarding these urgent medical symptoms.'}
                        </span>
                      </div>
                    </div>

                    {!msg.escalationId && (
                      <button
                        onClick={() => handleEscalateToStaff(msg.text, msg.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shrink-0 flex items-center gap-1 shadow-2xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'متابعة بشري' : 'Human Reply'}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Escalation Button for regular assistant messages */}
                {!isUser && !msg.isMedicalEscalation && msg.status !== 'error' && (
                  <div className="pt-1 text-start">
                    <button
                      onClick={() => handleEscalateToStaff(msg.text, msg.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium inline-flex items-center gap-1 transition-colors border border-slate-200"
                    >
                      <UserCheck className="w-3 h-3 text-slate-500" />
                      <span>{language === 'ar' ? 'طلب رد مباشر من مسؤول العيادة' : 'Escalate to Clinic Staff'}</span>
                    </button>
                  </div>
                )}

                {/* Retry Control for Failed Messages */}
                {msg.status === 'error' && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleRetry}
                      id="btn-retry-failed-chat"
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{language === 'ar' ? 'إعادة المحاولة' : 'Retry'}</span>
                    </button>
                  </div>
                )}

                {/* Message Timestamp */}
                <span className={`text-[10px] text-slate-400 block px-1 ${isUser ? 'text-end' : 'text-start'}`}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {/* Typing Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-teal-400 border border-slate-800 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="p-3.5 rounded-2xl rounded-tl-none bg-white border border-slate-200 text-slate-500 text-xs flex items-center gap-2 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
              <span>{language === 'ar' ? 'جاري البحث والتحليل...' : 'Analyzing query...'}</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Footer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            language === 'ar'
              ? 'اكتب سؤالك هنا (مثال: اسعار الحشو، موعدي القادم، خطة العلاج)...'
              : 'Type your question here (e.g., filling price, my next appointment, treatment plan)...'
          }
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none disabled:opacity-50"
        />

        <button
          type="submit"
          id="btn-send-ai-message"
          disabled={!inputText.trim() || isLoading}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs shrink-0"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">{language === 'ar' ? 'إرسال' : 'Send'}</span>
        </button>
      </form>
    </div>
  );
};
