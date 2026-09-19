import { describe, it, expect } from 'vitest';
import { formatInvoiceAmount } from '../src/components/InvoiceSummary';

describe('InvoiceSummary Component Utilities & Calculations', () => {
  it('formats amounts correctly in Arabic with ج.م symbol', () => {
    const formatted = formatInvoiceAmount(1250, 'ar');
    expect(formatted).toContain('ج.م');
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('formats amounts correctly in English with EGP symbol', () => {
    const formatted = formatInvoiceAmount(1250, 'en');
    expect(formatted).toContain('EGP');
    expect(formatted).toContain('1,250.00');
  });

  it('handles custom currency overrides', () => {
    const formatted = formatInvoiceAmount(500, 'en', 'USD');
    expect(formatted).toContain('USD');
    expect(formatted).toContain('500.00');
  });

  it('handles zero and negative amounts gracefully', () => {
    const zeroAr = formatInvoiceAmount(0, 'ar');
    expect(zeroAr).toContain('ج.م');

    const zeroEn = formatInvoiceAmount(0, 'en');
    expect(zeroEn).toContain('0.00');

    const NaNVal = formatInvoiceAmount(NaN, 'en');
    expect(NaNVal).toContain('0.00');
  });
});
