import * as XLSX from 'xlsx';
import { validateExcelPriceListRows } from '../../lib/receptionAndBillingStorage';
import { ExcelImportResult } from '../../types/receptionAndBilling';

export interface RawExcelRow {
  service_code?: string;
  service_name_ar?: string;
  service_name_en?: string;
  category?: string;
  cash_price?: any;
  active?: any;
}

/**
 * Normalizes header keys from Arabic or English variants to canonical keys.
 */
function normalizeRowKeys(rawRow: Record<string, any>): RawExcelRow {
  const result: RawExcelRow = {};

  for (const [key, val] of Object.entries(rawRow)) {
    const cleanKey = key.trim().toLowerCase();

    if (
      cleanKey.includes('code') ||
      cleanKey.includes('كود') ||
      cleanKey === 'service code'
    ) {
      result.service_code = val;
    } else if (
      cleanKey.includes('name arabic') ||
      cleanKey.includes('بالعربية') ||
      cleanKey.includes('name_ar') ||
      cleanKey === 'service name arabic'
    ) {
      result.service_name_ar = val;
    } else if (
      cleanKey.includes('name english') ||
      cleanKey.includes('بالإنجليزية') ||
      cleanKey.includes('name_en') ||
      cleanKey === 'service name english'
    ) {
      result.service_name_en = val;
    } else if (
      cleanKey.includes('category') ||
      cleanKey.includes('تصنيف') ||
      cleanKey.includes('قسم')
    ) {
      result.category = val;
    } else if (
      cleanKey.includes('price') ||
      cleanKey.includes('سعر') ||
      cleanKey.includes('cash') ||
      cleanKey === 'cash price'
    ) {
      result.cash_price = val;
    } else if (
      cleanKey.includes('active') ||
      cleanKey.includes('نشط') ||
      cleanKey.includes('حالة')
    ) {
      result.active = val;
    }
  }

  return result;
}

/**
 * Parses an uploaded File (Excel .xlsx, .xls or CSV) and validates each row
 */
export async function parseAndValidateExcelFile(file: File): Promise<ExcelImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rawJsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: '',
  });

  const normalizedRows: RawExcelRow[] = rawJsonRows.map(normalizeRowKeys);

  return validateExcelPriceListRows(normalizedRows);
}

/**
 * Generates sample Excel binary / CSV data for demonstration and download
 */
export function generateSampleExcelBuffer(): Uint8Array {
  const sampleData = [
    {
      'Service Code': 'SRV-001',
      'Service Name Arabic': 'الكشف العام واستشارة طبيب الأسنان',
      'Service Name English': 'General Examination & Consultation',
      'Category': 'examinations',
      'Cash Price': 320,
      'Active': true,
    },
    {
      'Service Code': 'SRV-002',
      'Service Name Arabic': 'كشف واستشارة أسنان أطفال',
      'Service Name English': 'Pediatric Dental Consultation',
      'Category': 'pediatric',
      'Cash Price': 380,
      'Active': true,
    },
    {
      'Service Code': 'SRV-003',
      'Service Name Arabic': 'تنظيف وتلميع الأسنان وإزالة الجير',
      'Service Name English': 'Ultrasonic Scaling & Polishing',
      'Category': 'preventive',
      'Cash Price': 650,
      'Active': true,
    },
    {
      'Service Code': 'SRV-004',
      'Service Name Arabic': 'حشو تجميلي مركب نانو كومبوزيت',
      'Service Name English': 'Nano-Composite Cosmetic Filling',
      'Category': 'restorative',
      'Cash Price': 900,
      'Active': true,
    },
    {
      'Service Code': 'SRV-005',
      'Service Name Arabic': 'علاج جذور وعصب لضرس خلفي',
      'Service Name English': 'Molar Root Canal Treatment',
      'Category': 'endodontics',
      'Cash Price': 2350,
      'Active': true,
    },
    {
      'Service Code': 'SRV-006',
      'Service Name Arabic': 'خلع جراحي لضرس العقل المدفون',
      'Service Name English': 'Surgical Wisdom Tooth Extraction',
      'Category': 'surgery',
      'Cash Price': 1950,
      'Active': true,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PriceList2026');

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

/**
 * Generates sample Excel binary for Insurance Price List
 */
export function generateInsuranceExcelBuffer(): Uint8Array {
  const sampleData = [
    {
      'Service Code': 'SRV-001',
      'Service Name Arabic': 'الكشف العام واستشارة طبيب الأسنان',
      'Service Name English': 'General Examination & Consultation',
      'Category': 'examinations',
      'Insurance Agreed Price': 280,
      'Coverage Percent': 80,
      'Patient Copay Percent': 20,
      'Requires Pre-Approval': false,
      'Active': true,
    },
    {
      'Service Code': 'SRV-003',
      'Service Name Arabic': 'تنظيف وتلميع الأسنان وإزالة الجير',
      'Service Name English': 'Ultrasonic Scaling & Polishing',
      'Category': 'preventive',
      'Insurance Agreed Price': 550,
      'Coverage Percent': 80,
      'Patient Copay Percent': 20,
      'Requires Pre-Approval': false,
      'Active': true,
    },
    {
      'Service Code': 'SRV-005',
      'Service Name Arabic': 'علاج جذور وعصب لضرس خلفي',
      'Service Name English': 'Molar Root Canal Treatment',
      'Category': 'endodontics',
      'Insurance Agreed Price': 2000,
      'Coverage Percent': 75,
      'Patient Copay Percent': 25,
      'Requires Pre-Approval': true,
      'Active': true,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'InsuranceTariff2026');

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

/**
 * Exports current active Cash Services to Excel for batch editing
 */
export function exportActiveCashPriceListBuffer(services: any[]): Uint8Array {
  const data = (services || []).map((s) => ({
    'Service Code': s.code,
    'Service Name Arabic': s.name_ar,
    'Service Name English': s.name_en,
    'Category': s.category,
    'Cash Price': (s as any).cash_price || 0,
    'Active': s.active !== false,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data.length > 0 ? data : [
    {
      'Service Code': 'SRV-001',
      'Service Name Arabic': 'الكشف العام واستشارة طبيب الأسنان',
      'Service Name English': 'General Examination & Consultation',
      'Category': 'examinations',
      'Cash Price': 320,
      'Active': true,
    }
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ActiveCashPriceList');

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

/**
 * Exports current active Insurance Price List items to Excel for batch editing
 */
export function exportActiveInsurancePriceListBuffer(items: any[]): Uint8Array {
  const data = (items || []).map((i) => ({
    'Service Code': i.service_code || i.service?.code || '',
    'Service Name Arabic': i.service?.name_ar || '',
    'Service Name English': i.service?.name_en || '',
    'Category': i.service?.category || 'general',
    'Insurance Agreed Price': i.insurance_price || 0,
    'Coverage Percent': i.coverage_percentage || 80,
    'Patient Copay Percent': i.patient_copay_percentage || 20,
    'Requires Pre-Approval': i.requires_approval || false,
    'Active': i.active !== false,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data.length > 0 ? data : [
    {
      'Service Code': 'SRV-001',
      'Service Name Arabic': 'الكشف العام واستشارة طبيب الأسنان',
      'Service Name English': 'General Examination & Consultation',
      'Category': 'examinations',
      'Insurance Agreed Price': 280,
      'Coverage Percent': 80,
      'Patient Copay Percent': 20,
      'Requires Pre-Approval': false,
      'Active': true,
    }
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ActiveInsuranceTariff');

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}
