import { ValidationError } from '@membrana/core';

import {
  DEFAULT_LIVE_JOURNAL_CONFIG,
  LIVE_JOURNAL_CLEAR_TAG,
  LIVE_JOURNAL_DETECTION_TAG,
  LIVE_JOURNAL_REPORT_TAGS,
  LIVE_JOURNAL_TRACK_TAGS,
  type LiveJournalConfig,
} from '../constants.js';
import type { IJournalStorageBackend } from '../ports/storage-backend.js';
import type {
  AppendLiveJournalReportInput,
  AppendLiveJournalTrackInput,
  LiveJournalItem,
  LiveJournalStorageMode,
} from '../types.js';

function createItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function buildTrackTags(extra?: readonly string[]): string[] {
  return [...LIVE_JOURNAL_TRACK_TAGS, ...(extra ?? [])];
}

function buildReportTags(report: AppendLiveJournalReportInput['report'], extra?: readonly string[]): string[] {
  const tags = [...LIVE_JOURNAL_REPORT_TAGS, ...(extra ?? [])];
  tags.push(report.isDetected ? LIVE_JOURNAL_DETECTION_TAG : LIVE_JOURNAL_CLEAR_TAG);
  return tags;
}

/** In-memory journal backend for tests and browser-limited fallback (TJ1). */
export class MemoryJournalStorageBackend implements IJournalStorageBackend {
  private readonly config: LiveJournalConfig;

  private readonly storageMode: LiveJournalStorageMode;

  private items: LiveJournalItem[] = [];

  private readonly clientEntryIds = new Set<string>();

  constructor(
    options: {
      config?: Partial<LiveJournalConfig>;
      storageMode?: LiveJournalStorageMode;
    } = {},
  ) {
    this.config = { ...DEFAULT_LIVE_JOURNAL_CONFIG, ...options.config };
    this.storageMode = options.storageMode ?? 'browser-limited-fallback';
  }

  getStorageMode(): LiveJournalStorageMode {
    return this.storageMode;
  }

  async listItems(): Promise<readonly LiveJournalItem[]> {
    return [...this.items];
  }

  async getItemByClientEntryId(clientEntryId: string): Promise<LiveJournalItem | null> {
    return this.items.find((item) => item.clientEntryId === clientEntryId) ?? null;
  }

  async appendTrack(input: AppendLiveJournalTrackInput): Promise<LiveJournalItem | null> {
    if (this.clientEntryIds.has(input.clientEntryId)) {
      return null;
    }

    const item: LiveJournalItem = {
      id: createItemId(),
      kind: 'track',
      timestamp: input.timestamp ?? Date.now(),
      clientEntryId: input.clientEntryId,
      moduleId: input.moduleId,
      moduleName: input.moduleName,
      tags: buildTrackTags(input.tags),
      track: input.track,
    };

    this.pushItem(item);
    return item;
  }

  async appendReport(input: AppendLiveJournalReportInput): Promise<LiveJournalItem | null> {
    if (this.clientEntryIds.has(input.clientEntryId)) {
      return null;
    }

    const item: LiveJournalItem = {
      id: createItemId(),
      kind: 'report',
      timestamp: input.timestamp ?? Date.now(),
      clientEntryId: input.clientEntryId,
      moduleId: input.moduleId,
      moduleName: input.moduleName,
      tags: buildReportTags(input.report, input.tags),
      report: input.report,
    };

    this.pushItem(item);
    return item;
  }

  private pushItem(item: LiveJournalItem): void {
    this.clientEntryIds.add(item.clientEntryId);
    this.items.unshift(item);
    if (this.items.length > this.config.maxItems) {
      const removed = this.items.splice(this.config.maxItems);
      for (const stale of removed) {
        this.clientEntryIds.delete(stale.clientEntryId);
      }
    }
  }

  /** Replace in-memory snapshot (TJ6 rehydrate from localStorage). */
  restoreItems(items: readonly LiveJournalItem[]): void {
    this.items = [];
    this.clientEntryIds.clear();
    for (const item of items) {
      if (this.clientEntryIds.has(item.clientEntryId)) continue;
      this.clientEntryIds.add(item.clientEntryId);
      this.items.push(item);
    }
    this.items.sort((a, b) => b.timestamp - a.timestamp);
    if (this.items.length > this.config.maxItems) {
      const removed = this.items.splice(this.config.maxItems);
      for (const stale of removed) {
        this.clientEntryIds.delete(stale.clientEntryId);
      }
    }
  }

  /** Export current snapshot for persistence (TJ6). */
  takeSnapshot(): readonly LiveJournalItem[] {
    return [...this.items];
  }

  /** Merge remote rows without overwriting existing clientEntryId (TJ2 pull sync). */
  mergeRemoteItems(items: readonly LiveJournalItem[]): void {
    for (const item of items) {
      if (this.clientEntryIds.has(item.clientEntryId)) continue;
      this.clientEntryIds.add(item.clientEntryId);
      this.items.push(item);
    }
    this.items.sort((a, b) => b.timestamp - a.timestamp);
    if (this.items.length > this.config.maxItems) {
      const removed = this.items.splice(this.config.maxItems);
      for (const stale of removed) {
        this.clientEntryIds.delete(stale.clientEntryId);
      }
    }
  }
}

export function createMemoryJournalStorageBackend(
  options?: ConstructorParameters<typeof MemoryJournalStorageBackend>[0],
): MemoryJournalStorageBackend {
  return new MemoryJournalStorageBackend(options);
}

/** Stable dedupe key for track rows. */
export function liveJournalTrackClientEntryId(trackId: string): string {
  return `live-track-${trackId}`;
}

/** Stable dedupe key for report rows. */
export function liveJournalReportClientEntryId(reportId: string): string {
  return `live-report-${reportId}`;
}

export function assertLiveJournalTrackPayload(
  track: AppendLiveJournalTrackInput['track'],
): void {
  if (track.schema !== 'telemetry-track/v1') {
    throw new ValidationError('Invalid track schema');
  }
  if (!track.trackId || !track.sampleId) {
    throw new ValidationError('trackId and sampleId are required');
  }
}

export function assertLiveJournalReportPayload(
  report: AppendLiveJournalReportInput['report'],
): void {
  if (!report.schema || !report.reportId || !report.trackId) {
    throw new ValidationError('schema, reportId and trackId are required');
  }
}
