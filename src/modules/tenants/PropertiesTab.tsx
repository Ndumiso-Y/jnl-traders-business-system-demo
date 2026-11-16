import { useState } from 'react';
import { IcoPlus, IcoTrash } from '../../components/Icons';
import { Confirm, Empty, Field, Modal, Panel, Tag } from '../../components/ui';
import { formatRand, parseNumber, toCents } from '../../lib/money';
import { useStore } from '../../store/useStore';
import type { Property, PropertyType, Unit, UnitStatus } from '../../store/types';

const TYPES: Record<PropertyType, string> = { residential: 'Residential', commercial: 'Commercial', mixed: 'Mixed use', industrial: 'Industrial' };
const UNIT_STATUS: Record<UnitStatus, ['Vacant' | 'Occupied' | 'Maintenance', 'amber' | 'green' | 'dark']> = { vacant: ['Vacant', 'amber'], occupied: ['Occupied', 'green'], maintenance: ['Maintenance', 'dark'] };

export default function PropertiesTab({ editing, setEditing, onOpenLedger }: { editing: string | null; setEditing: (id: string | null) => void; onOpenLedger: (tenantId: string) => void }) {
  const store = useStore();
  const [selected, setSelected] = useState<string>(store.properties[0]?.id ?? '');
  const [del, setDel] = useState<Property | null>(null);
  const [form, setForm] = useState<Property | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const property = store.properties.find((p) => p.id === selected) ?? store.properties[0];
  const unitsOf = (pid: string) => store.units.filter((u) => u.propertyId === pid);

  // open the edit modal for a newly created / chosen property
  const editingProperty = editing ? store.properties.find((p) => p.id === editing) : null;
  if (editingProperty && (!form || form.id !== editingProperty.id)) { setForm({ ...editingProperty }); setErrs({}); }

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const x: Record<string, string> = {};
    if (!form.name.trim()) x.name = 'Enter a (fictional) property name.';
    if (!form.address.trim()) x.address = 'Enter an address.';
    setErrs(x);
    if (Object.keys(x).length) return;
    store.updateProperty(form.id, form);
    store.logActivity({ area: 'Tenants', title: 'Property saved', detail: `${form.ref} · ${form.name}`, status: 'Saved', tone: 'dark' });
    store.toast(`${form.ref} saved (this browser only).`);
    setSelected(form.id); setEditing(null); setForm(null);
  };
  const cancel = () => { if (form && !form.name.trim() && !form.address.trim()) store.deleteProperty(form.id); setEditing(null); setForm(null); };

  const updateUnit = (u: Unit, patch: Partial<Unit>) => store.updateUnit(u.id, patch);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 18, marginBottom: 18 }}>
        <Panel title="Properties" meta="Fictional portfolio">
          <ul className="list" data-testid="property-list">
            {store.properties.map((p) => {
              const us = unitsOf(p.id);
              const occ = us.filter((u) => u.status === 'occupied').length;
              const roll = us.filter((u) => u.status === 'occupied').reduce((s, u) => s + toCents(u.rent), 0);
              return (
                <li key={p.id} style={{ cursor: 'pointer', background: p.id === property?.id ? 'var(--bg-ivory)' : undefined, borderRadius: 10, padding: '12px 8px' }} onClick={() => setSelected(p.id)} data-testid="property-row">
                  <div className="grow"><b>{p.name || <em>Unnamed property</em>}</b><small>{p.ref} · {TYPES[p.type]} · {p.address}</small></div>
                  <div style={{ textAlign: 'right' }}><b style={{ fontSize: 13 }}>{occ}/{us.length} let</b><small>{formatRand(roll)} / month</small></div>
                  <button className="btn xs" onClick={(e) => { e.stopPropagation(); setEditing(p.id); }}>Edit</button>
                </li>
              );
            })}
            {!store.properties.length && <li><Empty title="No properties yet" body="Add a fictional property to begin." /></li>}
          </ul>
        </Panel>
        <Panel title={property ? `Units — ${property.name || property.ref}` : 'Units'} meta={property ? `${unitsOf(property.id).length} units · click a cell to edit` : ''} right={property && <button className="btn sm" onClick={() => store.addUnit(property.id)} data-testid="add-unit"><IcoPlus />Add unit</button>}>
          {property ? (
            <div className="table-wrap">
              <table className="table items-table" data-testid="unit-table">
                <thead><tr><th>Unit</th><th>Description</th><th className="num">Rent / month</th><th>Status</th><th>Tenant</th><th /></tr></thead>
                <tbody>
                  {unitsOf(property.id).map((u) => {
                    const tenant = store.tenants.find((t) => t.unitId === u.id && t.status !== 'ended');
                    return (
                      <tr key={u.id} data-testid="unit-row">
                        <td><input className="input" style={{ minWidth: 110 }} aria-label="Unit reference" value={u.ref} placeholder="Unit ref" onChange={(e) => updateUnit(u, { ref: e.target.value })} /></td>
                        <td><input className="input" style={{ minWidth: 200 }} aria-label="Unit description" value={u.description} placeholder="Description" onChange={(e) => updateUnit(u, { description: e.target.value })} /></td>
                        <td className="num"><input className="input num" style={{ minWidth: 110 }} type="number" step="0.01" aria-label="Unit rent" value={Number.isNaN(u.rent) ? '' : u.rent} onChange={(e) => updateUnit(u, { rent: parseNumber(e.target.value) || 0 })} /></td>
                        <td><select className="select sm" style={{ minWidth: 130 }} aria-label="Unit status" value={u.status} onChange={(e) => updateUnit(u, { status: e.target.value as UnitStatus })} disabled={!!tenant}>{Object.entries(UNIT_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></td>
                        <td>{tenant ? <button className="link-btn" onClick={() => onOpenLedger(tenant.id)}>{tenant.name}</button> : <Tag tone={UNIT_STATUS[u.status][1]}>{UNIT_STATUS[u.status][0]}</Tag>}</td>
                        <td><button className="circle-button" style={{ width: 30, height: 30 }} aria-label={`Remove unit ${u.ref}`} disabled={!!tenant} onClick={() => { const r = store.deleteUnit(u.id); if (!r.ok) store.toast(r.reason ?? 'Not allowed.', 'err'); }}><IcoTrash style={{ width: 13, height: 13 }} /></button></td>
                      </tr>
                    );
                  })}
                  {!unitsOf(property.id).length && <tr><td colSpan={6}><Empty title="No units" body="Add units to let." /></td></tr>}
                </tbody>
              </table>
            </div>
          ) : <Empty title="Select a property" />}
          {property && <div className="btns" style={{ justifyContent: 'flex-end', marginTop: 14 }}><button className="btn danger sm" onClick={() => setDel(property)}><IcoTrash />Delete property</button></div>}
        </Panel>
      </div>

      <Modal open={!!form} title={form ? `Property ${form.ref}` : ''} sub="Fictional property details." onClose={cancel}>
        {form && (
          <form onSubmit={save} className="form-grid">
            <Field label="Name" error={errs.name} className="span-2"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errs.name} data-testid="property-name" /></Field>
            <Field label="Address" error={errs.address} className="span-2"><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} aria-invalid={!!errs.address} data-testid="property-address" /></Field>
            <Field label="Type"><select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PropertyType })}>{Object.entries(TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Notes" className="span-2"><textarea className="textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            <div className="span-2 modal-foot"><button type="button" className="btn" onClick={cancel}>Cancel</button><button type="submit" className="btn primary" data-testid="property-save">Save property</button></div>
          </form>
        )}
      </Modal>
      <Confirm open={!!del} title={`Delete ${del?.name || del?.ref}?`} danger confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={() => { if (!del) return; const r = store.deleteProperty(del.id); store.toast(r.ok ? 'Property deleted.' : r.reason ?? 'Not allowed.', r.ok ? 'info' : 'err'); setDel(null); if (r.ok) setSelected(store.properties[0]?.id ?? ''); }} body="Removes the fictional property and its units from this browser's demo data. Properties with active tenants cannot be deleted." />
    </>
  );
}
