import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IcoDoc, IcoPlus, IcoSearch } from '../../components/Icons';
import { Empty, PageHeader, Panel, Stat, Tag, type TagTone } from '../../components/ui';
import { formatRand } from '../../lib/money';
import { formatDate } from '../../lib/dates';
import { docTotal } from '../../lib/selectors';
import { useStore } from '../../store/useStore';
import type { Quotation } from '../../store/types';

const STATUS: Record<Quotation['status'], [string, TagTone]> = { draft: ['Draft', 'gold'], issued: ['Issued', 'blue'], accepted: ['Accepted', 'green'], converted: ['Converted', 'dark'], declined: ['Declined', 'red'] };

export default function QuotationsList() {
  const navigate = useNavigate();
  const quotations = useStore((s) => s.quotations);
  const customers = useStore((s) => s.customers);
  const createQuotation = useStore((s) => s.createQuotation);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | Quotation['status']>('all');

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return quotations
      .filter((x) => status === 'all' || x.status === status)
      .filter((x) => !term || x.number.toLowerCase().includes(term) || (customers.find((c) => c.id === x.customerId)?.name ?? '').toLowerCase().includes(term) || x.items.some((i) => i.description.toLowerCase().includes(term)))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [quotations, customers, q, status]);

  const open = quotations.filter((x) => x.status === 'issued' || x.status === 'accepted');
  const openValue = open.reduce((s, x) => s + docTotal(x).total, 0);

  return (
    <>
      <PageHeader kicker="Finance / Documents" title="Quotations & invoices" subtitle="Clear documents, accurate totals and a simple path from quote to invoice."
        actions={<button className="btn primary" onClick={() => { const n = createQuotation(); navigate(`/finance/quotations/${n.id}`); }} data-testid="new-quotation"><IcoPlus />New quotation</button>} />
      <div className="stat-grid">
        <Stat label="Quotations" value={quotations.length} sub="Fictional documents" />
        <Stat label="Open (issued / accepted)" value={open.length} sub={`${formatRand(openValue)} incl. VAT`} />
        <Stat label="Converted to invoice" value={quotations.filter((x) => x.status === 'converted').length} sub="Totals carried forward" />
        <Stat label="Drafts" value={quotations.filter((x) => x.status === 'draft').length} sub="Not yet issued" />
      </div>
      <Panel title="Quotation register" meta="Search by number, customer or item">
        <div className="toolbar">
          <label className="search-box"><IcoSearch /><input placeholder="Search quotations" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search quotations" data-testid="search" /></label>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Filter by status">
            <option value="all">All statuses</option>
            {Object.entries(STATUS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Quotation</th><th>Customer</th><th>Date</th><th>Valid until</th><th>Status</th><th className="num">Total</th></tr></thead>
            <tbody>
              {rows.map((x) => {
                const [label, tone] = STATUS[x.status];
                return (
                  <tr key={x.id} className="clickable" tabIndex={0} role="link" onClick={() => navigate(`/finance/quotations/${x.id}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/finance/quotations/${x.id}`); } }} data-testid="quotation-row">
                    <td><div className="cell-flex"><span className="row-icon"><IcoDoc /></span><div><strong>{x.number}</strong><small>{x.items.length} line{x.items.length === 1 ? '' : 's'} · VAT {x.pricesIncludeVat ? 'incl.' : 'excl.'}</small></div></div></td>
                    <td>{customers.find((c) => c.id === x.customerId)?.name ?? <em>No customer</em>}</td>
                    <td>{formatDate(x.date)}</td>
                    <td>{formatDate(x.validUntil)}</td>
                    <td><Tag tone={tone}>{label}</Tag></td>
                    <td className="num"><strong>{formatRand(docTotal(x).total)}</strong></td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={6}><Empty title="No quotations match" body={q ? 'Try a different search term or clear the filter.' : 'Create your first fictional quotation.'} /></td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
