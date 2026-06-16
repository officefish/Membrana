import { useCallback, useEffect, useRef } from 'react';

import type { LiveJournalService } from '@membrana/telemetry-journal-service';

import { subscribeJournalSnapshotUpdated } from '@/lib/liveJournalHub';
import { useVisibleInterval } from '@/lib/useVisibleInterval';

/** Fallback poll while journal module is mounted (JE3). Hub events drive immediate refresh. */
export const LIVE_JOURNAL_CLIENT_FALLBACK_POLL_MS = 30_000;

/** @deprecated use LIVE_JOURNAL_CLIENT_FALLBACK_POLL_MS */
export const LIVE_JOURNAL_CLIENT_REFRESH_MS = LIVE_JOURNAL_CLIENT_FALLBACK_POLL_MS;

export function useLiveJournalAutoRefresh(
  service: LiveJournalService,
  enabled = true,
): void {
  const skipHubRefreshRef = useRef(false);

  const refresh = useCallback(() => {
    skipHubRefreshRef.current = true;
    void service
      .refresh()
      .catch((err) => {
        console.error('[useLiveJournalAutoRefresh] refresh failed', err);
      })
      .finally(() => {
        queueMicrotask(() => {
          skipHubRefreshRef.current = false;
        });
      });
  }, [service]);

  useEffect(() => {
    if (!enabled) return undefined;

    return subscribeJournalSnapshotUpdated(() => {
      if (skipHubRefreshRef.current) return;
      refresh();
    });
  }, [enabled, refresh]);

  useVisibleInterval(refresh, LIVE_JOURNAL_CLIENT_FALLBACK_POLL_MS, enabled);
}
