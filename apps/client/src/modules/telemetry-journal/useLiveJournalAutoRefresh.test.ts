import { describe, expect, it } from 'vitest';

import {
  LIVE_JOURNAL_CLIENT_FALLBACK_POLL_MS,
  LIVE_JOURNAL_CLIENT_REFRESH_MS,
} from './useLiveJournalAutoRefresh';

describe('useLiveJournalAutoRefresh', () => {
  it('uses 30 s fallback poll interval (JE3)', () => {
    expect(LIVE_JOURNAL_CLIENT_FALLBACK_POLL_MS).toBe(30_000);
    expect(LIVE_JOURNAL_CLIENT_REFRESH_MS).toBe(30_000);
  });
});
