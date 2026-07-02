import { Injectable } from '@nestjs/common';
import { isDeviceCaptureActive } from '../../domain/device-capture';
import type { DeviceCaptureMode } from '../../domain/node-realtime-wire';

export interface DeviceCaptureEntry {
  readonly membraneId: string;
  readonly nodeId: string;
  readonly sessionId: string;
  readonly mode: DeviceCaptureMode;
  readonly expiresAt: Date;
}

/**
 * In-memory снимок активных захватов для синхронного enforcement в gateway
 * (канон v2.0 §4: без захвата у кабинета нет контроля). Пишет DeviceCaptureService,
 * читает NodeRealtimeGateway — отдельный provider, чтобы не завязывать
 * NodeRealtimeModule на DeviceCaptureModule циклически.
 */
@Injectable()
export class DeviceCaptureRegistry {
  private readonly captures = new Map<string, DeviceCaptureEntry>();

  set(mediaDeviceId: string, entry: DeviceCaptureEntry): void {
    this.captures.set(mediaDeviceId, entry);
  }

  delete(mediaDeviceId: string): void {
    this.captures.delete(mediaDeviceId);
  }

  /** Активный захват устройства; протухший (TTL) считается отсутствующим. */
  get(mediaDeviceId: string, now: Date = new Date()): DeviceCaptureEntry | null {
    const entry = this.captures.get(mediaDeviceId);
    if (!entry) {
      return null;
    }
    if (!isDeviceCaptureActive(entry.expiresAt, now)) {
      this.captures.delete(mediaDeviceId);
      return null;
    }
    return entry;
  }

  entries(): ReadonlyMap<string, DeviceCaptureEntry> {
    return this.captures;
  }

  clear(): void {
    this.captures.clear();
  }
}
