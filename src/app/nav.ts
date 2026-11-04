import { IcoBag, IcoChart, IcoDoc, IcoHome, IcoLock, IcoShield, IcoTruck, IcoUsers } from '../components/Icons';

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
