import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePatientAuth } from './PatientAuthContext';
import { PatientHome } from './PatientHome';
import { DigitalPatientCard } from './DigitalPatientCard';
import { PatientProfile } from './PatientProfile';
import { FamilyView } from './FamilyView';
import { PatientNotifications } from './PatientNotifications';
import { PatientSettings } from './PatientSettings';
import { PatientSupportTickets } from './PatientSupportTickets';
import { PatientAIChat } from './PatientAIChat';
import { ProfileChooserModal } from './ProfileChooserModal';
import { ProfileDropdown } from './ProfileDropdown';
import { ActivePatientBanner } from './ActivePatientBanner';
import { calculateAge, getAgeGroup } from '../../types/patient';
import { PatientFinancialPortal } from './PatientFinancialPortal';
import {
  Home,
  QrCode,
  User,
  Users,
  Bell,
  Settings,
  Sparkles,
  LogOut,
  ChevronDown,
  Building2,
  Globe,
  ArrowRightLeft,
  MessageSquare,
  DollarSign,
} from 'lucide-react';

export type PatientPortalTab =
  | 'home'
  | 'finance'
  | 'digitalCard'
  | 'profile'
  | 'family'
  | 'notifications'
  | 'tickets'
  | 'aiChat'
  | 'settings';

interface PatientPortalShellProps {
  onSwitchToStaff: () => void;
}

export const PatientPortalShell: React.FC<PatientPortalShellProps> = ({ onSwitchToStaff }) => {
  const { t, language, setLanguage } = useLanguage();
  const { session, logout } = usePatientAuth();
  const [activeTab, setActiveTab] = useState<PatientPortalTab>('home');
  const [showProfileChooser, setShowProfileChooser] = useState(false);

  if (!session) return null;

  const currentPatient = session.selectedPatient;
  const authPatient = session.authenticatedPatient;
  const isWard = authPatient.id !== currentPatient.id;
  const age = calculateAge(currentPatient.date_of_birth);
  const ageGroup = getAgeGroup(currentPatient.date_of_birth);
  const hasMultipleProfiles = session.availableProfiles.length > 1;

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <PatientHome onNavigate={(tab) => setActiveTab(tab)} />;
      case 'finance':
        return <PatientFinancialPortal />;
      case 'digitalCard':
        return <DigitalPatientCard />;
      case 'profile':
        return <PatientProfile />;
      case 'family':
        return <FamilyView />;
      case 'notifications':
        return <PatientNotifications />;
      case 'tickets':
        return <PatientSupportTickets />;
      case 'aiChat':
        return <PatientAIChat />;
      case 'settings':
        return <PatientSettings />;
      default:
        return <PatientHome onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  const navItems = [
    { id: 'home' as PatientPortalTab, label: t.patientPortal.home, icon: Home },
    {
      id: 'finance' as PatientPortalTab,
      label: language === 'ar' ? 'الحسابات والمحفظة' : 'Finance & Wallet',
      icon: DollarSign,
    },
    {
      id: 'aiChat' as PatientPortalTab,
      label: language === 'ar' ? 'الدردشة الذكية' : 'AI Assistant',
      icon: Sparkles,
    },
    { id: 'digitalCard' as PatientPortalTab, label: t.patientPortal.digitalCard, icon: QrCode },
    { id: 'profile' as PatientPortalTab, label: t.patientPortal.profile, icon: User },
    { id: 'family' as PatientPortalTab, label: t.patientPortal.family, icon: Users },
    { id: 'notifications' as PatientPortalTab, label: t.patientPortal.notifications, icon: Bell },
    {
      id: 'tickets' as PatientPortalTab,
      label: language === 'ar' ? 'الشكاوى والاستفسارات' : 'Support & Complaints',
      icon: MessageSquare,
    },
    { id: 'settings' as PatientPortalTab, label: t.patientPortal.settings, icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-900 pb-16 md:pb-0">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Logo & Org */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                  {t.patientPortal.portalTitle}
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  مصر (EGP)
                </span>
              </div>
              <span className="text-xs text-slate-500 block leading-tight">
                {session.organization.name}
              </span>
            </div>
          </div>

          {/* Active Profile Dropdown & Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Profile Dropdown for switching between linked accounts */}
            <ProfileDropdown
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenChooserModal={() => setShowProfileChooser(true)}
            />

            {/* Language Switch */}
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold"
              title={t.common.langSwitch}
            >
              <Globe className="w-4 h-4" />
            </button>

            {/* Switch to Staff Portal */}
            <button
              onClick={onSwitchToStaff}
              id="btn-nav-switch-to-staff"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300/80 transition-colors"
              title={t.patientAuth.switchToStaff}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{t.patientAuth.switchToStaff}</span>
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              id="btn-header-logout"
              className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title={t.auth.logoutButton}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="hidden md:block border-t border-slate-100 bg-slate-50/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  id={`desktop-tab-${item.id}`}
                  className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
                    isActive
                      ? 'border-teal-600 text-teal-700 bg-white shadow-xs'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content View */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Prominent Current Active Patient Indicator & Quick Switcher */}
        <ActivePatientBanner onOpenSwitcher={() => setShowProfileChooser(true)} />

        {renderContent()}
      </main>

      {/* Mobile Bottom Navigation Bar (PWA standard) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40 flex items-center justify-around py-2 px-1 shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              id={`mobile-tab-${item.id}`}
              className={`flex flex-col items-center gap-1 py-1 px-2 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-teal-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Profile Chooser Modal */}
      <ProfileChooserModal
        isOpen={showProfileChooser}
        onClose={() => setShowProfileChooser(false)}
      />
    </div>
  );
};
