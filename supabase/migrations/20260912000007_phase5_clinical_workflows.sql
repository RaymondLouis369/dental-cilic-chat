-- ============================================================================
-- Migration: 20260912000007_phase5_clinical_workflows.sql
-- Description: Phase 5: Clinical Workflow (Doctor -> Reception -> Patient),
--              Service Categories Hierarchy, Consent Signatures,
--              Investigation Results, and Patient Medical Records
-- ============================================================================

-- 1. Ensure Service Categories Hierarchy & Soft Deactivation
CREATE TABLE IF NOT EXISTS public.service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    display_order INT DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_service_category_org_code UNIQUE (organization_id, code)
);

-- Index for speedy category lookups
CREATE INDEX IF NOT EXISTS idx_service_categories_org ON public.service_categories(organization_id, active);

-- 2. Enhance Services table with Category FK & Deactivation Status
ALTER TABLE IF EXISTS public.services 
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.service_categories(id),
    ADD COLUMN IF NOT EXISTS default_duration_minutes INT DEFAULT 30,
    ADD COLUMN IF NOT EXISTS requires_doctor BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 3. Reception Tasks / Clinical Handoffs Table
CREATE TABLE IF NOT EXISTS public.reception_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.profiles(id),
    visit_id UUID REFERENCES public.clinical_visits(id),
    task_type VARCHAR(50) NOT NULL, -- send_instructions, obtain_consent, schedule_follow_up, investigation_coord, referral_coord, general
    title VARCHAR(255) NOT NULL,
    details TEXT,
    priority VARCHAR(20) DEFAULT 'normal', -- normal, urgent, vip
    status VARCHAR(30) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    assigned_to_role VARCHAR(50) DEFAULT 'receptionist',
    metadata JSONB DEFAULT '{}'::jsonb,
    completed_by_staff_id UUID REFERENCES public.profiles(id),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reception_tasks_org_status ON public.reception_tasks(organization_id, branch_id, status);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reception_tasks ENABLE ROW LEVEL SECURITY;

-- 5. Service Categories RLS Policies
CREATE POLICY service_categories_org_isolation ON public.service_categories
    FOR ALL
    TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

-- 6. Reception Tasks RLS Policies
CREATE POLICY reception_tasks_org_isolation ON public.reception_tasks
    FOR ALL
    TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );
