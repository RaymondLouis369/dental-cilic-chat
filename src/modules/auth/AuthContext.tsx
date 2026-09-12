import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AuthUserSession,
  RoleKey,
  Branch,
  Organization,
  Profile,
} from '../../types';
import {
  DEMO_STAFF_CREDENTIALS,
  DEFAULT_EGYPT_ORG,
  DEFAULT_BRANCHES,
  initSeedStorage,
  appendAuditLog,
} from '../../lib/storage';
import {
  SYSTEM_ROLES,
  ROLE_DEFAULT_PERMISSIONS,
} from '../permissions/rolesAndPermissions';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

interface AuthContextType {
  session: AuthUserSession | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchDemoRole: (roleKey: RoleKey) => void;
  hasBranchAccess: (branchId: string) => boolean;
  isOrgWideManager: boolean;
  accessibleBranches: Branch[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthUserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize storage seed on mount
  useEffect(() => {
    initSeedStorage();
    // Check persisted session
    const saved = localStorage.getItem('dental_saas_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSession(parsed);
      } catch {
        localStorage.removeItem('dental_saas_session');
      }
    }
    setIsLoading(false);
  }, []);

  const buildSession = (roleKey: RoleKey): AuthUserSession => {
    const cred = DEMO_STAFF_CREDENTIALS[roleKey];
    const role = SYSTEM_ROLES.find((r) => r.key === roleKey)!;
    const permissions = ROLE_DEFAULT_PERMISSIONS[roleKey];

    // Branch scoping
    let assignedBranches: Branch[] = [];
    if (role.is_org_wide) {
      assignedBranches = DEFAULT_BRANCHES;
    } else {
      assignedBranches = DEFAULT_BRANCHES.filter((b) =>
        cred.assignedBranchIds.includes(b.id)
      );
    }

    return {
      profile: cred.profile,
      role,
      organization: DEFAULT_EGYPT_ORG,
      assignedBranches,
      permissions,
      token: `token_${roleKey}_${Date.now()}`,
    };
  };

  const login = async (
    email: string,
    password?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    // ========================================================================
    // PRODUCTION SECURITY ENFORCEMENT
    // ========================================================================
    if (!import.meta.env.DEV) {
      // 1. Explicitly reject demo accounts and demo passwords in production
      const isDemoEmail = email.trim().toLowerCase().endsWith('@dental-demo.eg');
      const isDemoPassword = password === 'dental123' || password === 'EgyptDental2026!';

      if (isDemoEmail || isDemoPassword) {
        appendAuditLog({
          organization_id: DEFAULT_EGYPT_ORG.id,
          actor_user_id: 'anonymous',
          actor_email: email,
          action: 'auth.login.failure',
          entity_type: 'auth',
          entity_id: 'security_rejection',
          metadata: { reason: 'Demo credentials and demo passwords are strictly prohibited in production mode' },
        });
        setIsLoading(false);
        return {
          success: false,
          error: 'Security Error: Demo accounts and demo passwords are strictly prohibited in production.',
        };
      }

      // 2. Production server-side authentication via Supabase Auth (when configured)
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password || '',
          });

          if (authError || !authData.user) {
            appendAuditLog({
              organization_id: DEFAULT_EGYPT_ORG.id,
              actor_user_id: 'anonymous',
              actor_email: email,
              action: 'auth.login.failure',
              entity_type: 'auth',
              entity_id: 'unknown_user',
              metadata: { reason: authError?.message || 'Authentication failed' },
            });
            setIsLoading(false);
            return { success: false, error: authError?.message || 'invalidCredentials' };
          }

          // Fetch real staff profile from PostgreSQL database (RLS-enforced query)
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*, roles(*)')
            .eq('auth_user_id', authData.user.id)
            .single();

          if (profileError || !profileData) {
            setIsLoading(false);
            return { success: false, error: 'Staff profile not found in organization' };
          }

          // Fetch user branch scopes directly from database (RLS-enforced)
          const { data: scopesData } = await supabase
            .from('user_branch_scopes')
            .select('branch_id, branches(*)')
            .eq('user_id', profileData.id);

          // Fetch role permissions directly from database
          const { data: rolePermsData } = await supabase
            .from('role_permissions')
            .select('permission_id, permissions(key)')
            .eq('role_id', profileData.role_id);

          const permissions = rolePermsData
            ? (rolePermsData.map((rp: any) => rp.permissions?.key).filter(Boolean) as any[])
            : ROLE_DEFAULT_PERMISSIONS[profileData.role_key as RoleKey] || [];

          const assignedBranches = scopesData
            ? scopesData.map((s: any) => s.branches).filter(Boolean)
            : [];

          const realSession: AuthUserSession = {
            profile: profileData,
            role: profileData.roles,
            organization: DEFAULT_EGYPT_ORG,
            assignedBranches,
            permissions,
            token: authData.session?.access_token || `token_${Date.now()}`,
          };

