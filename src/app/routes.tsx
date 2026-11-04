import { Navigate, type RouteObject } from 'react-router-dom';
import AppShell from './AppShell';
import OverviewPage from '../modules/overview/OverviewPage';
import Placeholder from '../modules/Placeholder';
import FinanceLayout from '../modules/finance/FinanceLayout';
import QuotationsList from '../modules/finance/QuotationsList';
import InvoicesList from '../modules/finance/InvoicesList';
import DocumentEditor from '../modules/finance/DocumentEditor';
import StatementsPage from '../modules/finance/StatementsPage';
import CustomersPage from '../modules/finance/CustomersPage';
import RequestsList from '../modules/requests/RequestsList';
import RequestEditor from '../modules/requests/RequestEditor';
import PurchaseOrdersPage from '../modules/requests/PurchaseOrdersPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <OverviewPage /> },
      {
        path: 'finance',
        element: <FinanceLayout />,
        children: [
          { index: true, element: <Navigate to="/finance/quotations" replace /> },
          { path: 'quotations', element: <QuotationsList /> },
          { path: 'quotations/:id', element: <DocumentEditor kind="quotation" /> },
          { path: 'invoices', element: <InvoicesList /> },
          { path: 'invoices/:id', element: <DocumentEditor kind="invoice" /> },
          { path: 'statements', element: <StatementsPage /> },
          { path: 'customers', element: <CustomersPage /> },
        ],
      },
      { path: 'procurement', element: <RequestsList kind="procurement" /> },
      { path: 'procurement/requests/:id', element: <RequestEditor kind="procurement" /> },
      { path: 'procurement/orders', element: <PurchaseOrdersPage /> },
      { path: 'ppe', element: <RequestsList kind="ppe" /> },
      { path: 'ppe/requests/:id', element: <RequestEditor kind="ppe" /> },
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
