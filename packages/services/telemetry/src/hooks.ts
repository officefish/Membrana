import { useMemo, useSyncExternalStore } from 'react';

import {
  type TelemetryJournal,
  getDefaultTelemetryJournal,
} from './service.js';
import type { TelemetryJournalSnapshot } from './types.js';

export interface UseTelemetryJournalResult {
  snapshot: TelemetryJournalSnapshot;
  journal: TelemetryJournal;
}

/**
 * Подписка на снимок журнала для React 18 (`useSyncExternalStore`).
 * Передавайте стабильный `journal` (например из `useMemo(() => createTelemetryJournal(), [])`),
 * иначе будет создаваться новый инстанс на каждый рендер.
 */
export function useTelemetryJournal(
  journal?: TelemetryJournal,
): UseTelemetryJournalResult {
  const j = useMemo(
    () => journal ?? getDefaultTelemetryJournal(),
    [journal],
  );

  const snapshot = useSyncExternalStore(
    (onStoreChange) => j.subscribe(onStoreChange),
    () => j.getSnapshot(),
    () => j.getSnapshot(),
  );

  return { snapshot, journal: j };
}
