import React, { useState, useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getStoredServices,
  getStoredServiceCategories,
} from '../../lib/receptionAndBillingStorage';
import { createLabOrder } from '../../lib/clinicalStorage';
import { LabOrder, LabOrderTryInOrFinal } from '../../types/clinical';
import {
  FlaskConical,
  X,
  Calendar,
  FileText,
  Check,
  Layers,
  Sparkles,
  Building2,
  Palette,
  CheckCircle2,
  Paperclip,
  Plus,
  Wrench,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

interface LabOrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  doctorId: string;
  branchId?: string;
  organizationId?: string;
  treatmentPlanId?: string;
  treatmentServiceId?: string;
  initialServiceId?: string;
  initialTeeth?: string[];
  onOrderCreated?: (order: LabOrder) => void;
}

// FDI Teeth Grid arrays for tooth selection
const UPPER_RIGHT_TEETH = ['18', '17', '16', '15', '14', '13', '12', '11'];
const UPPER_LEFT_TEETH = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT_TEETH = ['48', '47', '46', '45', '44', '43', '42', '41'];
const LOWER_LEFT_TEETH = ['31', '32', '33', '34', '35', '36', '37', '38'];

// Default dental lab options in Egypt
const EGYPT_LAB_OPTIONS = [
  'Al-Ahram Dental Prosthetics Lab',
  'Cairo Precision Esthetics Lab',
  'Delta Crown & Bridge Laboratory',
  'Nile CAD/CAM Dental Center',
  'Specialist Dental Lab - Dokki',
  'Custom Laboratory',
];

// Vita shade guide quick picks
const VITA_SHADES = ['A1', 'A2', 'A3', 'A3.5', 'B1', 'B2', 'C1', 'D2', 'BL2 (Bleach)'];

// Product Types
const PRODUCT_TYPES = [
  'Crown',
  'Bridge',
  'Veneer',
  'Inlay/Onlay',
  'Implant Crown',
  'Denture',
  'Nightguard',
  'Custom',
];

// Materials
const MATERIAL_OPTIONS = [
  'Monolithic Zirconia',
  'Layered Zirconia',
  'E-Max / Lithium Disilicate',
  'PFM (Porcelain Fused to Metal)',
  'Composite',
  'PMMA Temporary',
  'Titanium',
  'CoCr Alloy',
];

// Frameworks
const FRAMEWORK_OPTIONS = [
  'Monolithic',
  'Layered Porcelain',
  'Cast Metal',
  'CoCr Framework',
  'Pekkton / High Polymer',
];

// Pontic Options
const PONTIC_OPTIONS = ['N/A', 'Ovate', 'Modified Ridge Lap', 'Sanitary', 'Conical'];

// Abutment Options
const ABUTMENT_OPTIONS = [
  'N/A',
  'Custom Titanium',
  'Stock Titanium',
  'Zirconia Abutment',
  'Screw-Retained',
  'Cement-Retained',
];

