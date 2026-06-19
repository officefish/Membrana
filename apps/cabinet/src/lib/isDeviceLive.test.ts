import { describe, expect, it } from 'vitest';

import { DEVICE_OFFLINE_RUN_HINT, isDeviceLive } from './isDeviceLive';

describe('isDeviceLive (cabinet)', () => {
  it('returns false without deviceId', () => {
    expect(isDeviceLive(null, new Set(['dev-1']))).toBe(false);
    expect(isDeviceLive(undefined, new Set(['dev-1']))).toBe(false);
    expect(isDeviceLive('', new Set(['dev-1']))).toBe(false);
  });

  it('returns true when deviceId is in online set', () => {
    expect(isDeviceLive('dev-1', new Set(['dev-1', 'dev-2']))).toBe(true);
  });

  it('returns false when paired but offline', () => {
    expect(isDeviceLive('dev-1', new Set())).toBe(false);
    expect(isDeviceLive('dev-1', new Set(['dev-2']))).toBe(false);
  });

  it('exports offline hint for a11y', () => {
    expect(DEVICE_OFFLINE_RUN_HINT).toBe('нет связи с устройством');
  });
});
