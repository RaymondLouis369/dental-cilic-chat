import React, { useState } from 'react';
import { MedicalAlert, AlertType, AlertSeverity } from '../../types/clinical';
import { useLanguage } from '../i18n/LanguageContext';
import {
  addMedicalAlert,
  toggleMedicalAlert,
  getStoredMedicalAlerts,
} from '../../lib/clinicalStorage';
import { useAuth } from '../auth/AuthContext';
import {
  AlertTriangle,
  ShieldAlert,
  HeartPulse,
  Pill,
  Baby,
  Plus,
  X,
  CheckCircle2,
  AlertOctagon,
} from 'lucide-react';

interface MedicalAlertsModalProps {
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
  onAlertsChange?: () => void;
}

export const MedicalAlertsModal: React.FC<MedicalAlertsModalProps> = ({
  patientId,
  isOpen,
  onClose,
  onAlertsChange,
}) => {
  const { isRtl } = useLanguage();
  const { session } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [alertType, setAlertType] = useState<AlertType>('allergy');
  const [severity, setSeverity] = useState<AlertSeverity>('critical');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const alerts = getStoredMedicalAlerts().filter((a) => a.patient_id === patientId);

  const handleToggle = (alertId: string, currentActive: boolean) => {
    toggleMedicalAlert(alertId, !currentActive);
    if (onAlertsChange) onAlertsChange();
  };

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      addMedicalAlert({
        patientId,
        alertType,
        severity,
        title,
        description,
        doctorId: session?.profile.id || 'prof_doc_01',
        organizationId: session?.profile.organization_id,
      });

      setTitle('');
      setDescription('');
      setShowAddForm(false);
      if (onAlertsChange) onAlertsChange();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'allergy':
        return <ShieldAlert className="w-5 h-5 text-rose-600" />;
      case 'chronic_condition':
        return <HeartPulse className="w-5 h-5 text-amber-600" />;
      case 'medication_warning':
        return <Pill className="w-5 h-5 text-purple-600" />;
      case 'pregnancy_lactation':
        return <Baby className="w-5 h-5 text-pink-600" />;
      default:
        return <AlertOctagon className="w-5 h-5 text-red-600" />;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
      id="medical-alerts-modal"
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-red-50 border-b border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-red-950">
                {isRtl ? 'التنبيهات الطبية والتحذيرات السريرية' : 'Medical Alerts & Clinical Warnings'}
              </h3>
              <p className="text-xs text-red-700">
                {isRtl
                  ? 'الحساسية المفرطة، الأمراض المزمنة، وتنبيهات الأدوية الواجب مراعاتها قبل العلاج'
                  : 'Critical allergies, chronic conditions, and medication precautions.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Active Alerts List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {isRtl ? 'التنبيهات المسجلة للمريض:' : 'Patient Registered Alerts:'}
              </h4>
              {!showAddForm && (
                <button
                  type="button"
                  id="add-medical-alert-btn"
                  onClick={() => setShowAddForm(true)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isRtl ? 'إضافة تنبيه طبي' : 'Add Medical Alert'}</span>
                </button>
              )}
            </div>

            {alerts.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-xs">
                {isRtl
                  ? 'لا توجد تنبيهات طبية مسجلة لهذا المريض حتى الآن.'
                  : 'No medical alerts currently registered for this patient.'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {alerts.map((al) => (
                  <div
                    key={al.id}
                    className={`p-4 rounded-xl border transition-all ${
                      al.active
                        ? al.severity === 'critical'
                          ? 'bg-red-50/80 border-red-300 ring-1 ring-red-300'
                          : 'bg-amber-50/80 border-amber-300'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getAlertIcon(al.alert_type)}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-sm font-bold text-slate-900">{al.title}</h5>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                al.severity === 'critical'
                                  ? 'bg-red-600 text-white'
                                  : al.severity === 'high'
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-amber-500 text-white'
                              }`}
                            >
                              {al.severity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                            {al.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggle(al.id, al.active)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                            al.active
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {al.active
                            ? isRtl
                              ? 'نشط (Active)'
                              : 'Active'
                            : isRtl
                            ? 'معطل (Inactive)'
                            : 'Inactive'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Alert Form */}
          {showAddForm && (
            <form
              onSubmit={handleAddAlert}
              className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-4 animate-fadeIn"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-xs font-bold text-slate-800">
                  {isRtl ? 'تسجيل تنبيه طبي أو حساسية جديدة:' : 'Register New Medical Alert:'}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isRtl ? 'نوع التنبيه:' : 'Alert Type:'}
                  </label>
                  <select
                    value={alertType}
                    onChange={(e) => setAlertType(e.target.value as AlertType)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="allergy">{isRtl ? 'حساسية دواء / طعام / مواد' : 'Allergy'}</option>
                    <option value="chronic_condition">{isRtl ? 'مرض مزمن (سكري، ضغط، كبد)' : 'Chronic Condition'}</option>
                    <option value="medication_warning">{isRtl ? 'تحذير دوائي (مسيلات دم)' : 'Medication Warning'}</option>
                    <option value="clinical_precaution">{isRtl ? 'احتياطات سريرية عامة' : 'Clinical Precaution'}</option>
                    <option value="bleeding_risk">{isRtl ? 'خطر نزيف / سيولة الدم' : 'Bleeding Risk'}</option>
                    <option value="pregnancy_lactation">{isRtl ? 'حمل أو رضاعة طبيعية' : 'Pregnancy / Lactation'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isRtl ? 'درجة الخطورة:' : 'Severity Level:'}
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-bold"
                  >
                    <option value="critical">{isRtl ? 'حرج جداً (Critical)' : 'Critical'}</option>
                    <option value="high">{isRtl ? 'مرتفع (High)' : 'High'}</option>
                    <option value="moderate">{isRtl ? 'متوسط (Moderate)' : 'Moderate'}</option>
                    <option value="low">{isRtl ? 'خفيف / متابعة (Low)' : 'Low'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isRtl ? 'عنوان التنبيه:' : 'Alert Title:'}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    isRtl
                      ? 'مثال: حساسية شديدة من البنسلين ومشتقاته'
                      : 'e.g. Severe Penicillin Allergy'
                  }
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isRtl ? 'التفاصيل والتعليمات السريرية:' : 'Clinical Description & Precautions:'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    isRtl
                      ? 'مثال: يمنع وصف الأوجمنتين والأموكسيسيلين نهائياً، البدائل المقترحة: الكليندامايسين 300 ملجم.'
                      : 'e.g. Strictly avoid Amoxicillin/Augmentin. Prescribe Clindamycin 300mg as alternative.'
                  }
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isRtl ? 'حفظ التنبيه الطبي' : 'Save Alert'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg"
          >
            {isRtl ? 'إغلاق النافذة' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
