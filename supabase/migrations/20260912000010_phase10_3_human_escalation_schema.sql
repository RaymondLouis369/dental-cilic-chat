-- Phase 10.3: Human Escalation & Staff Reply Workflow Schema & Row Level Security (RLS) Migration
-- Defines persistent human escalations & replies schema with strict multi-tenant, branch-scoped, role-authorized, and patient-private RLS policies.

CREATE TABLE IF NOT EXISTS public.human_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  chat_message_id TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'resolved', 'reopened', 'released')),
  assigned_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_staff_name TEXT,
  assigned_staff_role TEXT,
  subject TEXT NOT NULL,
  original_prompt TEXT NOT NULL,
  ai_response_summary TEXT,
  medical_disclaimer TEXT DEFAULT 'Never generate prescriptions or definitive medical diagnosis.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.escalation_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_id UUID NOT NULL REFERENCES public.human_escalations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('patient', 'staff', 'system')),
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_escalations_org_branch ON public.human_escalations(organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_escalations_patient ON public.human_escalations(patient_id);
CREATE INDEX IF NOT EXISTS idx_escalations_assigned_staff ON public.human_escalations(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON public.human_escalations(status);
CREATE INDEX IF NOT EXISTS idx_escalation_replies_parent ON public.escalation_replies(escalation_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.human_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_replies ENABLE ROW LEVEL SECURITY;

-- Helper Function to check recipient role authorization (Medical Managers, Reception Manager, Center Manager)
CREATE OR REPLACE FUNCTION public.is_authorized_escalation_recipient()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
      AND active = true
      AND role_key IN ('center_manager', 'branch_manager', 'doctor', 'receptionist')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS Policy 1: Staff SELECT Access on human_escalations
DROP POLICY IF EXISTS "staff_escalations_select" ON public.human_escalations;
CREATE POLICY "staff_escalations_select" ON public.human_escalations
  FOR SELECT
  USING (
    organization_id = public.current_user_org_id()
    AND public.is_authorized_escalation_recipient() = true
    AND (
      branch_id IS NULL
      OR public.is_org_wide_manager() = true
      OR public.has_branch_access(branch_id) = true
    )
  );

-- RLS Policy 2: Patient SELECT Access on human_escalations (Self & Guardian Ward access)
DROP POLICY IF EXISTS "patient_escalations_select" ON public.human_escalations;
CREATE POLICY "patient_escalations_select" ON public.human_escalations
  FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM public.patients
      WHERE auth_user_id = auth.uid() OR id = auth.uid()
      UNION
      SELECT ward_patient_id FROM public.patient_family_links
      WHERE guardian_patient_id IN (
        SELECT id FROM public.patients WHERE auth_user_id = auth.uid() OR id = auth.uid()
      ) AND status = 'active'
    )
  );

-- RLS Policy 3: Staff & Patient INSERT Access on human_escalations
DROP POLICY IF EXISTS "escalations_insert" ON public.human_escalations;
CREATE POLICY "escalations_insert" ON public.human_escalations
  FOR INSERT
  WITH CHECK (
    organization_id = public.current_user_org_id()
  );

-- RLS Policy 4: Staff UPDATE Access on human_escalations (Claim, Reply, Resolve, Release)
DROP POLICY IF EXISTS "staff_escalations_update" ON public.human_escalations;
CREATE POLICY "staff_escalations_update" ON public.human_escalations
  FOR UPDATE
  USING (
    organization_id = public.current_user_org_id()
    AND public.is_authorized_escalation_recipient() = true
  );

-- RLS Policy 5: Patient & Staff SELECT on escalation_replies
DROP POLICY IF EXISTS "escalation_replies_select" ON public.escalation_replies;
CREATE POLICY "escalation_replies_select" ON public.escalation_replies
  FOR SELECT
  USING (
    escalation_id IN (
      SELECT id FROM public.human_escalations
    )
  );

-- RLS Policy 6: Patient & Staff INSERT on escalation_replies
DROP POLICY IF EXISTS "escalation_replies_insert" ON public.escalation_replies;
CREATE POLICY "escalation_replies_insert" ON public.escalation_replies
  FOR INSERT
  WITH CHECK (
    escalation_id IN (
      SELECT id FROM public.human_escalations
    )
  );
