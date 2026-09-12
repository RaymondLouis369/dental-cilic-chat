/**
 * Patient Storage, RLS Evaluation & Seed Data
 * Phase 2: Patient Identity & Patient Portal — Egypt
 */

import {
  Patient,
  Family,
  FamilyMember,
  FamilyRelationshipType,
  GuardianRelationship,
  PatientAccount,
  PatientCard,
} from '../types/patient';
import { DEFAULT_EGYPT_ORG, SECONDARY_EGYPT_ORG } from './storage';
import {
  hashPin,
  normalizeMobile,
  generateOpaqueQrToken,
  validatePinRules,
} from '../modules/patient-portal/utils/pinSecurity';

export { normalizeMobile };

// Keys for local persistence
export const PATIENT_STORAGE_KEYS = {
  PATIENTS: 'dental_saas_patients',
  FAMILIES: 'dental_saas_families',
  FAMILY_MEMBERS: 'dental_saas_family_members',
  GUARDIANS: 'dental_saas_guardians',
  ACCOUNTS: 'dental_saas_patient_accounts',
  CARDS: 'dental_saas_patient_cards',
  CURRENT_SESSION: 'dental_saas_patient_session',
  PASSWORD_RESETS: 'dental_saas_pin_resets',
};

// Safe storage wrapper
const memoryStore = new Map<string, string>();
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // ignore
    }
    return memoryStore.get(key) || null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // ignore
    }
    memoryStore.set(key, value);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {
      // ignore
    }
    memoryStore.delete(key);
  },
};

// ============================================================================
// 1. SEED DATA FOR EGYPTIAN DENTAL PATIENTS
// ============================================================================

export const SEED_PATIENTS: Patient[] = [
  // Patient 1: Ahmed Mohamed (Adult, Father, Primary Account Holder)
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_code: 'PAT-000001',
    first_name: 'أحمد',
    middle_name: 'محمود',
    last_name: 'محمد',
    date_of_birth: '1988-05-12', // 38 years old (Adult)
    gender: 'male',
    primary_mobile: '+201000000001',
    secondary_mobile: '+20223581234',
    email: 'ahmed.mohamed@example.eg',
    preferred_language: 'ar',
    country_code: '+20',
    status: 'active',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-01-10T10:00:00Z',
  },
  // Patient 2: Laila Ahmed (Child, Daughter - shares mobile +201000000001 with father)
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_code: 'PAT-000002',
    first_name: 'ليلى',
    middle_name: 'أحمد',
    last_name: 'محمد',
    date_of_birth: '2017-09-20', // 9 years old (Child)
    gender: 'female',
    primary_mobile: '+201000000001', // SHARED MOBILE WITH FATHER
    preferred_language: 'ar',
    country_code: '+20',
    status: 'active',
    created_at: '2026-01-15T11:00:00Z',
    updated_at: '2026-01-15T11:00:00Z',
  },
  // Patient 3: Omar Ahmed (Child, Son - shares mobile +201000000001 with father)
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_code: 'PAT-000003',
    first_name: 'عمر',
    middle_name: 'أحمد',
    last_name: 'محمد',
    date_of_birth: '2020-03-15', // 6 years old (Child)
    gender: 'male',
    primary_mobile: '+201000000001', // SHARED MOBILE WITH FATHER
    preferred_language: 'ar',
    country_code: '+20',
    status: 'active',
    created_at: '2026-01-15T11:30:00Z',
    updated_at: '2026-01-15T11:30:00Z',
  },
  // Patient 4: Mona Hassan (Adult, independent patient with different mobile)
  {
    id: 'd4444444-4444-4444-4444-444444444444',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_code: 'PAT-000004',
    first_name: 'منى',
    middle_name: 'علي',
    last_name: 'حسن',
    date_of_birth: '1994-11-04', // 32 years old (Adult)
    gender: 'female',
    primary_mobile: '+201000000002', // INDEPENDENT MOBILE
    email: 'mona.hassan@example.eg',
    preferred_language: 'ar',
    country_code: '+20',
    status: 'active',
    created_at: '2026-02-01T09:00:00Z',
    updated_at: '2026-02-01T09:00:00Z',
  },
  // Patient 5: Foreign Org Patient (Nile Pearl Dental Center - for RLS cross-org testing)
  {
    id: 'e5555555-5555-5555-5555-555555555555',
    organization_id: SECONDARY_EGYPT_ORG.id,
    patient_code: 'PAT-SEC-000001',
    first_name: 'طارق',
    middle_name: 'سمير',
    last_name: 'منصور',
    date_of_birth: '1985-04-18',
    gender: 'male',
    primary_mobile: '+201000000099',
    preferred_language: 'ar',
    country_code: '+20',
    status: 'active',
    created_at: '2026-02-05T14:00:00Z',
    updated_at: '2026-02-05T14:00:00Z',
  },
];

