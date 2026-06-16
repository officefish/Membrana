import type {
  AppendLiveJournalReportInput,
  AppendLiveJournalTrackInput,
  LiveJournalFilter,
  LiveJournalItem,
} from '../types.js';
import type { IJournalStorageBackend } from '../ports/storage-backend.js';
import type { LiveJournalStorageMode } from '../types.js';
import {
  MemoryJournalStorageBackend,
  createMemoryJournalStorageBackend,
} from './memory-journal-storage-backend.js';

/** Electron FS journal backend stub (TJ2): in-memory cache until desktop port lands. */
export class ElectronJournalStorageBackend implements IJournalStorageBackend {
  private readonly delegate: MemoryJournalStorageBackend;

  constructor(delegate?: MemoryJournalStorageBackend) {
    this.delegate = delegate ?? createMemoryJournalStorageBackend({ storageMode: 'electron-fs' });
  }

  getStorageMode(): LiveJournalStorageMode {
    return 'electron-fs';
  }

  listItems(): Promise<readonly LiveJournalItem[]> {
    return this.delegate.listItems();
  }

  getItemByClientEntryId(clientEntryId: string): Promise<LiveJournalItem | null> {
    return this.delegate.getItemByClientEntryId(clientEntryId);
  }

  appendTrack(input: AppendLiveJournalTrackInput): Promise<LiveJournalItem | null> {
    return this.delegate.appendTrack(input);
  }

  appendReport(input: AppendLiveJournalReportInput): Promise<LiveJournalItem | null> {
    return this.delegate.appendReport(input);
  }

  clearByFilter(filter: LiveJournalFilter): Promise<number> {
    return this.delegate.clearByFilter(filter);
  }
}

export function createElectronJournalStorageBackend(): ElectronJournalStorageBackend {
  return new ElectronJournalStorageBackend();
}
