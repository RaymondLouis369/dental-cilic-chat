import {
  Organization,
  Branch,
  Profile,
  UserBranchScope,
  AuditLog,
  RoleKey,
} from '../types';
import { SYSTEM_ROLES, SYSTEM_PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } from '../modules/permissions/rolesAndPermissions';

// Primary Egyptian Dental Organization
export const DEFAULT_EGYPT_ORG: Organization = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Dental Demo Egypt',
  code: 'ORG-EGY-001',
  country: 'Egypt',
  currency: 'EGP',
  timezone: 'Africa/Cairo',
  phone_country_code: '+20',
  default_language: 'ar',
  active: true,
  created_at: '2026-01-01T08:00:00Z',
  updated_at: '2026-01-01T08:00:00Z',
};

// Secondary Egyptian Dental Organization (Used to test & prove cross-org RLS isolation)
export const SECONDARY_EGYPT_ORG: Organization = {
  id: '99999999-9999-9999-9999-999999999999',
  name: 'Nile Pearl Dental Center',
  code: 'ORG-EGY-002',
  country: 'Egypt',
  currency: 'EGP',
  timezone: 'Africa/Cairo',
  phone_country_code: '+20',
  default_language: 'ar',
  active: true,
  created_at: '2026-02-01T08:00:00Z',
  updated_at: '2026-02-01T08:00:00Z',
};

// Egyptian Branches belonging to DEFAULT_EGYPT_ORG
export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    organization_id: DEFAULT_EGYPT_ORG.id,
    name: 'Cairo Branch - Maadi',
    code: 'BR-CAI-01',
    address: 'Street 9, Maadi, Cairo Governorate',
    city: 'Cairo',
    phone: '+20 2 2358 1234',
    timezone: 'Africa/Cairo',
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    organization_id: DEFAULT_EGYPT_ORG.id,
    name: 'Alexandria Branch - Smouha',
    code: 'BR-ALX-01',
    address: 'Fawzi Moaz St, Smouha, Alexandria Governorate',
    city: 'Alexandria',
    phone: '+20 3 4291 5678',
    timezone: 'Africa/Cairo',
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    organization_id: DEFAULT_EGYPT_ORG.id,
    name: 'Giza Branch - Dokki',
    code: 'BR-GIZ-01',
    address: 'Musaddaq St, Dokki, Giza Governorate',
    city: 'Giza',
    phone: '+20 2 3762 9876',
    timezone: 'Africa/Cairo',
    active: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
  },
];

// Branch belonging to SECONDARY_EGYPT_ORG (For RLS isolation tests)
export const SECONDARY_BRANCH: Branch = {
  id: '88888888-8888-8888-8888-888888888888',
  organization_id: SECONDARY_EGYPT_ORG.id,
  name: 'Tanta Branch - Stadium Area',
  code: 'BR-TNT-01',
  address: 'El-Gish St, Tanta, Gharbia Governorate',
  city: 'Tanta',
  phone: '+20 40 331 4455',
  timezone: 'Africa/Cairo',
  active: true,
  created_at: '2026-02-01T08:00:00Z',
  updated_at: '2026-02-01T08:00:00Z',
};

// ============================================================================
// SECURITY NOTICE:
// DEMO_STAFF_CREDENTIALS contains seed metadata strictly intended for local
// development preview, vitest execution, and acceptance test runners.
//
// ZERO PRODUCTION SECRETS OR PASSWORDS EXIST HERE.
// In production:
// 1. Production users must authenticate through Supabase Auth (or the configured identity provider).
// 2. Passwords are encrypted server-side and never exposed in the client bundle.
// 3. User roles, branch scopes, and permissions are enforced by PostgreSQL Row Level Security (RLS).
// ============================================================================
export interface DemoStaffCredential {
  email: string;
  role_key: RoleKey;
  profile: Profile;
  assignedBranchIds: string[];
}

