/**
 * Phase 10.1: AI Router & Gemini Provider Test Suite
 * Dental Clinic & Dental Center Management Platform — Egypt
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { routeAIQuery } from '../src/lib/ai/aiRouter';
import { generateGeminiResponse, isQuotaOrRateLimitError } from '../src/lib/ai/geminiProvider';
import { queryClinicDatabase, detectLanguage } from '../src/lib/ai/clinicKnowledgeBase';
import { DEFAULT_EGYPT_ORG, SECONDARY_EGYPT_ORG } from '../src/lib/storage';
import { setStoredAppointments } from '../src/lib/receptionAndBillingStorage';

describe('Phase 10.1 — AI Router & Gemini Provider Foundation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Test 1: Database answer without Gemini
  it('1. Returns database answer directly without calling Gemini when answer exists', async () => {
    let geminiCalled = false;
    const mockGemini = async () => {
      geminiCalled = true;
      return 'Gemini response';
    };

    const result = await routeAIQuery({
      prompt: 'ما هي مواعيد العمل في العيادة؟',
      mockGeminiCall: mockGemini,
    });

    expect(result.source).toBe('database');
    expect(result.keyUsed).toBe('none');
    expect(result.text).toContain('من السبت إلى الخميس');
    expect(geminiCalled).toBe(false); // Gemini was NOT called!
  });

  // Test 2: Gemini fallback when no local answer exists
  it('2. Falls back to Gemini when query is not in clinic DB/FAQ', async () => {
    process.env.GEMINI_API_KEY = 'test_primary_key';

    let geminiCalled = false;
    const mockGemini = async (prompt: string, apiKey: string) => {
      geminiCalled = true;
      expect(apiKey).toBe('test_primary_key');
      return 'تأثير الشاي والقهوة على بياض الأسنان يرجع إلى التصبغات.';
    };

    const result = await routeAIQuery({
      prompt: 'هل الشاي والقهوة يؤثران على بياض الأسنان بعد التبييض؟',
      mockGeminiCall: mockGemini,
    });

    expect(result.source).toBe('gemini_primary');
    expect(result.keyUsed).toBe('primary');
    expect(result.text).toContain('التصبغات');
    expect(geminiCalled).toBe(true);
  });

  // Test 3: Primary Gemini key success
  it('3. Successfully generates response using primary GEMINI_API_KEY', async () => {
    process.env.GEMINI_API_KEY = 'primary_key_123';
    process.env.GEMINI_API_KEY2 = 'fallback_key_456';

    const response = await generateGeminiResponse('How to floss properly?', {
      mockRunner: async (prompt, key) => {
        expect(key).toBe('primary_key_123');
        return 'Use 18 inches of floss and gently guide between teeth.';
      },
    });

    expect(response.keyUsed).toBe('primary');
    expect(response.text).toContain('18 inches');
  });

  // Test 4: Primary 429 -> GEMINI_API_KEY2 fallback
  it('4. Switches to GEMINI_API_KEY2 when primary key returns HTTP 429 quota error', async () => {
    process.env.GEMINI_API_KEY = 'primary_quota_exceeded';
    process.env.GEMINI_API_KEY2 = 'fallback_working_key';

    const response = await generateGeminiResponse('Explain dental implants', {
      mockRunner: async (prompt, key) => {
        if (key === 'primary_quota_exceeded') {
          const err: any = new Error('429 Resource exhausted: quota exceeded');
          err.status = 429;
          throw err;
        }
        if (key === 'fallback_working_key') {
          return 'Dental implants are titanium posts placed into the jawbone.';
        }
        throw new Error('Unexpected key');
      },
    });

    expect(response.keyUsed).toBe('fallback');
    expect(response.text).toContain('titanium posts');
  });

  // Test 5: Primary normal error -> no key switch
  it('5. Does NOT switch to fallback key for non-quota normal errors (e.g. 400 Bad Request)', async () => {
    process.env.GEMINI_API_KEY = 'primary_key';
    process.env.GEMINI_API_KEY2 = 'fallback_key';

    let fallbackCalled = false;

    const response = await generateGeminiResponse('Invalid request', {
      mockRunner: async (prompt, key) => {
        if (key === 'primary_key') {
          const err: any = new Error('400 Invalid argument passed');
          err.status = 400;
          throw err;
        }
        if (key === 'fallback_key') {
          fallbackCalled = true;
          return 'Should not reach fallback';
        }
        throw new Error('Unexpected key');
      },
    });

    expect(response.keyUsed).toBe('none');
    expect(fallbackCalled).toBe(false); // Did NOT switch keys!
    expect(response.error).toContain('400 Invalid argument');
  });

  // Test 6: Both keys quota exhausted
  it('6. Handles graceful failure when both primary and fallback keys are quota exhausted', async () => {
    process.env.GEMINI_API_KEY = 'primary_key';
    process.env.GEMINI_API_KEY2 = 'fallback_key';

    const response = await generateGeminiResponse('Medical query', {
      mockRunner: async (prompt, key) => {
        const err: any = new Error('RESOURCE_EXHAUSTED: rate limit exceeded');
        err.status = 429;
        throw err;
      },
    });

    expect(response.keyUsed).toBe('none');
    expect(response.error).toContain('quota exhausted on both');
  });

  // Test 7: API keys never exposed to client
  it('7. Ensures API key strings are never exposed in the response object or text', async () => {
    const SECRET_KEY_1 = 'AIzaSy_SECRET_PRIMARY_KEY_XYZ';
    const SECRET_KEY_2 = 'AIzaSy_SECRET_FALLBACK_KEY_ABC';
    process.env.GEMINI_API_KEY = SECRET_KEY_1;
    process.env.GEMINI_API_KEY2 = SECRET_KEY_2;

    const result = await routeAIQuery({
      prompt: 'ما هي أسعار تركيبات الأسنان؟',
      mockGeminiCall: async () => 'تختلف تكلفة التركيبات بحسب الخامة المستخدمة.',
    });

    const jsonString = JSON.stringify(result);
    expect(jsonString).not.toContain(SECRET_KEY_1);
    expect(jsonString).not.toContain(SECRET_KEY_2);
  });

  // Test 8: Organization isolation
  it('8. Enforces organization isolation so secondary org cannot read primary org data', async () => {
    // Seed appointment for patient in primary org
    const primaryPatientId = 'pat-primary-1';
    setStoredAppointments([
      {
        id: 'appt-primary-1',
        organization_id: DEFAULT_EGYPT_ORG.id,
        branch_id: '11111111-1111-1111-1111-111111111111',
        patient_id: primaryPatientId,
        doctor_id: 'doc-1',
        appointment_date: '2026-10-15',
        start_time: '10:00',
        end_time: '10:30',
        duration_minutes: 30,
        booking_type: 'scheduled',
        status: 'confirmed',
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      },
    ]);

    // Query with secondary org context for same patient ID
    const matchSecondary = queryClinicDatabase('متى موعدي القادم؟', {
      organizationId: SECONDARY_EGYPT_ORG.id,
      patientId: primaryPatientId,
      isAuthenticated: true,
    });

    expect(matchSecondary.found).toBe(true);
    expect(matchSecondary.text).toContain('لا توجد لديك مواعيد قادمة'); // Does NOT leak primary org appointment!

    // Query with primary org context
    const matchPrimary = queryClinicDatabase('متى موعدي القادم؟', {
      organizationId: DEFAULT_EGYPT_ORG.id,
      patientId: primaryPatientId,
      isAuthenticated: true,
    });

    expect(matchPrimary.found).toBe(true);
    expect(matchPrimary.text).toContain('2026-10-15');
  });

  // Test 9: Patient context authorization
  it('9. Denies unauthenticated query access to private patient appointment details', async () => {
    setStoredAppointments([
      {
        id: 'appt-private-1',
        organization_id: DEFAULT_EGYPT_ORG.id,
        branch_id: '11111111-1111-1111-1111-111111111111',
        patient_id: 'pat-private-1',
        doctor_id: 'doc-1',
        appointment_date: '2026-11-20',
        start_time: '14:00',
        end_time: '14:30',
        duration_minutes: 30,
        booking_type: 'scheduled',
        status: 'confirmed',
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      },
    ]);

    // Unauthenticated context (isAuthenticated: false)
    const matchUnauth = queryClinicDatabase('متى موعدي القادم؟', {
      organizationId: DEFAULT_EGYPT_ORG.id,
      patientId: 'pat-private-1',
      isAuthenticated: false,
    });

    expect(matchUnauth.found).toBe(true);
    expect(matchUnauth.text).toContain('تسجيل الدخول'); // Demands login, denies private details!
  });

  // Test 10: Arabic and English response handling & language detection
  it('10. Detects language and formats responses appropriately in Arabic and English', async () => {
    expect(detectLanguage('مرحباً كيف يمكنني حجز موعد؟')).toBe('ar');
    expect(detectLanguage('What are your opening hours?')).toBe('en');

    const arResult = await routeAIQuery({
      prompt: 'ما هي شركات التأمين المقبولة لدكم؟',
    });
    expect(arResult.language).toBe('ar');
    expect(arResult.text).toContain('بوبا');

    const enResult = await routeAIQuery({
      prompt: 'What insurance companies do you accept?',
    });
    expect(enResult.language).toBe('en');
    expect(enResult.text).toContain('Bupa Egypt');
  });

  // Test 11: Quota helper unit test
  it('11. Accurately identifies quota vs non-quota errors using isQuotaOrRateLimitError', () => {
    expect(isQuotaOrRateLimitError({ status: 429 })).toBe(true);
    expect(isQuotaOrRateLimitError({ code: 'RESOURCE_EXHAUSTED' })).toBe(true);
    expect(isQuotaOrRateLimitError(new Error('Quota exceeded for project'))).toBe(true);
    expect(isQuotaOrRateLimitError(new Error('rate limit exceeded'))).toBe(true);
    expect(isQuotaOrRateLimitError({ status: 400, message: 'Bad Request' })).toBe(false);
    expect(isQuotaOrRateLimitError({ status: 500, message: 'Internal Server Error' })).toBe(false);
  });
});
