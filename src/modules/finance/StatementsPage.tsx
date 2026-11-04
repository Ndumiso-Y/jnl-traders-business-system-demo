import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IcoDownload } from '../../components/Icons';
import { Empty, Notice, PageHeader, Panel, Stat } from '../../components/ui';
import { formatRand } from '../../lib/money';
import { formatDate, todayIso } from '../../lib/dates';
import { buildStatementLines } from '../../lib/statement';
import { useStore } from '../../store/useStore';

export default function StatementsPage() {
  const [params, setParams] = useSearchParams();
  const customers = useStore((s) => s.customers);
  const invoices = useStore((s) => s.invoices);
  const payments = useStore((s) => s.payments);
  const companyName = useStore((s) => s.settings.companyName);
  const toast = useStore((s) => s.toast);
  const customerId = params.get('customer') || customers[0]?.id || '';
  const customer = customers.find((c) => c.id === customerId);

  const custInvoices = useMemo(() => invoices.filter((i) => i.customerId === customerId), [invoices, customerId]);
  const statement = useMemo(() => buildStatementLines(custInvoices, payments), [custInvoices, payments]);

  const download = async () => {
    if (!customer) return;
    const { buildStatementPdf } = await import('../../lib/pdf');
    buildStatementPdf(customer, custInvoices, payments, companyName, todayIso()).save(`STATEMENT-${customer.name.replace(/[^a-z0-9]+/gi, '-')}-DEMO.pdf`);
    toast('Statement PDF generated (fictional, watermarked).');
  };

  return (
    <>
      <PageHeader kicker="Finance / Statements" title="Customer statements" subtitle="Derived live from saved fictional invoices and recorded payments."
        actions={<button className="btn primary" onClick={download} disabled={!customer} data-testid="statement-pdf"><IcoDownload />Download statement PDF</button>} />
      <div className="toolbar">
        <label className="field" style={{ minWidth: 280 }}>
          <span className="field-label">Customer</span>
          <select className="select" value={customerId} onChange={(e) => setParams({ customer: e.target.value })} data-testid="statement-customer">
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      <div className="stat-grid">
        <Stat label="Total invoiced" value={formatRand(statement.invoiced)} sub="Issued invoices, incl. VAT" />
        <Stat label="Total received" value={formatRand(statement.received)} sub="Fictional payments" />
        <Stat label="Balance outstanding" value={formatRand(statement.balance)} tone={statement.balance > 0 ? 'gold' : undefined} sub={statement.balance > 0 ? 'Owed by customer' : 'Nothing outstanding'} />
        <Stat label="Statement date" value={formatDate(todayIso())} sub="As at today" />
      </div>
      <Panel title={customer ? `Statement — ${customer.name}` : 'Statement'} meta="Chronological invoices and payments with running balance">
        {statement.lines.length === 0 ? <Empty title="No issued invoices for this customer" body="Issue an invoice to populate the statement." /> : (
          <div className="table-wrap">
            <table className="table" data-testid="statement-table">
              <thead><tr><th>Date</th><th>Reference</th><th>Description</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th></tr></thead>
              <tbody>
                {statement.lines.map((l, i) => (
                  <tr key={i}><td>{formatDate(l.date)}</td><td><strong>{l.ref}</strong></td><td>{l.description}</td><td className="num">{l.debit ? formatRand(l.debit) : ''}</td><td className="num">{l.credit ? formatRand(l.credit) : ''}</td><td className="num"><strong>{formatRand(l.balance)}</strong></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <Notice tone="grey">Statements are computed from the demo records in this browser. No emails are sent and no real receivables exist.</Notice>
        </div>
      </Panel>
    </>
  );
}
