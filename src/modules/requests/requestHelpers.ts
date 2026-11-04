import type { TagTone } from '../../components/ui';
import { toCents } from '../../lib/money';
import type { Request, RequestStatus } from '../../store/types';

export const REQ_STATUS: Record<RequestStatus, [string, TagTone]> = {
  draft: ['Draft', 'dark'], submitted: ['Awaiting review', 'amber'], approved: ['Approved', 'green'], rejected: ['Rejected', 'red'], fulfilled: ['Fulfilled', 'blue'],
};

export function requestEstimate(r: Request): number {
  return r.items.reduce((s, it) => s + toCents((Number.isFinite(it.qty) ? it.qty : 0) * (Number.isFinite(it.estUnitCost) ? it.estUnitCost : 0)), 0);
}