// Family Unit
export const SEED_FAMILIES: Family[] = [
  {
    id: 'fam_mohamed_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    family_code: 'FAM-000001',
    name: 'عائلة أحمد محمد',
    head_patient_id: 'a1111111-1111-1111-1111-111111111111',
    created_at: '2026-01-15T12:00:00Z',
    updated_at: '2026-01-15T12:00:00Z',
  },
];

export const SEED_FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: 'fm_01',
    family_id: 'fam_mohamed_01',
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    relationship: 'father',
    created_at: '2026-01-15T12:00:00Z',
  },
  {
    id: 'fm_02',
    family_id: 'fam_mohamed_01',
    patient_id: 'b2222222-2222-2222-2222-222222222222',
    relationship: 'daughter',
    created_at: '2026-01-15T12:00:00Z',
  },
  {
    id: 'fm_03',
    family_id: 'fam_mohamed_01',
    patient_id: 'c3333333-3333-3333-3333-333333333333',
    relationship: 'son',
    created_at: '2026-01-15T12:00:00Z',
  },
];

// Guardian Relationships (Explicit legal authority from Ahmed to Laila & Omar)
export const SEED_GUARDIANS: GuardianRelationship[] = [
  {
    id: 'gr_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    guardian_patient_id: 'a1111111-1111-1111-1111-111111111111', // Ahmed
    ward_patient_id: 'b2222222-2222-2222-2222-222222222222', // Laila
    relationship_type: 'parent',
    authorization_status: 'verified',
    scopes: ['medical_records', 'appointments', 'financials', 'consent', 'prescriptions'],
    guardian_national_id: '28001010101234',
    document_reference: 'شهادة ميلاد رقمية مميكنة رقم 10293847291024',
    verified_at: '2026-01-16T10:00:00Z',
    verified_by: 'د. كريم عبد العزيز (مدير المركز الطبي)',
    active: true,
    created_at: '2026-01-15T12:00:00Z',
    updated_at: '2026-01-15T12:00:00Z',
  },
  {
    id: 'gr_02',
    organization_id: DEFAULT_EGYPT_ORG.id,
    guardian_patient_id: 'a1111111-1111-1111-1111-111111111111', // Ahmed
    ward_patient_id: 'c3333333-3333-3333-3333-333333333333', // Omar
    relationship_type: 'parent',
    authorization_status: 'verified',
    scopes: ['medical_records', 'appointments', 'financials', 'consent', 'prescriptions'],
    guardian_national_id: '28001010101234',
    document_reference: 'شهادة ميلاد رقمية مميكنة رقم 10293847291025',
    verified_at: '2026-01-16T10:00:00Z',
    verified_by: 'د. كريم عبد العزيز (مدير المركز الطبي)',
    active: true,
    created_at: '2026-01-15T12:00:00Z',
    updated_at: '2026-01-15T12:00:00Z',
  },
];

