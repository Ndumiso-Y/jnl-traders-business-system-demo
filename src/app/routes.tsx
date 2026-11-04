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
import FleetPage from '../modules/fleet/FleetPage';
import AssetEditor from '../modules/fleet/AssetEditor';
import ReportsPage from '../modules/reports/ReportsPage';
import PeoplePage from '../modules/people/PeoplePage';
import OwnerPage from '../modules/owner/OwnerPage';
import SettingsPage from '../modules/settings/SettingsPage';
import SearchPage from '../modules/search/SearchPage';

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
      { path: 'fleet', element: <FleetPage /> },
      { path: 'fleet/:id', element: <AssetEditor /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'people', element: <PeoplePage /> },
      { path: 'owner', element: <OwnerPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: '*', element: <Placeholder kicker="Workspace" title="Page not found" subtitle="That route does not exist in the demo." /> },
    ],
  },
];
