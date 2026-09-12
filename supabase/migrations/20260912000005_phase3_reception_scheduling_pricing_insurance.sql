-- ========================================================================
-- DENTAL CLINIC & DENTAL CENTER SAAS — EGYPT
-- Phase 3 Migration: Reception Dashboard, Doctor Schedules & Shifts,
-- Booking, Walk-in / Waiting List, Service Catalog, Cash & Insurance Price Lists,
-- Versioning, Insurance Card Templates, and Custom Patient Services
-- ========================================================================

-- ------------------------------------------------------------------------
-- 1. SERVICE CATEGORIES TABLE
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(150) NOT NULL,
    name_en VARCHAR(150) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_srv_categories_org ON public.service_categories(organization_id);

-- ------------------------------------------------------------------------
-- 2. SERVICES CATALOG TABLE
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- e.g., examinations, pediatric, restorative, surgery, orthodontics
    default_duration_minutes INT NOT NULL DEFAULT 30,
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    requires_doctor BOOLEAN NOT NULL DEFAULT true,
    active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_services_org ON public.services(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_code ON public.services(code);
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category);

-- ------------------------------------------------------------------------
-- 3. DOCTOR SHIFTS & SCHEDULES TABLE
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctor_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday (Egypt standard week starts Sunday)
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_start TIME,
    break_end TIME,
    slot_duration_minutes INT NOT NULL DEFAULT 30,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_shift_times CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_doctor_shifts_org ON public.doctor_shifts(organization_id);
CREATE INDEX IF NOT EXISTS idx_doctor_shifts_branch ON public.doctor_shifts(branch_id);
CREATE INDEX IF NOT EXISTS idx_doctor_shifts_doc ON public.doctor_shifts(doctor_id);

-- ------------------------------------------------------------------------
-- 4. APPOINTMENTS TABLE
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 30,
    status VARCHAR(30) NOT NULL DEFAULT 'confirmed' CHECK (
        status IN ('confirmed', 'arrived', 'waiting', 'with_doctor', 'completed', 'cancelled', 'no_show', 'rescheduled', 'late')
    ),
    booking_type VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (booking_type IN ('scheduled', 'walk_in')),
    notes TEXT,
    cancellation_reason TEXT,
    check_in_time TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_org ON public.appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_branch_date ON public.appointments(branch_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- ------------------------------------------------------------------------
-- 5. WAITING LIST TABLE (Walk-ins & Arrived Patients)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.waiting_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    preferred_doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    requested_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'vip')),
    status VARCHAR(30) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'with_doctor', 'completed', 'cancelled', 'left')),
    ticket_number VARCHAR(20) NOT NULL,
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estimated_wait_minutes INT DEFAULT 15,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waiting_list_branch ON public.waiting_list(branch_id, status);

