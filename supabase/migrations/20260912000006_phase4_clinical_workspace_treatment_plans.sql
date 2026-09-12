-- ============================================================================
-- Phase 4 Migration: Doctor Clinical Workspace, Dental Charts, Treatment Plans,
-- Clinical Visits, Prescriptions, Consents, Investigations, Referrals & Tasks
-- Dental Clinic & Center SaaS — Egypt
-- ============================================================================

-- 1. DENTAL CHARTS
CREATE TABLE IF NOT EXISTS public.dental_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  chart_type TEXT NOT NULL CHECK (chart_type IN ('adult', 'pediatric')),
  notes TEXT,
  created_by_doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(patient_id, chart_type)
);

CREATE INDEX IF NOT EXISTS idx_dental_charts_org_patient ON public.dental_charts(organization_id, patient_id);

-- 2. DENTAL CHART ENTRIES (Historical audit log of all tooth conditions)
CREATE TABLE IF NOT EXISTS public.dental_chart_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES public.dental_charts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  tooth_number TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN (
    'sound', 'missing', 'caries', 'filling', 'crown', 'root_canal',
    'implant', 'extraction', 'fracture', 'planned_treatment', 'impacted',
    'bridge_abutment', 'pontic'
  )),
  surfaces TEXT[], -- e.g. ['mesial', 'occlusal']
  notes TEXT,
  recorded_by_doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  visit_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dental_chart_entries_tooth ON public.dental_chart_entries(organization_id, patient_id, tooth_number);

-- 3. TREATMENT PLANS
CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  diagnosis TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
    'planned', 'approved', 'scheduled', 'in_progress', 'completed', 'follow_up', 'cancelled'
  )),
  next_step TEXT,
  follow_up_notes TEXT,
  total_estimated_duration_minutes INT DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_org_patient ON public.treatment_plans(organization_id, patient_id);

-- 4. TREATMENT PLAN SERVICES (Sequenced procedures)
CREATE TABLE IF NOT EXISTS public.treatment_plan_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  treatment_plan_id UUID NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.dental_services(id),
  service_code TEXT,
  service_name_ar TEXT,
  service_name_en TEXT,
  tooth_number TEXT,
  area TEXT,
  sequence_order INT NOT NULL DEFAULT 1,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
    'planned', 'scheduled', 'in_progress', 'completed', 'cancelled'
  )),
  clinical_notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treatment_services_plan ON public.treatment_plan_services(treatment_plan_id, sequence_order);

-- 5. CLINICAL VISITS
CREATE TABLE IF NOT EXISTS public.clinical_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  appointment_id UUID REFERENCES public.appointments(id),
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  chief_complaint TEXT NOT NULL,
  history_of_present_illness TEXT,
  medical_history_review TEXT,
  examination_findings TEXT,
  assessment_diagnosis TEXT NOT NULL,
  treatment_performed TEXT NOT NULL,
  materials_used TEXT,
  anesthesia_details TEXT,
  next_visit_plan TEXT,
  doctor_notes TEXT,
  specialty TEXT NOT NULL DEFAULT 'general' CHECK (specialty IN (
    'general', 'endodontics', 'periodontics', 'implantology', 'orthodontics', 'pediatric', 'oral_surgery'
  )),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_visits_patient ON public.clinical_visits(organization_id, patient_id, visit_date);

-- 6. MEDICAL ALERTS
CREATE TABLE IF NOT EXISTS public.medical_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'allergy', 'chronic_condition', 'medication_warning', 'clinical_precaution', 'bleeding_risk', 'pregnancy_lactation'
  )),
  severity TEXT NOT NULL DEFAULT 'moderate' CHECK (severity IN ('low', 'moderate', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  recorded_by_doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_alerts_active ON public.medical_alerts(organization_id, patient_id, active);

-- 7. INVESTIGATION REQUESTS
CREATE TABLE IF NOT EXISTS public.investigation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  visit_id UUID REFERENCES public.clinical_visits(id),
  type TEXT NOT NULL CHECK (type IN (
    'periapical_xray', 'panoramic_opg', 'cbct_3d', 'bitewing', 'blood_investigation', 'biopsy_pathology', 'study_model', 'other'
  )),
  requested_test TEXT NOT NULL,
  clinical_reason TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent', 'stat')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested', 'pending', 'result_uploaded', 'reviewed'
  )),
  result_summary TEXT,
  result_file_url TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by_doctor_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. REFERRALS (INTERNAL & EXTERNAL)
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  referring_doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  referral_type TEXT NOT NULL CHECK (referral_type IN ('internal', 'external')),
  specialty TEXT NOT NULL,
  target_doctor_id UUID REFERENCES public.profiles(id),
  target_facility_name TEXT,
  reason TEXT NOT NULL,
  clinical_summary TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent', 'emergency')),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN (
    'draft', 'sent', 'pending', 'response_received', 'reviewed', 'closed'
  )),
  response_notes TEXT,
  response_doctor_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. DOCTOR RECOMMENDATIONS / INSTRUCTIONS
