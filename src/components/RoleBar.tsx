import { useStore, selectCurrentUser } from '../store/useStore';
import { ROLE_LABELS } from '../store/types';

/**
 * "Signed in as" bar. Switches the simulated demo user. This is a frontend
 * simulation only — a public static demo has no real authentication.
 */
export default function RoleBar({ note }: { note?: string }) {
  const users = useStore((s) => s.users);
  const settings = useStore((s) => s.settings);
  const signInAs = useStore((s) => s.signInAs);
  const user = selectCurrentUser({ users, settings });
  return (
    <div className="role-bar" data-testid="role-bar">
      <span className="label">Signed in as</span>
      <select className="select sm" style={{ width: 'auto', minWidth: 230 }} value={user.id} onChange={(e) => signInAs(e.target.value)} aria-label="Switch simulated user" data-testid="user-switcher-inline">
        {users.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.title}</option>)}
      </select>
      <span className="tag gold">{ROLE_LABELS[user.role]}{user.canApprove ? ' · approver' : ''}{user.isSuperAdmin ? ' · all access' : ''}</span>
      <span className="warn">{note ?? 'Users and permissions are simulated in the browser for demonstration only. A public static demo cannot enforce real access control.'}</span>
    </div>
  );
}
