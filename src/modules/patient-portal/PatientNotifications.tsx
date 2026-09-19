import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientAuth } from './PatientAuthContext';
import {
  Bell,
  Check,
  CheckCheck,
  Calendar,
  ShieldCheck,
  FileCheck,
  Activity,
  CreditCard,
  AlertCircle,
  Inbox,
  Sparkles,
} from 'lucide-react';
import {
  getNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  UserNotificationContext,
} from '../../lib/notificationStorage';
import { NotificationItem, NotificationType } from '../../types/notification';

export const PatientNotifications: React.FC = () => {
  const { t, language } = useLanguage();
  const { session } = usePatientAuth();
  const patient = session?.selectedPatient;
  const isRtl = language === 'ar';

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);

  const patientContext: UserNotificationContext | null =
    patient && session?.organization
      ? {
          kind: 'patient',
          patient,
          organization_id: session.organization.id,
        }
      : null;

  const refresh = () => {
    if (!patientContext) return;
    setLoading(true);
    try {
      const items = getNotificationsForUser(patientContext);
      setNotifications(items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [patient?.id]);

  if (!patient || !patientContext) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        {isRtl ? 'يرجى اختيار ملف المريض أولاً.' : 'Please select a patient profile first.'}
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayedNotifications = notifications.filter((n) =>
    filter === 'unread' ? !n.read : true
  );

  const handleMarkRead = (id: string) => {
    if (patientContext) {
      markNotificationAsRead(id, patientContext);
      refresh();
    }
  };

  const handleMarkAllRead = () => {
    if (patientContext) {
      markAllNotificationsAsRead(patientContext);
      refresh();
    }
  };

  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case 'appointment_event':
        return { icon: Calendar, color: 'text-blue-600 bg-blue-100' };
      case 'consent_required':
        return { icon: ShieldCheck, color: 'text-amber-600 bg-amber-100' };
      case 'investigation_result':
        return { icon: Activity, color: 'text-purple-600 bg-purple-100' };
      case 'payment_invoice':
        return { icon: CreditCard, color: 'text-emerald-600 bg-emerald-100' };
      default:
        return { icon: Sparkles, color: 'text-teal-600 bg-teal-100' };
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

      if (diffMinutes < 1) return isRtl ? 'الآن' : 'Just now';
      if (diffMinutes < 60)
        return isRtl ? `منذ ${diffMinutes} دقيقة` : `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24)
        return isRtl ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return isRtl ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Page Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {t.patientPortal.notifications}
            </h2>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-rose-100 text-rose-800 rounded-full">
                {unreadCount} {isRtl ? 'جديد' : 'new'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            {isRtl
              ? 'التنبيهات والرسائل الإدارية الخاصة بملفك الطبي ورعاية أسنانك'
              : 'Administrative and medical notifications for your patient profile'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            id="btn-patient-mark-all-read"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition shrink-0"
          >
            <CheckCheck className="w-4 h-4 text-teal-600" />
            <span>{isRtl ? 'تحديد الكل كمقروء' : 'Mark all as read'}</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-xl w-fit text-xs font-bold text-slate-600">
        <button
          onClick={() => setFilter('all')}
          id="btn-patient-filter-all"
          className={`px-4 py-1.5 rounded-lg transition ${
            filter === 'all'
              ? 'bg-white text-slate-900 shadow-xs font-extrabold'
              : 'hover:text-slate-900'
          }`}
        >
          {isRtl ? 'جميع الإشعارات' : 'All Notifications'} ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          id="btn-patient-filter-unread"
          className={`px-4 py-1.5 rounded-lg transition ${
            filter === 'unread'
              ? 'bg-white text-slate-900 shadow-xs font-extrabold'
              : 'hover:text-slate-900'
          }`}
        >
          {isRtl ? 'غير المقروءة' : 'Unread'} ({unreadCount})
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <span>{isRtl ? 'جاري تحميل الإشعارات...' : 'Loading notifications...'}</span>
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 flex flex-col items-center gap-2">
            <Inbox className="w-10 h-10 text-slate-300" />
            <span className="font-semibold text-slate-700">
              {filter === 'unread'
                ? isRtl
                  ? 'لا توجد إشعارات غير مقروءة'
                  : 'No unread notifications'
                : t.patientPortal.noNotifications}
            </span>
          </div>
        ) : (
          displayedNotifications.map((notif) => {
            const { icon: Icon, color } = getIconForType(notif.type);
            return (
              <div
                key={notif.id}
                className={`p-4 rounded-2xl border transition shadow-xs flex items-start gap-4 ${
                  !notif.read
                    ? 'bg-teal-50/50 border-teal-200'
                    : 'bg-white border-slate-200/80'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">
                      {isRtl ? notif.title_ar : notif.title_en}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">
                      {formatTime(notif.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {isRtl ? notif.message_ar : notif.message_en}
                  </p>
                </div>

                {!notif.read && (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    title={isRtl ? 'تحديد كمقروء' : 'Mark as read'}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-100/60 transition shrink-0"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
