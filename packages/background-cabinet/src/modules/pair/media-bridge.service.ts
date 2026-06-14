import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';

export interface MediaMembraneContext {
  membraneId: string;
  userStorageQuotaBytes: string | number;
  bufferQuotaBytes: string | number;
  datasetCatalogId: string;
}

export interface MediaDeviceRegistration {
  id: string;
  name: string;
  kind: string;
  createdAt: string;
}

export interface MediaQuotaBucket {
  usedBytes: number;
  limitBytes: number;
  backend: 'server';
}

export interface MediaQuotaResponse {
  userStorage: MediaQuotaBucket;
  buffer: MediaQuotaBucket;
  dataset: { catalogId: string; sampleCount: number };
}

export interface MediaCollectionSummary {
  id: string;
  name: string;
  kind: string;
  createdAt: string;
  updatedAt: string;
  systemKey?: string;
}

export interface MediaSampleSummary {
  id: string;
  collectionId: string;
  title: string;
  class: string;
  label: string;
  source: string;
  durationSec: number;
  sampleRate: number;
  channels: 1 | 2;
  createdAt: string;
  storageRef: string;
  notes?: string;
  sizeBytes: number;
}

@Injectable()
export class MediaBridgeService {
  private readonly logger = new Logger(MediaBridgeService.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  private mediaHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Membrana-Token': this.config.MEDIA_API_TOKEN,
    };
  }

  private mediaBase(): string {
    return this.config.MEDIA_API_URL.replace(/\/$/, '');
  }

  private async mediaFetch(path: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(`${this.mediaBase()}${path}`, init);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'fetch failed';
      throw new ServiceUnavailableException(`Media server unreachable: ${msg}`);
    }
  }

  private async assertOk(res: Response, action: string): Promise<void> {
    if (res.ok) return;
    const detail = await res.text().catch(() => res.statusText);
    throw new ServiceUnavailableException(`${action} failed (${res.status}): ${detail}`);
  }

  async registerDevice(
    name: string,
    membrane?: MediaMembraneContext,
  ): Promise<MediaDeviceRegistration> {
    const res = await this.mediaFetch('/v1/devices', {
      method: 'POST',
      headers: this.mediaHeaders(),
      body: JSON.stringify({
        name,
        kind: 'other',
        ...(membrane ? { membrane } : {}),
      }),
    });
    await this.assertOk(res, 'Media server registration');
    return (await res.json()) as MediaDeviceRegistration;
  }

  async syncMembraneContext(deviceId: string, membrane: MediaMembraneContext): Promise<void> {
    const res = await this.mediaFetch(`/v1/devices/${deviceId}/membrane`, {
      method: 'PATCH',
      headers: this.mediaHeaders(),
      body: JSON.stringify({ membrane }),
    });
    await this.assertOk(res, 'Media membrane context sync');
  }

  /** Best-effort; pairing must succeed even if collections already exist or media hiccups. */
  async ensureReservedCollections(deviceId: string): Promise<void> {
    const res = await this.mediaFetch(`/v1/devices/${deviceId}/collections/ensure-reserved`, {
      method: 'POST',
      headers: this.mediaHeaders(),
    });
    if (res.ok) return;
    const detail = await res.text().catch(() => res.statusText);
    this.logger.warn(
      `ensure-reserved failed for device ${deviceId} (${res.status}): ${detail}`,
    );
  }

  async getQuota(deviceId: string): Promise<MediaQuotaResponse | null> {
    const res = await this.mediaFetch(`/v1/devices/${deviceId}/quota`, {
      method: 'GET',
      headers: this.mediaHeaders(),
    });
    if (!res.ok) {
      this.logger.warn(`quota fetch failed for device ${deviceId} (${res.status})`);
      return null;
    }
    return (await res.json()) as MediaQuotaResponse;
  }

  async listCollections(deviceId: string): Promise<MediaCollectionSummary[]> {
    const res = await this.mediaFetch(`/v1/devices/${deviceId}/collections`, {
      method: 'GET',
      headers: this.mediaHeaders(),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      throw new ServiceUnavailableException(
        `Media collections list failed (${res.status}): ${detail}`,
      );
    }
    return (await res.json()) as MediaCollectionSummary[];
  }

  async listSamples(deviceId: string, collectionId: string): Promise<MediaSampleSummary[]> {
    const encoded = encodeURIComponent(collectionId);
    const res = await this.mediaFetch(`/v1/devices/${deviceId}/collections/${encoded}/samples`, {
      method: 'GET',
      headers: this.mediaHeaders(),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      throw new ServiceUnavailableException(
        `Media samples list failed (${res.status}): ${detail}`,
      );
    }
    return (await res.json()) as MediaSampleSummary[];
  }
}
