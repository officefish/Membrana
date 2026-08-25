import { useCallback, useEffect, useRef } from 'react';

import type {
  LiveJournalRefreshMode,
  LiveJournalService,
} from '@membrana/telemetry-journal-service';

import { subscribeJournalCleared, subscribeJournalSnapshotUpdated } from '@/lib/liveJournalHub';
import { useVisibleInterval } from '@/lib/useVisibleInterval';

/** Fallback poll while journal module is mounted (JE3). Hub events drive immediate refresh. */
export const LIVE_JOURNAL_CLIENT_FALLBACK_POLL_MS = 30_000;

/** @deprecated use LIVE_JOURNAL_CLIENT_FALLBACK_POLL_MS */
export const LIVE_JOURNAL_CLIENT_REFRESH_MS = LIVE_JOURNAL_CLIENT_FALLBACK_POLL_MS;

export function refreshLiveJournalForHubEvent(
  service: LiveJournalService,
  mode: LiveJournalRefreshMode = 'incremental',
): Promise<void> {
  return service.refresh({ mode });
}

export function useLiveJournalAutoRefresh(
  service: LiveJournalService,
  enabled = true,
): void {
  const skipHubRefreshRef = useRef(false);

  const refresh = useCallback((mode: LiveJournalRefreshMode = 'incremental') => {
    skipHubRefreshRef.current = true;
    void refreshLiveJournalForHubEvent(service, mode)
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

    const unsubSnapshot = subscribeJournalSnapshotUpdated(() => {
      if (skipHubRefreshRef.current) return;
      refresh();
    });
    const unsubCleared = subscribeJournalCleared(() => {
      refresh('full-reconcile');
    });

    return () => {
      unsubSnapshot();
      unsubCleared();
    };
  }, [enabled, refresh]);

  useVisibleInterval(refresh, LIVE_JOURNAL_CLIENT_FALLBACK_POLL_MS, enabled);
}