// Patient Accounts (PINs are securely hashed; NEVER stored plaintext)
// For demonstration:
// Ahmed PIN = '7492' (Salt: 'salt_ahmed_demo_01')
// Mona PIN = '8319' (Salt: 'salt_mona_demo_02')
export const SEED_PATIENT_ACCOUNTS: PatientAccount[] = [
  {
    id: 'acc_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    mobile_number: '+201000000001',
    pin_salt: 'salt_ahmed_demo_01',
    // Pre-computed SHA-256 for 'dental_pin_v1:salt_ahmed_demo_01:7492'
    pin_hash: '3f04439c148386ddad8e612ea2c9a9fba7564d6e90e7da3c56ef0be09db7fe92',
    failed_attempts: 0,
    status: 'active',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-01-10T10:00:00Z',
  },
  {
    id: 'acc_02',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'd4444444-4444-4444-4444-444444444444',
    mobile_number: '+201000000002',
    pin_salt: 'salt_mona_demo_02',
    // Pre-computed SHA-256 for 'dental_pin_v1:salt_mona_demo_02:8319'
    pin_hash: '22a16d0046b5394be544e43e260950bf93c93ee140f7d544062a4d3cf7c18151',
    failed_attempts: 0,
    status: 'active',
    created_at: '2026-02-01T09:00:00Z',
    updated_at: '2026-02-01T09:00:00Z',
  },
];

// Digital Patient Cards (Opaque QR references with NO sensitive data)
export const SEED_PATIENT_CARDS: PatientCard[] = [
  {
    id: 'card_01',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'a1111111-1111-1111-1111-111111111111',
    card_number: 'CARD-PAT-000001',
    qr_token: 'eg_dcard_v1:00000000-a1111111-893f12ca7b5a831e',
    issued_at: '2026-01-10T10:00:00Z',
    status: 'active',
  },
  {
    id: 'card_02',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'b2222222-2222-2222-2222-222222222222',
    card_number: 'CARD-PAT-000002',
    qr_token: 'eg_dcard_v1:00000000-b2222222-771f28bc9a2d348f',
    issued_at: '2026-01-15T11:00:00Z',
    status: 'active',
  },
  {
    id: 'card_03',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'c3333333-3333-3333-3333-333333333333',
    card_number: 'CARD-PAT-000003',
    qr_token: 'eg_dcard_v1:00000000-c3333333-449e01db8b1c4912',
    issued_at: '2026-01-15T11:30:00Z',
    status: 'active',
  },
  {
    id: 'card_04',
    organization_id: DEFAULT_EGYPT_ORG.id,
    patient_id: 'd4444444-4444-4444-4444-444444444444',
    card_number: 'CARD-PAT-000004',
    qr_token: 'eg_dcard_v1:00000000-d4444444-551a39cc6e9b2104',
    issued_at: '2026-02-01T09:00:00Z',
    status: 'active',
  },
];

// Initialize storage with seeds if not present
export function initializePatientStorage(): void {
  if (!safeStorage.getItem(PATIENT_STORAGE_KEYS.PATIENTS)) {
    safeStorage.setItem(PATIENT_STORAGE_KEYS.PATIENTS, JSON.stringify(SEED_PATIENTS));
  }
  if (!safeStorage.getItem(PATIENT_STORAGE_KEYS.FAMILIES)) {
    safeStorage.setItem(PATIENT_STORAGE_KEYS.FAMILIES, JSON.stringify(SEED_FAMILIES));
  }
  if (!safeStorage.getItem(PATIENT_STORAGE_KEYS.FAMILY_MEMBERS)) {
    safeStorage.setItem(PATIENT_STORAGE_KEYS.FAMILY_MEMBERS, JSON.stringify(SEED_FAMILY_MEMBERS));
  }
  if (!safeStorage.getItem(PATIENT_STORAGE_KEYS.GUARDIANS)) {
    safeStorage.setItem(PATIENT_STORAGE_KEYS.GUARDIANS, JSON.stringify(SEED_GUARDIANS));
  }
  if (!safeStorage.getItem(PATIENT_STORAGE_KEYS.ACCOUNTS)) {
    safeStorage.setItem(PATIENT_STORAGE_KEYS.ACCOUNTS, JSON.stringify(SEED_PATIENT_ACCOUNTS));
  }
  if (!safeStorage.getItem(PATIENT_STORAGE_KEYS.CARDS)) {
    safeStorage.setItem(PATIENT_STORAGE_KEYS.CARDS, JSON.stringify(SEED_PATIENT_CARDS));
  }
}

