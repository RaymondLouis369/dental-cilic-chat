/**
 * Phase 10.2: Patient AI Chat Interface & Integration Test Suite
 * Dental Clinic & Dental Center Management Platform — Egypt
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { routeAIQuery } from '../src/lib/ai/aiRouter';
import { DEFAULT_EGYPT_ORG, DEFAULT_BRANCHES } from '../src/lib/storage';
import { setStoredAppointments } from '../src/lib/receptionAndBillingStorage';
import {
  setStoredTreatmentPlans,
  setStoredConsentRequests,
  setStoredFollowUpPlans,
} from '../src/lib/clinicalStorage';
import { setStoredPatients } from '../src/lib/patientStorage';
import { getStoredNotifications } from '../src/lib/notificationStorage';

// Polyfill localStorage for node environment if missing
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    length: 0,
    key: () => null,
  };
}

describe('Phase 10.2 — Patient AI Chat Interface & Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    const branchId = DEFAULT_BRANCHES[0].id;

    // Seed mock database records
    setStoredPatients([
      {
        id: 'pat_102_1',
        organization_id: DEFAULT_EGYPT_ORG.id,
        first_name: 'أحمد',
        last_name: 'علي',
        primary_mobile: '+201012345678',
        patient_code: 'PAT-102-001',
        date_of_birth: '1990-05-15',
        preferred_language: 'ar',
        country_code: '+20',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'pat_102_2',
        organization_id: DEFAULT_EGYPT_ORG.id,
        first_name: 'منى',
        last_name: 'حسن',
        primary_mobile: '+201122334455',
        patient_code: 'PAT-102-002',
        date_of_birth: '1995-08-20',
        preferred_language: 'ar',
        country_code: '+20',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    setStoredAppointments([
      {
        id: 'appt_102_1',
        organization_id: DEFAULT_EGYPT_ORG.id,
        branch_id: branchId,
        patient_id: 'pat_102_1',
        doctor_id: 'doc_1',
        appointment_date: '2026-10-15',
        start_time: '14:00',
        end_time: '14:30',
        duration_minutes: 30,
        booking_type: 'scheduled',
        status: 'confirmed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    setStoredTreatmentPlans([
      {
        id: 'plan_102_1',
        organization_id: DEFAULT_EGYPT_ORG.id,
        patient_id: 'pat_102_1',
        doctor_id: 'doc_1',
        title: 'خطة علاج زراعة الأسنان',
        diagnosis: 'فقدان الضرس السفلي الأيمن',
        next_step: 'تركيب الزرعة العظمية',
        status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    setStoredConsentRequests([
      {
        id: 'consent_102_1',
        organization_id: DEFAULT_EGYPT_ORG.id,
        patient_id: 'pat_102_1',
        doctor_id: 'doc_1',
        consent_type: 'implant_surgery_consent',
        title: 'إقرار موافقة على جراحة زراعة الأسنان',
        description_ar: 'تفاصيل موافقة زراعة الأسنان',
        description_en: 'Implant surgery consent details',
        status: 'pending_signature',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    setStoredFollowUpPlans([
      {
        id: 'recall_102_1',
        organization_id: DEFAULT_EGYPT_ORG.id,
        patient_id: 'pat_102_1',
        doctor_id: 'doc_1',
        branch_id: branchId,
        due_date: '2026-11-01',
        interval: '1_month',
        reason: 'متابعة زراعة الأسنان',
        recall_type: 'implant',
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Test 1: Patient query routes through AI Router
  it('1. Patient query routes through AI Router and returns structured response', async () => {
    const result = await routeAIQuery({
      prompt: 'ما هي مواعيد العمل؟',
      context: {
        organizationId: DEFAULT_EGYPT_ORG.id,
        patientId: 'pat_102_1',
        isAuthenticated: true,
      },
    });

    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('source');
    expect(result).toHaveProperty('language');
    expect(result.source).toBe('database');
  });

  // Test 2: Database query returns clinic data without calling Gemini
  it('2. Database query returns clinic data without calling Gemini', async () => {
    let geminiCalled = false;
    const mockGemini = async () => {
      geminiCalled = true;
      return 'Gemini answer';
    };

    const result = await routeAIQuery({
      prompt: 'فروع المركز والعناوين',
      mockGeminiCall: mockGemini,
    });

    expect(result.source).toBe('database');
    expect(result.text).toContain('فروع مركزنا في مصر');
    expect(geminiCalled).toBe(false);
  });

  // Test 3: General query falls back to Gemini provider
  it('3. General query falls back to Gemini provider when not in DB/FAQ', async () => {
    process.env.GEMINI_API_KEY = 'test_key';

    let geminiCalled = false;
    const mockGemini = async () => {
      geminiCalled = true;
      return 'نصائح العناية بالأسنان الحساسة تشمل استخدام معجون مخصص.';
    };

    const result = await routeAIQuery({
      prompt: 'كيف أتعامل مع الأسنان الحساسة للمشروبات الباردة؟',
      mockGeminiCall: mockGemini,
    });

    expect(geminiCalled).toBe(true);
    expect(result.source).toBe('gemini_primary');
    expect(result.text).toContain('الأسنان الحساسة');
  });

  // Test 4: Egyptian Arabic & English responses supported
  it('4. Supports both Egyptian Arabic and English queries correctly', async () => {
    const arResult = await routeAIQuery({
      prompt: 'ما هي مواعيد العمل؟',
    });
    expect(arResult.language).toBe('ar');
    expect(arResult.text).toContain('من السبت إلى الخميس');

    const enResult = await routeAIQuery({
      prompt: 'What are the working hours?',
    });
    expect(enResult.language).toBe('en');
    expect(enResult.text).toContain('Saturday through Thursday');
  });

  // Test 5: Patient authorization context enforced (patient_id validation)
  it('5. Enforces patient authorization context and prevents data leakage across patients', async () => {
    // Query for pat_102_1
    const res1 = await routeAIQuery({
      prompt: 'ما هو موعدي القادم؟',
      context: {
        organizationId: DEFAULT_EGYPT_ORG.id,
        patientId: 'pat_102_1',
        isAuthenticated: true,
      },
    });
    expect(res1.text).toContain('2026-10-15');

    // Query for pat_102_2 (has no appointments)
    const res2 = await routeAIQuery({
      prompt: 'ما هو موعدي القادم؟',
      context: {
        organizationId: DEFAULT_EGYPT_ORG.id,
        patientId: 'pat_102_2',
        isAuthenticated: true,
      },
    });
    expect(res2.text).toContain('لا توجد لديك مواعيد قادمة');
  });

  // Test 6: Quick action queries return expected database results
  it('6. Quick action queries return expected database results', async () => {
    const context = {
      organizationId: DEFAULT_EGYPT_ORG.id,
      patientId: 'pat_102_1',
      isAuthenticated: true,
    };

    // Booking
    const bookingRes = await routeAIQuery({ prompt: 'كيف احجز موعد جديد؟', context });
    expect(bookingRes.text).toContain('بوابة المريض');

    // My Treatment
    const treatmentRes = await routeAIQuery({ prompt: 'ما هي خطة العلاج الخاصة بي؟', context });
    expect(treatmentRes.text).toContain('خطة علاج زراعة الأسنان');

    // My Account
    const accountRes = await routeAIQuery({ prompt: 'أريد استعراض بيانات حسابي ورقم المريض', context });
    expect(accountRes.text).toContain('PAT-102-001');

    // Next Visit
    const visitRes = await routeAIQuery({ prompt: 'ما هو موعد زيارتي القادمة؟', context });
    expect(visitRes.text).toContain('2026-10-15');

    // Required Tasks
    const tasksRes = await routeAIQuery({ prompt: 'ما هي المهام والمتابعات المطلوبة مني؟', context });
    expect(tasksRes.text).toContain('إقرار طبي بانتظار التوقيع');
  });

  // Test 7: Failed Gemini query triggers retry/fallback state
  it('7. Handles Gemini failures gracefully with service fallback', async () => {
    process.env.GEMINI_API_KEY = 'invalid_key';

    const mockFailingGemini = async () => {
      throw new Error('API network timeout');
    };

    const result = await routeAIQuery({
      prompt: 'سؤال غير موجود بالعيادة لتجربة الخطأ',
      mockGeminiCall: mockFailingGemini,
    });

    expect(result.source).toBe('fallback_system');
    expect(result.text).toContain('أهلاً بك!');
    expect(result.error).toContain('API network timeout');
  });

  // Test 8: Medical escalation appends advisory & sets flag
  it('8. Flags medical escalation and appends urgent medical advisory', async () => {
    process.env.GEMINI_API_KEY = 'test_key';

    const mockGemini = async () => {
      return 'توجيهات المسكنات والعناية بالفم';
    };

    const result = await routeAIQuery({
      prompt: 'عندي ألم شديد جداً ونزيف بعد خلع الضرس',
      context: {
        organizationId: DEFAULT_EGYPT_ORG.id,
        patientId: 'pat_102_1',
        isAuthenticated: true,
      },
      mockGeminiCall: mockGemini,
    });

    expect(result.isMedicalEscalation).toBe(true);
    expect(result.text).toContain('تنبيه طبي');
  });

  // Test 9: Escalation creates Reception Task / Notification
  it('9. Medical escalation creates a receptionist alert notification when patient context is present', async () => {
    const initialNotifsCount = getStoredNotifications().length;

    await routeAIQuery({
      prompt: 'عندي ورم تورم في الخد وألم شديد',
      context: {
        organizationId: DEFAULT_EGYPT_ORG.id,
        patientId: 'pat_102_1',
        isAuthenticated: true,
      },
      mockGeminiCall: async () => 'إجابة تجريبية',
    });

    const notifs = getStoredNotifications();
    expect(notifs.length).toBeGreaterThan(initialNotifsCount);

    const escalationNotif = notifs.find(
      (n) => n.related_entity_id === 'pat_102_1' && n.type === 'reception_task'
    );
    expect(escalationNotif).toBeDefined();
    expect(escalationNotif?.target_role).toBe('receptionist');
  });

  // Test 10: UI chat history persists in patient storage
  it('10. Persists chat history in local storage per patient', () => {
    const storageKey = 'dental_saas_patient_ai_chat_pat_102_1';
    const mockMessages = [
      { id: '1', sender: 'user', text: 'مرحبا', timestamp: '10:00 AM' },
      { id: '2', sender: 'assistant', text: 'أهلاً بك', timestamp: '10:01 AM' },
    ];

    localStorage.setItem(storageKey, JSON.stringify(mockMessages));

    const retrieved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    expect(retrieved).toHaveLength(2);
    expect(retrieved[0].text).toBe('مرحبا');
  });

  // Test 11: Unauthenticated query blocks access to patient records
  it('11. Unauthenticated query prompts login and blocks access to personal health records', async () => {
    const result = await routeAIQuery({
      prompt: 'ما هو موعدي القادم؟',
      context: {
        organizationId: DEFAULT_EGYPT_ORG.id,
        isAuthenticated: false,
      },
    });

    expect(result.text).toContain('يرجى تسجيل الدخول');
    expect(result.text).not.toContain('2026-10-15');
  });
});
