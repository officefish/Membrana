import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  BUFFER_COLLECTION_ID,
  DEFAULT_ELECTRON_QUOTA_BYTES,
  DEFAULT_SAMPLES_PAGE_SIZE,
  TARIFF_DATASET_COLLECTION_ID,
  TARIFF_DATASET_SYSTEM_KEY,
} from './constants';
import { DomainError } from './domain-error';
import type {
  Collection,
  MediaLibraryManifest,
  MediaSample,
  NewSampleMeta,
  PaginatedSamples,
  StorageQuota,
  UpdateSampleLabelNotes,
} from './types';

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function isReservedCollection(id: string): boolean {
  return id === BUFFER_COLLECTION_ID || id === TARIFF_DATASET_COLLECTION_ID;
}

function isTariffDatasetCollection(col: Collection | undefined): boolean {
  return col?.kind === 'system' && col.systemKey === TARIFF_DATASET_SYSTEM_KEY;
}

function emptyManifest(limitBytes: number): MediaLibraryManifest {
  return {
    version: 1,
    limitBytes,
    collections: {},
    samples: {},
  };
}

/** Desktop FS media library — manifest.json + blobs/ (MS2). */
export class MediaLibraryFsStore {
  private manifest: MediaLibraryManifest;

  private readonly rootDir: string;

  private readonly manifestPath: string;

  private readonly blobsDir: string;

  private loaded = false;