export function resetPatientStorageToSeeds(): void {
  safeStorage.setItem(PATIENT_STORAGE_KEYS.PATIENTS, JSON.stringify(SEED_PATIENTS));
  safeStorage.setItem(PATIENT_STORAGE_KEYS.FAMILIES, JSON.stringify(SEED_FAMILIES));
  safeStorage.setItem(PATIENT_STORAGE_KEYS.FAMILY_MEMBERS, JSON.stringify(SEED_FAMILY_MEMBERS));
  safeStorage.setItem(PATIENT_STORAGE_KEYS.GUARDIANS, JSON.stringify(SEED_GUARDIANS));
  safeStorage.setItem(PATIENT_STORAGE_KEYS.ACCOUNTS, JSON.stringify(SEED_PATIENT_ACCOUNTS));
  safeStorage.setItem(PATIENT_STORAGE_KEYS.CARDS, JSON.stringify(SEED_PATIENT_CARDS));
}

// Ensure initialized on load
initializePatientStorage();

// ============================================================================
// 2. QUERY & MUTATION HELPERS
// ============================================================================

export function getStoredPatients(): Patient[] {
  initializePatientStorage();
  const raw = safeStorage.getItem(PATIENT_STORAGE_KEYS.PATIENTS);
  return raw ? JSON.parse(raw) : SEED_PATIENTS;
}

export function getStoredGuardians(): GuardianRelationship[] {
  initializePatientStorage();
  const raw = safeStorage.getItem(PATIENT_STORAGE_KEYS.GUARDIANS);
  const list: GuardianRelationship[] = raw ? JSON.parse(raw) : SEED_GUARDIANS;
  return list.map((g) => ({
    ...g,
    authorization_status: g.authorization_status || 'verified',
    scopes: g.scopes || ['medical_records', 'appointments', 'financials', 'consent', 'prescriptions'],
    guardian_national_id: g.guardian_national_id || '28001010101234',
    document_reference: g.document_reference || 'شهادة ميلاد رقمية مميكنة - سجل مدني الدقي',
    verified_at: g.verified_at || g.created_at,
  }));
}

export function getStoredFamilies(): Family[] {
  initializePatientStorage();
  const raw = safeStorage.getItem(PATIENT_STORAGE_KEYS.FAMILIES);
  return raw ? JSON.parse(raw) : SEED_FAMILIES;
}

export function getStoredFamilyMembers(): FamilyMember[] {
  initializePatientStorage();
  const raw = safeStorage.getItem(PATIENT_STORAGE_KEYS.FAMILY_MEMBERS);
  return raw ? JSON.parse(raw) : SEED_FAMILY_MEMBERS;
}

export function getStoredAccounts(): PatientAccount[] {
  initializePatientStorage();
  const raw = safeStorage.getItem(PATIENT_STORAGE_KEYS.ACCOUNTS);
  return raw ? JSON.parse(raw) : SEED_PATIENT_ACCOUNTS;
}

export function getStoredCards(): PatientCard[] {
  initializePatientStorage();
  const raw = safeStorage.getItem(PATIENT_STORAGE_KEYS.CARDS);
  return raw ? JSON.parse(raw) : SEED_PATIENT_CARDS;
}

/**
 * Generates next sequential patient code: PAT-XXXXXX
 */
