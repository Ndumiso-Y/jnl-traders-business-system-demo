import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IcoDoc, IcoPlus, IcoSearch } from '../../components/Icons';
import { Empty, PageHeader, Panel, Stat, Tag, type TagTone } from '../../components/ui';
import { formatRand } from '../../lib/money';
import { formatDate } from '../../lib/dates';
import { invoiceDerived, outstanding, thisMonthInvoiced } from '../../lib/selectors';
import { useStore } from '../../store/useStore';

const STATE: Record<string, [string, TagTone]> = { draft: ['Draft', 'gold'], open: ['Unpaid', 'blue'], 'part-paid': ['Part paid', 'amber'], paid: ['Paid', 'green'], overdue: ['Overdue', 'red'], void: ['Void', 'dark'] };

export default function InvoicesList() {
  const navigate = useNavigate();
  const invoices = useStore((s) => s.invoices);
  const payments = useStore((s) => s.payments);
  const customers = useStore((s) => s.customers);
  const createInvoice = useStore((s) => s.createInvoice);
  const [q, setQ] = useState('');
  const [state, setState] = useState('all');

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return invoices
      .map((inv) => ({ inv, d: invoiceDerived(inv, payments) }))
      .filter(({ d }) => state === 'all' || d.state === state)
      .filter(({ inv }) => !term || inv.number.toLowerCase().includes(term) || (customers.find((c) => c.id === inv.customerId)?.name ?? '').toLowerCase().includes(term))
      .sort((a, b) => b.inv.date.localeCompare(a.inv.date) || b.inv.createdAt.localeCompare(a.inv.createdAt));
  }, [invoices, payments, customers, q, state]);

  const month = thisMonthInvoiced(invoices);
  const out = outstanding(invoices, payments);

  return (
    <>
      <PageHeader kicker="Finance / Documents" title="Invoices" subtitle="Issue fictional invoices, record payments and keep statements accurate."
        actions={<button className="btn primary" onClick={() => { const n = createInvoice(); navigate(`/finance/invoices/${n.id}`); }} data-testid="new-invoice"><IcoPlus />New invoice</button>} />
      <div className="stat-grid">
        <Stat label="Invoiced this month" value={formatRand(month.total)} sub={`${month.count} issued`} />
        <Stat label="Outstanding" value={formatRand(out.total)} sub={`${out.count} open`} />
        <Stat label="Overdue" value={out.overdue} tone={out.overdue ? 'red' : undefined} sub="Past due date, unpaid" />
        <Stat label="All invoices" value={invoices.length} sub="Fictional documents" />
      </div>
      <Panel title="Invoice register" meta="Search by number or customer">
        <div className="toolbar">
          <label className="search-box"><IcoSearch /><input placeholder="Search invoices" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search invoices" data-testid="search" /></label>
          <select className="select" value={state} onChange={(e) => setState(e.target.value)} aria-label="Filter by state">
            <option value="all">All states</option>
            {Object.entries(STATE).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Due</th><th>State</th><th className="num">Total</th><th className="num">Balance</th></tr></thead>
            <tbody>
              {rows.map(({ inv, d }) => {
                const [label, tone] = STATE[d.state];
                return (
                  <tr key={inv.id} className="clickable" tabIndex={0} role="link" onClick={() => navigate(`/finance/invoices/${inv.id}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/finance/invoices/${inv.id}`); } }} data-testid="invoice-row">
                    <td><div className="cell-flex"><span className="row-icon"><IcoDoc /></span><div><strong>{inv.number}</strong><small>{inv.sourceQuotationId ? 'From quotation' : 'Direct invoice'}</small></div></div></td>
                    <td>{customers.find((c) => c.id === inv.customerId)?.name ?? <em>No customer</em>}</td>
                    <td>{formatDate(inv.date)}</td>
                    <td>{formatDate(inv.dueDate)}</td>
                    <td><Tag tone={tone}>{label}</Tag></td>
                    <td className="num"><strong>{formatRand(d.total)}</strong></td>
                    <td className="num">{formatRand(inv.status === 'issued' ? d.balance : 0)}</td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={7}><Empty title="No invoices match" body={q ? 'Try a different search term.' : 'Create an invoice or convert a quotation.'} /></td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