export const LabOrderFormModal: React.FC<LabOrderFormModalProps> = ({
  isOpen,
  onClose,
  patientId,
  doctorId,
  branchId,
  organizationId,
  treatmentPlanId,
  treatmentServiceId,
  initialServiceId = '',
  initialTeeth = [],
  onOrderCreated,
}) => {
  const { isRtl, language } = useLanguage();
  const isAr = language === 'ar';

  const services = useMemo(() => getStoredServices(), []);
  const categories = useMemo(() => getStoredServiceCategories(), []);

  // Form States
  const [selectedServiceId, setSelectedServiceId] = useState<string>(initialServiceId);
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>(initialTeeth);

  // Default delivery date: 7 days from today
  const defaultDelivery = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

  const [deliveryDate, setDeliveryDate] = useState<string>(defaultDelivery);
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState<string>(defaultDelivery);
  const [labName, setLabName] = useState<string>(EGYPT_LAB_OPTIONS[0]);
  const [customLabName, setCustomLabName] = useState<string>('');
  const [shadeNotes, setShadeNotes] = useState<string>('A2');
  const [materialsNotes, setMaterialsNotes] = useState<string>('Monolithic Zirconia');

  // Manufacturing Detailed Fields
  const [productType, setProductType] = useState<string>('Crown');
  const [material, setMaterial] = useState<string>('Monolithic Zirconia');
  const [framework, setFramework] = useState<string>('Monolithic');
  const [tryInOrFinal, setTryInOrFinal] = useState<LabOrderTryInOrFinal>('final');
  const [pontic, setPontic] = useState<string>('N/A');
  const [abutment, setAbutment] = useState<string>('N/A');
  const [doctorNotes, setDoctorNotes] = useState<string>('');
  const [labNotes, setLabNotes] = useState<string>('');
  const [attachmentRefs, setAttachmentRefs] = useState<string[]>(['Patient_UpperArch_Scan.stl']);
  const [newAttachmentRef, setNewAttachmentRef] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  if (!isOpen) return null;

  // Selected Service Details
  const selectedService = services.find((s) => s.id === selectedServiceId);

  // Computed Tooth Count
  const computedToothCount = selectedTeeth.length > 0 ? selectedTeeth.length : 1;

  // Toggle tooth selection
  const handleToggleTooth = (toothNum: string) => {
    if (selectedTeeth.includes(toothNum)) {
      setSelectedTeeth(selectedTeeth.filter((t) => t !== toothNum));
    } else {
      setSelectedTeeth([...selectedTeeth, toothNum].sort((a, b) => Number(a) - Number(b)));
    }
  };

  const handleSelectQuadrant = (teethGroup: string[]) => {
    const allSelected = teethGroup.every((t) => selectedTeeth.includes(t));
    if (allSelected) {
      setSelectedTeeth(selectedTeeth.filter((t) => !teethGroup.includes(t)));
    } else {
      const merged = Array.from(new Set([...selectedTeeth, ...teethGroup])).sort(
        (a, b) => Number(a) - Number(b)
      );
      setSelectedTeeth(merged);
    }
  };

  const handleAddAttachment = () => {
    if (!newAttachmentRef.trim()) return;
    setAttachmentRefs([...attachmentRefs, newAttachmentRef.trim()]);
    setNewAttachmentRef('');
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachmentRefs(attachmentRefs.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId) {
      alert(isAr ? 'الرجاء اختيار الخدمة أو التركيبة المعملية المطلوبة.' : 'Please select a lab service.');
      return;
    }
    if (selectedTeeth.length === 0) {
      alert(isAr ? 'الرجاء تحديد الأسنان المطلوبة على المخطط.' : 'Please select at least one tooth.');
      return;
    }

    setIsSubmitting(true);

    const effectiveLabName = labName === 'Custom Laboratory' ? customLabName : labName;
    const effectiveDelivery = requiredDeliveryDate || deliveryDate;

    const created = createLabOrder({
      patientId,
      doctorId,
      branchId,
      organizationId,
      treatmentPlanId,
      treatmentServiceId,
      serviceId: selectedServiceId,
      serviceNameAr: selectedService?.name_ar || 'عمل معملي',
      serviceNameEn: selectedService?.name_en || 'Lab Work Order',
      labName: effectiveLabName,
      teeth: selectedTeeth,
      deliveryDate: effectiveDelivery,
      requiredDeliveryDate: effectiveDelivery,
      shadeNotes,
      materialsNotes: material || materialsNotes,
      notes: doctorNotes,
      material,
      framework,
      tryInOrFinal,
      pontic,
      abutment,
      toothCount: computedToothCount,
      productType,
      doctorNotes,
      labNotes,
      attachmentRefs,
    });

    setIsSubmitting(false);
    setSuccessMessage(true);

    if (onOrderCreated) {
      onOrderCreated(created);
    }

    setTimeout(() => {
      setSuccessMessage(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shadow-inner">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{isAr ? 'طلب أمر عمل معمل التركيبات' : 'Dental Lab Work Order'}</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[10px] font-mono">
                  PROSTHODONTICS
                </span>
              </h3>
              <p className="text-xs text-blue-200/80">
                {isAr
                  ? 'تحديد الخدمة المعملية، الأسنان المستهدفة، لون السن، وتاريخ التسليم المتوقع'
                  : 'Specify lab service, target teeth, shade, delivery date, and technician specs.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {successMessage && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-3 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                {isAr
                  ? 'تم إصدار وحفظ أمر العمل المعملي بنجاح!'
                  : 'Dental lab work order created and dispatched successfully!'}
              </span>
            </div>
          )}

          {/* SECTION 1: LAB SERVICE CATALOG SELECTION */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>{isAr ? '1. اختر الإجراء / الخدمة المعملية (Service Catalog):' : '1. Select Lab Service / Procedure:'}</span>
              </label>
              {selectedService && (
                <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-md border border-blue-200">
                  {selectedService.base_price.toLocaleString('en-US')} EGP
                </span>
              )}
            </div>

            <select
              id="lab-service-select"
              required
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 bg-white shadow-xs focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{isAr ? '-- اختر الخدمة أو التركيبة المعملية --' : '-- Select Lab Service --'}</option>
              {categories.map((cat) => {
                const catServices = services.filter((s) => s.category_id === cat.id);
                if (catServices.length === 0) return null;
                return (
                  <optgroup key={cat.id} label={isAr ? cat.name_ar : cat.name_en}>
                    {catServices.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {isAr ? srv.name_ar : srv.name_en} {srv.code ? `(${srv.code})` : ''} - {srv.base_price} EGP
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>

          {/* SECTION 2: TOOTH CHART SELECTION */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>{isAr ? '2. حدد الأسنان المستهدفة للتركيبة (Tooth Selector Chart):' : '2. Target Teeth Selection (FDI Chart):'}</span>
              </label>
              <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-md">
                {selectedTeeth.length > 0
                  ? `${selectedTeeth.length} ${isAr ? 'أسنان محددة' : 'teeth selected'} (${selectedTeeth.map(t => `#${t}`).join(', ')})`
                  : isAr ? 'لم يتم تحديد أسنان' : 'No teeth selected'}
              </span>
            </div>

            {/* Visual FDI Tooth Selection Matrix */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
              {/* Upper Arch */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-2">
                  <span>{isAr ? 'الفك العلوي (Maxilla)' : 'Upper Arch (Maxilla)'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectQuadrant(UPPER_RIGHT_TEETH)}
                      className="text-[10px] text-blue-600 hover:underline"
                    >
                      {isAr ? 'يمين علوي' : 'Upper Right'}
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleSelectQuadrant(UPPER_LEFT_TEETH)}
                      className="text-[10px] text-blue-600 hover:underline"
                    >
                      {isAr ? 'يسار علوي' : 'Upper Left'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-1.5" dir="ltr">
                  {/* Upper Right 18..11 */}
                  {UPPER_RIGHT_TEETH.map((tNum) => {
                    const isSelected = selectedTeeth.includes(tNum);
                    return (
                      <button
                        key={tNum}
                        type="button"
                        onClick={() => handleToggleTooth(tNum)}
                        className={`w-9 h-10 rounded-lg text-xs font-mono font-bold flex flex-col items-center justify-center border transition-all shadow-2xs ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm scale-105'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-blue-50 hover:border-blue-400'
                        }`}
                      >
                        <span className="text-[11px]">{tNum}</span>
                        {isSelected && <Check className="w-3 h-3 text-white -mt-0.5" />}
                      </button>
                    );
                  })}
                  <div className="w-px h-8 bg-slate-300 mx-1" />
                  {/* Upper Left 21..28 */}
                  {UPPER_LEFT_TEETH.map((tNum) => {
                    const isSelected = selectedTeeth.includes(tNum);
                    return (
                      <button
                        key={tNum}
                        type="button"
                        onClick={() => handleToggleTooth(tNum)}
                        className={`w-9 h-10 rounded-lg text-xs font-mono font-bold flex flex-col items-center justify-center border transition-all shadow-2xs ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm scale-105'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-blue-50 hover:border-blue-400'
                        }`}
                      >
                        <span className="text-[11px]">{tNum}</span>
                        {isSelected && <Check className="w-3 h-3 text-white -mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Arch Divider */}
              <div className="border-t border-dashed border-slate-200" />

              {/* Lower Arch */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-2">
                  <span>{isAr ? 'الفك السفلي (Mandible)' : 'Lower Arch (Mandible)'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectQuadrant(LOWER_RIGHT_TEETH)}
                      className="text-[10px] text-blue-600 hover:underline"
                    >
                      {isAr ? 'يمين سفلي' : 'Lower Right'}
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleSelectQuadrant(LOWER_LEFT_TEETH)}
                      className="text-[10px] text-blue-600 hover:underline"
                    >
                      {isAr ? 'يسار سفلي' : 'Lower Left'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-1.5" dir="ltr">
                  {/* Lower Right 48..41 */}
                  {LOWER_RIGHT_TEETH.map((tNum) => {
                    const isSelected = selectedTeeth.includes(tNum);
                    return (
                      <button
                        key={tNum}
                        type="button"
                        onClick={() => handleToggleTooth(tNum)}
                        className={`w-9 h-10 rounded-lg text-xs font-mono font-bold flex flex-col items-center justify-center border transition-all shadow-2xs ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm scale-105'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-blue-50 hover:border-blue-400'
                        }`}
                      >
                        <span className="text-[11px]">{tNum}</span>
                        {isSelected && <Check className="w-3 h-3 text-white -mt-0.5" />}
                      </button>
                    );
                  })}
                  <div className="w-px h-8 bg-slate-300 mx-1" />
                  {/* Lower Left 31..38 */}
                  {LOWER_LEFT_TEETH.map((tNum) => {
                    const isSelected = selectedTeeth.includes(tNum);
                    return (
                      <button
                        key={tNum}
                        type="button"
                        onClick={() => handleToggleTooth(tNum)}
                        className={`w-9 h-10 rounded-lg text-xs font-mono font-bold flex flex-col items-center justify-center border transition-all shadow-2xs ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm scale-105'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-blue-50 hover:border-blue-400'
                        }`}
                      >
                        <span className="text-[11px]">{tNum}</span>
                        {isSelected && <Check className="w-3 h-3 text-white -mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: DELIVERY DATE & LAB NAME */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>{isAr ? '3. تاريخ التسليم المطلوب (Required Delivery Date):' : '3. Required Delivery Date:'}</span>
              </label>
              <input
                type="date"
                required
                value={requiredDeliveryDate}
                onChange={(e) => {
                  setRequiredDeliveryDate(e.target.value);
                  setDeliveryDate(e.target.value);
                }}
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>{isAr ? 'اسم المعمل المتعاقد مع العيادة:' : 'Target Laboratory:'}</span>
              </label>
              <select
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white"
              >
                {EGYPT_LAB_OPTIONS.map((lab) => (
                  <option key={lab} value={lab}>
                    {lab}
                  </option>
                ))}
              </select>
              {labName === 'Custom Laboratory' && (
                <input
                  type="text"
                  placeholder={isAr ? 'أدخل اسم المعمل...' : 'Enter lab name...'}
                  value={customLabName}
                  onChange={(e) => setCustomLabName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 mt-2"
                />
              )}
            </div>
          </div>

          {/* SECTION 4: MANUFACTURING & CLINICAL SPECIFICATIONS */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-600" />
              <span>{isAr ? '4. التفاصيل الفنية والتصنيعية (Clinical & Manufacturing Specs):' : '4. Technical & Manufacturing Specifications:'}</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Product Type */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isAr ? 'نوع التركيبة (Product Type):' : 'Product Type:'}
                </label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="w-full text-xs font-bold p-2 rounded-xl border border-slate-300 bg-white"
                >
                  {PRODUCT_TYPES.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Material */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isAr ? 'خامة التصنيع (Material):' : 'Material:'}
                </label>
                <select
                  value={material}
                  onChange={(e) => {
                    setMaterial(e.target.value);
                    setMaterialsNotes(e.target.value);
                  }}
                  className="w-full text-xs font-bold p-2 rounded-xl border border-slate-300 bg-white"
                >
                  {MATERIAL_OPTIONS.map((mat) => (
                    <option key={mat} value={mat}>
                      {mat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Framework */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isAr ? 'الهيكل الداخلي (Framework):' : 'Framework / Substructure:'}
                </label>
                <select
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  className="w-full text-xs font-bold p-2 rounded-xl border border-slate-300 bg-white"
                >
                  {FRAMEWORK_OPTIONS.map((fw) => (
                    <option key={fw} value={fw}>
                      {fw}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stage: Try-In or Final */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isAr ? 'مرحلة التسليم (Try-In / Final):' : 'Delivery Stage:'}
                </label>
                <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-300 text-center text-xs">
                  <button
                    type="button"
                    onClick={() => setTryInOrFinal('try_in')}
                    className={`py-1 rounded-lg font-bold transition-all ${
                      tryInOrFinal === 'try_in'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {isAr ? 'تجربة (Try-In)' : 'Try-In'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTryInOrFinal('final')}
                    className={`py-1 rounded-lg font-bold transition-all ${
                      tryInOrFinal === 'final'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {isAr ? 'نهائي (Final)' : 'Final'}
                  </button>
                </div>
              </div>

              {/* Pontic Design */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isAr ? 'تصميم البونتك (Pontic Design):' : 'Pontic Design:'}
                </label>
                <select
                  value={pontic}
                  onChange={(e) => setPontic(e.target.value)}
                  className="w-full text-xs font-bold p-2 rounded-xl border border-slate-300 bg-white"
                >
                  {PONTIC_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Abutment Specs */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isAr ? 'الدعامة / Abutment:' : 'Abutment Specs:'}
                </label>
                <select
                  value={abutment}
                  onChange={(e) => setAbutment(e.target.value)}
                  className="w-full text-xs font-bold p-2 rounded-xl border border-slate-300 bg-white"
                >
                  {ABUTMENT_OPTIONS.map((ab) => (
                    <option key={ab} value={ab}>
                      {ab}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tooth Count & Shade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isAr ? 'عدد الأسنان المطلوبة (Tooth Count):' : 'Tooth Count:'}
                </label>
                <div className="flex items-center gap-2">
                  <span className="px-4 py-2 bg-purple-100 text-purple-900 font-mono font-bold text-xs rounded-xl border border-purple-200">
                    {computedToothCount} {isAr ? 'أسنان' : 'teeth selected'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    ({selectedTeeth.length > 0 ? `#${selectedTeeth.join(', #')}` : isAr ? 'لم يتم تحديد أسنان' : 'No teeth chosen'})
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isAr ? 'دليل لون السن (Shade Guide):' : 'Tooth Shade (Vita Guide):'}
                </label>
                <div className="flex flex-wrap gap-1 mb-1">
                  {VITA_SHADES.map((shade) => (
                    <button
                      key={shade}
                      type="button"
                      onClick={() => setShadeNotes(shade)}
                      className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border transition-all ${
                        shadeNotes === shade
                          ? 'bg-pink-600 text-white border-pink-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-pink-50'
                      }`}
                    >
                      {shade}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={shadeNotes}
                  onChange={(e) => setShadeNotes(e.target.value)}
                  placeholder={isAr ? 'أدخل لون السن...' : 'Shade notes...'}
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>

            {/* Doctor Notes vs Lab Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isAr ? 'ملاحظات الطبيب المعالج (Doctor Clinical Notes):' : 'Doctor Clinical Notes:'}</span>
                </label>
                <textarea
                  rows={2}
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  placeholder={
                    isAr
                      ? 'ملاحظات تحضير الحواف، الإطباق، متطلبات الألوان والشفافية...'
                      : 'Clinical prep margins, occlusion preferences, translucency...'
                  }
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-purple-600" />
                  <span>{isAr ? 'ملاحظات تصنيع المعمل (Lab Technician Notes):' : 'Lab Technician Manufacturing Notes:'}</span>
                </label>
                <textarea
                  rows={2}
                  value={labNotes}
                  onChange={(e) => setLabNotes(e.target.value)}
                  placeholder={
                    isAr
                      ? 'تعليمات التلميع، سمك الهيكل، مسافة التسمين الإسمنتي...'
                      : 'Sintering cycle, minimal thickness, cement gap allowance...'
                  }
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white resize-none"
                />
              </div>
            </div>

            {/* STL / Scan / Photo Attachment References */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5 text-slate-600" />
                <span>{isAr ? 'ملفات وحوالات المسح الضوئي والصور (STL / 3D Scans / Photos):' : 'STL 3D Scans & Photo Attachment References:'}</span>
              </label>

              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={newAttachmentRef}
                  onChange={(e) => setNewAttachmentRef(e.target.value)}
                  placeholder={isAr ? 'اسم ملف المسح مثلاً: LowerArch_Scan.stl أو Photo1.jpg' : 'e.g. UpperArch_Prep_Scan.stl, Shade_A2.jpg'}
                  className="flex-1 text-xs p-2 rounded-xl border border-slate-300 bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddAttachment}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAr ? 'إضافة' : 'Add'}</span>
                </button>
              </div>

              {attachmentRefs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachmentRefs.map((ref, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 flex items-center gap-1.5 shadow-2xs"
                    >
                      <Paperclip className="w-3 h-3 text-slate-400" />
                      <span>{ref}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <FlaskConical className="w-4 h-4" />
              <span>{isAr ? 'إصدار أمر العمل المعملي' : 'Dispatch Lab Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
