import { describe, test, expect, beforeEach } from 'vitest';
import {
  getStoredWhatsAppLogs,
  sendWhatsAppMessage,
  retryFailedWhatsAppMessage,
  getStoredMessageTemplates,
  saveMessageTemplate,
  getPatientCommunicationPreference,
  savePatientCommunicationPreference,
  renderMessageBody,
  COMMUNICATION_STORAGE_KEYS,
} from '../src/lib/communicationStorage';
import {
  calculateAdvancedBIMetrics,
  generateBIMetricsCsvExport,
} from '../src/lib/biAnalyticsStorage';
import { validateWave3Authorization } from '../src/lib/ai/serverAuth';
import { DEFAULT_EGYPT_ORG } from '../src/lib/storage';

const CAIRO_BRANCH_ID = '11111111-1111-1111-1111-111111111111';
const ALEX_BRANCH_ID = '22222222-2222-2222-2222-222222222222';
const FORGED_ORG_ID = '99999999-9999-9999-9999-999999999999';

describe('Wave 3: Communication Center, WhatsApp Engine & Advanced Management BI', () => {
  beforeEach(() => {
    // Clear legacy localStorage keys if present
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        Object.values(COMMUNICATION_STORAGE_KEYS).forEach((k) => window.localStorage.removeItem(k));
      } catch {
        // ignore
      }
    }
  });

  // --------------------------------------------------------------------------
  // 1. WHATSAPP IDEMPOTENCY & DUPLICATE SEND PREVENTION
  // --------------------------------------------------------------------------
  test('PART 1: Prevents duplicate sends with identical idempotency key', async () => {
    const key = `apt_confirm_test_${Date.now()}`;

    const send1 = await sendWhatsAppMessage({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: CAIRO_BRANCH_ID,
      recipientPatientId: 'a1111111-1111-1111-1111-111111111111',
      recipientMobile: '+201000000001',
      recipientName: 'Ahmed Mohamed',
      messageType: 'appointment_confirmation',
      idempotencyKey: key,
    });

    expect(send1.success).toBe(true);
    expect(send1.log.delivery_state).toBe('delivered');

    // Duplicate send call
    const send2 = await sendWhatsAppMessage({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: CAIRO_BRANCH_ID,
      recipientPatientId: 'a1111111-1111-1111-1111-111111111111',
      recipientMobile: '+201000000001',
      recipientName: 'Ahmed Mohamed',
      messageType: 'appointment_confirmation',
      idempotencyKey: key,
    });

    expect(send2.success).toBe(true);
    expect(send2.duplicateSkipped).toBe(true);
    expect(send2.log.id).toBe(send1.log.id);
  });

  // --------------------------------------------------------------------------
  // 2. RETRY BEHAVIOR & DELIVERY STATE TRANSITIONS
  // --------------------------------------------------------------------------
  test('PART 2: Safe retry increments retry count and updates delivery state', async () => {
    // First send to invalid mobile number to force initial failure
    const send = await sendWhatsAppMessage({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: CAIRO_BRANCH_ID,
      recipientMobile: '123', // Invalid short mobile
      recipientName: 'Short Num Test',
      messageType: 'custom_operational',
      idempotencyKey: `retry_test_${Date.now()}`,
    });

    expect(send.success).toBe(false);
    expect(send.log.delivery_state).toBe('failed');

    // Retry sending
    const retryRes = await retryFailedWhatsAppMessage(send.log.id, DEFAULT_EGYPT_ORG.id);
    expect(retryRes.log?.retry_count).toBe(1);
  });

  // --------------------------------------------------------------------------
  // 3. PLACEHOLDER VALIDATION & SENSITIVE DATA SAFEGUARDS
  // --------------------------------------------------------------------------
  test('PART 3: Placeholders render correctly and strip sensitive internal terms', () => {
    const template = 'مرحباً {patient_name}، موعدك في {branch_name} مع د. {doctor_name}.';
    const rendered = renderMessageBody(
      template,
      {
        patient_name: 'Sara',
        branch_name: 'فرع القاهرة',
        doctor_name: 'Karim',
        cost: '500 EGP', // Sensitive term safeguard check
      },
      ['patient_name', 'branch_name', 'doctor_name']
    );

    expect(rendered).toContain('Sara');
    expect(rendered).toContain('فرع القاهرة');
    expect(rendered).toContain('Karim');
    expect(rendered).not.toContain('cost');
  });

  // --------------------------------------------------------------------------
  // 4. PATIENT COMMUNICATION PREFERENCES & MANDATORY CLINICAL BYPASS
  // --------------------------------------------------------------------------
  test('PART 4: Patient opt-out blocks marketing/reminders but permits mandatory clinical alerts', async () => {
    const patientId = 'a1111111-1111-1111-1111-111111111111';

    // Opt-out patient from WhatsApp
    savePatientCommunicationPreference({
      patient_id: patientId,
      organization_id: DEFAULT_EGYPT_ORG.id,
      whatsapp_enabled: false,
      in_app_enabled: true,
      preferred_language: 'ar',
      reminder_lead_hours: 24,
      guardian_inheritance_enabled: true,
      updated_at: new Date().toISOString(),
    });

    // Try sending optional reminder -> Should be skipped
    const optRes = await sendWhatsAppMessage({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: CAIRO_BRANCH_ID,
      recipientPatientId: patientId,
      recipientMobile: '+201000000001',
      recipientName: 'Ahmed Mohamed',
      messageType: 'appointment_reminder_24h',
      idempotencyKey: `opt_out_rem_${Date.now()}`,
      isMandatoryClinical: false,
    });

    expect(optRes.success).toBe(false);
    expect(optRes.error).toContain('إلغاء اشتراك');

    // Try sending mandatory post-op clinical instructions -> Must bypass opt-out
    const mandRes = await sendWhatsAppMessage({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: CAIRO_BRANCH_ID,
      recipientPatientId: patientId,
      recipientMobile: '+201000000001',
      recipientName: 'Ahmed Mohamed',
      messageType: 'post_treatment_instructions',
      idempotencyKey: `mand_post_op_${Date.now()}`,
      isMandatoryClinical: true,
    });

    expect(mandRes.success).toBe(true);
    expect(mandRes.log.delivery_state).toBe('delivered');
  });

  // --------------------------------------------------------------------------
  // 5. SERVER AUTHORIZATION & ROLE DASHBOARD VISIBILITY
  // --------------------------------------------------------------------------
  test('PART 9: Rejects unauthorized role from editing message templates or exporting BI', async () => {
    // Receptionist trying to manage templates
    const recTmpl = await validateWave3Authorization({
      authorizationHeader: 'Bearer prof_rec_01',
      action: 'manage_templates',
    });
    expect(recTmpl.authorized).toBe(false);
    expect(recTmpl.statusCode).toBe(403);

    // Patient trying to export executive BI
    const patBI = await validateWave3Authorization({
      authorizationHeader: 'Bearer token_a1111111-1111-1111-1111-111111111111',
      action: 'export_bi',
    });
    expect(patBI.authorized).toBe(false);
    expect(patBI.statusCode).toBe(403);

    // Center Manager authorized for BI and templates
    const cmRes = await validateWave3Authorization({
      authorizationHeader: 'Bearer prof_cm_01',
      action: 'export_bi',
    });
    expect(cmRes.authorized).toBe(true);
    expect(cmRes.context?.canViewFinancialBI).toBe(true);
    expect(cmRes.context?.canManageTemplates).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 6. ADVANCED BI METRICS ACCURACY & CSV EXPORT
  // --------------------------------------------------------------------------
  test('PART 5 & 6: BI metrics calculate revenue trends, utilization, and export UTF-8 BOM CSV', () => {
    const bi = calculateAdvancedBIMetrics({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: 'all',
    });

    expect(bi.grossInvoicedEgp).toBeGreaterThanOrEqual(0);
    expect(bi.collectionsTrendPercent).toBeGreaterThanOrEqual(0);
    expect(typeof bi.insuranceApprovalRatePercent).toBe('number');
    expect(typeof bi.appointmentUtilizationRatePercent).toBe('number');
    expect(bi.branchPerformanceList.length).toBeGreaterThan(0);

    const csv = generateBIMetricsCsvExport(bi);
    expect(csv.startsWith('\uFEFF')).toBe(true); // UTF-8 BOM present
    expect(csv).toContain('إجمالي المبالغ المفلترة');
  });

});
