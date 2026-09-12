import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredPatients,
  getStoredFamilies,
  getStoredFamilyMembers,
  getStoredGuardians,
  updateGuardianAuthorization,
  linkPatientToFamilyUnit,
  resetPatientStorageToSeeds,
} from '../src/lib/patientStorage';
import { DEFAULT_EGYPT_ORG } from '../src/lib/storage';
import { GuardianPermissionScope, GuardianAuthorizationStatus } from '../src/types/patient';

describe('Family Link UI, Guardian Authorization Status & Active Patient Context', () => {
  beforeEach(() => {
    resetPatientStorageToSeeds();
  });

  it('retrieves seeded family members and their relationships', () => {
    const families = getStoredFamilies();
    const familyMembers = getStoredFamilyMembers();
    const ahmedFamily = families.find((f) => f.id === 'fam_mohamed_01');

    expect(ahmedFamily).toBeDefined();
    expect(ahmedFamily?.name).toBe('عائلة أحمد محمد');

    const members = familyMembers.filter((fm) => fm.family_id === 'fam_mohamed_01');
    expect(members.length).toBe(3);

    const relationships = members.map((m) => m.relationship);
    expect(relationships).toContain('father');
    expect(relationships).toContain('daughter');
    expect(relationships).toContain('son');
  });

  it('links an existing patient to the family unit successfully', () => {
    const orgId = DEFAULT_EGYPT_ORG.id;
    const familyId = 'fam_mohamed_01';
    const newSpousePatientId = 'pat_spouse_demo_01';

    const result = linkPatientToFamilyUnit(orgId, familyId, newSpousePatientId, 'spouse');
    expect(result).toBe(true);

    const familyMembers = getStoredFamilyMembers();
    const linked = familyMembers.find(
      (fm) => fm.family_id === familyId && fm.patient_id === newSpousePatientId
    );
    expect(linked).toBeDefined();
    expect(linked?.relationship).toBe('spouse');
  });

  it('loads guardians with verified authorization status and scopes', () => {
    const guardians = getStoredGuardians();
    expect(guardians.length).toBeGreaterThanOrEqual(2);

    const lailaGuardianship = guardians.find(
      (g) => g.ward_patient_id === 'b2222222-2222-2222-2222-222222222222'
    );
    expect(lailaGuardianship).toBeDefined();
    expect(lailaGuardianship?.authorization_status).toBe('verified');
    expect(lailaGuardianship?.scopes).toContain('medical_records');
    expect(lailaGuardianship?.scopes).toContain('appointments');
    expect(lailaGuardianship?.scopes).toContain('financials');
    expect(lailaGuardianship?.scopes).toContain('consent');
    expect(lailaGuardianship?.scopes).toContain('prescriptions');
    expect(lailaGuardianship?.guardian_national_id).toBe('28001010101234');
    expect(lailaGuardianship?.document_reference).toBeDefined();
  });

  it('updates guardian authorization status and permission scopes', () => {
    const guardians = getStoredGuardians();
    const firstRel = guardians[0];
    expect(firstRel).toBeDefined();

    const newScopes: GuardianPermissionScope[] = ['medical_records', 'appointments'];
    const updated = updateGuardianAuthorization(firstRel.id, {
      authorization_status: 'restricted',
      scopes: newScopes,
      notes: 'Emergency access granted for orthodontic treatment',
    });
    expect(updated).toBe(true);

    const reloaded = getStoredGuardians().find((g) => g.id === firstRel.id);
    expect(reloaded?.authorization_status).toBe('restricted');
    expect(reloaded?.scopes).toEqual(newScopes);
    expect(reloaded?.notes).toBe('Emergency access granted for orthodontic treatment');
  });
});
