import { describe, expect, it, vi } from 'vitest';

import {
  LIVE_JOURNAL_CLIENT_FALLBACK_POLL_MS,
  LIVE_JOURNAL_CLIENT_REFRESH_MS,
  refreshLiveJournalForHubEvent,
} from './useLiveJournalAutoRefresh';

describe('useLiveJournalAutoRefresh', () => {
  it('uses 30 s fallback poll interval (JE3)', () => {
    expect(LIVE_JOURNAL_CLIENT_FALLBACK_POLL_MS).toBe(30_000);
    expect(LIVE_JOURNAL_CLIENT_REFRESH_MS).toBe(30_000);
  });

  it('names server-delete reconciliation instead of relying on incremental since (#2131)', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);

    await refreshLiveJournalForHubEvent({ refresh } as never, 'full-reconcile');

    expect(refresh).toHaveBeenCalledWith({ mode: 'full-reconcile' });
  });
});
