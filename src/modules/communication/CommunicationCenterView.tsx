import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Settings,
  XCircle,
  PhoneCall,
  UserCheck,
  FileText,
  Sliders,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import {
  getStoredWhatsAppLogs,
  retryFailedWhatsAppMessage,
  sendWhatsAppMessage,
  getStoredMessageTemplates,
} from '../../lib/communicationStorage';
import { getStoredNotifications } from '../../lib/notificationStorage';
import { MessageTemplatesModal } from './MessageTemplatesModal';
import { PatientPreferencesModal } from './PatientPreferencesModal';
import { WhatsAppMessageLog, WhatsAppMessageType } from '../../types/communication';
import { getStoredPatients } from '../../lib/patientStorage';

export const CommunicationCenterView: React.FC = () => {
  const { language } = useLanguage();
  const { session, isOrgWideManager } = useAuth();
  const isAr = language === 'ar';

  const orgId = session?.organization?.id || '11111111-1111-1111-1111-111111111111';

  // Tabs & Search State
  const [activeTab, setActiveTab] = useState<'whatsapp_logs' | 'templates' | 'notifications'>('whatsapp_logs');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modals
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [selectedPatientForPrefs, setSelectedPatientForPrefs] = useState<{ id: string; name: string } | null>(null);
  const [selectedMessageLog, setSelectedMessageLog] = useState<WhatsAppMessageLog | null>(null);

  // Custom Quick Send State
  const [isQuickSendOpen, setIsQuickSendOpen] = useState(false);
  const [quickPatientId, setQuickPatientId] = useState('');
  const [quickMessageType, setQuickMessageType] = useState<WhatsAppMessageType>('custom_operational');
  const [quickCustomBody, setQuickCustomBody] = useState('');
  const [quickSendMsg, setQuickSendMsg] = useState<string | null>(null);

  // Data Queries
  const logs = useMemo(() => getStoredWhatsAppLogs(orgId), [orgId]);
  const templates = useMemo(() => getStoredMessageTemplates(orgId), [orgId]);
  const patients = useMemo(() => getStoredPatients(), []);
  const notifications = useMemo(() => getStoredNotifications(), []);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (statusFilter !== 'all' && log.delivery_state !== statusFilter) return false;
      if (typeFilter !== 'all' && log.message_type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = log.recipient_name.toLowerCase().includes(q);
        const matchMobile = log.recipient_mobile.includes(q);
        const matchBody = log.rendered_body.toLowerCase().includes(q);
        return matchName || matchMobile || matchBody;
      }
      return true;
    });
  }, [logs, statusFilter, typeFilter, searchQuery]);

  const handleRetry = async (logId: string) => {
    await retryFailedWhatsAppMessage(logId, orgId);
    window.location.reload();
  };

  const handleQuickSendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find((p) => p.id === quickPatientId);
    if (!pat) return;

    const res = await sendWhatsAppMessage({
      organizationId: orgId,
      branchId: (pat as any).branch_id || '11111111-1111-1111-1111-111111111111',
      recipientPatientId: pat.id,
      recipientMobile: pat.primary_mobile,
      recipientName: `${pat.first_name} ${pat.last_name}`,
      messageType: quickMessageType,
      language: (pat.preferred_language as 'ar' | 'en') || 'ar',
      customBody: quickCustomBody || undefined,
      idempotencyKey: `custom_${Date.now()}_${pat.id}`,
      createdByUserId: session?.profile?.id,
    });

    if (res.success) {
      setQuickSendMsg(isAr ? 'تم إرسال الرسالة بنجاح' : 'Message dispatched successfully');
      setTimeout(() => {
        setQuickSendMsg(null);
        setIsQuickSendOpen(false);
      }, 2000);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isAr ? 'مركز التواصل الموحد والواتساب' : 'Unified Communication & WhatsApp Center'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAr
                ? 'إدارة رسائل المواعيد والتأكيدات والتنبيهات المباشرة عبر الواتساب والإشعارات الموحدة'
                : 'Manage appointments, reminders, and notifications via WhatsApp & unified feeds'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isOrgWideManager && (
            <button
              onClick={() => setIsTemplatesModalOpen(true)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 border border-slate-200 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              {isAr ? 'إدارة القوالب' : 'Manage Templates'}
            </button>
          )}

          <button
            onClick={() => setIsQuickSendOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors"
          >
            <Send className="w-4 h-4" />
            {isAr ? 'إرسال رسالة مباشرة' : 'Quick Send WhatsApp'}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-2 rounded-t-2xl">
        <button
          onClick={() => setActiveTab('whatsapp_logs')}
          className={`pb-3 px-5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'whatsapp_logs'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          {isAr ? 'سجل رسائل الواتساب' : 'WhatsApp Delivery Logs'}
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full">
            {logs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-3 px-5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'templates'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          {isAr ? 'قوالب الرسائل المعتمدة' : 'Message Templates'}
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-extrabold rounded-full">
            {templates.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 px-5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'notifications'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sliders className="w-4 h-4" />
          {isAr ? 'سجل إشعارات النظام' : 'System Notifications Feed'}
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-extrabold rounded-full">
            {notifications.length}
          </span>
        </button>
      </div>

      {/* Tab 1: WhatsApp Logs */}
      {activeTab === 'whatsapp_logs' && (
        <div className="bg-white p-6 rounded-b-2xl border border-slate-200 shadow-xs space-y-4">
          {/* Controls & Search Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث باسم المريض، الجوال، أو محتوى الرسالة...' : 'Search by patient name, mobile, or body...'}
                className="w-full text-xs pr-9 pl-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-medium"
              >
                <option value="all">{isAr ? 'جميع الحالات' : 'All Delivery States'}</option>
                <option value="delivered">{isAr ? 'تم التسليم (Delivered)' : 'Delivered'}</option>
                <option value="sent">{isAr ? 'تم الإرسال (Sent)' : 'Sent'}</option>
                <option value="queued">{isAr ? 'قيد الإرسال (Queued)' : 'Queued'}</option>
                <option value="failed">{isAr ? 'فشل الإرسال (Failed)' : 'Failed'}</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-medium"
              >
                <option value="all">{isAr ? 'جميع أنواع الرسائل' : 'All Message Types'}</option>
                <option value="appointment_confirmation">{isAr ? 'تأكيد موعد' : 'Appointment Confirm'}</option>
                <option value="appointment_reminder_24h">{isAr ? 'تذكير 24 ساعة' : '24h Reminder'}</option>
                <option value="recall_notice">{isAr ? 'متابعة دورية' : 'Recall Notice'}</option>
                <option value="payment_receipt">{isAr ? 'إيصال سداد' : 'Payment Receipt'}</option>
                <option value="lab_prosthetic_update">{isAr ? 'تحديث معمل' : 'Lab Update'}</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="p-3 font-bold">{isAr ? 'المستلم' : 'Recipient'}</th>
                  <th className="p-3 font-bold">{isAr ? 'نوع الرسالة' : 'Type'}</th>
                  <th className="p-3 font-bold">{isAr ? 'محتوى الرسالة' : 'Message Body'}</th>
                  <th className="p-3 font-bold">{isAr ? 'حالة التسليم' : 'Status'}</th>
                  <th className="p-3 font-bold">{isAr ? 'التاريخ والوقت' : 'Timestamp'}</th>
                  <th className="p-3 font-bold text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{log.recipient_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{log.recipient_mobile}</div>
                    </td>

                    <td className="p-3">
                      <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-lg">
                        {log.message_type}
                      </span>
                    </td>

                    <td className="p-3 max-w-xs">
                      <div className="truncate text-slate-700 font-sans" title={log.rendered_body}>
                        {log.rendered_body}
                      </div>
                    </td>

                    <td className="p-3">
                      {log.delivery_state === 'delivered' && (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-200 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {isAr ? 'تم التسليم' : 'Delivered'}
                        </span>
                      )}
                      {log.delivery_state === 'sent' && (
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-200 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          {isAr ? 'تم الإرسال' : 'Sent'}
                        </span>
                      )}
                      {log.delivery_state === 'queued' && (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg border border-amber-200 flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3 text-amber-600" />
                          {isAr ? 'قيد الإرسال' : 'Queued'}
                        </span>
                      )}
                      {log.delivery_state === 'failed' && (
                        <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-lg border border-rose-200 flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          {isAr ? 'فشل الإرسال' : 'Failed'}
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-slate-500 font-mono text-[10px]">
                      {new Date(log.created_at).toLocaleString('ar-EG')}
                    </td>

                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedMessageLog(log)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          title={isAr ? 'معاينة التفاصيل' : 'Preview Details'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {log.delivery_state === 'failed' && (
                          <button
                            onClick={() => handleRetry(log.id)}
                            className="px-2.5 py-1 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center gap-1 shadow-xs"
                          >
                            <RefreshCw className="w-3 h-3" />
                            {isAr ? 'إعادة المحاولة' : 'Retry'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Message Templates */}
      {activeTab === 'templates' && (
        <div className="bg-white p-6 rounded-b-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tmpl) => (
              <div key={tmpl.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">{isAr ? tmpl.name_ar : tmpl.name_en}</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                    {tmpl.type}
                  </span>
                </div>
                <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-100 dir-rtl font-sans leading-relaxed">
                  {tmpl.body_ar}
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {tmpl.allowed_placeholders.map((ph) => (
                    <span key={ph} className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[9px] font-mono rounded-md">
                      &#123;{ph}&#125;
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <MessageTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
      />

      {/* Message Preview Drawer */}
      {selectedMessageLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-xs font-bold">{isAr ? 'معاينة محتوى الرسالة' : 'WhatsApp Message Preview'}</h3>
              <button onClick={() => setSelectedMessageLog(null)} className="text-slate-300 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="text-xs font-bold text-slate-800">
                {selectedMessageLog.recipient_name} ({selectedMessageLog.recipient_mobile})
              </div>
              <div className="p-4 bg-emerald-50 text-emerald-950 text-xs rounded-xl border border-emerald-200 font-sans leading-relaxed">
                {selectedMessageLog.rendered_body}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Key: {selectedMessageLog.idempotency_key}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
