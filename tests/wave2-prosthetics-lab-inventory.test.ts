import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredInventoryItems,
  saveInventoryItem,
  receiveInventory,
  transferInventory,
  recordMaterialConsumption,
  adjustInventory,
  getStoredInventoryTransactions,
  getLowStockItems,
  getOverdueLabOrders,
  checkAndTriggerLowStockAndOverdueAlerts,
  getInventorySummaryReport,
  createModificationRequest,
  respondToModificationRequest,
  getStoredModificationRequests,
  createOrUpdateFittingRecord,
  getStoredFittingRecords,
  INVENTORY_STORAGE_KEYS,
} from '../src/lib/inventoryStorage';
import {
  createLabOrder,
  getStoredLabOrders,
  updateLabOrderStatus,
  updateDeliveryTransportStatus,
  assignDeliveryCourier,
} from '../src/lib/clinicalStorage';
import { recordLabMaterialCost, getStoredLabMaterialCosts } from '../src/lib/receptionAndBillingStorage';
import { getStoredNotifications } from '../src/lib/notificationStorage';
import { DEFAULT_EGYPT_ORG } from '../src/lib/storage';

const CAIRO_BRANCH_ID = '11111111-1111-1111-1111-111111111111';
const ALEX_BRANCH_ID = '22222222-2222-2222-2222-222222222222';

