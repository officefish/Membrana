import { describe, expect, it } from 'vitest';

import { DEVICE_OFFLINE_RUN_HINT, isDeviceLive } from './isDeviceLive';

describe('isDeviceLive (client)', () => {
  it('autonomous mode is always live', () => {
    expect(isDeviceLive(null, 'autonomous', 'disconnected')).toBe(true);
    expect(isDeviceLive('dev-1', 'autonomous', 'disconnected')).toBe(true);
  });

  it('paired requires WS connected', () => {
    expect(isDeviceLive('dev-1', 'paired', 'connected')).toBe(true);
    expect(isDeviceLive('dev-1', 'paired', 'disconnected')).toBe(false);
    expect(isDeviceLive('dev-1', 'paired', 'reconnecting')).toBe(false);
  });

  it('paired without deviceId is not live', () => {
    expect(isDeviceLive(null, 'paired', 'connected')).toBe(false);
  });

  it('null mode is not live', () => {
    expect(isDeviceLive('dev-1', null, 'connected')).toBe(false);
  });

  it('exports offline hint for a11y', () => {
    expect(DEVICE_OFFLINE_RUN_HINT).toBe('нет связи с устройством');
  });
});
