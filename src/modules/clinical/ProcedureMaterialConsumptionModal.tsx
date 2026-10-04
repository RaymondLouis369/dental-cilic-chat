import React, { useState, useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import {
  getStoredInventoryItems,
  recordMaterialConsumption,
} from '../../lib/inventoryStorage';
import { PackageCheck, Plus, Trash2, Check, AlertCircle } from 'lucide-react';

interface MaterialConsumptionItem {
  inventoryItemId: string;
  quantity: number;
}

interface ProcedureMaterialConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId?: string;
  treatmentServiceId?: string;
  patientId?: string;
  doctorId?: string;
  defaultBranchId?: string;
  onConsumptionRecorded?: () => void;
}

export const ProcedureMaterialConsumptionModal: React.FC<ProcedureMaterialConsumptionModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  treatmentServiceId,
  patientId,
  doctorId,
  defaultBranchId,
  onConsumptionRecorded,
}) => {
  const { language } = useLanguage();
  const { session } = useAuth();
  const profile = session?.profile;
  const user = session?.profile;
  const isAr = language === 'ar';

  const branchId = defaultBranchId || profile?.branch_id || '11111111-1111-1111-1111-111111111111';
  const orgId = profile?.organization_id || '00000000-0000-0000-0000-000000000000';

  const [itemsToConsume, setItemsToConsume] = useState<MaterialConsumptionItem[]>([
    { inventoryItemId: '', quantity: 1 },
  ]);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const inventoryOptions = useMemo(() => {
    return getStoredInventoryItems(orgId, branchId).filter((i) => i.active);
  }, [orgId, branchId, isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItemsToConsume([...itemsToConsume, { inventoryItemId: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (itemsToConsume.length === 1) return;
    setItemsToConsume(itemsToConsume.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof MaterialConsumptionItem, value: any) => {
    const updated = [...itemsToConsume];
    updated[index] = { ...updated[index], [field]: value };
    setItemsToConsume(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!user || !profile) return;

    let recordedCount = 0;
    let totalCostLogged = 0;

    for (const entry of itemsToConsume) {
      if (!entry.inventoryItemId || entry.quantity <= 0) continue;

      const res = recordMaterialConsumption({
        organizationId: orgId,
        branchId: branchId,
        inventoryItemId: entry.inventoryItemId,
        quantity: entry.quantity,
        treatmentServiceId,
        invoiceId,
        patientId,
        doctorId: doctorId || profile.id,
        notes,
        actorUserId: profile.id,
        actorUserName: profile.display_name,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'حدث خطأ أثناء خصم المستلزمات');
        return;
      }

      recordedCount++;
      totalCostLogged += res.totalCost || 0;
    }

    if (recordedCount === 0) {
      setErrorMsg(isAr ? 'يرجى اختيار صنف واحد على الأقل وتحديد الكمية' : 'Please select at least one item');
      return;
    }

    setSuccessMsg(
      isAr
        ? `تم تسجيل استهلاك المستلزمات لعدد (${recordedCount}) أصناف وتوثيق تكلفة قدرها ${totalCostLogged} ج.م`
        : `Successfully recorded ${recordedCount} consumed items totaling ${totalCostLogged} EGP.`
    );

    setTimeout(() => {
      if (onConsumptionRecorded) onConsumptionRecorded();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-5 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="p-2.5 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{isAr ? 'تسجيل استهلاك المستلزمات السريرية' : 'Clinical Material Consumption'}</h2>
              <p className="text-xs text-slate-400">
                {isAr ? 'خصم المستلزمات من المخزون وترحيل التكلفة تلقائياً' : 'Deduct inventory stock & auto-link costs'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-sm">
          {errorMsg && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center space-x-2 rtl:space-x-reverse">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center space-x-2 rtl:space-x-reverse">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-300">
              {isAr ? 'المستلزمات المستهلكة بالإجراء' : 'Items Consumed'}
            </label>

            {itemsToConsume.map((item, idx) => {
              const selectedInv = inventoryOptions.find((i) => i.id === item.inventoryItemId);
              return (
                <div key={idx} className="flex items-center space-x-2 rtl:space-x-reverse">
                  <select
                    value={item.inventoryItemId}
                    onChange={(e) => handleItemChange(idx, 'inventoryItemId', e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">{isAr ? '-- اختر المستلزم من المخزون --' : '-- Select Material --'}</option>
                    {inventoryOptions.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {isAr ? inv.item_name_ar : inv.item_name_en} ({inv.current_quantity} {inv.unit} متاح - {inv.unit_cost} ج.م)
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    max={selectedInv?.current_quantity || 999}
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-20 bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-200 text-center focus:outline-none focus:border-emerald-500"
                  />

                  {itemsToConsume.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-2 text-rose-400 hover:text-rose-300 hover:bg-slate-800 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={handleAddItem}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1 rtl:space-x-reverse pt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'إضافة مستلزم آخر' : 'Add Another Material'}</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">{isAr ? 'ملاحظات إضافية' : 'Notes'}</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isAr ? 'مثال: استهلاك طارئ لمعالجة قناة جذر مضاعفة...' : 'e.g. Extra usage for complex endo'}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-xs font-semibold"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-600/20"
            >
              {isAr ? 'خصم وتوثيق التكلفة' : 'Deduct & Save Cost'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
