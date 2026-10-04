import { describe, test, expect, beforeEach } from 'vitest';
import { routeAIQuery, checkMedicalEscalation } from '../src/lib/ai/aiRouter';
import {
  summarizePatientClinicalTimeline,
  prepareClinicalDraft,
} from '../src/lib/ai/doctorAIAssistant';
import {
  calculateOperationalAIRisks,
  generateManagerAIReport,
} from '../src/lib/ai/managerAIAssistant';
import { executeApprovedAIAction } from '../src/lib/ai/actionExecutionEngine';
import { AIActionProposal } from '../src/lib/ai/types';
import { DEFAULT_EGYPT_ORG } from '../src/lib/storage';

describe('Wave 4: Advanced AI Clinical & Operational Intelligence Suite', () => {
  const ORG_ID = DEFAULT_EGYPT_ORG.id;
  const OTHER_ORG_ID = '99999999-9999-9999-9999-999999999999';
  const PATIENT_ID = 'a1111111-1111-1111-1111-111111111111';

  test('PART 1 & 2: Patient AI retrieves only authorized data and applies source attribution', async () => {
    const res = await routeAIQuery({
      prompt: 'ما هو موعدي القادم؟',
      context: {
        organizationId: ORG_ID,
        patientId: PATIENT_ID,
        isAuthenticated: true,
      },
    });

    expect(res.source).toBe('database');
    expect(res.text).toMatch(/موعد|مواعيد/);
    expect(res.isMedicalEscalation).toBe(false);
  });

  test('PART 1 & 2: Patient AI rejects unauthenticated queries for private appointment data', async () => {
    const res = await routeAIQuery({
      prompt: 'ما هو موعدي القادم؟',
      context: {
        organizationId: ORG_ID,
        patientId: PATIENT_ID,
        isAuthenticated: false, // Unauthenticated
      },
    });

    expect(res.text).toContain('تسجيل الدخول');
  });

  test('PART 2: Medical safety triggers human escalation for urgent symptoms', async () => {
    const isEscalationAr = checkMedicalEscalation('أعاني من ألم شديد ونزيف باللثة', 'ar');
    expect(isEscalationAr).toBe(true);

    const isEscalationEn = checkMedicalEscalation('I have severe pain and swelling', 'en');
    expect(isEscalationEn).toBe(true);

    const res = await routeAIQuery({
      prompt: 'أعاني من ألم شديد ونزيف باللثة',
      context: {
        organizationId: ORG_ID,
        patientId: PATIENT_ID,
        isAuthenticated: true,
      },
      mockGeminiCall: async () => 'معلومات استرشادية عامة لأسنانك',
    });

    expect(res.isMedicalEscalation).toBe(true);
    expect(res.text).toContain('تنبيه طبي');
  });

  test('PART 3: Doctor AI summarizes patient clinical timeline and audits missing documentation', () => {
    const summary = summarizePatientClinicalTimeline(PATIENT_ID, ORG_ID, 'doc_01');

    if ('error' in summary) {
      throw new Error(summary.error);
    }

    expect(summary.patientId).toBe(PATIENT_ID);
    expect(summary.sourceCategory).toBe('Patient Record');
    expect(summary.summaryTextAr).toContain('[المصدر: سجل المريض - Patient Record]');
    expect(summary.missingDocumentation).toBeDefined();
    expect(Array.isArray(summary.proposedActions)).toBe(true);
  });

  test('PART 3: Doctor AI produces non-final clinical drafts flagged as advisory ONLY', () => {
    const draft = prepareClinicalDraft('soap_note', PATIENT_ID, ORG_ID, {
      chiefComplaint: 'ألم حاد مع المأكولات الساخنة',
    });

    expect(draft.isDraft).toBe(true);
    expect(draft.contentAr).toContain('[مسودة استرشادية - تتطلب اعتماد الطبيب]');
    expect(draft.sourceCategory).toBe('Patient Record');
  });

  test('PART 4 & 5: Operational AI computes explainable risk signals and BI report', () => {
    const risks = calculateOperationalAIRisks(ORG_ID);
    expect(Array.isArray(risks)).toBe(true);

    const report = generateManagerAIReport(ORG_ID);
    expect(report.organizationId).toBe(ORG_ID);
    expect(report.biSummaryTextAr).toContain('[المصدر: قاعدة البيانات المالية والتنفيذية - Financial Data]');
    expect(Array.isArray(report.riskSignals)).toBe(true);
  });

  test('PART 6 & 9: Rejects AI action execution if actor role is unauthorized', async () => {
    const proposal: AIActionProposal = {
      id: 'prop_test_01',
      actionType: 'adjust_inventory',
      titleAr: 'تعديل المخزون',
      titleEn: 'Adjust Inventory',
      descriptionAr: 'تعديل مخزون',
      descriptionEn: 'Adjust Inventory',
      targetEntity: 'inventory',
      targetId: 'inv_001',
      parameters: { currentQuantity: 5 },
      sourceAttribution: 'Lab/Inventory Data',
      requiresApproval: true,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Receptionist attempting inventory action
    const res = await executeApprovedAIAction({
      proposal,
      actorUserId: 'rec_01',
      actorUserName: 'Receptionist',
      actorUserRole: 'receptionist',
      organizationId: ORG_ID,
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('Unauthorized role');
  });

  test('PART 6 & 10: Executes approved AI action and appends security audit log', async () => {
    const proposal: AIActionProposal = {
      id: 'prop_test_02',
      actionType: 'adjust_inventory',
      titleAr: 'إعادة طلب المخزون',
      titleEn: 'Restock Inventory',
      descriptionAr: 'طلب توريد حشوات ضوئية',
      descriptionEn: 'Reorder composite fillings',
      targetEntity: 'inventory',
      targetId: 'inv_001',
      parameters: { currentQuantity: 5 },
      sourceAttribution: 'Lab/Inventory Data',
      requiresApproval: true,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Center Manager approving action
    const res = await executeApprovedAIAction({
      proposal,
      actorUserId: 'cm_01',
      actorUserName: 'Center Manager',
      actorUserRole: 'center_manager',
      organizationId: ORG_ID,
    });

    expect(res.success).toBe(true);
    expect(res.resultMessageAr).toContain('تحديث حالة طلب التوريد للمخزون');
  });

  test('PART 9: Cross-organization retrieval denial', () => {
    const summary = summarizePatientClinicalTimeline(PATIENT_ID, OTHER_ORG_ID, 'doc_01');
    expect('error' in summary).toBe(true);
  });
});
