/**
 * Wave 2: Advanced Prosthetics, Lab Operations & Inventory Engine
 * Storage, Business Logic, Stock Ledger & Cost Allocation — Egypt
 */

import {
  InventoryItem,
  InventoryCategory,
  InventoryUnit,
  InventoryTransaction,
  InventoryTransactionType,
  InventorySummaryReport,
  ProstheticModificationRequest,
  ProstheticFittingRecord,
  ProstheticTrialResult,
} from '../types/inventory';
import { LabOrder } from '../types/clinical';
import { DEFAULT_EGYPT_ORG } from './storage';
import { getStoredLabOrders, setStoredLabOrders } from './clinicalStorage';
import { recordLabMaterialCost } from './receptionAndBillingStorage';
import { createNotification } from './notificationStorage';
import { supabase } from './supabase';

export const INVENTORY_STORAGE_KEYS = {
  INVENTORY_ITEMS: 'dental_saas_inventory_items',
  INVENTORY_TRANSACTIONS: 'dental_saas_inventory_transactions',
  PROSTHETIC_MODIFICATIONS: 'dental_saas_prosthetic_modifications',
  PROSTHETIC_FITTINGS: 'dental_saas_prosthetic_fittings',
  NOTIFICATION_ALERT_LOGS: 'dental_saas_inventory_alert_logs',
};

const memoryStore = new Map<string, string>();

// Clean up any historical sensitive Wave 2 keys from window.localStorage if present
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    Object.values(INVENTORY_STORAGE_KEYS).forEach((key) => {
      window.localStorage.removeItem(key);
    });
  } catch {
    // ignore iframe restricted localStorage access errors
  }
}

// In-memory safeStorage: MUST NEVER persist sensitive Wave 2 data to window.localStorage
const safeStorage = {
  getItem: (key: string): string | null => {
    return memoryStore.get(key) || null;
  },
  setItem: (key: string, value: string): void => {
    memoryStore.set(key, value);
  },
  removeItem: (key: string): void => {
    memoryStore.delete(key);
  },
};

let lockPromise: Promise<unknown> = Promise.resolve();

/**
 * Serializes stock operations in-memory to guarantee atomic execution and prevent race conditions.
 */
export function runAtomicInventoryOperation<T>(fn: () => T | Promise<T>): Promise<T> {
  const result = lockPromise.then(() => fn());
  lockPromise = result.catch(() => {});
  return result;
}


const CAIRO_BRANCH_ID = '11111111-1111-1111-1111-111111111111';
const ALEX_BRANCH_ID = '22222222-2222-2222-2222-222222222222';

