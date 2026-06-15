import { DomainError } from '@membrana/core';

import { TARIFF_DATASET_SYSTEM_KEY } from '../constants.js';
import type { IStorageBackend } from '../ports/storage-backend.js';
import type {
  Collection,
  CollectionKind,
  MediaSample,
  NewSampleMeta,
  SampleLabel,
  SampleSource,
  StorageQuota,
  UpdateSampleLabelNotes,
} from '../types.js';

export interface ServerStorageBackendConfig {
  baseUrl: string;
  deviceId: string;
  mediaToken: string;
}

interface ApiCollection {
  id: string;
  name: string;
  kind: string;
  createdAt: string;
  updatedAt: string;
  systemKey?: string;
  sampleCount?: number;
}

interface ApiPaginatedSamples {
  items: ApiSample[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiSample {
  id: string;
  collectionId: string;
  title: string;
  class: string;
  label: SampleLabel;
  source: string;
  durationSec: number;
  sampleRate: number;
  channels: 1 | 2;
  createdAt: string;
  storageRef: string;
  notes?: string;
  sizeBytes: number;
}

interface ApiQuotaResponse {
  userStorage: { usedBytes: number; limitBytes: number; backend: 'server' };
  buffer: { usedBytes: number; limitBytes: number; backend: 'server' };
  dataset: { catalogId: string; sampleCount: number };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

function mapCollectionKind(kind: string): CollectionKind {
  if (kind === 'buffer' || kind === 'user' || kind === 'system') {
    return kind;
  }
  return 'user';
}

function mapCollection(dto: ApiCollection): Collection {
  return {
    id: dto.id,
    name: dto.name,
    kind: mapCollectionKind(dto.kind),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    systemKey: dto.systemKey === TARIFF_DATASET_SYSTEM_KEY ? TARIFF_DATASET_SYSTEM_KEY : undefined,
    sampleCount: dto.sampleCount,
  };
}

function mapSampleSource(source: string): SampleSource {
  const allowed: SampleSource[] = [
    'mic-recording',
    'disk-import',
    'synthetic',
    'move',
    'copy',
    'catalog',
  ];
  return allowed.includes(source as SampleSource) ? (source as SampleSource) : 'disk-import';
}

function mapSampleLabel(label: string): SampleLabel {
  if (label === 'not_drone' || label === 'not-drone') return 'not-drone';
  if (label === 'drone') return 'drone';
  return 'unlabeled';
}

function mapSample(dto: ApiSample): MediaSample {
  return {
    id: dto.id,
    collectionId: dto.collectionId,
    title: dto.title,
    class: dto.class,
    label: mapSampleLabel(dto.label),
    source: mapSampleSource(dto.source),
    durationSec: dto.durationSec,
    sampleRate: dto.sampleRate,
    channels: dto.channels === 2 ? 2 : 1,
    createdAt: dto.createdAt,
    storageRef: dto.storageRef,
    notes: dto.notes,
    sizeBytes: dto.sizeBytes,
  };
}

function guessUploadFilename(blob: Blob, title: string): string {
  const base = title.trim() || 'sample';
  const type = blob.type || 'audio/wav';
  if (type.includes('mpeg') || type.includes('mp3')) return `${base}.mp3`;
  if (type.includes('ogg')) return `${base}.ogg`;
  if (type.includes('flac')) return `${base}.flac`;
  return `${base}.wav`;
}

async function parseApiError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(', ');
    if (typeof body.message === 'string') return body.message;
  } catch {
    /* ignore */
  }
  return res.statusText || 'Request failed';
}

function throwForStatus(res: Response, message: string): never {
  if (res.status === 403) throw new DomainError(message, 'FORBIDDEN');
  if (res.status === 404) throw new DomainError(message, 'NOT_FOUND');
  if (res.status === 413) throw new DomainError(message, 'QUOTA_EXCEEDED');
  throw new DomainError(message, 'REQUEST_FAILED');
}

/** HTTP backend for `background-media` (paired web client). */
export class ServerStorageBackend implements IStorageBackend {
  private readonly baseUrl: string;

  private readonly deviceId: string;

  private readonly mediaToken: string;

  private serverReachable = true;

  constructor(config: ServerStorageBackendConfig) {
    this.baseUrl = normalizeBaseUrl(config.baseUrl);
    this.deviceId = config.deviceId;
    this.mediaToken = config.mediaToken;
  }

  private deviceUrl(path: string): string {
    return `${this.baseUrl}/v1/devices/${this.deviceId}${path}`;
  }

  private authHeaders(extra?: HeadersInit): Headers {
    const headers = new Headers(extra);
    headers.set('X-Membrana-Token', this.mediaToken);
    headers.set('X-Membrana-Device-Id', this.deviceId);
    return headers;
  }

