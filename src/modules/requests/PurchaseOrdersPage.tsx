import { Link } from 'react-router-dom';
import { IcoBag } from '../../components/Icons';
import { Empty, PageHeader, Panel, Tag } from '../../components/ui';
import { formatRand, toCents } from '../../lib/money';
import { formatDate } from '../../lib/dates';
import { useStore } from '../../store/useStore';
import type { PurchaseOrderStatus } from '../../store/types';

export default function PurchaseOrdersPage() {
  const orders = useStore((s) => s.purchaseOrders);
  const requests = useStore((s) => s.requests);
  const update = useStore((s) => s.updatePurchaseOrder);
  const toast = useStore((s) => s.toast);
  const next: Record<PurchaseOrderStatus, PurchaseOrderStatus | null> = { open: 'received', received: 'closed', closed: null };
  const tone = (s: PurchaseOrderStatus) => (s === 'open' ? 'amber' : s === 'received' ? 'green' : 'dark');

  return (
    <>
      <PageHeader kicker="Procurement / Purchase orders" title="Purchase orders" subtitle="Fictional purchase orders raised from approved requests." actions={<Link className="btn" to="/procurement">Back to requests</Link>} />
      <Panel title="Purchase order register" meta={`${orders.length} fictional orders`}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Supplier</th><th>Linked request</th><th>Expected</th><th>Status</th><th className="num">Est. value</th><th /></tr></thead>
            <tbody>
              {orders.map((po) => {
                const req = requests.find((r) => r.id === po.requestId);
                const value = po.items.reduce((s, it) => s + toCents(it.qty * it.estUnitCost), 0);
                const n = next[po.status];
                return (
                  <tr key={po.id} data-testid="po-row">
                    <td><div className="cell-flex"><span className="row-icon"><IcoBag /></span><div><strong>{po.number}</strong><small>{formatDate(po.date)}</small></div></div></td>
                    <td>{po.supplier}</td>
                    <td>{req ? <Link className="link-btn" to={`${req.kind === 'ppe' ? '/ppe' : '/procurement'}/requests/${req.id}`}>{req.number}</Link> : '—'}</td>
                    <td>{formatDate(po.expected)}</td>
                    <td><Tag tone={tone(po.status)}>{po.status}</Tag></td>
                    <td className="num"><strong>{formatRand(value)}</strong></td>
                    <td>{n && <button className="btn xs" onClick={() => { update(po.id, { status: n }); toast(`${po.number} marked ${n}.`); }}>Mark {n}</button>}</td>
                  </tr>
                );
              })}
              {!orders.length && <tr><td colSpan={7}><Empty title="No purchase orders yet" body="Approve a request and raise a PO from it." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
