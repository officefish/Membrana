import { describe, expect, it } from 'vitest';
import {
  NodeAccessKeyDuration,
  computeAccessKeyExpiresAt,
  isAccessKeyActive,
} from './node-access-key-duration';

describe('computeAccessKeyExpiresAt', () => {
  const base = new Date('2026-06-13T12:00:00.000Z');

  it('hours_4 adds 4 hours', () => {
    const expires = computeAccessKeyExpiresAt(NodeAccessKeyDuration.hours_4, base);
    expect(expires.toISOString()).toBe('2026-06-13T16:00:00.000Z');
  });

  it('days_3 adds 3 days', () => {
    const expires = computeAccessKeyExpiresAt(NodeAccessKeyDuration.days_3, base);
    expect(expires.toISOString()).toBe('2026-06-16T12:00:00.000Z');
  });

  it('weeks_2 adds 14 days', () => {
    const expires = computeAccessKeyExpiresAt(NodeAccessKeyDuration.weeks_2, base);
    expect(expires.toISOString()).toBe('2026-06-27T12:00:00.000Z');
  });

  it('month_1 adds one calendar month', () => {
    const expires = computeAccessKeyExpiresAt(NodeAccessKeyDuration.month_1, base);
    expect(expires.toISOString()).toBe('2026-07-13T12:00:00.000Z');
  });

  it('months_3 adds three calendar months', () => {
    const expires = computeAccessKeyExpiresAt(NodeAccessKeyDuration.months_3, base);
    expect(expires.toISOString()).toBe('2026-09-13T12:00:00.000Z');
  });
});

describe('isAccessKeyActive', () => {
  const now = new Date('2026-06-13T12:00:00.000Z');

  it('active when not revoked and not expired', () => {
    expect(isAccessKeyActive(new Date('2026-06-14T12:00:00.000Z'), null, now)).toBe(true);
  });

  it('inactive when revoked', () => {
    expect(
      isAccessKeyActive(new Date('2026-06-14T12:00:00.000Z'), new Date('2026-06-13T11:00:00.000Z'), now),
    ).toBe(false);
  });

  it('inactive when expired', () => {
    expect(isAccessKeyActive(new Date('2026-06-12T12:00:00.000Z'), null, now)).toBe(false);
  });
});
