import React from 'react';
import { RoleKey } from '../../types';
import { useLanguage } from '../i18n/LanguageContext';

interface RoleBadgeProps {
  roleKey: RoleKey;
  className?: string;
}

const ROLE_COLORS: Record<RoleKey, string> = {
  center_manager: 'bg-purple-50 text-purple-700 border-purple-200',
  branch_manager: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  doctor: 'bg-teal-50 text-teal-700 border-teal-200',
  receptionist: 'bg-sky-50 text-sky-700 border-sky-200',
  prosthetic_coordinator: 'bg-amber-50 text-amber-700 border-amber-200',
  lab_user: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  delivery_user: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({ roleKey, className = '' }) => {
  const { t } = useLanguage();
  const colorClass = ROLE_COLORS[roleKey] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <span
      id={`badge-role-${roleKey}`}
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${colorClass} ${className}`}
    >
      {t.roles[roleKey]}
    </span>
  );
};
