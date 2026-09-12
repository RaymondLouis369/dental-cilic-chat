-- ========================================================================
-- DENTAL CLINIC & DENTAL CENTER SAAS — EGYPT
-- Phase 2 Migration: Patient Identity, Family Model, Guardian Relations,
-- Fixed PIN Auth Foundation & Digital Patient Cards
-- ========================================================================

-- ------------------------------------------------------------------------
-- 1. PATIENTS TABLE (Organization-Wide Identity)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    patient_code VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    primary_mobile VARCHAR(50) NOT NULL,
    secondary_mobile VARCHAR(50),
    email VARCHAR(255),
    preferred_language VARCHAR(5) NOT NULL DEFAULT 'ar',
    country_code VARCHAR(10) NOT NULL DEFAULT '+20',
    insurance_company VARCHAR(150),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Enforce uniqueness of human-friendly patient code per organization
    UNIQUE(organization_id, patient_code)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_patients_org_id ON public.patients(organization_id);
CREATE INDEX IF NOT EXISTS idx_patients_code ON public.patients(patient_code);
CREATE INDEX IF NOT EXISTS idx_patients_mobile ON public.patients(primary_mobile);
CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients(status);

-- ------------------------------------------------------------------------
-- 2. FAMILIES TABLE
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    family_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    head_patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, family_code)
);

CREATE INDEX IF NOT EXISTS idx_families_org ON public.families(organization_id);

-- ------------------------------------------------------------------------
-- 3. FAMILY MEMBERS TABLE
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    relationship VARCHAR(50) NOT NULL CHECK (relationship IN (
        'father', 'mother', 'spouse', 'son', 'daughter', 'brother', 'sister', 'guardian', 'ward', 'other'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(family_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_family_members_fam ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_pat ON public.family_members(patient_id);

-- ------------------------------------------------------------------------
-- 4. GUARDIAN RELATIONSHIPS TABLE (Explicit Parent/Guardian Authorization)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardian_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    guardian_patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    ward_patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL DEFAULT 'parent' CHECK (relationship_type IN (
        'parent', 'legal_guardian', 'custodian', 'other'
    )),
    authorized_until TIMESTAMPTZ,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(guardian_patient_id, ward_patient_id),
    CHECK (guardian_patient_id != ward_patient_id)
);

CREATE INDEX IF NOT EXISTS idx_guardians_org ON public.guardian_relationships(organization_id);
CREATE INDEX IF NOT EXISTS idx_guardians_guardian ON public.guardian_relationships(guardian_patient_id);
CREATE INDEX IF NOT EXISTS idx_guardians_ward ON public.guardian_relationships(ward_patient_id);

-- ------------------------------------------------------------------------
-- 5. PATIENT ACCOUNTS TABLE (Fixed PIN, Salted Hash & Login State)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    mobile_number VARCHAR(50) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL, -- Never plaintext; SHA-256 with salt
    pin_salt VARCHAR(64) NOT NULL,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, mobile_number)
);

CREATE INDEX IF NOT EXISTS idx_patient_accounts_org_mobile ON public.patient_accounts(organization_id, mobile_number);
CREATE INDEX IF NOT EXISTS idx_patient_accounts_patient ON public.patient_accounts(patient_id);

-- ------------------------------------------------------------------------
-- 6. DIGITAL PATIENT CARDS TABLE (Opaque QR Tokens)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    card_number VARCHAR(60) NOT NULL,
    qr_token VARCHAR(255) UNIQUE NOT NULL, -- Opaque reference; zero PII or medical data
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    UNIQUE(organization_id, card_number)
);

CREATE INDEX IF NOT EXISTS idx_patient_cards_qr ON public.patient_cards(qr_token);
CREATE INDEX IF NOT EXISTS idx_patient_cards_patient ON public.patient_cards(patient_id);

-- ------------------------------------------------------------------------
-- 7. SECURE PATIENT RLS HELPER FUNCTIONS
-- ------------------------------------------------------------------------

