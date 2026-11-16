import { describe, expect, it } from 'vitest';
import { chargedMonths, rentLedger } from '../src/lib/rent';
import type { RentPayment, Tenant } from '../src/store/types';

const tenant: Tenant = { id: 't1', ref: 'TEN-D900', name: 'Tenant T-0900', contact: '', phone: '', email: '', unitRef: 'Bay 9', leaseStart: '2026-08-15', leaseEnd: '2027-08-14', rent: 5000, deposit: 5000, status: 'active', notes: '', createdAt: '', updatedAt: '' };
const pay = (date: string, amount: number, id = date): RentPayment => ({ id, tenantId: 't1', date, amount, method: 'eft', reference: `P-${date}`, createdAt: '' });

describe('rent ledger', () => {
  it('charges one month of rent per month from the lease start month up to today', () => {
    expect(chargedMonths('2026-08-15', '2027-08-14', '2026-11-16')).toEqual(['2026-08', '2026-09', '2026-10', '2026-11']);
    expect(chargedMonths('2026-12-01', undefined, '2026-11-16')).toEqual([]); // future lease
    expect(chargedMonths('2026-01-01', '2026-03-31', '2026-11-16')).toEqual(['2026-01', '2026-02', '2026-03']); // ended lease stops at its end
  });

  it('computes balance and months in arrears from charges and payments', () => {
    const payments = [pay('2026-08-15', 5000, 'dep'), pay('2026-08-20', 5000), pay('2026-09-03', 5000)];
    const l = rentLedger(tenant, payments, '2026-11-16');
    expect(l.charged).toBe(25_000_00); // deposit + 4 months
    expect(l.paid).toBe(15_000_00);
    expect(l.balance).toBe(10_000_00);
    expect(l.monthsInArrears).toBe(2);
    expect(l.lines[l.lines.length - 1].balance).toBe(10_000_00);
  });

  it('a payment brings the tenant up to date and overpayment shows as credit', () => {
    const payments = [pay('2026-08-15', 5000, 'dep'), pay('2026-08-20', 5000), pay('2026-09-03', 5000), pay('2026-10-02', 5000), pay('2026-11-02', 5000)];
    expect(rentLedger(tenant, payments, '2026-11-16').balance).toBe(0);
    expect(rentLedger(tenant, [...payments, pay('2026-11-10', 1000, 'x')], '2026-11-16').balance).toBe(-1000_00);
  });

  it('keeps lines in date order with the deposit first on the lease start date', () => {
    const l = rentLedger(tenant, [pay('2026-08-15', 5000, 'dep')], '2026-09-01');
    expect(l.lines.map((x) => x.ref)).toEqual(['RENT 2026-08', 'DEPOSIT', 'P-2026-08-15', 'RENT 2026-09']);
  });
});
