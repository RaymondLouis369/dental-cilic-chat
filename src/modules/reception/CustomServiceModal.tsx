import React, { useState, useMemo } from 'react';
import {
  X,
  PlusCircle,
  AlertCircle,
  Check,
  Building2,
  DollarSign,
  FileEdit,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { createCustomPatientService } from '../../lib/receptionAndBillingStorage';
import { getStoredPatients } from '../../lib/patientStorage';

interface CustomServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CustomServiceModal: React.FC<CustomServiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { session } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [patientId, setPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [patientPrice, setPatientPrice] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const patients = useMemo(() => getStoredPatients(), []);

  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients.slice(0, 8);
    const q = patientSearch.toLowerCase();
    return patients.filter(
      (p) =>
        p.full_name_ar.toLowerCase().includes(q) ||
        p.full_name_en.toLowerCase().includes(q) ||
        p.patient_code.toLowerCase().includes(q) ||
        p.mobile_primary.includes(q)
    );
  }, [patients, patientSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!patientId) {
      setError(isAr ? 'برجاء اختيار المريض' : 'Please select patient');
      return;
    }
    if (!serviceName.trim()) {
      setError(isAr ? 'برجاء إدخال اسم الخدمة السنية الخاصة' : 'Service name is required');
      return;
    }
    const priceNum = parseFloat(patientPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setError(isAr ? 'برجاء إدخال سعر صحيح بالجنيه المصري' : 'Valid EGP price required');
      return;
    }

    setLoading(true);
    try {
      createCustomPatientService({
        organization_id: session?.profile.organization_id || 'org_dental_egy_01',
        branch_id: session?.profile.branch_id || 'branch_cairo_nasrcity',
        patient_id: patientId,
        custom_service_name: serviceName.trim(),
        agreed_patient_price: priceNum,
        reason: reason.trim() || (isAr ? 'تسعير استثنائي لحالة خاصة' : 'Custom patient quotation'),
        created_by_staff_id: session?.profile.id || 'usr_staff_01',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit custom service');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 to-purple-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <FileEdit className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isAr ? 'تسجيل خدمة وسعر مخصص لمريض' : 'Log Custom Patient Service & Pricing'}
              </h2>
              <p className="text-xs text-indigo-100">
                {isAr
                  ? 'ترسل مباشرة إلى قائمة مراجعة واعتماد الإدارة'
                  : 'Submitted to Admin pending review queue'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Select Patient */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              {isAr ? 'اختيار المريض' : 'Select Patient'} *
            </label>
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder={isAr ? 'ابحث بالاسم أو الكود...' : 'Search name or code...'}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg mb-2"
            />
            <div className="max-h-28 overflow-y-auto space-y-1">
              {filteredPatients.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setPatientId(p.id)}
                  className={`p-2 rounded-lg border cursor-pointer flex justify-between ${
                    patientId === p.id
                      ? 'bg-indigo-50 border-indigo-500 font-bold text-indigo-900'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <span>{isAr ? p.full_name_ar : p.full_name_en}</span>
                  <span className="font-mono text-slate-500">{p.patient_code}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Service Name */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              {isAr ? 'اسم الخدمة السنية المخصصة' : 'Custom Service Name'} *
            </label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder={
                isAr
                  ? 'مثال: تركيب جسر زركونيا 4 قطع مع دعامة خاصة'
                  : 'e.g. 4-unit Zirconia bridge with custom abutment'
              }
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>

          {/* Agreed Price */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              {isAr ? 'السعر المقترح للمريض (بالجنيه المصري EGP)' : 'Quoted Patient Price (EGP)'} *
            </label>
            <input
              type="number"
              min="0"
              step="10"
              value={patientPrice}
              onChange={(e) => setPatientPrice(e.target.value)}
              placeholder="3500"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              {isAr ? 'سبب التخصيص أو الملاحظات' : 'Justification / Case Notes'}
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isAr
                  ? 'تفاصيل الحالة الطبية، مادة خاصة من المورد، أو اتفاق استثنائي...'
                  : 'Special material or negotiated case treatment...'
              }
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 font-semibold"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>{isAr ? 'إرسال للمراجعة والاعتماد' : 'Submit for Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
