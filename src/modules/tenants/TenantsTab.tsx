import { useMemo, useState } from 'react';
import { IcoSearch, IcoTrash, IcoUsers } from '../../components/Icons';
import { Confirm, DueTag, Empty, Field, Modal, Panel, Tag } from '../../components/ui';
import { formatRand, parseNumber } from '../../lib/money';
import { dueState, formatDate } from '../../lib/dates';
import { rentLedger } from '../../lib/rent';
import { useStore } from '../../store/useStore';
import type { Tenant, TenantStatus } from '../../store/types';

const STATUS: Record<TenantStatus, [string, 'green' | 'amber' | 'dark']> = { active: ['Active', 'green'], notice: ['On notice', 'amber'], ended: ['Ended', 'dark'] };

export default function TenantsTab({ editing, setEditing, onOpenLedger }: { editing: string | null; setEditing: (id: string | null) => void; onOpenLedger: (tenantId: string) => void }) {
  const store = useStore();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | TenantStatus>('all');
  const [form, setForm] = useState<Tenant | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [del, setDel] = useState<Tenant | null>(null);

  const editingTenant = editing ? store.tenants.find((t) => t.id === editing) : null;
  if (editingTenant && (!form || form.id !== editingTenant.id)) { setForm({ ...editingTenant }); setErrs({}); }

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return store.tenants
      .filter((t) => status === 'all' || t.status === status)
      .filter((t) => !term || [t.name, t.ref, t.unitRef ?? '', store.properties.find((p) => p.id === t.propertyId)?.name ?? ''].some((v) => v.toLowerCase().includes(term)))
      .map((t) => ({ t, ledger: rentLedger(t, store.rentPayments), property: store.properties.find((p) => p.id === t.propertyId) }))
      .sort((a, b) => (a.t.status === 'ended' ? 1 : 0) - (b.t.status === 'ended' ? 1 : 0) || (a.t.leaseEnd ?? '').localeCompare(b.t.leaseEnd ?? ''));
  }, [store.tenants, store.rentPayments, store.properties, q, status]);

  const availableUnits = (current?: string) => store.units.filter((u) => u.id === current || !store.tenants.some((t) => t.unitId === u.id && t.status !== 'ended' && t.id !== form?.id));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const x: Record<string, string> = {};
    if (!form.name.trim()) x.name = 'Enter a fictional tenant name or code (e.g. Tenant T-0106).';
    if (!form.unitId) x.unitId = 'Choose a unit.';
    if (!form.leaseStart) x.leaseStart = 'Enter the lease start date.';
    if (form.leaseEnd && form.leaseEnd < form.leaseStart) x.leaseEnd = 'Lease end must be after the start.';
    if (!Number.isFinite(form.rent) || form.rent <= 0) x.rent = 'Enter a monthly rent above zero.';
    if (!Number.isFinite(form.deposit) || form.deposit < 0) x.deposit = 'Deposit cannot be negative.';
    setErrs(x);
    if (Object.keys(x).length) return;
    store.updateTenant(form.id, form);
    store.toast(`${form.ref} saved (this browser only).`);
    setEditing(null); setForm(null);
  };
  const cancel = () => { if (form && !form.name.trim() && !form.unitId) store.deleteTenant(form.id); setEditing(null); setForm(null); };

  return (
    <>
      <Panel title="Tenants & leases" meta="Fictional tenants identified by code or sample business name">
        <div className="toolbar">
          <label className="search-box"><IcoSearch /><input placeholder="Search tenants, units, properties" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tenants" data-testid="tenant-search" /></label>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Filter by status"><option value="all">All statuses</option>{Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
        </div>
        <div className="table-wrap">
          <table className="table" data-testid="tenant-table">
            <thead><tr><th>Tenant</th><th>Property · unit</th><th>Lease</th><th className="num">Rent / month</th><th className="num">Balance</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.map(({ t, ledger, property }) => (
                <tr key={t.id} data-testid="tenant-row">
                  <td><div className="cell-flex"><span className="row-icon"><IcoUsers /></span><div><strong>{t.name || <em>Unnamed tenant</em>}</strong><small>{t.ref}{t.notes ? ` · ${t.notes.slice(0, 50)}` : ''}</small></div></div></td>
                  <td>{property?.name ?? '—'}<small>{t.unitRef ?? 'No unit'}</small></td>
                  <td>{formatDate(t.leaseStart)} – {t.leaseEnd ? formatDate(t.leaseEnd) : 'open'}<small>{t.status !== 'ended' && t.leaseEnd && <DueTag state={dueState(t.leaseEnd, undefined, 60)} label={dueState(t.leaseEnd, undefined, 60) === 'overdue' ? 'Lease expired' : dueState(t.leaseEnd, undefined, 60) === 'due-soon' ? 'Ending soon' : 'Lease on track'} />}</small></td>
                  <td className="num"><strong>{formatRand(Math.round(t.rent * 100))}</strong></td>
                  <td className="num"><strong style={{ color: ledger.balance > 0 ? 'var(--danger)' : undefined }}>{formatRand(ledger.balance)}</strong>{ledger.monthsInArrears > 0 && <small><Tag tone="red">{ledger.monthsInArrears} month{ledger.monthsInArrears === 1 ? '' : 's'} behind</Tag></small>}</td>
                  <td><Tag tone={STATUS[t.status][1]}>{STATUS[t.status][0]}</Tag></td>
                  <td><div className="btns"><button className="btn xs" onClick={() => setEditing(t.id)}>Edit</button><button className="btn xs" onClick={() => onOpenLedger(t.id)}>Ledger</button></div></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7}><Empty title="No tenants match" /></td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      <Modal open={!!form} title={form ? `Tenant ${form.ref}` : ''} sub="Fictional tenant and lease. Use codes, not real names." onClose={cancel} wide>
        {form && (
          <form onSubmit={save} className="form-grid">
            <Field label="Tenant name / code" error={errs.name}><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errs.name} data-testid="tenant-name" placeholder="Tenant T-0106" /></Field>
            <Field label="Unit" error={errs.unitId}><select className="select" value={form.unitId ?? ''} onChange={(e) => { const u = store.units.find((x) => x.id === e.target.value); setForm({ ...form, unitId: e.target.value || undefined, propertyId: u?.propertyId, unitRef: u?.ref, rent: form.rent || u?.rent || 0, deposit: form.deposit || u?.rent || 0 }); }} aria-invalid={!!errs.unitId} data-testid="tenant-unit"><option value="">Choose a unit…</option>{availableUnits(form.unitId).map((u) => <option key={u.id} value={u.id}>{store.properties.find((p) => p.id === u.propertyId)?.name} · {u.ref} ({formatRand(Math.round(u.rent * 100))})</option>)}</select></Field>
            <Field label="Lease start" error={errs.leaseStart}><input className="input" type="date" value={form.leaseStart} onChange={(e) => setForm({ ...form, leaseStart: e.target.value })} data-testid="tenant-lease-start" /></Field>
            <Field label="Lease end" error={errs.leaseEnd} hint="Leave blank for open-ended"><input className="input" type="date" value={form.leaseEnd ?? ''} onChange={(e) => setForm({ ...form, leaseEnd: e.target.value || undefined })} data-testid="tenant-lease-end" /></Field>
            <Field label="Monthly rent (R)" error={errs.rent}><input className="input num" type="number" step="0.01" value={Number.isNaN(form.rent) ? '' : form.rent} onChange={(e) => setForm({ ...form, rent: parseNumber(e.target.value) })} aria-invalid={!!errs.rent} data-testid="tenant-rent" /></Field>
            <Field label="Deposit (R)" error={errs.deposit}><input className="input num" type="number" step="0.01" value={Number.isNaN(form.deposit) ? '' : form.deposit} onChange={(e) => setForm({ ...form, deposit: parseNumber(e.target.value) })} aria-invalid={!!errs.deposit} /></Field>
            <Field label="Contact person"><input className="input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></Field>
            <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email (example.com)"><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Status"><select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TenantStatus })} data-testid="tenant-status">{Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Notes" className="span-2"><textarea className="textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            <div className="span-2 modal-foot"><button type="button" className="btn danger" onClick={() => setDel(form)}><IcoTrash />Delete</button><button type="button" className="btn" onClick={cancel}>Cancel</button><button type="submit" className="btn primary" data-testid="tenant-save">Save tenant</button></div>
          </form>
        )}
      </Modal>
      <Confirm open={!!del} title={`Delete ${del?.name || del?.ref}?`} danger confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={() => { if (!del) return; store.deleteTenant(del.id); store.toast('Tenant deleted.', 'info'); setDel(null); setEditing(null); setForm(null); }} body="Removes the fictional tenant and their rent payments from this browser's demo data and frees the unit." />
    </>
  );
}
