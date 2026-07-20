/**
 * Office → media trigger: «сними снимок».
 * Auth: существующий `X-Membrana-Token` / `API_INTERNAL_TOKEN` (вердикт M2).
 * Ключ Linear в запросе НЕ передаётся.
 */
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AppConfig } from '../config/env.schema';
import { APP_CONFIG } from '../config/config.tokens';
import type {
  LinearSnapshot,
  LinearSnapshotCapturePort,
  LinearSnapshotTrigger,
} from './linear-snapshot.types';

interface CaptureResponse {
  snapshot: LinearSnapshot;
  pullOk: boolean;
  filePath: string | null;
}

@Injectable()
export class MediaSnapshotClient implements LinearSnapshotCapturePort {
  private readonly logger = new Logger(MediaSnapshotClient.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async capture(trigger: LinearSnapshotTrigger): Promise<LinearSnapshot> {
    const base = this.config.MEDIA_API_URL?.trim();
    if (!base) {
      throw new ServiceUnavailableException(
        'MEDIA_API_URL is not configured — office cannot trigger media snapshot',
      );
    }
    const token = this.config.MEDIA_API_TOKEN?.trim() || this.config.API_INTERNAL_TOKEN;
    const url = `${base.replace(/\/$/, '')}/v1/linear-snapshots/capture`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Membrana-Token': token,
      },
      body: JSON.stringify({ trigger, persist: true }),
      signal: AbortSignal.timeout(120_000),
    });
    const text = await res.text();
    if (!res.ok) {
      this.logger.warn({ status: res.status, body: text.slice(0, 200) }, 'media snapshot trigger failed');
      throw new BadRequestException(`media snapshot trigger failed: HTTP ${res.status}`);
    }
    let parsed: CaptureResponse;
    try {
      parsed = JSON.parse(text) as CaptureResponse;
    } catch {
      throw new BadRequestException('media snapshot trigger returned invalid JSON');
    }
    if (!parsed.snapshot?.header) {
      throw new BadRequestException('media snapshot trigger returned empty snapshot');
    }
    this.logger.log(
      {
        trigger,
        producedBy: parsed.snapshot.header.producedBy,
        recordCount: parsed.snapshot.header.recordCount,
        pullOk: parsed.pullOk,
      },
      'snapshot received from media-NL',
    );
    return parsed.snapshot;
  }
}
