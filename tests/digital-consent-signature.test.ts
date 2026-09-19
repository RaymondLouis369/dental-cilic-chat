import { describe, it, expect, beforeEach } from 'vitest';
import {
  requestConsent,
  getStoredConsentRequests,
  setStoredConsentRequests,
  signConsentRequest,
  declineConsentRequest,
  createDoctorTask,
  getStoredDoctorTasks,
} from '../src/lib/clinicalStorage';
import { resetPhase3StorageToSeeds } from '../src/lib/receptionAndBillingStorage';
import { DEFAULT_EGYPT_ORG } from '../src/lib/storage';

describe('Digital Consent Signature & Workflow Engine', () => {
  beforeEach(() => {
    resetPhase3StorageToSeeds();
  });

  it('creates a consent request with default requested status', () => {
    const { consent, task } = requestConsent({
      patientId: 'patient_001',
      doctorId: 'doc_001',
      consentType: 'treatment_plan_agreement',
      title: 'General Dental Treatment Agreement',
      descriptionAr: 'الموافقة على الخطة العلاجية والتخدير الموضعي',
      descriptionEn: 'Agreement for general dental procedure',
      organizationId: DEFAULT_EGYPT_ORG.id,
    });

    expect(consent).toBeDefined();
    expect(consent.id).toBeDefined();
    expect(consent.status).toBe('requested');
    expect(consent.signed_by_name).toBeUndefined();
    expect(consent.signature_data_url).toBeUndefined();
    expect(task).toBeDefined();
    expect(task?.task_type).toBe('obtain_consent');
  });

  it('requires a valid signature and signer name to mark consent as signed', () => {
    const { consent } = requestConsent({
      patientId: 'patient_001',
      doctorId: 'doc_001',
      consentType: 'extraction_consent',
      title: 'Wisdom Tooth Surgical Extraction Consent',
      descriptionAr: 'إقرار بالخلع الجراحي والمخاطر المحتملة',
      descriptionEn: 'Informed consent for surgical extraction',
      organizationId: DEFAULT_EGYPT_ORG.id,
    });

    const sampleDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    // Sign consent with valid signature
    const result = signConsentRequest(consent.id, 'أحمد محمود', sampleDataUrl, 'SIG-AUDIT-999');
    expect(result).toBe(true);

    const updatedConsents = getStoredConsentRequests();
    const targetConsent = updatedConsents.find((c) => c.id === consent.id);

    expect(targetConsent).toBeDefined();
    expect(targetConsent?.status).toBe('signed');
    expect(targetConsent?.signed_by_name).toBe('أحمد محمود');
    expect(targetConsent?.signature_data_url).toBe(sampleDataUrl);
    expect(targetConsent?.signature_reference).toBe('SIG-AUDIT-999');
    expect(targetConsent?.signed_at).toBeDefined();
  });

  it('declines consent request correctly when patient declines', () => {
    const { consent } = requestConsent({
      patientId: 'patient_002',
      doctorId: 'doc_001',
      consentType: 'bone_graft_consent',
      title: 'Bone Grafting Consent',
      descriptionAr: 'إقرار زراعة العظم',
      descriptionEn: 'Bone Grafting Surgical Consent',
      organizationId: DEFAULT_EGYPT_ORG.id,
    });

    const success = declineConsentRequest(consent.id);
    expect(success).toBe(true);

    const updatedConsents = getStoredConsentRequests();
    const targetConsent = updatedConsents.find((c) => c.id === consent.id);

    expect(targetConsent?.status).toBe('declined');
    expect(targetConsent?.signed_by_name).toBeUndefined();
  });

  it('completes linked reception task automatically upon successful signature', () => {
    const task = createDoctorTask({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: '11111111-1111-1111-1111-111111111111',
      patientId: 'patient_001',
      doctorId: 'doc_001',
      taskType: 'obtain_consent',
      title: 'Obtain Implant Consent',
      priority: 'urgent',
    });

    const { consent } = requestConsent({
      patientId: 'patient_001',
      doctorId: 'doc_001',
      consentType: 'implant_surgery_consent',
      title: 'Implant Surgery Consent',
      descriptionAr: 'إقرار زراعة الأسنان',
      descriptionEn: 'Implant Surgery Consent',
      organizationId: DEFAULT_EGYPT_ORG.id,
    });

    // Link consent to task
    const consents = getStoredConsentRequests();
    const cObj = consents.find((c) => c.id === consent.id);
    if (cObj) {
      cObj.reception_task_id = task.id;
      setStoredConsentRequests(consents);
    }

    const sampleDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    signConsentRequest(consent.id, 'سارة علي', sampleDataUrl);

    const updatedTasks = getStoredDoctorTasks();
    const targetTask = updatedTasks.find((t) => t.id === task.id);
    expect(targetTask?.status).toBe('completed');
  });
});
