import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredInvoices,
  setStoredInvoices,
  getInvoiceById,
  createInvoice,
  recordInvoicePayment,
  SEED_INVOICES,
} from '../src/lib/receptionAndBillingStorage';
import { DEFAULT_EGYPT_ORG } from '../src/lib/storage';

describe('PaymentModal & Payment Collection Logic', () => {
  const ORG_ID = DEFAULT_EGYPT_ORG.id;

  beforeEach(() => {
    setStoredInvoices(SEED_INVOICES);
  });

  it('validates payment amount against remaining balance and prevents overpayment', () => {
    const invoice = createInvoice({
      organizationId: ORG_ID,
      branchId: '11111111-1111-1111-1111-111111111111',
      patientId: 'a1111111-1111-1111-1111-111111111111',
      patientType: 'cash',
      items: [{ serviceId: 'srv_003', quantity: 1 }],
    });

    const remaining = invoice.remaining_balance;
    expect(remaining).toBeGreaterThan(0);

    // Overpayment attempt
    const overpayResult = recordInvoicePayment(invoice.id, remaining + 200, {
      actorUserId: 'user_reception_01',
      receivedBy: 'user_reception_01',
      receivedByName: 'Noha Mohamed',
      paymentMethod: 'cash',
    });

    expect(overpayResult.success).toBe(false);
    expect(overpayResult.error).toContain('يتجاوز المبلغ المتبقي');
  });

  it('records partial payment using card payment method and logs received_by', () => {
    const invoice = createInvoice({
      organizationId: ORG_ID,
      branchId: '11111111-1111-1111-1111-111111111111',
      patientId: 'a1111111-1111-1111-1111-111111111111',
      patientType: 'cash',
      items: [{ serviceId: 'srv_004', quantity: 1 }],
    });

    const totalPayable = invoice.final_payable_amount;
    const partialAmount = 250;
    const expectedRemaining = totalPayable - partialAmount;

    const result = recordInvoicePayment(invoice.id, partialAmount, {
      actorUserId: 'user_reception_01',
      receivedBy: 'user_reception_01',
      receivedByName: 'Noha Mohamed',
      paymentMethod: 'card',
      referenceNumber: 'CARD-AUTH-9921',
      notes: 'Visa POS Payment',
    });

    expect(result.success).toBe(true);
    expect(result.invoice?.status).toBe('partially_paid');
    expect(result.invoice?.paid_amount).toBe(partialAmount);
    expect(result.invoice?.remaining_balance).toBe(expectedRemaining);

    const payment = result.payment;
    expect(payment).toBeDefined();
    expect(payment?.amount).toBe(partialAmount);
    expect(payment?.payment_method).toBe('card');
    expect(payment?.reference_number).toBe('CARD-AUTH-9921');
    expect(payment?.received_by).toBe('user_reception_01');
    expect(payment?.received_by_name).toBe('Noha Mohamed');
    expect(payment?.notes).toBe('Visa POS Payment');

    // Verify payment is saved on invoice
    const reloaded = getInvoiceById(invoice.id);
    expect(reloaded?.payments?.length).toBe(1);
    expect(reloaded?.payments?.[0].payment_method).toBe('card');
  });

  it('records wallet / InstaPay payment for full remaining balance and transitions invoice to paid', () => {
    const invoice = createInvoice({
      organizationId: ORG_ID,
      branchId: '11111111-1111-1111-1111-111111111111',
      patientId: 'a1111111-1111-1111-1111-111111111111',
      patientType: 'cash',
      items: [{ serviceId: 'srv_003', quantity: 1 }],
    });

    const fullAmount = invoice.remaining_balance;
    const result = recordInvoicePayment(invoice.id, fullAmount, {
      actorUserId: 'user_reception_02',
      receivedBy: 'user_reception_02',
      receivedByName: 'Ahmed Hassan',
      paymentMethod: 'wallet',
      referenceNumber: 'INSTA-EGY-88192',
    });

    expect(result.success).toBe(true);
    expect(result.invoice?.status).toBe('paid');
    expect(result.invoice?.remaining_balance).toBe(0);
    expect(result.invoice?.paid_at).toBeDefined();

    const payment = result.payment;
    expect(payment?.payment_method).toBe('wallet');
    expect(payment?.reference_number).toBe('INSTA-EGY-88192');
    expect(payment?.received_by).toBe('user_reception_02');
  });

  it('maintains multiple payment records history on the same invoice until fully paid', () => {
    const invoice = createInvoice({
      organizationId: ORG_ID,
      branchId: '11111111-1111-1111-1111-111111111111',
      patientId: 'a1111111-1111-1111-1111-111111111111',
      patientType: 'cash',
      items: [{ serviceId: 'srv_005', quantity: 1 }],
    });

    const totalPayable = invoice.final_payable_amount;
    const firstPayment = 500;
    const secondPayment = totalPayable - firstPayment;

    // Pay 1: 500 EGP Cash
    recordInvoicePayment(invoice.id, firstPayment, {
      receivedBy: 'user_01',
      receivedByName: 'Receptionist 1',
      paymentMethod: 'cash',
    });

    // Pay 2: Remaining balance via Bank Transfer
    recordInvoicePayment(invoice.id, secondPayment, {
      receivedBy: 'user_02',
      receivedByName: 'Receptionist 2',
      paymentMethod: 'bank',
      referenceNumber: 'BANK-TRF-00129',
    });

    const updatedInvoice = getInvoiceById(invoice.id);
    expect(updatedInvoice?.status).toBe('paid');
    expect(updatedInvoice?.remaining_balance).toBe(0);
    expect(updatedInvoice?.payments?.length).toBe(2);

    expect(updatedInvoice?.payments?.[0].payment_method).toBe('cash');
    expect(updatedInvoice?.payments?.[0].amount).toBe(firstPayment);

    expect(updatedInvoice?.payments?.[1].payment_method).toBe('bank');
    expect(updatedInvoice?.payments?.[1].amount).toBe(secondPayment);
    expect(updatedInvoice?.payments?.[1].reference_number).toBe('BANK-TRF-00129');
    expect(updatedInvoice?.payments?.[1].received_by_name).toBe('Receptionist 2');
  });
});
