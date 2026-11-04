import { describe, expect, it } from 'vitest';
import { computeTotals, formatRand, parseNumber, roundCents, validateLine } from '../src/lib/money';

const line = (qty: number, unitPrice: number, discountPct = 0, id = 'a') => ({ id, description: 'x', qty, unitPrice, discountPct });

describe('computeTotals', () => {
  it('2 units x R100 excl VAT at 15% = R230.00', () => {
    const t = computeTotals([line(2, 100)], 15, false);
    expect(t.subtotal).toBe(20000);
    expect(t.vat).toBe(3000);
    expect(t.total).toBe(23000);
    expect(formatRand(t.total)).toBe('R230.00');
  });

  it('VAT-inclusive prices extract VAT correctly (R230 incl = R200 + R30)', () => {
    const t = computeTotals([line(2, 115)], 15, true);
    expect(t.net).toBe(20000);
    expect(t.vat).toBe(3000);
    expect(t.total).toBe(23000);
  });

  it('applies a 10% discount before VAT (mockup example: R4,000 - R400 + R540 = R4,140)', () => {
    const t = computeTotals([line(2, 1250, 10, 'a'), line(3, 500, 10, 'b')], 15, false);
    expect(t.subtotal).toBe(400000);
    expect(t.discount).toBe(40000);
    expect(t.vat).toBe(54000);
    expect(t.total).toBe(414000);
  });

  it('handles awkward rounding per line (3 x R33.33 at 15%)', () => {
    const t = computeTotals([line(3, 33.33)], 15, false);
    expect(t.net).toBe(9999); // 99.99
    expect(t.vat).toBe(1500); // 14.9985 -> 15.00
    expect(t.total).toBe(11499);
  });

  it('sums rounded lines so the total equals the sum of printed lines', () => {
    const items = [line(1, 0.01, 0, 'a'), line(1, 0.01, 0, 'b'), line(1, 0.01, 0, 'c')];
    const t = computeTotals(items, 15, false);
    expect(t.lines.reduce((s, l) => s + l.incl, 0)).toBe(t.total);
  });

  it('zero quantity contributes nothing', () => {
    const t = computeTotals([line(0, 500)], 15, false);
    expect(t.total).toBe(0);
  });

  it('treats non-numeric values as zero rather than NaN', () => {
    const t = computeTotals([line(Number.NaN, 100)], 15, false);
    expect(t.total).toBe(0);
    expect(Number.isNaN(t.total)).toBe(false);
  });

  it('clamps discount to 0-100', () => {
    expect(computeTotals([line(1, 100, 150)], 15, false).total).toBe(0);
    expect(computeTotals([line(1, 100, -20)], 15, false).total).toBe(11500);
  });

  it('respects a configurable VAT rate', () => {
    expect(computeTotals([line(1, 100)], 0, false).total).toBe(10000);
    expect(computeTotals([line(1, 100)], 14, false).total).toBe(11400);
  });
});

describe('validateLine', () => {
  it('flags zero quantity, negative price and empty description', () => {
    const v = validateLine({ id: 'a', description: '', qty: 0, unitPrice: -5 });
    expect(v.qty).toMatch(/greater than zero/);
    expect(v.unitPrice).toMatch(/negative/);
    expect(v.description).toMatch(/required/);
  });
  it('passes a valid line', () => {
    expect(validateLine({ id: 'a', description: 'ok', qty: 1, unitPrice: 10, discountPct: 5 })).toEqual({});
  });
});

describe('helpers', () => {
  it('rounds half away from zero', () => {
    expect(roundCents(0.5)).toBe(1);
    expect(roundCents(1.005 * 100)).toBe(101);
    expect(roundCents(-0.5)).toBe(-1);
  });
  it('formats rand with thousands separators and cents', () => {
    expect(formatRand(123456789)).toBe('R1,234,567.89');
    expect(formatRand(-1050)).toBe('-R10.50');
    expect(formatRand(0)).toBe('R0.00');
  });
  it('parses user input', () => {
    expect(parseNumber('R1,250.50')).toBe(1250.5);
    expect(Number.isNaN(parseNumber('abc'))).toBe(true);
    expect(Number.isNaN(parseNumber(''))).toBe(true);
  });
});
