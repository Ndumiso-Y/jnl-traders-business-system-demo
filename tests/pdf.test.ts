import { describe, expect, it } from 'vitest';
import { buildDocumentPdf, buildStatementLines, buildStatementPdf, DEMO_STAMP } from '../src/lib/pdf';
import type { Customer, Invoice, Payment, Quotation } from '../src/store/types';

const customer: Customer = { id: 'c1', name: 'Example Industrial Client (Pty) Ltd', contact: 'A. Sample', email: 'accounts@example.com', phone: '', address: '1 Sample Road' };
const quotation: Quotation = {
  id: 'q1', number: 'Q-D0999', customerId: 'c1', date: '2026-11-04', validUntil: '2026-12-04',
  items: [{ id: 'l1', description: 'Fictional widget', qty: 2, unitPrice: 100, discountPct: 0 }],
  vatRate: 15, pricesIncludeVat: false, notes: 'Demo note', status: 'draft', createdAt: '', updatedAt: '',
};

describe('PDF generation', () => {
  it('produces a real PDF with the demo stamp, document number and line items', () => {
    const doc = buildDocumentPdf('quotation', quotation, customer, 'JNL Traders');
    const raw = doc.output();
    expect(raw.startsWith('%PDF-')).toBe(true);
    expect(raw).toContain(DEMO_STAMP);
    expect(raw).toContain('Q-D0999');
    expect(raw).toContain('Fictional widget');
    expect(raw).toContain('R230.00');
    expect(raw).toContain('Example Industrial Client'); // parentheses are escaped inside PDF streams
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('statement lines run chronologically with a running balance', () => {
    const inv: Invoice = { ...quotation, id: 'i1', number: 'INV-D0999', dueDate: '2026-12-04', status: 'issued' };
    const payments: Payment[] = [{ id: 'p1', invoiceId: 'i1', date: '2026-11-10', amount: 100, method: 'eft', reference: 'X', createdAt: '' }];
    const s = buildStatementLines([inv], payments);
    expect(s.lines.map((l) => l.balance)).toEqual([23000, 13000]);
    expect(s.invoiced).toBe(23000);
    expect(s.received).toBe(10000);
    expect(s.balance).toBe(13000);
    const pdf = buildStatementPdf(customer, [inv], payments, 'JNL Traders', '2026-11-11').output();
    expect(pdf).toContain('INV-D0999');
    expect(pdf).toContain('R130.00');
  });
});
