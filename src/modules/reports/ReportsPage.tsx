import { useMemo, useState } from 'react';
import { IcoPlus, IcoTrash } from '../../components/Icons';
import { Empty, Field, Modal, Notice, PageHeader, Panel, Stat } from '../../components/ui';
import { formatRand, parseNumber, toCents } from '../../lib/money';
import { formatDate, monthLabel, monthShort, todayIso } from '../../lib/dates';
import { invoiceDerived, lastMonths, monthlySeries } from '../../lib/selectors';
import { useStore } from '../../store/useStore';
import type { Expense, ExpenseCategory } from '../../store/types';

const CATEGORIES: Record<ExpenseCategory, string> = { fuel: 'Fuel', maintenance: 'Maintenance', ppe: 'PPE', supplies: 'Supplies', insurance: 'Insurance', licences: 'Licences', salaries: 'Salaries', other: 'Other' };

export default function ReportsPage() {
  const invoices = useStore((s) => s.invoices);
  const payments = useStore((s) => s.payments);
  const expenses = useStore((s) => s.expenses);
  const requests = useStore((s) => s.requests);
  const purchaseOrders = useStore((s) => s.purchaseOrders);
  const assets = useStore((s) => s.assets);
  const addExpense = useStore((s) => s.addExpense);
  const deleteExpense = useStore((s) => s.deleteExpense);
  const toast = useStore((s) => s.toast);

  const months = lastMonths(8);
  const [from, setFrom] = useState(months[0]);
  const [to, setTo] = useState(months[months.length - 1]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<{ date: string; category: ExpenseCategory; description: string; amount: string; assetId: string }>({ date: todayIso(), category: 'fuel', description: '', amount: '', assetId: '' });
  const [err, setErr] = useState<Record<string, string>>({});

  const range = useMemo(() => months.filter((m) => m >= from && m <= to), [months, from, to]);
  const series = useMemo(() => monthlySeries({ invoices, payments, expenses }, range), [invoices, payments, expenses, range]);
  const totals = series.reduce((acc, b) => ({ invoiced: acc.invoiced + b.invoiced, received: acc.received + b.received, costs: acc.costs + b.costs }), { invoiced: 0, received: 0, costs: 0 });
  const max = Math.max(1, ...series.map((b) => Math.max(b.invoiced, b.received, b.costs)));

  const byCategory = useMemo(() => {
    const map = new Map<ExpenseCategory, number>();
    for (const e of expenses) if (e.date.slice(0, 7) >= from && e.date.slice(0, 7) <= to) map.set(e.category, (map.get(e.category) ?? 0) + toCents(e.amount));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses, from, to]);
  const catMax = Math.max(1, ...byCategory.map(([, v]) => v));

  const outstandingTotal = invoices.filter((i) => i.status === 'issued').reduce((s, i) => s + Math.max(0, invoiceDerived(i, payments).balance), 0);
  const reqInRange = requests.filter((r) => r.createdAt.slice(0, 7) >= from && r.createdAt.slice(0, 7) <= to);
  const poByMonth = range.map((m) => {
    const pos = purchaseOrders.filter((p) => p.date.slice(0, 7) === m);
    const value = pos.reduce((t, p) => t + p.items.reduce((x, it) => x + toCents(it.qty * it.estUnitCost), 0), 0);
    return { key: m, count: pos.length, open: pos.filter((p) => p.status === 'open').length, received: pos.filter((p) => p.status === 'received').length, closed: pos.filter((p) => p.status === 'closed').length, value };
  });
  const poTotals = poByMonth.reduce((a, b) => ({ count: a.count + b.count, value: a.value + b.value }), { count: 0, value: 0 });
  const recentExpenses = [...expenses].filter((e) => e.date.slice(0, 7) >= from && e.date.slice(0, 7) <= to).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const n = parseNumber(form.amount);
    if (!form.description.trim()) errs.description = 'Describe the cost.';
    if (!Number.isFinite(n) || n <= 0) errs.amount = 'Enter an amount greater than zero.';
    if (!form.date) errs.date = 'Enter a date.';
    setErr(errs);
    if (Object.keys(errs).length) return;
    const ex: Omit<Expense, 'id' | 'createdAt'> = { date: form.date, category: form.category, description: form.description.trim(), amount: Math.round(n * 100) / 100, assetId: form.assetId || undefined };
    addExpense(ex);
    setAddOpen(false); setForm({ date: todayIso(), category: 'fuel', description: '', amount: '', assetId: '' });
    toast('Fictional cost recorded.');
  };

  return (
    <>
      <PageHeader kicker="Finance / Reports" title="Monthly reports" subtitle="Aggregates computed from the demo records in this browser. Invoices issued, payments received and recorded costs are shown separately — this is not a profit statement."
        actions={<button className="btn primary" onClick={() => setAddOpen(true)} data-testid="add-expense"><IcoPlus />Record cost</button>} />
      <div className="toolbar">
        <Field label="From"><select className="select" value={from} onChange={(e) => setFrom(e.target.value)} data-testid="from-month">{months.map((m) => <option key={m} value={m} disabled={m > to}>{monthLabel(m)}</option>)}</select></Field>
        <Field label="To"><select className="select" value={to} onChange={(e) => setTo(e.target.value)} data-testid="to-month">{months.map((m) => <option key={m} value={m} disabled={m < from}>{monthLabel(m)}</option>)}</select></Field>
      </div>
      <div className="stat-grid">
        <Stat label="Invoices issued" value={formatRand(totals.invoiced)} sub="Incl. VAT, in range" />
        <Stat label="Payments received" value={formatRand(totals.received)} sub="Fictional receipts, in range" />
        <Stat label="Recorded costs" value={formatRand(totals.costs)} sub="Expense register, in range" />
        <Stat label="Outstanding (all time)" value={formatRand(outstandingTotal)} tone={outstandingTotal ? 'gold' : undefined} sub="Issued invoices not yet settled" />
      </div>
      <div className="grid-2">
        <Panel title="Invoiced · received · costs by month" meta="Three separate measures — incomplete cashflow is not called profit">
          <div className="bars" style={{ gap: 10 }} role="img" aria-label={series.map((b) => `${monthShort(b.key)}: invoiced ${formatRand(b.invoiced)}, received ${formatRand(b.received)}, costs ${formatRand(b.costs)}`).join('; ')}>
            {[0.25, 0.5, 0.75].map((f) => <div key={f} className="gridline" style={{ bottom: `${f * 100}%` }} />)}
            {series.map((b) => (
              <div key={b.key} className="bar" style={{ flexDirection: 'row', gap: 3, alignItems: 'flex-end' }} title={`${monthLabel(b.key)} · invoiced ${formatRand(b.invoiced)} · received ${formatRand(b.received)} · costs ${formatRand(b.costs)}`}>
                <div className="fill" style={{ height: `${Math.max(2, (b.invoiced / max) * 100)}%`, background: '#cdb27c' }} />
                <div className="fill" style={{ height: `${Math.max(2, (b.received / max) * 100)}%`, background: '#2f352f' }} />
                <div className="fill" style={{ height: `${Math.max(2, (b.costs / max) * 100)}%`, background: '#d7a8a3' }} />
              </div>
            ))}
          </div>
          <div className="bar-labels" style={{ gap: 10 }}>{series.map((b) => <span key={b.key}>{monthShort(b.key)}</span>)}</div>
          <ul className="legend" style={{ flexDirection: 'row', gap: 18, marginTop: 14, flexWrap: 'wrap' }}>
            <li><span className="swatch" style={{ background: '#cdb27c' }} />Invoiced</li>
            <li><span className="swatch" style={{ background: '#2f352f' }} />Received</li>
            <li><span className="swatch" style={{ background: '#d7a8a3' }} />Costs</li>
          </ul>
        </Panel>
        <Panel title="Costs by category" meta="Recorded expenses in range">
          {byCategory.length ? (
            <ul className="list">
              {byCategory.map(([cat, v]) => (
                <li key={cat} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{CATEGORIES[cat]}</b><b style={{ fontSize: 13 }}>{formatRand(v)}</b></div>
                  <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 4 }}><div style={{ width: `${(v / catMax) * 100}%`, height: '100%', background: 'var(--gold)', borderRadius: 4 }} /></div>
                </li>
              ))}
            </ul>
          ) : <Empty title="No costs in range" />}
        </Panel>
      </div>
      <div className="grid-2">
        <Panel title="Monthly table" meta="Exact figures for the selected range">
          <div className="table-wrap">
            <table className="table" data-testid="monthly-table">
              <thead><tr><th>Month</th><th className="num">Invoiced</th><th className="num">Received</th><th className="num">Costs</th><th className="num">Received − costs</th></tr></thead>
              <tbody>
                {series.map((b) => <tr key={b.key}><td><strong>{monthLabel(b.key)}</strong></td><td className="num">{formatRand(b.invoiced)}</td><td className="num">{formatRand(b.received)}</td><td className="num">{formatRand(b.costs)}</td><td className="num"><strong>{formatRand(b.received - b.costs)}</strong></td></tr>)}
                <tr><td><strong>Total</strong></td><td className="num"><strong>{formatRand(totals.invoiced)}</strong></td><td className="num"><strong>{formatRand(totals.received)}</strong></td><td className="num"><strong>{formatRand(totals.costs)}</strong></td><td className="num"><strong>{formatRand(totals.received - totals.costs)}</strong></td></tr>
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 14 }}><Notice tone="grey">"Received − costs" is a simple cash view of the demo records only. It excludes unpaid invoices, salaries not recorded, tax and any real accounting treatment.</Notice></div>
        </Panel>
        <Panel title="Purchase orders by period" meta="PO-period statistics from the fictional orders">
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12, marginBottom: 14 }}>
            <Stat label="Requests raised" value={reqInRange.length} sub={`${reqInRange.filter((r) => r.status === 'approved' || r.status === 'fulfilled').length} approved · ${reqInRange.filter((r) => r.status === 'rejected').length} rejected`} />
            <Stat label="Purchase orders" value={poTotals.count} sub={`${formatRand(poTotals.value)} estimated`} />
          </div>
          <div className="table-wrap">
            <table className="table" data-testid="po-table">
              <thead><tr><th>Month</th><th className="num">POs</th><th className="num">Open</th><th className="num">Received</th><th className="num">Closed</th><th className="num">Est. value</th></tr></thead>
              <tbody>
                {poByMonth.filter((b) => b.count > 0).map((b) => <tr key={b.key}><td><strong>{monthLabel(b.key)}</strong></td><td className="num">{b.count}</td><td className="num">{b.open}</td><td className="num">{b.received}</td><td className="num">{b.closed}</td><td className="num"><strong>{formatRand(b.value)}</strong></td></tr>)}
                {poTotals.count === 0 && <tr><td colSpan={6}><Empty title="No purchase orders in range" /></td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
      <Panel title="Cost register" meta="Most recent fictional costs in range">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Asset</th><th className="num">Amount</th><th /></tr></thead>
            <tbody>
              {recentExpenses.map((e) => <tr key={e.id} data-testid="expense-row"><td>{formatDate(e.date)}</td><td><strong>{e.description}</strong></td><td>{CATEGORIES[e.category]}</td><td>{assets.find((a) => a.id === e.assetId)?.ref ?? '—'}</td><td className="num"><strong>{formatRand(toCents(e.amount))}</strong></td><td><button className="circle-button" style={{ width: 30, height: 30 }} aria-label="Delete cost" onClick={() => { deleteExpense(e.id); toast('Cost removed.', 'info'); }}><IcoTrash style={{ width: 13, height: 13 }} /></button></td></tr>)}
              {!recentExpenses.length && <tr><td colSpan={6}><Empty title="No costs recorded in range" /></td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
      <Modal open={addOpen} title="Record fictional cost" sub="Feeds the monthly report and any linked asset." onClose={() => setAddOpen(false)}>
        <form onSubmit={submit} className="form-grid">
          <Field label="Description" error={err.description} className="span-2"><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} aria-invalid={!!err.description} data-testid="expense-description" /></Field>
          <Field label="Amount (R)" error={err.amount}><input className="input num" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} aria-invalid={!!err.amount} data-testid="expense-amount" /></Field>
          <Field label="Date" error={err.date}><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Category"><select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>{Object.entries(CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Linked asset (optional)"><select className="select" value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })}><option value="">None</option>{assets.map((a) => <option key={a.id} value={a.id}>{a.ref} · {a.name}</option>)}</select></Field>
          <div className="span-2 modal-foot"><button type="button" className="btn" onClick={() => setAddOpen(false)}>Cancel</button><button type="submit" className="btn primary" data-testid="expense-submit">Record cost</button></div>
        </form>
      </Modal>
    </>
  );
}
