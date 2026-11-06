import { useState } from 'react';
import { IcoPlus, IcoRefresh, IcoTrash } from '../../components/Icons';
import RoleBar from '../../components/RoleBar';
import { Confirm, Field, Modal, Notice, PageHeader, Panel, Stat, Tag } from '../../components/ui';
import { selectCurrentUser, useStore } from '../../store/useStore';
import { MODULES, ROLE_LABELS, type DemoUser, type ModuleKey, type Role } from '../../store/types';

const ROLE_OPTIONS: Role[] = ['requester', 'manager', 'finance', 'owner', 'admin'];

export default function UsersPage() {
  const users = useStore((s) => s.users);
  const settings = useStore((s) => s.settings);
  const updateUser = useStore((s) => s.updateUser);
  const addUser = useStore((s) => s.addUser);
  const deleteUser = useStore((s) => s.deleteUser);
  const resetUsers = useStore((s) => s.resetUsers);
  const toast = useStore((s) => s.toast);
  const me = selectCurrentUser({ users, settings });
  const canEdit = me.isSuperAdmin;

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; title: string; role: Role }>({ name: '', title: '', role: 'requester' });
  const [err, setErr] = useState<Record<string, string>>({});
  const [del, setDel] = useState<DemoUser | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const toggleModule = (u: DemoUser, key: ModuleKey) => {
    if (!canEdit) return;
    if (u.isSuperAdmin) { toast('Super admins always see every module.', 'info'); return; }
    const has = u.modules.includes(key);
    updateUser(u.id, { modules: has ? u.modules.filter((m) => m !== key) : [...u.modules, key] });
  };
  const toggleFlag = (u: DemoUser, flag: 'canApprove' | 'canReviewFinance' | 'isSuperAdmin') => {
    if (!canEdit) return;
    if (flag === 'isSuperAdmin' && u.isSuperAdmin && users.filter((x) => x.isSuperAdmin).length === 1) { toast('At least one super admin must remain.', 'err'); return; }
    const patch: Partial<DemoUser> = { [flag]: !u[flag] };
    if (flag === 'isSuperAdmin' && !u.isSuperAdmin) { patch.role = 'admin'; patch.canApprove = true; patch.canReviewFinance = true; }
    updateUser(u.id, patch);
  };

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const x: Record<string, string> = {};
    if (!form.name.trim()) x.name = 'Enter a fictional name (e.g. Demo Site Clerk).';
    if (!form.title.trim()) x.title = 'Enter a job title.';
    setErr(x);
    if (Object.keys(x).length) return;
    addUser({ name: form.name.trim(), title: form.title.trim(), role: form.role, modules: ['overview'], canApprove: form.role === 'manager' || form.role === 'owner', canReviewFinance: form.role === 'finance', isSuperAdmin: form.role === 'admin' });
    setAddOpen(false); setForm({ name: '', title: '', role: 'requester' });
    toast('Demo user added with Overview access. Grant modules in the matrix.');
  };

  return (
    <>
      <PageHeader kicker="Administration / Users & permissions" title="Users & permissions" subtitle="The super admin sees everything and decides which modules each person can open. Finance sees finance, HR sees HR, fleet sees fleet."
        actions={<>
          <button className="btn" onClick={() => setConfirmReset(true)} disabled={!canEdit} data-testid="reset-users"><IcoRefresh />Restore defaults</button>
          <button className="btn primary" onClick={() => { setErr({}); setAddOpen(true); }} disabled={!canEdit} data-testid="add-user"><IcoPlus />Add demo user</button>
        </>} />
      <RoleBar note="Permissions are stored in this browser only. In production this screen would sit behind real authentication and server-side authorisation." />
      {!canEdit && <div style={{ marginBottom: 18 }}><Notice tone="amber"><b>Read-only.</b> {me.name} can view the permission matrix but only a Super Admin can change it. Switch to Demo Super Admin above to edit.</Notice></div>}
      <div className="stat-grid">
        <Stat label="Demo users" value={users.length} sub="Fictional people" />
        <Stat label="Super admins" value={users.filter((u) => u.isSuperAdmin).length} sub="See and manage everything" />
        <Stat label="Approvers" value={users.filter((u) => u.canApprove).length} sub="Can approve / reject requests" />
        <Stat label="Finance reviewers" value={users.filter((u) => u.canReviewFinance).length} sub="Raise POs, mark fulfilled" />
      </div>
      <Panel title="Access matrix" meta="Tick a module to grant it. Super admins always have every module." pad>
        <div className="table-wrap">
          <table className="table matrix" data-testid="matrix">
            <thead>
              <tr>
                <th>User</th>
                {MODULES.map((m) => <th key={m.key} className="center" title={m.label}>{m.short}</th>)}
                <th className="center" title="Approve / reject requests">Approve</th>
                <th className="center" title="Raise purchase orders and mark fulfilled">Finance review</th>
                <th className="center" title="All access and permission management">Super admin</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} data-testid="user-row" className={u.id === me.id ? 'selected' : ''}>
                  <td><strong>{u.name}{u.id === me.id ? ' (you)' : ''}</strong><small>{u.title} · <Tag tone={u.isSuperAdmin ? 'gold' : 'dark'}>{ROLE_LABELS[u.role]}</Tag></small></td>
                  {MODULES.map((m) => (
                    <td key={m.key} className="center">
                      <input type="checkbox" className="matrix-check" aria-label={`${u.name}: ${m.label}`} checked={u.isSuperAdmin || u.modules.includes(m.key)} disabled={!canEdit || u.isSuperAdmin} onChange={() => toggleModule(u, m.key)} data-testid={`perm-${u.id}-${m.key}`} />
                    </td>
                  ))}
                  <td className="center"><input type="checkbox" className="matrix-check" aria-label={`${u.name}: can approve`} checked={u.canApprove} disabled={!canEdit || u.isSuperAdmin} onChange={() => toggleFlag(u, 'canApprove')} data-testid={`perm-${u.id}-approve`} /></td>
                  <td className="center"><input type="checkbox" className="matrix-check" aria-label={`${u.name}: finance review`} checked={u.canReviewFinance} disabled={!canEdit || u.isSuperAdmin} onChange={() => toggleFlag(u, 'canReviewFinance')} /></td>
                  <td className="center"><input type="checkbox" className="matrix-check" aria-label={`${u.name}: super admin`} checked={u.isSuperAdmin} disabled={!canEdit} onChange={() => toggleFlag(u, 'isSuperAdmin')} /></td>
                  <td><button className="circle-button" style={{ width: 30, height: 30 }} aria-label={`Remove ${u.name}`} disabled={!canEdit || u.id === me.id} onClick={() => setDel(u)}><IcoTrash style={{ width: 13, height: 13 }} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 14 }}>
          <Notice tone="grey">Rules in the demo: approval needs the Approve right; nobody except an owner or super admin may approve their own request; Finance review raises purchase orders and marks requests fulfilled; HR records open only for users holding the HR module; the Owner view opens only for users holding it.</Notice>
        </div>
      </Panel>

      <Modal open={addOpen} title="Add demo user" sub="Fictional person. Starts with Overview access only." onClose={() => setAddOpen(false)}>
        <form onSubmit={submitAdd} className="form-grid">
          <Field label="Name" error={err.name} className="span-2"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!err.name} data-testid="user-name" placeholder="Demo Site Clerk" /></Field>
          <Field label="Job title" error={err.title}><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-invalid={!!err.title} data-testid="user-title" /></Field>
          <Field label="Workflow role"><select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>{ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></Field>
          <div className="span-2 modal-foot"><button type="button" className="btn" onClick={() => setAddOpen(false)}>Cancel</button><button type="submit" className="btn primary" data-testid="user-save">Add user</button></div>
        </form>
      </Modal>
      <Confirm open={!!del} title={`Remove ${del?.name}?`} danger confirmLabel="Remove" onCancel={() => setDel(null)} onConfirm={() => { if (!del) return; const r = deleteUser(del.id); toast(r.ok ? 'Demo user removed.' : r.reason ?? 'Not allowed.', r.ok ? 'info' : 'err'); setDel(null); }} body="Removes the fictional user from this browser's demo data." />
      <Confirm open={confirmReset} title="Restore default users and permissions?" danger confirmLabel="Restore" onCancel={() => setConfirmReset(false)} onConfirm={() => { setConfirmReset(false); resetUsers(); }} body="Replaces the user list and every permission change with the fictional starting set and signs you in as Demo Supervisor." />
    </>
  );
}
