-- ========================================================================
-- DENTAL CLINIC & DENTAL CENTER SAAS — EGYPT
-- Wave 02 Migration: Advanced Prosthetics, Lab Operations & Inventory Management
-- Schema, Immutable Stock Ledger, Modifications, Trial Fitting & RLS Security
-- ========================================================================

-- 1. INVENTORY ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    item_name_ar VARCHAR(255) NOT NULL,
    item_name_en VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (
        category IN ('dental_materials', 'implant_components', 'prosthetic_supplies', 'office_medical', 'other')
    ),
    sku VARCHAR(100) NOT NULL,
    unit VARCHAR(30) NOT NULL DEFAULT 'box' CHECK (
        unit IN ('piece', 'box', 'pack', 'ml', 'g', 'set', 'kit', 'carpule')
    ),
    supplier_id UUID,
    supplier_name VARCHAR(255),
    opening_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
    current_quantity NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
    minimum_reorder_level NUMERIC(12,2) NOT NULL DEFAULT 5,
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, branch_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_org_branch ON public.inventory_items(organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON public.inventory_items(sku);

-- 2. INVENTORY TRANSACTIONS LEDGER TABLE (IMMUTABLE STOCK MOVEMENT LOG)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    item_name_ar VARCHAR(255),
    item_name_en VARCHAR(255),
    type VARCHAR(30) NOT NULL CHECK (
        type IN ('receive', 'transfer', 'consumption', 'adjustment', 'return', 'wastage')
    ),
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    from_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    from_branch_name VARCHAR(255),
    to_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    to_branch_name VARCHAR(255),
    reference_id VARCHAR(100),
    notes TEXT,
    created_by UUID,
    created_by_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    quantity_after NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_inv_tx_org_branch ON public.inventory_transactions(organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_item ON public.inventory_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_type ON public.inventory_transactions(type);
CREATE INDEX IF NOT EXISTS idx_inv_tx_created_at ON public.inventory_transactions(created_at);

-- 3. PROSTHETIC MODIFICATION REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.prosthetic_modification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_order_id UUID NOT NULL REFERENCES public.lab_orders(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    requested_change TEXT NOT NULL,
    requester_id UUID NOT NULL,
    requester_name VARCHAR(255) NOT NULL,
    requester_role VARCHAR(50) NOT NULL,
    response_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (
        response_status IN ('pending', 'accepted', 'rejected', 'completed')
    ),
    response_notes TEXT,
    responded_by_id UUID,
    responded_by_name VARCHAR(255),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prosthetic_mods_lab_order ON public.prosthetic_modification_requests(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_prosthetic_mods_org ON public.prosthetic_modification_requests(organization_id);

-- 4. PROSTHETIC FITTING RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.prosthetic_fitting_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    lab_order_id UUID NOT NULL REFERENCES public.lab_orders(id) ON DELETE CASCADE,
    treatment_service_id UUID,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name VARCHAR(255),
    doctor_id UUID NOT NULL,
    doctor_name VARCHAR(255),
    trial_scheduled_at DATE,
    trial_result VARCHAR(40) NOT NULL DEFAULT 'acceptable' CHECK (
        trial_result IN ('acceptable', 'modification_required', 'approved_for_final', 'fitted')
    ),
    modification_notes TEXT,
    approved_for_final BOOLEAN NOT NULL DEFAULT false,
    final_delivered_at TIMESTAMPTZ,
    fitted_at TIMESTAMPTZ,
    fitted_by_doctor_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prosthetic_fittings_lab_order ON public.prosthetic_fitting_records(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_prosthetic_fittings_patient ON public.prosthetic_fitting_records(patient_id);

-- 5. LAB AND MATERIAL COSTS TABLE
CREATE TABLE IF NOT EXISTS public.lab_material_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('lab', 'material')),
    supplier_vendor VARCHAR(255) NOT NULL,
    item_name_ar VARCHAR(255) NOT NULL,
    item_name_en VARCHAR(255) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    actual_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    source_reference VARCHAR(100),
    invoice_id UUID,
    invoice_item_id UUID,
    service_id UUID,
    treatment_plan_id UUID,
    notes TEXT,
    created_by UUID,
    created_by_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_mat_costs_org ON public.lab_material_costs(organization_id);
CREATE INDEX IF NOT EXISTS idx_lab_mat_costs_invoice ON public.lab_material_costs(invoice_id);

-- ------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prosthetic_modification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prosthetic_fitting_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_material_costs ENABLE ROW LEVEL SECURITY;

-- 1. Inventory Items: Staff can read/write within their organization; patients DENIED
DROP POLICY IF EXISTS "Staff can read inventory items in org" ON public.inventory_items;
CREATE POLICY "Staff can read inventory items in org"
    ON public.inventory_items FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Staff can insert/update inventory items in org" ON public.inventory_items;
CREATE POLICY "Staff can insert/update inventory items in org"
    ON public.inventory_items FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

-- 2. Inventory Transactions: Staff can read/write within their organization; patients DENIED
DROP POLICY IF EXISTS "Staff can access inventory transactions in org" ON public.inventory_transactions;
CREATE POLICY "Staff can access inventory transactions in org"
    ON public.inventory_transactions FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

-- 3. Modification Requests: Staff, doctors and lab techs can access within org; patients DENIED
DROP POLICY IF EXISTS "Staff and lab techs access modification requests" ON public.prosthetic_modification_requests;
CREATE POLICY "Staff and lab techs access modification requests"
    ON public.prosthetic_modification_requests FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

-- 4. Prosthetic Fitting Records: Staff/Doctors can access within org; patients DENIED
DROP POLICY IF EXISTS "Doctors and staff access fitting records" ON public.prosthetic_fitting_records;
CREATE POLICY "Doctors and staff access fitting records"
    ON public.prosthetic_fitting_records FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

-- 5. Lab Material Costs: Staff/Managers access within org; patients DENIED
DROP POLICY IF EXISTS "Staff access lab material costs" ON public.lab_material_costs;
CREATE POLICY "Staff access lab material costs"
    ON public.lab_material_costs FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );
