/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LanguageProvider, useLanguage } from './modules/i18n/LanguageContext';
import { AuthProvider, useAuth } from './modules/auth/AuthContext';
import { PatientAuthProvider, usePatientAuth } from './modules/patient-portal/PatientAuthContext';
import { ProtectedRoute } from './modules/auth/ProtectedRoute';
import { Header } from './modules/navigation/Header';
import { Sidebar, NavTab } from './modules/navigation/Sidebar';
import { OrganizationView } from './modules/organizations/OrganizationView';
import { BranchList } from './modules/branches/BranchList';
import { UserListView } from './modules/users/UserListView';
import { PermissionRegistryView } from './modules/permissions/PermissionRegistryView';
import { AuditLogView } from './modules/audit/AuditLogView';
import { DashboardPlaceholder } from './components/DashboardPlaceholder';
import { WorkspacePlaceholder } from './components/WorkspacePlaceholder';
import { AcceptanceTestRunner } from './components/AcceptanceTestRunner';
import { OfflineIndicator } from './modules/pwa/OfflineIndicator';

import { ReceptionDashboard } from './modules/reception/ReceptionDashboard';
import { LabOrderManagementDashboard } from './modules/reception/LabOrderManagementDashboard';
import { DoctorScheduleView } from './modules/scheduling/DoctorScheduleView';
import { ServiceCatalogView } from './modules/services/ServiceCatalogView';
import { CashPriceListView } from './modules/pricing/CashPriceListView';
import { InsuranceManagementView } from './modules/insurance/InsuranceManagementView';
import { CustomServicesReviewView } from './modules/pricing/CustomServicesReviewView';
import { SupplierManagementView } from './modules/suppliers/SupplierManagementView';

import { DoctorWorkspace } from './modules/clinical/DoctorWorkspace';
import { LabUserWorkspace } from './modules/clinical/LabUserWorkspace';
import { DeliveryUserWorkspace } from './modules/clinical/DeliveryUserWorkspace';
import { PatientPortalShell } from './modules/patient-portal/PatientPortalShell';
import { PatientLogin } from './modules/patient-portal/PatientLogin';

interface MainLayoutProps {
  onSwitchToPatient: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ onSwitchToPatient }) => {
  const { session } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    if (session?.role.key === 'receptionist') return 'reception';
    if (session?.role.key === 'lab_user') return 'labWorkspace';
    if (session?.role.key === 'delivery_user') return 'deliveryWorkspace';
    return 'dashboard';
  });

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPlaceholder />;
      case 'reception':
        return <ReceptionDashboard />;
      case 'scheduling':
        return <DoctorScheduleView />;
      case 'services':
        return <ServiceCatalogView />;
      case 'pricing':
        return <CashPriceListView />;
      case 'insurance':
        return <InsuranceManagementView />;
      case 'customServices':
        return <CustomServicesReviewView />;
      case 'suppliers':
        return <SupplierManagementView />;
      case 'organization':
        return <OrganizationView />;
      case 'branches':
        return <BranchList />;
      case 'users':
        return <UserListView />;
      case 'permissions':
        return <PermissionRegistryView />;
      case 'audit':
        return <AuditLogView />;
      case 'doctorWorkspace':
        return <DoctorWorkspace />;
      case 'labCoordination':
        return <LabOrderManagementDashboard />;
      case 'labWorkspace':
        return <LabUserWorkspace />;
      case 'deliveryWorkspace':
        return <DeliveryUserWorkspace />;
      case 'operations':
        return <WorkspacePlaceholder type="operations" />;
      case 'tests':
        return <AcceptanceTestRunner />;
      default:
        return <DashboardPlaceholder />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-900">
      <Header onSwitchToPatient={onSwitchToPatient} />
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-5xl">
          {renderContent()}
        </main>
      </div>
      <OfflineIndicator />
    </div>
  );
};

const PatientPortalEntry: React.FC<{ onSwitchToStaff: () => void }> = ({ onSwitchToStaff }) => {
  const { session, isLoading } = usePatientAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-teal-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-400">Loading Patient Portal...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <PatientLogin onSwitchToStaff={onSwitchToStaff} />;
  }

  return <PatientPortalShell onSwitchToStaff={onSwitchToStaff} />;
};

export default function App() {
  const [portalMode, setPortalMode] = useState<'staff' | 'patient'>(() => {
    return (localStorage.getItem('dental_portal_mode') as 'staff' | 'patient') || 'patient';
  });

  const handleSwitchPortal = (mode: 'staff' | 'patient') => {
    localStorage.setItem('dental_portal_mode', mode);
    setPortalMode(mode);
  };

  return (
    <LanguageProvider>
      <AuthProvider>
        <PatientAuthProvider>
          {portalMode === 'patient' ? (
            <PatientPortalEntry onSwitchToStaff={() => handleSwitchPortal('staff')} />
          ) : (
            <ProtectedRoute onSwitchToPatient={() => handleSwitchPortal('patient')}>
              <MainLayout onSwitchToPatient={() => handleSwitchPortal('patient')} />
            </ProtectedRoute>
          )}
          <OfflineIndicator />
        </PatientAuthProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
