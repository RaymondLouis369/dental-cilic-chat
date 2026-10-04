/**
 * Phase 10.1: AI Router & Gemini Provider Foundation Types
 * Dental Clinic & Dental Center Management Platform — Egypt
 */

export interface AIUserContext {
  organizationId: string;
  branchId?: string;
  patientId?: string;
  doctorId?: string;
  role?: string;
  isAuthenticated?: boolean;
  authorizationHeader?: string;
}

export type AISource = 'database' | 'gemini_primary' | 'gemini_fallback' | 'fallback_system';
export type AISourceCategory =
  | 'Clinic Database'
  | 'Patient Record'
  | 'Appointment Data'
  | 'Financial Data'
  | 'Insurance Data'
  | 'Lab/Inventory Data'
  | 'AI-generated advisory';

export type AIKeyUsed = 'primary' | 'fallback' | 'none';
export type AILanguage = 'ar' | 'en';

export interface AIRecommendedAction {
  id: string;
  type:
    | 'reschedule_appointment'
    | 'send_patient_message'
    | 'update_inventory'
    | 'update_treatment_plan'
    | 'resolve_escalation'
    | 'update_complaint';
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  requiresConfirmation: true;
  payload: Record<string, any>;
  executed?: boolean;
  executedAt?: string;
  executedBy?: string;
}

export interface AIRiskSignal {
  type:
    | 'no_show_risk'
    | 'recall_backlog_risk'
    | 'inventory_reorder_risk'
    | 'overdue_lab_risk'
    | 'insurance_outstanding_risk'
    | 'communication_failure_risk';
  title_ar: string;
  title_en: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  description_ar: string;
  description_en: string;
  evidence: string[];
  recommendedAction?: AIRecommendedAction;
}

export interface AIQueryOptions {
  prompt: string;
  context?: AIUserContext;
  timeoutMs?: number;
  skipDatabaseCheck?: boolean; // For testing Gemini directly
  mockGeminiCall?: (prompt: string, apiKey: string) => Promise<string>; // For unit testing key switching
}

export interface AIResponse {
  text: string;
  source: AISource;
  sourceCategories?: AISourceCategory[];
  keyUsed: AIKeyUsed;
  isMedicalEscalation: boolean;
  language: AILanguage;
  category?: string;
  error?: string;
  riskSignals?: AIRiskSignal[];
  recommendedActions?: AIRecommendedAction[];
  metadata?: Record<string, any>;
}

export interface KnowledgeMatch {
  found: boolean;
  text?: string;
  category?: string;
  language?: AILanguage;
  sourceCategories?: AISourceCategory[];
  metadata?: Record<string, any>;
}
