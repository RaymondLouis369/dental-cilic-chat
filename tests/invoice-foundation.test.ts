import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredInvoices,
  setStoredInvoices,
  getInvoiceById,
  getInvoicesForPatient,
  createInvoice,
  recordInvoicePayment,
  updateInvoiceStatus,
  resolvePricing,
  SEED_INVOICES,
} from '../src/lib/receptionAndBillingStorage';
import { DEFAULT_EGYPT_ORG } from '../src/lib/storage';

describe('Invoice & Invoice Items Foundation Engine', () => {
  const ORG_ID = DEFAULT_EGYPT_ORG.id; // '00000000-0000-0000-0000-000000000001'

  beforeEach(() => {
    // Reset stored invoices to seed state
    setStoredInvoices(SEED_INVOICES);
  });

  it('retrieves seed invoices with correct transaction-time snapshot items', () => {
    const invoices = getStoredInvoices(ORG_ID);
    expect(invoices.length).toBeGreaterThanOrEqual(2);

    const cashInvoice = invoices.find((i) => i.id === 'inv_2026_001');
    expect(cashInvoice).toBeDefined();
    expect(cashInvoice?.invoice_number).toBe('INV-20260917-001');
    expect(cashInvoice?.patient_type).toBe('cash');
    expect(cashInvoice?.subtotal_amount).toBe(1000.0);
    expect(cashInvoice?.insurance_total_amount).toBe(0.0);
    expect(cashInvoice?.final_payable_amount).toBe(1000.0);
    expect(cashInvoice?.status).toBe('paid');
    expect(cashInvoice?.items.length).toBe(2);

    const firstItem = cashInvoice?.items[0];
    expect(firstItem?.service_code).toBe('SRV-PREV-01');
    expect(firstItem?.unit_price).toBe(350.0);
    expect(firstItem?.insurance_amount).toBe(0.0);
    expect(firstItem?.patient_copay_amount).toBe(350.0);
  });

  it('creates cash invoice for multiple services with accurate transaction-time values', () => {
    const resSrv3 = resolvePricing({ organizationId: ORG_ID, serviceId: 'srv_003' });
    const resSrv4 = resolvePricing({ organizationId: ORG_ID, serviceId: 'srv_004' });

    const expectedSubtotal = resSrv3.total_price * 1 + resSrv4.total_price * 2;

    const invoice = createInvoice({
      organizationId: ORG_ID,
      branchId: '11111111-1111-1111-1111-111111111111',
      patientId: 'a1111111-1111-1111-1111-111111111111',
      doctorId: 'prof_doc_01',
      patientType: 'cash',
      items: [
        { serviceId: 'srv_003', quantity: 1 },
        { serviceId: 'srv_004', quantity: 2 },
      ],
    });

    expect(invoice).toBeDefined();
    expect(invoice.invoice_number).toMatch(/^INV-\d{8}-\d{3}$/);
    expect(invoice.patient_type).toBe('cash');
    expect(invoice.subtotal_amount).toBe(expectedSubtotal);
    expect(invoice.insurance_total_amount).toBe(0.0);
    expect(invoice.patient_total_amount).toBe(expectedSubtotal);
    expect(invoice.final_payable_amount).toBe(expectedSubtotal);
    expect(invoice.paid_amount).toBe(0.0);
    expect(invoice.remaining_balance).toBe(expectedSubtotal);
    expect(invoice.status).toBe('unpaid');

    expect(invoice.items.length).toBe(2);
    expect(invoice.items[0].gross_amount).toBe(resSrv3.total_price);
    expect(invoice.items[1].quantity).toBe(2);
    expect(invoice.items[1].unit_price).toBe(resSrv4.total_price);
    expect(invoice.items[1].gross_amount).toBe(resSrv4.total_price * 2);
  });

  it('creates insured invoice using existing pricing and insurance resolution results', () => {
    // Patient 'c3333333-3333-3333-3333-333333333333' has AXA insurance (80/20)
    const resSrv5 = resolvePricing({
      organizationId: ORG_ID,
      patientId: 'c3333333-3333-3333-3333-333333333333',
      serviceId: 'srv_005',
      patientInsuranceCompanyId: 'ins_comp_axa',
    });

    const invoice = createInvoice({
      organizationId: ORG_ID,
      branchId: '11111111-1111-1111-1111-111111111111',
      patientId: 'c3333333-3333-3333-3333-333333333333',
      insuranceCompanyId: 'ins_comp_axa',
      patientType: 'insured',
      items: [
        { serviceId: 'srv_005', quantity: 1 },
      ],
    });

    expect(invoice.patient_type).toBe('insured');
    expect(invoice.subtotal_amount).toBe(resSrv5.total_price);
    expect(invoice.insurance_total_amount).toBe(resSrv5.insurance_coverage);
    expect(invoice.patient_total_amount).toBe(resSrv5.patient_copay);
    expect(invoice.final_payable_amount).toBe(resSrv5.patient_copay);
    expect(invoice.remaining_balance).toBe(resSrv5.patient_copay);
    expect(invoice.status).toBe('unpaid');

    const item = invoice.items[0];
    expect(item.insurance_percentage).toBe(resSrv5.coverage_percentage);
    expect(item.insurance_amount).toBe(resSrv5.insurance_coverage);
    expect(item.patient_copay_percentage).toBe(resSrv5.copay_percentage);
    expect(item.patient_copay_amount).toBe(resSrv5.patient_copay);
  });

  it('records partial and full payments and correctly transitions invoice status', () => {
    const resSrv3 = resolvePricing({ organizationId: ORG_ID, serviceId: 'srv_003' });
    const fullPrice = resSrv3.total_price;

    const invoice = createInvoice({
      organizationId: ORG_ID,
      branchId: '11111111-1111-1111-1111-111111111111',
      patientId: 'a1111111-1111-1111-1111-111111111111',
      patientType: 'cash',
      items: [{ serviceId: 'srv_003', quantity: 1 }],
    });

    expect(invoice.status).toBe('unpaid');
    expect(invoice.remaining_balance).toBe(fullPrice);

    // 1. Partial payment of 100 EGP
    const res1 = recordInvoicePayment(invoice.id, 100.0);
    expect(res1.success).toBe(true);
    expect(res1.invoice?.paid_amount).toBe(100.0);
    expect(res1.invoice?.remaining_balance).toBe(fullPrice - 100.0);
    expect(res1.invoice?.status).toBe('partially_paid');

    // 2. Remaining payment
    const res2 = recordInvoicePayment(invoice.id, fullPrice - 100.0);
    expect(res2.success).toBe(true);
    expect(res2.invoice?.paid_amount).toBe(fullPrice);
    expect(res2.invoice?.remaining_balance).toBe(0.0);
    expect(res2.invoice?.status).toBe('paid');
    expect(res2.invoice?.paid_at).toBeDefined();
  });

  it('handles discounts and tax correctly on final payable amount', () => {
    const resSrv3 = resolvePricing({ organizationId: ORG_ID, serviceId: 'srv_003' });
    const fullPrice = resSrv3.total_price;

    const invoice = createInvoice({
      organizationId: ORG_ID,
      branchId: '11111111-1111-1111-1111-111111111111',
      patientId: 'a1111111-1111-1111-1111-111111111111',
      patientType: 'cash',
      discountTotalAmount: 50.0,
      taxTotalAmount: 20.0,
      items: [{ serviceId: 'srv_003', quantity: 1 }],
    });

    const expectedFinal = fullPrice - 50.0 + 20.0;

    expect(invoice.subtotal_amount).toBe(fullPrice);
    expect(invoice.discount_total_amount).toBe(50.0);
    expect(invoice.tax_total_amount).toBe(20.0);
    expect(invoice.final_payable_amount).toBe(expectedFinal);
    expect(invoice.remaining_balance).toBe(expectedFinal);
  });

  it('supports updating status directly and cancelling invoices', () => {
    const inv = getInvoiceById('inv_2026_002');
    expect(inv).toBeDefined();

    const ok = updateInvoiceStatus('inv_2026_002', 'cancelled');
    expect(ok).toBe(true);

    const updated = getInvoiceById('inv_2026_002');
    expect(updated?.status).toBe('cancelled');

    // Trying to collect payment on a cancelled invoice fails
    const res = recordInvoicePayment('inv_2026_002', 50.0);
    expect(res.success).toBe(false);
    expect(res.error).toContain('ملغاة');
  });

  it('enforces tenant branch & patient filtering', () => {
    const patientInvoices = getInvoicesForPatient('a1111111-1111-1111-1111-111111111111');
    expect(patientInvoices.length).toBeGreaterThanOrEqual(1);
    expect(patientInvoices.every((i) => i.patient_id === 'a1111111-1111-1111-1111-111111111111')).toBe(true);
  });
});
