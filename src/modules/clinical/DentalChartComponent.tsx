import React, { useState } from 'react';
import {
  ToothCondition,
  ToothSurface,
  DentalChartEntry,
  ChartType,
} from '../../types/clinical';
import { useLanguage } from '../i18n/LanguageContext';
import {
  saveDentalChartEntry,
  getToothHistory,
  getStoredDentalChartEntries,
} from '../../lib/clinicalStorage';
import { useAuth } from '../auth/AuthContext';
import {
  CheckCircle2,
  Clock,
  History,
  Info,
  X,
  Plus,
} from 'lucide-react';

interface DentalChartProps {
  patientId: string;
  chartType?: ChartType;
  onEntriesChange?: () => void;
}

// Tooth Condition Metadata
export const CONDITION_CONFIG: Record<
  ToothCondition,
  { label_ar: string; label_en: string; color: string; bg: string; border: string; badge: string }
> = {
  sound: {
    label_ar: 'سليم (Sound)',
    label_en: 'Sound / Healthy',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  caries: {
    label_ar: 'تسوس (Caries)',
    label_en: 'Dental Caries',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-400',
    badge: 'bg-rose-100 text-rose-800',
  },
  filling: {
    label_ar: 'حشوة (Filling)',
    label_en: 'Restoration / Filling',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-400',
    badge: 'bg-blue-100 text-blue-800',
  },
  crown: {
    label_ar: 'تاج / طربوش (Crown)',
    label_en: 'Prosthetic Crown',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-400',
    badge: 'bg-amber-100 text-amber-800',
  },
  root_canal: {
    label_ar: 'علاج عصب (Root Canal)',
    label_en: 'Root Canal Treated',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-400',
    badge: 'bg-purple-100 text-purple-800',
  },
  implant: {
    label_ar: 'زرعة سنية (Implant)',
    label_en: 'Dental Implant',
    color: 'text-cyan-700',
    bg: 'bg-cyan-50',
    border: 'border-cyan-400',
    badge: 'bg-cyan-100 text-cyan-800',
  },
  missing: {
    label_ar: 'مفقود / مخلوع (Missing)',
    label_en: 'Missing / Extracted',
    color: 'text-slate-400',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
    badge: 'bg-slate-200 text-slate-700',
  },
  extraction: {
    label_ar: 'يحتاج خلع (Needs Extraction)',
    label_en: 'Indicated for Extraction',
    color: 'text-red-800',
    bg: 'bg-red-50',
    border: 'border-red-500',
    badge: 'bg-red-100 text-red-900',
  },
  fracture: {
    label_ar: 'كسر بالسن (Fracture)',
    label_en: 'Tooth Fracture',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-400',
    badge: 'bg-orange-100 text-orange-800',
  },
  planned_treatment: {
    label_ar: 'مخطط للعلاج (Planned)',
    label_en: 'Planned Treatment',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-400',
    badge: 'bg-indigo-100 text-indigo-800',
  },
  impacted: {
    label_ar: 'سن مطمور (Impacted)',
    label_en: 'Impacted Tooth',
    color: 'text-zinc-700',
    bg: 'bg-zinc-100',
    border: 'border-zinc-400',
    badge: 'bg-zinc-200 text-zinc-800',
  },
  bridge_abutment: {
    label_ar: 'دعامة جسر (Bridge Abutment)',
    label_en: 'Bridge Abutment',
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-400',
    badge: 'bg-teal-100 text-teal-800',
  },
  pontic: {
    label_ar: 'سن معلق بجسر (Pontic)',
    label_en: 'Bridge Pontic',
    color: 'text-teal-600',
    bg: 'bg-teal-50/50',
    border: 'border-teal-300 border-dashed',
    badge: 'bg-teal-50 text-teal-700',
  },
};

// Adult FDI Teeth Matrix (FDI 2-digit notation)
// Quadrant 1 (Upper Right): 18, 17, 16, 15, 14, 13, 12, 11
// Quadrant 2 (Upper Left):  21, 22, 23, 24, 25, 26, 27, 28
// Quadrant 4 (Lower Right): 48, 47, 46, 45, 44, 43, 42, 41
// Quadrant 3 (Lower Left):  31, 32, 33, 34, 35, 36, 37, 38

const ADULT_UPPER_RIGHT = ['18', '17', '16', '15', '14', '13', '12', '11'];
const ADULT_UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
const ADULT_LOWER_RIGHT = ['48', '47', '46', '45', '44', '43', '42', '41'];
const ADULT_LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];

