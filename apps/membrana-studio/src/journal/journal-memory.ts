import type {
  AppendLiveJournalReportInput,
  AppendLiveJournalTrackInput,
  LiveJournalFilter,
  LiveJournalItem,
} from './types';

const MAX_ITEMS = 500;
const TRACK_TAGS = ['live', 'track'] as const;
const REPORT_TAGS = ['live', 'report', 'analysis'] as const;
const DETECTION_TAG = 'detection';
const CLEAR_TAG = 'clear';

function createItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function matchesFilter(item: LiveJournalItem, filter: LiveJournalFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'tracks':
      return item.kind === 'track';
    case 'reports':
      return item.kind === 'report';
    case 'detections':
      return item.kind === 'report' && item.report?.isDetected === true;
    default:
      return false;
  }
}

/** In-memory journal delegate for Electron main (MS3). */
export class JournalMemoryStore {
  private items: LiveJournalItem[] = [];

  private readonly clientEntryIds = new Set<string>();

  listItems(): readonly LiveJournalItem[] {
    return [...this.items];
  }

  getItemByClientEntryId(clientEntryId: string): LiveJournalItem | null {
    return this.items.find((item) => item.clientEntryId === clientEntryId) ?? null;
  }

  appendTrack(input: AppendLiveJournalTrackInput): LiveJournalItem | null {
    if (this.clientEntryIds.has(input.clientEntryId)) return null;

    const item: LiveJournalItem = {
      id: createItemId(),
      kind: 'track',
      timestamp: input.timestamp ?? Date.now(),
      clientEntryId: input.clientEntryId,
      moduleId: input.moduleId,
      moduleName: input.moduleName,
      tags: [...TRACK_TAGS, ...(input.tags ?? [])],
      track: input.track,
    };

    this.pushItem(item);
    return item;
  }

  appendReport(input: AppendLiveJournalReportInput): LiveJournalItem | null {
    if (this.clientEntryIds.has(input.clientEntryId)) return null;

    const tags = [...REPORT_TAGS, ...(input.tags ?? [])];
    tags.push(input.report.isDetected ? DETECTION_TAG : CLEAR_TAG);

    const item: LiveJournalItem = {
      id: createItemId(),
      kind: 'report',
      timestamp: input.timestamp ?? Date.now(),
      clientEntryId: input.clientEntryId,
      moduleId: input.moduleId,
      moduleName: input.moduleName,
      tags,
      report: input.report,
    };

    this.pushItem(item);
    return item;
  }

  clearByFilter(filter: LiveJournalFilter): number {
    const remaining: LiveJournalItem[] = [];
    let deleted = 0;
    for (const item of this.items) {
      if (matchesFilter(item, filter)) {
        this.clientEntryIds.delete(item.clientEntryId);
        deleted += 1;
      } else {
        remaining.push(item);
      }
    }
    this.items = remaining;
    return deleted;
  }

  restoreItems(items: readonly LiveJournalItem[]): void {
    this.items = [];
    this.clientEntryIds.clear();
    for (const item of items) {
      if (this.clientEntryIds.has(item.clientEntryId)) continue;
      this.clientEntryIds.add(item.clientEntryId);
      this.items.push(item);
    }
    this.items.sort((a, b) => b.timestamp - a.timestamp);
    this.trimOverflow();
  }

  private pushItem(item: LiveJournalItem): void {
    this.clientEntryIds.add(item.clientEntryId);
    this.items.unshift(item);
    this.trimOverflow();
  }

  private trimOverflow(): void {
    if (this.items.length <= MAX_ITEMS) return;
    const removed = this.items.splice(MAX_ITEMS);
    for (const stale of removed) {
      this.clientEntryIds.delete(stale.clientEntryId);
    }
  }
}

export function createJournalMemoryStore(): JournalMemoryStore {
  return new JournalMemoryStore();
}

export function liveJournalTrackClientEntryId(trackId: string): string {
  return `live-track-${trackId}`;
}
