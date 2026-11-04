import type { Invoice, Payment } from '../store/types';
import { computeTotals, toCents } from './money';
import { formatDate } from './dates';

export type StatementLine = { date: string; ref: string; description: string; debit: number; credit: number; balance: number };

export function buildStatementLines(invoices: Invoice[], payments: Payment[]): { lines: StatementLine[]; invoiced: number; received: number; balance: number } {
  const events: Array<{ date: string; order: number; ref: string; description: string; debit: number; credit: number; createdAt: string }> = [];
  for (const inv of invoices) {
    if (inv.status !== 'issued') continue;
    events.push({ date: inv.date, order: 0, ref: inv.number, description: `Invoice issued · due ${formatDate(inv.dueDate)}`, debit: computeTotals(inv.items, inv.vatRate, inv.pricesIncludeVat).total, credit: 0, createdAt: inv.createdAt });
  }
  const invIds = new Set(invoices.map((i) => i.id));
  for (const p of payments) {
    if (!invIds.has(p.invoiceId)) continue;
    const inv = invoices.find((i) => i.id === p.invoiceId);
    events.push({ date: p.date, order: 1, ref: p.reference || 'Payment', description: `Payment received (${p.method.toUpperCase()}) · ${inv?.number ?? ''}`, debit: 0, credit: toCents(p.amount), createdAt: p.createdAt });
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  let bal = 0; let invoiced = 0; let received = 0;
  const lines = events.map((e) => { bal += e.debit - e.credit; invoiced += e.debit; received += e.credit; return { date: e.date, ref: e.ref, description: e.description, debit: e.debit, credit: e.credit, balance: bal }; });
  return { lines, invoiced, received, balance: bal };
}

