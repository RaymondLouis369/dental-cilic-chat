-- Phase 09.1.1: Notifications Schema & Row Level Security (RLS) Migration
-- Defines persistent notifications schema with strict multi-tenant, branch-scoped, role/recipient authorized, and patient-private RLS policies.

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('patient', 'staff', 'role')),
  recipient_id UUID,
  target_role TEXT,
  type TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  message_ar TEXT NOT NULL,
  message_en TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for rapid querying & performance optimization
CREATE INDEX IF NOT EXISTS idx_notifications_org_branch ON public.notifications(organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON public.notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper Function to resolve current staff profile ID
CREATE OR REPLACE FUNCTION public.current_staff_profile_id()
RETURNS UUID AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid() AND active = true LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper Function to resolve current staff role key
CREATE OR REPLACE FUNCTION public.current_staff_role_key()
RETURNS TEXT AS $$
  SELECT role_key FROM public.profiles WHERE auth_user_id = auth.uid() AND active = true LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS Policy 1: Staff SELECT Access
-- Enforces: Organization isolation, Patient privacy, Branch scoping, Recipient/Role authorization
DROP POLICY IF EXISTS "staff_notifications_select" ON public.notifications;
CREATE POLICY "staff_notifications_select" ON public.notifications
  FOR SELECT
  USING (
    -- Organization Isolation
    organization_id = public.current_user_org_id()
    -- Patient Privacy Guard: Staff cannot view private patient notifications
    AND recipient_type <> 'patient'
    -- Branch Isolation
    AND (
      branch_id IS NULL
      OR public.is_org_wide_manager() = true
      OR public.has_branch_access(branch_id) = true
    )
    -- Recipient & Role Authorization
    AND (
      (recipient_id IS NULL AND target_role IS NULL)
      OR (recipient_id IS NOT NULL AND recipient_id = public.current_staff_profile_id())
      OR (target_role IS NOT NULL AND target_role = public.current_staff_role_key())
    )
  );

-- RLS Policy 2: Patient SELECT Access
-- Enforces: Patient privacy & account authorization
DROP POLICY IF EXISTS "patient_notifications_select" ON public.notifications;
CREATE POLICY "patient_notifications_select" ON public.notifications
  FOR SELECT
  USING (
    recipient_type = 'patient'
    AND recipient_id IN (
      SELECT id FROM public.patients
      WHERE auth_user_id = auth.uid() OR id = auth.uid()
    )
    AND organization_id IN (
      SELECT organization_id FROM public.patients
      WHERE id = recipient_id
    )
  );

-- RLS Policy 3: Staff INSERT Access
-- Allows staff to insert notifications within their organization boundary
DROP POLICY IF EXISTS "staff_notifications_insert" ON public.notifications;
CREATE POLICY "staff_notifications_insert" ON public.notifications
  FOR INSERT
  WITH CHECK (
    organization_id = public.current_user_org_id()
  );

-- RLS Policy 4: Staff UPDATE Access (Mark Read / Mark All Read)
DROP POLICY IF EXISTS "staff_notifications_update" ON public.notifications;
CREATE POLICY "staff_notifications_update" ON public.notifications
  FOR UPDATE
  USING (
    organization_id = public.current_user_org_id()
    AND recipient_type <> 'patient'
    AND (
      (recipient_id IS NULL AND target_role IS NULL)
      OR (recipient_id IS NOT NULL AND recipient_id = public.current_staff_profile_id())
      OR (target_role IS NOT NULL AND target_role = public.current_staff_role_key())
    )
  );

-- RLS Policy 5: Patient UPDATE Access (Mark Read / Mark All Read)
DROP POLICY IF EXISTS "patient_notifications_update" ON public.notifications;
CREATE POLICY "patient_notifications_update" ON public.notifications
  FOR UPDATE
  USING (
    recipient_type = 'patient'
    AND recipient_id IN (
      SELECT id FROM public.patients
      WHERE auth_user_id = auth.uid() OR id = auth.uid()
    )
  );
