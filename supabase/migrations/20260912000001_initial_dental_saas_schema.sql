-- ========================================================================
-- DENTAL CLINIC & DENTAL CENTER SAAS — EGYPT
-- Phase 1 Foundation Migration: Multi-Tenant Architecture, RLS & Immutability
-- Default Localization: Egypt, EGP, Africa/Cairo, +20, Arabic RTL
-- ========================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------
-- 1. ORGANIZATIONS TABLE
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Egypt',
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    timezone VARCHAR(100) NOT NULL DEFAULT 'Africa/Cairo',
    phone_country_code VARCHAR(10) NOT NULL DEFAULT '+20',
    default_language VARCHAR(5) NOT NULL DEFAULT 'ar',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 2. BRANCHES TABLE (Egyptian Dental Branches)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    timezone VARCHAR(100) NOT NULL DEFAULT 'Africa/Cairo',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_branches_org_id ON public.branches(organization_id);

-- ------------------------------------------------------------------------
-- 3. ROLES TABLE (7 Required Internal Roles)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
    id VARCHAR(50) PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    description_en TEXT NOT NULL,
    description_ar TEXT NOT NULL,
    is_org_wide BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 4. PERMISSIONS TABLE & ROLE MAPPINGS
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permissions (
    id VARCHAR(50) PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description_en TEXT NOT NULL,
    description_ar TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id VARCHAR(50) NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(50) NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY(role_id, permission_id)
);

-- ------------------------------------------------------------------------
-- 5. PROFILES TABLE (Associated with Supabase Auth Users)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role_id VARCHAR(50) NOT NULL REFERENCES public.roles(id),
    role_key VARCHAR(50) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user ON public.profiles(auth_user_id);

-- ------------------------------------------------------------------------
-- 6. USER BRANCH SCOPES (Multi-branch scoping per staff member)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_branch_scopes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_user_branch_scopes_user ON public.user_branch_scopes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_branch_scopes_branch ON public.user_branch_scopes(branch_id);

-- ------------------------------------------------------------------------
-- 7. AUDIT LOGS TABLE (Immutable Audit Trail)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT,
    actor_user_id VARCHAR(255) NOT NULL,
    actor_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Trigger: Enforce complete immutability on audit_logs (No updates or deletes allowed)
CREATE OR REPLACE FUNCTION public.enforce_audit_log_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are strictly immutable and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.enforce_audit_log_immutability();

-- ------------------------------------------------------------------------
-- 8. SECURE RLS HELPER FUNCTIONS
-- ------------------------------------------------------------------------

-- Get organization ID of current authenticated user
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID AS $$
    SELECT organization_id
    FROM public.profiles
    WHERE auth_user_id = auth.uid()
      AND active = true
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if current authenticated user has org-wide managerial authority
CREATE OR REPLACE FUNCTION public.is_org_wide_manager()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (
            SELECT r.is_org_wide
            FROM public.profiles p
            JOIN public.roles r ON p.role_id = r.id
            WHERE p.auth_user_id = auth.uid()
              AND p.active = true
            LIMIT 1
        ),
        false
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if current authenticated user has branch access (either via explicit scope or org-wide manager)
CREATE OR REPLACE FUNCTION public.has_branch_access(target_branch_id UUID)
RETURNS BOOLEAN AS $$
    SELECT CASE
        -- If org-wide manager in the same organization
        WHEN public.is_org_wide_manager() = true AND (
            SELECT organization_id FROM public.branches WHERE id = target_branch_id
        ) = public.current_user_org_id() THEN true

        -- Or if user has explicit assignment to this branch in the same organization
        WHEN EXISTS (
            SELECT 1
            FROM public.user_branch_scopes ubs
            JOIN public.profiles p ON ubs.user_id = p.id
            JOIN public.branches b ON ubs.branch_id = b.id
            WHERE p.auth_user_id = auth.uid()
              AND p.active = true
              AND ubs.branch_id = target_branch_id
              AND b.organization_id = public.current_user_org_id()
        ) THEN true

        ELSE false
    END;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------

-- Enable RLS on all sensitive tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_branch_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ORGANIZATIONS POLICIES
-- Users can only read their own organization
CREATE POLICY "org_read_isolated"
ON public.organizations
FOR SELECT
USING (id = public.current_user_org_id());

-- Only Center Managers can update their organization
CREATE POLICY "org_update_manager_only"
ON public.organizations
FOR UPDATE
USING (id = public.current_user_org_id() AND public.is_org_wide_manager() = true);

-- BRANCHES POLICIES
-- Users can select branches if they have branch access
CREATE POLICY "branches_select_isolated"
ON public.branches
FOR SELECT
USING (
    organization_id = public.current_user_org_id()
    AND (public.is_org_wide_manager() = true OR public.has_branch_access(id) = true)
);

-- Center Managers can insert branches into their organization
CREATE POLICY "branches_insert_manager_only"
ON public.branches
FOR INSERT
WITH CHECK (
    organization_id = public.current_user_org_id()
    AND public.is_org_wide_manager() = true
);

-- Center Managers and assigned Branch Managers can update their branch
CREATE POLICY "branches_update_authorized"
ON public.branches
FOR UPDATE
USING (
    organization_id = public.current_user_org_id()
    AND (public.is_org_wide_manager() = true OR public.has_branch_access(id) = true)
);

-- PROFILES POLICIES
-- Users can view profiles in their own organization
CREATE POLICY "profiles_select_same_org"
ON public.profiles
FOR SELECT
USING (organization_id = public.current_user_org_id());

-- Managers can update staff in their own organization
CREATE POLICY "profiles_update_manager_only"
ON public.profiles
FOR UPDATE
USING (
    organization_id = public.current_user_org_id()
    AND public.is_org_wide_manager() = true
);

-- USER BRANCH SCOPES POLICIES
-- View scopes for same organization
CREATE POLICY "user_scopes_select_same_org"
ON public.user_branch_scopes
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = user_branch_scopes.user_id
          AND p.organization_id = public.current_user_org_id()
    )
);

-- Manage scopes by Center Manager
CREATE POLICY "user_scopes_manage_manager_only"
ON public.user_branch_scopes
FOR ALL
USING (
    public.is_org_wide_manager() = true
    AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = user_branch_scopes.user_id
          AND p.organization_id = public.current_user_org_id()
    )
);

-- AUDIT LOGS POLICIES
-- Users can view audit logs within their organization (with audit.read permission)
CREATE POLICY "audit_logs_select_same_org"
ON public.audit_logs
FOR SELECT
USING (organization_id = public.current_user_org_id());

-- Anyone authenticated in the organization can insert audit logs (Append-only)
CREATE POLICY "audit_logs_insert_append_only"
ON public.audit_logs
FOR INSERT
WITH CHECK (organization_id = public.current_user_org_id());

-- Notice: NO UPDATE or DELETE policies created on audit_logs!
