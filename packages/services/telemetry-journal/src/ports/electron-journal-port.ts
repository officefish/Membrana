import type { IJournalStorageBackend } from './storage-backend.js';

/** Desktop shell IPC port — `electronAPI.journal` in Membrana Studio preload (MS3). */
export type IElectronJournalStoragePort = Pick<  IJournalStorageBackend,
  | 'listItems'
  | 'getItemByClientEntryId'
  | 'appendTrack'
  | 'appendReport'
  | 'clearByFilter'
>;
