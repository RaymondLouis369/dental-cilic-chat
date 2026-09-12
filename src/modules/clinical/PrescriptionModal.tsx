import React, { useState } from 'react';
import { Prescription, PrescriptionItem, PrescriptionTemplate } from '../../types/clinical';
import { useLanguage } from '../i18n/LanguageContext';
import {
  createPrescription,
  PRESCRIPTION_TEMPLATES,
  getStoredMedicalAlerts,
} from '../../lib/clinicalStorage';
import { useAuth } from '../auth/AuthContext';
import {
  Pill,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  X,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface PrescriptionModalProps {
  patientId: string;
  visitId?: string;
  isOpen: boolean;
  onClose: () => void;
  onPrescriptionCreated?: () => void;
}

export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  patientId,
  visitId,
  isOpen,
  onClose,
  onPrescriptionCreated,
}) => {
  const { isRtl } = useLanguage();
  const { session } = useAuth();

  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Omit<PrescriptionItem, 'id' | 'prescription_id'>[]>([
    {
      medication_name: 'Augmentin 1g (Amoxicillin / Clavulanate)',
      dosage: '1000 mg Tablet',
      frequency: 'Every 12 hours (Twice daily)',
      duration: '5 Days',
      instructions: 'Take after meals with a full glass of water.',
    },
    {
      medication_name: 'Cataflam 50mg (Diclofenac Potassium)',
      dosage: '50 mg Tablet',
      frequency: 'Every 8 hours as needed',
      duration: '3 Days',
      instructions: 'Take after food for pain relief.',
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdRx, setCreatedRx] = useState<Prescription | null>(null);

  if (!isOpen) return null;

  // Check if patient has penicillin allergy
  const alerts = getStoredMedicalAlerts().filter((a) => a.patient_id === patientId && a.active);
  const hasPenicillinAllergy = alerts.some(
    (a) => a.title.toLowerCase().includes('penicillin') || a.description.toLowerCase().includes('بنسلين')
  );

  const handleApplyTemplate = (tpl: PrescriptionTemplate) => {
    setItems(
      tpl.items.map((i) => ({
        medication_name: i.medication_name,
        dosage: i.dosage,
        frequency: i.frequency,
        duration: i.duration,
        instructions: i.instructions,
      }))
    );
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        medication_name: '',
        dosage: '',
        frequency: 'Every 8 hours',
        duration: '5 Days',
        instructions: 'After meals',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleUpdateItem = (
    index: number,
    field: keyof Omit<PrescriptionItem, 'id' | 'prescription_id'>,
    value: string
  ) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSavePrescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setIsSubmitting(true);
    try {
      const rx = createPrescription({
        patientId,
        doctorId: session?.profile.id || 'prof_doc_01',
        branchId: session?.profile.branch_id || '11111111-1111-1111-1111-111111111111',
        visitId,
        diagnosis,
        notes,
        items,
        organizationId: session?.profile.organization_id,
      });

      setCreatedRx(rx);
      if (onPrescriptionCreated) onPrescriptionCreated();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
      id="prescription-modal"
    >
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-purple-50 border-b border-purple-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-purple-950">
                {isRtl ? 'تحرير وصفة طبية (روشتة الأسنان)' : 'Author Dental Prescription (Rx)'}
              </h3>
              <p className="text-xs text-purple-700">
                {isRtl
                  ? 'بروتوكولات الأدوية المسكنة والمضادة للالتهاب والمطهرات الفموية'
                  : 'Prescribe analgesics, antibiotics, and oral mouthwashes.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Allergy Warning if applicable */}
          {hasPenicillinAllergy && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-3 text-rose-900 text-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">
                  {isRtl ? 'تحذير سريري حرج: المريض يعاني من حساسية البنسلين!' : 'Critical Clinical Alert: Penicillin Allergy!'}
                </strong>
                <p className="mt-0.5">
                  {isRtl
                    ? 'يمنع وصف Amoxicillin أو Augmentin. يرجى استخدام بديل الكليندامايسين (Dalacin C) أو أزيثروميسين.'
                    : 'Avoid Amoxicillin / Augmentin. Use Clindamycin (Dalacin C) or Azithromycin protocol.'}
                </p>
              </div>
            </div>
          )}

          {/* Quick Prescription Templates */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>{isRtl ? 'تطبيق بروتوكول علاجي جاهز (Templates):' : 'Apply Dental Protocol Template:'}</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESCRIPTION_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className="p-2.5 text-left rounded-xl border border-purple-200 bg-purple-50/40 hover:bg-purple-100/60 hover:border-purple-300 transition-all text-xs"
                >
                  <div className="font-bold text-purple-900">{isRtl ? tpl.title_ar : tpl.title_en}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {tpl.items.map((i) => i.medication_name).join(' • ')}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSavePrescription} className="space-y-4">
            {/* Diagnosis */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isRtl ? 'التشخيص السريري (Clinical Diagnosis):' : 'Clinical Diagnosis:'}
              </label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder={
                  isRtl
                    ? 'مثال: التهاب لثة حاد وما بعد خلع الضرس #48'
                    : 'e.g. Acute pulpitis / Post-extraction pain management'
                }
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>

            {/* Medications Table / List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  {isRtl ? 'الأدوية والجرعات (Prescribed Medications):' : 'Prescribed Medications:'}
                </label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'إضافة دواء' : 'Add Medicine'}</span>
                </button>
              </div>

              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900">
                      #{idx + 1} {item.medication_name || (isRtl ? 'دواء جديد' : 'New Medicine')}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder={isRtl ? 'اسم الدواء التجاري/العلمي' : 'Medication Name'}
                      value={item.medication_name}
                      onChange={(e) => handleUpdateItem(idx, 'medication_name', e.target.value)}
                      className="text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                    <input
                      type="text"
                      required
                      placeholder={isRtl ? 'الجرعة والتركيز (مثال: 500 ملجم)' : 'Dosage (e.g. 500mg)'}
                      value={item.dosage}
                      onChange={(e) => handleUpdateItem(idx, 'dosage', e.target.value)}
                      className="text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder={isRtl ? 'التكرار (مثال: كل 8 ساعات)' : 'Frequency (e.g. Every 8 hrs)'}
                      value={item.frequency}
                      onChange={(e) => handleUpdateItem(idx, 'frequency', e.target.value)}
                      className="text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                    <input
                      type="text"
                      required
                      placeholder={isRtl ? 'المدة (مثال: 5 أيام)' : 'Duration (e.g. 5 Days)'}
                      value={item.duration}
                      onChange={(e) => handleUpdateItem(idx, 'duration', e.target.value)}
                      className="text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder={isRtl ? 'تعليمات إضافية (مثال: بعد الأكل مع كوب ماء كامل)' : 'Instructions (e.g. After meals)'}
                    value={item.instructions}
                    onChange={(e) => handleUpdateItem(idx, 'instructions', e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              ))}
            </div>

            {/* General Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isRtl ? 'ملاحظات وتنبيهات عامة للروشتة:' : 'General Prescription Remarks:'}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isRtl ? 'تعليمات للصيدلي أو المريض...' : 'Instructions for pharmacist...'}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                id="save-prescription-btn"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isRtl ? 'اعتماد وحفظ الروشتة' : 'Save Prescription'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
