import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_EGYPT_ORG,
  SECONDARY_EGYPT_ORG,
} from '../src/lib/storage';
import {
  getStoredPatients,
  getStoredAccounts,
  getStoredGuardians,
  getAuthorizedProfilesForAccount,
  simulatePatientRLS,
  resetPatientStorageToSeeds,
} from '../src/lib/patientStorage';
import { normalizeMobile } from '../src/modules/patient-portal/utils/pinSecurity';

describe('Patient Portal: Profile Dropdown & Multi-Profile Shared Mobile Support', () => {
  beforeEach(() => {
    resetPatientStorageToSeeds();
  });

  it('1. Retrieves all linked profiles sharing the same mobile number within the organization', () => {
    const allPatients = getStoredPatients();
    const ahmed = allPatients.find((p) => p.primary_mobile === '+201000000001' && p.first_name === 'أحمد');
    expect(ahmed).toBeDefined();

    const linkedProfiles = getAuthorizedProfilesForAccount(ahmed!.id, DEFAULT_EGYPT_ORG.id);

    // Ahmed, Laila, Omar all share +201000000001 and are in the same organization
    expect(linkedProfiles.length).toBeGreaterThanOrEqual(3);

    const codes = linkedProfiles.map((p) => p.patient_code);
    expect(codes).toContain('PAT-000001'); // Ahmed
    expect(codes).toContain('PAT-000002'); // Laila
    expect(codes).toContain('PAT-000003'); // Omar

    // All linked profiles have unique discrete IDs despite sharing mobile
    const uniqueIds = new Set(linkedProfiles.map((p) => p.id));
    expect(uniqueIds.size).toBe(linkedProfiles.length);
  });

  it('2. Allows switching active context between linked accounts sharing the same mobile', () => {
    const allPatients = getStoredPatients();
    const ahmed = allPatients.find((p) => p.patient_code === 'PAT-000001')!;
    const laila = allPatients.find((p) => p.patient_code === 'PAT-000002')!;
    const omar = allPatients.find((p) => p.patient_code === 'PAT-000003')!;

    // Switching to Laila (shares mobile and ward relationship)
    const rlsLaila = simulatePatientRLS(ahmed.id, laila.id, DEFAULT_EGYPT_ORG.id);
    expect(rlsLaila.allowed).toBe(true);
    expect(rlsLaila.patient?.id).toBe(laila.id);

    // Switching to Omar (shares mobile and ward relationship)
    const rlsOmar = simulatePatientRLS(ahmed.id, omar.id, DEFAULT_EGYPT_ORG.id);
    expect(rlsOmar.allowed).toBe(true);
    expect(rlsOmar.patient?.id).toBe(omar.id);

    // Switching back to Self (Ahmed)
    const rlsAhmed = simulatePatientRLS(ahmed.id, ahmed.id, DEFAULT_EGYPT_ORG.id);
    expect(rlsAhmed.allowed).toBe(true);
    expect(rlsAhmed.patient?.id).toBe(ahmed.id);
  });

  it('3. Prevents unauthorized switching to unrelated accounts on different mobile numbers', () => {
    const allPatients = getStoredPatients();
    const ahmed = allPatients.find((p) => p.patient_code === 'PAT-000001')!;
    const mona = allPatients.find((p) => p.patient_code === 'PAT-000004')!; // Mobile: +201000000002

    expect(mona.primary_mobile).not.toBe(ahmed.primary_mobile);

    // Ahmed cannot switch to Mona's profile
    const rlsMona = simulatePatientRLS(ahmed.id, mona.id, DEFAULT_EGYPT_ORG.id);
    expect(rlsMona.allowed).toBe(false);
    expect(rlsMona.error).toContain('RLS Security Violation');
  });

  it('4. Enforces strict multi-tenant boundary even if mobile numbers matched across orgs', () => {
    const allPatients = getStoredPatients();
    const ahmed = allPatients.find((p) => p.patient_code === 'PAT-000001')!;

    // Foreign org patient
    const foreignPatient = allPatients.find((p) => p.organization_id === SECONDARY_EGYPT_ORG.id)!;
    expect(foreignPatient).toBeDefined();

    const rlsForeign = simulatePatientRLS(ahmed.id, foreignPatient.id, DEFAULT_EGYPT_ORG.id);
    expect(rlsForeign.allowed).toBe(false);
  });
});
