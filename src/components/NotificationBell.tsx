import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Calendar,
  ShieldCheck,
  FileCheck,
  Activity,
  Truck,
  FlaskConical,
  CreditCard,
  FileText,
  AlertCircle,
  Inbox,
  X,
} from 'lucide-react';
import { useAuth } from '../modules/auth/AuthContext';
import { useLanguage } from '../modules/i18n/LanguageContext';
import {
  getNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  UserNotificationContext,
} from '../lib/notificationStorage';
import { NotificationItem, NotificationType } from '../types/notification';

export const NotificationBell: React.FC = () => {
  const { session, accessibleBranches } = useAuth();
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isRtl = language === 'ar';

  // Build current staff user context
  const userContext: UserNotificationContext | null = session
    ? {
        kind: 'staff',
        profile: session.profile,
        accessibleBranchIds: accessibleBranches.map((b) => b.id),
      }
    : null;

  const refreshNotifications = () => {
    if (!userContext) return;
    setLoading(true);
    try {
      const items = getNotificationsForUser(userContext);
      setNotifications(items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [session?.profile.id]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!session || !userContext) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const displayedNotifications = notifications.filter((n) =>
    filter === 'unread' ? !n.read : true
  );

  const handleMarkRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (userContext) {
      markNotificationAsRead(id, userContext);
      refreshNotifications();
    }
  };

  const handleMarkAllRead = () => {
    if (userContext) {
      markAllNotificationsAsRead(userContext);
      refreshNotifications();
    }
  };

  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case 'appointment_event':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'consent_required':
        return <ShieldCheck className="w-4 h-4 text-amber-600" />;
      case 'reception_task':
        return <FileCheck className="w-4 h-4 text-teal-600" />;
      case 'investigation_result':
        return <Activity className="w-4 h-4 text-purple-600" />;
      case 'referral_created':
        return <FileText className="w-4 h-4 text-indigo-600" />;
      case 'insurance_approval':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'lab_order_status':
        return <FlaskConical className="w-4 h-4 text-cyan-600" />;
      case 'delivery_status':
        return <Truck className="w-4 h-4 text-orange-600" />;
      case 'payment_invoice':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-600" />;
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
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) refreshNotifications();
        }}
        id="btn-notification-bell"
        className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        title={isRtl ? 'الإشعارات' : 'Notifications'}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          id="notification-popover-panel"
          className={`absolute top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150 ${
            isRtl ? 'left-0' : 'right-0'
          }`}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-teal-600" />
              <h3 className="font-bold text-sm text-slate-900">
                {isRtl ? 'الإشعارات والتنبيهات' : 'Notifications'}
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-bold bg-teal-100 text-teal-800 rounded-full">
                  {unreadCount} {isRtl ? 'جديد' : 'new'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  id="btn-mark-all-read"
                  className="flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 hover:bg-teal-50 px-2 py-1 rounded transition"
                  title={isRtl ? 'تحديد الكل كمقروء' : 'Mark all as read'}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {isRtl ? 'قراءة الكل' : 'Mark all read'}
                  </span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-slate-200 bg-white text-xs font-semibold px-3 py-1.5 gap-2">
            <button
              onClick={() => setFilter('all')}
              id="filter-notif-all"
              className={`px-3 py-1 rounded-lg transition ${
                filter === 'all'
                  ? 'bg-teal-50 text-teal-800 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {isRtl ? 'الكل' : 'All'} ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              id="filter-notif-unread"
              className={`px-3 py-1 rounded-lg transition ${
                filter === 'unread'
                  ? 'bg-teal-50 text-teal-800 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {isRtl ? 'غير مقروء' : 'Unread'} ({unreadCount})
            </button>
          </div>

          {/* Notifications Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                <span>{isRtl ? 'جاري تحميل الإشعارات...' : 'Loading notifications...'}</span>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <Inbox className="w-8 h-8 text-slate-300" />
                <span className="font-medium text-slate-600">
                  {filter === 'unread'
                    ? isRtl
                      ? 'لا توجد إشعارات غير مقروءة'
                      : 'No unread notifications'
                    : isRtl
                    ? 'لا توجد إشعارات حالياً'
                    : 'No notifications available'}
                </span>
              </div>
            ) : (
              displayedNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3.5 flex items-start gap-3 transition hover:bg-slate-50 ${
                    !notif.read ? 'bg-teal-50/40' : 'bg-white'
                  }`}
                >
                  <div className="p-2 bg-slate-100 rounded-xl shrink-0 mt-0.5">
                    {getIconForType(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {isRtl ? notif.title_ar : notif.title_en}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatTime(notif.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {isRtl ? notif.message_ar : notif.message_en}
                    </p>
                  </div>

                  {!notif.read && (
                    <button
                      onClick={(e) => handleMarkRead(notif.id, e)}
                      title={isRtl ? 'تحديد كمقروء' : 'Mark as read'}
                      className="p-1 rounded text-slate-400 hover:text-teal-600 hover:bg-teal-50 shrink-0 transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500 font-medium">
            {isRtl
              ? 'نظام التنبيهات المركزية موحد عبر المؤسسة'
              : 'Unified Central Notification System'}
          </div>
        </div>
      )}
    </div>
  );
};
