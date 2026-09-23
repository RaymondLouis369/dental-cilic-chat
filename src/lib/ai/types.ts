/**
 * Phase 10.1: AI Router & Gemini Provider Foundation Types
 * Dental Clinic & Dental Center Management Platform — Egypt
 */

export interface AIUserContext {
  organizationId: string;
  branchId?: string;
  patientId?: string;
  role?: string;
  isAuthenticated?: boolean;
}

export type AISource = 'database' | 'gemini_primary' | 'gemini_fallback' | 'fallback_system';
export type AIKeyUsed = 'primary' | 'fallback' | 'none';
export type AILanguage = 'ar' | 'en';

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
  keyUsed: AIKeyUsed;
  isMedicalEscalation: boolean;
  language: AILanguage;
  category?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface KnowledgeMatch {
  found: boolean;
  text?: string;
  category?: string;
  language?: AILanguage;
  metadata?: Record<string, any>;
}