// Pediatric FDI Deciduous Teeth (51-55, 61-65, 81-85, 71-75)
const PEDO_UPPER_RIGHT = ['55', '54', '53', '52', '51'];
const PEDO_UPPER_LEFT = ['61', '62', '63', '64', '65'];
const PEDO_LOWER_RIGHT = ['85', '84', '83', '82', '81'];
const PEDO_LOWER_LEFT = ['71', '72', '73', '74', '75'];

// Universal Numbering mapping
const FDI_TO_UNIVERSAL: Record<string, string> = {
  // Adult Upper (1-16)
  '18': '1', '17': '2', '16': '3', '15': '4', '14': '5', '13': '6', '12': '7', '11': '8',
  '21': '9', '22': '10', '23': '11', '24': '12', '25': '13', '26': '14', '27': '15', '28': '16',
  // Adult Lower (17-32)
  '38': '17', '37': '18', '36': '19', '35': '20', '34': '21', '33': '22', '32': '23', '31': '24',
  '41': '25', '42': '26', '43': '27', '44': '28', '45': '29', '46': '30', '47': '31', '48': '32',
  // Deciduous Upper (A-J)
  '55': 'A', '54': 'B', '53': 'C', '52': 'D', '51': 'E',
  '61': 'F', '62': 'G', '63': 'H', '64': 'I', '65': 'J',
  // Deciduous Lower (K-T)
  '75': 'K', '74': 'L', '73': 'M', '72': 'N', '71': 'O',
  '81': 'P', '82': 'Q', '83': 'R', '84': 'S', '85': 'T',
};

const TOOTH_NAMES: Record<string, { ar: string; en: string }> = {
  '18': { ar: 'ضرس عقل علوي أيمن', en: 'Maxillary Right 3rd Molar' },
  '17': { ar: 'ضرس ثانٍ علوي أيمن', en: 'Maxillary Right 2nd Molar' },
  '16': { ar: 'ضرس أول علوي أيمن', en: 'Maxillary Right 1st Molar' },
  '15': { ar: 'ضاحك ثانٍ علوي أيمن', en: 'Maxillary Right 2nd Premolar' },
  '14': { ar: 'ضاحك أول علوي أيمن', en: 'Maxillary Right 1st Premolar' },
  '13': { ar: 'ناب علوي أيمن', en: 'Maxillary Right Canine' },
  '12': { ar: 'قاطع جانبي علوي أيمن', en: 'Maxillary Right Lateral Incisor' },
  '11': { ar: 'قاطع مركزي علوي أيمن', en: 'Maxillary Right Central Incisor' },
  '21': { ar: 'قاطع مركزي علوي أيسر', en: 'Maxillary Left Central Incisor' },
  '22': { ar: 'قاطع جانبي علوي أيسر', en: 'Maxillary Left Lateral Incisor' },
  '23': { ar: 'ناب علوي أيسر', en: 'Maxillary Left Canine' },
  '24': { ar: 'ضاحك أول علوي أيسر', en: 'Maxillary Left 1st Premolar' },
  '25': { ar: 'ضاحك ثانٍ علوي أيسر', en: 'Maxillary Left 2nd Premolar' },
  '26': { ar: 'ضرس أول علوي أيسر', en: 'Maxillary Left 1st Molar' },
  '27': { ar: 'ضرس ثانٍ علوي أيسر', en: 'Maxillary Left 2nd Molar' },
  '28': { ar: 'ضرس عقل علوي أيسر', en: 'Maxillary Left 3rd Molar' },
  '38': { ar: 'ضرس عقل سفلي أيسر', en: 'Mandibular Left 3rd Molar' },
  '37': { ar: 'ضرس ثانٍ سفلي أيسر', en: 'Mandibular Left 2nd Molar' },
  '36': { ar: 'ضرس أول سفلي أيسر', en: 'Mandibular Left 1st Molar' },
  '35': { ar: 'ضاحك ثانٍ سفلي أيسر', en: 'Mandibular Left 2nd Premolar' },
  '34': { ar: 'ضاحك أول سفلي أيسر', en: 'Mandibular Left 1st Premolar' },
  '33': { ar: 'ناب سفلي أيسر', en: 'Mandibular Left Canine' },
  '32': { ar: 'قاطع جانبي سفلي أيسر', en: 'Mandibular Left Lateral Incisor' },
  '31': { ar: 'قاطع مركزي سفلي أيسر', en: 'Mandibular Left Central Incisor' },
  '41': { ar: 'قاطع مركزي سفلي أيمن', en: 'Mandibular Right Central Incisor' },
  '42': { ar: 'قاطع جانبي سفلي أيمن', en: 'Mandibular Right Lateral Incisor' },
  '43': { ar: 'ناب سفلي أيمن', en: 'Mandibular Right Canine' },
  '44': { ar: 'ضاحك أول سفلي أيمن', en: 'Mandibular Right 1st Premolar' },
  '45': { ar: 'ضاحك ثانٍ سفلي أيمن', en: 'Mandibular Right 2nd Premolar' },
  '46': { ar: 'ضرس أول سفلي أيمن', en: 'Mandibular Right 1st Molar' },
  '47': { ar: 'ضرس ثانٍ سفلي أيمن', en: 'Mandibular Right 2nd Molar' },
  '48': { ar: 'ضرس عقل سفلي أيمن', en: 'Mandibular Right 3rd Molar' },
};

