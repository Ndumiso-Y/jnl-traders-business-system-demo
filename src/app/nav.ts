import { IcoBag, IcoChart, IcoDoc, IcoHome, IcoKey, IcoLock, IcoShield, IcoTruck, IcoUsers } from '../components/Icons';
import type { ModuleKey } from '../store/types';

export type NavItem = { to: string; label: string; icon: typeof IcoHome; crumb: string; end?: boolean; modules: ModuleKey[] };

export const NAV: NavItem[] = [
  { to: '/', label: 'Overview', icon: IcoHome, crumb: 'Overview', end: true, modules: ['overview'] },
  { to: '/finance', label: 'Finance', icon: IcoDoc, crumb: 'Finance', modules: ['finance'] },
  { to: '/procurement', label: 'Procurement', icon: IcoBag, crumb: 'Procurement', modules: ['procurement'] },
  { to: '/ppe', label: 'PPE Requests', icon: IcoShield, crumb: 'PPE requests', modules: ['ppe'] },
  { to: '/fleet', label: 'Fleet & Equipment', icon: IcoTruck, crumb: 'Fleet', modules: ['fleet'] },
  { to: '/reports', label: 'Reports', icon: IcoChart, crumb: 'Reports', modules: ['reports'] },
  { to: '/people', label: 'People & Safety', icon: IcoUsers, crumb: 'People & Safety', modules: ['hr', 'safety'] },
  { to: '/owner', label: 'Owner view', icon: IcoLock, crumb: 'Owner view', modules: ['owner'] },
  { to: '/admin', label: 'Users & permissions', icon: IcoKey, crumb: 'Users & permissions', modules: ['admin'] },
];
