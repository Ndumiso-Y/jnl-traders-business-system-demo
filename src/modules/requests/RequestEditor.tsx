import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { IcoPlus, IcoTrash } from '../../components/Icons';
import RoleBar from '../../components/RoleBar';
import { Confirm, Field, Modal, Notice, PageHeader, Panel, Tag } from '../../components/ui';
import { formatRand, parseNumber } from '../../lib/money';
import { addDays, formatDate, formatDateTime, todayIso } from '../../lib/dates';
import { actorForUser, canTransition, newId, selectCurrentUser, useStore } from '../../store/useStore';
import { ROLE_LABELS, type Request, type RequestItem, type RequestKind, type RequestStatus } from '../../store/types';
import { REQ_STATUS, requestEstimate } from './requestHelpers';

export default function RequestEditor({ kind }: { kind: RequestKind }) {
  const { id } = useParams();
  return <Editor key={`${kind}-${id}`} kind={kind} id={id} />;
}

function Editor({ kind, id }: { kind: RequestKind; id: string | undefined }) {
  const navigate = useNavigate();
  const store = useStore();
  const source = store.requests.find((r) => r.id === id);
  const role = store.settings.role;
  const me = selectCurrentUser(store);
  const actor = actorForUser(me);
  const [draft, setDraft] = useState<Request | undefined>(source);
  const [dirty, setDirty] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [decision, setDecision] = useState<RequestStatus | null>(null);
  const [note, setNote] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [poOpen, setPoOpen] = useState(false);
  const [poSupplier, setPoSupplier] = useState('');
  const [poExpected, setPoExpected] = useState(addDays(todayIso(), 7));
  const [poErr, setPoErr] = useState('');

  useEffect(() => { if (source && !dirty) setDraft(source); }, [source, dirty]);

  const base = kind === 'ppe' ? '/ppe' : '/procurement';
  if (!source || !draft) {
    return <PageHeader kicker="Procurement" title="Request not found" subtitle="This record is not in the demo data for this browser." actions={<Link className="btn" to={base}>Back to list</Link>} />;
  }

  const isOwn = draft.requesterUserId ? draft.requesterUserId === me.id : draft.requesterRole === role;
  const editable = draft.status === 'draft' && (isOwn || actor.overrideOwn || actor.canApprove);
  const errors: Record<string, string> = {};
  if (!draft.title.trim()) errors.title = 'Give the request a short title.';
  if (!draft.department.trim()) errors.department = 'Enter a department.';
  if (!draft.neededBy) errors.neededBy = 'Enter the date needed by.';
  if (!draft.justification.trim()) errors.justification = 'Briefly explain why this is needed.';
  const itemErrors = draft.items.map((it) => ({
    description: it.description.trim() ? '' : 'Describe the item.',
    qty: Number.isFinite(it.qty) && it.qty > 0 ? '' : 'Quantity must be above zero.',
    estUnitCost: Number.isFinite(it.estUnitCost) && it.estUnitCost >= 0 ? '' : 'Cost cannot be negative.',
  }));
  const invalid = Object.keys(errors).length > 0 || itemErrors.some((e) => e.description || e.qty || e.estUnitCost);

  const patch = (p: Partial<Request>) => { setDraft({ ...draft, ...p }); setDirty(true); };
  const newItem = (): RequestItem => ({ id: newId('ri'), description: '', qty: 1, estUnitCost: 0 });
  const updateItem = (iid: string, p: Partial<RequestItem>) => patch({ items: draft.items.map((it) => (it.id === iid ? { ...it, ...p } : it)) });

  const save = (): boolean => {
    setShowErrors(true);
    if (invalid) { store.toast('Please complete the highlighted fields.', 'err'); return false; }
    store.updateRequest(draft.id, draft);
    setDirty(false);
    store.toast(`${draft.number} saved (this browser only).`);
    return true;
  };

  const can = (to: RequestStatus) => canTransition(actor, draft.status, to, isOwn);

  const act = (to: RequestStatus, withNote?: string) => {
    if (to === 'submitted' && dirty && !save()) return;
    const res = store.transitionRequest(draft.id, to, withNote);
    if (!res.ok) { store.toast(res.reason ?? 'Not allowed.', 'err'); return; }
    setDirty(false);
    setDecision(null); setNote('');
    store.toast(`${draft.number}: ${REQ_STATUS[to][0]}.`);
  };

  const raisePo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplier.trim()) { setPoErr('Enter a (fictional) supplier name.'); return; }
    if (!poExpected) { setPoErr('Enter an expected delivery date.'); return; }
    const po = store.raisePurchaseOrder(draft.id, poSupplier.trim(), poExpected);
    setPoOpen(false); setPoErr('');
    if (po) store.toast(`${po.number} raised for ${draft.number}.`);
  };

  const [statusLabel, statusTone] = REQ_STATUS[draft.status];
  const po = draft.purchaseOrderId ? store.purchaseOrders.find((p) => p.id === draft.purchaseOrderId) : undefined;
  const actions: Array<{ to: RequestStatus; label: string; cls: string; needsNote?: boolean; testid: string }> = [];
  if (draft.status === 'draft') actions.push({ to: 'submitted', label: 'Submit for approval', cls: 'primary', testid: 'submit-request' });
  if (draft.status === 'submitted') { actions.push({ to: 'draft', label: 'Return to draft', cls: '', testid: 'return-draft' }); actions.push({ to: 'rejected', label: 'Reject', cls: 'danger', needsNote: true, testid: 'reject-request' }); actions.push({ to: 'approved', label: 'Approve', cls: 'primary', needsNote: true, testid: 'approve-request' }); }
  if (draft.status === 'approved') { actions.push({ to: 'rejected', label: 'Reject', cls: 'danger', needsNote: true, testid: 'reject-request' }); actions.push({ to: 'fulfilled', label: 'Mark fulfilled', cls: 'primary', testid: 'fulfil-request' }); }
  if (draft.status === 'rejected') actions.push({ to: 'draft', label: 'Reopen as draft', cls: '', testid: 'return-draft' });
  const blocked = actions.filter((a) => !can(a.to).ok);

  return (
    <>
      <PageHeader kicker={kind === 'ppe' ? 'Procurement / PPE' : 'Procurement / Requests'} title={`${kind === 'ppe' ? 'PPE' : 'Procurement'} request ${draft.number}`} subtitle="Draft → Submitted → Approved / Rejected → Fulfilled. Roles are simulated for the demonstration."
        actions={<Link className="btn" to={base}>Back</Link>} />
      <RoleBar note={`${me.name} ${actor.canApprove ? 'can approve requests' : 'cannot approve requests'}${actor.canFulfil ? ' and can raise purchase orders' : ''}. Nobody except an owner or super admin may approve their own request. Browser-side simulation only.`} />

      <div className="doc-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Panel>
            <div className="doc-head">
              <div>
                <Tag tone={statusTone}>{statusLabel}</Tag>
                <h2 className="doc-title">{draft.title || 'Untitled request'}</h2>
                <div className="doc-id">{draft.number} · requested by {draft.requesterName} ({ROLE_LABELS[draft.requesterRole]}) · {dirty ? <span style={{ color: 'var(--warn)' }}>unsaved changes</span> : `updated ${formatDateTime(draft.updatedAt)}`}</div>
              </div>
              <div className="doc-meta">Estimated value<b>{formatRand(requestEstimate(draft))}</b></div>
            </div>
            <hr className="thin" />
            <div className="form-grid">
              <Field label="Title" error={showErrors ? errors.title : undefined} className="span-2"><input className="input" value={draft.title} onChange={(e) => patch({ title: e.target.value })} disabled={!editable} aria-invalid={showErrors && !!errors.title} data-testid="request-title" /></Field>
              <Field label="Department" error={showErrors ? errors.department : undefined}><input className="input" value={draft.department} onChange={(e) => patch({ department: e.target.value })} disabled={!editable} aria-invalid={showErrors && !!errors.department} data-testid="request-department" /></Field>
              <Field label="Needed by" error={showErrors ? errors.neededBy : undefined}><input className="input" type="date" value={draft.neededBy} onChange={(e) => patch({ neededBy: e.target.value })} disabled={!editable} /></Field>
              <Field label="Justification" error={showErrors ? errors.justification : undefined} className="span-2"><textarea className="textarea" value={draft.justification} onChange={(e) => patch({ justification: e.target.value })} disabled={!editable} aria-invalid={showErrors && !!errors.justification} data-testid="request-justification" /></Field>
            </div>
            <hr className="thin" />
            <div className="panel-head" style={{ marginBottom: 6 }}>
              <h3 className="panel-title" style={{ fontSize: 14 }}>Items requested</h3>
              {editable && <button type="button" className="link-btn" onClick={() => patch({ items: [...draft.items, newItem()] })}><IcoPlus style={{ width: 14, height: 14 }} />Add item</button>}
            </div>
            <div className="table-wrap">
              <table className="table items-table">
                <thead><tr><th>Description</th><th className="num" style={{ width: 90 }}>Qty</th><th className="num" style={{ width: 140 }}>Est. unit cost</th><th className="num" style={{ width: 120 }}>Est. total</th>{editable && <th style={{ width: 44 }} />}</tr></thead>
                <tbody>
                  {draft.items.map((it, i) => (
                    <tr key={it.id}>
                      <td>{editable ? <input className="input" aria-label={`Item ${i + 1} description`} value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} aria-invalid={showErrors && !!itemErrors[i].description} data-testid="item-description" /> : <strong>{it.description}</strong>}{showErrors && itemErrors[i].description && <span className="field-error">{itemErrors[i].description}</span>}</td>
                      <td className="num">{editable ? <input className="input num" type="number" step="any" aria-label={`Item ${i + 1} quantity`} value={Number.isNaN(it.qty) ? '' : it.qty} onChange={(e) => updateItem(it.id, { qty: parseNumber(e.target.value) })} aria-invalid={showErrors && !!itemErrors[i].qty} /> : it.qty}{showErrors && itemErrors[i].qty && <span className="field-error">{itemErrors[i].qty}</span>}</td>
                      <td className="num">{editable ? <input className="input num" type="number" step="0.01" aria-label={`Item ${i + 1} estimated unit cost`} value={Number.isNaN(it.estUnitCost) ? '' : it.estUnitCost} onChange={(e) => updateItem(it.id, { estUnitCost: parseNumber(e.target.value) })} aria-invalid={showErrors && !!itemErrors[i].estUnitCost} /> : formatRand(Math.round(it.estUnitCost * 100))}{showErrors && itemErrors[i].estUnitCost && <span className="field-error">{itemErrors[i].estUnitCost}</span>}</td>
                      <td className="num"><strong>{formatRand(Math.round((Number.isFinite(it.qty) ? it.qty : 0) * (Number.isFinite(it.estUnitCost) ? it.estUnitCost : 0) * 100))}</strong></td>
                      {editable && <td><button type="button" className="circle-button" style={{ width: 32, height: 32 }} aria-label={`Remove item ${i + 1}`} onClick={() => patch({ items: draft.items.length > 1 ? draft.items.filter((x) => x.id !== it.id) : [newItem()] })}><IcoTrash style={{ width: 14, height: 14 }} /></button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="btns" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
              {editable && <button className="btn danger" onClick={() => setConfirmDelete(true)}><IcoTrash />Delete draft</button>}
              {editable && <button className="btn" onClick={save} data-testid="save-request">{dirty ? 'Save changes' : 'Saved'}</button>}
              {actions.map((a) => {
                const check = can(a.to);
                return <button key={a.to} className={`btn ${a.cls}`} disabled={!check.ok} title={check.ok ? undefined : check.reason} aria-disabled={!check.ok} onClick={() => { if (!check.ok) { store.toast(check.reason ?? 'Not allowed.', 'err'); return; } if (a.needsNote) setDecision(a.to); else act(a.to); }} data-testid={a.testid}>{a.label}</button>;
              })}
              {draft.status === 'approved' && !draft.purchaseOrderId && actor.canFulfil && <button className="btn gold" onClick={() => setPoOpen(true)} data-testid="raise-po">Raise purchase order</button>}
            </div>
            {blocked.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <Notice tone="amber" >
                  <b>Not available for {me.name}:</b> {blocked.map((b) => `${b.label} — ${can(b.to).reason}`).join(' ')} <span style={{ opacity: .8 }}>(Simulated rule for the demo. Switch role above to continue the workflow.)</span>
                </Notice>
              </div>
            )}
            {draft.status === 'approved' && me.canReviewFinance && <div style={{ marginTop: 14 }}><Notice tone="gold">Finance review: this request is approved and {po ? `linked to ${po.number}.` : 'ready for a purchase order.'}</Notice></div>}
          </Panel>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Panel title="Activity history" meta="Chronological, with simulated roles">
            <ol className="timeline" data-testid="history">
              {draft.history.map((h) => (
                <li key={h.id}><span /><div><b>{h.action}</b><small>{h.byName} · {ROLE_LABELS[h.byRole]} · {formatDateTime(h.at)}</small>{h.note && <div className="note">{h.note}</div>}</div></li>
              ))}
            </ol>
          </Panel>
          {po && (
            <Panel title="Linked purchase order">
              <ul className="list">
                <li><div className="grow"><b>{po.number}</b><small>{po.supplier} · expected {formatDate(po.expected)}</small></div><Tag tone={po.status === 'open' ? 'amber' : po.status === 'received' ? 'green' : 'dark'}>{po.status}</Tag></li>
              </ul>
              <p style={{ marginTop: 10 }}><Link className="link-btn" to="/procurement/orders">Open purchase orders</Link></p>
            </Panel>
          )}
          <div className="notice dark"><div><b>Demonstration boundary</b>Role restrictions are enforced only in this browser's JavaScript. A production system would need real authentication and server-side authorisation.</div></div>
        </div>
      </div>

      <Modal open={decision !== null} title={decision === 'approved' ? `Approve ${draft.number}?` : `Reject ${draft.number}?`} sub="Add an optional comment for the activity history." onClose={() => setDecision(null)}
        footer={<><button className="btn" onClick={() => setDecision(null)}>Cancel</button><button className={`btn ${decision === 'approved' ? 'primary' : 'danger'}`} onClick={() => decision && act(decision, note)} data-testid="decision-confirm">{decision === 'approved' ? 'Approve' : 'Reject'}</button></>}>
        <Field label="Comment (optional)"><textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} data-testid="decision-note" /></Field>
      </Modal>
      <Modal open={poOpen} title={`Raise purchase order for ${draft.number}`} sub="Fictional supplier and dates only." onClose={() => setPoOpen(false)}>
        <form onSubmit={raisePo} className="form-grid">
          <Field label="Supplier (fictional)" error={poErr} className="span-2"><input className="input" value={poSupplier} onChange={(e) => setPoSupplier(e.target.value)} data-testid="po-supplier" /></Field>
          <Field label="Expected delivery"><input className="input" type="date" value={poExpected} onChange={(e) => setPoExpected(e.target.value)} /></Field>
          <div className="span-2 modal-foot"><button type="button" className="btn" onClick={() => setPoOpen(false)}>Cancel</button><button type="submit" className="btn primary" data-testid="po-submit">Raise PO</button></div>
        </form>
      </Modal>
      <Confirm open={confirmDelete} title={`Delete ${draft.number}?`} danger confirmLabel="Delete" onCancel={() => setConfirmDelete(false)} onConfirm={() => { store.deleteRequest(draft.id); navigate(base); store.toast('Draft deleted.', 'info'); }} body="This removes the draft request from this browser's demo data." />
    </>
  );
}
