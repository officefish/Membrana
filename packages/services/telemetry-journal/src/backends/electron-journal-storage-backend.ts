import type {
  AppendLiveJournalReportInput,
  AppendLiveJournalTrackInput,
  LiveJournalFilter,
  LiveJournalItem,
} from '../types.js';
import type { IJournalStorageBackend } from '../ports/storage-backend.js';
import type { LiveJournalStorageMode } from '../types.js';
import type { IElectronJournalStoragePort } from '../ports/electron-journal-port.js';
import {
  MemoryJournalStorageBackend,
  createMemoryJournalStorageBackend,
} from './memory-journal-storage-backend.js';

class ElectronJournalPortAdapter implements IJournalStorageBackend {
  constructor(private readonly port: IElectronJournalStoragePort) {}

  getStorageMode(): LiveJournalStorageMode {
    return 'electron-fs';
  }

  listItems(): Promise<readonly LiveJournalItem[]> {
    return this.port.listItems();
  }

  getItemByClientEntryId(clientEntryId: string): Promise<LiveJournalItem | null> {
    return this.port.getItemByClientEntryId(clientEntryId);
  }

  appendTrack(input: AppendLiveJournalTrackInput): Promise<LiveJournalItem | null> {
    return this.port.appendTrack(input);
  }

  appendReport(input: AppendLiveJournalReportInput): Promise<LiveJournalItem | null> {
    return this.port.appendReport(input);
  }

  clearByFilter(filter: LiveJournalFilter): Promise<number> {
    return this.port.clearByFilter(filter);
  }
}

/** Electron journal: IPC port when provided, in-memory fallback for tests (MS3). */
export class ElectronJournalStorageBackend implements IJournalStorageBackend {
  private readonly delegate: IJournalStorageBackend;

  constructor(delegate?: IJournalStorageBackend | IElectronJournalStoragePort) {
    if (delegate && 'getStorageMode' in delegate) {
      this.delegate = delegate;
    } else if (delegate) {
      this.delegate = new ElectronJournalPortAdapter(delegate);
    } else {
      this.delegate = createMemoryJournalStorageBackend({ storageMode: 'electron-fs' });
    }
  }

  getStorageMode(): LiveJournalStorageMode {
    return this.delegate.getStorageMode();
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

export function createElectronJournalStorageBackend(
  port?: IElectronJournalStoragePort | MemoryJournalStorageBackend,
): ElectronJournalStorageBackend {
  return new ElectronJournalStorageBackend(port);
}
