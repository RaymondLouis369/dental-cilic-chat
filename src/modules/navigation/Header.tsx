import React from 'react';
import { LogOut, Globe, Shield, MapPin, Building, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { RoleBadge } from './RoleBadge';

interface HeaderProps {
  onSwitchToPatient?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSwitchToPatient }) => {
  const { session, logout, isOrgWideManager, accessibleBranches } = useAuth();
  const { t, toggleLanguage } = useLanguage();

  if (!session) return null;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Organization & System Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 tracking-tight">
                {session.organization.name}
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {session.organization.code}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1 text-teal-700 font-medium">
                <MapPin className="w-3 h-3 text-teal-600" />
                {isOrgWideManager
                  ? t.auth.orgWideAccess
                  : accessibleBranches.length > 0
                  ? accessibleBranches.map((b) => b.name).join(' • ')
                  : t.branch.noBranchesAssigned}
              </span>
            </div>
          </div>
        </div>

        {/* User profile, Role, PWA Install & Language switcher */}
        <div className="flex items-center gap-3">
          <PWAInstallButton />

          <button
            onClick={toggleLanguage}
            id="btn-toggle-language-header"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            title="Toggle Language (Arabic / English)"
          >
            <Globe className="w-3.5 h-3.5 text-teal-600" />
            <span>{t.common.langSwitch}</span>
          </button>

          {onSwitchToPatient && (
            <button
              onClick={onSwitchToPatient}
              id="btn-header-switch-to-patient"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold transition"
              title={t.patientAuth.switchToPatient}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline">{t.patientAuth.switchToPatient}</span>
            </button>
          )}

          <div className="hidden md:flex flex-col items-end border-s border-slate-200 ps-3">
            <span className="text-xs font-bold text-slate-900">
              {session.profile.display_name}
            </span>
            <RoleBadge roleKey={session.role.key} className="mt-0.5" />
          </div>

          <button
            onClick={logout}
            id="btn-logout"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-700 bg-rose-50/60 hover:bg-rose-100 transition"
            title={t.auth.logoutButton}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.auth.logoutButton}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
