import { describe, expect, it } from 'vitest';
import { nightHuntWeekKey } from './night-hunt-week.util';

describe('nightHuntWeekKey', () => {
  it('formats week for mid-year date', () => {
    expect(nightHuntWeekKey(new Date('2026-06-25T12:00:00Z'))).toMatch(/^2026-\d{2}$/);
  });

  it('is stable for same UTC day', () => {
    const a = nightHuntWeekKey(new Date('2026-01-05T00:00:00Z'));
    const b = nightHuntWeekKey(new Date('2026-01-05T23:59:00Z'));
    expect(a).toBe(b);
  });
});
