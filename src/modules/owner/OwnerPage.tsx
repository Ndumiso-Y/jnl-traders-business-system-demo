import { Link } from 'react-router-dom';
import { IcoArrow, IcoLock } from '../../components/Icons';
import RoleBar from '../../components/RoleBar';
import { Notice, PageHeader, Panel, Stat, Tag } from '../../components/ui';
import { formatRand, toCents } from '../../lib/money';
import { formatDate, monthLabel } from '../../lib/dates';
import { assetRenewals, invoiceDerived, lastMonths, monthlySeries, outstanding, pendingRequests } from '../../lib/selectors';
import { useStore } from '../../store/useStore';

export default function OwnerPage() {
  const store = useStore();
  const months = lastMonths(6);
  const series = monthlySeries(store, months);
  const out = outstanding(store.invoices, store.payments);
  const pending = pendingRequests(store.requests);
  const renewals = assetRenewals(store.assets).filter((r) => r.state !== 'ok');
  const totals = series.reduce((a, b) => ({ invoiced: a.invoiced + b.invoiced, received: a.received + b.received, costs: a.costs + b.costs }), { invoiced: 0, received: 0, costs: 0 });
  const topCustomers = store.customers.map((c) => ({ c, value: store.invoices.filter((i) => i.customerId === c.id && i.status === 'issued').reduce((s, i) => s + invoiceDerived(i, store.payments).total, 0) })).sort((a, b) => b.value - a.value).slice(0, 4);
  const openIncidents = store.incidents.filter((i) => i.status !== 'closed');
  const hrOpen = store.hrRecords.filter((r) => r.status !== 'closed');
  const approvedValue = store.requests.filter((r) => r.status === 'approved').reduce((s, r) => s + r.items.reduce((x, it) => x + toCents(it.qty * it.estUnitCost), 0), 0);

  return (
    <>
      <PageHeader kicker="Private / Owner oversight" title="Owner view" subtitle={`Six-month summary (${monthLabel(months[0])} – ${monthLabel(months[months.length - 1])}) of fictional demo records.`} actions={<Tag tone="gold"><IcoLock style={{ width: 12, height: 12 }} />Granted to this user only</Tag>} />
      <RoleBar />
      <Notice tone="amber">Sample private-looking values only. Access to this page is granted per user by the Super Admin, but GitHub Pages cannot keep it confidential — the restriction is a demonstration of intent, not security.</Notice>
      <div className="stat-grid" style={{ marginTop: 20 }}>
        <Stat label="Invoiced (6 months)" value={formatRand(totals.invoiced)} sub="Incl. VAT" />
        <Stat label="Received (6 months)" value={formatRand(totals.received)} sub="Fictional receipts" />
        <Stat label="Recorded costs (6 months)" value={formatRand(totals.costs)} sub="Expense register" />
        <Stat label="Outstanding receivables" value={formatRand(out.total)} tone="gold" sub={`${out.count} invoices · ${out.overdue} overdue`} />
      </div>
      <div className="grid-3">
        <Panel title="Awaiting your decision" meta="Requests submitted for approval">
          <ul className="list">
            {pending.slice(0, 5).map((r) => <li key={r.id}><div className="grow"><b>{r.title}</b><small>{r.number} · {r.requesterName}</small></div><Link className="btn xs" to={`${r.kind === 'ppe' ? '/ppe' : '/procurement'}/requests/${r.id}`}>Review</Link></li>)}
            {!pending.length && <li><div className="empty" style={{ width: '100%' }}>Nothing waiting.</div></li>}
          </ul>
          <p className="panel-meta" style={{ marginTop: 10 }}>Approved, not yet fulfilled: {formatRand(approvedValue)} estimated.</p>
        </Panel>
        <Panel title="Top customers by invoiced value" meta="Fictional">
          <ul className="list">
            {topCustomers.map(({ c, value }) => <li key={c.id}><div className="grow"><b>{c.name}</b><small>{store.invoices.filter((i) => i.customerId === c.id && i.status === 'issued').length} issued invoices</small></div><b style={{ fontSize: 13 }}>{formatRand(value)}</b></li>)}
          </ul>
        </Panel>
        <Panel title="Operational flags" meta="Items needing attention">
          <ul className="list">
            <li><div className="grow"><b>Renewals due / overdue</b><small>{renewals.slice(0, 3).map((r) => `${r.asset.ref} ${r.kind.toLowerCase()} ${formatDate(r.date)}`).join(' · ') || 'None'}</small></div><Tag tone={renewals.some((r) => r.state === 'overdue') ? 'red' : renewals.length ? 'amber' : 'green'}>{renewals.length}</Tag></li>
            <li><div className="grow"><b>Open safety incidents</b><small>{openIncidents.map((i) => i.ref).join(', ') || 'None'}</small></div><Tag tone={openIncidents.length ? 'red' : 'green'}>{openIncidents.length}</Tag></li>
            <li><div className="grow"><b>Open HR matters</b><small>{hrOpen.length} hiring / disciplinary records in progress</small></div><Tag tone={hrOpen.length ? 'amber' : 'green'}>{hrOpen.length}</Tag></li>
          </ul>
          <p style={{ marginTop: 12 }}><Link className="link-btn" to="/reports">Full monthly report <IcoArrow /></Link></p>
        </Panel>
      </div>
    </>
  );
}