-- ------------------------------------------------------------------------
-- 6. CASH PRICE LISTS & VERSIONING
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.price_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'cash' CHECK (type IN ('cash', 'insurance', 'custom')),
    is_default BOOLEAN NOT NULL DEFAULT true,
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS public.price_list_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    price_list_id UUID NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'preview', 'published', 'archived')),
    published_at TIMESTAMPTZ,
    effective_from DATE,
    effective_to DATE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(price_list_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.price_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    price_list_version_id UUID NOT NULL REFERENCES public.price_list_versions(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    service_code VARCHAR(50) NOT NULL,
    cash_price NUMERIC(12, 2) NOT NULL CHECK (cash_price >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(price_list_version_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_price_items_version ON public.price_list_items(price_list_version_id);

-- ------------------------------------------------------------------------
-- 7. INSURANCE COMPANIES, PLANS & PRICING
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.insurance_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    contact_person VARCHAR(150),
    allows_non_contracted_discount BOOLEAN NOT NULL DEFAULT false,
    non_contracted_discount_percentage NUMERIC(5, 2) DEFAULT 0 CHECK (non_contracted_discount_percentage BETWEEN 0 AND 100),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS public.insurance_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.insurance_companies(id) ON DELETE CASCADE,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    coverage_percentage_default NUMERIC(5, 2) NOT NULL DEFAULT 80 CHECK (coverage_percentage_default BETWEEN 0 AND 100),
    patient_copay_percentage_default NUMERIC(5, 2) NOT NULL DEFAULT 20 CHECK (patient_copay_percentage_default BETWEEN 0 AND 100),
    max_annual_limit NUMERIC(12, 2),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, code)
);

CREATE TABLE IF NOT EXISTS public.insurance_price_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.insurance_companies(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.insurance_plans(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.insurance_price_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    insurance_price_list_id UUID NOT NULL REFERENCES public.insurance_price_lists(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    service_code VARCHAR(50) NOT NULL,
    insurance_price NUMERIC(12, 2) NOT NULL CHECK (insurance_price >= 0),
    coverage_percentage NUMERIC(5, 2) NOT NULL DEFAULT 80 CHECK (coverage_percentage BETWEEN 0 AND 100),
    patient_copay_percentage NUMERIC(5, 2) NOT NULL DEFAULT 20 CHECK (patient_copay_percentage BETWEEN 0 AND 100),
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(insurance_price_list_id, service_id)
);

-- ------------------------------------------------------------------------
-- 8. INSURANCE CARD TEMPLATE FOUNDATION (Preparation for future OCR)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.insurance_card_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.insurance_companies(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    sample_card_image_url TEXT,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.insurance_card_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES public.insurance_card_templates(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    field_key VARCHAR(100) NOT NULL, -- e.g. patient_name, member_id, card_number, policy_number, employee_number, expiry_date
    field_label_ar VARCHAR(150) NOT NULL,
    field_label_en VARCHAR(150) NOT NULL,
    required BOOLEAN NOT NULL DEFAULT true,
    ocr_bounding_box JSONB, -- Coordinates { x, y, width, height } for future OCR mapping
    field_type VARCHAR(50) NOT NULL DEFAULT 'text',
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------
-- 9. CUSTOM PATIENT SERVICES & ADMIN REVIEW QUEUE
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_patient_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    service_name VARCHAR(255) NOT NULL,
    patient_price NUMERIC(12, 2) NOT NULL CHECK (patient_price >= 0),
    reason TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'assigned_standard', 'rejected')),
    assigned_standard_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    supplier_vendor_cost NUMERIC(12, 2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_services_org ON public.custom_patient_services(organization_id, status);

-- ------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_list_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_card_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_patient_services ENABLE ROW LEVEL SECURITY;

-- Helper RLS predicates:
-- 1. Appointments & Waiting List:
-- Receptionists / branch managers can only view/modify their assigned branch.
-- Center managers can view/manage across all branches in their organization.

CREATE POLICY rls_appointments_select ON public.appointments
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid())
        AND (
            EXISTS (
                SELECT 1 FROM public.profiles p
                JOIN public.roles r ON p.role_id = r.id
                WHERE p.auth_user_id = auth.uid() AND r.is_org_wide = true
            )
            OR branch_id IN (
                SELECT branch_id FROM public.user_branch_scopes ubs
                JOIN public.profiles p ON ubs.user_id = p.id
                WHERE p.auth_user_id = auth.uid()
            )
            OR doctor_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
        )
    );

CREATE POLICY rls_appointments_insert ON public.appointments
    FOR INSERT WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid())
        AND (
            EXISTS (
                SELECT 1 FROM public.profiles p
                JOIN public.roles r ON p.role_id = r.id
                WHERE p.auth_user_id = auth.uid() AND r.is_org_wide = true
            )
            OR branch_id IN (
                SELECT branch_id FROM public.user_branch_scopes ubs
                JOIN public.profiles p ON ubs.user_id = p.id
                WHERE p.auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY rls_appointments_update ON public.appointments
    FOR UPDATE USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid())
        AND (
            EXISTS (
                SELECT 1 FROM public.profiles p
                JOIN public.roles r ON p.role_id = r.id
                WHERE p.auth_user_id = auth.uid() AND r.is_org_wide = true
            )
            OR branch_id IN (
                SELECT branch_id FROM public.user_branch_scopes ubs
                JOIN public.profiles p ON ubs.user_id = p.id
                WHERE p.auth_user_id = auth.uid()
            )
        )
    );

-- Pricing administration RLS: Only Center Manager / authorized manager can mutate price lists
CREATE POLICY rls_price_lists_modify ON public.price_lists
    FOR ALL USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.roles r ON p.role_id = r.id
            WHERE p.auth_user_id = auth.uid() AND r.key IN ('center_manager')
        )
    );

CREATE POLICY rls_price_list_versions_modify ON public.price_list_versions
    FOR ALL USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.roles r ON p.role_id = r.id
            WHERE p.auth_user_id = auth.uid() AND r.key IN ('center_manager')
        )
    );
