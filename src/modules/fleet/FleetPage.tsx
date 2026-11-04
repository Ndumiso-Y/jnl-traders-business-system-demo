import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { IcoCar, IcoClock, IcoPlus, IcoSearch, IcoTool } from '../../components/Icons';
import { DueTag, Empty, PageHeader, Panel, Stat, Tag } from '../../components/ui';
import { formatDate } from '../../lib/dates';
import { assetAttention, assetRenewals } from '../../lib/selectors';
import { useStore } from '../../store/useStore';
import type { AssetKind } from '../../store/types';
import { ASSET_STATUS, nextCheck } from './assetHelpers';

export default function FleetPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const assets = useStore((s) => s.assets);
  const createAsset = useStore((s) => s.createAsset);
  const [q, setQ] = useState('');
  const kind = (params.get('kind') as AssetKind | 'all' | null) ?? 'all';
  const attention = params.get('attention') ?? 'all';

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return assets
      .filter((a) => kind === 'all' || a.kind === kind)
      .filter((a) => attention === 'all' || assetAttention(a) === attention)
      .filter((a) => !term || [a.name, a.ref, a.make, a.model, a.registration, a.assignedTo].some((v) => v.toLowerCase().includes(term)))
      .sort((a, b) => a.ref.localeCompare(b.ref));
  }, [assets, q, kind, attention]);

  const renewals = assetRenewals(assets);
  const dueSoon = renewals.filter((r) => r.state === 'due-soon');
  const overdue = renewals.filter((r) => r.state === 'overdue');
  const setParam = (k: string, v: string) => { const n = new URLSearchParams(params); if (v === 'all') n.delete(k); else n.set(k, v); setParams(n); };

  return (
    <>
      <PageHeader kicker="Operations / Asset control" title="Fleet & equipment" subtitle="Keep assets organised, maintenance visible and important renewals on time."
        actions={<>
          <button className="btn" onClick={() => { const a = createAsset('equipment'); navigate(`/fleet/${a.id}?new=1`); }} data-testid="add-equipment"><IcoTool />Add equipment</button>
          <button className="btn primary" onClick={() => { const a = createAsset('vehicle'); navigate(`/fleet/${a.id}?new=1`); }} data-testid="add-vehicle"><IcoPlus />Add vehicle</button>
        </>} />
      <div className="stat-grid">
        <Stat label="Registered assets" value={assets.length} sub={`${assets.filter((a) => a.kind === 'vehicle').length} vehicles · ${assets.filter((a) => a.kind === 'equipment').length} equipment`} />
        <Stat label="Available" value={assets.filter((a) => a.status === 'active').length} sub="Currently marked active" />
        <Stat label="Due within 30 days" value={String(dueSoon.length).padStart(2, '0')} tone="gold" sub="Service, licence, insurance or inspection" />
        <Stat label="Overdue" value={String(overdue.length).padStart(2, '0')} tone={overdue.length ? 'red' : undefined} sub="Review renewal dates" />
      </div>

      <div className="grid-2">
        <Panel title="Fleet workspace" meta="One place to inspect asset records and upcoming work">
          <div style={{ background: 'var(--bg-subtle)', borderRadius: 14, padding: '26px 24px', display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
            <svg viewBox="0 0 320 150" width="260" height="122" aria-hidden="true" style={{ flex: 'none', maxWidth: '100%' }}>
              <ellipse cx="160" cy="138" rx="140" ry="8" fill="#e3e1da" />
              <rect x="128" y="52" width="170" height="62" rx="6" fill="#ffffff" stroke="#d9d8d1" />
              <path d="M138 62h150M138 76h150M138 90h150" stroke="#eceae3" />
              <path d="M30 114V72c0-9 6-16 15-18l44-10h39v70z" fill="#f4f3ee" stroke="#cfcdc5" />
              <path d="M52 66l36-8v30H46z" fill="#9aa7a4" />
              <rect x="22" y="104" width="286" height="12" rx="4" fill="#d0cfc8" />
              <circle cx="72" cy="118" r="18" fill="#2d322d" /><circle cx="72" cy="118" r="8" fill="#b8b6ad" />
              <circle cx="250" cy="118" r="18" fill="#2d322d" /><circle cx="250" cy="118" r="8" fill="#b8b6ad" />
              <circle cx="288" cy="118" r="14" fill="#2d322d" /><circle cx="288" cy="118" r="6" fill="#b8b6ad" />
              <text x="213" y="84" fontSize="12" fontWeight="800" fill="#c9c6bb" textAnchor="middle" letterSpacing="1">DEMO FLEET</text>
            </svg>
            <div style={{ flex: 1, minWidth: 180 }}>
              <Tag tone="dark">Generic illustration · not a JNL asset</Tag>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 12, lineHeight: 1.6 }}>Vehicles and equipment are fictional records with service, licence, insurance and inspection dates. Due and overdue states are calculated against today's date.</p>
            </div>
          </div>
        </Panel>
        <Panel title="Upcoming attention" meta="Sample maintenance and renewal schedule" right={<Link className="link-btn" to="/fleet?attention=due-soon">View all</Link>}>
          <ul className="list" data-testid="renewals">
            {[...overdue, ...dueSoon].slice(0, 5).map((r) => (
              <li key={`${r.asset.id}-${r.kind}`}>
                <span className="row-icon"><IcoClock /></span>
                <div className="grow"><b>{r.kind} {r.kind === 'Licence' ? 'renewal' : r.kind === 'Service' ? 'due' : 'due'}</b><small>{r.asset.ref} · {formatDate(r.date)}</small></div>
                <DueTag state={r.state} />
              </li>
            ))}
            {!overdue.length && !dueSoon.length && <li><div className="empty" style={{ width: '100%' }}>Nothing due in the next 30 days.</div></li>}
          </ul>
        </Panel>
      </div>

      <Panel title="Asset register" meta="Vehicles and equipment · fictional sample records">
        <div className="toolbar">
          <label className="search-box"><IcoSearch /><input placeholder="Search assets" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search assets" data-testid="search" /></label>
          <select className="select" value={kind} onChange={(e) => setParam('kind', e.target.value)} aria-label="Filter by type"><option value="all">All types</option><option value="vehicle">Vehicles</option><option value="equipment">Equipment</option></select>
          <select className="select" value={attention} onChange={(e) => setParam('attention', e.target.value)} aria-label="Filter by attention" data-testid="attention-filter"><option value="all">Any attention</option><option value="overdue">Overdue</option><option value="due-soon">Due soon</option><option value="ok">On track</option></select>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Asset</th><th>Reference</th><th>Condition</th><th>Next check</th><th>Attention</th><th>Action</th></tr></thead>
            <tbody>
              {rows.map((a) => {
                const [label, tone] = ASSET_STATUS[a.status];
                const nc = nextCheck(a);
                return (
                  <tr key={a.id} data-testid="asset-row">
                    <td><div className="cell-flex"><span className="row-icon">{a.kind === 'vehicle' ? <IcoCar /> : <IcoTool />}</span><div><strong>{a.name || <em>Unnamed asset</em>}</strong><small>{a.kind === 'vehicle' ? 'Vehicle' : 'Equipment'} · {a.make} {a.model} · fictional record</small></div></div></td>
                    <td>{a.ref}<small>{a.registration}</small></td>
                    <td><Tag tone={tone}>{label}</Tag></td>
                    <td>{nc ? <>{formatDate(nc.date)}<small>{nc.kind}</small></> : '—'}</td>
                    <td><DueTag state={assetAttention(a)} /></td>
                    <td><Link className="link-btn" to={`/fleet/${a.id}`}>Open details →</Link></td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={6}><Empty title="No assets match" body="Adjust the search or filters." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