export const DEMO_STAFF_CREDENTIALS: Record<RoleKey, DemoStaffCredential> = {
  center_manager: {
    email: 'manager@dental-demo.eg',
    role_key: 'center_manager',
    profile: {
      id: 'prof_cm_01',
      auth_user_id: 'auth_cm_01',
      organization_id: DEFAULT_EGYPT_ORG.id,
      role_id: 'role_center_manager',
      role_key: 'center_manager',
      display_name: 'Dr. Ahmed El-Shennawy',
      email: 'manager@dental-demo.eg',
      phone: '+20 100 123 4567',
      active: true,
      created_at: '2026-01-01T08:00:00Z',
      updated_at: '2026-01-01T08:00:00Z',
    },
    assignedBranchIds: [], // Org-wide: Can access all branches
  },
  branch_manager: {
    email: 'bm.alex@dental-demo.eg',
    role_key: 'branch_manager',
    profile: {
      id: 'prof_bm_01',
      auth_user_id: 'auth_bm_01',
      organization_id: DEFAULT_EGYPT_ORG.id,
      role_id: 'role_branch_manager',
      role_key: 'branch_manager',
      display_name: 'Dr. Mona El-Gohary',
      email: 'bm.alex@dental-demo.eg',
      phone: '+20 111 234 5678',
      active: true,
      created_at: '2026-01-01T08:00:00Z',
      updated_at: '2026-01-01T08:00:00Z',
    },
    assignedBranchIds: ['22222222-2222-2222-2222-222222222222'], // Alexandria Branch Only
  },
  receptionist: {
    email: 'reception.cairo@dental-demo.eg',
    role_key: 'receptionist',
    profile: {
      id: 'prof_rec_01',
      auth_user_id: 'auth_rec_01',
      organization_id: DEFAULT_EGYPT_ORG.id,
      role_id: 'role_receptionist',
      role_key: 'receptionist',
      display_name: 'Sara Mahmoud',
      email: 'reception.cairo@dental-demo.eg',
      phone: '+20 122 345 6789',
      active: true,
      created_at: '2026-01-01T08:00:00Z',
      updated_at: '2026-01-01T08:00:00Z',
    },
    assignedBranchIds: ['11111111-1111-1111-1111-111111111111'], // Cairo Branch Only
  },
  doctor: {
    email: 'dr.karim@dental-demo.eg',
    role_key: 'doctor',
    profile: {
      id: 'prof_doc_01',
      auth_user_id: 'auth_doc_01',
      organization_id: DEFAULT_EGYPT_ORG.id,
      role_id: 'role_doctor',
      role_key: 'doctor',
      display_name: 'Dr. Karim Hassan',
      email: 'dr.karim@dental-demo.eg',
      phone: '+20 106 456 7890',
      active: true,
      created_at: '2026-01-01T08:00:00Z',
      updated_at: '2026-01-01T08:00:00Z',
    },
    assignedBranchIds: [
      '11111111-1111-1111-1111-111111111111', // Cairo Branch
      '22222222-2222-2222-2222-222222222222', // Alexandria Branch
    ],
  },
  prosthetic_coordinator: {
    email: 'lab.coord@dental-demo.eg',
    role_key: 'prosthetic_coordinator',
    profile: {
      id: 'prof_pc_01',
      auth_user_id: 'auth_pc_01',
      organization_id: DEFAULT_EGYPT_ORG.id,
      role_id: 'role_prosthetic_coordinator',
      role_key: 'prosthetic_coordinator',
      display_name: 'Hany Mostafa',
      email: 'lab.coord@dental-demo.eg',
      phone: '+20 114 567 8901',
      active: true,
      created_at: '2026-01-01T08:00:00Z',
      updated_at: '2026-01-01T08:00:00Z',
    },
    assignedBranchIds: ['11111111-1111-1111-1111-111111111111'], // Cairo Branch Coordination
  },
  lab_user: {
    email: 'dentallab.user@dental-demo.eg',
    role_key: 'lab_user',
    profile: {
      id: 'prof_lab_01',
      auth_user_id: 'auth_lab_01',
      organization_id: DEFAULT_EGYPT_ORG.id,
      role_id: 'role_lab_user',
      role_key: 'lab_user',
      display_name: 'Tamer Samir (Lab Tech)',
      email: 'dentallab.user@dental-demo.eg',
      phone: '+20 120 678 9012',
      active: true,
      created_at: '2026-01-01T08:00:00Z',
      updated_at: '2026-01-01T08:00:00Z',
    },
    assignedBranchIds: ['11111111-1111-1111-1111-111111111111'], // Assigned to Dental Lab Unit at Cairo
  },
  delivery_user: {
    email: 'delivery@dental-demo.eg',
    role_key: 'delivery_user',
    profile: {
      id: 'prof_del_01',
      auth_user_id: 'auth_del_01',
      organization_id: DEFAULT_EGYPT_ORG.id,
      role_id: 'role_delivery_user',
      role_key: 'delivery_user',
      display_name: 'Mohamed Reda (Logistics)',
      email: 'delivery@dental-demo.eg',
      phone: '+20 155 789 0123',
      active: true,
      created_at: '2026-01-01T08:00:00Z',
      updated_at: '2026-01-01T08:00:00Z',
    },
    assignedBranchIds: ['11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333'], // Cairo & Giza
  },
};

