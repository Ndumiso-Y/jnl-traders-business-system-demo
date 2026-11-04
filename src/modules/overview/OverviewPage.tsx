import { Link, useNavigate } from 'react-router-dom';
import { IcoArrow, IcoClock, IcoDoc, IcoPlus, IcoShield, IcoBag, IcoTruck, IcoFlag, IcoUsers } from '../../components/Icons';
import { PageHeader, Panel, Stat, Tag } from '../../components/ui';
import { useStore } from '../../store/useStore';
import { formatRand, formatRandWhole } from '../../lib/money';
import { assetRenewals, lastMonths, monthlySeries, outstanding, pendingRequests, thisMonthInvoiced } from '../../lib/selectors';
import { monthShort, relativeWhen, formatDate } from '../../lib/dates';

export default function OverviewPage() {
  const navigate = useNavigate();
  const invoices = useStore((s) => s.invoices);
  const payments = useStore((s) => s.payments);
  const expenses = useStore((s) => s.expenses);
  const requests = useStore((s) => s.requests);
  const assets = useStore((s) => s.assets);
  const activity = useStore((s) => s.activity);
  const createQuotation = useStore((s) => s.createQuotation);

  const month = thisMonthInvoiced(invoices);
  const out = outstanding(invoices, payments);
  const pending = pendingRequests(requests);
  const renewals = assetRenewals(assets).filter((r) => r.state === 'due-soon' || r.state === 'overdue');
  const months = lastMonths(8);
  const series = monthlySeries({ invoices, payments, expenses }, months);
  const max = Math.max(1, ...series.map((b) => b.invoiced));

  const approved = requests.filter((r) => r.status === 'approved' || r.status === 'fulfilled').length;
  const other = requests.length - approved - pending.length;
  const total = requests.length || 1;
  const pctA = (approved / total) * 100;
  const pctP = (pending.length / total) * 100;

  const onNewQuote = () => { const q = createQuotation(); navigate(`/finance/quotations/${q.id}`); };

  const areaIcon = (area: string) => {
    switch (area) {
      case 'Finance': return <IcoDoc />;
      case 'PPE': return <IcoShield />;
      case 'Procurement': return <IcoBag />;
      case 'Fleet': case 'Equipment': return <IcoTruck />;
      case 'Safety': return <IcoFlag />;
      case 'HR': return <IcoUsers />;
      default: return <IcoDoc />;
    }
  };

  return (
    <>
      <PageHeader kicker="Control centre / Overview" title="Business overview" subtitle="A clearer view of finance, requests and operations — all in one place."
        actions={<>
          <Link to="/reports" className="btn"><IcoClock />This month</Link>
          <button className="btn primary" onClick={onNewQuote} data-testid="new-quotation"><IcoPlus />New quotation</button>
        </>} />

      <div className="grid-2">
        <section className="hero">
          <div className="hero-arc" aria-hidden="true" />
          <div className="hero-mark" aria-hidden="true">JNL</div>
          <div className="hero-kicker">Your operations, simplified</div>
          <h2>Better decisions start with a clear picture.</h2>
          <p>Keep track of every request, document and renewal without moving between spreadsheets.</p>
          <Link to="/finance" className="link-btn">Explore your workspace <IcoArrow /></Link>
        </section>
        <section className="action-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="kicker">Action required</span>
            <Tag tone="gold">{pending.length} pending</Tag>
          </div>
          <h3>Review requests</h3>
          <p>Purchasing and PPE requests awaiting management review.</p>
          <div className="foot">
            <Link to="/procurement?status=submitted" className="link-btn">Open approvals</Link>
            <Link to="/procurement?status=submitted" className="link-btn" aria-label="Open approvals"><IcoArrow /></Link>
          </div>
        </section>
      </div>

      <div className="stat-grid">
        <Stat label="Invoiced this month" value={formatRandWhole(month.total)} sub={`Across ${month.count} demo invoice${month.count === 1 ? '' : 's'}`} />
        <Stat label="Outstanding invoices" value={formatRandWhole(out.total)} sub={`${out.count} open · ${out.overdue} overdue`} />
        <Stat label="Pending approvals" value={String(pending.length).padStart(2, '0')} change={pending.length ? <span className="metric-change warn">Needs review</span> : undefined} sub={pending.length ? undefined : 'Nothing waiting'} />
        <Stat label="Upcoming renewals" value={String(renewals.length).padStart(2, '0')} sub="Due or overdue within 30 days" />
      </div>

      <div className="grid-2">
        <Panel title="Financial activity" meta="Fictional invoice amounts by month (VAT inclusive)" right={<Link to="/reports" className="btn sm">Reports</Link>}>
          <div className="bars" role="img" aria-label={`Monthly invoiced totals: ${series.map((b) => `${monthShort(b.key)} ${formatRand(b.invoiced)}`).join(', ')}`}>
            {[0.25, 0.5, 0.75].map((f) => <div key={f} className="gridline" style={{ bottom: `${f * 100}%` }} />)}
            {series.map((b, i) => (
              <div key={b.key} className={`bar ${i >= series.length - 2 ? 'alt' : ''}`} title={`${monthShort(b.key)}: ${formatRand(b.invoiced)}`}>
                <div className="fill" style={{ height: `${Math.max(2, (b.invoiced / max) * 100)}%` }} />
              </div>
            ))}
          </div>
          <div className="bar-labels">{series.map((b) => <span key={b.key}>{monthShort(b.key)}</span>)}</div>
        </Panel>
        <Panel title="Requests at a glance" meta="Fictional procurement and PPE requests">
          <div className="donut-wrap">
            <div style={{ position: 'relative', width: 160, height: 160, flex: 'none' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: `conic-gradient(#2f352f 0 ${pctA}%, #b49358 ${pctA}% ${pctA + pctP}%, #dfe1d9 ${pctA + pctP}% 100%)` }} aria-hidden="true" />
              <div style={{ position: 'absolute', inset: 22, background: '#fff', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <b style={{ fontSize: 30, letterSpacing: -1 }}>{requests.length}</b>
                <small style={{ fontSize: 10, color: 'var(--muted-3)' }}>Total requests</small>
              </div>
            </div>
            <ul className="legend">
              <li><span className="swatch" style={{ background: '#2f352f' }} />Approved / fulfilled <b>{approved}</b></li>
              <li><span className="swatch" style={{ background: '#b49358' }} />Pending <b>{pending.length}</b></li>
              <li><span className="swatch" style={{ background: '#dfe1d9' }} />Draft / rejected <b>{other}</b></li>
            </ul>
          </div>
          <p className="panel-meta" style={{ marginTop: 16 }}>Approval activity updates as requests progress.</p>
        </Panel>
      </div>

      <div className="grid-2">
        <Panel title="Recent activity" meta="Actions happening across the workspace" right={<Link to="/procurement" className="link-btn">View all <IcoArrow /></Link>} pad={false} className="panel-pad">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Activity</th><th>Area</th><th>Status</th><th>When</th></tr></thead>
              <tbody>
                {activity.slice(0, 6).map((a) => (
                  <tr key={a.id}>
                    <td><div className="cell-flex"><span className="row-icon">{areaIcon(a.area)}</span><div><strong>{a.title}</strong><small>{a.detail}</small></div></div></td>
                    <td>{a.area}</td>
                    <td><Tag tone={a.tone}>{a.status}</Tag></td>
                    <td>{relativeWhen(a.at)}</td>
                  </tr>
                ))}
                {!activity.length && <tr><td colSpan={4}><div className="empty">No activity yet.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Upcoming attention" meta="Fleet and equipment renewals (fictional)" right={<Link to="/fleet" className="link-btn">Fleet <IcoArrow /></Link>}>
          <ul className="list">
            {renewals.slice(0, 5).map((r) => (
              <li key={`${r.asset.id}-${r.kind}`}>
                <span className="row-icon"><IcoClock /></span>
                <div className="grow"><b>{r.kind} — {r.asset.name}</b><small>{r.asset.ref} · {formatDate(r.date)}</small></div>
                <Tag tone={r.state === 'overdue' ? 'red' : 'amber'}>{r.state === 'overdue' ? 'Overdue' : 'Due soon'}</Tag>
              </li>
            ))}
            {!renewals.length && <li><div className="empty" style={{ width: '100%' }}>No renewals due in the next 30 days.</div></li>}
          </ul>
        </Panel>
      </div>
    </>
  );
}
