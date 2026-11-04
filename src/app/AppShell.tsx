import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { IcoBag, IcoBell, IcoChart, IcoDoc, IcoHome, IcoLock, IcoMenu, IcoSearch, IcoSettings, IcoShield, IcoTruck, IcoUsers } from '../components/Icons';
import { Toasts } from '../components/ui';
import { useStore } from '../store/useStore';
import { ROLE_LABELS } from '../store/types';

export const NAV = [
  { to: '/', label: 'Overview', icon: IcoHome, crumb: 'Overview', end: true },
  { to: '/finance', label: 'Finance', icon: IcoDoc, crumb: 'Finance' },
  { to: '/procurement', label: 'Procurement', icon: IcoBag, crumb: 'Procurement' },
  { to: '/ppe', label: 'PPE Requests', icon: IcoShield, crumb: 'PPE requests' },
  { to: '/fleet', label: 'Fleet & Equipment', icon: IcoTruck, crumb: 'Fleet' },
  { to: '/reports', label: 'Reports', icon: IcoChart, crumb: 'Reports' },
  { to: '/people', label: 'People & Safety', icon: IcoUsers, crumb: 'People & Safety' },
  { to: '/owner', label: 'Owner view', icon: IcoLock, crumb: 'Owner view' },
];

export default function AppShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const role = useStore((s) => s.settings.role);
  const [query, setQuery] = useState('');

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const current = NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))
    ?? (location.pathname.startsWith('/settings') ? { crumb: 'Settings' } : { crumb: 'Overview' });

  const initials = ROLE_LABELS[role].slice(0, 2).toUpperCase();

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
          {NAV.map((n) => (
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
            <NavLink to="/settings" className="top-avatar" aria-label={`Current simulated role: ${ROLE_LABELS[role]}. Open settings.`}>{initials}</NavLink>
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
