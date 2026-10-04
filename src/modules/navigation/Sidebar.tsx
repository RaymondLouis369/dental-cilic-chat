import React from 'react';
import { isDevEnv } from '../../lib/env';
import {
  LayoutDashboard,
  Building2,
  GitBranch,
  Users,
  ShieldCheck,
  FileText,
  CalendarDays,
  UserCheck,
  Stethoscope,
  Wrench,
  FlaskConical,
  Truck,
  CheckCircle,
  RefreshCw,
  Clock,
  FileSpreadsheet,
  Shield,
  Tag,
  Boxes,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { RoleKey } from '../../types';
import { RoleBadge } from './RoleBadge';

export type NavTab =
  | 'dashboard'
  | 'managerAI'
  | 'doctorAI'
  | 'reception'
  | 'scheduling'
  | 'services'
  | 'pricing'
  | 'insurance'
  | 'customServices'
  | 'suppliers'
  | 'inventory'
  | 'communication'
  | 'organization'
  | 'branches'
  | 'users'
  | 'permissions'
  | 'audit'
  | 'operations'
  | 'doctorWorkspace'
  | 'labCoordination'
  | 'labWorkspace'
  | 'deliveryWorkspace'
  | 'tests';


interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { session, switchDemoRole } = useAuth();
  const { t } = useLanguage();

  if (!session) return null;

  const roleKey = session.role.key;

  // Build nav items dynamically based on internal role
  const getNavItems = () => {
    switch (roleKey) {
      case 'center_manager':
        return [
          { id: 'dashboard' as NavTab, label: t.nav.dashboard, icon: LayoutDashboard },
          { id: 'managerAI' as NavTab, label: 'الذكاء التنفيذي للإدارة', icon: Sparkles, badge: 'Wave 4' },
          { id: 'doctorAI' as NavTab, label: 'المساعد الطبي الذكي', icon: Sparkles, badge: 'Wave 4' },
          { id: 'doctorWorkspace' as NavTab, label: t.nav.doctorWorkspace, icon: Stethoscope, badge: 'Phase 4' },
          { id: 'reception' as NavTab, label: t.nav.reception, icon: UserCheck, badge: 'Phase 3' },
          { id: 'scheduling' as NavTab, label: t.nav.scheduling, icon: CalendarDays },
          { id: 'services' as NavTab, label: t.nav.services, icon: FileText },
          { id: 'pricing' as NavTab, label: t.nav.pricing, icon: FileSpreadsheet },
          { id: 'insurance' as NavTab, label: t.nav.insurance, icon: Shield },
          { id: 'customServices' as NavTab, label: t.nav.customServices, icon: Tag },
          { id: 'suppliers' as NavTab, label: t.nav.suppliers, icon: Truck, badge: 'Phase 8' },
          { id: 'inventory' as NavTab, label: 'المخزون والمستلزمات', icon: Boxes, badge: 'Wave 2' },
          { id: 'communication' as NavTab, label: 'مركز التواصل والواتساب', icon: MessageSquare, badge: 'Wave 3' },
          { id: 'organization' as NavTab, label: t.nav.organization, icon: Building2 },

          { id: 'branches' as NavTab, label: t.nav.branches, icon: GitBranch },
          { id: 'users' as NavTab, label: t.nav.users, icon: Users },
          { id: 'permissions' as NavTab, label: t.nav.permissions, icon: ShieldCheck },
          { id: 'audit' as NavTab, label: t.nav.audit, icon: FileText },
          { id: 'tests' as NavTab, label: t.nav.testsRunner, icon: CheckCircle },
        ];
      case 'branch_manager':
        return [
          { id: 'dashboard' as NavTab, label: t.nav.dashboard, icon: LayoutDashboard },
          { id: 'doctorWorkspace' as NavTab, label: t.nav.doctorWorkspace, icon: Stethoscope, badge: 'Phase 4' },
          { id: 'reception' as NavTab, label: t.nav.reception, icon: UserCheck, badge: 'Phase 3' },
          { id: 'scheduling' as NavTab, label: t.nav.scheduling, icon: CalendarDays },
          { id: 'services' as NavTab, label: t.nav.services, icon: FileText },
          { id: 'pricing' as NavTab, label: t.nav.pricing, icon: FileSpreadsheet },
          { id: 'insurance' as NavTab, label: t.nav.insurance, icon: Shield },
          { id: 'suppliers' as NavTab, label: t.nav.suppliers, icon: Truck, badge: 'Phase 8' },
          { id: 'inventory' as NavTab, label: 'المخزون والمستلزمات', icon: Boxes, badge: 'Wave 2' },
          { id: 'communication' as NavTab, label: 'مركز التواصل والواتساب', icon: MessageSquare, badge: 'Wave 3' },
          { id: 'branches' as NavTab, label: t.nav.branches, icon: GitBranch },

          { id: 'users' as NavTab, label: t.nav.users, icon: Users },
          { id: 'operations' as NavTab, label: t.nav.operations, icon: Clock },
          { id: 'tests' as NavTab, label: t.nav.testsRunner, icon: CheckCircle },
        ];
      case 'receptionist':
        return [
          { id: 'reception' as NavTab, label: t.nav.reception, icon: UserCheck, badge: 'Phase 3' },
          { id: 'dashboard' as NavTab, label: t.nav.dashboard, icon: LayoutDashboard },
          { id: 'scheduling' as NavTab, label: t.nav.scheduling, icon: CalendarDays },
          { id: 'doctorWorkspace' as NavTab, label: t.nav.doctorWorkspace, icon: Stethoscope },
          { id: 'tests' as NavTab, label: t.nav.testsRunner, icon: CheckCircle },
        ];
      case 'doctor':
        return [
          { id: 'doctorWorkspace' as NavTab, label: t.nav.doctorWorkspace, icon: Stethoscope, badge: 'Phase 4' },
          { id: 'doctorAI' as NavTab, label: 'المساعد الطبي الذكي', icon: Sparkles, badge: 'Wave 4' },
          { id: 'dashboard' as NavTab, label: t.nav.dashboard, icon: LayoutDashboard },
          { id: 'reception' as NavTab, label: t.nav.reception, icon: UserCheck },
          { id: 'scheduling' as NavTab, label: t.nav.scheduling, icon: CalendarDays },
          { id: 'tests' as NavTab, label: t.nav.testsRunner, icon: CheckCircle },
        ];
      case 'prosthetic_coordinator':
        return [
          { id: 'dashboard' as NavTab, label: t.nav.dashboard, icon: LayoutDashboard },
          { id: 'labCoordination' as NavTab, label: t.nav.labCoordination, icon: Wrench },
          { id: 'tests' as NavTab, label: t.nav.testsRunner, icon: CheckCircle },
        ];
      case 'lab_user':
        return [
          { id: 'labWorkspace' as NavTab, label: t.nav.labWorkspace, icon: FlaskConical },
          { id: 'tests' as NavTab, label: t.nav.testsRunner, icon: CheckCircle },
        ];
      case 'delivery_user':
        return [
          { id: 'deliveryWorkspace' as NavTab, label: t.nav.deliveryWorkspace, icon: Truck },
          { id: 'tests' as NavTab, label: t.nav.testsRunner, icon: CheckCircle },
        ];
      default:
        return [
          { id: 'dashboard' as NavTab, label: t.nav.dashboard, icon: LayoutDashboard },
          { id: 'tests' as NavTab, label: t.nav.testsRunner, icon: CheckCircle },
        ];
    }
  };

  const navItems = getNavItems();

  const allRoles: RoleKey[] = [
    'center_manager',
    'branch_manager',
    'receptionist',
    'doctor',
    'prosthetic_coordinator',
    'lab_user',
    'delivery_user',
  ];

  return (
    <aside className="w-64 shrink-0 bg-white border-e border-slate-200 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16">
      <div className="p-4 space-y-6 overflow-y-auto">
        {/* User Card in Sidebar */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 truncate">
              {session.profile.display_name}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <RoleBadge roleKey={roleKey} />
          </div>
          <p className="mt-2 text-[11px] text-slate-500 truncate">
            {session.profile.email}
          </p>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-teal-700 text-teal-100'
                        : 'bg-teal-100 text-teal-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Role Switcher Drawer: STRICTLY DEVELOPMENT / PREVIEW TESTING ONLY (Omitted in Production) */}
      {isDevEnv() && (
        <div className="p-3 bg-amber-50/70 border-t border-amber-200 text-xs">
          <div className="flex items-center justify-between text-amber-950 font-semibold mb-2">
            <span className="flex items-center gap-1 text-[11px]">
              <RefreshCw className="w-3 h-3 text-amber-700" />
              <span>{t.auth.activeRole}</span>
            </span>
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300">
              {t.auth.devOnlyBadge}
            </span>
          </div>
          <select
            id="select-role-switch"
            value={roleKey}
            onChange={(e) => {
              const targetRole = e.target.value as RoleKey;
              switchDemoRole(targetRole);
              // reset tab to first available
              if (targetRole === 'lab_user') onSelectTab('labWorkspace');
              else if (targetRole === 'delivery_user') onSelectTab('deliveryWorkspace');
              else onSelectTab('dashboard');
            }}
            className="w-full text-xs rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-slate-800 focus:border-amber-500 focus:outline-none"
            aria-label="Development Role Switcher"
          >
            {allRoles.map((r) => (
              <option key={r} value={r}>
                {t.roles[r]}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[10px] text-amber-800 leading-tight">
            * {t.auth.demoSecurityWarning}
          </p>
        </div>
      )}
    </aside>
  );
};
