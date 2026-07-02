import { BadRequestException } from '@nestjs/common';
import type { DeviceCaptureMode } from '../../domain/node-realtime-wire';

export interface CaptureDeviceDto {
  readonly mode: DeviceCaptureMode;
}

export function parseCaptureDeviceDto(raw: unknown): CaptureDeviceDto {
  const mode = (raw as { mode?: unknown } | null | undefined)?.mode;
  if (mode !== 'soft' && mode !== 'hard') {
    throw new BadRequestException("Capture mode must be 'soft' or 'hard'");
  }
  return { mode };
}
