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
  const serviceSoon = renewals.filter((r) => r.kind === 'Service' && (r.state === 'due-soon' || r.state === 'overdue')).length;
  const licenceAlerts = renewals.filter((r) => r.kind === 'Licence' && (r.state === 'due-soon' || r.state === 'overdue')).length;
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
        <Stat label="Service due soon" value={String(serviceSoon).padStart(2, '0')} tone="gold" sub="Within the next 30 days" />
        <Stat label="Overdue renewals" value={String(overdue.length).padStart(2, '0')} tone={overdue.length ? 'red' : undefined} sub={`${licenceAlerts} licence alert${licenceAlerts === 1 ? '' : 's'} · review renewal dates`} />
      </div>

      <div className="grid-2">
        <Panel title="Fleet workspace" meta="One place to inspect asset records and upcoming work">
          <div className="fleet-illustration">
            <svg viewBox="0 0 640 300" aria-hidden="true">
              <ellipse cx="330" cy="268" rx="290" ry="14" fill="#e1dfd8" />
              <rect x="250" y="96" width="350" height="128" rx="10" fill="#ffffff" stroke="#d5d3cb" strokeWidth="2" />
              <path d="M270 118h310M270 148h310M270 178h310M270 208h310" stroke="#edebe4" strokeWidth="2" />
              <path d="M520 96v128M430 96v128M340 96v128" stroke="#edebe4" strokeWidth="2" />
              <path d="M60 232V140c0-20 12-34 32-38l86-20h74v150z" fill="#f5f4ef" stroke="#c9c7bf" strokeWidth="2" />
              <path d="M102 128l72-16v58H90z" fill="#8f9c9a" />
              <path d="M112 132l58-13v48h-66z" fill="#a9b4b1" opacity=".6" />
              <rect x="44" y="222" width="574" height="26" rx="8" fill="#cbc9c1" />
              <rect x="56" y="172" width="12" height="8" rx="2" fill="#e5bf6b" />
              <circle cx="146" cy="246" r="34" fill="#2d322d" /><circle cx="146" cy="246" r="15" fill="#b8b6ad" /><circle cx="146" cy="246" r="6" fill="#2d322d" />
              <circle cx="470" cy="246" r="34" fill="#2d322d" /><circle cx="470" cy="246" r="15" fill="#b8b6ad" /><circle cx="470" cy="246" r="6" fill="#2d322d" />
              <circle cx="548" cy="246" r="30" fill="#2d322d" /><circle cx="548" cy="246" r="13" fill="#b8b6ad" /><circle cx="548" cy="246" r="5" fill="#2d322d" />
              <text x="425" y="168" fontSize="24" fontWeight="800" fill="#cdcac0" textAnchor="middle" letterSpacing="2">DEMO FLEET</text>
            </svg>
            <span className="fleet-caption">Generic illustration · not a JNL asset</span>
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
