import { describe, expect, it } from 'vitest';

import type { DeviceCaptureView } from '@/api/deviceCapture';
import { capturesByDeviceId } from './captureSnapshot';

function capture(deviceId: string, overrides: Partial<DeviceCaptureView> = {}): DeviceCaptureView {
  return {
    deviceId,
    mode: 'soft',
    sessionId: 'session-1',
    acquiredAt: '2026-07-07T10:00:00.000Z',
    expiresAt: '2026-07-07T10:05:00.000Z',
    ...overrides,
  };
}

describe('capturesByDeviceId (CX2)', () => {
  it('строит карту по deviceId', () => {
    const result = capturesByDeviceId([capture('dev-1'), capture('dev-2', { mode: 'hard' })]);
    expect(Object.keys(result)).toEqual(['dev-1', 'dev-2']);
    expect(result['dev-2'].mode).toBe('hard');
  });

  it('пустой снапшот = ни одного захвата (полная замена, не мердж)', () => {
    expect(capturesByDeviceId([])).toEqual({});
  });
});