export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: 'inv_001',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: CAIRO_BRANCH_ID,
    item_name_ar: 'حشوة كومبوزيت تجميلية A2 (3M Filtek)',
    item_name_en: 'Composite Resin Restorative A2 (3M Filtek)',
    category: 'dental_materials',
    sku: 'MAT-COMP-A2',
    unit: 'box',
    supplier_id: 'sup_002',
    supplier_name: 'شركة النيل للمستلزمات والادوات الطبية',
    opening_quantity: 20,
    current_quantity: 15,
    minimum_reorder_level: 5,
    unit_cost: 450.0,
    active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-20T10:00:00Z',
  },
  {
    id: 'inv_002',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: CAIRO_BRANCH_ID,
    item_name_ar: 'تخدير موضعى أرتيكايين 4% (سيبتوكاين)',
    item_name_en: 'Local Anesthesia Articaine 4% (Septocaine)',
    category: 'dental_materials',
    sku: 'MAT-ANES-ART',
    unit: 'carpule',
    supplier_id: 'sup_002',
    supplier_name: 'شركة النيل للمستلزمات والادوات الطبية',
    opening_quantity: 100,
    current_quantity: 80,
    minimum_reorder_level: 30,
    unit_cost: 18.0,
    active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-22T14:00:00Z',
  },
  {
    id: 'inv_003',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: CAIRO_BRANCH_ID,
    item_name_ar: 'قرص زركونيا A1 مقاس 98 مم',
    item_name_en: 'Zirconia Blank A1 98mm Disc',
    category: 'prosthetic_supplies',
    sku: 'PROS-ZIR-A1',
    unit: 'piece',
    supplier_id: 'sup_001',
    supplier_name: 'معمل القاهرة المتقدم لتركيبات الأسنان',
    opening_quantity: 10,
    current_quantity: 3, // Low stock threshold 5
    minimum_reorder_level: 5,
    unit_cost: 1200.0,
    active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-25T11:00:00Z',
  },
  {
    id: 'inv_004',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: CAIRO_BRANCH_ID,
    item_name_ar: 'زرعة أسنان شتراومان عظمية 4.1 مم',
    item_name_en: 'Straumann Bone Level Implant 4.1mm',
    category: 'implant_components',
    sku: 'IMP-STR-41',
    unit: 'piece',
    supplier_id: 'sup_003',
    supplier_name: 'شركة الدلتا لزراعة ومستلزمات الأسنان',
    opening_quantity: 10,
    current_quantity: 8,
    minimum_reorder_level: 3,
    unit_cost: 3500.0,
    active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-26T16:00:00Z',
  },
  {
    id: 'inv_005',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: ALEX_BRANCH_ID,
    item_name_ar: 'بودرة الجينات أخذ الطبعات (500 جرام)',
    item_name_en: 'Dental Impression Alginate Powder (500g)',
    category: 'dental_materials',
    sku: 'MAT-ALG-500',
    unit: 'pack',
    supplier_id: 'sup_002',
    supplier_name: 'شركة النيل للمستلزمات والادوات الطبية',
    opening_quantity: 15,
    current_quantity: 12,
    minimum_reorder_level: 4,
    unit_cost: 220.0,
    active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-21T09:00:00Z',
  },
  {
    id: 'inv_006',
    organization_id: DEFAULT_EGYPT_ORG.id,
    branch_id: ALEX_BRANCH_ID,
    item_name_ar: 'مبرد علاج جذور دوار (بروتايبر جولد)',
    item_name_en: 'Endodontic Rotary Files (Protaper Gold)',
    category: 'dental_materials',
    sku: 'MAT-ENDO-PTG',
    unit: 'set',
    supplier_id: 'sup_002',
    supplier_name: 'شركة النيل للمستلزمات والادوات الطبية',
    opening_quantity: 10,
    current_quantity: 2, // Low stock threshold 5
    minimum_reorder_level: 5,
    unit_cost: 650.0,
    active: true,
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-24T15:00:00Z',
  },
];

// ============================================================================
// INVENTORY STORAGE & READ / WRITE HELPERS
// ============================================================================

export function getStoredInventoryItems(organizationId?: string, branchId?: string): InventoryItem[] {
  const orgId = organizationId || DEFAULT_EGYPT_ORG.id;
  const raw = safeStorage.getItem(INVENTORY_STORAGE_KEYS.INVENTORY_ITEMS);
  let list: InventoryItem[] = [];
  if (!raw) {
    list = INITIAL_INVENTORY_ITEMS;
    safeStorage.setItem(INVENTORY_STORAGE_KEYS.INVENTORY_ITEMS, JSON.stringify(list));
  } else {
    try {
      list = JSON.parse(raw);
    } catch {
      list = INITIAL_INVENTORY_ITEMS;
    }
  }

  return list.filter((item) => {
    if (orgId && item.organization_id !== orgId) return false;
    if (branchId && item.branch_id !== branchId) return false;
    return true;
  });
}

export function setStoredInventoryItems(items: InventoryItem[]): void {
  safeStorage.setItem(INVENTORY_STORAGE_KEYS.INVENTORY_ITEMS, JSON.stringify(items));
  if (supabase) {
    Promise.resolve(supabase.from('inventory_items').upsert(items)).catch(() => {});
  }
}

export function getStoredInventoryTransactions(
  organizationId?: string,
  branchId?: string,
  itemId?: string
): InventoryTransaction[] {
  const orgId = organizationId || DEFAULT_EGYPT_ORG.id;
  const raw = safeStorage.getItem(INVENTORY_STORAGE_KEYS.INVENTORY_TRANSACTIONS);
  let list: InventoryTransaction[] = raw ? JSON.parse(raw) : [];

  return list.filter((tx) => {
    if (orgId && tx.organization_id !== orgId) return false;
    if (branchId && tx.branch_id !== branchId) return false;
    if (itemId && tx.inventory_item_id !== itemId) return false;
    return true;
  });
}

