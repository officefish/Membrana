import { Injectable, ServiceUnavailableException } from '@nestjs/common';
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

@Injectable()
export class MediaBridgeService {
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

  async ensureReservedCollections(deviceId: string): Promise<void> {
    const res = await this.mediaFetch(`/v1/devices/${deviceId}/collections/ensure-reserved`, {
      method: 'POST',
      headers: this.mediaHeaders(),
    });
    await this.assertOk(res, 'Media ensure-reserved collections');
  }
}
