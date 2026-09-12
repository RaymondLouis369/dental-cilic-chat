import React, { useState } from 'react';
import { Building, Globe, Clock, Phone, DollarSign, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { appendAuditLog } from '../../lib/storage';

export const OrganizationView: React.FC = () => {
  const { session, isOrgWideManager } = useAuth();
  const { t } = useLanguage();

  const [name, setName] = useState(session?.organization.name || 'Dental Demo Egypt');
  const [currency, setCurrency] = useState(session?.organization.currency || 'EGP');
  const [timezone, setTimezone] = useState(session?.organization.timezone || 'Africa/Cairo');
  const [phoneCode, setPhoneCode] = useState(session?.organization.phone_country_code || '+20');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!session) return null;

  const canManage = isOrgWideManager;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    appendAuditLog({
      organization_id: session.organization.id,
      actor_user_id: session.profile.id,
      actor_email: session.profile.email,
      action: 'organization.update',
      entity_type: 'organization',
      entity_id: session.organization.id,
      metadata: { name, currency, timezone, phoneCode },
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{t.org.title}</h1>
              <p className="text-xs text-slate-500">{t.org.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t.org.active}
            </span>
          </div>
        </div>
      </div>

      {!canManage && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-amber-800 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{t.org.editNotPermitted}</span>
        </div>
      )}

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{t.org.saveSuccess}</span>
        </div>
      )}

      {/* Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.org.name}
              </label>
              <input
                id="input-org-name"
                type="text"
                disabled={!canManage}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.org.code}
              </label>
              <input
                type="text"
                disabled
                value={session.organization.code}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-teal-600" />
                <span>{t.org.country}</span>
              </label>
              <input
                type="text"
                disabled
                value={session.organization.country}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 font-medium"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Default Egyptian localization: Egypt
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-teal-600" />
                <span>{t.org.currency}</span>
              </label>
              <input
                id="input-org-currency"
                type="text"
                disabled={!canManage}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 font-mono"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Default Egyptian Pound (EGP)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>{t.org.timezone}</span>
              </label>
              <input
                id="input-org-timezone"
                type="text"
                disabled={!canManage}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 font-mono"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Default Egyptian timezone (Africa/Cairo)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-teal-600" />
                <span>{t.org.phoneCode}</span>
              </label>
              <input
                id="input-org-phonecode"
                type="text"
                disabled={!canManage}
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 font-mono"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Default Egypt dialing code (+20)
              </p>
            </div>
          </div>

          {canManage && (
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                id="btn-save-org-settings"
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{t.common.save}</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
