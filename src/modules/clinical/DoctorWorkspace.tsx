import React, { useState } from 'react';
import { DoctorDashboardView } from './DoctorDashboardView';
import { ClinicalPatientWorkspace } from './ClinicalPatientWorkspace';

interface DoctorWorkspaceProps {
  initialPatientId?: string;
}

export const DoctorWorkspace: React.FC<DoctorWorkspaceProps> = ({
  initialPatientId,
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    initialPatientId || null
  );
  const [initialTab, setInitialTab] = useState<string>('chart');

  const handleSelectPatient = (patientId: string, tab = 'chart') => {
    setSelectedPatientId(patientId);
    setInitialTab(tab);
  };

  const handleBackToDashboard = () => {
    setSelectedPatientId(null);
  };

  if (selectedPatientId) {
    return (
      <ClinicalPatientWorkspace
        patientId={selectedPatientId}
        onBack={handleBackToDashboard}
        initialTab={initialTab}
      />
    );
  }

  return <DoctorDashboardView onSelectPatient={handleSelectPatient} />;
};
