import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientAuth } from './PatientAuthContext';
import { Bell, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

export const PatientNotifications: React.FC = () => {
  const { t } = useLanguage();
  const { session } = usePatientAuth();
  const patient = session?.selectedPatient;

  const mockNotifications = [
    {
      id: 'notif_01',
      title: 'تم إصدار الكارت الرقمي بنجاح',
      desc: `تم تفعيل كود المريض الموحد (${patient?.patient_code}) ويمكنك الآن استخدام الكارت في جميع فروع المركز.`,
      time: 'منذ يومين',
      icon: ShieldCheck,
      color: 'text-teal-600 bg-teal-100',
    },
    {
      id: 'notif_02',
      title: 'نصيحة العناية بصحة الفم والأسنان',
      desc: 'احرص على تفريش الأسنان مرتين يومياً وزيارة طبيب الأسنان للفحص الدوري كل 6 أشهر.',
      time: 'منذ أسبوع',
      icon: Sparkles,
      color: 'text-blue-600 bg-blue-100',
    },
  ];

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          {t.patientPortal.notifications}
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          التنبيهات والرسائل الإدارية الخاصة بملفك الطبي
        </p>
      </div>

      <div className="space-y-3">
        {mockNotifications.map((notif) => {
          const Icon = notif.icon;
          return (
            <div
              key={notif.id}
              className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-3.5"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${notif.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">{notif.title}</h4>
                  <span className="text-[10px] text-slate-400 font-medium">{notif.time}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{notif.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
