import { useStore } from '../store/useStore';
import { ROLE_LABELS, type Role } from '../store/types';

const ROLES: Role[] = ['requester', 'manager', 'finance', 'owner'];

/** Simulated role switcher. This is a frontend simulation only — not real authentication. */
export default function RoleBar({ note }: { note?: string }) {
  const role = useStore((s) => s.settings.role);
  const setRole = useStore((s) => s.setRole);
  return (
    <div className="role-bar" data-testid="role-bar">
      <span className="label">Viewing as</span>
      <div className="segmented" role="group" aria-label="Simulated role">
        {ROLES.map((r) => (
          <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)} data-testid={`role-${r}`}>{ROLE_LABELS[r]}</button>
        ))}
      </div>
      <span className="warn">{note ?? 'Role access is simulated in the browser for demonstration only. A public static demo cannot enforce real permissions.'}</span>
    </div>
  );
}
