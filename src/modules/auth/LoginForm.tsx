import React, { useState } from 'react';
import { Shield, KeyRound, Building2, CheckCircle2, AlertCircle, Sparkles, ArrowRightLeft } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { DEMO_STAFF_CREDENTIALS } from '../../lib/storage';
import { RoleKey } from '../../types';

interface LoginFormProps {
  onSwitchToPatient?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToPatient }) => {
  const { login, switchDemoRole } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();

  // In development/testing, prefill for frictionless local testing; in production, keep strictly empty
  const [email, setEmail] = useState(() => (import.meta.env.DEV ? 'manager@dental-demo.eg' : ''));
  const [password, setPassword] = useState(() => (import.meta.env.DEV ? 'dental123' : ''));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (!res.success) {
      setError(res.error || t.auth.invalidCredentials);
    }
  };

  const handleSelectDemoUser = (roleKey: RoleKey) => {
    if (!import.meta.env.DEV) return;
    const cred = DEMO_STAFF_CREDENTIALS[roleKey];
    setEmail(cred.email);
    setPassword('dental123');
    setError(null);
    switchDemoRole(roleKey);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      {/* Top Header bar with Language switcher & Country identity */}
      <div className="absolute top-4 start-4 end-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-full">
          <Building2 className="w-3.5 h-3.5 text-teal-600" />
          <span>{t.countryLabel} • {t.currencyLabel}</span>
        </div>
        <button
          onClick={toggleLanguage}
          id="btn-lang-toggle-login"
          className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-100 transition"
        >
          {t.common.langSwitch}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-700/20">
            <Shield className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-xl font-bold tracking-tight text-slate-900">
          {t.auth.title}
        </h2>
        <p className="mt-1 text-center text-xs text-slate-600 max-w-sm mx-auto">
          {t.auth.subtitle}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-8">
          {error && (
            <div
              id="login-error-alert"
              className="mb-5 flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.auth.emailLabel}
              </label>
              <input
                id="input-login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@dental-demo.eg"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.auth.passwordLabel}
              </label>
              <div className="relative">
                <input
                  id="input-login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{loading ? t.auth.loggingIn : t.auth.loginButton}</span>
            </button>
          </form>

          {/* Quick Staff Persona Switcher (STRICTLY DEVELOPMENT / PREVIEW TESTING ONLY) */}
          {import.meta.env.DEV && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>{t.auth.demoAccountsTitle}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  {t.auth.devOnlyBadge}
                </span>
              </div>

              {/* Explicit Demo Password Notice */}
              <div className="mb-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 text-[11px] leading-relaxed flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>{t.auth.demoSecurityWarning}</p>
              </div>

              <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                {t.auth.switchAccountPrompt}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.keys(DEMO_STAFF_CREDENTIALS) as RoleKey[]).map((key) => {
                  const cred = DEMO_STAFF_CREDENTIALS[key];
                  const isSelected = email === cred.email;
                  return (
                    <button
                      key={key}
                      type="button"
                      id={`btn-demo-role-${key}`}
                      onClick={() => handleSelectDemoUser(key)}
                      className={`flex flex-col text-start p-2.5 rounded-xl border transition text-xs ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/70 text-teal-900 ring-1 ring-teal-500'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-slate-900 truncate">
                          {t.roles[key]}
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
                      </div>
                      <span className="text-[11px] text-slate-500 truncate mt-0.5">
                        {cred.profile.display_name}
                      </span>
                      <span className="text-[10px] text-teal-700 mt-1 font-medium truncate">
                        {cred.assignedBranchIds.length === 0
                          ? t.auth.orgWideAccess
                          : `${t.auth.branchScopedAccess} (${cred.assignedBranchIds.length})`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dedicated Switcher to Patient Portal */}
          {onSwitchToPatient && (
            <div className="mt-6 pt-4 border-t border-slate-200 text-center">
              <button
                type="button"
                onClick={onSwitchToPatient}
                id="btn-switch-to-patient-portal-from-staff"
                className="inline-flex items-center gap-2 text-xs font-semibold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100/80 px-3.5 py-2 rounded-xl border border-teal-200 transition-colors"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>{t.patientAuth.switchToPatient}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
