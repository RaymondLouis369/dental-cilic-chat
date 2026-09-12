/**
 * Core Types for Dental Clinic & Dental Center Management Platform — Egypt
 * Phase 1: Foundation
 */

export type RoleKey =
  | 'center_manager'
  | 'branch_manager'
  | 'receptionist'
  | 'doctor'
  | 'prosthetic_coordinator'
  | 'lab_user'
  | 'delivery_user';

export interface Role {
  id: string;
  key: RoleKey;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  is_org_wide: boolean;
  created_at: string;
}

export type PermissionKey =
  | 'organization.read'
  | 'organization.manage'
  | 'branch.read'
  | 'branch.create'
  | 'branch.update'
  | 'branch.manage'
  | 'user.read'
  | 'user.create'
  | 'user.update'
  | 'user.manage'
  | 'permission.read'
  | 'permission.manage'
  | 'audit.read'
  | 'patient.read'
  | 'reception.manage'
  | 'booking.create'
  | 'booking.manage'
  | 'pricing.manage'
  | 'service.manage';

export interface Permission {
  id: string;
  key: PermissionKey;
  name_en: string;
  name_ar: string;
  category: 'organization' | 'branch' | 'user' | 'permission' | 'audit' | 'patient';
  description_en: string;
  description_ar: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  country: string; // Default: 'Egypt'
  currency: string; // Default: 'EGP'
  timezone: string; // Default: 'Africa/Cairo'
  phone_country_code: string; // Default: '+20'
  default_language: 'ar' | 'en'; // Default: 'ar'
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  address: string;
  city: string; // e.g., 'Cairo', 'Alexandria', 'Giza'
  phone?: string;
  timezone: string; // Default: 'Africa/Cairo'
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  auth_user_id: string;
  organization_id: string;
  role_id: string;
  role_key: RoleKey;
  display_name: string;
  email: string;
  phone?: string;
  active: boolean;
  branch_id?: string;
  created_at: string;
  updated_at: string;
}

export type StaffUser = Profile;

export interface UserBranchScope {
  id: string;
  user_id: string; // refers to profile.id
  branch_id: string;
  created_at: string;
}

export type AuditAction =
  | 'auth.login.success'
  | 'auth.login.failure'
  | 'auth.logout'
  | 'organization.update'
  | 'branch.create'
  | 'branch.update'
  | 'user.create'
  | 'user.update'
  | 'user.scope.update'
  | 'role.assign'
  | 'security.access_denied';

export interface AuditLog {
  id: string;
  organization_id: string;
  branch_id?: string | null;
  actor_user_id: string;
  actor_email?: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface AuthUserSession {
  profile: Profile;
  role: Role;
  organization: Organization;
  assignedBranches: Branch[];
  permissions: PermissionKey[];
  token: string;
}

// Phase 2: Patient Identity & Portal Types
export * from './patient';

// Phase 3: Reception, Scheduling, Pricing, Insurance & Card Templates
export * from './receptionAndBilling';

// Phase 4: Doctor Clinical Workspace, Dental Chart, Treatment Plans, Notes & Orders
export * from './clinical';

