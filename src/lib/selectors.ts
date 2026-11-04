import type { Asset, DataState, Invoice, Payment, Quotation, Request } from '../store/types';
import { computeTotals, toCents } from './money';
import { dueState, monthKey, todayIso, type DueState } from './dates';

export function docTotal(doc: Pick<Invoice | Quotation, 'items' | 'vatRate' | 'pricesIncludeVat'>) {
  return computeTotals(doc.items, doc.vatRate, doc.pricesIncludeVat);
}

export function paidForInvoice(payments: Payment[], invoiceId: string): number {
  return payments.filter((p) => p.invoiceId === invoiceId).reduce((sum, p) => sum + toCents(p.amount), 0);
}

export type InvoiceDerived = { total: number; paid: number; balance: number; state: 'draft' | 'paid' | 'part-paid' | 'overdue' | 'open' | 'void' };

export function invoiceDerived(inv: Invoice, payments: Payment[], today = todayIso()): InvoiceDerived {
  const total = docTotal(inv).total;
  const paid = paidForInvoice(payments, inv.id);
  const balance = total - paid;
  let state: InvoiceDerived['state'];
  if (inv.status === 'draft') state = 'draft';
  else if (inv.status === 'void') state = 'void';
  else if (balance <= 0 && total > 0) state = 'paid';
  else if (paid > 0) state = inv.dueDate < today ? 'overdue' : 'part-paid';
  else state = inv.dueDate < today ? 'overdue' : 'open';
  return { total, paid, balance, state };
}

export type MonthBucket = { key: string; invoiced: number; received: number; costs: number };

/** Aggregate invoices issued, payments received and expenses by month (cents). */
export function monthlySeries(state: Pick<DataState, 'invoices' | 'payments' | 'expenses'>, months: string[]): MonthBucket[] {
  const map = new Map<string, MonthBucket>(months.map((m) => [m, { key: m, invoiced: 0, received: 0, costs: 0 }]));
  for (const inv of state.invoices) {
    if (inv.status !== 'issued') continue;
    const b = map.get(monthKey(inv.date));
    if (b) b.invoiced += docTotal(inv).total;
  }
  for (const p of state.payments) {
    const b = map.get(monthKey(p.date));
    if (b) b.received += toCents(p.amount);
  }
  for (const e of state.expenses) {
    const b = map.get(monthKey(e.date));
    if (b) b.costs += toCents(e.amount);
  }
  return months.map((m) => map.get(m)!);
}

export function lastMonths(n: number, from = todayIso()): string[] {
  const [y, m] = from.split('-').map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export function pendingRequests(requests: Request[]): Request[] {
  return requests.filter((r) => r.status === 'submitted');
}

export type RenewalItem = { asset: Asset; kind: 'Service' | 'Licence' | 'Insurance' | 'Inspection'; date: string; state: DueState };

export function assetRenewals(assets: Asset[], today = todayIso(), window = 30): RenewalItem[] {
  const out: RenewalItem[] = [];
  for (const a of assets) {
    const pairs: Array<[RenewalItem['kind'], string | undefined]> = [
      ['Service', a.serviceDue], ['Licence', a.licenceDue], ['Insurance', a.insuranceDue], ['Inspection', a.inspectionDue],
    ];
    for (const [kind, date] of pairs) {
      if (!date) continue;
      const state = dueState(date, today, window);
      out.push({ asset: a, kind, date, state });
    }
  }
  return out.sort((x, y) => x.date.localeCompare(y.date));
}

export function assetAttention(a: Asset, today = todayIso()): DueState {
  const states = [a.serviceDue, a.licenceDue, a.insuranceDue, a.inspectionDue].map((d) => dueState(d, today));
  if (states.includes('overdue')) return 'overdue';
  if (states.includes('due-soon')) return 'due-soon';
  if (states.every((s) => s === 'none')) return 'none';
  return 'ok';
}

export function thisMonthInvoiced(invoices: Invoice[], today = todayIso()): { total: number; count: number } {
  const key = monthKey(today);
  let total = 0; let count = 0;
  for (const inv of invoices) {
    if (inv.status !== 'issued' || monthKey(inv.date) !== key) continue;
    total += docTotal(inv).total; count += 1;
  }
  return { total, count };
}

export function outstanding(invoices: Invoice[], payments: Payment[]): { total: number; count: number; overdue: number } {
  let total = 0; let count = 0; let overdue = 0;
  for (const inv of invoices) {
    const d = invoiceDerived(inv, payments);
    if (inv.status !== 'issued' || d.balance <= 0) continue;
    total += d.balance; count += 1;
    if (d.state === 'overdue') overdue += 1;
  }
  return { total, count, overdue };
}