  private async requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(this.deviceUrl(path), {
      ...init,
      headers: this.authHeaders(init?.headers),
    });
    if (!res.ok) {
      this.serverReachable = res.status !== 401 && res.status !== 403;
      throwForStatus(res, await parseApiError(res));
    }
    this.serverReachable = true;
    return (await res.json()) as T;
  }

  async getQuota(): Promise<StorageQuota> {
    try {
      const data = await this.requestJson<ApiQuotaResponse>('/quota');
      return {
        usedBytes: data.userStorage.usedBytes,
        limitBytes: data.userStorage.limitBytes,
        backend: 'server',
        serverReachable: this.serverReachable,
        bufferUsedBytes: data.buffer.usedBytes,
        bufferLimitBytes: data.buffer.limitBytes,
      };
    } catch {
      return {
        usedBytes: 0,
        limitBytes: 0,
        backend: 'server',
        serverReachable: false,
        bufferUsedBytes: 0,
        bufferLimitBytes: 0,
      };
    }
  }

  async ensureReservedCollections(): Promise<void> {
    await this.requestJson<ApiCollection[]>('/collections/ensure-reserved', { method: 'POST' });
  }

  async listCollections(): Promise<Collection[]> {
    const rows = await this.requestJson<ApiCollection[]>('/collections');
    return rows.map(mapCollection);
  }

  async createCollection(name: string): Promise<Collection> {
    const row = await this.requestJson<ApiCollection>('/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return mapCollection(row);
  }

  async deleteCollection(id: string): Promise<void> {
    const res = await fetch(this.deviceUrl(`/collections/${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
    if (!res.ok) {
      throwForStatus(res, await parseApiError(res));
    }
  }

  async listSamples(collectionId: string): Promise<MediaSample[]> {
    const first = await this.requestJson<ApiPaginatedSamples>(
      `/collections/${encodeURIComponent(collectionId)}/samples?page=1&limit=40`,
    );
    const rows = [...first.items];
    for (let page = 2; page <= first.totalPages; page += 1) {
      const next = await this.requestJson<ApiPaginatedSamples>(
        `/collections/${encodeURIComponent(collectionId)}/samples?page=${page}&limit=${first.limit}`,
      );
      rows.push(...next.items);
    }
    return rows.map(mapSample);
  }

  async putSample(collectionId: string, blob: Blob, meta: NewSampleMeta): Promise<MediaSample> {
    const form = new FormData();
    form.append('file', blob, guessUploadFilename(blob, meta.title));
    form.append(
      'meta',
      JSON.stringify({
        title: meta.title,
        class: meta.class,
        label: meta.label,
        source: meta.source,
        durationSec: meta.durationSec,
        sampleRate: meta.sampleRate,
        channels: meta.channels ?? 1,
        notes: meta.notes,
      }),
    );
    const res = await fetch(
      this.deviceUrl(`/collections/${encodeURIComponent(collectionId)}/samples`),
      {
        method: 'POST',
        headers: this.authHeaders(),
        body: form,
      },
    );
    if (!res.ok) {
      throwForStatus(res, await parseApiError(res));
    }
    const row = (await res.json()) as ApiSample;
    return mapSample(row);
  }

  async removeSample(sampleId: string): Promise<void> {
    const res = await fetch(this.deviceUrl(`/samples/${encodeURIComponent(sampleId)}`), {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
    if (!res.ok) {
      throwForStatus(res, await parseApiError(res));
    }
  }

  async moveSample(sampleId: string, toCollectionId: string): Promise<MediaSample> {
    const row = await this.requestJson<ApiSample>(
      `/samples/${encodeURIComponent(sampleId)}/move`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toCollectionId }),
      },
    );
    return mapSample(row);
  }

  async updateSampleLabelNotes(
    sampleId: string,
    patch: UpdateSampleLabelNotes,
  ): Promise<MediaSample> {
    const body: { label?: string; notes?: string | null } = {};
    if (patch.label !== undefined) body.label = patch.label;
    if (patch.notes !== undefined) body.notes = patch.notes;
    const row = await this.requestJson<ApiSample>(
      `/samples/${encodeURIComponent(sampleId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    return mapSample(row);
  }

  async readBlob(sampleId: string): Promise<Blob> {
    const res = await fetch(this.deviceUrl(`/samples/${encodeURIComponent(sampleId)}/blob`), {
      headers: this.authHeaders(),
    });
    if (!res.ok) {
      throwForStatus(res, await parseApiError(res));
    }
    return await res.blob();
  }
}

export function createServerStorageBackend(
  config: ServerStorageBackendConfig,
): ServerStorageBackend {
  return new ServerStorageBackend(config);
}
