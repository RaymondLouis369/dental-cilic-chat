-- ========================================================================
-- DENTAL CLINIC & DENTAL CENTER SAAS — EGYPT
-- Wave 02 Remediation Migration: Branch RLS, Scope Isolation & Atomic Concurrency Stored Procedure
-- ========================================================================

-- 1. Helper function to check if current auth.uid() belongs to organization and optional branch
CREATE OR REPLACE FUNCTION public.fn_auth_user_has_branch_access(p_org_id UUID, p_branch_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_role VARCHAR;
    v_user_org_id UUID;
BEGIN
    SELECT organization_id, role_key INTO v_user_org_id, v_user_role
    FROM public.users
    WHERE id = auth.uid();

    IF v_user_org_id IS NULL OR v_user_org_id != p_org_id THEN
        RETURN FALSE;
    END IF;

    -- Center managers have organization-wide access across all branches
    IF v_user_role = 'center_manager' THEN
        RETURN TRUE;
    END IF;

    -- For branch-specific staff, check if branch_id matches user's assigned branch or branch mapping
    IF p_branch_id IS NULL THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND (u.branch_id = p_branch_id OR p_branch_id = ANY(u.assigned_branch_ids))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. ENABLE ROW LEVEL SECURITY AND REPLACE POLICIES WITH BRANCH-LEVEL ISOLATION

-- 2.1 Inventory Items
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read inventory items in org" ON public.inventory_items;
DROP POLICY IF EXISTS "Staff can insert/update inventory items in org" ON public.inventory_items;
DROP POLICY IF EXISTS "Staff branch isolation read inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Staff branch isolation write inventory items" ON public.inventory_items;

CREATE POLICY "Staff branch isolation read inventory items"
    ON public.inventory_items FOR SELECT
    USING (
        public.fn_auth_user_has_branch_access(organization_id, branch_id)
        AND NOT EXISTS (
            SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role_key IN ('patient', 'guardian')
        )
    );

CREATE POLICY "Staff branch isolation write inventory items"
    ON public.inventory_items FOR ALL
    USING (
        public.fn_auth_user_has_branch_access(organization_id, branch_id)
        AND NOT EXISTS (
            SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role_key IN ('patient', 'guardian', 'lab_tech', 'delivery_courier')
        )
    );

-- 2.2 Inventory Transactions
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can access inventory transactions in org" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Staff branch isolation access inventory transactions" ON public.inventory_transactions;

CREATE POLICY "Staff branch isolation access inventory transactions"
    ON public.inventory_transactions FOR ALL
    USING (
        public.fn_auth_user_has_branch_access(organization_id, branch_id)
        AND NOT EXISTS (
            SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role_key IN ('patient', 'guardian')
        )
    );

-- 2.3 Prosthetic Modification Requests
ALTER TABLE public.prosthetic_modification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff and lab techs access modification requests" ON public.prosthetic_modification_requests;
DROP POLICY IF EXISTS "Staff branch and lab tech isolation modification requests" ON public.prosthetic_modification_requests;

CREATE POLICY "Staff branch and lab tech isolation modification requests"
    ON public.prosthetic_modification_requests FOR ALL
    USING (
        public.fn_auth_user_has_branch_access(organization_id, branch_id)
        AND NOT EXISTS (
            SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role_key IN ('patient', 'guardian')
        )
    );

-- 2.4 Prosthetic Fitting Records
ALTER TABLE public.prosthetic_fitting_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doctors and staff access fitting records" ON public.prosthetic_fitting_records;
DROP POLICY IF EXISTS "Staff branch isolation fitting records" ON public.prosthetic_fitting_records;

CREATE POLICY "Staff branch isolation fitting records"
    ON public.prosthetic_fitting_records FOR ALL
    USING (
        public.fn_auth_user_has_branch_access(organization_id, branch_id)
        AND NOT EXISTS (
            SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role_key IN ('patient', 'guardian')
        )
    );

-- 2.5 Lab Material Costs
ALTER TABLE public.lab_material_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff access lab material costs" ON public.lab_material_costs;
DROP POLICY IF EXISTS "Staff branch isolation lab material costs" ON public.lab_material_costs;

CREATE POLICY "Staff branch isolation lab material costs"
    ON public.lab_material_costs FOR ALL
    USING (
        public.fn_auth_user_has_branch_access(organization_id, branch_id)
        AND NOT EXISTS (
            SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role_key IN ('patient', 'guardian', 'lab_tech', 'delivery_courier')
        )
    );

-- 3. ATOMIC STOCK MUTATION STORED PROCEDURE FOR CONCURRENCY AND NEGATIVE STOCK PROTECTION
CREATE OR REPLACE FUNCTION public.mutate_inventory_stock(
    p_organization_id UUID,
    p_branch_id UUID,
    p_inventory_item_id UUID,
    p_type VARCHAR(30),
    p_quantity NUMERIC(12,2),
    p_unit_cost NUMERIC(12,2) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_actor_id UUID DEFAULT NULL,
    p_actor_name VARCHAR(255) DEFAULT NULL,
    p_to_branch_id UUID DEFAULT NULL,
    p_to_branch_name VARCHAR(255) DEFAULT NULL,
    p_reference_id VARCHAR(100) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_item RECORD;
    v_dest_item RECORD;
    v_new_qty NUMERIC(12,2);
    v_effective_unit_cost NUMERIC(12,2);
    v_total_cost NUMERIC(12,2);
    v_tx_id UUID := gen_random_uuid();
    v_dest_tx_id UUID := gen_random_uuid();
    v_now TIMESTAMPTZ := NOW();
BEGIN
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be strictly positive';
    END IF;

    -- Lock source inventory row with FOR UPDATE to serialize concurrent mutations
    SELECT * INTO v_item
    FROM public.inventory_items
    WHERE id = p_inventory_item_id AND organization_id = p_organization_id
    FOR UPDATE;

    IF v_item.id IS NULL THEN
        RAISE EXCEPTION 'Inventory item not found or organization mismatch';
    END IF;

    IF v_item.branch_id != p_branch_id THEN
        RAISE EXCEPTION 'Branch mismatch for inventory item';
    END IF;

    v_effective_unit_cost := COALESCE(p_unit_cost, v_item.unit_cost);

    -- Compute new quantity & enforce non-negative stock constraint
    IF p_type IN ('receive', 'return') THEN
        v_new_qty := v_item.current_quantity + p_quantity;
    ELSIF p_type IN ('consumption', 'wastage') THEN
        IF v_item.current_quantity < p_quantity THEN
            RAISE EXCEPTION 'Insufficient stock: current stock % is less than requested %', v_item.current_quantity, p_quantity;
        END IF;
        v_new_qty := v_item.current_quantity - p_quantity;
    ELSIF p_type = 'adjustment' THEN
        v_new_qty := v_item.current_quantity + p_quantity;
        IF v_new_qty < 0 THEN
            RAISE EXCEPTION 'Insufficient stock for adjustment: resulting stock would be negative (%)', v_new_qty;
        END IF;
    ELSIF p_type = 'transfer' THEN
        IF v_item.current_quantity < p_quantity THEN
            RAISE EXCEPTION 'Insufficient stock for transfer: current stock % is less than requested %', v_item.current_quantity, p_quantity;
        END IF;
        IF p_to_branch_id IS NULL THEN
            RAISE EXCEPTION 'Destination branch ID required for transfer';
        END IF;
        v_new_qty := v_item.current_quantity - p_quantity;
    ELSE
        RAISE EXCEPTION 'Invalid inventory transaction type: %', p_type;
    END IF;

    v_total_cost := ROUND(p_quantity * v_effective_unit_cost, 2);

    -- Update current item stock
    UPDATE public.inventory_items
    SET current_quantity = v_new_qty,
        unit_cost = v_effective_unit_cost,
        updated_at = v_now
    WHERE id = v_item.id;

    -- Record transaction in immutable ledger
    INSERT INTO public.inventory_transactions (
        id, organization_id, branch_id, inventory_item_id,
        item_name_ar, item_name_en, type, quantity,
        unit_cost, total_cost, from_branch_id, to_branch_id,
        to_branch_name, reference_id, notes, created_by,
        created_by_name, created_at, quantity_after
    ) VALUES (
        v_tx_id, p_organization_id, p_branch_id, v_item.id,
        v_item.item_name_ar, v_item.item_name_en, p_type, p_quantity,
        v_effective_unit_cost, v_total_cost, p_branch_id, p_to_branch_id,
        p_to_branch_name, p_reference_id, p_notes, p_actor_id,
        p_actor_name, v_now, v_new_qty
    );

    -- Handle Transfer to Destination Branch
    IF p_type = 'transfer' AND p_to_branch_id IS NOT NULL THEN
        -- Lock destination item if exists
        SELECT * INTO v_dest_item
        FROM public.inventory_items
        WHERE organization_id = p_organization_id
          AND branch_id = p_to_branch_id
          AND sku = v_item.sku
        FOR UPDATE;

        IF v_dest_item.id IS NOT NULL THEN
            UPDATE public.inventory_items
            SET current_quantity = current_quantity + p_quantity,
                updated_at = v_now
            WHERE id = v_dest_item.id;

            INSERT INTO public.inventory_transactions (
                id, organization_id, branch_id, inventory_item_id,
                item_name_ar, item_name_en, type, quantity,
                unit_cost, total_cost, from_branch_id, from_branch_name,
                reference_id, notes, created_by, created_by_name, created_at, quantity_after
            ) VALUES (
                v_dest_tx_id, p_organization_id, p_to_branch_id, v_dest_item.id,
                v_dest_item.item_name_ar, v_dest_item.item_name_en, 'receive', p_quantity,
                v_effective_unit_cost, v_total_cost, p_branch_id, 'Source Branch Transfer',
                p_reference_id, COALESCE(p_notes, 'Inter-branch transfer received'), p_actor_id, p_actor_name, v_now,
                v_dest_item.current_quantity + p_quantity
            );
        ELSE
            -- Create item in destination branch
            INSERT INTO public.inventory_items (
                organization_id, branch_id, item_name_ar, item_name_en,
                category, sku, unit, supplier_id, supplier_name,
                opening_quantity, current_quantity, minimum_reorder_level,
                unit_cost, active, created_at, updated_at
            ) VALUES (
                p_organization_id, p_to_branch_id, v_item.item_name_ar, v_item.item_name_en,
                v_item.category, v_item.sku, v_item.unit, v_item.supplier_id, v_item.supplier_name,
                0, p_quantity, v_item.minimum_reorder_level,
                v_effective_unit_cost, true, v_now, v_now
            ) RETURNING * INTO v_dest_item;

            INSERT INTO public.inventory_transactions (
                id, organization_id, branch_id, inventory_item_id,
                item_name_ar, item_name_en, type, quantity,
                unit_cost, total_cost, from_branch_id, from_branch_name,
                reference_id, notes, created_by, created_by_name, created_at, quantity_after
            ) VALUES (
                v_dest_tx_id, p_organization_id, p_to_branch_id, v_dest_item.id,
                v_dest_item.item_name_ar, v_dest_item.item_name_en, 'receive', p_quantity,
                v_effective_unit_cost, v_total_cost, p_branch_id, 'Source Branch Transfer',
                p_reference_id, COALESCE(p_notes, 'Inter-branch transfer received (New SKU)'), p_actor_id, p_actor_name, v_now,
                p_quantity
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'item_id', v_item.id,
        'quantity_after', v_new_qty,
        'transaction_id', v_tx_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
