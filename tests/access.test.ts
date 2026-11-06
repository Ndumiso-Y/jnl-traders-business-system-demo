import { describe, expect, it } from 'vitest';
import { actorForUser, canTransition, hasModule, selectCurrentUser } from '../src/store/useStore';
import { seedUsers } from '../src/store/seed';
import type { DemoUser } from '../src/store/types';

const users = seedUsers();
const byId = (id: string) => users.find((u) => u.id === id)!;

describe('module access (simulated)', () => {
  it('super admin sees every module without explicit grants', () => {
    const admin = { ...byId('u_admin'), modules: [] as DemoUser['modules'] };
    expect(hasModule(admin, 'finance')).toBe(true);
    expect(hasModule(admin, 'admin')).toBe(true);
  });
  it('finance sees finance but not HR or fleet; HR sees HR but not finance', () => {
    const fin = byId('u_finance');
    expect(hasModule(fin, 'finance')).toBe(true);
    expect(hasModule(fin, 'hr')).toBe(false);
    expect(hasModule(fin, 'fleet')).toBe(false);
    const hr = byId('u_hr');
    expect(hasModule(hr, 'hr')).toBe(true);
    expect(hasModule(hr, 'finance')).toBe(false);
    const fleet = byId('u_fleet');
    expect(hasModule(fleet, 'fleet')).toBe(true);
    expect(hasModule(fleet, 'finance')).toBe(false);
  });
  it('owner holds every module except permission management', () => {
    const owner = byId('u_owner');
    expect(hasModule(owner, 'owner')).toBe(true);
    expect(hasModule(owner, 'admin')).toBe(false);
  });
  it('granting a module changes access', () => {
    const fin = byId('u_finance');
    expect(hasModule({ ...fin, modules: [...fin.modules, 'fleet'] }, 'fleet')).toBe(true);
  });
  it('falls back to the first user when the current id is stale', () => {
    expect(selectCurrentUser({ users, settings: { currentUserId: 'missing' } as never }).id).toBe(users[0].id);
  });
});

describe('workflow rights derived from users', () => {
  it('requester and HR officer cannot approve; supervisor and owner can', () => {
    expect(canTransition(actorForUser(byId('u_requester')), 'submitted', 'approved', false).ok).toBe(false);
    expect(canTransition(actorForUser(byId('u_hr')), 'submitted', 'approved', false).ok).toBe(false);
    expect(canTransition(actorForUser(byId('u_supervisor')), 'submitted', 'approved', false).ok).toBe(true);
    expect(canTransition(actorForUser(byId('u_owner')), 'submitted', 'rejected', false).ok).toBe(true);
  });
  it('supervisor cannot approve own request; owner and super admin can', () => {
    expect(canTransition(actorForUser(byId('u_supervisor')), 'submitted', 'approved', true).ok).toBe(false);
    expect(canTransition(actorForUser(byId('u_owner')), 'submitted', 'approved', true).ok).toBe(true);
    expect(canTransition(actorForUser(byId('u_admin')), 'submitted', 'approved', true).ok).toBe(true);
  });
  it('finance clerk fulfils but does not approve; revoking finance review removes fulfilment', () => {
    const fin = byId('u_finance');
    expect(canTransition(actorForUser(fin), 'submitted', 'approved', false).ok).toBe(false);
    expect(canTransition(actorForUser(fin), 'approved', 'fulfilled', false).ok).toBe(true);
    expect(canTransition(actorForUser({ ...fin, canReviewFinance: false }), 'approved', 'fulfilled', false).ok).toBe(false);
  });
});
