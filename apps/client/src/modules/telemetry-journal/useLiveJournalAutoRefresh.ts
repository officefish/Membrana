import { useCallback } from 'react';

import type { LiveJournalService } from '@membrana/telemetry-journal-service';

import { useVisibleInterval } from '@/lib/useVisibleInterval';

/** Client live journal: poll while module is mounted and tab visible (TJ7). */
export const LIVE_JOURNAL_CLIENT_REFRESH_MS = 5_000;

export function useLiveJournalAutoRefresh(
  service: LiveJournalService,
  enabled = true,
): void {
  const refresh = useCallback(() => {
    void service.refresh().catch((err) => {
      console.error('[useLiveJournalAutoRefresh] refresh failed', err);
    });
  }, [service]);

  useVisibleInterval(refresh, LIVE_JOURNAL_CLIENT_REFRESH_MS, enabled);
}
