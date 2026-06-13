import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';

export interface MediaDeviceRegistration {
  id: string;
  name: string;
  kind: string;
  createdAt: string;
}

@Injectable()
export class MediaBridgeService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async registerDevice(name: string): Promise<MediaDeviceRegistration> {
    const base = this.config.MEDIA_API_URL.replace(/\/$/, '');
    const res = await fetch(`${base}/v1/devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Membrana-Token': this.config.MEDIA_API_TOKEN,
      },
      body: JSON.stringify({ name, kind: 'other' }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      throw new ServiceUnavailableException(
        `Media server registration failed (${res.status}): ${detail}`,
      );
    }

    return (await res.json()) as MediaDeviceRegistration;
  }
}
