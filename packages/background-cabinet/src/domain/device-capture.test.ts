import { describe, expect, it } from 'vitest';

import {
  DEVICE_CAPTURE_HEARTBEAT_INTERVAL_MS,
  DEVICE_CAPTURE_TTL_MS,
  deviceCaptureExpiresAt,
  isCabinetRuntimeCommandAllowed,
  isDeviceCaptureActive,
} from './device-capture';
import {
  parseBoardCaptureHeartbeatPayload,
  parseBoardCapturePayload,
  parseBoardCaptureReleasePayload,
  parseRuntimeCommandPayload,
} from './node-realtime-wire';

describe('device-capture domain (tariff v2)', () => {
  it('TTL math: expiresAt = from + 5 мин; heartbeat 2 мин покрывается дважды', () => {
    const from = new Date('2026-07-02T10:00:00.000Z');
    expect(deviceCaptureExpiresAt(from).toISOString()).toBe('2026-07-02T10:05:00.000Z');
    expect(DEVICE_CAPTURE_TTL_MS).toBeGreaterThan(DEVICE_CAPTURE_HEARTBEAT_INTERVAL_MS * 2);
    expect(isDeviceCaptureActive(deviceCaptureExpiresAt(from), from)).toBe(true);
    expect(isDeviceCaptureActive(from, from)).toBe(false);
  });

  it('tariff v2 whitelist: select/run/stop разрешены, pause/setMode — нет', () => {
    expect(isCabinetRuntimeCommandAllowed('selectScenario')).toBe(true);
    expect(isCabinetRuntimeCommandAllowed('run')).toBe(true);
    expect(isCabinetRuntimeCommandAllowed('stop')).toBe(true);
    expect(isCabinetRuntimeCommandAllowed('pause')).toBe(false);
    expect(isCabinetRuntimeCommandAllowed('resume')).toBe(false);
    expect(isCabinetRuntimeCommandAllowed('setMode')).toBe(false);
    expect(isCabinetRuntimeCommandAllowed('pause', 'v3')).toBe(true);
  });

  it('wire mirror: capture payload round-trip (синхрон с @membrana/core CT1)', () => {
    const capture = {
      deviceId: 'd1',
      mode: 'hard',
      sessionId: 's1',
      acquiredAt: '2026-07-02T10:00:00.000Z',
      expiresAt: '2026-07-02T10:05:00.000Z',
    };
    expect(parseBoardCapturePayload(capture)).toEqual(capture);
    expect(parseBoardCapturePayload({ ...capture, mode: 'strict' })).toBeNull();
    expect(
      parseBoardCaptureHeartbeatPayload({
        deviceId: 'd1',
        sessionId: 's1',
        expiresAt: '2026-07-02T10:07:00.000Z',
      }),
    ).not.toBeNull();
    expect(
      parseBoardCaptureReleasePayload({ deviceId: 'd1', reason: 'ttl-expired' }),
    ).toEqual({ deviceId: 'd1', sessionId: null, reason: 'ttl-expired' });
  });

  it('wire mirror: runtime.command selectScenario/stop{fadeOutMs}', () => {
    expect(
      parseRuntimeCommandPayload({ action: 'selectScenario', scenarioId: 'scn-1' }),
    ).toEqual({ action: 'selectScenario', scenarioId: 'scn-1' });
    expect(parseRuntimeCommandPayload({ action: 'stop', fadeOutMs: 200 })).toEqual({
      action: 'stop',
      fadeOutMs: 200,
    });
    expect(parseRuntimeCommandPayload({ action: 'stop', fadeOutMs: -5 })).toBeNull();
    expect(parseRuntimeCommandPayload({ action: 'selectScenario' })).toBeNull();
  });
});
