import type { IElectronJournalStoragePort } from '@membrana/telemetry-journal-service';

/** Desktop preload journal port when running inside Membrana Studio (MS3). */
export function getElectronJournalPort(): IElectronJournalStoragePort | null {
  if (typeof window === 'undefined') return null;
  const port = window.electronAPI?.journal;
  if (!port) return null;
  return port;
}
