/**
 * Wave 2: Advanced Prosthetics, Lab Operations & Inventory Management
 * Types definition — Egypt Dental SaaS
 */

export type ProstheticModificationResponseStatus = 'pending' | 'accepted' | 'rejected' | 'completed';

export interface ProstheticModificationRequest {
  id: string;
  lab_order_id: string;
  organization_id: string;
  branch_id?: string;
  reason: string;
  requested_change: string;
  requester_id: string;
  requester_name: string;
  requester_role: string;
  response_status: ProstheticModificationResponseStatus;
  response_notes?: string;
  responded_by_id?: string;
  responded_by_name?: string;
  responded_at?: string;
  created_at: string;
  updated_at: string;
}

export type ProstheticTrialResult = 'acceptable' | 'modification_required' | 'approved_for_final' | 'fitted';

export interface ProstheticFittingRecord {
  id: string;
  organization_id: string;
  branch_id: string;
  lab_order_id: string;
  treatment_service_id?: string;
  patient_id: string;
  patient_name?: string;
  doctor_id: string;
  doctor_name?: string;
  trial_scheduled_at?: string;
  trial_result: ProstheticTrialResult;
  modification_notes?: string;
  approved_for_final: boolean;
  final_delivered_at?: string;
  fitted_at?: string;
  fitted_by_doctor_id?: string;
  created_at: string;
  updated_at: string;
}

export type InventoryCategory =
  | 'dental_materials'
  | 'implant_components'
  | 'prosthetic_supplies'
  | 'office_medical'
  | 'other';

export type InventoryUnit = 'piece' | 'box' | 'pack' | 'ml' | 'g' | 'set' | 'kit' | 'carpule';

export interface InventoryItem {
  id: string;
  organization_id: string;
  branch_id: string;
  item_name_ar: string;
  item_name_en: string;
  category: InventoryCategory;
  sku: string;
  unit: InventoryUnit;
  supplier_id?: string;
  supplier_name?: string;
  opening_quantity: number;
  current_quantity: number;
  minimum_reorder_level: number;
  unit_cost: number; // in EGP
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type InventoryTransactionType =
  | 'receive'
  | 'transfer'
  | 'consumption'
  | 'adjustment'
  | 'return'
  | 'wastage';

export interface InventoryTransaction {
  id: string;
  organization_id: string;
  branch_id: string;
  inventory_item_id: string;
  item_name_ar?: string;
  item_name_en?: string;
  type: InventoryTransactionType;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  from_branch_id?: string;
  from_branch_name?: string;
  to_branch_id?: string;
  to_branch_name?: string;
  reference_id?: string;
  notes?: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  quantity_after: number;
}

export interface InventorySummaryReport {
  total_items_count: number;
  total_valuation_egp: number;
  low_stock_count: number;
  category_breakdown: Record<InventoryCategory, { count: number; valuation: number }>;
  overdue_lab_orders_count: number;
  total_material_consumption_egp: number;
}
