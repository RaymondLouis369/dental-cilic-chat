import React from 'react';
import { ShieldCheck, Check, Minus, Key } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { SYSTEM_PERMISSIONS, SYSTEM_ROLES, ROLE_DEFAULT_PERMISSIONS } from './rolesAndPermissions';
import { RoleBadge } from '../navigation/RoleBadge';

export const PermissionRegistryView: React.FC = () => {
  const { t, language } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{t.nav.permissions}</h1>
            <p className="text-xs text-slate-500">
              {language === 'ar'
                ? 'مصفوفة الصلاحيات الموحدة لكافة الأدوار السبعة المعتمدة للمراكز والعيادات السنية'
                : 'Centralized Role-Based Access Control (RBAC) matrix for all 7 authorized roles'}
            </p>
          </div>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Key className="w-4 h-4 text-teal-600" />
            <span>
              {language === 'ar' ? 'سجل الصلاحيات وتوزيع الأدوار' : 'Permission Registry Matrix'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {SYSTEM_PERMISSIONS.length} {language === 'ar' ? 'صلاحيات نظام' : 'System Permissions'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-start font-bold">
                  {language === 'ar' ? 'الصلاحية / المفتاح' : 'Permission Key & Description'}
                </th>
                {SYSTEM_ROLES.map((role) => (
                  <th key={role.id} className="px-3 py-3 text-center font-bold">
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] whitespace-nowrap">
                        {language === 'ar' ? role.name_ar : role.name_en}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                        {role.key}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {SYSTEM_PERMISSIONS.map((perm) => (
                <tr key={perm.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900 font-mono text-[11px] text-teal-700">
                      {perm.key}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      {language === 'ar' ? perm.name_ar : perm.name_en}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {language === 'ar' ? perm.description_ar : perm.description_en}
                    </div>
                  </td>
                  {SYSTEM_ROLES.map((role) => {
                    const hasPerm = ROLE_DEFAULT_PERMISSIONS[role.key]?.includes(perm.key);
                    return (
                      <td key={role.id} className="px-3 py-3 text-center">
                        {hasPerm ? (
                          <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-50 text-slate-300">
                            <Minus className="w-3 h-3" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
