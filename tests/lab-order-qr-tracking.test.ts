import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateLabOrderQrPayload,
  generateQrMatrix,
} from '../src/lib/labQrUtils';
import {
  getStoredLabOrders,
  createLabOrder,
  updateLabOrderStatus,
  setStoredLabOrders,
} from '../src/lib/clinicalStorage';
import { DEFAULT_EGYPT_ORG, SECONDARY_EGYPT_ORG, DEFAULT_BRANCHES } from '../src/lib/storage';
import { hasPermission } from '../src/modules/permissions/rolesAndPermissions';
import { LabOrderStatus } from '../src/types/clinical';

describe('Phase 06: Lab Order Management, QR Code Tracking & Scanner Engine', () => {
  beforeEach(() => {
    // Reset lab orders in memory
    setStoredLabOrders([]);
  });

  it('generates standardized QR payload and matrix algorithmically', () => {
    const orderId = 'test_order_999';
    const payload = generateLabOrderQrPayload(orderId);

    expect(payload).toBe('LAB-ORD-test_order_999');

    const matrix = generateQrMatrix(payload);
    expect(matrix.length).toBe(21);
    expect(matrix[0].length).toBe(21);

    // Verify finder patterns at top-left, top-right, and bottom-left
    expect(matrix[0][0]).toBe(true);
    expect(matrix[0][14]).toBe(true);
    expect(matrix[14][0]).toBe(true);
  });

  it('creates new lab orders and updates order status correctly', () => {
    const newOrder = createLabOrder({
      patientId: 'patient_001',
      doctorId: 'doc_001',
      serviceId: 'srv_zirconia',
      serviceNameEn: 'Zirconia Crown',
      serviceNameAr: 'تاج زيركون',
      labName: 'Cairo Dental Craft Lab',
      teeth: ['16', '17'],
      deliveryDate: '2026-09-25',
      requiredDeliveryDate: '2026-09-25',
      shadeNotes: 'A2 Vita Shade',
      material: 'Monolithic Zirconia',
      framework: 'Monolithic',
      tryInOrFinal: 'final',
      pontic: 'N/A',
      abutment: 'Custom Titanium',
      productType: 'Implant Crown',
      doctorNotes: 'Chamfer margin prep',
      labNotes: 'High translucency glaze',
      attachmentRefs: ['UpperArch_Scan.stl'],
    });

    expect(newOrder).toBeDefined();
    expect(newOrder.id).toBeDefined();
    expect(newOrder.status).toBe('sent_to_lab');
    expect(newOrder.material).toBe('Monolithic Zirconia');
    expect(newOrder.framework).toBe('Monolithic');
    expect(newOrder.try_in_or_final).toBe('final');
    expect(newOrder.abutment).toBe('Custom Titanium');
    expect(newOrder.product_type).toBe('Implant Crown');
    expect(newOrder.tooth_count).toBe(2);
    expect(newOrder.doctor_notes).toBe('Chamfer margin prep');
    expect(newOrder.lab_notes).toBe('High translucency glaze');
    expect(newOrder.attachment_refs).toEqual(['UpperArch_Scan.stl']);
    expect(newOrder.required_delivery_date).toBe('2026-09-25');

    const orders = getStoredLabOrders();
    expect(orders.some((o) => o.id === newOrder.id)).toBe(true);

    // Update status to delivered upon reception scanning
    const updated = updateLabOrderStatus(newOrder.id, 'delivered');
    expect(updated).toBe(true);

    const updatedOrders = getStoredLabOrders();
    const fetched = updatedOrders.find((o) => o.id === newOrder.id);
    expect(fetched?.status).toBe('delivered');
  });

  it('filters lab orders by patient name, dates, procedures, and lab vendor', () => {
    const order1 = createLabOrder({
      patientId: 'patient_001',
      doctorId: 'doc_001',
      serviceId: 'srv_crown',
      serviceNameEn: 'PFM Crown',
      labName: 'Alexandria Lab',
      teeth: ['11'],
      deliveryDate: '2026-09-20',
    });

    const order2 = createLabOrder({
      patientId: 'patient_002',
      doctorId: 'doc_002',
      serviceId: 'srv_veneer',
      serviceNameEn: 'E-Max Veneers',
      labName: 'Cairo Smile Lab',
      teeth: ['12', '22'],
      deliveryDate: '2026-09-28',
    });

    const allOrders = getStoredLabOrders();

    // Filter by Lab Vendor
    const alexOrders = allOrders.filter((o) => o.lab_name === 'Alexandria Lab');
    expect(alexOrders.some((o) => o.id === order1.id)).toBe(true);
    expect(alexOrders.some((o) => o.id === order2.id)).toBe(false);

    // Filter by Service Procedure
    const veneerOrders = allOrders.filter((o) =>
      o.service_name_en?.toLowerCase().includes('veneer')
    );
    expect(veneerOrders.some((o) => o.id === order2.id)).toBe(true);
    expect(veneerOrders.some((o) => o.id === order1.id)).toBe(false);
  });

  it('enforces organization_id isolation between distinct organizations', () => {
    const org1Order = createLabOrder({
      organizationId: DEFAULT_EGYPT_ORG.id,
      patientId: 'pat_org1',
      doctorId: 'doc_001',
      serviceId: 'srv_zirconia',
      teeth: ['11'],
      deliveryDate: '2026-10-01',
    });

    const org2Order = createLabOrder({
      organizationId: SECONDARY_EGYPT_ORG.id,
      patientId: 'pat_org2',
      doctorId: 'doc_002',
      serviceId: 'srv_emax',
      teeth: ['21'],
      deliveryDate: '2026-10-02',
    });

    const allOrders = getStoredLabOrders();
    const org1Filtered = allOrders.filter((o) => o.organization_id === DEFAULT_EGYPT_ORG.id);
    const org2Filtered = allOrders.filter((o) => o.organization_id === SECONDARY_EGYPT_ORG.id);

    expect(org1Filtered.some((o) => o.id === org1Order.id)).toBe(true);
    expect(org1Filtered.some((o) => o.id === org2Order.id)).toBe(false);

    expect(org2Filtered.some((o) => o.id === org2Order.id)).toBe(true);
    expect(org2Filtered.some((o) => o.id === org1Order.id)).toBe(false);
  });

  it('enforces branch_id isolation between clinic branches', () => {
    const branch1Id = DEFAULT_BRANCHES[0].id;
    const branch2Id = DEFAULT_BRANCHES[1].id;

    const b1Order = createLabOrder({
      branchId: branch1Id,
      patientId: 'pat_b1',
      doctorId: 'doc_b1',
      serviceId: 'srv_1',
      teeth: ['16'],
      deliveryDate: '2026-10-05',
    });

    const b2Order = createLabOrder({
      branchId: branch2Id,
      patientId: 'pat_b2',
      doctorId: 'doc_b2',
      serviceId: 'srv_2',
      teeth: ['26'],
      deliveryDate: '2026-10-06',
    });

    const allOrders = getStoredLabOrders();
    const branch1Orders = allOrders.filter((o) => o.branch_id === branch1Id);
    const branch2Orders = allOrders.filter((o) => o.branch_id === branch2Id);

    expect(branch1Orders.some((o) => o.id === b1Order.id)).toBe(true);
    expect(branch1Orders.some((o) => o.id === b2Order.id)).toBe(false);

    expect(branch2Orders.some((o) => o.id === b2Order.id)).toBe(true);
    expect(branch2Orders.some((o) => o.id === b1Order.id)).toBe(false);
  });

  it('persists treatment_plan_id and treatment_service_id linkages', () => {
    const linkedOrder = createLabOrder({
      patientId: 'pat_tp_01',
      doctorId: 'doc_tp_01',
      treatmentPlanId: 'plan_777_abc',
      treatmentServiceId: 'service_888_xyz',
      serviceId: 'srv_linked',
      serviceNameEn: 'Treatment Plan Bridge Unit',
      teeth: ['45', '46', '47'],
      deliveryDate: '2026-10-10',
    });

    expect(linkedOrder.treatment_plan_id).toBe('plan_777_abc');
    expect(linkedOrder.treatment_service_id).toBe('service_888_xyz');

    const fetched = getStoredLabOrders().find((o) => o.id === linkedOrder.id);
    expect(fetched?.treatment_plan_id).toBe('plan_777_abc');
    expect(fetched?.treatment_service_id).toBe('service_888_xyz');
  });

  it('persists selected teeth list and computes tooth count accurately', () => {
    const teethList = ['14', '15', '16', '17', '24', '25', '26', '27'];
    const multiTeethOrder = createLabOrder({
      patientId: 'pat_teeth',
      doctorId: 'doc_teeth',
      serviceId: 'srv_full_arch',
      teeth: teethList,
      deliveryDate: '2026-10-12',
    });

    expect(multiTeethOrder.teeth).toEqual(teethList);
    expect(multiTeethOrder.tooth_count).toBe(8);

    const emptyTeethOrder = createLabOrder({
      patientId: 'pat_general',
      doctorId: 'doc_gen',
      serviceId: 'srv_appliance',
      teeth: [],
      deliveryDate: '2026-10-12',
    });

    expect(emptyTeethOrder.teeth).toEqual([]);
    expect(emptyTeethOrder.tooth_count).toBe(1); // Defaults to 1 for general appliances
  });

  it('handles required_delivery_date specification', () => {
    const orderWithReqDate = createLabOrder({
      patientId: 'pat_date',
      doctorId: 'doc_date',
      serviceId: 'srv_urgent',
      teeth: ['11'],
      deliveryDate: '2026-10-20',
      requiredDeliveryDate: '2026-09-30',
    });

    expect(orderWithReqDate.required_delivery_date).toBe('2026-09-30');
    expect(orderWithReqDate.delivery_date).toBe('2026-09-30');
  });

  it('supports transitions across all valid LabOrderStatus values', () => {
    const order = createLabOrder({
      patientId: 'pat_status',
      doctorId: 'doc_status',
      serviceId: 'srv_status',
      teeth: ['36'],
      deliveryDate: '2026-10-15',
    });

    const validStatuses: LabOrderStatus[] = [
      'draft',
      'sent_to_lab',
      'in_production',
      'received',
      'delivered',
      'fitted',
      'cancelled',
    ];

    for (const status of validStatuses) {
      const res = updateLabOrderStatus(order.id, status);
      expect(res).toBe(true);

      const updated = getStoredLabOrders().find((o) => o.id === order.id);
      expect(updated?.status).toBe(status);
    }

    // Invalid order ID returns false
    const invalidRes = updateLabOrderStatus('non_existent_id', 'delivered');
    expect(invalidRes).toBe(false);
  });

  it('persists detailed manufacturing fields (material, framework, try-in/final, pontic, abutment, product_type)', () => {
    const detailedOrder = createLabOrder({
      patientId: 'pat_manufacturing',
      doctorId: 'doc_mfg',
      serviceId: 'srv_mfg',
      teeth: ['12', '11', '21', '22'],
      deliveryDate: '2026-10-25',
      material: 'Layered Zirconia',
      framework: 'CoCr Framework',
      tryInOrFinal: 'try_in',
      pontic: 'Modified Ridge Lap',
      abutment: 'Custom Titanium',
      productType: 'Bridge',
      doctorNotes: 'Maintain 0.5mm axial clearance',
      labNotes: 'Sintering cycle 1450C',
    });

    expect(detailedOrder.material).toBe('Layered Zirconia');
    expect(detailedOrder.framework).toBe('CoCr Framework');
    expect(detailedOrder.try_in_or_final).toBe('try_in');
    expect(detailedOrder.pontic).toBe('Modified Ridge Lap');
    expect(detailedOrder.abutment).toBe('Custom Titanium');
    expect(detailedOrder.product_type).toBe('Bridge');
    expect(detailedOrder.doctor_notes).toBe('Maintain 0.5mm axial clearance');
    expect(detailedOrder.lab_notes).toBe('Sintering cycle 1450C');

    const stored = getStoredLabOrders().find((o) => o.id === detailedOrder.id);
    expect(stored?.material).toBe('Layered Zirconia');
    expect(stored?.framework).toBe('CoCr Framework');
    expect(stored?.try_in_or_final).toBe('try_in');
    expect(stored?.pontic).toBe('Modified Ridge Lap');
    expect(stored?.abutment).toBe('Custom Titanium');
    expect(stored?.product_type).toBe('Bridge');
  });

  it('persists multi-file attachment_refs for 3D scans and photos', () => {
    const attachments = ['UpperArch_Scan_3D.stl', 'Bite_Registration.ply', 'Shade_Matching_BL2.jpg'];
    const orderWithFiles = createLabOrder({
      patientId: 'pat_files',
      doctorId: 'doc_files',
      serviceId: 'srv_files',
      teeth: ['11'],
      deliveryDate: '2026-10-28',
      attachmentRefs: attachments,
    });

    expect(orderWithFiles.attachment_refs).toEqual(attachments);

    const stored = getStoredLabOrders().find((o) => o.id === orderWithFiles.id);
    expect(stored?.attachment_refs).toEqual(attachments);
  });

  it('enforces RBAC permission restrictions for lab_user and delivery_user roles', () => {
    // lab_user & delivery_user must NOT have patient medical record read permissions
    expect(hasPermission('lab_user', 'patient.read')).toBe(false);
    expect(hasPermission('delivery_user', 'patient.read')).toBe(false);

    expect(hasPermission('lab_user', 'reception.manage')).toBe(false);
    expect(hasPermission('delivery_user', 'reception.manage')).toBe(false);

    // lab_user & delivery_user have branch read permission only
    expect(hasPermission('lab_user', 'branch.read')).toBe(true);
    expect(hasPermission('delivery_user', 'branch.read')).toBe(true);
  });

  it('verifies QR scanner matching algorithm and auto-updates status upon scan', () => {
    const order = createLabOrder({
      patientId: 'pat_scan_test',
      doctorId: 'doc_scan_test',
      serviceId: 'srv_scan_test',
      teeth: ['46'],
      deliveryDate: '2026-10-30',
    });

    const qrPayload = generateLabOrderQrPayload(order.id);
    expect(qrPayload).toBe(`LAB-ORD-${order.id}`);

    // Simulate QR scanner decoding payload LAB-ORD-order.id
    const allOrders = getStoredLabOrders();
    const matched = allOrders.find(
      (o) =>
        o.id === qrPayload ||
        `LAB-ORD-${o.id}` === qrPayload ||
        qrPayload.toLowerCase().includes(o.id.toLowerCase())
    );

    expect(matched).toBeDefined();
    expect(matched?.id).toBe(order.id);

    // Simulate scanner auto-confirm updating status to delivered
    const success = updateLabOrderStatus(matched!.id, 'delivered');
    expect(success).toBe(true);

    const updated = getStoredLabOrders().find((o) => o.id === order.id);
    expect(updated?.status).toBe('delivered');
  });
});

