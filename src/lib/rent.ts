import type { RentPayment, Tenant } from '../store/types';
import { toCents } from './money';
import { formatDate, monthLabel, parseIso, todayIso, toIso } from './dates';

export type LedgerLine = { date: string; ref: string; description: string; debit: number; credit: number; balance: number };

/** Months (YYYY-MM) charged for a lease: from the lease start month up to the earlier of today and the lease end. */
export function chargedMonths(leaseStart: string, leaseEnd: string | undefined, today = todayIso()): string[] {
  if (!leaseStart || leaseStart > today) return [];
  const last = leaseEnd && leaseEnd < today ? leaseEnd : today;
  const out: string[] = [];
  const d = parseIso(leaseStart);
  d.setDate(1);
  while (toIso(d) <= last) {
    out.push(toIso(d).slice(0, 7));
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

/** Rent ledger: one charge per month plus recorded payments, in date order with a running balance (cents). */
export function rentLedger(t: Tenant, payments: RentPayment[], today = todayIso()): { lines: LedgerLine[]; charged: number; paid: number; balance: number; monthsCharged: number; monthsInArrears: number } {
  const rent = toCents(t.rent);
  const events: Array<{ date: string; order: number; ref: string; description: string; debit: number; credit: number }> = [];
  const months = chargedMonths(t.leaseStart, t.leaseEnd, today);
  for (const m of months) events.push({ date: `${m}-01`, order: 0, ref: `RENT ${m}`, description: `Rent for ${monthLabel(m)}${t.unitRef ? ` · ${t.unitRef}` : ''}`, debit: rent, credit: 0 });
  if (toCents(t.deposit) > 0 && t.leaseStart <= today) events.push({ date: t.leaseStart, order: -1, ref: 'DEPOSIT', description: 'Deposit due (fictional)', debit: toCents(t.deposit), credit: 0 });
  for (const p of payments.filter((x) => x.tenantId === t.id)) events.push({ date: p.date, order: 1, ref: p.reference || 'Payment', description: `Payment received (${p.method.toUpperCase()})`, debit: 0, credit: toCents(p.amount) });
  events.sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);
  let bal = 0; let charged = 0; let paid = 0;
  const lines = events.map((e) => { bal += e.debit - e.credit; charged += e.debit; paid += e.credit; return { date: e.date, ref: e.ref, description: e.description, debit: e.debit, credit: e.credit, balance: bal }; });
  const monthsInArrears = rent > 0 ? Math.max(0, Math.floor(bal / rent)) : 0;
  return { lines, charged, paid, balance: bal, monthsCharged: months.length, monthsInArrears };
}

export function describeLease(t: Tenant): string {
  return `${formatDate(t.leaseStart)} – ${t.leaseEnd ? formatDate(t.leaseEnd) : 'open-ended'}`;
}
