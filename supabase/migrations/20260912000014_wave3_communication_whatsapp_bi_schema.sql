-- ========================================================================
-- DENTAL CLINIC & DENTAL CENTER SAAS — EGYPT
-- Wave 03 Migration: Communication Center, WhatsApp Messaging, Templates & Preferences
-- Schema, RLS Security Policies & Multi-Tenant Scoping
-- ========================================================================

-- 1. WHATSAPP MESSAGE LOGS TABLE
CREATE TABLE IF NOT EXISTS public.whatsapp_message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    idempotency_key VARCHAR(150) UNIQUE NOT NULL,
    recipient_patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    recipient_mobile VARCHAR(50) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    message_type VARCHAR(50) NOT NULL CHECK (
        message_type IN (
            'appointment_confirmation',
            'appointment_reminder_24h',
            'appointment_reminder_same_day',
            'recall_notice',
            'payment_receipt',
            'post_treatment_instructions',
            'lab_prosthetic_update',
            'complaint_escalation_response',
            'custom_operational'
        )
    ),
    language VARCHAR(10) NOT NULL DEFAULT 'ar' CHECK (language IN ('ar', 'en')),
    template_id UUID,
    rendered_body TEXT NOT NULL,
    delivery_state VARCHAR(30) NOT NULL DEFAULT 'queued' CHECK (
        delivery_state IN ('queued', 'sent', 'delivered', 'failed')
    ),
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_user_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_wa_logs_org_branch ON public.whatsapp_message_logs(organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_wa_logs_patient ON public.whatsapp_message_logs(recipient_patient_id);
CREATE INDEX IF NOT EXISTS idx_wa_logs_delivery_state ON public.whatsapp_message_logs(delivery_state);
CREATE INDEX IF NOT EXISTS idx_wa_logs_idempotency ON public.whatsapp_message_logs(idempotency_key);

-- 2. MESSAGE TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.communication_message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    body_ar TEXT NOT NULL,
    body_en TEXT NOT NULL,
    allowed_placeholders TEXT[] DEFAULT ARRAY[]::TEXT[],
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_user_id UUID
);

CREATE INDEX IF NOT EXISTS idx_comm_templates_org ON public.communication_message_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_comm_templates_type ON public.communication_message_templates(type);

-- 3. PATIENT COMMUNICATION PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.patient_communication_preferences (
    patient_id UUID PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'ar' CHECK (preferred_language IN ('ar', 'en')),
    reminder_lead_hours INT NOT NULL DEFAULT 24 CHECK (reminder_lead_hours IN (12, 24, 48)),
    guardian_inheritance_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_comm_prefs_org ON public.patient_communication_preferences(organization_id);

-- ------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------

ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_communication_preferences ENABLE ROW LEVEL SECURITY;

-- 1. WhatsApp Logs RLS: Staff branch access OR Patient self access
DROP POLICY IF EXISTS "Staff branch isolation read WhatsApp logs" ON public.whatsapp_message_logs;
CREATE POLICY "Staff branch isolation read WhatsApp logs"
    ON public.whatsapp_message_logs FOR SELECT
    USING (
        public.fn_auth_user_has_branch_access(organization_id, branch_id)
        OR (
            recipient_patient_id IS NOT NULL 
            AND recipient_patient_id IN (
                SELECT id FROM public.patients WHERE email = (SELECT email FROM public.users WHERE id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Staff branch isolation write WhatsApp logs" ON public.whatsapp_message_logs;
CREATE POLICY "Staff branch isolation write WhatsApp logs"
    ON public.whatsapp_message_logs FOR ALL
    USING (
        public.fn_auth_user_has_branch_access(organization_id, branch_id)
        AND NOT EXISTS (
            SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role_key IN ('patient', 'guardian')
        )
    );

-- 2. Message Templates RLS: Staff read, Manager write
DROP POLICY IF EXISTS "Staff read message templates" ON public.communication_message_templates;
CREATE POLICY "Staff read message templates"
    ON public.communication_message_templates FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Managers write message templates" ON public.communication_message_templates;
CREATE POLICY "Managers write message templates"
    ON public.communication_message_templates FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid() AND role_key IN ('center_manager', 'branch_manager')
        )
    );

-- 3. Patient Preferences RLS: Staff read/write in org OR Patient self access
DROP POLICY IF EXISTS "Patient or Staff read preferences" ON public.patient_communication_preferences;
CREATE POLICY "Patient or Staff read preferences"
    ON public.patient_communication_preferences FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
        OR patient_id IN (
            SELECT id FROM public.patients WHERE email = (SELECT email FROM public.users WHERE id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Patient or Staff write preferences" ON public.patient_communication_preferences;
CREATE POLICY "Patient or Staff write preferences"
    ON public.patient_communication_preferences FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
        OR patient_id IN (
            SELECT id FROM public.patients WHERE email = (SELECT email FROM public.users WHERE id = auth.uid())
        )
    );
