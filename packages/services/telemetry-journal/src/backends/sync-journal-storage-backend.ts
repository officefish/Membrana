import {
  cabinetRowsToJournalItems,
  reportInputToCabinetReport,
  trackInputToCabinetLiveRecord,
} from '../mappers/cabinet-journal-mapper.js';
import type { ICabinetJournalPort } from '../ports/cabinet-journal-port.js';
import type { IJournalStorageBackend } from '../ports/storage-backend.js';
import type {
  AppendLiveJournalReportInput,
  AppendLiveJournalTrackInput,
  LiveJournalItem,
  LiveJournalStorageMode,
} from '../types.js';
import {
  MemoryJournalStorageBackend,
  createMemoryJournalStorageBackend,
} from './memory-journal-storage-backend.js';

export interface SyncJournalStorageBackendOptions {
  readonly storageMode?: LiveJournalStorageMode;
  readonly pullLimit?: number;
}

/** Local cache + cabinet push/pull sync (TJ2). */
export class SyncJournalStorageBackend implements IJournalStorageBackend {
  private readonly local: MemoryJournalStorageBackend;

  private readonly port: ICabinetJournalPort;

  private readonly storageMode: LiveJournalStorageMode;

  private readonly pullLimit: number;

  constructor(
    port: ICabinetJournalPort,
    options: SyncJournalStorageBackendOptions = {},
    local?: MemoryJournalStorageBackend,
  ) {
    this.port = port;
    this.local = local ?? createMemoryJournalStorageBackend();
    this.storageMode = options.storageMode ?? 'remote-server';
    this.pullLimit = options.pullLimit ?? 200;
  }

  getStorageMode(): LiveJournalStorageMode {
    return this.storageMode;
  }

  async listItems(): Promise<readonly LiveJournalItem[]> {
    await this.pullRemote();
    return this.local.listItems();
  }

  async getItemByClientEntryId(clientEntryId: string): Promise<LiveJournalItem | null> {
    await this.pullRemote();
    return this.local.getItemByClientEntryId(clientEntryId);
  }

  async appendTrack(input: AppendLiveJournalTrackInput): Promise<LiveJournalItem | null> {
    const item = await this.local.appendTrack(input);
    if (!item) return null;

    try {
      await this.port.createLiveRecord(trackInputToCabinetLiveRecord(input));
    } catch {
      /* best-effort push; local cache remains source for offline UX */
    }

    return item;
  }

  async appendReport(input: AppendLiveJournalReportInput): Promise<LiveJournalItem | null> {
    const item = await this.local.appendReport(input);
    if (!item) return null;

    try {
      await this.port.createReport(reportInputToCabinetReport(input));
    } catch {
      /* best-effort push */
    }

    return item;
  }

  private async pullRemote(): Promise<void> {
    try {
      const [reports, liveRecords] = await Promise.all([
        this.port.listReports(this.pullLimit),
        this.port.listLiveRecords(this.pullLimit),
      ]);
      const remoteItems = cabinetRowsToJournalItems(reports, liveRecords);
      this.local.mergeRemoteItems(remoteItems);
    } catch {
      /* keep local cache when cabinet is unreachable */
    }
  }
}

export function createSyncJournalStorageBackend(
  port: ICabinetJournalPort,
  options?: SyncJournalStorageBackendOptions,
): SyncJournalStorageBackend {
  return new SyncJournalStorageBackend(port, options);
}
