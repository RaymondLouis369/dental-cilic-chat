/**
 * Phase 3: Reception Dashboard, Doctor Schedules, Booking,
 * Service Catalog, Pricing, Insurance & Card Templates
 */

export interface ServiceCategory {
  id: string;
  organization_id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description?: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DentalService {
  id: string;
  organization_id: string;
  category_id?: string;
  code: string;
  name_ar: string;
  name_en: string;
  description?: string;
  category: string;
  default_duration_minutes: number;
  duration_minutes?: number;
  requires_approval: boolean;
  requires_doctor: boolean;
  default_supplier_id?: string;
  default_supplier_name?: string;
  active: boolean;
  is_active?: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type Service = DentalService;

export interface DoctorShift {
  id: string;
  organization_id: string;
  branch_id: string;
  doctor_id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  start_time: string; // e.g. "09:00"
  end_time: string; // e.g. "17:00"
  break_start?: string; // e.g. "13:00"
  break_end?: string; // e.g. "14:00"
  break_start_time?: string;
  break_end_time?: string;
  slot_duration_minutes: number; // e.g. 30
  active: boolean;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export type AppointmentStatus =
  | 'confirmed'
  | 'arrived'
  | 'waiting'
  | 'with_doctor'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled'
  | 'late';

export type BookingType = 'scheduled' | 'walk_in';

export interface Appointment {
  id: string;
  organization_id: string;
  branch_id: string;
  patient_id: string;
  doctor_id: string;
  service_id?: string;
  appointment_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  duration_minutes: number;
  status: AppointmentStatus;
  booking_type: BookingType;
  notes?: string;
  cancellation_reason?: string;
  check_in_time?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type WaitingPriority = 'normal' | 'urgent' | 'vip';
export type WaitingStatus = 'waiting' | 'called' | 'with_doctor' | 'completed' | 'cancelled' | 'left';

export interface WaitingListEntry {
  id: string;
  organization_id: string;
  branch_id: string;
  patient_id: string;
  preferred_doctor_id?: string;
  requested_service_id?: string;
  appointment_id?: string;
  priority: WaitingPriority;
  status: WaitingStatus;
  ticket_number: string;
  check_in_time: string;
  estimated_wait_minutes: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type PriceListType = 'cash' | 'insurance' | 'custom';
export type PriceListVersionStatus = 'draft' | 'validated' | 'preview' | 'published' | 'archived';

export interface PriceList {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  type: PriceListType;
  is_default: boolean;
  currency: string; // 'EGP'
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PriceListVersion {
  id: string;
  price_list_id: string;
  organization_id: string;
  version_number: number;
  status: PriceListVersionStatus;
  published_at?: string;
  effective_from?: string;
  effective_to?: string;
  created_by?: string;
  notes?: string;
  created_at: string;
}

export interface PriceListItem {
  id: string;
  price_list_version_id: string;
  organization_id: string;
  service_id: string;
  service_code: string;
  cash_price: number;
  active: boolean;
  created_at: string;
}

export interface InsuranceCompany {
  id: string;
  organization_id: string;
  name_ar: string;
  name_en: string;
  code: string;
  phone?: string;
  contact_phone?: string;
  email?: string;
  contact_email?: string;
  contact_person?: string;
  allows_non_contracted_discount: boolean;
  non_contracted_discount_percentage?: number; // e.g. 15 (%)
  non_contracted_discount_percent?: number;
  is_contracted?: boolean;
  active: boolean;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface InsurancePlan {
  id: string;
  organization_id: string;
  company_id: string;
  name_ar: string;
  name_en: string;
  code: string;
  coverage_percentage_default: number; // e.g. 80 (%)
  patient_copay_percentage_default: number; // e.g. 20 (%)
  default_coverage_percent?: number;
  default_copay_percent?: number;
  max_annual_limit?: number; // in EGP
  annual_max_limit?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InsurancePriceList {
  id: string;
  organization_id: string;
  company_id: string;
  plan_id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InsurancePriceListItem {
  id: string;
  insurance_price_list_id: string;
  organization_id: string;
  service_id: string;
  service_code: string;
  insurance_price: number;
  coverage_percentage: number;
  patient_copay_percentage: number;
  requires_approval: boolean;
  active: boolean;
  created_at: string;
}

export interface InsuranceCardTemplate {
  id: string;
  organization_id: string;
  company_id: string;
  template_name: string;
  sample_card_image_url?: string;
  description?: string;
  fields_config?: any;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InsuranceCardField {
  id: string;
  template_id: string;
  organization_id: string;
  field_key: string; // e.g. 'patient_name', 'member_id', 'card_number', 'policy_number', 'employee_number', 'expiry_date'
  field_label_ar: string;
  field_label_en: string;
  required: boolean;
  ocr_bounding_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  field_type: 'text' | 'number' | 'date';
  display_order: number;
  created_at: string;
}

export type CustomServiceStatus = 'pending_review' | 'approved' | 'assigned_standard' | 'rejected';

export interface CustomPatientService {
  id: string;
  organization_id: string;
  branch_id: string;
  patient_id: string;
  appointment_id?: string;
  service_name: string;
  patient_price: number;
  reason: string;
  created_by?: string;
  status: CustomServiceStatus;
  assigned_standard_service_id?: string;
  supplier_vendor_cost?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ExcelRowValidation {
  row_number: number;
  service_code: string;
  service_name_ar: string;
  service_name_en: string;
  category: string;
  cash_price: number;
  active: boolean;
  is_valid: boolean;
  errors: string[];
}

export interface ExcelImportResult {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  rows: ExcelRowValidation[];
}

export interface PricingResolutionResult {
  price_type: 'cash' | 'contracted_insurance' | 'non_contracted_discount' | 'not_contracted';
  total_price: number;
  patient_copay: number;
  insurance_coverage: number;
  coverage_percentage: number;
  copay_percentage: number;
  requires_approval: boolean;
  message_ar?: string;
  message_en?: string;
}

export type InvoiceStatus = 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';
export type InvoicePatientType = 'cash' | 'insured';
export type PaymentMethod = 'cash' | 'bank' | 'card' | 'wallet';

export interface InvoicePaymentRecord {
  id: string;
  invoice_id: string;
  organization_id: string;
  branch_id?: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  received_by?: string;
  received_by_name?: string;
  notes?: string;
  created_at: string;
}

export type CommissionBaseType = 'gross' | 'net_after_costs';

export interface DoctorCommissionRule {
  id: string;
  organization_id: string;
  branch_id?: string;
  doctor_id: string; // Doctor ID or 'all'
  doctor_name?: string;
  service_id?: string; // Service ID or 'all'
  service_name_ar?: string;
  service_name_en?: string;
  commission_percentage: number;
  commission_base: CommissionBaseType;
  active: boolean;
  created_by?: string;
  created_by_name?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export type CostType = 'lab' | 'material';

export interface LabMaterialCostRecord {
  id: string;
  organization_id: string;
  branch_id?: string;
  type: CostType;
  supplier_vendor: string;
  item_name_ar: string;
  item_name_en: string;
  quantity: number;
  unit_cost: number;
  actual_cost: number;
  source_reference?: string;
  invoice_id?: string;
  invoice_item_id?: string;
  service_id?: string;
  treatment_plan_id?: string;
  notes?: string;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialBreakdown {
  gross_service_amount: number;
  insurance_amount: number;
  patient_amount: number;
  lab_cost: number;
  material_cost: number;
  commission_base: CommissionBaseType;
  commission_base_amount: number;
  commission_percentage: number;
  doctor_commission: number;
  clinic_net_amount: number;
}

// Phase 7.4 Implant Cost Allocation Types
export type ImplantComponentType =
  | 'implant'
  | 'bone_graft'
  | 'membrane'
  | 'healing_abutment'
  | 'cover_screw'
  | 'healing_cap'
  | 'abutment'
  | 'scan_body'
  | 'prosthetic_screw'
  | 'other_accessories';

export interface ImplantComponentItem {
  id: string;
  implant_case_id?: string;
  component_type: ImplantComponentType;
  supplier_vendor: string;
  item_name: string;
  item_name_ar?: string;
  item_name_en?: string;
  planned_quantity: number;
  actual_quantity: number;
  unit_cost: number;
  actual_cost?: number;
  date?: string;
  reference?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ImplantCaseRecord {
  id: string;
  organization_id: string;
  branch_id?: string;
  patient_id: string;
  doctor_id?: string;
  treatment_plan_id?: string;
  treatment_plan_service_id?: string;
  invoice_id?: string;
  invoice_item_id?: string;
  tooth_number?: string;
  implant_brand?: string;
  components: ImplantComponentItem[];
  lab_cost: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ImplantFinancialBreakdown extends FinancialBreakdown {
  implant_case_id?: string;
  total_implant_material_cost: number;
  components_cost_breakdown: {
    component_type: ImplantComponentType;
    item_name: string;
    consumed_quantity: number;
    consumed_cost: number;
  }[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  organization_id: string;
  service_id: string;
  service_code: string;
  service_name_ar: string;
  service_name_en: string;
  quantity: number;
  unit_price: number;
  gross_amount: number;
  insurance_percentage: number;
  insurance_amount: number;
  patient_copay_percentage: number;
  patient_copay_amount: number;
  discount_amount?: number;
  tax_amount?: number;
  final_payable_amount: number;
  approval_status?: 'approved' | 'pending' | 'rejected' | 'cash' | 'direct_coverage';
  created_at?: string;
  // Phase 7.3 Doctor Commission + Lab/Material Costs
  doctor_id?: string;
  doctor_name?: string;
  commission_percentage?: number;
  commission_base?: CommissionBaseType;
  calculated_commission?: number;
  lab_cost?: number;
  material_cost?: number;
  supplier_vendor?: string;
  clinic_net_amount?: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  organization_id: string;
  branch_id: string;
  patient_id: string;
  patient_name?: string;
  patient_code?: string;
  doctor_id?: string;
  doctor_name?: string;
  appointment_id?: string;
  treatment_plan_id?: string;
  patient_type: InvoicePatientType;
  insurance_company_id?: string;
  insurance_company_name?: string;
  insurance_plan_name?: string;
  policy_number?: string;
  subtotal_amount: number;
  insurance_total_amount: number;
  patient_total_amount: number;
  discount_total_amount: number;
  tax_total_amount: number;
  final_payable_amount: number;
  paid_amount: number;
  remaining_balance: number;
  status: InvoiceStatus;
  currency: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  paid_at?: string;
  created_by?: string;
  payments?: InvoicePaymentRecord[];
  items: InvoiceItem[];
  // Phase 7.3 Doctor Commission + Lab/Material Costs summary
  total_lab_cost?: number;
  total_material_cost?: number;
  total_doctor_commission?: number;
  clinic_net_amount?: number;
  commission_details?: {
    doctor_id?: string;
    doctor_name?: string;
    commission_percentage?: number;
    commission_base?: CommissionBaseType;
    calculated_commission?: number;
  }[];
}

// Phase 8.1: Supplier / Vendor Management Types
export type SupplierType =
  | 'dental_lab'
  | 'implant_supplier'
  | 'dental_materials'
  | 'medical_supplies'
  | 'other';

export interface Supplier {
  id: string;
  organization_id: string;
  name_ar: string;
  name_en: string;
  type: SupplierType;
  phone?: string;
  notes?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

