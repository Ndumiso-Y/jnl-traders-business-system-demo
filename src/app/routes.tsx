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
import UsersPage from '../modules/admin/UsersPage';
import RequireModule from '../components/RequireModule';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <RequireModule anyOf={['overview']}><OverviewPage /></RequireModule> },
      {
        path: 'finance',
        element: <RequireModule anyOf={['finance']}><FinanceLayout /></RequireModule>,
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
      { path: 'procurement', element: <RequireModule anyOf={['procurement']}><RequestsList kind="procurement" /></RequireModule> },
      { path: 'procurement/requests/:id', element: <RequireModule anyOf={['procurement']}><RequestEditor kind="procurement" /></RequireModule> },
      { path: 'procurement/orders', element: <RequireModule anyOf={['procurement']}><PurchaseOrdersPage /></RequireModule> },
      { path: 'ppe', element: <RequireModule anyOf={['ppe']}><RequestsList kind="ppe" /></RequireModule> },
      { path: 'ppe/requests/:id', element: <RequireModule anyOf={['ppe']}><RequestEditor kind="ppe" /></RequireModule> },
      { path: 'fleet', element: <RequireModule anyOf={['fleet']}><FleetPage /></RequireModule> },
      { path: 'fleet/:id', element: <RequireModule anyOf={['fleet']}><AssetEditor /></RequireModule> },
      { path: 'reports', element: <RequireModule anyOf={['reports']}><ReportsPage /></RequireModule> },
      { path: 'people', element: <RequireModule anyOf={['hr', 'safety']}><PeoplePage /></RequireModule> },
      { path: 'owner', element: <RequireModule anyOf={['owner']}><OwnerPage /></RequireModule> },
      { path: 'admin', element: <RequireModule anyOf={['admin']}><UsersPage /></RequireModule> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: '*', element: <Placeholder kicker="Workspace" title="Page not found" subtitle="That route does not exist in the demo." /> },
    ],
  },
];
