import { NavLink, Outlet, useLocation } from 'react-router-dom';

const TABS = [
  { to: '/finance/quotations', label: 'Quotations' },
  { to: '/finance/invoices', label: 'Invoices' },
  { to: '/finance/statements', label: 'Statements' },
  { to: '/finance/customers', label: 'Customers' },
];

export default function FinanceLayout() {
  const { pathname } = useLocation();
  const inEditor = /\/finance\/(quotations|invoices)\/[^/]+$/.test(pathname);
  return (
    <>
      {!inEditor && (
        <nav className="tabs" aria-label="Finance sections">
          {TABS.map((t) => <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? 'active' : '')}>{t.label}</NavLink>)}
        </nav>
      )}
      <Outlet />
    </>
  );
}
