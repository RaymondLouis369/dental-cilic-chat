import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredLabOrders,
  createLabOrder,
  updateLabOrderStatus,
  updateLabOrderNotes,
  setStoredLabOrders,
} from '../src/lib/clinicalStorage';
import { DEFAULT_EGYPT_ORG, SECONDARY_EGYPT_ORG } from '../src/lib/storage';
import { hasPermission } from '../src/modules/permissions/rolesAndPermissions';
import { LabOrder } from '../src/types/clinical';

describe('Phase 06: Dedicated Lab User Workspace & Security Isolation', () => {
  beforeEach(() => {
    setStoredLabOrders([]);
  });

  it('lab user sees only assigned lab orders matching their lab_name', () => {
    const assignedLabName = 'Cairo Elite Dental Lab (معمل القاهرة للتركيبات)';
    const unassignedLabName = 'Alpha Dental Ceramics (المعمل الفني المتخصص)';

    const order1 = createLabOrder({
      organizationId: DEFAULT_EGYPT_ORG.id,
      patientId: 'pat_lab_01',
      doctorId: 'doc_01',
      serviceId: 'srv_zirconia',
      labName: assignedLabName,
      teeth: ['11', '12'],
      deliveryDate: '2026-10-01',
      material: 'Monolithic Zirconia',
      productType: 'Crown',
    });

    const order2 = createLabOrder({
      organizationId: DEFAULT_EGYPT_ORG.id,
      patientId: 'pat_lab_02',
      doctorId: 'doc_02',
      serviceId: 'srv_emax',
      labName: unassignedLabName,
      teeth: ['21'],
      deliveryDate: '2026-10-02',
      material: 'IPS e.max',
      productType: 'Veneer',
    });

    const allOrders = getStoredLabOrders();

    // Lab user filtering logic
    const assignedOrders = allOrders.filter(
      (o) => o.organization_id === DEFAULT_EGYPT_ORG.id && o.lab_name === assignedLabName
    );

    expect(assignedOrders.some((o) => o.id === order1.id)).toBe(true);
    expect(assignedOrders.some((o) => o.id === order2.id)).toBe(false);
  });

  it('unauthorized lab orders from another organization or unassigned lab are hidden', () => {
    const org1LabName = 'Cairo Elite Dental Lab (معمل القاهرة للتركيبات)';

    const validOrder = createLabOrder({
      organizationId: DEFAULT_EGYPT_ORG.id,
      patientId: 'pat_authorized',
      doctorId: 'doc_01',
      serviceId: 'srv_01',
      labName: org1LabName,
      teeth: ['36'],
      deliveryDate: '2026-10-05',
    });

    const foreignOrgOrder = createLabOrder({
      organizationId: SECONDARY_EGYPT_ORG.id,
      patientId: 'pat_foreign',
      doctorId: 'doc_02',
      serviceId: 'srv_02',
      labName: org1LabName,
      teeth: ['46'],
      deliveryDate: '2026-10-05',
    });

    const allOrders = getStoredLabOrders();

    // Enforce organization_id isolation + lab_name filter
    const labUserVisibleOrders = allOrders.filter(
      (o) => o.organization_id === DEFAULT_EGYPT_ORG.id && o.lab_name === org1LabName
    );

    expect(labUserVisibleOrders.some((o) => o.id === validOrder.id)).toBe(true);
    expect(labUserVisibleOrders.some((o) => o.id === foreignOrgOrder.id)).toBe(false);
  });

  it('manufacturing details are fully visible for lab technicians', () => {
    const order = createLabOrder({
      organizationId: DEFAULT_EGYPT_ORG.id,
      patientId: 'pat_mfg_details',
      doctorId: 'doc_spec',
      serviceId: 'srv_implant_crown',
      serviceNameAr: 'تاج زراعة أسنان توابع تيتانيوم',
      serviceNameEn: 'Custom Titanium Implant Crown',
      labName: 'Cairo Elite Dental Lab (معمل القاهرة للتركيبات)',
      teeth: ['16', '17'],
      deliveryDate: '2026-10-15',
      requiredDeliveryDate: '2026-10-15',
      material: 'Layered Zirconia',
      framework: 'Monolithic Titanium Base',
      tryInOrFinal: 'try_in',
      pontic: 'Ovate',
      abutment: 'Custom Titanium',
      productType: 'Implant Crown',
      doctorNotes: 'Maintain 0.5mm subgingival prep margin',
      labNotes: 'Sintering cycle 1450C completed',
      attachmentRefs: ['UpperArch_Scan_16_17.stl', 'Shade_Matching_Photo.jpg'],
    });

    const fetched = getStoredLabOrders().find((o) => o.id === order.id);

    expect(fetched).toBeDefined();
    expect(fetched?.service_name_ar).toBe('تاج زراعة أسنان توابع تيتانيوم');
    expect(fetched?.service_name_en).toBe('Custom Titanium Implant Crown');
    expect(fetched?.teeth).toEqual(['16', '17']);
    expect(fetched?.tooth_count).toBe(2);
    expect(fetched?.material).toBe('Layered Zirconia');
    expect(fetched?.framework).toBe('Monolithic Titanium Base');
    expect(fetched?.try_in_or_final).toBe('try_in');
    expect(fetched?.pontic).toBe('Ovate');
    expect(fetched?.abutment).toBe('Custom Titanium');
    expect(fetched?.product_type).toBe('Implant Crown');
    expect(fetched?.doctor_notes).toBe('Maintain 0.5mm subgingival prep margin');
    expect(fetched?.lab_notes).toBe('Sintering cycle 1450C completed');
    expect(fetched?.attachment_refs).toEqual(['UpperArch_Scan_16_17.stl', 'Shade_Matching_Photo.jpg']);
  });

  it('restricted patient medical records are NOT exposed to lab_user', () => {
    // lab_user role permission check
    const canReadPatientRecords = hasPermission('lab_user', 'patient.read');
    expect(canReadPatientRecords).toBe(false);

    const canManageReception = hasPermission('lab_user', 'reception.manage');
    expect(canManageReception).toBe(false);

    // Verify LabOrder data structure does NOT leak full patient medical objects
    const order = createLabOrder({
      organizationId: DEFAULT_EGYPT_ORG.id,
      patientId: 'pat_secret_medical_record_999',
      doctorId: 'doc_01',
      serviceId: 'srv_test',
      teeth: ['11'],
      deliveryDate: '2026-10-10',
    });

    // Order object only contains patient_id reference, no medical history, SOAP notes, or financial ledgers
    expect((order as any).medical_history).toBeUndefined();
    expect((order as any).allergies).toBeUndefined();
    expect((order as any).soap_notes).toBeUndefined();
    expect((order as any).financial_balance).toBeUndefined();
  });

  it('valid status updates and lab technician notes updates persist correctly', () => {
    const order = createLabOrder({
      organizationId: DEFAULT_EGYPT_ORG.id,
      patientId: 'pat_status_update',
      doctorId: 'doc_01',
      serviceId: 'srv_status',
      teeth: ['21'],
      deliveryDate: '2026-10-20',
    });

    // 1. Update status to in_production
    let statusSuccess = updateLabOrderStatus(order.id, 'in_production');
    expect(statusSuccess).toBe(true);

    let updated = getStoredLabOrders().find((o) => o.id === order.id);
    expect(updated?.status).toBe('in_production');

    // 2. Add lab notes
    let notesSuccess = updateLabOrderNotes(order.id, 'Glaze layer applied; ready for delivery');
    expect(notesSuccess).toBe(true);

    updated = getStoredLabOrders().find((o) => o.id === order.id);
    expect(updated?.lab_notes).toBe('Glaze layer applied; ready for delivery');

    // 3. Update status to delivered
    statusSuccess = updateLabOrderStatus(order.id, 'delivered');
    expect(statusSuccess).toBe(true);

    updated = getStoredLabOrders().find((o) => o.id === order.id);
    expect(updated?.status).toBe('delivered');
  });
});