// Storage keys
const STORAGE_KEYS = {
  ORGANIZATIONS: 'dental_saas_orgs',
  BRANCHES: 'dental_saas_branches',
  PROFILES: 'dental_saas_profiles',
  SCOPES: 'dental_saas_scopes',
  AUDIT_LOGS: 'dental_saas_audit_logs',
  SESSION: 'dental_saas_session',
  LANGUAGE: 'dental_saas_lang',
};

// Centralized safe storage fallback for environments without global or accessible localStorage (e.g. iframe SecurityError, Node.js vitest runner)
const memoryStore = new Map<string, string>();

function getLocalStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Reading window.localStorage throws SecurityError in restricted iframe contexts
  }
  return null;
}

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      const ls = getLocalStorage();
      if (ls) return ls.getItem(key);
    } catch {
      // fallback
    }
    return memoryStore.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    try {
      const ls = getLocalStorage();
      if (ls) {
        ls.setItem(key, value);
        return;
      }
    } catch {
      // fallback
    }
    memoryStore.set(key, value);
  },
  removeItem(key: string): void {
    try {
      const ls = getLocalStorage();
      if (ls) {
        ls.removeItem(key);
      }
    } catch {
      // fallback
    }
    memoryStore.delete(key);
  },
  clear(): void {
    try {
      const ls = getLocalStorage();
      if (ls) {
        ls.clear();
      }
    } catch {
      // fallback
    }
    memoryStore.clear();
  },
};

// Initialize Storage with Seed Data if empty
export function initSeedStorage(): void {
  if (!safeStorage.getItem(STORAGE_KEYS.ORGANIZATIONS)) {
    safeStorage.setItem(
      STORAGE_KEYS.ORGANIZATIONS,
      JSON.stringify([DEFAULT_EGYPT_ORG, SECONDARY_EGYPT_ORG])
    );
  }

  if (!safeStorage.getItem(STORAGE_KEYS.BRANCHES)) {
    safeStorage.setItem(
      STORAGE_KEYS.BRANCHES,
      JSON.stringify([...DEFAULT_BRANCHES, SECONDARY_BRANCH])
    );
  }

  if (!safeStorage.getItem(STORAGE_KEYS.PROFILES)) {
    const profiles = Object.values(DEMO_STAFF_CREDENTIALS).map((c) => c.profile);
    safeStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  }

  if (!safeStorage.getItem(STORAGE_KEYS.SCOPES)) {
    const scopes: UserBranchScope[] = [];
    Object.values(DEMO_STAFF_CREDENTIALS).forEach((c) => {
      c.assignedBranchIds.forEach((bId, idx) => {
        scopes.push({
          id: `scope_${c.profile.id}_${idx}`,
          user_id: c.profile.id,
          branch_id: bId,
          created_at: '2026-01-01T08:00:00Z',
        });
      });
    });
    safeStorage.setItem(STORAGE_KEYS.SCOPES, JSON.stringify(scopes));
  }

  if (!safeStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
    const initialLogs: AuditLog[] = [
      {
        id: 'audit_init_01',
        organization_id: DEFAULT_EGYPT_ORG.id,
        actor_user_id: 'system_seed',
        actor_email: 'system@dental-saas.eg',
        action: 'organization.update',
        entity_type: 'organization',
        entity_id: DEFAULT_EGYPT_ORG.id,
        metadata: { info: 'Phase 1 Egyptian Dental Center Foundation Seeded' },
        created_at: '2026-01-01T08:00:00Z',
      },
      {
        id: 'audit_init_02',
        organization_id: DEFAULT_EGYPT_ORG.id,
        branch_id: DEFAULT_BRANCHES[0].id,
        actor_user_id: 'system_seed',
        actor_email: 'system@dental-saas.eg',
        action: 'branch.create',
        entity_type: 'branch',
        entity_id: DEFAULT_BRANCHES[0].id,
        metadata: { name: 'Cairo Branch - Maadi' },
        created_at: '2026-01-01T08:05:00Z',
      },
      {
        id: 'audit_init_03',
        organization_id: DEFAULT_EGYPT_ORG.id,
        branch_id: DEFAULT_BRANCHES[1].id,
        actor_user_id: 'system_seed',
        actor_email: 'system@dental-saas.eg',
        action: 'branch.create',
        entity_type: 'branch',
        entity_id: DEFAULT_BRANCHES[1].id,
        metadata: { name: 'Alexandria Branch - Smouha' },
        created_at: '2026-01-01T08:10:00Z',
      },
    ];
    safeStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(initialLogs));
  }
}