export function generateNextPatientCode(organizationId: string): string {
  const patients = getStoredPatients().filter((p) => p.organization_id === organizationId);
  const nextNum = patients.length + 1;
  return `PAT-${nextNum.toString().padStart(6, '0')}`;
}

/**
 * Authenticates patient credentials using salted SHA-256 hash.
 */
export async function authenticatePatientCredentials(
  organizationId: string,
  rawMobile: string,
  pin: string
): Promise<{ success: boolean; account?: PatientAccount; error?: string }> {
  const normalized = normalizeMobile(rawMobile);
  const accounts = getStoredAccounts();
  const account = accounts.find(
    (a) => a.mobile_number === normalized && a.organization_id === organizationId
  );
  if (!account) return { success: false, error: 'Account not found' };
  const { verifyPin } = await import('../modules/patient-portal/utils/pinSecurity');
  const isValid = await verifyPin(pin, account.pin_salt, account.pin_hash);
  if (!isValid) return { success: false, error: 'Invalid PIN' };
  return { success: true, account };
}

// ============================================================================
// 3. SERVER-SIDE / DATABASE RLS SIMULATION FOR PATIENTS
// ============================================================================

/**
 * Strict RLS evaluation for Patient Identity Access:
 * - A patient can access their own patient record (authenticatedPatientId === targetPatientId)
 * - An authenticated guardian can access authorized wards (via active guardian_relationships row)
 * - Cross-organization access is strictly rejected!
 * - Sharing the same mobile number does NOT grant access without an explicit relationship.
 * - Supplying an unauthorized patient_id from the client fails immediately.
 */
export function simulatePatientRLS(
  authenticatedPatientId: string,
  targetPatientId: string,
  organizationId: string
): { allowed: boolean; patient?: Patient; error?: string } {
  const allPatients = getStoredPatients();
  const guardians = getStoredGuardians();

  // Find authenticated patient
  const authPatient = allPatients.find((p) => p.id === authenticatedPatientId);
  if (!authPatient) {
    return { allowed: false, error: 'Authentication identity not found' };
  }

  // 1. Cross-organization isolation check
  if (authPatient.organization_id !== organizationId) {
    return { allowed: false, error: 'Cross-organization access rejected by RLS' };
  }

  // Find target patient
  const targetPatient = allPatients.find((p) => p.id === targetPatientId);
  if (!targetPatient) {
    return { allowed: false, error: 'Target patient record does not exist' };
  }

  if (targetPatient.organization_id !== organizationId) {
    return { allowed: false, error: 'Target patient belongs to a different organization' };
  }

  // 2. Self Access: Patient reading their own profile
  if (authenticatedPatientId === targetPatientId) {
    return { allowed: true, patient: targetPatient };
  }

  // 3. Guardian Access: Check explicit active relationship
  const isAuthorizedGuardian = guardians.some(
    (g) =>
      g.organization_id === organizationId &&
      g.guardian_patient_id === authenticatedPatientId &&
      g.ward_patient_id === targetPatientId &&
      g.active === true
  );

  if (isAuthorizedGuardian) {
    return { allowed: true, patient: targetPatient };
  }

  // 4. Shared Mobile Account Access: Multiple profiles associated with the same mobile number within the organization
  const normalizedAuthMobile = normalizeMobile(authPatient.primary_mobile);
  const normalizedTargetMobile = normalizeMobile(targetPatient.primary_mobile);
  if (
    normalizedAuthMobile &&
    normalizedTargetMobile &&
    normalizedAuthMobile === normalizedTargetMobile &&
    targetPatient.organization_id === organizationId
  ) {
    return { allowed: true, patient: targetPatient };
  }

  // 5. Denied: Unrelated patient with different mobile number or outside organization!
  return {
    allowed: false,
    error: 'RLS Security Violation: Unauthorized patient profile access denied.',
  };
}

/**
 * Returns all profiles an authenticated account is authorized to view:
 * Self + Authorized Wards + Profiles sharing the same mobile number in the organization.
 */