CREATE TABLE IF NOT EXISTS public.doctor_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  category TEXT NOT NULL CHECK (category IN (
    'post_surgery', 'post_extraction', 'implant_care', 'teeth_cleaning', 'crown_bridge', 'orthodontics', 'general_hygiene', 'custom'
  )),
  title TEXT NOT NULL,
  instructions_ar TEXT NOT NULL,
  instructions_en TEXT NOT NULL,
  reception_task_created BOOLEAN NOT NULL DEFAULT FALSE,
  reception_task_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. PRESCRIPTIONS
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  visit_id UUID REFERENCES public.clinical_visits(id),
  diagnosis TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  instructions TEXT NOT NULL
);

-- 11. INFORMED CONSENT REQUESTS
CREATE TABLE IF NOT EXISTS public.consent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'treatment_plan_agreement', 'extraction_consent', 'implant_surgery_consent',
    'bone_graft_consent', 'root_canal_consent', 'sedation_consent', 'orthodontic_consent', 'other'
  )),
  title TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  description_en TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested', 'pending_signature', 'signed', 'declined'
  )),
  signed_by_name TEXT,
  signed_at TIMESTAMPTZ,
  signature_reference TEXT,
  reception_task_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. FOLLOW-UP PLANS
CREATE TABLE IF NOT EXISTS public.follow_up_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  visit_id UUID REFERENCES public.clinical_visits(id),
  due_date DATE NOT NULL,
  interval TEXT NOT NULL CHECK (interval IN (
    '2_days', '7_days', '14_days', '1_month', '3_months', '6_months', 'custom'
  )),
  reason TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'contacted', 'scheduled', 'completed', 'cancelled'
  )),
  reception_task_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. DOCTOR TASKS (DOCTOR -> RECEPTION TASK WORKFLOW)
CREATE TABLE IF NOT EXISTS public.doctor_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  task_type TEXT NOT NULL CHECK (task_type IN (
    'send_instructions', 'obtain_consent', 'book_specialist', 'collect_required_document', 'contact_patient', 'schedule_follow_up'
  )),
  title TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  assigned_to_role TEXT NOT NULL DEFAULT 'receptionist',
  completed_by_staff_id UUID REFERENCES public.profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. DOCTOR TO DOCTOR CONSULTATIONS
CREATE TABLE IF NOT EXISTS public.doctor_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  requesting_doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  specialist_doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  specialty TEXT NOT NULL,
  subject TEXT NOT NULL,
  reason TEXT NOT NULL,
  clinical_notes TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'closed')),
  response_notes TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-Tenant & Doctor Branch Authorization
-- ============================================================================

ALTER TABLE public.dental_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dental_chart_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plan_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_consultations ENABLE ROW LEVEL SECURITY;

-- Helper RLS Policy pattern for Org Isolation
CREATE POLICY org_isolation_dental_charts ON public.dental_charts
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY org_isolation_dental_chart_entries ON public.dental_chart_entries
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY org_isolation_treatment_plans ON public.treatment_plans
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY org_isolation_treatment_plan_services ON public.treatment_plan_services
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY org_isolation_clinical_visits ON public.clinical_visits
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY org_isolation_medical_alerts ON public.medical_alerts
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY org_isolation_investigation_requests ON public.investigation_requests
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY org_isolation_referrals ON public.referrals
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY org_isolation_doctor_recommendations ON public.doctor_recommendations
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY org_isolation_prescriptions ON public.prescriptions
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY org_isolation_consent_requests ON public.consent_requests
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY org_isolation_follow_up_plans ON public.follow_up_plans
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY org_isolation_doctor_tasks ON public.doctor_tasks
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY org_isolation_doctor_consultations ON public.doctor_consultations
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE auth_user_id = auth.uid()));
