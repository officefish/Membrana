import type { IJournalStorageBackend } from './ports/storage-backend.js';
import {
  assertLiveJournalReportPayload,
  assertLiveJournalTrackPayload,
  createMemoryJournalStorageBackend,
} from './backends/memory-journal-storage-backend.js';
import {
  DEFAULT_LIVE_JOURNAL_CONFIG,
  type LiveJournalConfig,
} from './constants.js';
import { matchesLiveJournalFilter } from './filters.js';
import type {
  AppendLiveJournalReportInput,
  AppendLiveJournalTrackInput,
  LiveJournalFilter,
  LiveJournalItem,
  LiveJournalSnapshot,
} from './types.js';

export class LiveJournalService {
  private readonly backend: IJournalStorageBackend;

  private readonly config: LiveJournalConfig;

  private listeners = new Set<() => void>();

  private version = 0;

  private snapshot: LiveJournalSnapshot = {
    items: [],
    storageMode: 'browser-limited-fallback',
    version: 0,
  };

  constructor(backend: IJournalStorageBackend, config?: Partial<LiveJournalConfig>) {
    this.backend = backend;
    this.config = { ...DEFAULT_LIVE_JOURNAL_CONFIG, ...config };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): LiveJournalSnapshot {
    return this.snapshot;
  }

  getConfig(): LiveJournalConfig {
    return this.config;
  }

  getBackend(): IJournalStorageBackend {
    return this.backend;
  }

  listFiltered(filter: LiveJournalFilter): readonly LiveJournalItem[] {
    return this.snapshot.items.filter((item) => matchesLiveJournalFilter(item, filter));
  }

  async init(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    const items = await this.backend.listItems();
    this.snapshot = {
      items: [...items].sort((a, b) => b.timestamp - a.timestamp),
      storageMode: this.backend.getStorageMode(),
      version: this.version,
    };
    this.emit();
  }

  async appendTrack(input: AppendLiveJournalTrackInput): Promise<LiveJournalItem | null> {
    assertLiveJournalTrackPayload(input.track);
    const item = await this.backend.appendTrack(input);
    if (item) await this.refresh();
    return item;
  }

  async appendReport(input: AppendLiveJournalReportInput): Promise<LiveJournalItem | null> {
    assertLiveJournalReportPayload(input.report);
    const item = await this.backend.appendReport(input);
    if (item) await this.refresh();
    return item;
  }

  private emit(): void {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }
}

let defaultService: LiveJournalService | null = null;

export function createLiveJournalService(
  backend: IJournalStorageBackend,
  config?: Partial<LiveJournalConfig>,
): LiveJournalService {
  return new LiveJournalService(backend, config);
}

export function getDefaultLiveJournalService(): LiveJournalService {
  if (!defaultService) {
    defaultService = createLiveJournalService(createMemoryJournalStorageBackend());
  }
  return defaultService;
}

export function configureDefaultLiveJournalService(
  backend: IJournalStorageBackend,
  config?: Partial<LiveJournalConfig>,
): LiveJournalService {
  defaultService = createLiveJournalService(backend, config);
  return defaultService;
}

export function resetDefaultLiveJournalServiceForTests(): void {
  defaultService = null;
}

export function setDefaultLiveJournalServiceForTests(service: LiveJournalService): void {
  defaultService = service;
}