  constructor(rootDir: string, limitBytes = DEFAULT_ELECTRON_QUOTA_BYTES) {
    this.rootDir = rootDir;
    this.manifestPath = path.join(rootDir, 'manifest.json');
    this.blobsDir = path.join(rootDir, 'blobs');
    this.manifest = emptyManifest(limitBytes);
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    await mkdir(this.blobsDir, { recursive: true });
    try {
      const raw = await readFile(this.manifestPath, 'utf8');
      const parsed = JSON.parse(raw) as MediaLibraryManifest;
      if (parsed.version === 1 && parsed.collections && parsed.samples) {
        this.manifest = parsed;
      }
    } catch {
      this.manifest = emptyManifest(this.manifest.limitBytes);
      await this.persist();
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
    await writeFile(this.manifestPath, JSON.stringify(this.manifest, null, 2), 'utf8');
  }

  private blobPath(sampleId: string): string {
    return path.join(this.blobsDir, `${sampleId}.bin`);
  }

  private userUsedBytes(): number {
    let used = 0;
    for (const sample of Object.values(this.manifest.samples)) {
      const col = this.manifest.collections[sample.collectionId];
      if (isTariffDatasetCollection(col)) continue;
      used += sample.sizeBytes;
    }
    return used;
  }

  private bufferUsedBytes(): number {
    let used = 0;
    for (const sample of Object.values(this.manifest.samples)) {
      if (sample.collectionId !== BUFFER_COLLECTION_ID) continue;
      used += sample.sizeBytes;
    }
    return used;
  }

  async getQuota(): Promise<StorageQuota> {
    await this.ensureLoaded();
    const usedBytes = this.userUsedBytes();
    const limitBytes = this.manifest.limitBytes;
    return {
      usedBytes,
      limitBytes,
      backend: 'electron-fs',
      serverReachable: false,
      bufferUsedBytes: this.bufferUsedBytes(),
      bufferLimitBytes: limitBytes,
    };
  }

  async ensureReservedCollections(): Promise<void> {
    await this.ensureLoaded();
    const t = nowIso();
    let changed = false;
    if (!this.manifest.collections[BUFFER_COLLECTION_ID]) {
      this.manifest.collections[BUFFER_COLLECTION_ID] = {
        id: BUFFER_COLLECTION_ID,
        name: 'Буфер записи',
        kind: 'buffer',
        createdAt: t,
        updatedAt: t,
      };
      changed = true;
    }
    if (!this.manifest.collections[TARIFF_DATASET_COLLECTION_ID]) {
      this.manifest.collections[TARIFF_DATASET_COLLECTION_ID] = {
        id: TARIFF_DATASET_COLLECTION_ID,
        name: 'Базовый набор (free-v1)',
        kind: 'system',
        systemKey: TARIFF_DATASET_SYSTEM_KEY,
        createdAt: t,
        updatedAt: t,
      };
      changed = true;
    }
    if (changed) await this.persist();
  }

  async listCollections(): Promise<Collection[]> {
    await this.ensureReservedCollections();
    const counts = new Map<string, number>();
    for (const sample of Object.values(this.manifest.samples)) {
      counts.set(sample.collectionId, (counts.get(sample.collectionId) ?? 0) + 1);
    }
    return Object.values(this.manifest.collections)
      .sort((a, b) => {
        const order = (c: Collection) =>
          c.kind === 'buffer' ? 0 : c.kind === 'system' ? 1 : 2;
        const d = order(a) - order(b);
        if (d !== 0) return d;
        return a.name.localeCompare(b.name);
      })
      .map((col) => ({ ...col, sampleCount: counts.get(col.id) ?? 0 }));
  }

  async createCollection(name: string): Promise<Collection> {
    await this.ensureReservedCollections();
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
    this.manifest.collections[col.id] = col;
    await this.persist();
    return col;
  }

  async deleteCollection(id: string): Promise<void> {
    await this.ensureReservedCollections();
    if (isReservedCollection(id)) {
      throw new DomainError('Reserved collection cannot be deleted', 'FORBIDDEN');
    }
    const samples = Object.values(this.manifest.samples).filter((s) => s.collectionId === id);
    for (const sample of samples) {
      await this.removeSample(sample.id);
    }
    delete this.manifest.collections[id];
    await this.persist();
  }

  async listSamples(collectionId: string): Promise<MediaSample[]> {
    await this.ensureReservedCollections();
    return Object.values(this.manifest.samples)
      .filter((s) => s.collectionId === collectionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listSamplesPage(
    collectionId: string,
    page = 1,
    limit = DEFAULT_SAMPLES_PAGE_SIZE,
  ): Promise<PaginatedSamples> {
    const all = await this.listSamples(collectionId);
    const total = all.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const safePage = totalPages === 0 ? 1 : Math.min(Math.max(1, page), totalPages);
    const skip = (safePage - 1) * limit;
    return {
      items: all.slice(skip, skip + limit),
      page: safePage,
      limit,
      total,
      totalPages,
    };
  }

  async putSample(
    collectionId: string,
    data: Uint8Array,
    meta: NewSampleMeta,
  ): Promise<MediaSample> {
    await this.ensureReservedCollections();
    const col = this.manifest.collections[collectionId];
    if (!col) {
      throw new DomainError('Collection not found', 'NOT_FOUND');
    }
    if (isTariffDatasetCollection(col)) {
      throw new DomainError('Cannot upload to tariff dataset collection', 'FORBIDDEN');
    }
    const size = data.byteLength;
    if (this.userUsedBytes() + size > this.manifest.limitBytes) {
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
    await writeFile(this.blobPath(id), data);
    this.manifest.samples[id] = sample;
    this.manifest.collections[collectionId] = { ...col, updatedAt: nowIso() };
    await this.persist();
    return sample;
  }

  async importCatalogSample(
    collectionId: string,
    data: Uint8Array,
    meta: NewSampleMeta,
    fixedId: string,
  ): Promise<MediaSample> {
    await this.ensureReservedCollections();
    const col = this.manifest.collections[collectionId];
    if (!col || !isTariffDatasetCollection(col)) {
      throw new DomainError('Catalog import only allowed for tariff dataset', 'FORBIDDEN');
    }
    const existing = this.manifest.samples[fixedId];
    if (existing) return existing;

    const sample: MediaSample = {
      id: fixedId,
      collectionId,
      title: meta.title,
      class: meta.class,
      label: meta.label,
      source: meta.source,
      durationSec: meta.durationSec,
      sampleRate: meta.sampleRate,
      channels: meta.channels ?? 1,
      createdAt: nowIso(),
      storageRef: fixedId,
      notes: meta.notes,
      sizeBytes: data.byteLength,
    };
    await writeFile(this.blobPath(fixedId), data);
    this.manifest.samples[fixedId] = sample;
    this.manifest.collections[collectionId] = { ...col, updatedAt: nowIso() };
    await this.persist();
    return sample;
  }

  async removeSample(sampleId: string): Promise<void> {
    await this.ensureLoaded();
    const sample = this.manifest.samples[sampleId];
    if (!sample) return;
    const col = this.manifest.collections[sample.collectionId];
    if (isTariffDatasetCollection(col)) {
      throw new DomainError('Cannot delete catalog samples', 'FORBIDDEN');
    }
    delete this.manifest.samples[sampleId];
    try {
      await unlink(this.blobPath(sampleId));
    } catch {
      /* blob may already be missing */
    }
    await this.persist();
  }

  async moveSample(sampleId: string, toCollectionId: string): Promise<MediaSample> {
    await this.ensureLoaded();
    const sample = this.manifest.samples[sampleId];
    if (!sample) {
      throw new DomainError('Sample not found', 'NOT_FOUND');
    }
    const fromCol = this.manifest.collections[sample.collectionId];
    const toCol = this.manifest.collections[toCollectionId];
    if (isTariffDatasetCollection(fromCol) || isTariffDatasetCollection(toCol)) {
      throw new DomainError('Cannot move catalog samples', 'FORBIDDEN');
    }
    if (!toCol) {
      throw new DomainError('Target collection not found', 'NOT_FOUND');
    }
    const updated: MediaSample = {
      ...sample,
      collectionId: toCollectionId,
      source: 'move',
    };
    this.manifest.samples[sampleId] = updated;
    this.manifest.collections[toCollectionId] = { ...toCol, updatedAt: nowIso() };
    await this.persist();
    return updated;
  }

  async updateSampleLabelNotes(
    sampleId: string,
    patch: UpdateSampleLabelNotes,
  ): Promise<MediaSample> {
    await this.ensureLoaded();
    const sample = this.manifest.samples[sampleId];
    if (!sample) {
      throw new DomainError('Sample not found', 'NOT_FOUND');
    }
    const col = this.manifest.collections[sample.collectionId];
    if (isTariffDatasetCollection(col)) {
      throw new DomainError('Tariff dataset labels require cabinet admin', 'FORBIDDEN');
    }
    const updated: MediaSample = {
      ...sample,
      ...(patch.label !== undefined ? { label: patch.label } : {}),
      ...(patch.notes !== undefined
        ? { notes: patch.notes === null ? undefined : patch.notes }
        : {}),
    };
    this.manifest.samples[sampleId] = updated;
    await this.persist();
    return updated;
  }

  async readBlob(sampleId: string): Promise<Uint8Array> {
    await this.ensureLoaded();
    if (!this.manifest.samples[sampleId]) {
      throw new DomainError('Blob not found', 'NOT_FOUND');
    }
    return readFile(this.blobPath(sampleId));
  }
}

export function createMediaLibraryFsStore(rootDir: string): MediaLibraryFsStore {
  return new MediaLibraryFsStore(rootDir);
}
