import { useMemo, useSyncExternalStore } from 'react';

import {
  type LiveJournalService,
  getDefaultLiveJournalService,
} from './live-journal-service.js';
import type { LiveJournalSnapshot } from './types.js';

export interface UseLiveJournalResult {
  readonly snapshot: LiveJournalSnapshot;
  readonly service: LiveJournalService;
}

/** React subscription to live journal snapshot (TJ5). */
export function useLiveJournal(service?: LiveJournalService): UseLiveJournalResult {
  const journal = useMemo(
    () => service ?? getDefaultLiveJournalService(),
    [service],
  );

  const snapshot = useSyncExternalStore(
    (onStoreChange) => journal.subscribe(onStoreChange),
    () => journal.getSnapshot(),
    () => journal.getSnapshot(),
  );

  return { snapshot, service: journal };
}
