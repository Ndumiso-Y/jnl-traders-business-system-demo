import { describe, expect, it } from 'vitest';
import { canTransition } from '../src/store/useStore';

describe('request workflow rules (simulated roles)', () => {
  it('requester cannot approve or reject', () => {
    expect(canTransition('requester', 'submitted', 'approved', true).ok).toBe(false);
    expect(canTransition('requester', 'submitted', 'rejected', false).ok).toBe(false);
  });
  it('manager and owner can approve a submitted request they did not raise', () => {
    expect(canTransition('manager', 'submitted', 'approved', false).ok).toBe(true);
    expect(canTransition('owner', 'submitted', 'rejected', false).ok).toBe(true);
  });
  it('manager cannot approve their own request; owner can', () => {
    expect(canTransition('manager', 'submitted', 'approved', true).ok).toBe(false);
    expect(canTransition('owner', 'submitted', 'approved', true).ok).toBe(true);
  });
  it('finance does not approve submitted requests but can fulfil approved ones', () => {
    expect(canTransition('finance', 'submitted', 'approved', false).ok).toBe(false);
    expect(canTransition('finance', 'approved', 'fulfilled', false).ok).toBe(true);
  });
  it('follows the state machine', () => {
    expect(canTransition('owner', 'draft', 'approved', false).ok).toBe(false);
    expect(canTransition('requester', 'draft', 'submitted', true).ok).toBe(true);
    expect(canTransition('owner', 'fulfilled', 'draft', false).ok).toBe(false);
    expect(canTransition('requester', 'rejected', 'draft', true).ok).toBe(true);
  });
});
