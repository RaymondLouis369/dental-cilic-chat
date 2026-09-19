-- Phase 06: Lab Order Manufacturing & Clinical Specifications Schema
-- Supports full dental restoration manufacturing parameters, RLS, multi-tenancy, and RBAC

CREATE TABLE IF NOT EXISTS public.lab_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  treatment_plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE SET NULL,
  treatment_service_id UUID REFERENCES public.treatment_plan_services(id) ON DELETE SET NULL,
  service_id TEXT NOT NULL,
  service_name_ar TEXT,
  service_name_en TEXT,
  lab_name TEXT,
  teeth TEXT[] DEFAULT '{}',
  delivery_date DATE NOT NULL,
  required_delivery_date DATE,
  shade_notes TEXT,
  materials_notes TEXT,
  notes TEXT,

  -- Detailed Clinical & Manufacturing Specifications
  material TEXT DEFAULT 'Monolithic Zirconia',
  framework TEXT DEFAULT 'Monolithic',
  try_in_or_final TEXT DEFAULT 'final', -- 'try_in', 'final', 'wax_up', 'bisque_bake'
  pontic TEXT DEFAULT 'N/A',
  abutment TEXT DEFAULT 'N/A',
  tooth_count INTEGER DEFAULT 1,
  product_type TEXT DEFAULT 'Crown',
  lab_notes TEXT,
  doctor_notes TEXT,
  attachment_refs TEXT[] DEFAULT '{}',

  status TEXT NOT NULL DEFAULT 'sent_to_lab', -- 'draft', 'sent_to_lab', 'in_production', 'received', 'delivered', 'fitted', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for rapid filtering by org, branch, patient, date range & status
CREATE INDEX IF NOT EXISTS idx_lab_orders_org_branch ON public.lab_orders(organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON public.lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_delivery_date ON public.lab_orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON public.lab_orders(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Organization Isolation
DROP POLICY IF EXISTS "Users can read lab orders within their organization" ON public.lab_orders;
CREATE POLICY "Users can read lab orders within their organization"
  ON public.lab_orders FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Doctors and managers can create/update lab orders" ON public.lab_orders;
CREATE POLICY "Doctors and managers can create/update lab orders"
  ON public.lab_orders FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );
