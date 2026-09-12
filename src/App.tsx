/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LanguageProvider, useLanguage } from './modules/i18n/LanguageContext';
import { AuthProvider, useAuth } from './modules/auth/AuthContext';
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

const MainLayout: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const { session } = useAuth();

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPlaceholder />;
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
      case 'reception':
        return <WorkspacePlaceholder type="reception" />;
      case 'doctorWorkspace':
        return <WorkspacePlaceholder type="doctorWorkspace" />;
      case 'labCoordination':
        return <WorkspacePlaceholder type="labCoordination" />;
      case 'labWorkspace':
        return <WorkspacePlaceholder type="labWorkspace" />;
      case 'deliveryWorkspace':
        return <WorkspacePlaceholder type="deliveryWorkspace" />;
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
      <Header />
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

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      </AuthProvider>
    </LanguageProvider>
  );
}