-- Get patient ID of current session
CREATE OR REPLACE FUNCTION public.current_patient_id()
RETURNS UUID AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.patient_id', true), '')::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if current authenticated patient is authorized guardian of target patient
CREATE OR REPLACE FUNCTION public.is_authorized_guardian_of(target_patient_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.guardian_relationships
        WHERE guardian_patient_id = public.current_patient_id()
          AND ward_patient_id = target_patient_id
          AND active = true
          AND (authorized_until IS NULL OR authorized_until > NOW())
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------------
-- 8. PATIENT ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_cards ENABLE ROW LEVEL SECURITY;

-- PATIENTS RLS:
-- 1. Patients can view their own record OR records of wards they are authorized guardian for
CREATE POLICY "patient_select_self_or_ward"
ON public.patients
FOR SELECT
USING (
    -- Must be same organization
    organization_id = (
        SELECT organization_id FROM public.patients WHERE id = public.current_patient_id() LIMIT 1
    )
    AND (
        id = public.current_patient_id()
        OR public.is_authorized_guardian_of(id) = true
    )
);

-- 2. Staff with internal patient.read permission can also view patients in their organization
CREATE POLICY "staff_patient_read_policy"
ON public.patients
FOR SELECT
USING (
    organization_id = public.current_user_org_id()
    AND EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.role_permissions rp ON p.role_id = rp.role_id
        JOIN public.permissions perm ON rp.permission_id = perm.id
        WHERE p.auth_user_id = auth.uid()
          AND perm.key = 'patient.read'
    )
);

-- GUARDIAN RELATIONSHIPS RLS:
-- Guardian can only view relationships involving themselves
CREATE POLICY "guardian_relationships_select"
ON public.guardian_relationships
FOR SELECT
USING (
    guardian_patient_id = public.current_patient_id()
    OR ward_patient_id = public.current_patient_id()
);

-- PATIENT CARDS RLS:
-- Patient can only view their own digital card or ward card
CREATE POLICY "patient_cards_select"
ON public.patient_cards
FOR SELECT
USING (
    patient_id = public.current_patient_id()
    OR public.is_authorized_guardian_of(patient_id) = true
);

-- ------------------------------------------------------------------------
-- 9. SEED DATA FOR EGYPTIAN DENTAL PATIENTS (DEMO)
-- ------------------------------------------------------------------------

INSERT INTO public.patients (
    id, organization_id, patient_code, first_name, middle_name, last_name,
    date_of_birth, gender, primary_mobile, secondary_mobile, email, preferred_language, status
) VALUES
(
    'a1111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    'PAT-000001',
    'أحمد',
    'محمود',
    'محمد',
    '1988-05-12',
    'male',
    '+201000000001',
    '+20223581234',
    'ahmed.mohamed@example.eg',
    'ar',
    'active'
),
(
    'b2222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000001',
    'PAT-000002',
    'ليلى',
    'أحمد',
    'محمد',
    '2017-09-20',
    'female',
    '+201000000001', -- Shared mobile
    NULL,
    NULL,
    'ar',
    'active'
),
(
    'c3333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000001',
    'PAT-000003',
    'عمر',
    'أحمد',
    'محمد',
    '2020-03-15',
    'male',
    '+201000000001', -- Shared mobile
    NULL,
    NULL,
    'ar',
    'active'
),
(
    'd4444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000001',
    'PAT-000004',
    'منى',
    'علي',
    'حسن',
    '1994-11-04',
    'female',
    '+201000000002',
    NULL,
    'mona.hassan@example.eg',
    'ar',
    'active'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Family
INSERT INTO public.families (id, organization_id, family_code, name, head_patient_id)
VALUES (
    'f1111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    'FAM-000001',
    'عائلة أحمد محمد',
    'a1111111-1111-1111-1111-111111111111'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.family_members (family_id, patient_id, relationship)
VALUES
('f1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'father'),
('f1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 'daughter'),
('f1111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'son')
ON CONFLICT DO NOTHING;

-- Seed Explicit Guardianships
INSERT INTO public.guardian_relationships (organization_id, guardian_patient_id, ward_patient_id, relationship_type, active)
VALUES
('00000000-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 'parent', true),
('00000000-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'parent', true)
ON CONFLICT DO NOTHING;

-- Seed Patient Cards with Opaque QR Tokens
INSERT INTO public.patient_cards (organization_id, patient_id, card_number, qr_token, status)
VALUES
('00000000-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 'CARD-PAT-000001', 'eg_dcard_v1:00000000-a1111111-893f12ca7b5a831e', 'active'),
('00000000-0000-0000-0000-000000000001', 'b2222222-2222-2222-2222-222222222222', 'CARD-PAT-000002', 'eg_dcard_v1:00000000-b2222222-771f28bc9a2d348f', 'active'),
('00000000-0000-0000-0000-000000000001', 'c3333333-3333-3333-3333-333333333333', 'CARD-PAT-000003', 'eg_dcard_v1:00000000-c3333333-449e01db8b1c4912', 'active'),
('00000000-0000-0000-0000-000000000001', 'd4444444-4444-4444-4444-444444444444', 'CARD-PAT-000004', 'eg_dcard_v1:00000000-d4444444-551a39cc6e9b2104', 'active')
ON CONFLICT DO NOTHING;
