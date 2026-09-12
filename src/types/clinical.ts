/**
 * Phase 4: Doctor Clinical Workspace, Dental Chart, Treatment Plans,
 * Visits, Prescriptions, Consents, Investigations, Referrals & Follow-ups
 * TypeScript Domain Types — Egypt Dental SaaS
 */

export type ChartType = 'adult' | 'pediatric';

export type ToothCondition =
  | 'sound'
  | 'missing'
  | 'caries'
  | 'filling'
  | 'crown'
  | 'root_canal'
  | 'implant'
  | 'extraction'
  | 'fracture'
  | 'planned_treatment'
  | 'impacted'
  | 'bridge_abutment'
  | 'pontic';

export type ToothSurface =
  | 'mesial'
  | 'distal'
  | 'occlusal'
  | 'incisal'
  | 'buccal'
  | 'lingual'
  | 'palatal'
  | 'cervical';

export interface DentalChart {
  id: string;
  organization_id: string;
  patient_id: string;
  chart_type: ChartType;
  notes?: string;
  created_by_doctor_id: string;
  created_at: string;
  updated_at: string;
}

export interface DentalChartEntry {
  id: string;
  chart_id: string;
  organization_id: string;
  patient_id: string;
  tooth_number: string; // FDI (e.g. '11', '16', '51') or Universal
  condition: ToothCondition;
  surfaces?: ToothSurface[];
  notes?: string;
  recorded_by_doctor_id: string;
  visit_id?: string;
  created_at: string;
}

export type TreatmentPlanStatus =
  | 'planned'
  | 'approved'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'follow_up'
  | 'cancelled';

