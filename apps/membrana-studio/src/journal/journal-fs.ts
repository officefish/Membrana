import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createJournalMemoryStore } from './journal-memory';
import type {
  AppendLiveJournalReportInput,
  AppendLiveJournalTrackInput,
  LiveJournalFilter,
  LiveJournalItem,
} from './types';

export type {
  AppendLiveJournalReportInput,
  AppendLiveJournalTrackInput,
  LiveJournalFilter,
  LiveJournalItem,
} from './types';

/** Persists live journal items to disk via memory delegate (MS3). */
export class JournalFsStore {
  private readonly delegate = createJournalMemoryStore();

  private readonly itemsPath: string;

  private loaded = false;

  constructor(rootDir: string) {
    this.itemsPath = path.join(rootDir, 'items.json');
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    await mkdir(path.dirname(this.itemsPath), { recursive: true });
    try {
      const raw = await readFile(this.itemsPath, 'utf8');
      const items = JSON.parse(raw) as LiveJournalItem[];
      if (Array.isArray(items)) {
        this.delegate.restoreItems(items);
      }
    } catch {
      /* first run */
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    const items = this.delegate.listItems();
    await writeFile(this.itemsPath, JSON.stringify(items, null, 2), 'utf8');
  }

  async listItems(): Promise<readonly LiveJournalItem[]> {
    await this.ensureLoaded();
    return this.delegate.listItems();
  }

  async getItemByClientEntryId(clientEntryId: string): Promise<LiveJournalItem | null> {
    await this.ensureLoaded();
    return this.delegate.getItemByClientEntryId(clientEntryId);
  }

  async appendTrack(input: AppendLiveJournalTrackInput): Promise<LiveJournalItem | null> {
    await this.ensureLoaded();
    const item = this.delegate.appendTrack(input);
    if (item) await this.persist();
    return item;
  }

  async appendReport(input: AppendLiveJournalReportInput): Promise<LiveJournalItem | null> {
    await this.ensureLoaded();
    const item = this.delegate.appendReport(input);
    if (item) await this.persist();
    return item;
  }

  async clearByFilter(filter: LiveJournalFilter): Promise<number> {
    await this.ensureLoaded();
    const removed = this.delegate.clearByFilter(filter);
    if (removed > 0) await this.persist();
    return removed;
  }
}

export function createJournalFsStore(rootDir: string): JournalFsStore {
  return new JournalFsStore(rootDir);
}
