import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IcoPlus } from '../../components/Icons';
import RoleBar from '../../components/RoleBar';
import { Notice, PageHeader, Stat } from '../../components/ui';
import { formatRand, toCents } from '../../lib/money';
import { dueState } from '../../lib/dates';
import { rentLedger } from '../../lib/rent';
import { useStore } from '../../store/useStore';
import PropertiesTab from './PropertiesTab';
import TenantsTab from './TenantsTab';
import LedgerTab from './LedgerTab';

export type TenantsTabKey = 'properties' | 'tenants' | 'ledger';

export default function TenantsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as TenantsTabKey | null) ?? 'properties';
  const setTab = (t: TenantsTabKey, extra?: Record<string, string>) => setParams({ tab: t, ...(extra ?? {}) });
  const properties = useStore((s) => s.properties);
  const units = useStore((s) => s.units);
  const tenants = useStore((s) => s.tenants);
  const rentPayments = useStore((s) => s.rentPayments);
  const createProperty = useStore((s) => s.createProperty);
  const createTenant = useStore((s) => s.createTenant);
  const [editProperty, setEditProperty] = useState<string | null>(null);
  const [editTenant, setEditTenant] = useState<string | null>(null);

  const stats = useMemo(() => {
    const occupied = units.filter((u) => u.status === 'occupied').length;
    const rentRoll = units.filter((u) => u.status === 'occupied').reduce((s, u) => s + toCents(u.rent), 0);
    let arrears = 0; let tenantsInArrears = 0;
    for (const t of tenants) {
      if (t.status === 'ended') continue;
      const l = rentLedger(t, rentPayments);
      if (l.balance > 0) { arrears += l.balance; tenantsInArrears += 1; }
    }
    const expiring = tenants.filter((t) => t.status !== 'ended' && ['due-soon', 'overdue'].includes(dueState(t.leaseEnd, undefined, 60))).length;
    return { occupied, rentRoll, arrears, tenantsInArrears, expiring };
  }, [units, tenants, rentPayments]);

  return (
    <>
      <PageHeader kicker="Operations / Properties & tenants" title="Properties & tenants" subtitle="Fictional properties, units, leases and a monthly rent ledger with arrears and lease-expiry flags."
        actions={tab === 'tenants' || tab === 'ledger'
          ? <button className="btn primary" onClick={() => { const t = createTenant(); setTab('tenants'); setEditTenant(t.id); }} data-testid="add-tenant"><IcoPlus />Add tenant</button>
          : <button className="btn primary" onClick={() => { const p = createProperty(); setEditProperty(p.id); }} data-testid="add-property"><IcoPlus />Add property</button>} />
      <RoleBar note="Visible to users granted the Properties & tenants module. All properties, tenants and amounts are fictional." />
      <div className="stat-grid">
        <Stat label="Occupancy" value={`${stats.occupied} / ${units.length}`} sub={`${units.length ? Math.round((stats.occupied / units.length) * 100) : 0}% of units let · ${properties.length} properties`} />
        <Stat label="Monthly rent roll" value={formatRand(stats.rentRoll)} sub="Rent due from occupied units" />
        <Stat label="Rent arrears" value={formatRand(stats.arrears)} tone={stats.arrears ? 'red' : undefined} sub={`${stats.tenantsInArrears} tenant${stats.tenantsInArrears === 1 ? '' : 's'} behind`} />
        <Stat label="Leases ending" value={String(stats.expiring).padStart(2, '0')} tone={stats.expiring ? 'gold' : undefined} sub="Within 60 days or already past" />
      </div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'properties'} onClick={() => setTab('properties')} data-testid="tab-properties">Properties &amp; units</button>
        <button role="tab" aria-selected={tab === 'tenants'} onClick={() => setTab('tenants')} data-testid="tab-tenants">Tenants &amp; leases</button>
        <button role="tab" aria-selected={tab === 'ledger'} onClick={() => setTab('ledger')} data-testid="tab-ledger">Rent ledger</button>
      </div>
      {tab === 'properties' && <PropertiesTab editing={editProperty} setEditing={setEditProperty} onOpenLedger={(tenantId) => setTab('ledger', { tenant: tenantId })} />}
      {tab === 'tenants' && <TenantsTab editing={editTenant} setEditing={setEditTenant} onOpenLedger={(tenantId) => setTab('ledger', { tenant: tenantId })} />}
      {tab === 'ledger' && <LedgerTab tenantId={params.get('tenant')} onPick={(id) => setTab('ledger', { tenant: id })} />}
      <div style={{ marginTop: 18 }}><Notice tone="grey">Rent is charged once per month from the lease start (no pro-rata in the demo). Deposits are shown as a charge and a receipt. Real leases, escalations, utilities and legal notices would be defined in the production system.</Notice></div>
    </>
  );
}