export function setStoredInventoryTransactions(transactions: InventoryTransaction[]): void {
  safeStorage.setItem(INVENTORY_STORAGE_KEYS.INVENTORY_TRANSACTIONS, JSON.stringify(transactions));
  if (supabase) {
    Promise.resolve(supabase.from('inventory_transactions').upsert(transactions)).catch(() => {});
  }
}

// ============================================================================
// INVENTORY CORE TRANSACTIONS (RECEIVE, TRANSFER, CONSUMPTION, ADJUSTMENT)
// ============================================================================

export function saveInventoryItem(
  itemParams: Partial<InventoryItem> & {
    organization_id: string;
    branch_id: string;
    item_name_ar: string;
    item_name_en: string;
    category: InventoryCategory;
    unit: InventoryUnit;
    unit_cost: number;
  },
  actorUserId?: string
): InventoryItem {
  const items = getStoredInventoryItems();
  const now = new Date().toISOString();

  if (itemParams.id) {
    const idx = items.findIndex((i) => i.id === itemParams.id);
    if (idx !== -1) {
      const updated: InventoryItem = {
        ...items[idx],
        ...itemParams,
        updated_at: now,
      };
      items[idx] = updated;
      setStoredInventoryItems(items);
      return updated;
    }
  }

  const newItem: InventoryItem = {
    id: `inv_item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    organization_id: itemParams.organization_id,
    branch_id: itemParams.branch_id,
    item_name_ar: itemParams.item_name_ar,
    item_name_en: itemParams.item_name_en,
    category: itemParams.category,
    sku: itemParams.sku || `SKU-${Date.now().toString().slice(-6)}`,
    unit: itemParams.unit,
    supplier_id: itemParams.supplier_id,
    supplier_name: itemParams.supplier_name,
    opening_quantity: itemParams.opening_quantity || 0,
    current_quantity: itemParams.current_quantity ?? itemParams.opening_quantity ?? 0,
    minimum_reorder_level: itemParams.minimum_reorder_level ?? 5,
    unit_cost: itemParams.unit_cost,
    active: itemParams.active ?? true,
    created_at: now,
    updated_at: now,
  };

  items.unshift(newItem);
  setStoredInventoryItems(items);
  return newItem;
}

export function receiveInventory(params: {
  organizationId: string;
  branchId: string;
  inventoryItemId: string;
  quantity: number;
  unitCost?: number;
  supplierId?: string;
  supplierName?: string;
  notes?: string;
  actorUserId: string;
  actorUserName?: string;
}): { success: boolean; item?: InventoryItem; transaction?: InventoryTransaction; error?: string } {
  if (params.quantity <= 0) {
    return { success: false, error: 'كمية الاستلام يجب أن تكون أكبر من صفر' };
  }

  const items = getStoredInventoryItems();
  const itemIndex = items.findIndex(
    (i) => i.id === params.inventoryItemId && i.organization_id === params.organizationId
  );
  if (itemIndex === -1) {
    return { success: false, error: 'صنف المخزون غير موجود' };
  }

  const item = { ...items[itemIndex] };
  if (item.branch_id !== params.branchId) {
    return { success: false, error: 'لا يمكن استلام مخزون لفرع آخر' };
  }

  const effectiveUnitCost = params.unitCost ?? item.unit_cost;
  const newQuantity = item.current_quantity + params.quantity;
  item.current_quantity = newQuantity;
  item.unit_cost = effectiveUnitCost;
  if (params.supplierId) item.supplier_id = params.supplierId;
  if (params.supplierName) item.supplier_name = params.supplierName;
  item.updated_at = new Date().toISOString();

  items[itemIndex] = item;
  setStoredInventoryItems(items);

  const tx: InventoryTransaction = {
    id: `inv_tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    organization_id: params.organizationId,
    branch_id: params.branchId,
    inventory_item_id: item.id,
    item_name_ar: item.item_name_ar,
    item_name_en: item.item_name_en,
    type: 'receive',
    quantity: params.quantity,
    unit_cost: effectiveUnitCost,
    total_cost: Math.round(params.quantity * effectiveUnitCost * 100) / 100,
    notes: params.notes || `استلام شحنة جديدة (${params.quantity} ${item.unit})`,
    created_by: params.actorUserId,
    created_by_name: params.actorUserName,
    created_at: new Date().toISOString(),
    quantity_after: newQuantity,
  };

  const transactions = getStoredInventoryTransactions();
  transactions.unshift(tx);
  setStoredInventoryTransactions(transactions);

  return { success: true, item, transaction: tx };
}