// Low-level RLS Enforcement Simulation Function:
// Evaluates exact SQL RLS policy constraints
export function simulateDatabaseRLS<T extends { organization_id: string; id?: string; branch_id?: string | null }>(
  userProfile: Profile,
  records: T[],
  table: 'organizations' | 'branches' | 'profiles' | 'audit_logs'
): T[] {
  // 1. Strict Organization Isolation: Reject any record from a different organization
  const orgIsolatedRecords = records.filter(
    (record) => record.organization_id === userProfile.organization_id
  );

  // If Center Manager: Has organization-wide access across all branches in their organization
  if (userProfile.role_key === 'center_manager') {
    return orgIsolatedRecords;
  }

  // If table is 'branches', enforce Branch Scoping:
  if (table === 'branches') {
    const scopesRaw = safeStorage.getItem(STORAGE_KEYS.SCOPES);
    let scopes: UserBranchScope[] = scopesRaw ? JSON.parse(scopesRaw) : [];
    
    // If scopes not seeded in storage, fallback to DEMO_STAFF_CREDENTIALS for the user
    if (scopes.length === 0) {
      const demoCred = Object.values(DEMO_STAFF_CREDENTIALS).find(
        (c) => c.profile.id === userProfile.id || c.role_key === userProfile.role_key
      );
      if (demoCred) {
        scopes = demoCred.assignedBranchIds.map((bId, idx) => ({
          id: `scope_${demoCred.profile.id}_${idx}`,
          user_id: userProfile.id,
          branch_id: bId,
          created_at: '2026-01-01T08:00:00Z',
        }));
      }
    }

    const allowedBranchIds = new Set(
      scopes.filter((s) => s.user_id === userProfile.id).map((s) => s.branch_id)
    );

    return orgIsolatedRecords.filter((b) => b.id && allowedBranchIds.has(b.id));
  }

  return orgIsolatedRecords;
}

export function simulateRlsBranchQuery(userProfile: Profile, branches: Branch[]): Branch[] {
  return simulateDatabaseRLS(userProfile, branches, 'branches');
}

export function simulateRlsOrgQuery(userProfile: Profile, orgs: Organization[]): Organization[] {
  return orgs.filter((org) => org.id === userProfile.organization_id);
}

// Emulates the PostgreSQL immutable trigger: BEFORE UPDATE OR DELETE ON audit_logs
export function simulateAuditImmutability(operation: 'INSERT' | 'UPDATE' | 'DELETE'): {
  allowed: boolean;
  error?: string;
} {
  if (operation === 'UPDATE' || operation === 'DELETE') {
    return {
      allowed: false,
      error: 'P0001: Audit logs are immutable. UPDATE and DELETE operations are strictly forbidden.',
    };
  }
  return { allowed: true };
}

export function getStoredAuditLogs(userProfile: Profile): AuditLog[] {
  const raw = safeStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
  const logs: AuditLog[] = raw ? JSON.parse(raw) : [];
  return simulateDatabaseRLS(userProfile, logs, 'audit_logs');
}

export function getStoredBranches(userProfile?: Profile): Branch[] {
  const raw = safeStorage.getItem(STORAGE_KEYS.BRANCHES);
  const branches: Branch[] = raw ? JSON.parse(raw) : [...DEFAULT_BRANCHES, SECONDARY_BRANCH];
  if (userProfile) {
    return simulateDatabaseRLS(userProfile, branches, 'branches');
  }
  return branches;
}

export function getStoredStaffUsers(organizationId?: string): Profile[] {
  const raw = safeStorage.getItem(STORAGE_KEYS.PROFILES);
  const profiles: Profile[] = raw
    ? JSON.parse(raw)
    : Object.values(DEMO_STAFF_CREDENTIALS).map((c) => c.profile);
  if (organizationId) {
    return profiles.filter((p) => p.organization_id === organizationId);
  }
  return profiles;
}

export function appendAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
  const newLog: AuditLog = {
    ...log,
    id: 'audit_' + Math.random().toString(36).substring(2, 11),
    created_at: new Date().toISOString(),
  };

  const raw = safeStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
  const logs: AuditLog[] = raw ? JSON.parse(raw) : [];
  // Strict append-only: No update or delete allowed!
  logs.unshift(newLog);
  safeStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));

  return newLog;
}