describe('Wave 2: Advanced Prosthetics, Lab Operations & Inventory Suite', () => {
  beforeEach(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
      // ignore
    }
  });

  describe('1. Advanced Prosthetic Orders & Manufacturing Lifecycle', () => {
    it('creates an advanced prosthetic order with full specs and updates lifecycle', () => {
      const order = createLabOrder({
        patientId: 'pat_001',
        doctorId: 'prof_doc_01',
        branchId: CAIRO_BRANCH_ID,
        organizationId: DEFAULT_EGYPT_ORG.id,
        serviceId: 'srv_pros_01',
        serviceNameAr: 'تاج زركونيا للسن #11',
        serviceNameEn: 'Zirconia Crown #11',
        teeth: ['11'],
        deliveryDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        material: 'Zirconia HT',
        framework: 'Monolithic',
        tryInOrFinal: 'try_in',
        pontic: 'N/A',
        abutment: 'Custom Titanium',
        productType: 'Crown',
        doctorNotes: 'مطلوب إنهاء حواف دقيقة مع طبعة رقمية 3D',
      });

      expect(order.id).toBeDefined();
      expect(order.status).toBe('sent_to_lab');
      expect(order.material).toBe('Zirconia HT');
      expect(order.try_in_or_final).toBe('try_in');

      // Update lifecycle status to in_production
      const updated = updateLabOrderStatus(order.id, 'in_production');
      expect(updated).toBe(true);

      const fetchedOrders = getStoredLabOrders('pat_001');
      const target = fetchedOrders.find((o) => o.id === order.id);
      expect(target?.status).toBe('in_production');
    });

    it('handles courier assignment and delivery transport lifecycle', () => {
      const order = createLabOrder({
        patientId: 'pat_001',
        doctorId: 'prof_doc_01',
        serviceId: 'srv_pros_02',
        teeth: ['12'],
        deliveryDate: '2026-10-10',
      });

      const assigned = assignDeliveryCourier(
        order.id,
        'del_usr_01',
        'سامح الدليفري',
        'معمل القاهرة المتقدم',
        'فرع القاهرة الرئيسي'
      );
      expect(assigned).toBe(true);

      updateDeliveryTransportStatus(order.id, 'picked_up', 'تم استلام الشحنة من المعمل');
      let orders = getStoredLabOrders();
      let target = orders.find((o) => o.id === order.id);
      expect(target?.delivery_transport_status).toBe('picked_up');
      expect(target?.delivery_pickup_time).toBeDefined();

      // Delivered to clinic
      updateDeliveryTransportStatus(order.id, 'delivered', 'تم التسليم لمكتب الاستقبال');
      orders = getStoredLabOrders();
      target = orders.find((o) => o.id === order.id);
      expect(target?.delivery_transport_status).toBe('delivered');
      expect(target?.status).toBe('delivered');
    });
  });

  describe('2. Modification Requests & Fitting Workflow', () => {
    it('creates modification requests and processes lab response', () => {
      const order = createLabOrder({
        patientId: 'pat_002',
        doctorId: 'prof_doc_01',
        serviceId: 'srv_pros_03',
        teeth: ['21'],
        deliveryDate: '2026-10-12',
      });

      const mod = createModificationRequest({
        labOrderId: order.id,
        organizationId: DEFAULT_EGYPT_ORG.id,
        branchId: CAIRO_BRANCH_ID,
        reason: 'ارتفاع الإطباق بالطاحنة',
        requestedChange: 'تقليل السطح الإطباقي بمقدار 0.5 مم وتلميع التاج',
        requesterId: 'prof_doc_01',
        requesterName: 'د. كريم حسن',
        requesterRole: 'doctor',
      });

      expect(mod.id).toBeDefined();
      expect(mod.response_status).toBe('pending');

      const requests = getStoredModificationRequests(order.id);
      expect(requests.length).toBe(1);

      // Lab responds and accepts
      const responded = respondToModificationRequest({
        requestId: mod.id,
        responseStatus: 'accepted',
        responseNotes: 'تم استلام الطلب وبدء تعديل السطح الإطباقي',
        respondedById: 'usr_lab_01',
        respondedByName: 'فني معمل القاهرة',
      });

      expect(responded).toBe(true);
      const updatedReqs = getStoredModificationRequests(order.id);
      expect(updatedReqs[0].response_status).toBe('accepted');
      expect(updatedReqs[0].response_notes).toContain('استلام الطلب');
    });

    it('records prosthetic trial sessions and syncs final fitting status', () => {
      const order = createLabOrder({
        patientId: 'pat_003',
        doctorId: 'prof_doc_01',
        serviceId: 'srv_pros_04',
        teeth: ['26'],
        deliveryDate: '2026-10-15',
      });

      // Record trial session
      const fitRec = createOrUpdateFittingRecord({
        organizationId: DEFAULT_EGYPT_ORG.id,
        branchId: CAIRO_BRANCH_ID,
        labOrderId: order.id,
        patientId: 'pat_003',
        doctorId: 'prof_doc_01',
        trialResult: 'acceptable',
        trialScheduledAt: '2026-10-14',
        modificationNotes: 'الإنهاء جاف وحواف ممتازة',
      });

      expect(fitRec.trial_result).toBe('acceptable');

      // Final fitting
      const finalRec = createOrUpdateFittingRecord({
        id: fitRec.id,
        organizationId: DEFAULT_EGYPT_ORG.id,
        branchId: CAIRO_BRANCH_ID,
        labOrderId: order.id,
        patientId: 'pat_003',
        doctorId: 'prof_doc_01',
        trialResult: 'fitted',
        fittedByDoctorId: 'prof_doc_01',
      });

      expect(finalRec.trial_result).toBe('fitted');
      expect(finalRec.fitted_at).toBeDefined();

      // Verify lab order status synced to fitted
      const labOrders = getStoredLabOrders();
      const target = labOrders.find((o) => o.id === order.id);
      expect(target?.status).toBe('fitted');
    });
  });

  describe('3. Inventory Management, Receiving & Inter-Branch Transfers', () => {
    it('receives new stock shipment and updates ledger', () => {
      const items = getStoredInventoryItems();
      const targetItem = items[0];

      const res = receiveInventory({
        organizationId: DEFAULT_EGYPT_ORG.id,
        branchId: CAIRO_BRANCH_ID,
        inventoryItemId: targetItem.id,
        quantity: 10,
        unitCost: 450,
        notes: 'استلام شحنة إضافية مسبقة',
        actorUserId: 'usr_bm_01',
      });

      expect(res.success).toBe(true);
      expect(res.item?.current_quantity).toBe(targetItem.current_quantity + 10);

      const txs = getStoredInventoryTransactions(DEFAULT_EGYPT_ORG.id, CAIRO_BRANCH_ID, targetItem.id);
      expect(txs.length).toBeGreaterThan(0);
      expect(txs[0].type).toBe('receive');
      expect(txs[0].quantity).toBe(10);
    });

    it('transfers stock between branches and prevents negative stock', () => {
      const cairoItems = getStoredInventoryItems(DEFAULT_EGYPT_ORG.id, CAIRO_BRANCH_ID);
      const cairoItem = cairoItems[0];
      const initialQty = cairoItem.current_quantity;

      // Transfer valid quantity
      const res = transferInventory({
        organizationId: DEFAULT_EGYPT_ORG.id,
        fromBranchId: CAIRO_BRANCH_ID,
        toBranchId: ALEX_BRANCH_ID,
        inventoryItemId: cairoItem.id,
        quantity: 2,
        notes: 'تحويل لفرع الإسكندرية',
        actorUserId: 'usr_mgr_01',
      });

      expect(res.success).toBe(true);
      expect(res.sourceItem?.current_quantity).toBe(initialQty - 2);

      // Verify item quantity at destination branch
      const alexItems = getStoredInventoryItems(DEFAULT_EGYPT_ORG.id, ALEX_BRANCH_ID);
      const destItem = alexItems.find((i) => i.sku === cairoItem.sku);
      expect(destItem).toBeDefined();

      // Attempt to transfer excess quantity (should fail)
      const failRes = transferInventory({
        organizationId: DEFAULT_EGYPT_ORG.id,
        fromBranchId: CAIRO_BRANCH_ID,
        toBranchId: ALEX_BRANCH_ID,
        inventoryItemId: cairoItem.id,
        quantity: 9999,
        notes: 'تحويل كمية ضخمة خاطئة',
        actorUserId: 'usr_mgr_01',
      });

      expect(failRes.success).toBe(false);
      expect(failRes.error).toContain('غير كافٍ');
    });

    it('records material consumption and syncs cost to billing system', () => {
      const items = getStoredInventoryItems(DEFAULT_EGYPT_ORG.id, CAIRO_BRANCH_ID);
      const item = items[0];
      const initialQty = item.current_quantity;

      const res = recordMaterialConsumption({
        organizationId: DEFAULT_EGYPT_ORG.id,
        branchId: CAIRO_BRANCH_ID,
        inventoryItemId: item.id,
        quantity: 2,
        invoiceId: 'inv_test_999',
        treatmentServiceId: 'srv_001',
        patientId: 'pat_001',
        doctorId: 'prof_doc_01',
        actorUserId: 'prof_doc_01',
      });

      expect(res.success).toBe(true);
      expect(res.item?.current_quantity).toBe(initialQty - 2);

      // Verify material cost synced to billing storage
      const materialCosts = getStoredLabMaterialCosts(DEFAULT_EGYPT_ORG.id, 'inv_test_999');
      expect(materialCosts.length).toBeGreaterThan(0);
      expect(materialCosts[0].actual_cost).toBe(2 * item.unit_cost);
    });

    it('adjusts inventory stock and logs wastage', () => {
      const items = getStoredInventoryItems(DEFAULT_EGYPT_ORG.id, CAIRO_BRANCH_ID);
      const item = items[1];

      const res = adjustInventory({
        organizationId: DEFAULT_EGYPT_ORG.id,
        branchId: CAIRO_BRANCH_ID,
        inventoryItemId: item.id,
        newQuantity: 50,
        type: 'wastage',
        notes: 'إهدار بسبب انتهاء صلاحية العبوة',
        actorUserId: 'usr_bm_01',
      });

      expect(res.success).toBe(true);
      expect(res.item?.current_quantity).toBe(50);

      const txs = getStoredInventoryTransactions(DEFAULT_EGYPT_ORG.id, CAIRO_BRANCH_ID, item.id);
      expect(txs[0].type).toBe('wastage');
    });
  });

  describe('4. Low Stock, Overdue Lab Alerts & Deduplication', () => {
    it('detects low stock items and overdue lab orders', () => {
      const lowStock = getLowStockItems(DEFAULT_EGYPT_ORG.id);
      expect(lowStock.length).toBeGreaterThan(0);

      // Create an overdue lab order
      const overdueOrder = createLabOrder({
        patientId: 'pat_overdue',
        doctorId: 'prof_doc_01',
        serviceId: 'srv_overdue',
        teeth: ['36'],
        deliveryDate: '2020-01-01', // Past date
      });

      const overdueLabs = getOverdueLabOrders(DEFAULT_EGYPT_ORG.id);
      const found = overdueLabs.find((o) => o.id === overdueOrder.id);
      expect(found).toBeDefined();
    });

    it('triggers notifications and deduplicates repeat triggers within throttle window', () => {
      const res1 = checkAndTriggerLowStockAndOverdueAlerts(DEFAULT_EGYPT_ORG.id, CAIRO_BRANCH_ID, 'usr_sys_01');
      expect(res1.triggeredLowStockCount).toBeGreaterThan(0);

      // Immediate second trigger should deduplicate and return 0
      const res2 = checkAndTriggerLowStockAndOverdueAlerts(DEFAULT_EGYPT_ORG.id, CAIRO_BRANCH_ID, 'usr_sys_01');
      expect(res2.triggeredLowStockCount).toBe(0);
      expect(res2.triggeredOverdueLabCount).toBe(0);
    });
  });

  describe('5. Manager Inventory & Valuation Summary Report', () => {
    it('generates summary report with valuation and category breakdowns', () => {
      const report = getInventorySummaryReport(DEFAULT_EGYPT_ORG.id);

      expect(report.total_items_count).toBeGreaterThan(0);
      expect(report.total_valuation_egp).toBeGreaterThan(0);
      expect(report.category_breakdown.dental_materials.count).toBeGreaterThan(0);
    });
  });
});
