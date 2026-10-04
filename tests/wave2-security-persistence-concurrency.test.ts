import { describe, test, expect, beforeEach } from 'vitest';
import {
  getStoredInventoryItems,
  getStoredInventoryTransactions,
  receiveInventory,
  transferInventory,
  recordMaterialConsumption,
  adjustInventory,
  getLowStockItems,
  getOverdueLabOrders,
  getInventorySummaryReport,
  createModificationRequest,
  respondToModificationRequest,
  getStoredModificationRequests,
  createOrUpdateFittingRecord,
  getStoredFittingRecords,
  INVENTORY_STORAGE_KEYS,
  runAtomicInventoryOperation,
} from '../src/lib/inventoryStorage';
import { validateWave2Authorization, validateServerAuthorization, validateAppointmentAuthorization } from '../src/lib/ai/serverAuth';
import { DEFAULT_EGYPT_ORG } from '../src/lib/storage';

const CAIRO_BRANCH_ID = '11111111-1111-1111-1111-111111111111';
const ALEX_BRANCH_ID = '22222222-2222-2222-2222-222222222222';
const FORGED_ORG_ID = '99999999-9999-9999-9999-999999999999';
const FORGED_BRANCH_ID = '88888888-8888-8888-8888-888888888888';

describe('Wave 2: Security, Storage, Branch Isolation & Concurrency Engine', () => {
  beforeEach(() => {
    // Clear legacy localStorage keys if present
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        Object.values(INVENTORY_STORAGE_KEYS).forEach((k) => window.localStorage.removeItem(k));
      } catch {
        // ignore
      }
    }
  });

  // --------------------------------------------------------------------------
  // 1. LOCAL STORAGE & SENSITIVE DATA CHECK
  // --------------------------------------------------------------------------
  test('PART 1: Sensitive Wave 2 data is NOT written to localStorage', () => {
    // Execute inventory and fitting operations
    receiveInventory({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: CAIRO_BRANCH_ID,
      inventoryItemId: 'inv_001',
      quantity: 10,
      unitCost: 450,
      actorUserId: 'staff_cairo_01',
    });

    createModificationRequest({
      labOrderId: 'lab_001',
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: CAIRO_BRANCH_ID,
      reason: 'Shade adjustment needed',
      requestedChange: 'Change shade from A2 to A1',
      requesterId: 'doc_cairo_01',
      requesterName: 'Dr. Ahmed',
      requesterRole: 'doctor',
    });

    if (typeof window !== 'undefined' && window.localStorage) {
      Object.values(INVENTORY_STORAGE_KEYS).forEach((key) => {
        expect(window.localStorage.getItem(key)).toBeNull();
      });
    }
  });

  // --------------------------------------------------------------------------
  // 2. SERVER AUTHORIZATION & FORGED IDENTITY REJECTION
  // --------------------------------------------------------------------------
  test('PART 2: Rejects requests with missing or invalid token', async () => {
    const res = await validateWave2Authorization({
      authorizationHeader: undefined,
      action: 'inventory_write',
    });
    expect(res.authorized).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  test('PART 2: Rejects forged organization_id header', async () => {
    const res = await validateWave2Authorization({
      authorizationHeader: 'Bearer prof_rec_01',
      organizationIdHeader: FORGED_ORG_ID,
      action: 'inventory_write',
    });
    expect(res.authorized).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.error).toContain('Cross-organization access violation');
  });

  test('PART 2: Rejects forged branch_id scope for branch-limited staff', async () => {
    const res = await validateWave2Authorization({
      authorizationHeader: 'Bearer prof_rec_01', // Cairo Receptionist
      targetBranchId: ALEX_BRANCH_ID, // Alexandria branch
      action: 'inventory_write',
    });
    expect(res.authorized).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.error).toContain('Unauthorized branch scope access');
  });

  test('PART 2: Center Manager is authorized across branches', async () => {
    const res = await validateWave2Authorization({
      authorizationHeader: 'Bearer prof_cm_01', // Center Manager
      targetBranchId: ALEX_BRANCH_ID,
      action: 'inventory_write',
    });
    expect(res.authorized).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.context?.isOrgWideManager).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 3. ROLE SCOPE ISOLATION (LAB & DELIVERY USERS & PATIENTS)
  // --------------------------------------------------------------------------
  test('PART 4 & 5: Lab Tech and Delivery Courier cannot execute financial/cost writes', async () => {
    const labRes = await validateWave2Authorization({
      authorizationHeader: 'Bearer prof_lab_01',
      action: 'lab_cost_write',
    });
    expect(labRes.authorized).toBe(false);
    expect(labRes.statusCode).toBe(403);

    const devRes = await validateWave2Authorization({
      authorizationHeader: 'Bearer prof_del_01',
      action: 'inventory_write',
    });
    expect(devRes.authorized).toBe(false);
    expect(devRes.statusCode).toBe(403);
  });


  // --------------------------------------------------------------------------
  // 4. BRANCH & ORGANIZATION ISOLATION IN STOCK MUTATIONS
  // --------------------------------------------------------------------------
  test('PART 3: Stock mutation prevents cross-branch modification', () => {
    // inv_001 belongs to CAIRO_BRANCH_ID
    const res = receiveInventory({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: ALEX_BRANCH_ID, // Wrong branch
      inventoryItemId: 'inv_001',
      quantity: 5,
      actorUserId: 'staff_alex_01',
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('لا يمكن استلام مخزون لفرع آخر');
  });

  test('PART 3: Stock mutation prevents cross-organization modification', () => {
    const res = recordMaterialConsumption({
      organizationId: FORGED_ORG_ID, // Wrong org
      branchId: CAIRO_BRANCH_ID,
      inventoryItemId: 'inv_001',
      quantity: 2,
      actorUserId: 'staff_cairo_01',
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('صنف المخزون غير موجود');
  });

  // --------------------------------------------------------------------------
  // 5. ATOMIC CONCURRENCY & NEGATIVE STOCK PREVENTION
  // --------------------------------------------------------------------------
  test('PART 6: Negative stock is rejected and stock remains untouched', () => {
    const items = getStoredInventoryItems(DEFAULT_EGYPT_ORG.id, CAIRO_BRANCH_ID);
    const item001 = items.find((i) => i.id === 'inv_001');
    const startQty = item001?.current_quantity || 0;

    // Request consumption greater than current stock
    const res = recordMaterialConsumption({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: CAIRO_BRANCH_ID,
      inventoryItemId: 'inv_001',
      quantity: startQty + 100,
      actorUserId: 'staff_cairo_01',
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('غير كافية للاستهلاك');

    // Verify current quantity was NOT modified
    const endItems = getStoredInventoryItems(DEFAULT_EGYPT_ORG.id, CAIRO_BRANCH_ID);
    const endItem001 = endItems.find((i) => i.id === 'inv_001');
    expect(endItem001?.current_quantity).toBe(startQty);
  });

  test('PART 6: Concurrent stock consumption requests serialize safely and reject overdrafts', async () => {
    const items = getStoredInventoryItems(DEFAULT_EGYPT_ORG.id, CAIRO_BRANCH_ID);
    const item001 = items.find((i) => i.id === 'inv_001');
    const startQty = item001?.current_quantity || 15;

    // Fire 3 parallel consumption requests for startQty each
    const req1 = runAtomicInventoryOperation(() =>
      recordMaterialConsumption({
        organizationId: DEFAULT_EGYPT_ORG.id,
        branchId: CAIRO_BRANCH_ID,
        inventoryItemId: 'inv_001',
        quantity: startQty,
        actorUserId: 'staff_cairo_01',
      })
    );

    const req2 = runAtomicInventoryOperation(() =>
      recordMaterialConsumption({
        organizationId: DEFAULT_EGYPT_ORG.id,
        branchId: CAIRO_BRANCH_ID,
        inventoryItemId: 'inv_001',
        quantity: startQty,
        actorUserId: 'staff_cairo_02',
      })
    );

    const [res1, res2] = await Promise.all([req1, req2]);

    // Exactly one should succeed, and one should be rejected due to insufficient stock
    expect(res1.success || res2.success).toBe(true);
    expect(res1.success && res2.success).toBe(false);

    const finalItems = getStoredInventoryItems(DEFAULT_EGYPT_ORG.id, CAIRO_BRANCH_ID);
    const finalItem = finalItems.find((i) => i.id === 'inv_001');
    expect(finalItem?.current_quantity).toBe(0);
  });

  test('PART 6: Inter-branch transfer correctly updates source and destination stock', () => {
    // Restock item to guarantee available balance for transfer
    receiveInventory({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: CAIRO_BRANCH_ID,
      inventoryItemId: 'inv_001',
      quantity: 50,
      actorUserId: 'staff_cairo_01',
    });

    const cairoItems = getStoredInventoryItems(DEFAULT_EGYPT_ORG.id, CAIRO_BRANCH_ID);
    const cairoComp = cairoItems.find((i) => i.id === 'inv_001');
    const startCairoQty = cairoComp?.current_quantity || 50;

    const res = transferInventory({
      organizationId: DEFAULT_EGYPT_ORG.id,
      fromBranchId: CAIRO_BRANCH_ID,
      toBranchId: ALEX_BRANCH_ID,
      inventoryItemId: 'inv_001',
      quantity: 10,
      actorUserId: 'staff_cairo_01',
    });

    expect(res.success).toBe(true);
    expect(res.sourceItem?.current_quantity).toBe(startCairoQty - 10);
    expect(res.destItem?.branch_id).toBe(ALEX_BRANCH_ID);
    expect(res.destItem?.current_quantity).toBeGreaterThanOrEqual(10);
  });

  // --------------------------------------------------------------------------
  // 6. IMMUTABLE AUDIT LEDGER
  // --------------------------------------------------------------------------
  test('PART 7: Stock operations append to immutable transaction ledger', () => {
    const txBefore = getStoredInventoryTransactions(DEFAULT_EGYPT_ORG.id, CAIRO_BRANCH_ID, 'inv_001');
    const startTxCount = txBefore.length;

    receiveInventory({
      organizationId: DEFAULT_EGYPT_ORG.id,
      branchId: CAIRO_BRANCH_ID,
      inventoryItemId: 'inv_001',
      quantity: 25,
      unitCost: 450,
      notes: 'Audit test batch receive',
      actorUserId: 'staff_cairo_01',
      actorUserName: 'Mona Staff',
    });

    const txAfter = getStoredInventoryTransactions(DEFAULT_EGYPT_ORG.id, CAIRO_BRANCH_ID, 'inv_001');
    expect(txAfter.length).toBe(startTxCount + 1);

    const latestTx = txAfter[0];
    expect(latestTx.type).toBe('receive');
    expect(latestTx.quantity).toBe(25);
    expect(latestTx.created_by).toBe('staff_cairo_01');
    expect(latestTx.created_by_name).toBe('Mona Staff');
  });

  // --------------------------------------------------------------------------
  // 7. REGRESSION VERIFICATION (PHASE 6, 10, 11 & WAVE 1)
  // --------------------------------------------------------------------------
  test('REGRESSION: Phase 10 server authorization remains fully operational', async () => {
    const p10Res = await validateServerAuthorization({
      authorizationHeader: 'Bearer token_a1111111-1111-1111-1111-111111111111',
      targetPatientIdBody: 'a1111111-1111-1111-1111-111111111111',
      organizationIdBody: DEFAULT_EGYPT_ORG.id,
    });
    expect(p10Res.authorized).toBe(true);
  });

  test('REGRESSION: Phase 11 appointment authorization remains fully operational', async () => {
    const p11Res = await validateAppointmentAuthorization({
      authorizationHeader: 'Bearer prof_rec_01',
      branchId: CAIRO_BRANCH_ID,
      organizationIdHeader: DEFAULT_EGYPT_ORG.id,
    });
    expect(p11Res.authorized).toBe(true);
    expect(p11Res.userType).toBe('staff');
  });


  test('REGRESSION: Manager inventory summary report calculates valuation and low-stock correctly', () => {
    const report = getInventorySummaryReport(DEFAULT_EGYPT_ORG.id);
    expect(report.total_items_count).toBeGreaterThan(0);
    expect(report.total_valuation_egp).toBeGreaterThan(0);
    expect(typeof report.low_stock_count).toBe('number');
  });
});