          setSession(realSession);
          localStorage.setItem('dental_saas_session', JSON.stringify(realSession));

          appendAuditLog({
            organization_id: DEFAULT_EGYPT_ORG.id,
            actor_user_id: realSession.profile.id,
            actor_email: realSession.profile.email,
            action: 'auth.login.success',
            entity_type: 'auth',
            entity_id: realSession.profile.id,
            metadata: {
              role: profileData.role_key,
              authMethod: 'supabase_auth_argon2',
            },
          });

          setIsLoading(false);
          return { success: true };
        } catch (err: any) {
          setIsLoading(false);
          return { success: false, error: err.message || 'Authentication error' };
        }
      }

      // Production without configured identity server
      setIsLoading(false);
      return {
        success: false,
        error: 'Production database/auth is not configured. Demo authentication is disabled in production builds.',
      };
    }

    // ========================================================================
    // DEVELOPMENT & PREVIEW TESTING AUTHENTICATION
    // ========================================================================
    // Find staff credential matching email
    const matchedEntry = Object.entries(DEMO_STAFF_CREDENTIALS).find(
      ([, c]) => c.email.toLowerCase() === email.trim().toLowerCase()
    );

    // Validate email
    if (!matchedEntry) {
      appendAuditLog({
        organization_id: DEFAULT_EGYPT_ORG.id,
        actor_user_id: 'anonymous',
        actor_email: email,
        action: 'auth.login.failure',
        entity_type: 'auth',
        entity_id: 'unknown_user',
        metadata: { reason: 'User not found in organization staff directory' },
      });
      setIsLoading(false);
      return { success: false, error: 'invalidCredentials' };
    }

    // Validate password: for demo accounts, password can be 'dental123' or empty or demo pass
    // If an explicit invalid password is supplied (e.g. 'wrong_password'), reject it!
    if (password && password !== 'dental123' && password !== 'EgyptDental2026!') {
      appendAuditLog({
        organization_id: DEFAULT_EGYPT_ORG.id,
        actor_user_id: matchedEntry[1].profile.id,
        actor_email: email,
        action: 'auth.login.failure',
        entity_type: 'auth',
        entity_id: matchedEntry[1].profile.id,
        metadata: { reason: 'Incorrect credentials supplied' },
      });
      setIsLoading(false);
      return { success: false, error: 'invalidCredentials' };
    }

    const roleKey = matchedEntry[0] as RoleKey;
    const newSession = buildSession(roleKey);

    setSession(newSession);
    localStorage.setItem('dental_saas_session', JSON.stringify(newSession));

    appendAuditLog({
      organization_id: DEFAULT_EGYPT_ORG.id,
      actor_user_id: newSession.profile.id,
      actor_email: newSession.profile.email,
      action: 'auth.login.success',
      entity_type: 'auth',
      entity_id: newSession.profile.id,
      metadata: {
        role: roleKey,
        ip: '127.0.0.1 (Cairo)',
        assignedBranchesCount: newSession.assignedBranches.length,
      },
    });

    setIsLoading(false);
    return { success: true };
  };

  const logout = () => {
    if (session) {
      appendAuditLog({
        organization_id: session.organization.id,
        actor_user_id: session.profile.id,
        actor_email: session.profile.email,
        action: 'auth.logout',
        entity_type: 'auth',
        entity_id: session.profile.id,
        metadata: { role: session.role.key },
      });
    }
    setSession(null);
    localStorage.removeItem('dental_saas_session');
  };

  const switchDemoRole = (roleKey: RoleKey) => {
    // Strictly prohibited in production environments
    if (!import.meta.env.DEV) {
      console.error(
        'SECURITY ALERT: switchDemoRole was invoked in production. Role switching is strictly prohibited in production builds.'
      );
      return;
    }

    const newSession = buildSession(roleKey);
    setSession(newSession);
    localStorage.setItem('dental_saas_session', JSON.stringify(newSession));

    appendAuditLog({
      organization_id: DEFAULT_EGYPT_ORG.id,
      actor_user_id: newSession.profile.id,
      actor_email: newSession.profile.email,
      action: 'auth.login.success',
      entity_type: 'auth',
      entity_id: newSession.profile.id,
      metadata: { action: 'Switch role in development preview environment', role: roleKey },
    });
  };

  const isOrgWideManager = session?.role.is_org_wide ?? false;

  const hasBranchAccess = (branchId: string): boolean => {
    if (!session) return false;
    if (isOrgWideManager) return true;
    return session.assignedBranches.some((b) => b.id === branchId);
  };

  const accessibleBranches = session?.assignedBranches ?? [];

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        login,
        logout,
        switchDemoRole,
        hasBranchAccess,
        isOrgWideManager,
        accessibleBranches,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
