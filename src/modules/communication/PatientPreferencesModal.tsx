import React, { useState } from 'react';
import { X, Save, MessageSquare, Bell, Globe, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { PatientCommunicationPreference } from '../../types/communication';
import { getPatientCommunicationPreference, savePatientCommunicationPreference } from '../../lib/communicationStorage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  organizationId: string;
}

export const PatientPreferencesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  organizationId,
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const initialPref = getPatientCommunicationPreference(patientId, organizationId);
  const [pref, setPref] = useState<PatientCommunicationPreference>(initialPref);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    savePatientCommunicationPreference(pref);
    setSavedMsg(isAr ? 'تم حفظ التفضيلات بنجاح' : 'Preferences saved successfully');
    setTimeout(() => setSavedMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-slate-900 to-indigo-900 text-white">
          <div>
            <h3 className="text-base font-bold">
              {isAr ? `تفضيلات التواصل: ${patientName}` : `Communication Prefs: ${patientName}`}
            </h3>
            <p className="text-xs text-slate-300">
              {isAr ? 'تحديد قنوات التنبيه ولغة الرسائل المفضلة' : 'Configure preferred notification channels & language'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {savedMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {savedMsg}
            </div>
          )}

          {/* WhatsApp Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              <div>
                <div className="text-xs font-bold text-slate-800">{isAr ? 'رسائل الواتساب' : 'WhatsApp Messages'}</div>
                <div className="text-[10px] text-slate-500">
                  {isAr ? 'استلام التذكيرات والتأكيدات عبر الواتساب' : 'Receive reminders & confirmations via WhatsApp'}
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={pref.whatsapp_enabled}
              onChange={(e) => setPref({ ...pref, whatsapp_enabled: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500"
            />
          </div>

          {/* In-App Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-indigo-600" />
              <div>
                <div className="text-xs font-bold text-slate-800">{isAr ? 'تنبيهات التطبيق' : 'In-App Notifications'}</div>
                <div className="text-[10px] text-slate-500">
                  {isAr ? 'إشعارات بوابات المرضى داخل التطبيق' : 'In-app notification feed in patient portal'}
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={pref.in_app_enabled}
              onChange={(e) => setPref({ ...pref, in_app_enabled: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500"
            />
          </div>

          {/* Preferred Language */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-slate-500" />
              {isAr ? 'اللغة المفضلة للرسائل:' : 'Preferred Language:'}
            </label>
            <select
              value={pref.preferred_language}
              onChange={(e) => setPref({ ...pref, preferred_language: e.target.value as 'ar' | 'en' })}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ar">العربية (Arabic)</option>
              <option value="en">English (الإنجليزية)</option>
            </select>
          </div>

          {/* Lead Hours */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isAr ? 'مهلة التذكير المسبق للموعد:' : 'Reminder Lead Time:'}
            </label>
            <select
              value={pref.reminder_lead_hours}
              onChange={(e) => setPref({ ...pref, reminder_lead_hours: Number(e.target.value) as 12 | 24 | 48 })}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              <option value={24}>{isAr ? 'قبل 24 ساعة (افتراضي)' : '24 Hours Ahead (Default)'}</option>
              <option value={48}>{isAr ? 'قبل 48 ساعة' : '48 Hours Ahead'}</option>
              <option value={12}>{isAr ? 'قبل 12 ساعة' : '12 Hours Ahead'}</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <Save className="w-4 h-4" />
              {isAr ? 'حفظ التفضيلات' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
