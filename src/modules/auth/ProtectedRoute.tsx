import React from 'react';
import { useAuth } from './AuthContext';
import { LoginForm } from './LoginForm';

interface ProtectedRouteProps {
  children: React.ReactNode;
  onSwitchToPatient?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, onSwitchToPatient }) => {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-500">Loading Dental SaaS...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginForm onSwitchToPatient={onSwitchToPatient} />;
  }

  return <>{children}</>;
};
