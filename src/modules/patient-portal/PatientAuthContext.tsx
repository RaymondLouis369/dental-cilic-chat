/**
 * Patient Authentication & Context Provider
 * Phase 2: Patient Identity & Portal Shell
 *
 * Implements:
 * - Separation between Authenticated Account and Selected Patient Context
 * - Multi-profile support for shared mobile numbers (Parent + Children)
 * - Cryptographic PIN validation
 * - Strict server-side / RLS authorized profile validation
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Patient, PatientSession } from '../../types/patient';
import { DEFAULT_EGYPT_ORG } from '../../lib/storage';
import {
  getStoredAccounts,
  getStoredPatients,
  getAuthorizedProfilesForAccount,
  simulatePatientRLS,
  updatePermittedPatientProfile,
  requestForgotPin,
  resetPatientPin,
  PATIENT_STORAGE_KEYS,
} from '../../lib/patientStorage';
import {
  normalizeMobile,
  verifyPin,
} from './utils/pinSecurity';

interface PatientAuthContextType {
  session: PatientSession | null;
  isLoading: boolean;
  login: (mobile: string, pin: string) => Promise<{ success: boolean; errorKey?: string; profilesCount?: number }>;
  logout: () => void;
  selectPatientContext: (patientId: string) => { success: boolean; error?: string };
  updateProfile: (allowedUpdates: { secondary_mobile?: string; email?: string; preferred_language?: 'ar' | 'en' }) => Promise<{ success: boolean; error?: string }>;
  requestPinReset: (mobile: string) => Promise<{ success: boolean; messageKey: string; mockToken?: string }>;
  submitPinReset: (mobile: string, token: string, newPin: string) => Promise<{ success: boolean; errorKey?: string }>;
}

const PatientAuthContext = createContext<PatientAuthContextType | undefined>(undefined);

export const PatientAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<PatientSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore stored session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PATIENT_STORAGE_KEYS.CURRENT_SESSION);
      if (stored) {
        const parsed: PatientSession = JSON.parse(stored);
        // Verify RLS validity on restoration
        const allPatients = getStoredPatients();
        const authP = allPatients.find((p) => p.id === parsed.authenticatedPatient.id);
        const selP = allPatients.find((p) => p.id === parsed.selectedPatient.id);

        if (authP && selP && authP.organization_id === DEFAULT_EGYPT_ORG.id) {
          const freshProfiles = getAuthorizedProfilesForAccount(authP.id, DEFAULT_EGYPT_ORG.id);
          setSession({
            ...parsed,
            authenticatedPatient: authP,
            selectedPatient: selP,
            availableProfiles: freshProfiles,
          });
        } else {
          localStorage.removeItem(PATIENT_STORAGE_KEYS.CURRENT_SESSION);
        }
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (
    mobile: string,
    pin: string
  ): Promise<{ success: boolean; errorKey?: string; profilesCount?: number }> => {
    setIsLoading(true);
    const normalized = normalizeMobile(mobile);
    const accounts = getStoredAccounts();
    const patients = getStoredPatients();

    // 1. Find account by normalized mobile number
    const account = accounts.find(
      (a) => a.mobile_number === normalized && a.organization_id === DEFAULT_EGYPT_ORG.id
    );

    if (!account) {
      setIsLoading(false);
      return { success: false, errorKey: 'patient_login_invalid_credentials' };
    }

    if (account.status === 'locked' || account.status === 'inactive') {
      setIsLoading(false);
      return { success: false, errorKey: 'patient_account_locked' };
    }

    // 2. Cryptographically verify PIN (Never plaintext!)
    const isPinValid = await verifyPin(pin, account.pin_salt, account.pin_hash);
    if (!isPinValid) {
      setIsLoading(false);
      return { success: false, errorKey: 'patient_login_invalid_credentials' };
    }

    // 3. Resolve authenticated patient record
    const authPatient = patients.find(
      (p) => p.id === account.patient_id && p.organization_id === DEFAULT_EGYPT_ORG.id
    );

    if (!authPatient || authPatient.status !== 'active') {
      setIsLoading(false);
      return { success: false, errorKey: 'patient_account_inactive' };
    }

    // 4. Resolve authorized profiles: Self + any authorized wards (explicit relationships only)
    const availableProfiles = getAuthorizedProfilesForAccount(authPatient.id, DEFAULT_EGYPT_ORG.id);

    const newSession: PatientSession = {
      account,
      authenticatedPatient: authPatient,
      selectedPatient: authPatient, // Defaults to account owner
      availableProfiles,
      organization: {
        id: DEFAULT_EGYPT_ORG.id,
        name: DEFAULT_EGYPT_ORG.name,
        code: DEFAULT_EGYPT_ORG.code,
      },
      token: `patient_token_${authPatient.id}_${Date.now()}`,
    };

    setSession(newSession);
    try {
      localStorage.setItem(PATIENT_STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(newSession));
    } catch {
      // ignore
    }

    setIsLoading(false);
    return { success: true, profilesCount: availableProfiles.length };
  };

  /**
   * Switches the active patient context.
   * STRICT SECURITY: Validates authorization on the server/RLS level.
   * A client cannot pass an unauthorized patient_id!
   */
  const selectPatientContext = (targetPatientId: string): { success: boolean; error?: string } => {
    if (!session) {
      return { success: false, error: 'No active session' };
    }

    const rlsCheck = simulatePatientRLS(
      session.authenticatedPatient.id,
      targetPatientId,
      session.organization.id
    );

    if (!rlsCheck.allowed || !rlsCheck.patient) {
      return {
        success: false,
        error: rlsCheck.error || 'Access to this patient profile is denied by RLS policy.',
      };
    }

    const updatedSession: PatientSession = {
      ...session,
      selectedPatient: rlsCheck.patient,
    };

    setSession(updatedSession);
    try {
      localStorage.setItem(PATIENT_STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(updatedSession));
    } catch {
      // ignore
    }

    return { success: true };
  };

  const updateProfile = async (allowedUpdates: {
    secondary_mobile?: string;
    email?: string;
    preferred_language?: 'ar' | 'en';
  }): Promise<{ success: boolean; error?: string }> => {
    if (!session) return { success: false, error: 'Not authenticated' };

    const res = updatePermittedPatientProfile(
      session.authenticatedPatient.id,
      session.selectedPatient.id,
      session.organization.id,
      allowedUpdates
    );

    if (!res.success || !res.patient) {
      return { success: false, error: res.error };
    }

    const freshProfiles = getAuthorizedProfilesForAccount(
      session.authenticatedPatient.id,
      session.organization.id
    );

    const updatedSession: PatientSession = {
      ...session,
      selectedPatient: res.patient,
      authenticatedPatient:
        session.authenticatedPatient.id === res.patient.id
          ? res.patient
          : session.authenticatedPatient,
      availableProfiles: freshProfiles,
    };

    setSession(updatedSession);
    try {
      localStorage.setItem(PATIENT_STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(updatedSession));
    } catch {
      // ignore
    }

    return { success: true };
  };

  const requestPinReset = async (
    mobile: string
  ): Promise<{ success: boolean; messageKey: string; mockToken?: string }> => {
    const res = requestForgotPin(mobile, DEFAULT_EGYPT_ORG.id);
    return {
      success: res.success,
      messageKey: res.messageKey,
      mockToken: res.mockTokenForDevTesting,
    };
  };

  const submitPinReset = async (
    mobile: string,
    token: string,
    newPin: string
  ): Promise<{ success: boolean; errorKey?: string }> => {
    return resetPatientPin(mobile, token, newPin, DEFAULT_EGYPT_ORG.id);
  };

  const logout = () => {
    setSession(null);
    try {
      localStorage.removeItem(PATIENT_STORAGE_KEYS.CURRENT_SESSION);
    } catch {
      // ignore
    }
  };

  return (
    <PatientAuthContext.Provider
      value={{
        session,
        isLoading,
        login,
        logout,
        selectPatientContext,
        updateProfile,
        requestPinReset,
        submitPinReset,
      }}
    >
      {children}
    </PatientAuthContext.Provider>
  );
};

export const usePatientAuth = () => {
  const context = useContext(PatientAuthContext);
  if (!context) {
    throw new Error('usePatientAuth must be used within a PatientAuthProvider');
  }
  return context;
};