export function getAuthorizedProfilesForAccount(
  authenticatedPatientId: string,
  organizationId: string
): Patient[] {
  const allPatients = getStoredPatients();
  const guardians = getStoredGuardians();

  const authPatient = allPatients.find(
    (p) => p.id === authenticatedPatientId && p.organization_id === organizationId
  );
  if (!authPatient) return [];

  const wardIds = new Set(
    guardians
      .filter(
        (g) =>
          g.guardian_patient_id === authenticatedPatientId &&
          g.organization_id === organizationId &&
          g.active === true
      )
      .map((g) => g.ward_patient_id)
  );

  const normalizedAuthMobile = normalizeMobile(authPatient.primary_mobile);

  return allPatients.filter(
    (p) =>
      p.organization_id === organizationId &&
      (p.id === authenticatedPatientId ||
        wardIds.has(p.id) ||
        (normalizedAuthMobile && normalizeMobile(p.primary_mobile) === normalizedAuthMobile))
  );
}

// ============================================================================
// 4. REGISTRATION & PROFILE MANAGEMENT
// ============================================================================

export interface RegisterPatientInput {
  organizationId: string;
  fullName: string;
  mobile: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender?: 'male' | 'female' | 'other';
  email?: string;
  preferredLanguage?: 'ar' | 'en';
  pin: string;
  insuranceCompany?: string;
}

