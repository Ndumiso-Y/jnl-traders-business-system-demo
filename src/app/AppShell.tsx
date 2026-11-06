import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { IcoBell, IcoMenu, IcoSearch, IcoSettings } from '../components/Icons';
import { NAV } from './nav';
import { Toasts } from '../components/ui';
import { hasModule, selectCurrentUser, useStore } from '../store/useStore';
import { ROLE_LABELS } from '../store/types';

// NAV lives in nav.ts

export default function AppShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const users = useStore((s) => s.users);
  const settings = useStore((s) => s.settings);
  const signInAs = useStore((s) => s.signInAs);
  const user = selectCurrentUser({ users, settings });
  const visibleNav = NAV.filter((n) => n.modules.some((m) => hasModule(user, m)));
  const [query, setQuery] = useState('');

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const current = NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))
    ?? (location.pathname.startsWith('/settings') ? { crumb: 'Settings' } : { crumb: 'Overview' });

  const initials = user.name.replace(/^Demo\s+/, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="app">
      <a href="#main" className="sr-only">Skip to content</a>
      <div className={`drawer-backdrop ${open ? 'open' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
        <NavLink to="/" className="brand" aria-label="JNL Traders — demonstration workspace">
          <span className="brand-monogram">JNL<span>.</span></span>
          <span className="brand-sub">TRADERS</span>
        </NavLink>
        <div className="workspace-tag">BUSINESS WORKSPACE</div>
        <div className="nav-title">Workspace</div>
        <nav>
          {visibleNav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <n.icon />
              <span>{n.label}</span>
              <span className="nav-dot" />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="help-card">
          <div className="help-head">Discovery prototype</div>
          <p>Designed for review, not live operations. Records save only in this browser.</p>
          <div className="help-line"><span className="status-dot" />Fictional sample data</div>
        </div>
        <nav>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IcoSettings />
            <span>Settings &amp; demo reset</span>
          </NavLink>
        </nav>
        <div className="user-box">
          <span className="avatar">ED</span>
          <div>
            <b>Embark Digitals</b>
            <small>Prototype review</small>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <button className="circle-button menu-button" aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(true)}><IcoMenu /></button>
            <b>JNL Traders</b>
            <span aria-hidden="true">/</span>
            <span>{current.crumb}</span>
          </div>
          <div className="topbar-right">
            <span className="demo-pill" title="All records are fictional. This is a demonstration, not a production system."><span className="status-dot" />Demonstration</span>
            <form className="search-box" role="search" onSubmit={submitSearch}>
              <IcoSearch />
              <input aria-label="Search workspace" placeholder="Search workspace" value={query} onChange={(e) => setQuery(e.target.value)} />
              <kbd>↵</kbd>
            </form>
            <button className="circle-button" aria-label="Notifications (demo only)" onClick={() => navigate('/')}><IcoBell /></button>
            <label className="user-switch" title="Simulated sign-in — not real authentication">
              <span className="top-avatar" aria-hidden="true">{initials}</span>
              <span className="user-switch-text"><b>{user.name}</b><small>{user.title} · {ROLE_LABELS[user.role]}</small></span>
              <select aria-label="Signed in as (simulated user)" value={user.id} onChange={(e) => signInAs(e.target.value)} data-testid="user-switcher">
                {users.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.title}</option>)}
              </select>
            </label>
          </div>
        </header>
        <main className="content" id="main">
          <Outlet />
          <div className="footer-note">JNL Traders · Business system demonstration · All financial figures and records are fictional demonstration data · Built by Embark Digitals</div>
        </main>
      </div>
      <Toasts />
    </div>
  );
}
