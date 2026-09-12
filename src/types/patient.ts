/**
 * Phase 2: Patient Identity, Family Model, Guardian Relations & Patient Portal Types
 * Dental Clinic & Dental Center Management Platform — Egypt
 */

export type PatientStatus = 'active' | 'inactive' | 'blocked' | 'archived';
export type Gender = 'male' | 'female' | 'other';
export type AgeGroup = 'child' | 'adult';

export interface Patient {
  id: string; // Database UUID
  organization_id: string; // Organization-level scope (NOT branch-scoped)
  patient_code: string; // Human-friendly code e.g. PAT-000001
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string; // ISO format: YYYY-MM-DD
  gender?: Gender;
  primary_mobile: string; // Normalized E.164 (e.g. +201000000001)
  secondary_mobile?: string;
  email?: string;
  preferred_language: 'ar' | 'en';
  country_code: string; // Default '+20' / 'EG'
  insurance_company?: string; // Forward-compatible placeholder
  status: PatientStatus;
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  organization_id: string;
  family_code: string; // e.g. FAM-000001
  name: string; // e.g. 'عائلة أحمد محمد' / 'Mohamed Family'
  head_patient_id?: string;
  created_at: string;
  updated_at: string;
}

export type FamilyRelationshipType =
  | 'father'
  | 'mother'
  | 'spouse'
  | 'son'
  | 'daughter'
  | 'brother'
  | 'sister'
  | 'guardian'
  | 'ward'
  | 'other';

export interface FamilyMember {
  id: string;
  family_id: string;
  patient_id: string;
  relationship: FamilyRelationshipType;
  created_at: string;
}

export type GuardianRelationType = 'parent' | 'legal_guardian' | 'custodian' | 'other';

export type GuardianAuthorizationStatus = 'verified' | 'pending' | 'restricted' | 'expired';

export type GuardianPermissionScope =
  | 'medical_records' // الاطّلاع على السجل الطبي والتشخيصات
  | 'appointments'    // حجز وإدارة مواعيد الأسنان
  | 'financials'      // الفواتير وسداد المدفوعات
  | 'consent'         // الموافقة على التدخلات وخطط العلاج
  | 'prescriptions';  // صرف واستلام الروشتات

export interface GuardianRelationship {
  id: string;
  organization_id: string;
  guardian_patient_id: string; // Reference to Patient acting as guardian
  ward_patient_id: string; // Reference to Child/Ward Patient
  relationship_type: GuardianRelationType;
  authorization_status?: GuardianAuthorizationStatus; // 'verified' | 'pending' | 'restricted' | 'expired'
  scopes?: GuardianPermissionScope[]; // Authorized permissions
  guardian_national_id?: string; // Egyptian National ID (14 digits)
  document_reference?: string; // e.g., 'شهادة ميلاد مميكنة رقم 10293847291024'
  verified_at?: string;
  verified_by?: string;
  authorized_until?: string; // Optional expiry of legal guardianship
  active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type PatientAccountStatus = 'active' | 'locked' | 'inactive';

export interface PatientAccount {
  id: string;
  organization_id: string;
  patient_id: string; // Primary patient account holder
  mobile_number: string; // Normalized mobile number
  pin_hash: string; // Cryptographic hash (Never plaintext)
  pin_salt: string; // Cryptographic salt
  failed_attempts: number;
  locked_until?: string;
  status: PatientAccountStatus;
  created_at: string;
  updated_at: string;
}

export type PatientCardStatus = 'active' | 'revoked' | 'expired';

export interface PatientCard {
  id: string;
  organization_id: string;
  patient_id: string;
  card_number: string; // e.g. CARD-PAT-000001
  qr_token: string; // Cryptographic opaque reference, e.g. dcard_v1_...
  issued_at: string;
  expires_at?: string;
  status: PatientCardStatus;
}

export interface PatientSession {
  account: PatientAccount;
  authenticatedPatient: Patient; // The account holder who logged in
  selectedPatient: Patient; // The active context (could be self or an authorized ward)
  availableProfiles: Patient[]; // Self + authorized wards
  organization: {
    id: string;
    name: string;
    code: string;
  };
  token: string;
}

/**
 * Calculates age from Date of Birth (YYYY-MM-DD)
 */
export function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * Determines age group: child if < 18, adult if >= 18
 */
export function getAgeGroup(dateOfBirth: string): AgeGroup {
  return calculateAge(dateOfBirth) < 18 ? 'child' : 'adult';
}
