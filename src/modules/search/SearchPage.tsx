import { Link, useSearchParams } from 'react-router-dom';
import { Empty, PageHeader, Panel, Tag } from '../../components/ui';
import { hasModule, selectCurrentUser, useStore } from '../../store/useStore';

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get('q') ?? '').trim().toLowerCase();
  const s = useStore();
  const me = selectCurrentUser(s);
  const can = (m: Parameters<typeof hasModule>[1]) => hasModule(me, m);
  const hit = (...vals: Array<string | undefined>) => !!q && vals.some((v) => v && v.toLowerCase().includes(q));
  const results: Array<{ area: string; title: string; sub: string; to: string }> = [];
  if (can('finance')) for (const x of s.quotations) if (hit(x.number, s.customers.find((c) => c.id === x.customerId)?.name, ...x.items.map((i) => i.description))) results.push({ area: 'Quotation', title: x.number, sub: s.customers.find((c) => c.id === x.customerId)?.name ?? '', to: `/finance/quotations/${x.id}` });
  if (can('finance')) for (const x of s.invoices) if (hit(x.number, s.customers.find((c) => c.id === x.customerId)?.name)) results.push({ area: 'Invoice', title: x.number, sub: s.customers.find((c) => c.id === x.customerId)?.name ?? '', to: `/finance/invoices/${x.id}` });
  if (can('finance')) for (const x of s.customers) if (hit(x.name, x.contact)) results.push({ area: 'Customer', title: x.name, sub: x.contact, to: `/finance/statements?customer=${x.id}` });
  for (const x of s.requests) if (can(x.kind === 'ppe' ? 'ppe' : 'procurement') && hit(x.number, x.title, x.department, x.requesterName)) results.push({ area: x.kind === 'ppe' ? 'PPE request' : 'Procurement request', title: `${x.number} · ${x.title}`, sub: x.status, to: `${x.kind === 'ppe' ? '/ppe' : '/procurement'}/requests/${x.id}` });
  if (can('procurement')) for (const x of s.purchaseOrders) if (hit(x.number, x.supplier)) results.push({ area: 'Purchase order', title: x.number, sub: x.supplier, to: '/procurement/orders' });
  if (can('fleet')) for (const x of s.assets) if (hit(x.ref, x.name, x.make, x.model, x.registration)) results.push({ area: x.kind === 'vehicle' ? 'Vehicle' : 'Equipment', title: `${x.ref} · ${x.name}`, sub: `${x.make} ${x.model}`, to: `/fleet/${x.id}` });
  if (can('hr')) for (const x of s.hrRecords) if (hit(x.ref, x.subject, x.position)) results.push({ area: 'HR record', title: `${x.ref} · ${x.subject}`, sub: x.position, to: '/people' });
  if (can('safety')) for (const x of s.incidents) if (hit(x.ref, x.location, x.category, x.description)) results.push({ area: 'Safety incident', title: `${x.ref} · ${x.category}`, sub: x.location, to: '/people' });

  return (
    <>
      <PageHeader kicker="Workspace / Search" title={q ? `Results for “${params.get('q')}”` : 'Search'} subtitle={`Searches the fictional records ${me.name} is allowed to see.`} />
      <Panel>
        {!q ? <Empty title="Type in the search box above" body="Try a document number such as INV-D0208, a customer, an asset reference like FLT-002, or a request title." /> : results.length ? (
          <ul className="list" data-testid="search-results">
            {results.map((r, i) => <li key={i}><Tag tone="gold">{r.area}</Tag><div className="grow"><b><Link to={r.to} style={{ textDecoration: 'none' }}>{r.title}</Link></b><small>{r.sub}</small></div><Link className="btn xs" to={r.to}>Open</Link></li>)}
          </ul>
        ) : <Empty title="No matching records" body="Check the spelling or try a shorter term." />}
      </Panel>
    </>
  );
}
