import React from 'react';
import {
  UserCheck,
  Stethoscope,
  Wrench,
  FlaskConical,
  Truck,
  CalendarDays,
  Info,
  Shield,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../modules/auth/AuthContext';
import { useLanguage } from '../modules/i18n/LanguageContext';
import { RoleBadge } from '../modules/navigation/RoleBadge';

interface WorkspacePlaceholderProps {
  type:
    | 'reception'
    | 'doctorWorkspace'
    | 'labCoordination'
    | 'labWorkspace'
    | 'deliveryWorkspace'
    | 'operations';
}

export const WorkspacePlaceholder: React.FC<WorkspacePlaceholderProps> = ({ type }) => {
  const { session, accessibleBranches, isOrgWideManager } = useAuth();
  const { t, language } = useLanguage();

  if (!session) return null;

  const getWorkspaceConfig = () => {
    switch (type) {
      case 'reception':
        return {
          title: t.placeholders.receptionTitle,
          icon: UserCheck,
          color: 'text-sky-600 bg-sky-50 border-sky-200',
          descAr: 'مكتب استقبال عيادات الأسنان — إدارة تدفق المرضى والمواعيد (سيتم بناؤها في مرحلة قادمة).',
          descEn: 'Dental front desk reception workspace — patient flow & check-in management (scheduled for subsequent phases).',
        };
      case 'doctorWorkspace':
        return {
          title: t.placeholders.doctorTitle,
          icon: Stethoscope,
          color: 'text-teal-600 bg-teal-50 border-teal-200',
          descAr: 'محطة طبيب الأسنان المعالج — تشخيص وفحص الأسنان والملاحظات السريرية (سيتم بناؤها في مرحلة قادمة).',
          descEn: 'Dentist clinical station — examinations, diagnostic charts, and clinical records (scheduled for subsequent phases).',
        };
      case 'labCoordination':
        return {
          title: t.placeholders.labCoordTitle,
          icon: Wrench,
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          descAr: 'تنسيق التركيبات السنية وزراعة الأسنان بين العيادات والمعامل الداخلية والخارجية.',
          descEn: 'Dental prosthetics and dental lab coordination inside the dental center.',
        };
      case 'labWorkspace':
        return {
          title: t.placeholders.labTitle,
          icon: FlaskConical,
          color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
          descAr: 'مساحة عمل فني معمل الأسنان — صب القوالب، تصنيع التركيبات الثابتة والمتحركة وفحص الجودة.',
          descEn: 'Dental technician laboratory workspace — fabrication of crowns, bridges, and prosthetics.',
        };
      case 'deliveryWorkspace':
        return {
          title: t.placeholders.deliveryTitle,
          icon: Truck,
          color: 'text-rose-600 bg-rose-50 border-rose-200',
          descAr: 'اللوجستيات ومندوب تسليم واستلام حالات التركيبات والمعامل بين الفروع والمعامل.',
          descEn: 'Dental logistics & case transport dispatch between clinics and partner dental laboratories.',
        };
      case 'operations':
      default:
        return {
          title: t.placeholders.operationsTitle,
          icon: CalendarDays,
          color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
          descAr: 'إدارة العمليات التشغيلية وتوزيع الطاقة الاستيعابية للعيادات وفروع المركز.',
          descEn: 'Branch operational capacity & dental chair scheduling (scheduled for subsequent phases).',
        };
    }
  };

  const config = getWorkspaceConfig();
  const Icon = config.icon;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${config.color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{config.title}</h1>
            <p className="text-xs text-slate-500">
              {language === 'ar' ? config.descAr : config.descEn}
            </p>
          </div>
        </div>
        <RoleBadge roleKey={session.role.key} />
      </div>

      {/* Scope Verification Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-teal-600" />
          <span>
            {language === 'ar' ? 'نطاق الوصول والأمان للمستخدم الحالي' : 'Active Scope & Authorization'}
          </span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 font-semibold block mb-1">
              {language === 'ar' ? 'المؤسسة الطبية' : 'Organization'}
            </span>
            <span className="font-bold text-slate-900">{session.organization.name}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {session.organization.code} • Egypt
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 font-semibold block mb-1">
              {language === 'ar' ? 'الفروع المصرح بها' : 'Authorized Branches'}
            </span>
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
              <span>
                {isOrgWideManager
                  ? t.auth.orgWideAccess
                  : accessibleBranches.map((b) => b.name).join(', ')}
              </span>
            </div>
            <span className="text-[11px] text-teal-700 block mt-0.5">
              Enforced by PostgreSQL Row Level Security (RLS)
            </span>
          </div>
        </div>
      </div>

      {/* Phase 1 Constraint Explanation */}
      <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
        <Info className="w-6 h-6 text-slate-400 mx-auto" />
        <h3 className="text-xs font-bold text-slate-800">
          {t.placeholders.phaseNotice}
        </h3>
        <p className="text-[11px] text-slate-500 max-w-lg mx-auto">
          {t.placeholders.noPhase2Notice}
        </p>
      </div>
    </div>
  );
};
