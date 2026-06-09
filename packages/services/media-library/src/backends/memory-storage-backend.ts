import { DomainError } from '@membrana/core';

import {
  BUFFER_COLLECTION_ID,
  SYSTEM_BENCHMARK_COLLECTION_ID,
} from '../constants.js';
import type { IStorageBackend } from '../ports/storage-backend.js';
import type {
  Collection,
  MediaSample,
  NewSampleMeta,
  StorageQuota,
} from '../types.js';

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function isReservedCollection(id: string): boolean {
  return id === BUFFER_COLLECTION_ID || id === SYSTEM_BENCHMARK_COLLECTION_ID;
}

export interface MemoryStorageBackendOptions {
  limitBytes?: number;
  backend?: StorageQuota['backend'];
  serverReachable?: boolean;
}

/** In-memory backend with quota — tests and browser-limited v1 (session). */
export class MemoryStorageBackend implements IStorageBackend {
  private readonly limitBytes: number;

  private readonly backendKind: StorageQuota['backend'];

  private readonly serverReachable: boolean;

  private collections = new Map<string, Collection>();

  private samples = new Map<string, MediaSample>();

  private blobs = new Map<string, Blob>();

  private usedBytes = 0;

  constructor(options: MemoryStorageBackendOptions = {}) {
    this.limitBytes = options.limitBytes ?? 100 * 1024 * 1024;
    this.backendKind = options.backend ?? 'browser-limited';
    this.serverReachable = options.serverReachable ?? false;
  }

  async getQuota(): Promise<StorageQuota> {
    return {
      usedBytes: this.usedBytes,
      limitBytes: this.limitBytes,
      backend: this.backendKind,
      serverReachable: this.serverReachable,
    };
  }

  async ensureReservedCollections(): Promise<void> {
    const t = nowIso();
    if (!this.collections.has(BUFFER_COLLECTION_ID)) {
      this.collections.set(BUFFER_COLLECTION_ID, {
        id: BUFFER_COLLECTION_ID,
        name: 'Буфер записи',
        kind: 'buffer',
        createdAt: t,
        updatedAt: t,
      });
    }
    if (!this.collections.has(SYSTEM_BENCHMARK_COLLECTION_ID)) {
      this.collections.set(SYSTEM_BENCHMARK_COLLECTION_ID, {
        id: SYSTEM_BENCHMARK_COLLECTION_ID,
        name: 'Benchmark (системная)',
        kind: 'system',
        systemKey: 'benchmark',
        createdAt: t,
        updatedAt: t,
      });
    }
  }

  async listCollections(): Promise<Collection[]> {
    await this.ensureReservedCollections();
    return [...this.collections.values()].sort((a, b) => {
      const order = (c: Collection) =>
        c.kind === 'buffer' ? 0 : c.kind === 'system' ? 1 : 2;
      const d = order(a) - order(b);
      if (d !== 0) return d;
      return a.name.localeCompare(b.name);
    });
  }

  async createCollection(name: string): Promise<Collection> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new DomainError('Collection name required', 'INVALID_NAME');
    }
    const t = nowIso();
    const col: Collection = {
      id: newId(),
      name: trimmed,
      kind: 'user',
      createdAt: t,
      updatedAt: t,
    };
    this.collections.set(col.id, col);
    return col;
  }

  async deleteCollection(id: string): Promise<void> {
    if (isReservedCollection(id)) {
      throw new DomainError('Reserved collection cannot be deleted', 'FORBIDDEN');
    }
    const samples = [...this.samples.values()].filter((s) => s.collectionId === id);
    for (const s of samples) {
      await this.removeSample(s.id);
    }
    this.collections.delete(id);
  }

  async listSamples(collectionId: string): Promise<MediaSample[]> {
    return [...this.samples.values()]
      .filter((s) => s.collectionId === collectionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async putSample(
    collectionId: string,
    blob: Blob,
    meta: NewSampleMeta,
  ): Promise<MediaSample> {
    await this.ensureReservedCollections();
    if (!this.collections.has(collectionId)) {
      throw new DomainError('Collection not found', 'NOT_FOUND');
    }
    const size = blob.size;
    if (this.usedBytes + size > this.limitBytes) {
      throw new DomainError('Storage quota exceeded', 'QUOTA_EXCEEDED');
    }
    const id = newId();
    const sample: MediaSample = {
      id,
      collectionId,
      title: meta.title,
      class: meta.class,
      label: meta.label,
      source: meta.source,
      durationSec: meta.durationSec,
      sampleRate: meta.sampleRate,
      channels: meta.channels ?? 1,
      createdAt: nowIso(),
      storageRef: id,
      notes: meta.notes,
      sizeBytes: size,
    };
    this.samples.set(id, sample);
    this.blobs.set(id, blob);
    this.usedBytes += size;
    const col = this.collections.get(collectionId)!;
    this.collections.set(collectionId, { ...col, updatedAt: nowIso() });
    return sample;
  }

  async removeSample(sampleId: string): Promise<void> {
    const sample = this.samples.get(sampleId);
    if (!sample) return;
    this.samples.delete(sampleId);
    this.blobs.delete(sampleId);
    this.usedBytes = Math.max(0, this.usedBytes - sample.sizeBytes);
  }

  async moveSample(sampleId: string, toCollectionId: string): Promise<MediaSample> {
    const sample = this.samples.get(sampleId);
    if (!sample) {
      throw new DomainError('Sample not found', 'NOT_FOUND');
    }
    if (!this.collections.has(toCollectionId)) {
      throw new DomainError('Target collection not found', 'NOT_FOUND');
    }
    const updated: MediaSample = {
      ...sample,
      collectionId: toCollectionId,
      source: 'move',
    };
    this.samples.set(sampleId, updated);
    return updated;
  }

  async readBlob(sampleId: string): Promise<Blob> {
    const blob = this.blobs.get(sampleId);
    if (!blob) {
      throw new DomainError('Blob not found', 'NOT_FOUND');
    }
    return blob;
  }
}

export function createBrowserLimitedStorageBackend(
  limitBytes?: number,
): IStorageBackend {
  return new MemoryStorageBackend({
    limitBytes,
    backend: 'browser-limited',
    serverReachable: false,
  });
}
