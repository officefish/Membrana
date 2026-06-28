import type { RuntimeCommandPayload, RuntimeFollowerMode, RuntimeMode } from '@membrana/core';

export type CabinetRunFollowerMode = RuntimeFollowerMode;

/** Server-first: кабинет инициирует run с authority=cabinet (default follower soft). */
export function buildCabinetRunCommand(
  deviceId: string,
  followerMode: CabinetRunFollowerMode = 'soft',
): RuntimeCommandPayload {
  return {
    action: 'run',
    deviceId,
    authority: 'cabinet',
    followerMode,
  };
}

export function buildCabinetStopCommand(deviceId: string): RuntimeCommandPayload {
  return { action: 'stop', deviceId };
}

export function buildCabinetPauseCommand(deviceId: string): RuntimeCommandPayload {
  return { action: 'pause', deviceId };
}

export function buildCabinetResumeCommand(deviceId: string): RuntimeCommandPayload {
  return { action: 'resume', deviceId };
}

export function buildCabinetSetModeCommand(
  deviceId: string,
  mode: RuntimeMode,
): RuntimeCommandPayload {
  return { action: 'setMode', mode, deviceId };
}
