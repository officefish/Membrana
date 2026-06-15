import {
  readJournalLocalCache,
  writeJournalLocalCache,
} from '../journal-local-cache.js';
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
  /** Browser localStorage key for session rehydrate (TJ6). */
  readonly localCacheKey?: string;
}

/** Local cache + cabinet push/pull sync (TJ2). */
export class SyncJournalStorageBackend implements IJournalStorageBackend {
  private readonly local: MemoryJournalStorageBackend;

  private readonly port: ICabinetJournalPort;

  private readonly storageMode: LiveJournalStorageMode;

  private readonly pullLimit: number;

  private readonly localCacheKey: string | undefined;

  constructor(
    port: ICabinetJournalPort,
    options: SyncJournalStorageBackendOptions = {},
    local?: MemoryJournalStorageBackend,
  ) {
    this.port = port;
    this.local = local ?? createMemoryJournalStorageBackend();
    this.storageMode = options.storageMode ?? 'remote-server';
    this.pullLimit = options.pullLimit ?? 200;
    this.localCacheKey = options.localCacheKey;

    if (this.localCacheKey) {
      const cached = readJournalLocalCache(this.localCacheKey);
      if (cached) {
        this.local.restoreItems(cached);
      }
    }
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

    this.persistLocalCache();
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

    this.persistLocalCache();
    return item;
  }

  private persistLocalCache(): void {
    if (!this.localCacheKey) return;
    writeJournalLocalCache(this.localCacheKey, this.local.takeSnapshot());
  }

  private async pullRemote(): Promise<void> {
    try {
      const remoteItems = await this.fetchRemoteItems();
      this.local.mergeRemoteItems(remoteItems);
      this.persistLocalCache();
    } catch {
      /* keep local cache when cabinet is unreachable */
    }
  }

  private async fetchRemoteItems(): Promise<LiveJournalItem[]> {
    if (this.port.listJournalItems) {
      return [...(await this.port.listJournalItems({ limit: this.pullLimit }))];
    }
    const [reports, liveRecords] = await Promise.all([
      this.port.listReports(this.pullLimit),
      this.port.listLiveRecords(this.pullLimit),
    ]);
    return cabinetRowsToJournalItems(reports, liveRecords);
  }
}

export function createSyncJournalStorageBackend(
  port: ICabinetJournalPort,
  options?: SyncJournalStorageBackendOptions,
): SyncJournalStorageBackend {
  return new SyncJournalStorageBackend(port, options);
}