export interface TreatmentPlan {
  id: string;
  organization_id: string;
  patient_id: string;
  doctor_id: string;
  title: string;
  diagnosis?: string;
  status: TreatmentPlanStatus;
  next_step?: string;
  follow_up_notes?: string;
  total_estimated_duration_minutes?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export type TreatmentServiceStatus =
  | 'planned'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface TreatmentPlanService {
  id: string;
  organization_id: string;
  treatment_plan_id: string;
  patient_id: string;
  service_id: string;
  service_code?: string;
  service_name_ar?: string;
  service_name_en?: string;
  tooth_number?: string;
  area?: string;
  sequence_order: number;
  doctor_id: string;
  branch_id: string;
  status: TreatmentServiceStatus;
  clinical_notes?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export type SpecialtyType =
  | 'general'
  | 'endodontics'
  | 'periodontics'
  | 'implantology'
  | 'orthodontics'
  | 'pediatric'
  | 'oral_surgery';

export interface ClinicalVisit {
  id: string;
  organization_id: string;
  branch_id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  visit_date: string;
  chief_complaint: string;
  history_of_present_illness?: string;
  medical_history_review?: string;
  examination_findings?: string;
  assessment_diagnosis: string;
  treatment_performed: string;
  materials_used?: string;
  anesthesia_details?: string;
  next_visit_plan?: string;
  doctor_notes?: string;
  specialty: SpecialtyType;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ClinicalNoteTemplate {
  id: string;
  specialty: SpecialtyType;
  title_ar: string;
  title_en: string;
  chief_complaint_default?: string;
  examination_default?: string;
  assessment_default?: string;
  treatment_default?: string;
  plan_default?: string;
}

export type AlertType =
  | 'allergy'
  | 'chronic_condition'
  | 'medication_warning'
  | 'clinical_precaution'
  | 'bleeding_risk'
  | 'pregnancy_lactation';

export type AlertSeverity = 'low' | 'moderate' | 'high' | 'critical';

export interface MedicalAlert {
  id: string;
  organization_id: string;
  patient_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  active: boolean;
  recorded_by_doctor_id: string;
  created_at: string;
  updated_at: string;
}

export type InvestigationType =
  | 'periapical_xray'
  | 'panoramic_opg'
  | 'cbct_3d'
  | 'bitewing'
  | 'blood_investigation'
  | 'biopsy_pathology'
  | 'study_model'
  | 'other';

export type InvestigationUrgency = 'routine' | 'urgent' | 'stat';

export type InvestigationStatus =
  | 'requested'
  | 'pending'
  | 'result_uploaded'
  | 'reviewed';

export interface InvestigationRequest {
  id: string;
  organization_id: string;
  patient_id: string;
  doctor_id: string;
  branch_id: string;
  visit_id?: string;
  type: InvestigationType;
  requested_test: string;
  clinical_reason: string;
  urgency: InvestigationUrgency;
  notes?: string;
  status: InvestigationStatus;
  result_summary?: string;
  result_file_url?: string;
  reviewed_at?: string;
  reviewed_by_doctor_id?: string;
  created_at: string;
  updated_at: string;
}

export type ReferralType = 'internal' | 'external';

export type ReferralStatus =
  | 'draft'
  | 'sent'
  | 'pending'
  | 'response_received'
  | 'reviewed'
  | 'closed';

export type ReferralPriority = 'routine' | 'urgent' | 'emergency';

export interface Referral {
  id: string;
  organization_id: string;
  patient_id: string;
  referring_doctor_id: string;
  referral_type: ReferralType;
  specialty: SpecialtyType | string;
  target_doctor_id?: string;
  target_facility_name?: string;
  reason: string;
  clinical_summary: string;
  priority: ReferralPriority;
  status: ReferralStatus;
  response_notes?: string;
  response_doctor_id?: string;
  created_at: string;
  updated_at: string;
}

export type InstructionTemplateCategory =
  | 'post_surgery'
  | 'post_extraction'
  | 'implant_care'
  | 'teeth_cleaning'
  | 'crown_bridge'
  | 'orthodontics'
  | 'general_hygiene'
  | 'custom';

export interface DoctorRecommendation {
  id: string;
  organization_id: string;
  patient_id: string;
  doctor_id: string;
  category: InstructionTemplateCategory;
  title: string;
  instructions_ar: string;
  instructions_en: string;
  reception_task_created: boolean;
  reception_task_id?: string;
  created_at: string;
}

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Prescription {
  id: string;
  organization_id: string;
  patient_id: string;
  doctor_id: string;
  branch_id: string;
  visit_id?: string;
  diagnosis?: string;
  items: PrescriptionItem[];
  notes?: string;
  created_at: string;
}

export interface PrescriptionTemplate {
  id: string;
  title_ar: string;
  title_en: string;
  category: string;
  items: Omit<PrescriptionItem, 'id' | 'prescription_id'>[];
}

export type ConsentType =
  | 'treatment_plan_agreement'
  | 'extraction_consent'
  | 'implant_surgery_consent'
  | 'bone_graft_consent'
  | 'root_canal_consent'
  | 'sedation_consent'
  | 'orthodontic_consent'
  | 'other';

export type ConsentStatus =
  | 'requested'
  | 'pending_signature'
  | 'signed'
  | 'declined';

export interface ConsentRequest {
  id: string;
  organization_id: string;
  patient_id: string;
  doctor_id: string;
  consent_type: ConsentType;
  title: string;
  description_ar: string;
  description_en: string;
  status: ConsentStatus;
  signed_by_name?: string;
  signed_at?: string;
  signature_reference?: string;
  reception_task_id?: string;
  created_at: string;
  updated_at: string;
}

export type FollowUpInterval =
  | '2_days'
  | '7_days'
  | '14_days'
  | '1_month'
  | '3_months'
  | '6_months'
  | 'custom';

export interface FollowUpPlan {
  id: string;
  organization_id: string;
  patient_id: string;
  doctor_id: string;
  branch_id: string;
  visit_id?: string;
  due_date: string;
  interval: FollowUpInterval;
  reason: string;
  notes?: string;
  status: 'pending' | 'contacted' | 'scheduled' | 'completed' | 'cancelled';
  reception_task_id?: string;
  created_at: string;
  updated_at: string;
}

export type DoctorTaskType =
  | 'send_instructions'
  | 'obtain_consent'
  | 'book_specialist'
  | 'collect_required_document'
  | 'contact_patient'
  | 'schedule_follow_up';

export type DoctorTaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface DoctorTask {
  id: string;
  organization_id: string;
  branch_id: string;
  patient_id: string;
  doctor_id: string;
  task_type: DoctorTaskType;
  title: string;
  details?: string;
  status: DoctorTaskStatus;
  priority: 'normal' | 'urgent';
  assigned_to_role?: string;
  completed_by_staff_id?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DoctorConsultation {
  id: string;
  organization_id: string;
  patient_id: string;
  requesting_doctor_id: string;
  specialist_doctor_id: string;
  specialty: string;
  subject: string;
  reason: string;
  clinical_notes: string;
  priority: 'routine' | 'urgent';
  status: 'pending' | 'responded' | 'closed';
  response_notes?: string;
  responded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ClinicalTimelineEvent {
  id: string;
  event_type:
    | 'visit'
    | 'treatment'
    | 'chart_update'
    | 'investigation'
    | 'referral'
    | 'recommendation'
    | 'prescription'
    | 'consent'
    | 'follow_up';
  timestamp: string;
  title_ar: string;
  title_en: string;
  summary: string;
  doctor_name: string;
  metadata?: Record<string, any>;
}

export interface VisitCompletionChecklist {
  clinical_note_completed: boolean;
  treatment_status_updated: boolean;
  required_consent_requested: boolean;
  investigation_requested_if_needed: boolean;
  referral_created_if_needed: boolean;
  instructions_created_if_needed: boolean;
  prescription_completed_if_needed: boolean;
  follow_up_configured_if_needed: boolean;
}
