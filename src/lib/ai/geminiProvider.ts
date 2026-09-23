/**
 * Phase 10.1: Dual-Key Gemini API Provider
 * Dental Clinic & Dental Center Management Platform — Egypt
 *
 * Implements server-side Gemini generation with primary (GEMINI_API_KEY)
 * and fallback (GEMINI_API_KEY2) rotation on quota/rate-limit (429 / RESOURCE_EXHAUSTED).
 *
 * Keys are strictly kept server-side and never exposed to the client.
 */

import { GoogleGenAI } from '@google/genai';
import { AIResponse, AIKeyUsed, AILanguage } from './types';
import { detectLanguage } from './clinicKnowledgeBase';

/**
 * Standard System Instruction for Medical Safety & Egyptian Clinic Context
 */
export const GEMINI_SYSTEM_INSTRUCTION = `You are an AI Assistant for a Dental Clinic & Dental Center in Egypt.
Provide general informational dental guidance ONLY.
Do NOT provide diagnosis, medical prescriptions, or specific drug dosages.
If the patient mentions severe pain, bleeding, swelling, or urgent dental symptoms, advise them to book an appointment immediately or visit the emergency department.
Respond in clear Egyptian Arabic when addressed in Arabic, and in English when addressed in English.
Keep responses concise, professional, polite, and helpful.`;

/**
 * Helper to determine if an error is caused by quota / rate limiting (429 or RESOURCE_EXHAUSTED).
 */
export function isQuotaOrRateLimitError(error: any): boolean {
  if (!error) return false;

  const status = error.status || error.statusCode || error.code;
  if (status === 429 || status === 'RESOURCE_EXHAUSTED') {
    return true;
  }

  const message = (error.message || String(error)).toLowerCase();
  return (
    message.includes('429') ||
    message.includes('resource_exhausted') ||
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('exceeded your current quota')
  );
}

/**
 * Executes a Gemini API call using the specified API key.
 */
async function callGeminiSDK(
  prompt: string,
  apiKey: string,
  model = 'gemini-3.8-flash',
  systemInstruction = GEMINI_SYSTEM_INSTRUCTION
): Promise<string> {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction,
      temperature: 0.3,
      maxOutputTokens: 1024,
    },
  });

  return response.text || '';
}

export interface GeminiProviderOptions {
  model?: string;
  systemInstruction?: string;
  timeoutMs?: number;
  mockRunner?: (prompt: string, apiKey: string) => Promise<string>; // Hook for unit tests
}

/**
 * Dual-Key Gemini Call Router with Quota Fallback Logic
 */
export async function generateGeminiResponse(
  prompt: string,
  options?: GeminiProviderOptions
): Promise<{ text: string; keyUsed: AIKeyUsed; error?: string }> {
  const primaryKey = process.env.GEMINI_API_KEY || '';
  const fallbackKey = process.env.GEMINI_API_KEY2 || '';
  const runner = options?.mockRunner || callGeminiSDK;

  // If no primary key is set, fail gracefully with non-exposing message
  if (!primaryKey) {
    return {
      text: '',
      keyUsed: 'none',
      error: 'AI service unavailable (Primary key not configured)',
    };
  }

  // Step 1: Attempt Primary API Key
  try {
    const text = await runner(prompt, primaryKey);
    return {
      text,
      keyUsed: 'primary',
    };
  } catch (primaryErr: any) {
    // Check if error is quota / rate limit (429 / RESOURCE_EXHAUSTED)
    const isQuota = isQuotaOrRateLimitError(primaryErr);

    if (isQuota && fallbackKey) {
      // Step 2: Fallback to Secondary API Key
      try {
        const text = await runner(prompt, fallbackKey);
        return {
          text,
          keyUsed: 'fallback',
        };
      } catch (fallbackErr: any) {
        // Both primary and secondary keys quota exhausted
        const isFallbackQuota = isQuotaOrRateLimitError(fallbackErr);
        return {
          text: '',
          keyUsed: 'none',
          error: isFallbackQuota
            ? 'AI service quota exhausted on both primary and fallback keys. Please try again later.'
            : `Fallback key error: ${fallbackErr.message || 'Unknown error'}`,
        };
      }
    }

    // Normal error on primary key (e.g. 400 bad request, timeout, etc.) -> DO NOT switch keys!
    return {
      text: '',
      keyUsed: 'none',
      error: isQuota
        ? 'Primary AI quota exhausted and no fallback key configured.'
        : `AI provider error: ${primaryErr.message || 'Unknown error'}`,
    };
  }
}
