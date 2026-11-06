import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IcoLock } from './Icons';
import { PageHeader, Panel } from './ui';
import RoleBar from './RoleBar';
import { hasModule, selectCurrentUser, useStore } from '../store/useStore';
import { MODULES, type ModuleKey } from '../store/types';

/** Renders children only when the signed-in demo user holds one of the listed modules. */
export default function RequireModule({ anyOf, children }: { anyOf: ModuleKey[]; children: ReactNode }) {
  const users = useStore((s) => s.users);
  const settings = useStore((s) => s.settings);
  const user = selectCurrentUser({ users, settings });
  if (anyOf.some((m) => hasModule(user, m))) return <>{children}</>;
  const names = anyOf.map((m) => MODULES.find((x) => x.key === m)?.label ?? m).join(' / ');
  return (
    <>
      <PageHeader kicker="Workspace / Access" title="No access to this module" subtitle={`${user.name} (${user.title}) has not been granted ${names}.`} />
      <RoleBar />
      <Panel>
        <div className="empty" data-testid="no-access">
          <IcoLock style={{ width: 28, height: 28, color: 'var(--gold)' }} />
          <b style={{ marginTop: 10 }}>Access is granted by the Super Admin</b>
          In the full system the owner or administrator decides which modules each person can see. In this demonstration the restriction is simulated in the browser only.
          <div style={{ marginTop: 14 }} className="btns">
            <Link className="btn" to="/">Back to overview</Link>
            {hasModule(user, 'admin') && <Link className="btn primary" to="/admin">Open Users &amp; permissions</Link>}
          </div>
        </div>
      </Panel>
    </>
  );
}