export const DentalChartComponent: React.FC<DentalChartProps> = ({
  patientId,
  chartType: initialChartType = 'adult',
  onEntriesChange,
}) => {
  const { isRtl } = useLanguage();
  const { session } = useAuth();
  const [activeChartType, setActiveChartType] = useState<ChartType>(initialChartType);
  const [notation, setNotation] = useState<'fdi' | 'universal'>('fdi');
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);

  // Modal State for adding/updating tooth condition
  const [conditionInput, setConditionInput] = useState<ToothCondition>('caries');
  const [selectedSurfaces, setSelectedSurfaces] = useState<ToothSurface[]>(['occlusal']);
  const [notesInput, setNotesInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch chart entries
  const allEntries = getStoredDentalChartEntries().filter((e) => e.patient_id === patientId);

  // Helper to get latest entry for a specific tooth
  const getLatestToothEntry = (toothNum: string): DentalChartEntry | undefined => {
    const entries = allEntries.filter((e) => e.tooth_number === toothNum);
    if (entries.length === 0) return undefined;
    return entries.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  };

  const handleOpenToothModal = (toothNum: string) => {
    setSelectedTooth(toothNum);
    const latest = getLatestToothEntry(toothNum);
    if (latest) {
      setConditionInput(latest.condition);
      setSelectedSurfaces(latest.surfaces || []);
      setNotesInput(latest.notes || '');
    } else {
      setConditionInput('caries');
      setSelectedSurfaces(['occlusal']);
      setNotesInput('');
    }
  };

  const handleToggleSurface = (surface: ToothSurface) => {
    if (selectedSurfaces.includes(surface)) {
      setSelectedSurfaces(selectedSurfaces.filter((s) => s !== surface));
    } else {
      setSelectedSurfaces([...selectedSurfaces, surface]);
    }
  };

  const handleSaveToothCondition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTooth) return;

    setIsSaving(true);
    try {
      saveDentalChartEntry({
        patientId,
        toothNumber: selectedTooth,
        condition: conditionInput,
        surfaces: selectedSurfaces.length > 0 ? selectedSurfaces : undefined,
        notes: notesInput.trim() || undefined,
        doctorId: session?.profile.id || 'prof_doc_01',
        organizationId: session?.profile.organization_id,
      });

      if (onEntriesChange) {
        onEntriesChange();
      }
      setSelectedTooth(null);
    } finally {
      setIsSaving(false);
    }
  };

  // Render Tooth Box
  const renderTooth = (toothNum: string) => {
    const entry = getLatestToothEntry(toothNum);
    const cond = entry?.condition || 'sound';
    const cfg = CONDITION_CONFIG[cond];
    const displayNum = notation === 'fdi' ? toothNum : FDI_TO_UNIVERSAL[toothNum] || toothNum;
    const isSelected = selectedTooth === toothNum;

    return (
      <button
        key={toothNum}
        type="button"
        id={`tooth-btn-${toothNum}`}
        onClick={() => handleOpenToothModal(toothNum)}
        className={`relative flex flex-col items-center justify-between p-2 rounded-lg border transition-all duration-150 min-w-[54px] min-h-[72px] sm:min-w-[62px] sm:min-h-[82px] ${
          isSelected
            ? 'ring-2 ring-blue-600 ring-offset-2 scale-105 z-10 shadow-md'
            : 'hover:shadow-md hover:scale-102'
        } ${cfg.bg} ${cfg.border}`}
      >
        {/* Top Notation Header */}
        <div className="flex items-center justify-between w-full px-0.5">
          <span className="text-xs font-black tracking-tight text-slate-800">
            #{displayNum}
          </span>
          {entry && entry.condition !== 'sound' && (
            <span
              className={`w-2 h-2 rounded-full ${
                entry.condition === 'caries'
                  ? 'bg-rose-500 animate-pulse'
                  : entry.condition === 'root_canal'
                  ? 'bg-purple-600'
                  : entry.condition === 'implant'
                  ? 'bg-cyan-600'
                  : 'bg-blue-600'
              }`}
            />
          )}
        </div>

        {/* Visual Tooth Silhouette & Condition Icon */}
        <div className="my-1 flex flex-col items-center justify-center">
          {cond === 'missing' ? (
            <span className="text-xl font-bold text-slate-400">✕</span>
          ) : cond === 'implant' ? (
            <div className="flex flex-col items-center text-cyan-600">
              <span className="text-sm font-black">🔩</span>
            </div>
          ) : cond === 'crown' ? (
            <div className="flex flex-col items-center text-amber-600">
              <span className="text-sm font-black">👑</span>
            </div>
          ) : (
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded border border-slate-300 bg-white flex items-center justify-center shadow-xs">
              {/* Surfaces cross pattern */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-0.5 pointer-events-none">
                <div
                  className={`col-start-2 row-start-1 rounded-xs ${
                    entry?.surfaces?.includes('buccal') ? 'bg-rose-400' : 'bg-transparent'
                  }`}
                />
                <div
                  className={`col-start-1 row-start-2 rounded-xs ${
                    entry?.surfaces?.includes('mesial') ? 'bg-rose-400' : 'bg-transparent'
                  }`}
                />
                <div
                  className={`col-start-2 row-start-2 rounded-xs ${
                    entry?.surfaces?.includes('occlusal') || entry?.surfaces?.includes('incisal')
                      ? cond === 'caries'
                        ? 'bg-rose-500'
                        : cond === 'filling'
                        ? 'bg-blue-500'
                        : 'bg-slate-100'
                      : 'bg-slate-50'
                  }`}
                />
                <div
                  className={`col-start-3 row-start-2 rounded-xs ${
                    entry?.surfaces?.includes('distal') ? 'bg-rose-400' : 'bg-transparent'
                  }`}
                />
                <div
                  className={`col-start-2 row-start-3 rounded-xs ${
                    entry?.surfaces?.includes('lingual') || entry?.surfaces?.includes('palatal')
                      ? 'bg-rose-400'
                      : 'bg-transparent'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Condition short text */}
        <span
          className={`text-[10px] font-bold text-center leading-tight truncate w-full px-0.5 ${cfg.color}`}
        >
          {isRtl ? cfg.label_ar.split(' ')[0] : cfg.label_en.split(' ')[0]}
        </span>
      </button>
    );
  };

  const selectedToothHistory = selectedTooth ? getToothHistory(patientId, selectedTooth) : [];

  return (
    <div className="space-y-6" id="dental-chart-container">
      {/* Controls Bar: Chart Type (Adult/Child), Numbering System, Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              id="chart-type-adult"
              onClick={() => setActiveChartType('adult')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeChartType === 'adult'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isRtl ? 'مخطط البالغين (32 سناً)' : 'Adult Dentition (32 Teeth)'}
            </button>
            <button
              type="button"
              id="chart-type-pediatric"
              onClick={() => setActiveChartType('pediatric')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeChartType === 'pediatric'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isRtl ? 'مخطط الأطفال (20 سناً لبنياً)' : 'Pediatric / Deciduous (20 Teeth)'}
            </button>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              id="notation-fdi"
              onClick={() => setNotation('fdi')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                notation === 'fdi'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              FDI (11-48)
            </button>
            <button
              type="button"
              id="notation-universal"
              onClick={() => setNotation('universal')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                notation === 'universal'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Universal (1-32)
            </button>
          </div>
        </div>

        {/* Quick Guide Indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Info className="w-4 h-4 text-blue-600" />
          <span>
            {isRtl
              ? 'انقر على أي سن لتعديل حالته، تحديد الأسطح، وتسجيل الملاحظات السريرية'
              : 'Click any tooth to record condition, surfaces, and clinical notes.'}
          </span>
        </div>
      </div>

      {/* Interactive Dental Arches Container */}
      <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-md space-y-6 overflow-x-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs text-slate-400 font-semibold tracking-wider uppercase">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>{isRtl ? 'الجهة اليمنى للمريض (Right)' : "Patient's Right (R)"}</span>
          </div>
          <span className="text-slate-300 font-bold">
            {activeChartType === 'adult'
              ? isRtl
                ? 'الفك العلوي (Maxillary Arch)'
                : 'Upper Maxillary Arch'
              : isRtl
              ? 'الفك العلوي اللبني (Pediatric Upper)'
              : 'Pediatric Upper Arch'}
          </span>
          <div className="flex items-center gap-2">
            <span>{isRtl ? 'الجهة اليسرى للمريض (Left)' : "Patient's Left (L)"}</span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
        </div>

        {/* UPPER ARCH (Maxillary) */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-1 sm:gap-2 w-full">
            {/* Upper Right Quadrant (Q1) */}
            <div className="flex items-center gap-1 sm:gap-1.5 justify-end">
              {(activeChartType === 'adult' ? ADULT_UPPER_RIGHT : PEDO_UPPER_RIGHT).map((t) =>
                renderTooth(t)
              )}
            </div>

            {/* Midline Divider */}
            <div className="h-16 w-0.5 bg-blue-500/50 mx-1 flex items-center justify-center">
              <span className="text-[10px] text-blue-400 font-bold bg-slate-900 px-0.5">MID</span>
            </div>

            {/* Upper Left Quadrant (Q2) */}
            <div className="flex items-center gap-1 sm:gap-1.5 justify-start">
              {(activeChartType === 'adult' ? ADULT_UPPER_LEFT : PEDO_UPPER_LEFT).map((t) =>
                renderTooth(t)
              )}
            </div>
          </div>
        </div>

        {/* Occlusal Midplane Horizontal Line */}
        <div className="relative flex items-center justify-center my-4">
          <div className="w-full border-t border-dashed border-slate-700" />
          <span className="absolute bg-slate-800 text-slate-300 text-[11px] font-bold px-4 py-1 rounded-full border border-slate-700">
            {isRtl ? 'مستوى الإطباق (Occlusal Plane)' : 'Occlusal Plane'}
          </span>
        </div>

        {/* LOWER ARCH (Mandibular) */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-1 sm:gap-2 w-full">
            {/* Lower Right Quadrant (Q4) */}
            <div className="flex items-center gap-1 sm:gap-1.5 justify-end">
              {(activeChartType === 'adult' ? ADULT_LOWER_RIGHT : PEDO_LOWER_RIGHT).map((t) =>
                renderTooth(t)
              )}
            </div>

            {/* Midline Divider */}
            <div className="h-16 w-0.5 bg-blue-500/50 mx-1 flex items-center justify-center">
              <span className="text-[10px] text-blue-400 font-bold bg-slate-900 px-0.5">MID</span>
            </div>

            {/* Lower Left Quadrant (Q3) */}
            <div className="flex items-center gap-1 sm:gap-1.5 justify-start">
              {(activeChartType === 'adult' ? ADULT_LOWER_LEFT : PEDO_LOWER_LEFT).map((t) =>
                renderTooth(t)
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400 font-semibold tracking-wider uppercase">
          <span>{isRtl ? 'الجهة اليمنى (Right)' : 'Right (R)'}</span>
          <span className="text-slate-300 font-bold">
            {activeChartType === 'adult'
              ? isRtl
                ? 'الفك السفلي (Mandibular Arch)'
                : 'Lower Mandibular Arch'
              : isRtl
              ? 'الفك السفلي اللبني (Pediatric Lower)'
              : 'Pediatric Lower Arch'}
          </span>
          <span>{isRtl ? 'الجهة اليسرى (Left)' : 'Left (L)'}</span>
        </div>
      </div>

      {/* Conditions Legend */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
          {isRtl ? 'دليل حالات وتشخيص الأسنان السريري:' : 'Clinical Tooth Condition Legend:'}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {(Object.keys(CONDITION_CONFIG) as ToothCondition[]).map((cKey) => {
            const cfg = CONDITION_CONFIG[cKey];
            return (
              <div
                key={cKey}
                className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium ${cfg.bg} ${cfg.border} ${cfg.color}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-current opacity-80" />
                <span className="truncate">{isRtl ? cfg.label_ar : cfg.label_en}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal / Drawer for Tooth Condition Updating & Historical Record */}
      {selectedTooth && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
          id="tooth-detail-modal"
        >
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                  #{selectedTooth}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isRtl
                      ? TOOTH_NAMES[selectedTooth]?.ar || `السن #${selectedTooth}`
                      : TOOTH_NAMES[selectedTooth]?.en || `Tooth #${selectedTooth}`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isRtl ? 'تسجيل الحالة السريرية وتاريخ الإجراءات' : 'Record condition & procedure history'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTooth(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <form id="tooth-condition-form" onSubmit={handleSaveToothCondition} className="space-y-5">
                {/* Condition Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {isRtl ? 'الحالة السريرية للسن:' : 'Tooth Condition / Status:'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(Object.keys(CONDITION_CONFIG) as ToothCondition[]).map((cKey) => {
                      const cfg = CONDITION_CONFIG[cKey];
                      const isSelected = conditionInput === cKey;
                      return (
                        <button
                          key={cKey}
                          type="button"
                          onClick={() => setConditionInput(cKey)}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold text-left transition-all ${
                            isSelected
                              ? 'ring-2 ring-blue-600 bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isSelected ? 'bg-blue-600' : 'bg-slate-400'
                            }`}
                          />
                          <span className="truncate">{isRtl ? cfg.label_ar : cfg.label_en}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tooth Surfaces (Mesial, Distal, Occlusal, Buccal, Lingual) */}
                {['caries', 'filling', 'planned_treatment', 'fracture'].includes(conditionInput) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      {isRtl ? 'أسطح السن المتأثرة (Surfaces):' : 'Affected Tooth Surfaces:'}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { id: 'occlusal', label_ar: 'إطباقي (O - Occlusal)', label_en: 'Occlusal (O)' },
                          { id: 'mesial', label_ar: 'إنسي (M - Mesial)', label_en: 'Mesial (M)' },
                          { id: 'distal', label_ar: 'وحشي (D - Distal)', label_en: 'Distal (D)' },
                          { id: 'buccal', label_ar: 'دهليزي / شيدقي (B - Buccal)', label_en: 'Buccal (B)' },
                          { id: 'lingual', label_ar: 'لساني / حنكي (L - Lingual)', label_en: 'Lingual (L)' },
                          { id: 'cervical', label_ar: 'عنقي (C - Cervical)', label_en: 'Cervical (C)' },
                        ] as { id: ToothSurface; label_ar: string; label_en: string }[]
                      ).map((surf) => {
                        const active = selectedSurfaces.includes(surf.id);
                        return (
                          <button
                            key={surf.id}
                            type="button"
                            onClick={() => handleToggleSurface(surf.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              active
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {isRtl ? surf.label_ar : surf.label_en}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Clinical Notes for this Tooth */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {isRtl ? 'ملاحظات وتوصيات الطبيب للسن:' : 'Doctor Clinical Notes for Tooth:'}
                  </label>
                  <textarea
                    rows={2}
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder={
                      isRtl
                        ? 'مثال: تسوس عميق واصل للعاج، يحتاج عزل مطاطي وحشو كمبوزيت ذو طبقات...'
                        : 'e.g. Deep dentinal caries, requires rubber dam isolation and layered composite...'
                    }
                    className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-hidden resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSelectedTooth(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    id="save-tooth-condition-btn"
                    disabled={isSaving}
                    className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isRtl ? 'حفظ التحديث السريري' : 'Save Tooth Record'}</span>
                  </button>
                </div>
              </form>

              {/* Tooth Historical Record Timeline */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-slate-500" />
                  <h4 className="text-xs font-bold text-slate-800">
                    {isRtl
                      ? `سجل التاريخ السريري للسن #${selectedTooth}:`
                      : `Clinical History for Tooth #${selectedTooth}:`}
                  </h4>
                </div>

                {selectedToothHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    {isRtl ? 'لا يوجد سجلات سابقة مسجلة لهذا السن.' : 'No previous records for this tooth.'}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {selectedToothHistory.map((hist) => {
                      const cfg = CONDITION_CONFIG[hist.condition];
                      return (
                        <div
                          key={hist.id}
                          className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-start justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${cfg.badge}`}
                              >
                                {isRtl ? cfg.label_ar : cfg.label_en}
                              </span>
                              {hist.surfaces && hist.surfaces.length > 0 && (
                                <span className="text-[10px] font-mono text-slate-600">
                                  [{hist.surfaces.join(', ')}]
                                </span>
                              )}
                            </div>
                            {hist.notes && (
                              <p className="text-slate-700 mt-1 text-[11px]">{hist.notes}</p>
                            )}
                          </div>
                          <div className="text-right whitespace-nowrap text-[10px] text-slate-400">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(hist.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