export function transferInventory(params: {
  organizationId: string;
  fromBranchId: string;
  toBranchId: string;
  inventoryItemId: string;
  quantity: number;
  notes?: string;
  actorUserId: string;
  actorUserName?: string;
}): { success: boolean; sourceItem?: InventoryItem; destItem?: InventoryItem; error?: string } {
  if (params.fromBranchId === params.toBranchId) {
    return { success: false, error: 'لا يمكن تحويل المخزون لنفس الفرع' };
  }
  if (params.quantity <= 0) {
    return { success: false, error: 'كمية التحويل يجب أن تكون أكبر من صفر' };
  }

  const allItems = getStoredInventoryItems();
  const sourceIndex = allItems.findIndex(
    (i) => i.id === params.inventoryItemId && i.branch_id === params.fromBranchId && i.organization_id === params.organizationId
  );
  if (sourceIndex === -1) {
    return { success: false, error: 'صنف المخزون غير متوفر بالفرع المحول منه' };
  }

  const sourceItem = { ...allItems[sourceIndex] };
  if (sourceItem.current_quantity < params.quantity) {
    return {
      success: false,
      error: `الرصيد المتاح بالفرع (${sourceItem.current_quantity}) غير كافٍ لتحويل (${params.quantity})`,
    };
  }

  // Deduct from source branch
  sourceItem.current_quantity -= params.quantity;
  sourceItem.updated_at = new Date().toISOString();
  allItems[sourceIndex] = sourceItem;

  // Find or create item at destination branch
  let destIndex = allItems.findIndex(
    (i) => i.sku === sourceItem.sku && i.branch_id === params.toBranchId && i.organization_id === params.organizationId
  );

  let destItem: InventoryItem;
  if (destIndex !== -1) {
    destItem = { ...allItems[destIndex] };
    destItem.current_quantity += params.quantity;
    destItem.updated_at = new Date().toISOString();
    allItems[destIndex] = destItem;
  } else {
    destItem = {
      ...sourceItem,
      id: `inv_item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      branch_id: params.toBranchId,
      opening_quantity: 0,
      current_quantity: params.quantity,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    allItems.unshift(destItem);
  }

  setStoredInventoryItems(allItems);

  // Record transfer transaction
  const tx: InventoryTransaction = {
    id: `inv_tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    organization_id: params.organizationId,
    branch_id: params.fromBranchId,
    from_branch_id: params.fromBranchId,
    to_branch_id: params.toBranchId,
    inventory_item_id: sourceItem.id,
    item_name_ar: sourceItem.item_name_ar,
    item_name_en: sourceItem.item_name_en,
    type: 'transfer',
    quantity: params.quantity,
    unit_cost: sourceItem.unit_cost,
    total_cost: Math.round(params.quantity * sourceItem.unit_cost * 100) / 100,
    notes: params.notes || `تحويل مخزون بين الفروع (${params.quantity} ${sourceItem.unit})`,
    created_by: params.actorUserId,
    created_by_name: params.actorUserName,
    created_at: new Date().toISOString(),
    quantity_after: sourceItem.current_quantity,
  };

  const transactions = getStoredInventoryTransactions();
  transactions.unshift(tx);
  setStoredInventoryTransactions(transactions);

  return { success: true, sourceItem, destItem };
}

export function recordMaterialConsumption(params: {
  organizationId: string;
  branchId: string;
  inventoryItemId: string;
  quantity: number;
  treatmentServiceId?: string;
  invoiceId?: string;
  patientId?: string;
  doctorId?: string;
  notes?: string;
  actorUserId: string;
  actorUserName?: string;
}): { success: boolean; item?: InventoryItem; totalCost?: number; error?: string } {
  if (params.quantity <= 0) {
    return { success: false, error: 'كمية الاستهلاك يجب أن تكون أكبر من صفر' };
  }

  const items = getStoredInventoryItems();
  const idx = items.findIndex((i) => i.id === params.inventoryItemId && i.organization_id === params.organizationId);
  if (idx === -1) {
    return { success: false, error: 'صنف المخزون غير موجود' };
  }

  const item = { ...items[idx] };
  if (item.branch_id !== params.branchId) {
    return { success: false, error: 'لا يمكن استهلاك مخزون فرع آخر' };
  }

  if (item.current_quantity < params.quantity) {
    return {
      success: false,
      error: `الكمية المتاحة بالمخزون (${item.current_quantity}) غير كافية للاستهلاك (${params.quantity})`,
    };
  }

  item.current_quantity -= params.quantity;
  item.updated_at = new Date().toISOString();
  items[idx] = item;
  setStoredInventoryItems(items);

  const totalCost = Math.round(params.quantity * item.unit_cost * 100) / 100;

  const tx: InventoryTransaction = {
    id: `inv_tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    organization_id: params.organizationId,
    branch_id: params.branchId,
    inventory_item_id: item.id,
    item_name_ar: item.item_name_ar,
    item_name_en: item.item_name_en,
    type: 'consumption',
    quantity: params.quantity,
    unit_cost: item.unit_cost,
    total_cost: totalCost,
    reference_id: params.invoiceId || params.treatmentServiceId,
    notes: params.notes || `استهلاك مستلزمات طبية بالإجراء السريري`,
    created_by: params.actorUserId,
    created_by_name: params.actorUserName,
    created_at: new Date().toISOString(),
    quantity_after: item.current_quantity,
  };

  const transactions = getStoredInventoryTransactions();
  transactions.unshift(tx);
  setStoredInventoryTransactions(transactions);

  // Sync to billing cost management if invoiceId is provided
  if (params.invoiceId) {
    recordLabMaterialCost(
      {
        organization_id: params.organizationId,
        branch_id: params.branchId,
        type: 'material',
        supplier_vendor: item.supplier_name || 'شركة المستلزمات الطبية',
        item_name_ar: `${item.item_name_ar} (${params.quantity} ${item.unit})`,
        item_name_en: `${item.item_name_en} (${params.quantity} ${item.unit})`,
        quantity: params.quantity,
        unit_cost: item.unit_cost,
        actual_cost: totalCost,
        invoice_id: params.invoiceId,
        notes: `استهلاك مخزون تلقائي`,
      },
      params.actorUserId
    );
  }

  return { success: true, item, totalCost };
}

export function adjustInventory(params: {
  organizationId: string;
  branchId: string;
  inventoryItemId: string;
  newQuantity: number;
  type: 'adjustment' | 'return' | 'wastage';
  notes?: string;
  actorUserId: string;
  actorUserName?: string;
}): { success: boolean; item?: InventoryItem; error?: string } {
  if (params.newQuantity < 0) {
    return { success: false, error: 'الرصيد الجديد لا يمكن أن يكون بالسالب' };
  }

  const items = getStoredInventoryItems();
  const idx = items.findIndex((i) => i.id === params.inventoryItemId && i.organization_id === params.organizationId);
  if (idx === -1) {
    return { success: false, error: 'صنف المخزون غير موجود' };
  }

  const item = { ...items[idx] };
  if (item.branch_id !== params.branchId) {
    return { success: false, error: 'لا يمكن تسوية مخزون فرع آخر' };
  }

  const diff = params.newQuantity - item.current_quantity;
  item.current_quantity = params.newQuantity;
  item.updated_at = new Date().toISOString();
  items[idx] = item;
  setStoredInventoryItems(items);

  const tx: InventoryTransaction = {
    id: `inv_tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    organization_id: params.organizationId,
    branch_id: params.branchId,
    inventory_item_id: item.id,
    item_name_ar: item.item_name_ar,
    item_name_en: item.item_name_en,
    type: params.type,
    quantity: Math.abs(diff),
    unit_cost: item.unit_cost,
    total_cost: Math.round(Math.abs(diff) * item.unit_cost * 100) / 100,
    notes: params.notes || `تعديل تسوية مخزون يدوي (${params.type})`,
    created_by: params.actorUserId,
    created_by_name: params.actorUserName,
    created_at: new Date().toISOString(),
    quantity_after: params.newQuantity,
  };

  const transactions = getStoredInventoryTransactions();
  transactions.unshift(tx);
  setStoredInventoryTransactions(transactions);

  return { success: true, item };
}


// ============================================================================
// LOW STOCK & OVERDUE LAB ALERTS WITH DEDUPLICATION
// ============================================================================

export function getLowStockItems(organizationId?: string, branchId?: string): InventoryItem[] {
  const items = getStoredInventoryItems(organizationId, branchId);
  return items.filter((i) => i.active && i.current_quantity <= i.minimum_reorder_level);
}

export function getOverdueLabOrders(organizationId?: string, branchId?: string): LabOrder[] {
  const orders = getStoredLabOrders();
  const nowStr = new Date().toISOString().split('T')[0];

  return orders.filter((o) => {
    if (organizationId && o.organization_id !== organizationId) return false;
    if (branchId && o.branch_id !== branchId) return false;
    if (o.status === 'delivered' || o.status === 'fitted' || o.status === 'cancelled') return false;

    const targetDate = (o.required_delivery_date || o.delivery_date || '').split('T')[0];
    return targetDate && targetDate < nowStr;
  });
}

export function checkAndTriggerLowStockAndOverdueAlerts(
  organizationId: string,
  branchId?: string,
  actorUserId?: string
): { triggeredLowStockCount: number; triggeredOverdueLabCount: number } {
  const rawLogs = safeStorage.getItem(INVENTORY_STORAGE_KEYS.NOTIFICATION_ALERT_LOGS);
  const alertLogs: Record<string, string> = rawLogs ? JSON.parse(rawLogs) : {};
  const now = Date.now();
  const THROTTLE_24H = 86400000;

  let triggeredLowStockCount = 0;
  let triggeredOverdueLabCount = 0;

  // Check low stock items
  const lowStock = getLowStockItems(organizationId, branchId);
  for (const item of lowStock) {
    const alertKey = `low_stock_${item.id}`;
    const lastTrigger = alertLogs[alertKey] ? new Date(alertLogs[alertKey]).getTime() : 0;

    if (now - lastTrigger > THROTTLE_24H) {
      alertLogs[alertKey] = new Date().toISOString();
      triggeredLowStockCount++;

      createNotification({
        organization_id: item.organization_id,
        branch_id: item.branch_id,
        recipient_type: 'role',
        target_role: 'branch_manager',
        type: 'system',
        title_ar: `تنبيه انخفاض مخزون: ${item.item_name_ar}`,
        title_en: `Low Stock Alert: ${item.item_name_en}`,
        message_ar: `وصل رصيد صنف ${item.item_name_ar} إلى (${item.current_quantity} ${item.unit}) وهو أقل من حد إعادة الطلب (${item.minimum_reorder_level}).`,
        message_en: `Item ${item.item_name_en} stock reached (${item.current_quantity} ${item.unit}) which is below min reorder level (${item.minimum_reorder_level}).`,
      });
    }
  }

  // Check overdue lab orders
  const overdueOrders = getOverdueLabOrders(organizationId, branchId);
  for (const order of overdueOrders) {
    const alertKey = `overdue_lab_${order.id}`;
    const lastTrigger = alertLogs[alertKey] ? new Date(alertLogs[alertKey]).getTime() : 0;

    if (now - lastTrigger > THROTTLE_24H) {
      alertLogs[alertKey] = new Date().toISOString();
      triggeredOverdueLabCount++;

      createNotification({
        organization_id: order.organization_id,
        branch_id: order.branch_id,
        recipient_type: 'role',
        target_role: 'prosthetic_coordinator',
        type: 'system',
        title_ar: `تأخير تسليم عمل معملي: ${order.service_name_ar}`,
        title_en: `Overdue Lab Order: ${order.service_name_en}`,
        message_ar: `الطلب رقم ${order.id} ميعاد تسليمه المطلوب كان ${order.required_delivery_date || order.delivery_date} ولم يتم استلامه بعد.`,
        message_en: `Order ${order.id} required delivery date was ${order.required_delivery_date || order.delivery_date} and has not been delivered.`,
      });
    }
  }

  safeStorage.setItem(INVENTORY_STORAGE_KEYS.NOTIFICATION_ALERT_LOGS, JSON.stringify(alertLogs));
  return { triggeredLowStockCount, triggeredOverdueLabCount };
}

// ============================================================================
// MANAGER LAB & INVENTORY SUMMARY REPORT
// ============================================================================

export function getInventorySummaryReport(organizationId: string, branchId?: string): InventorySummaryReport {
  const items = getStoredInventoryItems(organizationId, branchId);
  const transactions = getStoredInventoryTransactions(organizationId, branchId);
  const overdueLabs = getOverdueLabOrders(organizationId, branchId);

  let totalValuation = 0;
  let lowStockCount = 0;

  const categoryBreakdown: Record<InventoryCategory, { count: number; valuation: number }> = {
    dental_materials: { count: 0, valuation: 0 },
    implant_components: { count: 0, valuation: 0 },
    prosthetic_supplies: { count: 0, valuation: 0 },
    office_medical: { count: 0, valuation: 0 },
    other: { count: 0, valuation: 0 },
  };

  for (const item of items) {
    if (!item.active) continue;
    const itemValuation = Math.round(item.current_quantity * item.unit_cost * 100) / 100;
    totalValuation += itemValuation;

    if (item.current_quantity <= item.minimum_reorder_level) {
      lowStockCount++;
    }

    const cat = categoryBreakdown[item.category] || { count: 0, valuation: 0 };
    cat.count++;
    cat.valuation = Math.round((cat.valuation + itemValuation) * 100) / 100;
    categoryBreakdown[item.category] = cat;
  }

  let totalConsumptionEgp = 0;
  for (const tx of transactions) {
    if (tx.type === 'consumption') {
      totalConsumptionEgp += tx.total_cost;
    }
  }

  return {
    total_items_count: items.filter((i) => i.active).length,
    total_valuation_egp: Math.round(totalValuation * 100) / 100,
    low_stock_count: lowStockCount,
    category_breakdown: categoryBreakdown,
    overdue_lab_orders_count: overdueLabs.length,
    total_material_consumption_egp: Math.round(totalConsumptionEgp * 100) / 100,
  };
}

// ============================================================================
// PROSTHETIC MODIFICATION REQUESTS & FITTING RECORDS STORAGE
// ============================================================================

export function getStoredModificationRequests(labOrderId?: string): ProstheticModificationRequest[] {
  const raw = safeStorage.getItem(INVENTORY_STORAGE_KEYS.PROSTHETIC_MODIFICATIONS);
  let list: ProstheticModificationRequest[] = raw ? JSON.parse(raw) : [];

  if (labOrderId) {
    return list.filter((m) => m.lab_order_id === labOrderId);
  }
  return list;
}

export function setStoredModificationRequests(requests: ProstheticModificationRequest[]): void {
  safeStorage.setItem(INVENTORY_STORAGE_KEYS.PROSTHETIC_MODIFICATIONS, JSON.stringify(requests));
  if (supabase) {
    Promise.resolve(supabase.from('prosthetic_modification_requests').upsert(requests)).catch(() => {});
  }
}

export function createModificationRequest(params: {
  labOrderId: string;
  organizationId: string;
  branchId?: string;
  reason: string;
  requestedChange: string;
  requesterId: string;
  requesterName: string;
  requesterRole: string;
}): ProstheticModificationRequest {
  const requests = getStoredModificationRequests();
  const now = new Date().toISOString();

  const newReq: ProstheticModificationRequest = {
    id: `mod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    lab_order_id: params.labOrderId,
    organization_id: params.organizationId,
    branch_id: params.branchId,
    reason: params.reason,
    requested_change: params.requestedChange,
    requester_id: params.requesterId,
    requester_name: params.requesterName,
    requester_role: params.requesterRole,
    response_status: 'pending',
    created_at: now,
    updated_at: now,
  };

  requests.unshift(newReq);
  setStoredModificationRequests(requests);

  // Update lab order status to in_production
  const orders = getStoredLabOrders();
  const target = orders.find((o) => o.id === params.labOrderId);
  if (target) {
    target.status = 'in_production';
    target.lab_notes = `${target.lab_notes || ''}\n[تعديل مطلوب]: ${params.requestedChange}`.trim();
    setStoredLabOrders(orders);
  }

  return newReq;
}

export function respondToModificationRequest(params: {
  requestId: string;
  responseStatus: 'accepted' | 'rejected' | 'completed';
  responseNotes?: string;
  respondedById: string;
  respondedByName?: string;
}): boolean {
  const requests = getStoredModificationRequests();
  const idx = requests.findIndex((r) => r.id === params.requestId);
  if (idx === -1) return false;

  const target = { ...requests[idx] };
  target.response_status = params.responseStatus;
  target.response_notes = params.responseNotes;
  target.responded_by_id = params.respondedById;
  target.responded_by_name = params.respondedByName;
  target.responded_at = new Date().toISOString();
  target.updated_at = new Date().toISOString();

  requests[idx] = target;
  setStoredModificationRequests(requests);
  return true;
}

export function getStoredFittingRecords(labOrderId?: string, patientId?: string): ProstheticFittingRecord[] {
  const raw = safeStorage.getItem(INVENTORY_STORAGE_KEYS.PROSTHETIC_FITTINGS);
  let list: ProstheticFittingRecord[] = raw ? JSON.parse(raw) : [];

  return list.filter((f) => {
    if (labOrderId && f.lab_order_id !== labOrderId) return false;
    if (patientId && f.patient_id !== patientId) return false;
    return true;
  });
}

export function setStoredFittingRecords(records: ProstheticFittingRecord[]): void {
  safeStorage.setItem(INVENTORY_STORAGE_KEYS.PROSTHETIC_FITTINGS, JSON.stringify(records));
  if (supabase) {
    Promise.resolve(supabase.from('prosthetic_fitting_records').upsert(records)).catch(() => {});
  }
}

export function createOrUpdateFittingRecord(params: {
  id?: string;
  organizationId: string;
  branchId: string;
  labOrderId: string;
  treatmentServiceId?: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  trialScheduledAt?: string;
  trialResult: ProstheticTrialResult;
  modificationNotes?: string;
  approvedForFinal?: boolean;
  fittedByDoctorId?: string;
}): ProstheticFittingRecord {
  const records = getStoredFittingRecords();
  const now = new Date().toISOString();

  let target: ProstheticFittingRecord | undefined;
  if (params.id) {
    target = records.find((r) => r.id === params.id);
  } else {
    target = records.find((r) => r.lab_order_id === params.labOrderId);
  }

  if (target) {
    target.trial_result = params.trialResult;
    if (params.trialScheduledAt) target.trial_scheduled_at = params.trialScheduledAt;
    if (params.modificationNotes !== undefined) target.modification_notes = params.modificationNotes;
    if (params.approvedForFinal !== undefined) target.approved_for_final = params.approvedForFinal;
    if (params.trialResult === 'approved_for_final') target.approved_for_final = true;
    if (params.trialResult === 'fitted') {
      target.fitted_at = now;
      target.fitted_by_doctor_id = params.fittedByDoctorId || params.doctorId;

      // Sync lab order status to fitted
      const orders = getStoredLabOrders();
      const labTarget = orders.find((o) => o.id === params.labOrderId);
      if (labTarget) {
        labTarget.status = 'fitted';
        labTarget.updated_at = now;
        setStoredLabOrders(orders);
      }
    }
    target.updated_at = now;
    setStoredFittingRecords(records);
    return target;
  }

  const newRecord: ProstheticFittingRecord = {
    id: `fit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    organization_id: params.organizationId,
    branch_id: params.branchId,
    lab_order_id: params.labOrderId,
    treatment_service_id: params.treatmentServiceId,
    patient_id: params.patientId,
    patient_name: params.patientName,
    doctor_id: params.doctorId,
    doctor_name: params.doctorName,
    trial_scheduled_at: params.trialScheduledAt,
    trial_result: params.trialResult,
    modification_notes: params.modificationNotes,
    approved_for_final: params.approvedForFinal ?? (params.trialResult === 'approved_for_final'),
    fitted_at: params.trialResult === 'fitted' ? now : undefined,
    fitted_by_doctor_id: params.trialResult === 'fitted' ? params.fittedByDoctorId || params.doctorId : undefined,
    created_at: now,
    updated_at: now,
  };

  records.unshift(newRecord);
  setStoredFittingRecords(records);

  if (params.trialResult === 'fitted') {
    const orders = getStoredLabOrders();
    const labTarget = orders.find((o) => o.id === params.labOrderId);
    if (labTarget) {
      labTarget.status = 'fitted';
      labTarget.updated_at = now;
      setStoredLabOrders(orders);
    }
  }

  return newRecord;
}
