import type { RouteObject } from 'react-router-dom';
import AppShell from './AppShell';
import OverviewPage from '../modules/overview/OverviewPage';
import Placeholder from '../modules/Placeholder';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'finance/*', element: <Placeholder kicker="Finance / Documents" title="Quotations & invoices" subtitle="Clear documents, accurate totals and a simple path from quote to invoice." /> },
      { path: 'procurement/*', element: <Placeholder kicker="Procurement / Requests" title="Procurement requests" subtitle="Requests, approvals and purchase orders." /> },
      { path: 'ppe/*', element: <Placeholder kicker="Procurement / PPE" title="PPE requests" subtitle="Personal protective equipment requests and approvals." /> },
      { path: 'fleet/*', element: <Placeholder kicker="Operations / Asset control" title="Fleet & equipment" subtitle="Keep assets organised, maintenance visible and important renewals on time." /> },
      { path: 'reports/*', element: <Placeholder kicker="Finance / Reports" title="Reports" subtitle="Monthly aggregates driven by the demo records." /> },
      { path: 'people/*', element: <Placeholder kicker="People / HR & Safety" title="People & safety" subtitle="Hiring, disciplinary and safety registers." /> },
      { path: 'owner/*', element: <Placeholder kicker="Private / Owner oversight" title="Owner view" subtitle="Summary for the owner — simulated restriction only." /> },
      { path: 'settings', element: <Placeholder kicker="Workspace / Settings" title="Settings & demo reset" subtitle="VAT default, simulated role and demo data reset." /> },
      { path: 'search', element: <Placeholder kicker="Workspace / Search" title="Search" subtitle="Workspace search across records." /> },
      { path: '*', element: <Placeholder kicker="Workspace" title="Page not found" subtitle="That route does not exist in the demo." /> },
    ],
  },
];
