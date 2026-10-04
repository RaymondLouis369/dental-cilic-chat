import React, { useState, useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import {
  InventoryItem,
  InventoryCategory,
  InventoryUnit,
  InventoryTransaction,
  InventorySummaryReport,
} from '../../types/inventory';
import {
  getStoredInventoryItems,
  saveInventoryItem,
  receiveInventory,
  transferInventory,
  adjustInventory,
  getStoredInventoryTransactions,
  getLowStockItems,
  getOverdueLabOrders,
  checkAndTriggerLowStockAndOverdueAlerts,
  getInventorySummaryReport,
} from '../../lib/inventoryStorage';
import { getStoredSuppliers } from '../../lib/receptionAndBillingStorage';
import {
  Boxes,
  PackagePlus,
  ArrowRightLeft,
  History,
  AlertTriangle,
  BarChart3,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  AlertCircle,
  Truck,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';

export const InventoryManagementView: React.FC = () => {
  const { language } = useLanguage();
  const { session } = useAuth();
  const profile = session?.profile;
  const userId = profile?.id || 'usr_unknown';
  const isAr = language === 'ar';

  const userOrgId = profile?.organization_id || '00000000-0000-0000-0000-000000000000';
  const userBranchId = profile?.branch_id || '11111111-1111-1111-1111-111111111111';

  const [activeTab, setActiveTab] = useState<'catalog' | 'receive' | 'transfer' | 'audit' | 'reports'>('catalog');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Toast / Status Message
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Forms State
  // 1. Receive Stock Form
  const [receiveItemId, setReceiveItemId] = useState<string>('');
  const [receiveQty, setReceiveQty] = useState<number>(10);
  const [receiveUnitCost, setReceiveUnitCost] = useState<number>(0);
  const [receiveSupplierId, setReceiveSupplierId] = useState<string>('');
  const [receiveNotes, setReceiveNotes] = useState<string>('');

  // 2. Add New Item Form
  const [showNewItemModal, setShowNewItemModal] = useState<boolean>(false);
  const [newItemNameAr, setNewItemNameAr] = useState('');
  const [newItemNameEn, setNewItemNameEn] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<InventoryCategory>('dental_materials');
  const [newItemSku, setNewItemSku] = useState('');
  const [newItemUnit, setNewItemUnit] = useState<InventoryUnit>('box');
  const [newItemSupplierId, setNewItemSupplierId] = useState('');
  const [newItemMinLevel, setNewItemMinLevel] = useState(5);
  const [newItemUnitCost, setNewItemUnitCost] = useState(100);
  const [newItemOpeningQty, setNewItemOpeningQty] = useState(10);

  // 3. Transfer Stock Form
  const [transferItemId, setTransferItemId] = useState('');
  const [transferFromBranch, setTransferFromBranch] = useState('11111111-1111-1111-1111-111111111111');
  const [transferToBranch, setTransferToBranch] = useState('22222222-2222-2222-2222-222222222222');
  const [transferQty, setTransferQty] = useState(1);
  const [transferNotes, setTransferNotes] = useState('');

  // 4. Adjust Stock Modal
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustNewQty, setAdjustNewQty] = useState(0);
  const [adjustType, setAdjustType] = useState<'adjustment' | 'return' | 'wastage'>('adjustment');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Trigger Alerts State
  const [alertSummary, setAlertSummary] = useState<{ triggeredLowStockCount: number; triggeredOverdueLabCount: number } | null>(
    null
  );

  // Suppliers List
  const suppliers = useMemo(() => {
    return getStoredSuppliers(userOrgId);
  }, [userOrgId]);

  // Inventory Items List
  const inventoryItems = useMemo(() => {
    const branchFilter = selectedBranchId === 'all' ? undefined : selectedBranchId;
    return getStoredInventoryItems(userOrgId, branchFilter);
  }, [userOrgId, selectedBranchId, statusMessage, showNewItemModal]);

  // Filtered Catalog Items
  const filteredCatalogItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (showLowStockOnly && item.current_quantity > item.minimum_reorder_level) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameAr = item.item_name_ar.toLowerCase();
        const nameEn = item.item_name_en.toLowerCase();
        const sku = item.sku.toLowerCase();
        return nameAr.includes(q) || nameEn.includes(q) || sku.includes(q);
      }
      return true;
    });
  }, [inventoryItems, selectedCategory, showLowStockOnly, searchQuery]);

  // Transactions Audit Ledger
  const transactions = useMemo(() => {
    const branchFilter = selectedBranchId === 'all' ? undefined : selectedBranchId;
    return getStoredInventoryTransactions(userOrgId, branchFilter);
  }, [userOrgId, selectedBranchId, statusMessage]);

  // Reports Summary
  const summaryReport: InventorySummaryReport = useMemo(() => {
    const branchFilter = selectedBranchId === 'all' ? undefined : selectedBranchId;
    return getInventorySummaryReport(userOrgId, branchFilter);
  }, [userOrgId, selectedBranchId, statusMessage]);

  // Low Stock & Overdue Lab Counts
  const lowStockList = useMemo(() => getLowStockItems(userOrgId), [userOrgId, statusMessage]);
  const overdueLabList = useMemo(() => getOverdueLabOrders(userOrgId), [userOrgId, statusMessage]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleTriggerAlerts = () => {
    if (!profile) return;
    const res = checkAndTriggerLowStockAndOverdueAlerts(userOrgId, undefined, userId);
    setAlertSummary(res);
    showToast(
      'success',
      isAr
        ? `تم فحص وإرسال التنبيهات: (${res.triggeredLowStockCount}) تنبيه مخزون، (${res.triggeredOverdueLabCount}) تنبيه معمل مؤخر`
        : `Alerts checked & sent: ${res.triggeredLowStockCount} low stock, ${res.triggeredOverdueLabCount} overdue lab.`
    );
  };

  const handleReceiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !receiveItemId) {
      showToast('error', isAr ? 'يرجى اختيار صنف المخزون' : 'Please select an item');
      return;
    }

    const selectedSup = suppliers.find((s) => s.id === receiveSupplierId);

    const res = receiveInventory({
      organizationId: userOrgId,
      branchId: userBranchId,
      inventoryItemId: receiveItemId,
      quantity: receiveQty,
      unitCost: receiveUnitCost > 0 ? receiveUnitCost : undefined,
      supplierId: receiveSupplierId,
      supplierName: selectedSup ? selectedSup.name_ar : undefined,
      notes: receiveNotes,
      actorUserId: userId,
      actorUserName: profile.display_name,
    });

    if (res.success) {
      showToast(
        'success',
        isAr
          ? `تم استلام الشحنة بنجاح لصنف ${res.item?.item_name_ar} (الرصيد الحالي: ${res.item?.current_quantity})`
          : `Successfully received shipment.`
      );
      setReceiveQty(10);
      setReceiveNotes('');
    } else {
      showToast('error', res.error || 'فشل في استلام الشحنة');
    }
  };

  const handleCreateNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemNameAr.trim() || !profile) return;

    const selectedSup = suppliers.find((s) => s.id === newItemSupplierId);

    saveInventoryItem(
      {
        organization_id: userOrgId,
        branch_id: userBranchId,
        item_name_ar: newItemNameAr,
        item_name_en: newItemNameEn || newItemNameAr,
        category: newItemCategory,
        sku: newItemSku || `SKU-${Date.now().toString().slice(-6)}`,
        unit: newItemUnit,
        supplier_id: newItemSupplierId,
        supplier_name: selectedSup ? selectedSup.name_ar : undefined,
        opening_quantity: newItemOpeningQty,
        current_quantity: newItemOpeningQty,
        minimum_reorder_level: newItemMinLevel,
        unit_cost: newItemUnitCost,
        active: true,
      },
      userId
    );

    showToast('success', isAr ? 'تم إضافة صنف المخزون الجديد بنجاح' : 'New inventory item created.');
    setShowNewItemModal(false);
    setNewItemNameAr('');
    setNewItemNameEn('');
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !transferItemId) {
      showToast('error', isAr ? 'يرجى اختيار صنف المخزون' : 'Please select an item');
      return;
    }

    const res = transferInventory({
      organizationId: userOrgId,
      fromBranchId: transferFromBranch,
      toBranchId: transferToBranch,
      inventoryItemId: transferItemId,
      quantity: transferQty,
      notes: transferNotes,
      actorUserId: userId,
      actorUserName: profile.display_name,
    });

    if (res.success) {
      showToast('success', isAr ? 'تم تحويل الشحنة بين الفروع بنجاح' : 'Inter-branch transfer complete.');
      setTransferNotes('');
    } else {
      showToast('error', res.error || 'فشل في عملية تحويل المخزون');
    }
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem || !profile) return;

    const res = adjustInventory({
      organizationId: userOrgId,
      branchId: adjustingItem.branch_id,
      inventoryItemId: adjustingItem.id,
      newQuantity: adjustNewQty,
      type: adjustType,
      notes: adjustNotes,
      actorUserId: userId,
      actorUserName: profile.display_name,
    });

    if (res.success) {
      showToast('success', isAr ? 'تم حفظ تسوية المخزون بنجاح' : 'Inventory adjustment saved.');
      setAdjustingItem(null);
    } else {
      showToast('error', res.error || 'فشل تسوية المخزون');
    }
  };

  return (
    <div className="space-y-6 text-slate-100 p-2 md:p-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <div className="p-3 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30">
            <Boxes className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              {isAr ? 'إدارة المخزون الطبي والتركيبات المتقدمة' : 'Advanced Inventory & Prosthetics Management'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {isAr
                ? 'متابعة المستلزمات الطبية، الحركة المخزنية، التحويلات بين الفروع، والتنبيهات الآلية'
                : 'Track materials, stock movements, inter-branch transfers, and low-stock alerts'}
            </p>
          </div>
        </div>

        {/* Quick Alert Status & Trigger */}
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-700">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {isAr
                ? `${lowStockList.length} أصناف منخفضة • ${overdueLabList.length} أعمال معمل مؤخرة`
                : `${lowStockList.length} Low stock • ${overdueLabList.length} Overdue lab`}
            </span>
          </div>

          <button
            onClick={handleTriggerAlerts}
            className="px-3.5 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-xl text-xs font-bold border border-amber-500/30 transition flex items-center space-x-1.5 rtl:space-x-reverse"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{isAr ? 'فحص وإرسال التنبيهات' : 'Trigger Alerts'}</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center space-x-2 rtl:space-x-reverse ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/20 border-rose-500/30 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 rounded-xl p-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`py-2.5 px-4 font-semibold text-xs rounded-lg transition-colors flex items-center space-x-2 rtl:space-x-reverse ${
            activeTab === 'catalog' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>{isAr ? 'دليل المخزون والأرصدة' : 'Stock Catalog'}</span>
        </button>

        <button
          onClick={() => setActiveTab('receive')}
          className={`py-2.5 px-4 font-semibold text-xs rounded-lg transition-colors flex items-center space-x-2 rtl:space-x-reverse ${
            activeTab === 'receive' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PackagePlus className="w-4 h-4" />
          <span>{isAr ? 'استلام وإضافة شحنة' : 'Receive Stock'}</span>
        </button>

        <button
          onClick={() => setActiveTab('transfer')}
          className={`py-2.5 px-4 font-semibold text-xs rounded-lg transition-colors flex items-center space-x-2 rtl:space-x-reverse ${
            activeTab === 'transfer' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>{isAr ? 'تحويل بين الفروع' : 'Branch Transfer'}</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`py-2.5 px-4 font-semibold text-xs rounded-lg transition-colors flex items-center space-x-2 rtl:space-x-reverse ${
            activeTab === 'audit' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{isAr ? 'سجل الحركات المخزنية' : 'Audit Ledger'}</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`py-2.5 px-4 font-semibold text-xs rounded-lg transition-colors flex items-center space-x-2 rtl:space-x-reverse ${
            activeTab === 'reports' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>{isAr ? 'تقارير القيمة والاستهلاك' : 'Manager Reports'}</span>
        </button>
      </div>

      {/* Tab 1: Catalog & Inventory List */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder={isAr ? 'بحث باسم الصنف أو SKU...' : 'Search item or SKU...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="all">{isAr ? 'جميع الفروع' : 'All Branches'}</option>
                <option value="11111111-1111-1111-1111-111111111111">{isAr ? 'فرع القاهرة الرئيسي' : 'Cairo Branch'}</option>
                <option value="22222222-2222-2222-2222-222222222222">{isAr ? 'فرع الإسكندرية' : 'Alexandria Branch'}</option>
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="all">{isAr ? 'جميع التصنيفات' : 'All Categories'}</option>
                <option value="dental_materials">{isAr ? 'مستلزمات أسنان' : 'Dental Materials'}</option>
                <option value="implant_components">{isAr ? 'مكونات الزرع' : 'Implant Components'}</option>
                <option value="prosthetic_supplies">{isAr ? 'مستلزمات تركيبات' : 'Prosthetic Supplies'}</option>
                <option value="office_medical">{isAr ? 'طبية ومكتبية' : 'Office/Medical'}</option>
              </select>

              <button
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={`px-3.5 py-2 rounded-xl border transition flex items-center space-x-1.5 rtl:space-x-reverse font-bold ${
                  showLowStockOnly
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>{isAr ? 'الأصناف المنخفضة فقط' : 'Low Stock Only'}</span>
              </button>
            </div>

            <button
              onClick={() => setShowNewItemModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-600/20 flex items-center space-x-1.5 rtl:space-x-reverse"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'إضافة صنف جديد' : 'Add New Item'}</span>
            </button>
          </div>

          {/* Items Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
                <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="p-3.5">SKU</th>
                    <th className="p-3.5">{isAr ? 'اسم الصنف' : 'Item Name'}</th>
                    <th className="p-3.5">{isAr ? 'التصنيف' : 'Category'}</th>
                    <th className="p-3.5">{isAr ? 'الفرع' : 'Branch'}</th>
                    <th className="p-3.5">{isAr ? 'المورد' : 'Supplier'}</th>
                    <th className="p-3.5">{isAr ? 'الرصيد / الحد الأدنى' : 'Stock / Min Level'}</th>
                    <th className="p-3.5">{isAr ? 'تلفة الوحدة' : 'Unit Cost'}</th>
                    <th className="p-3.5">{isAr ? 'إجمالي القيمة' : 'Total Valuation'}</th>
                    <th className="p-3.5 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredCatalogItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500 italic">
                        {isAr ? 'لا توجد أصناف مخزون مطابقة للبحث' : 'No inventory items match query.'}
                      </td>
                    </tr>
                  ) : (
                    filteredCatalogItems.map((item) => {
                      const isLow = item.current_quantity <= item.minimum_reorder_level;
                      const valuation = Math.round(item.current_quantity * item.unit_cost * 100) / 100;
                      const branchName =
                        item.branch_id === '11111111-1111-1111-1111-111111111111'
                          ? isAr
                            ? 'القاهرة الرئيسي'
                            : 'Cairo Central'
                          : isAr
                          ? 'الإسكندرية'
                          : 'Alexandria';

                      return (
                        <tr key={item.id} className={`hover:bg-slate-800/40 transition ${isLow ? 'bg-amber-950/10' : ''}`}>
                          <td className="p-3.5 font-mono text-slate-400">{item.sku}</td>
                          <td className="p-3.5 font-bold text-slate-100">
                            {isAr ? item.item_name_ar : item.item_name_en}
                            {isLow && (
                              <span className="mr-2 rtl:mr-2 ltr:ml-2 px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {isAr ? 'منخفض' : 'Low'}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-400">
                            {item.category === 'dental_materials' && (isAr ? 'مستلزمات أسنان' : 'Dental Materials')}
                            {item.category === 'implant_components' && (isAr ? 'مكونات زرع' : 'Implant Components')}
                            {item.category === 'prosthetic_supplies' && (isAr ? 'مستلزمات تركيبات' : 'Prosthetic Supplies')}
                            {item.category === 'office_medical' && (isAr ? 'طبية ومكتبية' : 'Office/Medical')}
                          </td>
                          <td className="p-3.5 text-slate-400">{branchName}</td>
                          <td className="p-3.5 text-slate-400">{item.supplier_name || 'غير محدد'}</td>
                          <td className="p-3.5 font-bold">
                            <span className={isLow ? 'text-amber-400' : 'text-emerald-400'}>
                              {item.current_quantity} {item.unit}
                            </span>{' '}
                            <span className="text-slate-500 font-normal">({item.minimum_reorder_level} حد أدنى)</span>
                          </td>
                          <td className="p-3.5 font-mono">{item.unit_cost} ج.م</td>
                          <td className="p-3.5 font-mono font-bold text-blue-300">{valuation} ج.م</td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => {
                                setAdjustingItem(item);
                                setAdjustNewQty(item.current_quantity);
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold transition border border-slate-700"
                            >
                              {isAr ? 'تسوية المخزون' : 'Adjust'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Receive Stock */}
      {activeTab === 'receive' && (
        <div className="max-w-2xl mx-auto bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
          <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2 rtl:space-x-reverse border-b border-slate-800 pb-3">
            <PackagePlus className="w-5 h-5 text-blue-400" />
            <span>{isAr ? 'تسجيل استلام شحنة جديدة من المورد' : 'Receive Shipment Stock'}</span>
          </h2>

          <form onSubmit={handleReceiveSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-400 mb-1">{isAr ? 'صنف المخزون المستلم' : 'Select Inventory Item'}</label>
              <select
                value={receiveItemId}
                onChange={(e) => {
                  setReceiveItemId(e.target.value);
                  const sel = inventoryItems.find((i) => i.id === e.target.value);
                  if (sel) setReceiveUnitCost(sel.unit_cost);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">{isAr ? '-- اختر الصنف --' : '-- Select Item --'}</option>
                {inventoryItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {isAr ? i.item_name_ar : i.item_name_en} ({i.current_quantity} {i.unit} حالي)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-400 mb-1">{isAr ? 'الكمية المستلمة' : 'Received Quantity'}</label>
                <input
                  type="number"
                  min="1"
                  value={receiveQty}
                  onChange={(e) => setReceiveQty(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">{isAr ? 'تكلفة الوحدة (ج.م)' : 'Unit Cost (EGP)'}</label>
                <input
                  type="number"
                  step="0.01"
                  value={receiveUnitCost}
                  onChange={(e) => setReceiveUnitCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-400 mb-1">{isAr ? 'المورد الشاحن' : 'Supplier'}</label>
              <select
                value={receiveSupplierId}
                onChange={(e) => setReceiveSupplierId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">{isAr ? '-- اختر المورد --' : '-- Select Supplier --'}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {isAr ? s.name_ar : s.name_en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-400 mb-1">{isAr ? 'ملاحظات وتفاصيل الفاتورة' : 'Invoice Notes'}</label>
              <input
                type="text"
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
                placeholder={isAr ? 'رقم فاتورة الشراء أو الملاحظات...' : 'Purchase invoice number...'}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-600/20"
              >
                {isAr ? 'تأكيد وحفظ الاستلام بالمخزون' : 'Confirm & Save Shipment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Branch Transfer */}
      {activeTab === 'transfer' && (
        <div className="max-w-2xl mx-auto bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
          <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2 rtl:space-x-reverse border-b border-slate-800 pb-3">
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
            <span>{isAr ? 'تحويل كميات المخزون بين فروع المركز' : 'Inter-Branch Stock Transfer'}</span>
          </h2>

          <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-400 mb-1">{isAr ? 'من الفرع (المحول منه)' : 'From Branch'}</label>
                <select
                  value={transferFromBranch}
                  onChange={(e) => setTransferFromBranch(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="11111111-1111-1111-1111-111111111111">{isAr ? 'فرع القاهرة الرئيسي' : 'Cairo Central'}</option>
                  <option value="22222222-2222-2222-2222-222222222222">{isAr ? 'فرع الإسكندرية' : 'Alexandria'}</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">{isAr ? 'إلى الفرع (المحول إليه)' : 'To Branch'}</label>
                <select
                  value={transferToBranch}
                  onChange={(e) => setTransferToBranch(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="22222222-2222-2222-2222-222222222222">{isAr ? 'فرع الإسكندرية' : 'Alexandria'}</option>
                  <option value="11111111-1111-1111-1111-111111111111">{isAr ? 'فرع القاهرة الرئيسي' : 'Cairo Central'}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-400 mb-1">{isAr ? 'صنف المخزون المراد تحويله' : 'Select Item'}</label>
              <select
                value={transferItemId}
                onChange={(e) => setTransferItemId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">{isAr ? '-- اختر الصنف --' : '-- Select Item --'}</option>
                {inventoryItems
                  .filter((i) => i.branch_id === transferFromBranch)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {isAr ? i.item_name_ar : i.item_name_en} ({i.current_quantity} {i.unit} متاح)
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-400 mb-1">{isAr ? 'الكمية المحولة' : 'Transfer Quantity'}</label>
              <input
                type="number"
                min="1"
                value={transferQty}
                onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-400 mb-1">{isAr ? 'سبب التحويل / ملاحظات' : 'Transfer Reason'}</label>
              <input
                type="text"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder={isAr ? 'مثال: نقل عاجل لتغطية عجز بفرع الإسكندرية...' : 'Transfer notes...'}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-600/20"
              >
                {isAr ? 'تأكيد تحويل المخزون' : 'Confirm Transfer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 4: Audit Ledger */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-800/80 border-b border-slate-700/80 flex justify-between items-center">
            <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
              {isAr ? 'سجل التدقيق للحركات المخزنية والتسويات' : 'Inventory Audit Transactions Ledger'}
            </h3>
            <span className="text-xs text-slate-400">{transactions.length} حركات مسجلة</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-800/60 text-slate-400 font-bold uppercase">
                <tr>
                  <th className="p-3.5">{isAr ? 'التاريخ والوقت' : 'Date/Time'}</th>
                  <th className="p-3.5">{isAr ? 'نوع الحركة' : 'Type'}</th>
                  <th className="p-3.5">{isAr ? 'الصنف' : 'Item'}</th>
                  <th className="p-3.5">{isAr ? 'الكمية' : 'Qty'}</th>
                  <th className="p-3.5">{isAr ? 'التكلفة الإجمالية' : 'Total Cost'}</th>
                  <th className="p-3.5">{isAr ? 'الرصيد بعدها' : 'Balance After'}</th>
                  <th className="p-3.5">{isAr ? 'بواسطة' : 'User'}</th>
                  <th className="p-3.5">{isAr ? 'ملاحظات' : 'Notes'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 italic">
                      {isAr ? 'لا توجد حركات مخزنية مسجلة' : 'No transactions recorded.'}
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono text-slate-400">{new Date(tx.created_at).toLocaleString('ar-EG')}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            tx.type === 'receive'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : tx.type === 'transfer'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              : tx.type === 'consumption'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {tx.type === 'receive' && (isAr ? 'استلام شحنة' : 'Receive')}
                          {tx.type === 'transfer' && (isAr ? 'تحويل بين الفروع' : 'Transfer')}
                          {tx.type === 'consumption' && (isAr ? 'استهلاك سريري' : 'Consumption')}
                          {tx.type === 'adjustment' && (isAr ? 'تسوية يدوية' : 'Adjustment')}
                          {tx.type === 'wastage' && (isAr ? 'إهدار / تلف' : 'Wastage')}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-100">{isAr ? tx.item_name_ar : tx.item_name_en}</td>
                      <td className="p-3.5 font-mono font-bold">{tx.quantity}</td>
                      <td className="p-3.5 font-mono text-blue-300">{tx.total_cost} ج.م</td>
                      <td className="p-3.5 font-mono text-slate-400">{tx.quantity_after}</td>
                      <td className="p-3.5 text-slate-400">{tx.created_by_name || tx.created_by}</td>
                      <td className="p-3.5 text-slate-400 max-w-xs truncate">{tx.notes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Manager Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400">{isAr ? 'إجمالي الأصناف النشطة' : 'Active Items'}</span>
              <p className="text-2xl font-bold text-white">{summaryReport.total_items_count}</p>
            </div>

            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400">{isAr ? 'إجمالي قيمة المخزون (ج.م)' : 'Total Valuation (EGP)'}</span>
              <p className="text-2xl font-bold text-blue-400">{summaryReport.total_valuation_egp} ج.م</p>
            </div>

            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400">{isAr ? 'الأصناف دون حد الأمان' : 'Low Stock Items'}</span>
              <p className="text-2xl font-bold text-amber-400">{summaryReport.low_stock_count}</p>
            </div>

            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400">{isAr ? 'تكلفة المستلزمات المستهلكة' : 'Material Consumption Cost'}</span>
              <p className="text-2xl font-bold text-purple-400">{summaryReport.total_material_consumption_egp} ج.م</p>
            </div>
          </div>

          {/* Category Valuation Breakdown Table */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
              {isAr ? 'توزيع قيمة المخزون حسب التصنيف السريري' : 'Valuation Breakdown by Category'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(summaryReport.category_breakdown).map(([catKey, catData]) => (
                <div key={catKey} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-1">
                  <p className="text-xs font-bold text-slate-300">
                    {catKey === 'dental_materials' && (isAr ? 'مستلزمات أسنان' : 'Dental Materials')}
                    {catKey === 'implant_components' && (isAr ? 'مكونات زرع' : 'Implant Components')}
                    {catKey === 'prosthetic_supplies' && (isAr ? 'مستلزمات تركيبات' : 'Prosthetic Supplies')}
                    {catKey === 'office_medical' && (isAr ? 'طبية ومكتبية' : 'Office/Medical')}
                    {catKey === 'other' && (isAr ? 'أخرى' : 'Other')}
                  </p>
                  <div className="flex justify-between text-xs text-slate-400 pt-1">
                    <span>{catData.count} أصناف</span>
                    <span className="font-bold text-blue-400">{catData.valuation} ج.م</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Item */}
      {showNewItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm">{isAr ? 'إضافة صنف جديد لدليل المخزون' : 'Add New Inventory Item'}</h3>
              <button onClick={() => setShowNewItemModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-400 mb-1">{isAr ? 'اسم الصنف بالعربية' : 'Item Name (Arabic)'}</label>
                <input
                  type="text"
                  required
                  value={newItemNameAr}
                  onChange={(e) => setNewItemNameAr(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">{isAr ? 'اسم الصنف بالإنجليزية' : 'Item Name (English)'}</label>
                <input
                  type="text"
                  value={newItemNameEn}
                  onChange={(e) => setNewItemNameEn(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">{isAr ? 'التصنيف' : 'Category'}</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as InventoryCategory)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                  >
                    <option value="dental_materials">{isAr ? 'مستلزمات أسنان' : 'Dental Materials'}</option>
                    <option value="implant_components">{isAr ? 'مكونات زرع' : 'Implant Components'}</option>
                    <option value="prosthetic_supplies">{isAr ? 'مستلزمات تركيبات' : 'Prosthetic Supplies'}</option>
                    <option value="office_medical">{isAr ? 'طبية ومكتبية' : 'Office/Medical'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">{isAr ? 'وحدة القياس' : 'Unit'}</label>
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value as InventoryUnit)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                  >
                    <option value="box">{isAr ? 'علبة (Box)' : 'Box'}</option>
                    <option value="piece">{isAr ? 'قطعة (Piece)' : 'Piece'}</option>
                    <option value="pack">{isAr ? 'عبوة (Pack)' : 'Pack'}</option>
                    <option value="set">{isAr ? 'طقم (Set)' : 'Set'}</option>
                    <option value="carpule">{isAr ? 'أمبول (Carpule)' : 'Carpule'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">{isAr ? 'الرصيد الافتتاحي' : 'Opening Qty'}</label>
                  <input
                    type="number"
                    min="0"
                    value={newItemOpeningQty}
                    onChange={(e) => setNewItemOpeningQty(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">{isAr ? 'حد الأمان' : 'Min Level'}</label>
                  <input
                    type="number"
                    min="1"
                    value={newItemMinLevel}
                    onChange={(e) => setNewItemMinLevel(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">{isAr ? 'تكلفة الوحدة (ج.م)' : 'Unit Cost'}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItemUnitCost}
                    onChange={(e) => setNewItemUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewItemModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">
                  {isAr ? 'إضافة الصنف' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adjust Stock */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm">
                {isAr ? `تسوية مخزون: ${adjustingItem.item_name_ar}` : `Adjust Stock: ${adjustingItem.item_name_en}`}
              </h3>
              <button onClick={() => setAdjustingItem(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-400 mb-1">{isAr ? 'الرصيد الفعلي الجديد' : 'New Actual Stock'}</label>
                <input
                  type="number"
                  min="0"
                  value={adjustNewQty}
                  onChange={(e) => setAdjustNewQty(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">{isAr ? 'نوع التسوية' : 'Adjustment Type'}</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                >
                  <option value="adjustment">{isAr ? 'تعديل جرد يدوي (Adjustment)' : 'Adjustment'}</option>
                  <option value="wastage">{isAr ? 'إهدار / تلف / انتهاء صلاحية (Wastage)' : 'Wastage'}</option>
                  <option value="return">{isAr ? 'مرتجع للمورد (Return to Supplier)' : 'Return'}</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">{isAr ? 'سبب التسوية' : 'Reason / Notes'}</label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder={isAr ? 'أدخل سبب تعديل الجرد...' : 'Reason for adjustment...'}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setAdjustingItem(null)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">
                  {isAr ? 'حفظ التسوية' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