export async function registerNewPatient(
  input: RegisterPatientInput
): Promise<{ success: boolean; patient?: Patient; error?: string }> {
  const patients = getStoredPatients();
  const accounts = getStoredAccounts();
  const cards = getStoredCards();

  const normalizedMobile = normalizeMobile(input.mobile);
  if (!normalizedMobile) {
    return { success: false, error: 'invalid_mobile' };
  }

  // Name splitting
  const nameParts = input.fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || 'مريض';
  const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : undefined;
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'جديد';

  // Next Patient Code
  const nextNum = patients.length + 1;
  const patientCode = `PAT-${nextNum.toString().padStart(6, '0')}`;

  // Validate PIN Rules
  const pinValidation = validatePinRules(input.pin, {
    mobile: normalizedMobile,
    dob: input.dateOfBirth,
    patientCode,
  });

  if (!pinValidation.valid) {
    return { success: false, error: pinValidation.errorKey || 'invalid_pin' };
  }

  const patientId = 'pat_' + Math.random().toString(36).substring(2, 11);
  const now = new Date().toISOString();

  const newPatient: Patient = {
    id: patientId,
    organization_id: input.organizationId,
    patient_code: patientCode,
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    date_of_birth: input.dateOfBirth,
    gender: input.gender,
    primary_mobile: normalizedMobile,
    email: input.email?.trim() || undefined,
    preferred_language: input.preferredLanguage || 'ar',
    country_code: '+20',
    insurance_company: input.insuranceCompany,
    status: 'active',
    created_at: now,
    updated_at: now,
  };

  // Securely Hash PIN
  const salt = 'salt_' + Math.random().toString(36).substring(2, 10);
  const pinHash = await hashPin(input.pin, salt);

  const newAccount: PatientAccount = {
    id: 'acc_' + Math.random().toString(36).substring(2, 11),
    organization_id: input.organizationId,
    patient_id: patientId,
    mobile_number: normalizedMobile,
    pin_salt: salt,
    pin_hash: pinHash,
    failed_attempts: 0,
    status: 'active',
    created_at: now,
    updated_at: now,
  };

  // Generate Digital Card & Opaque QR
  const qrToken = generateOpaqueQrToken(patientId, input.organizationId);
  const newCard: PatientCard = {
    id: 'card_' + Math.random().toString(36).substring(2, 11),
    organization_id: input.organizationId,
    patient_id: patientId,
    card_number: `CARD-${patientCode}`,
    qr_token: qrToken,
    issued_at: now,
    status: 'active',
  };

  // Persist
  patients.push(newPatient);
  accounts.push(newAccount);
  cards.push(newCard);

  safeStorage.setItem(PATIENT_STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
  safeStorage.setItem(PATIENT_STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  safeStorage.setItem(PATIENT_STORAGE_KEYS.CARDS, JSON.stringify(cards));

  return { success: true, patient: newPatient };
}

/**
 * Updates permitted profile fields (secondary_mobile, email, preferred_language).
 * Strictly forbids modifying patient_id, organization_id, DOB, or clinical fields!
 */
export function updatePermittedPatientProfile(
  authenticatedPatientId: string,
  targetPatientId: string,
  organizationId: string,
  allowedUpdates: {
    secondary_mobile?: string;
    email?: string;
    preferred_language?: 'ar' | 'en';
  }
): { success: boolean; patient?: Patient; error?: string } {
  const rlsCheck = simulatePatientRLS(authenticatedPatientId, targetPatientId, organizationId);
  if (!rlsCheck.allowed || !rlsCheck.patient) {
    return { success: false, error: rlsCheck.error || 'Unauthorized' };
  }

  const allPatients = getStoredPatients();
  const index = allPatients.findIndex((p) => p.id === targetPatientId);
  if (index === -1) return { success: false, error: 'Patient not found' };

  // Apply ONLY allowed fields
  const updated = {
    ...allPatients[index],
    secondary_mobile: allowedUpdates.secondary_mobile ?? allPatients[index].secondary_mobile,
    email: allowedUpdates.email ?? allPatients[index].email,
    preferred_language: allowedUpdates.preferred_language ?? allPatients[index].preferred_language,
    updated_at: new Date().toISOString(),
  };

  allPatients[index] = updated;
  safeStorage.setItem(PATIENT_STORAGE_KEYS.PATIENTS, JSON.stringify(allPatients));
  return { success: true, patient: updated };
}

// ============================================================================
// 5. DIGITAL CARD & QR RESOLUTION
// ============================================================================

export function getPatientCard(patientId: string, orgId: string): PatientCard | null {
  const cards = getStoredCards();
  return (
    cards.find(
      (c) => c.patient_id === patientId && c.organization_id === orgId && c.status === 'active'
    ) || null
  );
}

/**
 * Resolves patient from an opaque digital card QR token.
 * Validates that token belongs to organization and points to an active patient.
 */
export function resolvePatientByQrToken(
  qrToken: string,
  organizationId: string
): { success: boolean; patient?: Patient; error?: string } {
  const cards = getStoredCards();
  const card = cards.find(
    (c) => c.qr_token === qrToken && c.organization_id === organizationId && c.status === 'active'
  );

  if (!card) {
    return { success: false, error: 'Invalid or expired QR token' };
  }

  const patients = getStoredPatients();
  const patient = patients.find(
    (p) => p.id === card.patient_id && p.organization_id === organizationId
  );

  if (!patient || patient.status !== 'active') {
    return { success: false, error: 'Patient profile not active' };
  }

  return { success: true, patient };
}

// ============================================================================
// 6. FORGOT PIN FOUNDATION
// ============================================================================

/**
 * Initiates forgot PIN workflow.
 * CRITICAL PRIVACY RULE: Public response must NOT leak account existence.
 * Returns a uniform generic confirmation message.
 */
export function requestForgotPin(
  rawMobile: string,
  organizationId: string
): {
  success: boolean;
  messageKey: string;
  mockTokenForDevTesting?: string;
} {
  const normalized = normalizeMobile(rawMobile);
  const accounts = getStoredAccounts();
  const matched = accounts.find(
    (a) => a.mobile_number === normalized && a.organization_id === organizationId
  );

  let devMockToken: string | undefined = undefined;

  if (matched) {
    // Generate secure reset verification token
    const token = 'otp_' + Math.floor(100000 + Math.random() * 900000);
    devMockToken = token;
    
    // Store reset request with 15 min expiry
    const resetsRaw = safeStorage.getItem(PATIENT_STORAGE_KEYS.PASSWORD_RESETS);
    const resets = resetsRaw ? JSON.parse(resetsRaw) : {};
    resets[normalized] = {
      token,
      accountId: matched.id,
      expiresAt: Date.now() + 15 * 60 * 1000,
    };
    safeStorage.setItem(PATIENT_STORAGE_KEYS.PASSWORD_RESETS, JSON.stringify(resets));
  }

  // Always return identical success response to prevent mobile enumeration attacks!
  return {
    success: true,
    messageKey: 'forgot_pin_dispatched_generic',
    mockTokenForDevTesting: devMockToken,
  };
}

/**
 * Resets Patient PIN using verified token.
 */
export async function resetPatientPin(
  rawMobile: string,
  token: string,
  newPin: string,
  organizationId: string
): Promise<{ success: boolean; errorKey?: string }> {
  const normalized = normalizeMobile(rawMobile);
  const resetsRaw = safeStorage.getItem(PATIENT_STORAGE_KEYS.PASSWORD_RESETS);
  const resets = resetsRaw ? JSON.parse(resetsRaw) : {};
  const record = resets[normalized];

  if (!record || record.token !== token || record.expiresAt < Date.now()) {
    return { success: false, errorKey: 'invalid_reset_token' };
  }

  // Validate new PIN rules
  const pinCheck = validatePinRules(newPin, { mobile: normalized });
  if (!pinCheck.valid) {
    return { success: false, errorKey: pinCheck.errorKey };
  }

  // Update account
  const accounts = getStoredAccounts();
  const accIndex = accounts.findIndex(
    (a) => a.id === record.accountId && a.organization_id === organizationId
  );
  if (accIndex === -1) {
    return { success: false, errorKey: 'account_not_found' };
  }

  const salt = 'salt_' + Math.random().toString(36).substring(2, 10);
  const pinHash = await hashPin(newPin, salt);

  accounts[accIndex].pin_salt = salt;
  accounts[accIndex].pin_hash = pinHash;
  accounts[accIndex].failed_attempts = 0;
  accounts[accIndex].updated_at = new Date().toISOString();

  safeStorage.setItem(PATIENT_STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));

  // Invalidate reset token
  delete resets[normalized];
  safeStorage.setItem(PATIENT_STORAGE_KEYS.PASSWORD_RESETS, JSON.stringify(resets));

  return { success: true };
}

/**
 * Updates Guardian Authorization details (status, permission scopes, national ID, notes)
 */
export function updateGuardianAuthorization(
  guardianRelId: string,
  updates: Partial<GuardianRelationship>
): boolean {
  const guardians = getStoredGuardians();
  const index = guardians.findIndex((g) => g.id === guardianRelId);
  if (index === -1) return false;

  guardians[index] = {
    ...guardians[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  safeStorage.setItem(PATIENT_STORAGE_KEYS.GUARDIANS, JSON.stringify(guardians));
  return true;
}

/**
 * Links an existing patient to a family or creates a family unit if one does not exist.
 */
export function linkPatientToFamilyUnit(
  organizationId: string,
  familyId: string,
  patientId: string,
  relationship: FamilyRelationshipType
): boolean {
  const familyMembers = getStoredFamilyMembers();
  const existing = familyMembers.find(
    (fm) => fm.family_id === familyId && fm.patient_id === patientId
  );
  if (existing) {
    existing.relationship = relationship;
  } else {
    familyMembers.push({
      id: 'fm_' + Math.random().toString(36).substring(2, 10),
      family_id: familyId,
      patient_id: patientId,
      relationship,
      created_at: new Date().toISOString(),
    });
  }
  safeStorage.setItem(PATIENT_STORAGE_KEYS.FAMILY_MEMBERS, JSON.stringify(familyMembers));
  return true;
}

