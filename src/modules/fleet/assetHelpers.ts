import type { Asset, AssetStatus } from '../../store/types';

export const ASSET_STATUS: Record<AssetStatus, [string, 'green' | 'amber' | 'dark']> = { active: ['Active', 'green'], 'in-service': ['In service', 'amber'], inactive: ['Inactive', 'dark'] };

export function nextCheck(a: Asset): { date: string; kind: string } | null {
  const pairs: Array<[string, string | undefined]> = [['Service', a.serviceDue], ['Licence', a.licenceDue], ['Insurance', a.insuranceDue], ['Inspection', a.inspectionDue]];
  const list = pairs.filter((p): p is [string, string] => !!p[1]).sort((x, y) => x[1].localeCompare(y[1]));
  return list.length ? { kind: list[0][0], date: list[0][1] } : null;
}

