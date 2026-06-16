import {
  readJournalLocalCache,
  writeJournalLocalCache,
} from '../journal-local-cache.js';
import {
  cabinetRowsToJournalItems,
  reportInputToCabinetReport,
  trackInputToCabinetLiveRecord,
} from '../mappers/cabinet-journal-mapper.js';
import { LIVE_JOURNAL_PAGE_SIZE } from '../pagination.js';
import type {
  ICabinetJournalPort,
  PaginatedCabinetJournalItems,
} from '../ports/cabinet-journal-port.js';
import type { IJournalStorageBackend } from '../ports/storage-backend.js';
import type {
  AppendLiveJournalReportInput,
  AppendLiveJournalTrackInput,
  LiveJournalFilter,
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
  /** Paired media device id for scoped remote deletes (JE5). */
  readonly mediaDeviceId?: string;
}

/** Local cache + cabinet push/pull sync (TJ2). */
export class SyncJournalStorageBackend implements IJournalStorageBackend {
  private readonly local: MemoryJournalStorageBackend;

  private readonly port: ICabinetJournalPort;

  private readonly storageMode: LiveJournalStorageMode;

  private readonly pullLimit: number;

  private readonly localCacheKey: string | undefined;

  private readonly mediaDeviceId: string | undefined;

  private readonly pendingPushEntryIds = new Set<string>();

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
    this.mediaDeviceId = options.mediaDeviceId;

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

    this.pendingPushEntryIds.add(input.clientEntryId);
    try {
      await this.port.createLiveRecord(trackInputToCabinetLiveRecord(input));
      this.pendingPushEntryIds.delete(input.clientEntryId);
    } catch {
      /* best-effort push; local cache remains source for offline UX */
    }

    this.persistLocalCache();
    return item;
  }

  async appendReport(input: AppendLiveJournalReportInput): Promise<LiveJournalItem | null> {
    const item = await this.local.appendReport(input);
    if (!item) return null;

    this.pendingPushEntryIds.add(input.clientEntryId);
    try {
      await this.port.createReport(reportInputToCabinetReport(input));
      this.pendingPushEntryIds.delete(input.clientEntryId);
    } catch {
      /* best-effort push */
    }

    this.persistLocalCache();
    return item;
  }

  async clearByFilter(filter: LiveJournalFilter): Promise<number> {
    if (this.port.deleteJournalItems) {
      try {
        await this.port.deleteJournalItems({
          filter,
          mediaDeviceId: this.mediaDeviceId,
        });
      } catch {
        /* local clear still runs when cabinet is unreachable */
      }
    }

    const deleted = await this.local.clearByFilter(filter);
    this.persistLocalCache();
    return deleted;
  }

  private persistLocalCache(): void {
    if (!this.localCacheKey) return;
    writeJournalLocalCache(this.localCacheKey, this.local.takeSnapshot());
  }

  private async pullRemote(): Promise<void> {
    try {
      if (this.port.listJournalItems) {
        const remoteItems = await this.fetchRemoteItemsFromUnifiedApi();
        this.local.reconcileRemoteItems(remoteItems, this.pendingPushEntryIds);
      } else {
        const remoteItems = await this.fetchRemoteItemsFromLegacyLists();
        this.local.mergeRemoteItems(remoteItems);
      }
      this.persistLocalCache();
    } catch {
      /* keep local cache when cabinet is unreachable */
    }
  }

  private async fetchRemoteItemsFromUnifiedApi(): Promise<LiveJournalItem[]> {
    const all: LiveJournalItem[] = [];
    let cursor: string | null = null;
    do {
      const result = await this.port.listJournalItems!({
        limit: LIVE_JOURNAL_PAGE_SIZE,
        mediaDeviceId: this.mediaDeviceId,
        cursor,
        filter: 'all',
      });
      const page = isPaginatedCabinetJournalItems(result)
        ? result
        : { items: result, nextCursor: null, counts: undefined };
      all.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    return all;
  }

  private async fetchRemoteItemsFromLegacyLists(): Promise<LiveJournalItem[]> {
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

function isPaginatedCabinetJournalItems(
  result: readonly LiveJournalItem[] | PaginatedCabinetJournalItems,
): result is PaginatedCabinetJournalItems {
  return !Array.isArray(result);
}
