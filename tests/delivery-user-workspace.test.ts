import { describe, it, expect, beforeEach } from 'vitest';
import {
  createLabOrder,
  getStoredLabOrders,
  setStoredLabOrders,
  updateDeliveryTransportStatus,
  assignDeliveryCourier,
} from '../src/lib/clinicalStorage';
import { generateLabOrderQrPayload } from '../src/lib/labQrUtils';
import { hasPermission } from '../src/modules/permissions/rolesAndPermissions';
import { DEFAULT_EGYPT_ORG } from '../src/lib/storage';
import { LabOrder } from '../src/types/clinical';

describe('Phase 06 - Delivery / Courier User Workspace & Transport Workflow Tests', () => {
  beforeEach(() => {
    setStoredLabOrders([]);
  });

  it('enforces RBAC permissions: delivery_user has NO patient record access or reception access', () => {
    // RBAC verification
    expect(hasPermission('delivery_user', 'patient.read')).toBe(false);
    expect(hasPermission('delivery_user', 'reception.manage')).toBe(false);

    // Branch read permission is granted for route/location verification
    expect(hasPermission('delivery_user', 'branch.read')).toBe(true);
    expect(hasPermission('delivery_user', 'organization.read')).toBe(false);
  });

  it('verifies delivery courier assignment and task isolation by courier and organization_id', () => {
    const orgA = DEFAULT_EGYPT_ORG.id;
    const orgB = 'org_alexandria_other_999';

    // Create order for Org A, Courier Mahmoud
    const order1 = createLabOrder({
      patientId: 'pat_deliv_1',
      doctorId: 'doc_deliv_1',
      serviceId: 'srv_deliv_1',
      teeth: ['11'],
      deliveryDate: '2026-11-01',
    });
    assignDeliveryCourier(
      order1.id,
      'courier_mahmoud_01',
      'Mahmoud Courier',
      'Cairo Lab',
      'Cairo Main Branch'
    );

    // Create order for Org A, Courier Tarek
    const order2 = createLabOrder({
      patientId: 'pat_deliv_2',
      doctorId: 'doc_deliv_2',
      serviceId: 'srv_deliv_2',
      teeth: ['21'],
      deliveryDate: '2026-11-02',
    });
    assignDeliveryCourier(
      order2.id,
      'courier_tarek_02',
      'Tarek Courier',
      'Alex Lab',
      'Alex Branch'
    );

    // Create order for Org B (different organization)
    const all = getStoredLabOrders();
    const orderOrgB: LabOrder = {
      ...order1,
      id: 'lab_ord_org_b_diff',
      organization_id: orgB,
      delivery_courier_id: 'courier_mahmoud_01',
      delivery_courier_name: 'Mahmoud Courier',
    };
    all.push(orderOrgB);
    setStoredLabOrders(all);

    // Verify Org A isolation: Org B orders must be excluded
    const orgAOrders = getStoredLabOrders().filter((o) => o.organization_id === orgA);
    expect(orgAOrders.some((o) => o.id === 'lab_ord_org_b_diff')).toBe(false);

    // Verify Courier isolation for Mahmoud
    const mahmoudTasks = orgAOrders.filter(
      (o) => o.delivery_courier_id === 'courier_mahmoud_01'
    );
    expect(mahmoudTasks.length).toBe(1);
    expect(mahmoudTasks[0].id).toBe(order1.id);
    expect(mahmoudTasks[0].pickup_location).toBe('Cairo Lab');
    expect(mahmoudTasks[0].destination_branch_name).toBe('Cairo Main Branch');

    // Verify Courier isolation for Tarek
    const tarekTasks = orgAOrders.filter(
      (o) => o.delivery_courier_id === 'courier_tarek_02'
    );
    expect(tarekTasks.length).toBe(1);
    expect(tarekTasks[0].id).toBe(order2.id);
  });

  it('handles pickup workflow and records pickup timestamp', () => {
    const order = createLabOrder({
      patientId: 'pat_pickup_test',
      doctorId: 'doc_pickup',
      serviceId: 'srv_pickup',
      teeth: ['16'],
      deliveryDate: '2026-11-05',
    });

    assignDeliveryCourier(order.id, 'courier_1', 'Express Courier');

    const result = updateDeliveryTransportStatus(
      order.id,
      'picked_up',
      'Picked up case box from lab front desk'
    );
    expect(result).toBe(true);

    const updated = getStoredLabOrders().find((o) => o.id === order.id);
    expect(updated?.delivery_transport_status).toBe('picked_up');
    expect(updated?.delivery_pickup_time).toBeDefined();
    expect(updated?.delivery_notes).toBe('Picked up case box from lab front desk');
  });

  it('handles in-transit transport status update', () => {
    const order = createLabOrder({
      patientId: 'pat_transit_test',
      doctorId: 'doc_transit',
      serviceId: 'srv_transit',
      teeth: ['26'],
      deliveryDate: '2026-11-06',
    });

    assignDeliveryCourier(order.id, 'courier_1', 'Express Courier');
    updateDeliveryTransportStatus(order.id, 'picked_up');

    const result = updateDeliveryTransportStatus(
      order.id,
      'in_transit',
      'Motorcycle dispatch en route'
    );
    expect(result).toBe(true);

    const updated = getStoredLabOrders().find((o) => o.id === order.id);
    expect(updated?.delivery_transport_status).toBe('in_transit');
    expect(updated?.delivery_notes).toBe('Motorcycle dispatch en route');
  });

  it('handles delivered transport status update and auto-syncs LabOrderStatus to delivered', () => {
    const order = createLabOrder({
      patientId: 'pat_delivered_test',
      doctorId: 'doc_delivered',
      serviceId: 'srv_delivered',
      teeth: ['36'],
      deliveryDate: '2026-11-07',
    });

    assignDeliveryCourier(order.id, 'courier_1', 'Express Courier');
    updateDeliveryTransportStatus(order.id, 'picked_up');
    updateDeliveryTransportStatus(order.id, 'in_transit');

    const result = updateDeliveryTransportStatus(
      order.id,
      'delivered',
      'Delivered to reception desk staff Member'
    );
    expect(result).toBe(true);

    const updated = getStoredLabOrders().find((o) => o.id === order.id);
    expect(updated?.delivery_transport_status).toBe('delivered');
    expect(updated?.delivery_delivered_time).toBeDefined();
    // Verify auto-sync of manufacturing LabOrderStatus
    expect(updated?.status).toBe('delivered');
  });

  it('handles failed delivery workflow with failure notes recording', () => {
    const order = createLabOrder({
      patientId: 'pat_failed_test',
      doctorId: 'doc_failed',
      serviceId: 'srv_failed',
      teeth: ['46'],
      deliveryDate: '2026-11-08',
    });

    assignDeliveryCourier(order.id, 'courier_1', 'Express Courier');

    const result = updateDeliveryTransportStatus(
      order.id,
      'failed_delivery',
      'Clinic branch closed upon arrival at 7 PM'
    );
    expect(result).toBe(true);

    const updated = getStoredLabOrders().find((o) => o.id === order.id);
    expect(updated?.delivery_transport_status).toBe('failed_delivery');
    expect(updated?.delivery_notes).toBe('Clinic branch closed upon arrival at 7 PM');
  });

  it('integrates QR scan payload verification and updates status upon QR match', () => {
    const order = createLabOrder({
      patientId: 'pat_qr_scan_courier',
      doctorId: 'doc_qr_courier',
      serviceId: 'srv_qr_courier',
      teeth: ['11', '12'],
      deliveryDate: '2026-11-10',
    });

    const qrPayload = generateLabOrderQrPayload(order.id);
    expect(qrPayload).toBe(`LAB-ORD-${order.id}`);

    // Courier scans or inputs QR code payload LAB-ORD-xxx
    const all = getStoredLabOrders();
    const matched = all.find(
      (o) =>
        o.id === qrPayload ||
        generateLabOrderQrPayload(o.id) === qrPayload ||
        qrPayload.toLowerCase().includes(o.id.toLowerCase())
    );

    expect(matched).toBeDefined();
    expect(matched?.id).toBe(order.id);

    // Execute delivery confirmation upon scan match
    const confirmSuccess = updateDeliveryTransportStatus(
      matched!.id,
      'delivered',
      'Confirmed via QR scan verification'
    );
    expect(confirmSuccess).toBe(true);

    const finalOrder = getStoredLabOrders().find((o) => o.id === order.id);
    expect(finalOrder?.delivery_transport_status).toBe('delivered');
    expect(finalOrder?.status).toBe('delivered');
  });
});
