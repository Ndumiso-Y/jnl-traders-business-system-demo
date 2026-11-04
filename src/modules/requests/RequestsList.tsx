import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { IcoBag, IcoPlus, IcoSearch, IcoShield } from '../../components/Icons';
import RoleBar from '../../components/RoleBar';
import { Empty, PageHeader, Panel, Stat, Tag } from '../../components/ui';
import { formatRand } from '../../lib/money';
import { formatDate, relativeWhen } from '../../lib/dates';
import { useStore } from '../../store/useStore';
import type { RequestKind, RequestStatus } from '../../store/types';
import { REQ_STATUS, requestEstimate } from './requestHelpers';

export default function RequestsList({ kind }: { kind: RequestKind }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const requests = useStore((s) => s.requests);
  const role = useStore((s) => s.settings.role);
  const createRequest = useStore((s) => s.createRequest);
  const [q, setQ] = useState('');
  const status = (params.get('status') as RequestStatus | 'all' | null) ?? 'all';

  const mine = requests.filter((r) => r.kind === kind);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return mine
      .filter((r) => status === 'all' || r.status === status)
      .filter((r) => !term || r.number.toLowerCase().includes(term) || r.title.toLowerCase().includes(term) || r.department.toLowerCase().includes(term) || r.requesterName.toLowerCase().includes(term))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [mine, q, status]);

  const base = kind === 'ppe' ? '/ppe' : '/procurement';
  const label = kind === 'ppe' ? 'PPE request' : 'Procurement request';
  const counts = (s: RequestStatus) => mine.filter((r) => r.status === s).length;

  return (
    <>
      <PageHeader kicker={kind === 'ppe' ? 'Procurement / PPE' : 'Procurement / Requests'} title={kind === 'ppe' ? 'PPE requests' : 'Procurement requests'}
        subtitle={kind === 'ppe' ? 'Personal protective equipment requests with a simulated approval path.' : 'Purchase requests, approvals and purchase-order linkage — demonstration workflow.'}
        actions={<>
          {kind === 'procurement' && <Link className="btn" to="/procurement/orders">Purchase orders</Link>}
          <button className="btn primary" onClick={() => { const r = createRequest(kind); navigate(`${base}/requests/${r.id}`); }} data-testid="new-request"><IcoPlus />New {label.toLowerCase()}</button>
        </>} />
      <RoleBar />
      <div className="stat-grid">
        <Stat label="Awaiting review" value={String(counts('submitted')).padStart(2, '0')} tone={counts('submitted') ? 'gold' : undefined} sub={role === 'requester' ? 'Managers or the Owner approve' : 'Ready for your decision'} />
        <Stat label="Approved" value={String(counts('approved')).padStart(2, '0')} sub="Finance can raise a purchase order" />
        <Stat label="Fulfilled" value={String(counts('fulfilled')).padStart(2, '0')} sub="Closed out" />
        <Stat label="Rejected / drafts" value={`${counts('rejected')} / ${counts('draft')}`} sub="Returned or not yet submitted" />
      </div>
      <Panel title={`${label} register`} meta="Search by number, title, department or requester">
        <div className="toolbar">
          <label className="search-box"><IcoSearch /><input placeholder={`Search ${label.toLowerCase()}s`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search requests" data-testid="search" /></label>
          <select className="select" value={status} onChange={(e) => setParams(e.target.value === 'all' ? {} : { status: e.target.value })} aria-label="Filter by status" data-testid="status-filter">
            <option value="all">All statuses</option>
            {Object.entries(REQ_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Request</th><th>Requester</th><th>Needed by</th><th>Status</th><th className="num">Est. cost</th><th>Updated</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const [l, tone] = REQ_STATUS[r.status];
                return (
                  <tr key={r.id} className="clickable" tabIndex={0} role="link" onClick={() => navigate(`${base}/requests/${r.id}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`${base}/requests/${r.id}`); } }} data-testid="request-row">
                    <td><div className="cell-flex"><span className="row-icon">{kind === 'ppe' ? <IcoShield /> : <IcoBag />}</span><div><strong>{r.title || <em>Untitled draft</em>}</strong><small>{r.number} · {r.department || 'No department'}{r.purchaseOrderId ? ' · PO linked' : ''}</small></div></div></td>
                    <td>{r.requesterName}</td>
                    <td>{formatDate(r.neededBy)}</td>
                    <td><Tag tone={tone}>{l}</Tag></td>
                    <td className="num"><strong>{formatRand(requestEstimate(r))}</strong></td>
                    <td>{relativeWhen(r.updatedAt)}</td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={6}><Empty title="No requests match" body={status !== 'all' ? 'Try another status filter.' : 'Create a request to start the demonstration workflow.'} /></td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
