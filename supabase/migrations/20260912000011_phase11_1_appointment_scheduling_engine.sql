-- ========================================================================
-- Migration: 20260912000011_phase11_1_appointment_scheduling_engine.sql
-- Phase 11.1: Appointment & Scheduling Engine
-- Dental Clinic & Dental Center Management Platform — Egypt
-- ========================================================================

-- 1. EXTEND APPOINTMENTS TABLE WITH PHASE 11.1 COLUMNS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'appointment_type'
    ) THEN
        ALTER TABLE public.appointments 
        ADD COLUMN appointment_type VARCHAR(50) NOT NULL DEFAULT 'general' 
        CHECK (appointment_type IN ('consultation', 'treatment', 'follow_up', 'cleaning', 'prosthetic', 'orthodontic', 'emergency', 'general'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'treatment_plan_id'
    ) THEN
        ALTER TABLE public.appointments 
        ADD COLUMN treatment_plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'treatment_service_id'
    ) THEN
        ALTER TABLE public.appointments 
        ADD COLUMN treatment_service_id UUID REFERENCES public.treatment_plan_services(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. CREATE PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_appointments_doc_date_times 
    ON public.appointments(doctor_id, appointment_date, start_time, end_time) 
    WHERE status NOT IN ('cancelled', 'rescheduled');

CREATE INDEX IF NOT EXISTS idx_appointments_pat_date 
    ON public.appointments(patient_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_org_branch_type 
    ON public.appointments(organization_id, branch_id, appointment_type);

-- 3. DATABASE-LEVEL OVERLAP & DOUBLE-BOOKING PREVENTION TRIGGER
CREATE OR REPLACE FUNCTION public.prevent_appointment_overlap()
RETURNS TRIGGER AS $$
DECLARE
    v_conflict_count INT;
BEGIN
    -- Validate start_time < end_time
    IF NEW.start_time >= NEW.end_time THEN
        RAISE EXCEPTION 'ERR_INVALID_APPOINTMENT_TIME: start_time must be strictly earlier than end_time' 
            USING ERRCODE = '22000';
    END IF;

    -- Skip check if appointment is being cancelled or rescheduled
    IF NEW.status IN ('cancelled', 'rescheduled') THEN
        RETURN NEW;
    END IF;

    -- Check for overlapping active appointments for the same doctor on the same date
    SELECT COUNT(*)
    INTO v_conflict_count
    FROM public.appointments
    WHERE doctor_id = NEW.doctor_id
      AND appointment_date = NEW.appointment_date
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status NOT IN ('cancelled', 'rescheduled')
      AND (
          (NEW.start_time < end_time AND NEW.end_time > start_time)
      );

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'ERR_APPOINTMENT_CONFLICT: Doctor is already booked during this time interval (% - %)',
            NEW.start_time, NEW.end_time
            USING ERRCODE = '23P01';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_appointment_overlap ON public.appointments;
CREATE TRIGGER trg_prevent_appointment_overlap
    BEFORE INSERT OR UPDATE OF doctor_id, appointment_date, start_time, end_time, status
    ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_appointment_overlap();

-- 4. RLS POLICIES FOR APPOINTMENTS (STAFF, DOCTORS, PATIENTS, GUARDIANS)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop old policies to replace with comprehensive Phase 11.1 policies
DROP POLICY IF EXISTS rls_appointments_select ON public.appointments;
DROP POLICY IF EXISTS rls_appointments_insert ON public.appointments;
DROP POLICY IF EXISTS rls_appointments_update ON public.appointments;
DROP POLICY IF EXISTS rls_appointments_select_v11 ON public.appointments;
DROP POLICY IF EXISTS rls_appointments_insert_v11 ON public.appointments;
DROP POLICY IF EXISTS rls_appointments_update_v11 ON public.appointments;

-- SELECT POLICY:
-- 1. Org-wide staff (center managers) can view all appointments in their org.
-- 2. Branch-scoped staff (receptionists, branch managers) can view appointments in their assigned branches.
-- 3. Doctors can view appointments where they are the assigned doctor.
-- 4. Patients can view their own appointments.
-- 5. Authorized Guardians can view appointments of their dependent wards.
CREATE POLICY rls_appointments_select_v11 ON public.appointments
    FOR SELECT USING (
        -- Enforce Organization Isolation
        (
            organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid())
            AND (
                -- Org-wide role
                EXISTS (
                    SELECT 1 FROM public.profiles p
                    JOIN public.roles r ON p.role_id = r.id
                    WHERE p.auth_user_id = auth.uid() AND r.is_org_wide = true
                )
                -- Branch-assigned staff
                OR branch_id IN (
                    SELECT ubs.branch_id FROM public.user_branch_scopes ubs
                    JOIN public.profiles p ON ubs.user_id = p.id
                    WHERE p.auth_user_id = auth.uid()
                )
                -- Assigned doctor
                OR doctor_id = (
                    SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
                )
            )
        )
        OR
        -- Patient Portal / Guardian Access
        (
            organization_id = (
                SELECT organization_id FROM public.patient_accounts WHERE auth_user_id = auth.uid()
            )
            AND (
                -- Patient self
                patient_id = (
                    SELECT patient_id FROM public.patient_accounts WHERE auth_user_id = auth.uid()
                )
                -- Guardian ward
                OR patient_id IN (
                    SELECT pg.ward_patient_id FROM public.patient_guardians pg
                    WHERE pg.guardian_patient_id = (
                        SELECT patient_id FROM public.patient_accounts WHERE auth_user_id = auth.uid()
                    )
                )
            )
        )
    );

-- INSERT POLICY (Receptionist / Branch Manager / Center Manager)
CREATE POLICY rls_appointments_insert_v11 ON public.appointments
    FOR INSERT WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid())
        AND (
            EXISTS (
                SELECT 1 FROM public.profiles p
                JOIN public.roles r ON p.role_id = r.id
                WHERE p.auth_user_id = auth.uid() AND (r.is_org_wide = true OR r.key IN ('center_manager', 'branch_manager', 'receptionist'))
            )
            OR branch_id IN (
                SELECT ubs.branch_id FROM public.user_branch_scopes ubs
                JOIN public.profiles p ON ubs.user_id = p.id
                WHERE p.auth_user_id = auth.uid()
            )
        )
    );

-- UPDATE POLICY (Receptionists, Branch Managers, Org-Wide Managers, and Assigned Doctors for status)
CREATE POLICY rls_appointments_update_v11 ON public.appointments
    FOR UPDATE USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid())
        AND (
            -- Center manager org-wide
            EXISTS (
                SELECT 1 FROM public.profiles p
                JOIN public.roles r ON p.role_id = r.id
                WHERE p.auth_user_id = auth.uid() AND r.is_org_wide = true
            )
            -- Branch-scoped staff
            OR branch_id IN (
                SELECT ubs.branch_id FROM public.user_branch_scopes ubs
                JOIN public.profiles p ON ubs.user_id = p.id
                WHERE p.auth_user_id = auth.uid()
            )
            -- Assigned doctor
            OR doctor_id = (
                SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
            )
        )
    );
