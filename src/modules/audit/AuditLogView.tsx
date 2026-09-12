import React, { useState, useEffect } from 'react';
import { FileText, Shield, Clock, User, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getStoredAuditLogs } from '../../lib/storage';
import { AuditLog } from '../../types';

export const AuditLogView: React.FC = () => {
  const { session } = useAuth();
  const { t, language } = useLanguage();

  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (session) {
      setLogs(getStoredAuditLogs(session.profile));
    }
  }, [session]);

  if (!session) return null;

  const getActionBadge = (action: string) => {
    if (action.includes('login.success')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (action.includes('login.failure') || action.includes('denied')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (action.includes('logout')) {
      return 'bg-slate-100 text-slate-700 border-slate-200';
    }
    if (action.includes('create')) {
      return 'bg-teal-50 text-teal-700 border-teal-200';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{t.audit.title}</h1>
            <p className="text-xs text-slate-500">{t.audit.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-teal-300 text-xs font-mono font-medium">
          <Lock className="w-3.5 h-3.5 text-teal-400" />
          <span>Append-Only Immutability Enforced</span>
        </div>
      </div>

      {/* Immutability Notice Box */}
      <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 flex items-start gap-3 text-xs text-teal-900">
        <Shield className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">
            {language === 'ar'
              ? 'الضمانات الأمنية لسجل الرقابة بالمرحلة الأولى:'
              : 'Phase 1 Audit Log Immutability & Security Architecture:'}
          </p>
          <p className="text-[11px] text-teal-800 leading-relaxed">
            {language === 'ar'
              ? 'يتم فرض عدم القابلية للتعديل أو الحذف عبر تريجر قاعدة بيانات PostgreSQL المباشر trg_audit_logs_immutable. لا يُمنح أي مستخدم داخلي صلاحيات UPDATE أو DELETE على سجلات الأمان.'
              : 'Enforced via database trigger enforce_audit_log_immutability(). Neither Center Managers nor system users can delete or alter recorded audit entries.'}
          </p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-6 py-3.5 text-start font-semibold">{t.audit.time}</th>
                <th className="px-6 py-3.5 text-start font-semibold">{t.audit.action}</th>
                <th className="px-6 py-3.5 text-start font-semibold">{t.audit.actor}</th>
                <th className="px-6 py-3.5 text-start font-semibold">{t.audit.entity}</th>
                <th className="px-6 py-3.5 text-start font-semibold">{t.audit.metadata}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(log.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Cairo' })}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${getActionBadge(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{log.actor_email || log.actor_user_id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-mono text-[11px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {log.entity_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-[11px] font-mono">
                    {log.metadata ? (
                      <span className="truncate inline-block max-w-xs text-slate-600" title={JSON.stringify(log.metadata)}>
                        {JSON.stringify(log.metadata)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
