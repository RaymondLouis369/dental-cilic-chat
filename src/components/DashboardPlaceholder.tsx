import React from 'react';
import { Building2, GitBranch, Users, ShieldCheck, MapPin, Globe, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../modules/auth/AuthContext';
import { useLanguage } from '../modules/i18n/LanguageContext';
import { RoleBadge } from '../modules/navigation/RoleBadge';

export const DashboardPlaceholder: React.FC = () => {
  const { session, isOrgWideManager, accessibleBranches } = useAuth();
  const { t, language } = useLanguage();

  if (!session) return null;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-linear-to-r from-teal-800 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-700/60 border border-teal-500/30 text-teal-100 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>PHASE 01 — FOUNDATION</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {language === 'ar'
              ? `أهلاً بك، ${session.profile.display_name}`
              : `Welcome, ${session.profile.display_name}`}
          </h1>

          <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed">
            {language === 'ar'
              ? 'الأساس الأمني والتقني لمنصة إدارة عيادات ومراكز طب الأسنان في جمهورية مصر العربية. يدعم العزل الكامل بين المؤسسات والفروع وسياسات RLS وسجل الرقابة غير القابل للتعديل.'
              : 'The secure, multi-tenant foundation for dental clinics and dental centers in Egypt. Featuring strict organization isolation, branch scoping, RLS policies, and immutable audit logs.'}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
            <RoleBadge roleKey={session.role.key} className="bg-white/10 text-white border-white/20" />
            <span className="flex items-center gap-1 text-teal-200">
              <MapPin className="w-3.5 h-3.5" />
              {isOrgWideManager
                ? t.auth.orgWideAccess
                : `${t.auth.branchScopedAccess} (${accessibleBranches.map((b) => b.name).join(', ')})`}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {language === 'ar' ? 'المؤسسة الطبية' : 'Organization'}
            </span>
            <div className="text-sm font-bold text-slate-900 truncate">
              {session.organization.name}
            </div>
            <span className="text-[10px] text-teal-600 font-medium">
              {session.organization.country} • {session.organization.currency}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <GitBranch className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {language === 'ar' ? 'الفروع المتاحة لك' : 'Accessible Branches'}
            </span>
            <div className="text-lg font-bold text-slate-900">
              {isOrgWideManager ? '3 / 3 (All)' : `${accessibleBranches.length} Branch`}
            </div>
            <span className="text-[10px] text-indigo-600 font-medium">
              {isOrgWideManager ? 'Cairo, Alex, Giza' : accessibleBranches.map((b) => b.city).join(', ')}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {language === 'ar' ? 'الأدوار المعتمدة' : 'Internal Roles'}
            </span>
            <div className="text-lg font-bold text-slate-900">7 Active Roles</div>
            <span className="text-[10px] text-purple-600 font-medium">
              Doctor, Reception, Lab, etc.
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {language === 'ar' ? 'حالة الأمان و RLS' : 'RLS Status'}
            </span>
            <div className="text-sm font-bold text-slate-900">Enforced &amp; Active</div>
            <span className="text-[10px] text-emerald-600 font-medium">
              Org &amp; Branch Isolated
            </span>
          </div>
        </div>
      </div>

      {/* Scope Boundaries Notice */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">
            {language === 'ar' ? 'حدود نطاق المرحلة الأولى (Phase 1 Scope Limits):' : 'Phase 1 Scope Boundaries:'}
          </p>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            {t.placeholders.noPhase2Notice}
          </p>
        </div>
      </div>
    </div>
  );
};
