import { useMemo, useState } from 'react';
import { IcoFlag, IcoPlus, IcoSearch, IcoTrash, IcoUsers } from '../../components/Icons';
import RoleBar from '../../components/RoleBar';
import { Confirm, DueTag, Empty, Field, Modal, Notice, PageHeader, Panel, Stat, Tag, type TagTone } from '../../components/ui';
import { dueState, formatDate, todayIso } from '../../lib/dates';
import { useStore } from '../../store/useStore';
import type { HrKind, HrRecord, HrStatus, IncidentSeverity, IncidentStatus, SafetyIncident } from '../../store/types';

const HR_STATUS: Record<HrStatus, [string, TagTone]> = { open: ['Open', 'amber'], 'in-progress': ['In progress', 'blue'], closed: ['Closed', 'dark'] };
const INC_STATUS: Record<IncidentStatus, [string, TagTone]> = { open: ['Open', 'red'], investigating: ['Investigating', 'amber'], closed: ['Closed', 'green'] };
const SEV: Record<IncidentSeverity, TagTone> = { low: 'dark', medium: 'amber', high: 'red' };

export default function PeoplePage() {
  const store = useStore();
  const role = store.settings.role;
  const [tab, setTab] = useState<'hr' | 'safety'>('hr');
  const [q, setQ] = useState('');
  const [hrEdit, setHrEdit] = useState<HrRecord | null>(null);
  const [incEdit, setIncEdit] = useState<SafetyIncident | null>(null);
  const [del, setDel] = useState<{ kind: 'hr' | 'inc'; id: string; ref: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const hrVisible = role === 'owner' || role === 'manager';
  const hr = useMemo(() => store.hrRecords.filter((r) => !q || [r.ref, r.subject, r.position, r.stage].some((v) => v.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.date.localeCompare(a.date)), [store.hrRecords, q]);
  const inc = useMemo(() => store.incidents.filter((i) => !q || [i.ref, i.location, i.category, i.description].some((v) => v.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.date.localeCompare(a.date)), [store.incidents, q]);

  const saveHr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hrEdit) return;
    const x: Record<string, string> = {};
    if (!hrEdit.subject.trim()) x.subject = 'Use a redacted code such as E-0001 or C-0001.';
    if (!hrEdit.position.trim()) x.position = 'Enter a position.';
    if (!hrEdit.stage.trim()) x.stage = 'Enter the current stage.';
    setErrs(x);
    if (Object.keys(x).length) return;
    store.updateHrRecord(hrEdit.id, hrEdit);
    store.logActivity({ area: 'HR', title: `${hrEdit.kind === 'hiring' ? 'Hiring' : 'Disciplinary'} record updated`, detail: `${hrEdit.ref} · ${hrEdit.subject}`, status: HR_STATUS[hrEdit.status][0], tone: HR_STATUS[hrEdit.status][1] });
    setHrEdit(null); store.toast(`${hrEdit.ref} saved.`);
  };
  const saveInc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incEdit) return;
    const x: Record<string, string> = {};
    if (!incEdit.location.trim()) x.location = 'Enter a location.';
    if (!incEdit.description.trim()) x.description = 'Describe what happened (fictional).';
    if (!incEdit.date) x.date = 'Enter a date.';
    setErrs(x);
    if (Object.keys(x).length) return;
    store.updateIncident(incEdit.id, incEdit);
    store.logActivity({ area: 'Safety', title: `Incident ${INC_STATUS[incEdit.status][0].toLowerCase()}`, detail: `${incEdit.ref} · ${incEdit.category}`, status: INC_STATUS[incEdit.status][0], tone: INC_STATUS[incEdit.status][1] });
    setIncEdit(null); store.toast(`${incEdit.ref} saved.`);
  };

  const newHr = (kind: HrKind) => { const r = store.createHrRecord(kind); setErrs({}); setHrEdit(r); };
  const newInc = () => { const i = store.createIncident(); setErrs({}); setIncEdit(i); };
  const openFollowUps = store.incidents.filter((i) => i.status !== 'closed');

  return (
    <>
      <PageHeader kicker="People / HR & Safety" title="People & safety" subtitle="Representative fictional hiring, disciplinary and safety registers. Real HR data is never loaded in this demo."
        actions={tab === 'hr' ? <>{hrVisible && <button className="btn" onClick={() => newHr('disciplinary')} data-testid="new-disciplinary"><IcoPlus />Disciplinary record</button>}{hrVisible && <button className="btn primary" onClick={() => newHr('hiring')} data-testid="new-hiring"><IcoPlus />Hiring record</button>}</> : <button className="btn primary" onClick={newInc} data-testid="new-incident"><IcoPlus />Log incident</button>} />
      <RoleBar note="HR records are shown to the Manager and Owner roles only (simulated). Safety reporting is open to all roles." />
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'hr'} onClick={() => setTab('hr')} data-testid="tab-hr">HR records</button>
        <button role="tab" aria-selected={tab === 'safety'} onClick={() => setTab('safety')} data-testid="tab-safety">Safety register</button>
      </div>
      <div className="stat-grid">
        <Stat label="Hiring in progress" value={store.hrRecords.filter((r) => r.kind === 'hiring' && r.status !== 'closed').length} sub="Fictional candidates (codes only)" />
        <Stat label="Disciplinary open" value={store.hrRecords.filter((r) => r.kind === 'disciplinary' && r.status !== 'closed').length} sub="Details redacted in demo" />
        <Stat label="Open incidents" value={openFollowUps.length} tone={openFollowUps.length ? 'red' : undefined} sub="Awaiting follow-up" />
        <Stat label="Follow-ups overdue" value={openFollowUps.filter((i) => dueState(i.followUpDue) === 'overdue').length} sub="Past follow-up date" />
      </div>
      <Panel title={tab === 'hr' ? 'HR register' : 'Safety incident register'} meta={tab === 'hr' ? 'Hiring and disciplinary records — fictional subjects identified by code only' : 'Incidents, near misses and follow-up actions — fictional'}>
        <div className="toolbar"><label className="search-box"><IcoSearch /><input placeholder="Search records" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search records" /></label></div>
        {tab === 'hr' && !hrVisible && <Notice tone="amber">HR records are hidden for the {role} role in this demonstration. Switch to Manager or Owner to view them. (Simulated restriction only.)</Notice>}
        {tab === 'hr' && hrVisible && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Record</th><th>Type</th><th>Position</th><th>Stage</th><th>Date</th><th>Status</th><th /></tr></thead>
              <tbody>
                {hr.map((r) => <tr key={r.id} data-testid="hr-row"><td><div className="cell-flex"><span className="row-icon"><IcoUsers /></span><div><strong>{r.subject}</strong><small>{r.ref} · {r.summary.slice(0, 60)}</small></div></div></td><td><Tag tone={r.kind === 'hiring' ? 'blue' : 'gold'}>{r.kind}</Tag></td><td>{r.position}</td><td>{r.stage}</td><td>{formatDate(r.date)}</td><td><Tag tone={HR_STATUS[r.status][1]}>{HR_STATUS[r.status][0]}</Tag></td><td><button className="btn xs" onClick={() => { setErrs({}); setHrEdit(r); }}>Edit</button></td></tr>)}
                {!hr.length && <tr><td colSpan={7}><Empty title="No HR records" /></td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'safety' && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Incident</th><th>Category</th><th>Severity</th><th>Date</th><th>Follow-up due</th><th>Status</th><th /></tr></thead>
              <tbody>
                {inc.map((i) => <tr key={i.id} data-testid="incident-row"><td><div className="cell-flex"><span className="row-icon"><IcoFlag /></span><div><strong>{i.ref} · {i.location}</strong><small>{i.description.slice(0, 70)}</small></div></div></td><td>{i.category}</td><td><Tag tone={SEV[i.severity]}>{i.severity}</Tag></td><td>{formatDate(i.date)}</td><td>{i.followUpDue ? <>{formatDate(i.followUpDue)} {i.status !== 'closed' && <DueTag state={dueState(i.followUpDue)} />}</> : '—'}</td><td><Tag tone={INC_STATUS[i.status][1]}>{INC_STATUS[i.status][0]}</Tag></td><td><button className="btn xs" onClick={() => { setErrs({}); setIncEdit(i); }}>Edit</button></td></tr>)}
                {!inc.length && <tr><td colSpan={7}><Empty title="No incidents logged" /></td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: 14 }}><Notice tone="grey">Demo boundary: subjects are fictional codes, summaries are generic, and nothing here is a real employee, candidate or incident. Production HR data would require POPIA-compliant handling and real access control.</Notice></div>
      </Panel>

      <Modal open={!!hrEdit} title={hrEdit ? `${hrEdit.kind === 'hiring' ? 'Hiring' : 'Disciplinary'} record ${hrEdit.ref}` : ''} sub="Fictional — use codes, not names." onClose={() => setHrEdit(null)}>
        {hrEdit && (
          <form onSubmit={saveHr} className="form-grid">
            <Field label={hrEdit.kind === 'hiring' ? 'Candidate code' : 'Employee code'} error={errs.subject}><input className="input" value={hrEdit.subject} onChange={(e) => setHrEdit({ ...hrEdit, subject: e.target.value })} aria-invalid={!!errs.subject} data-testid="hr-subject" placeholder={hrEdit.kind === 'hiring' ? 'C-0143' : 'E-0210'} /></Field>
            <Field label="Position" error={errs.position}><input className="input" value={hrEdit.position} onChange={(e) => setHrEdit({ ...hrEdit, position: e.target.value })} aria-invalid={!!errs.position} data-testid="hr-position" /></Field>
            <Field label="Stage" error={errs.stage}><input className="input" value={hrEdit.stage} onChange={(e) => setHrEdit({ ...hrEdit, stage: e.target.value })} aria-invalid={!!errs.stage} /></Field>
            <Field label="Status"><select className="select" value={hrEdit.status} onChange={(e) => setHrEdit({ ...hrEdit, status: e.target.value as HrStatus })}>{Object.entries(HR_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Date"><input className="input" type="date" value={hrEdit.date} onChange={(e) => setHrEdit({ ...hrEdit, date: e.target.value })} /></Field>
            <Field label="Summary (generic)" className="span-2"><textarea className="textarea" value={hrEdit.summary} onChange={(e) => setHrEdit({ ...hrEdit, summary: e.target.value })} /></Field>
            <div className="span-2 modal-foot"><button type="button" className="btn danger" onClick={() => setDel({ kind: 'hr', id: hrEdit.id, ref: hrEdit.ref })}><IcoTrash />Delete</button><button type="button" className="btn" onClick={() => setHrEdit(null)}>Cancel</button><button type="submit" className="btn primary" data-testid="hr-save">Save record</button></div>
          </form>
        )}
      </Modal>
      <Modal open={!!incEdit} title={incEdit ? `Incident ${incEdit.ref}` : ''} sub="Fictional incident and follow-up." onClose={() => setIncEdit(null)}>
        {incEdit && (
          <form onSubmit={saveInc} className="form-grid">
            <Field label="Date" error={errs.date}><input className="input" type="date" value={incEdit.date} onChange={(e) => setIncEdit({ ...incEdit, date: e.target.value })} /></Field>
            <Field label="Location" error={errs.location}><input className="input" value={incEdit.location} onChange={(e) => setIncEdit({ ...incEdit, location: e.target.value })} aria-invalid={!!errs.location} data-testid="incident-location" /></Field>
            <Field label="Category"><select className="select" value={incEdit.category} onChange={(e) => setIncEdit({ ...incEdit, category: e.target.value })}>{['Near miss', 'Minor injury', 'Equipment', 'Vehicle', 'Environmental', 'Other'].map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Severity"><select className="select" value={incEdit.severity} onChange={(e) => setIncEdit({ ...incEdit, severity: e.target.value as IncidentSeverity })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>
            <Field label="Description (fictional)" error={errs.description} className="span-2"><textarea className="textarea" value={incEdit.description} onChange={(e) => setIncEdit({ ...incEdit, description: e.target.value })} aria-invalid={!!errs.description} data-testid="incident-description" /></Field>
            <Field label="Follow-up action" className="span-2"><input className="input" value={incEdit.followUp} onChange={(e) => setIncEdit({ ...incEdit, followUp: e.target.value })} /></Field>
            <Field label="Follow-up due"><input className="input" type="date" value={incEdit.followUpDue ?? ''} onChange={(e) => setIncEdit({ ...incEdit, followUpDue: e.target.value || undefined })} /></Field>
            <Field label="Status"><select className="select" value={incEdit.status} onChange={(e) => setIncEdit({ ...incEdit, status: e.target.value as IncidentStatus })} data-testid="incident-status">{Object.entries(INC_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <div className="span-2 modal-foot"><button type="button" className="btn danger" onClick={() => setDel({ kind: 'inc', id: incEdit.id, ref: incEdit.ref })}><IcoTrash />Delete</button><button type="button" className="btn" onClick={() => setIncEdit(null)}>Cancel</button><button type="submit" className="btn primary" data-testid="incident-save">Save incident</button></div>
          </form>
        )}
      </Modal>
      <Confirm open={!!del} title={`Delete ${del?.ref}?`} danger confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={() => { if (!del) return; if (del.kind === 'hr') { store.deleteHrRecord(del.id); setHrEdit(null); } else { store.deleteIncident(del.id); setIncEdit(null); } setDel(null); store.toast('Record deleted.', 'info'); }} body="This removes the fictional record from this browser's demo data." />
      <span className="sr-only">{todayIso()}</span>
    </>
  );
}
