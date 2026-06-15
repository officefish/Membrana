import { DomainError } from '@membrana/core';

import { createBrowserLimitedStorageBackend } from './backends/memory-storage-backend.js';
import { seedBundledCatalogIfEmpty } from './bundled-catalog.js';
import {
  BUFFER_COLLECTION_ID,
  DEFAULT_MEDIA_LIBRARY_CONFIG,
  DEFAULT_SAMPLES_PAGE_SIZE,
  type MediaLibraryConfig,
} from './constants.js';
import { isBufferSampleCountCapActive } from './quota-status.js';
import type { IStorageBackend } from './ports/storage-backend.js';
import type {
  Collection,
  MediaLibrarySnapshot,
  MediaSample,
  NewSampleMeta,
  PaginatedSamples,
} from './types.js';

export class MediaLibraryService {
  private readonly backend: IStorageBackend;

  private readonly config: MediaLibraryConfig;

  private listeners = new Set<() => void>();

  private version = 0;

  private initialized = false;

  private initPromise: Promise<void> | null = null;

  private snapshot: MediaLibrarySnapshot = {
    collections: [],
    samplesByCollection: {},
    quota: {
      usedBytes: 0,
      limitBytes: DEFAULT_MEDIA_LIBRARY_CONFIG.localQuotaBytes,
      backend: 'browser-limited',
      serverReachable: false,
    },
    version: 0,
  };

  constructor(backend: IStorageBackend, config?: Partial<MediaLibraryConfig>) {
    this.backend = backend;
    this.config = { ...DEFAULT_MEDIA_LIBRARY_CONFIG, ...config };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): MediaLibrarySnapshot {
    return this.snapshot;
  }

  getConfig(): MediaLibraryConfig {
    return this.config;
  }

  private emit(): void {
    this.version += 1;
    this.listeners.forEach((l) => l());
  }

  async refresh(): Promise<void> {
    await this.backend.ensureReservedCollections();
    const collections = await this.backend.listCollections();
    const samplesByCollection: Record<string, MediaSample[]> = {};
    for (const c of collections) {
      samplesByCollection[c.id] = await this.backend.listSamples(c.id);
    }
    const quota = await this.backend.getQuota();
    this.snapshot = {
      collections,
      samplesByCollection,
      quota,
      version: this.version,
    };
    this.emit();
  }

  async listSamplesPage(
    collectionId: string,
    page = 1,
    limit = DEFAULT_SAMPLES_PAGE_SIZE,
  ): Promise<PaginatedSamples> {
    return this.backend.listSamplesPage(collectionId, page, limit);
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    if (!this.initPromise) {
      this.initPromise = this.runInit()
        .then(() => {
          this.initialized = true;
        })
        .finally(() => {
          this.initPromise = null;
        });
    }
    await this.initPromise;
  }

  private async runInit(): Promise<void> {
    await this.backend.ensureReservedCollections();
    await seedBundledCatalogIfEmpty(this.backend, {
      assetBaseUrl: '/catalog/free-v1',
    });
    await this.refresh();
  }

  async createUserCollection(name: string): Promise<Collection> {
    const col = await this.backend.createCollection(name);
    await this.refresh();
    return col;
  }

  async deleteUserCollection(id: string): Promise<void> {
    await this.backend.deleteCollection(id);
    await this.refresh();
  }

  async importBlob(
    collectionId: string,
    blob: Blob,
    meta: NewSampleMeta,
  ): Promise<MediaSample> {
    if (collectionId === BUFFER_COLLECTION_ID) {
      const quota = this.snapshot.quota;
      if (isBufferSampleCountCapActive(quota)) {
        const bufferSamples = await this.backend.listSamples(BUFFER_COLLECTION_ID);
        if (bufferSamples.length >= this.config.maxBufferSamples) {
          throw new DomainError('Buffer sample limit reached', 'BUFFER_FULL');
        }
      }
    }
    const sample = await this.backend.putSample(collectionId, blob, meta);
    await this.refresh();
    return sample;
  }

  async removeSample(sampleId: string): Promise<void> {
    await this.backend.removeSample(sampleId);
    await this.refresh();
  }

  async moveSample(sampleId: string, toCollectionId: string): Promise<MediaSample> {
    const moved = await this.backend.moveSample(sampleId, toCollectionId);
    await this.refresh();
    return moved;
  }

  async updateSampleLabelNotes(
    sampleId: string,
    patch: import('./types.js').UpdateSampleLabelNotes,
  ): Promise<MediaSample> {
    const updated = await this.backend.updateSampleLabelNotes(sampleId, patch);
    await this.refresh();
    return updated;
  }

  async clearBuffer(): Promise<void> {
    const samples = await this.backend.listSamples(BUFFER_COLLECTION_ID);
    for (const s of samples) {
      await this.backend.removeSample(s.id);
    }
    await this.refresh();
  }

  getBackend(): IStorageBackend {
    return this.backend;
  }

  async getSampleBlob(sampleId: string): Promise<Blob> {
    return this.backend.readBlob(sampleId);
  }
}

let defaultService: MediaLibraryService | null = null;

export function createMediaLibraryService(
  backend: IStorageBackend,
  config?: Partial<MediaLibraryConfig>,
): MediaLibraryService {
  return new MediaLibraryService(backend, config);
}

export function getDefaultMediaLibraryService(): MediaLibraryService {
  if (!defaultService) {
    defaultService = createMediaLibraryService(
      createBrowserLimitedStorageBackend(DEFAULT_MEDIA_LIBRARY_CONFIG.localQuotaBytes),
    );
  }
  return defaultService;
}

/** Replace singleton backend (e.g. switch to remote-server after pairing). */
export function configureDefaultMediaLibraryService(
  backend: IStorageBackend,
  config?: Partial<MediaLibraryConfig>,
): MediaLibraryService {
  defaultService = createMediaLibraryService(backend, config);
  return defaultService;
}

export function resetDefaultMediaLibraryServiceForTests(): void {
  defaultService = null;
}

export function setDefaultMediaLibraryServiceForTests(service: MediaLibraryService): void {
  defaultService = service;
}
