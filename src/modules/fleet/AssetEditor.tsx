import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { IcoTrash } from '../../components/Icons';
import { Confirm, DueTag, Field, Notice, PageHeader, Panel, Tag } from '../../components/ui';
import { dueState, formatDate, formatDateTime, daysBetween, todayIso } from '../../lib/dates';
import { formatRand, toCents } from '../../lib/money';
import { useStore } from '../../store/useStore';
import type { Asset, AssetStatus } from '../../store/types';
import { ASSET_STATUS } from './assetHelpers';

export default function AssetEditor() {
  const { id } = useParams();
  return <Editor key={id} id={id} />;
}

function Editor({ id }: { id: string | undefined }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const store = useStore();
  const source = store.assets.find((a) => a.id === id);
  const [draft, setDraft] = useState<Asset | undefined>(source);
  const [dirty, setDirty] = useState(!!params.get('new'));
  const [showErrors, setShowErrors] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { if (source && !dirty) setDraft(source); }, [source, dirty]);

  if (!source || !draft) return <PageHeader kicker="Operations / Asset control" title="Asset not found" actions={<Link className="btn" to="/fleet">Back to register</Link>} />;

  const errors: Record<string, string> = {};
  if (!draft.name.trim()) errors.name = 'Enter a name for the asset.';
  if (!draft.registration.trim()) errors.registration = draft.kind === 'vehicle' ? 'Enter a (fictional) registration.' : 'Enter a (fictional) serial or reference.';
  if (draft.year !== undefined && !Number.isNaN(draft.year) && (draft.year < 1980 || draft.year > 2030)) errors.year = 'Enter a realistic year.';
  const invalid = Object.keys(errors).length > 0;
  const patch = (p: Partial<Asset>) => { setDraft({ ...draft, ...p }); setDirty(true); };

  const save = () => {
    setShowErrors(true);
    if (invalid) { store.toast('Please complete the highlighted fields.', 'err'); return; }
    store.updateAsset(draft.id, draft);
    setDirty(false);
    store.logActivity({ area: draft.kind === 'vehicle' ? 'Fleet' : 'Equipment', title: `${draft.kind === 'vehicle' ? 'Vehicle' : 'Equipment'} record updated`, detail: `${draft.ref} · ${draft.name}`, status: 'Saved', tone: 'dark' });
    store.toast(`${draft.ref} saved (this browser only).`);
    navigate(`/fleet/${draft.id}`, { replace: true });
  };

  const expenses = store.expenses.filter((e) => e.assetId === draft.id);
  const spend = expenses.reduce((s, e) => s + toCents(e.amount), 0);
  const today = todayIso();
  const dates: Array<{ key: keyof Asset; label: string }> = draft.kind === 'vehicle'
    ? [{ key: 'serviceDue', label: 'Next service' }, { key: 'licenceDue', label: 'Licence renewal' }, { key: 'insuranceDue', label: 'Insurance renewal' }, { key: 'inspectionDue', label: 'Roadworthy / inspection' }]
    : [{ key: 'serviceDue', label: 'Next service' }, { key: 'inspectionDue', label: 'Inspection / certification' }, { key: 'licenceDue', label: 'Licence / permit renewal' }, { key: 'insuranceDue', label: 'Insurance renewal' }];

  return (
    <>
      <PageHeader kicker="Operations / Asset control" title={draft.name || 'New asset'} subtitle={`${draft.ref} · ${draft.kind === 'vehicle' ? 'Vehicle' : 'Equipment'} · fictional record`}
        actions={<><Link className="btn" to="/fleet">Back</Link><button className="btn primary" onClick={save} data-testid="save-asset">{dirty ? 'Save changes' : 'Saved'}</button></>} />
      <div className="doc-grid">
        <Panel>
          <div className="doc-head"><div><Tag tone={ASSET_STATUS[draft.status][1]}>{ASSET_STATUS[draft.status][0]}</Tag><h2 className="doc-title">{draft.ref}</h2><div className="doc-id">{dirty ? <span style={{ color: 'var(--warn)' }}>unsaved changes</span> : `updated ${formatDateTime(draft.updatedAt)}`}</div></div></div>
          <hr className="thin" />
          <div className="form-grid">
            <Field label="Asset name" error={showErrors ? errors.name : undefined} className="span-2"><input className="input" value={draft.name} onChange={(e) => patch({ name: e.target.value })} aria-invalid={showErrors && !!errors.name} data-testid="asset-name" /></Field>
            <Field label="Make"><input className="input" value={draft.make} onChange={(e) => patch({ make: e.target.value })} /></Field>
            <Field label="Model"><input className="input" value={draft.model} onChange={(e) => patch({ model: e.target.value })} /></Field>
            <Field label={draft.kind === 'vehicle' ? 'Registration (fictional)' : 'Serial / reference (fictional)'} error={showErrors ? errors.registration : undefined}><input className="input" value={draft.registration} onChange={(e) => patch({ registration: e.target.value })} aria-invalid={showErrors && !!errors.registration} data-testid="asset-registration" /></Field>
            <Field label="Year" error={showErrors ? errors.year : undefined}><input className="input" type="number" value={draft.year ?? ''} onChange={(e) => patch({ year: e.target.value === '' ? undefined : Number(e.target.value) })} /></Field>
            <Field label="Status"><select className="select" value={draft.status} onChange={(e) => patch({ status: e.target.value as AssetStatus })} data-testid="asset-status">{Object.entries(ASSET_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Assigned to"><input className="input" value={draft.assignedTo} onChange={(e) => patch({ assignedTo: e.target.value })} /></Field>
            {draft.kind === 'vehicle' && <Field label="Odometer (km)"><input className="input" type="number" value={draft.odometer ?? ''} onChange={(e) => patch({ odometer: e.target.value === '' ? undefined : Number(e.target.value) })} /></Field>}
          </div>
          <hr className="thin" />
          <h3 className="panel-title" style={{ fontSize: 14, marginBottom: 12 }}>Renewals &amp; checks</h3>
          <div className="form-grid">
            {dates.map((d) => {
              const value = (draft[d.key] as string | undefined) ?? '';
              const st = dueState(value || undefined, today);
              return (
                <Field key={d.key} label={d.label} hint={value ? (st === 'overdue' ? `${Math.abs(daysBetween(today, value))} days overdue` : st === 'due-soon' ? `Due in ${daysBetween(today, value)} days` : `In ${daysBetween(today, value)} days`) : 'Not set'}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input className="input" type="date" value={value} onChange={(e) => patch({ [d.key]: e.target.value || undefined } as Partial<Asset>)} data-testid={`date-${d.key}`} />
                    <DueTag state={st} />
                  </div>
                </Field>
              );
            })}
          </div>
          <hr className="thin" />
          <Field label="Notes"><textarea className="textarea" value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} /></Field>
          <div className="btns" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
            <button className="btn danger" onClick={() => setConfirmDelete(true)} data-testid="delete-asset"><IcoTrash />Delete asset</button>
            <button className="btn primary" onClick={save}>{dirty ? 'Save changes' : 'Saved'}</button>
          </div>
        </Panel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Panel title="Recorded costs (fictional)" meta="Expenses linked to this asset">
            {expenses.length ? (
              <ul className="list">
                {expenses.slice(0, 6).map((e) => <li key={e.id}><div className="grow"><b>{e.description}</b><small>{formatDate(e.date)} · {e.category}</small></div><b style={{ fontSize: 13 }}>{formatRand(toCents(e.amount))}</b></li>)}
              </ul>
            ) : <div className="empty">No costs linked yet.</div>}
            <hr className="thin" />
            <div className="totals"><div className="grand" style={{ borderTop: 0, paddingTop: 0 }}><span>Total linked spend</span><b style={{ fontSize: 20 }}>{formatRand(spend)}</b></div></div>
            <p style={{ marginTop: 10 }}><Link className="link-btn" to="/reports">Add costs in Reports →</Link></p>
          </Panel>
          <Notice tone="grey">Due states recalculate from today's date. Change a renewal date and save to see the register and overview update.</Notice>
        </div>
      </div>
      <Confirm open={confirmDelete} title={`Delete ${draft.ref}?`} danger confirmLabel="Delete" onCancel={() => setConfirmDelete(false)} onConfirm={() => { store.deleteAsset(draft.id); store.toast('Asset deleted.', 'info'); navigate('/fleet'); }} body="This removes the fictional asset from this browser's demo data. Linked cost records are kept." />
    </>
  );
}
