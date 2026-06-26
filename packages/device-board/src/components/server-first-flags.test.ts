import { describe, expect, it } from 'vitest';

import { isCabinetEditLeaseActive, resolveServerFirstFlags } from './server-first-flags.js';

const deviceId = 'dev-1';
const now = Date.parse('2026-06-26T12:00:00.000Z');

describe('resolveServerFirstFlags', () => {
  it('field authority allows local run and full controls', () => {
    const flags = resolveServerFirstFlags({
      deviceId,
      editLease: null,
      captureState: {
        deviceId,
        authority: 'field',
        followerMode: null,
        isRunning: true,
        isPaused: false,
      },
      nowMs: now,
    });
    expect(flags.blockLocalRun).toBe(false);
    expect(flags.hideFieldRuntimeControls).toBe(false);
  });

  it('cabinet authority soft blocks run but allows pause/stop/mode', () => {
    const flags = resolveServerFirstFlags({
      deviceId,
      editLease: null,
      captureState: {
        deviceId,
        authority: 'cabinet',
        followerMode: 'soft',
        isRunning: true,
        isPaused: false,
      },
      nowMs: now,
    });
    expect(flags.blockLocalRun).toBe(true);
    expect(flags.allowFieldPause).toBe(true);
    expect(flags.hideFieldRuntimeControls).toBe(false);
  });

  it('cabinet authority strict hides runtime controls', () => {
    const flags = resolveServerFirstFlags({
      deviceId,
      editLease: null,
      captureState: {
        deviceId,
        authority: 'cabinet',
        followerMode: 'strict',
        isRunning: true,
        isPaused: false,
      },
      nowMs: now,
    });
    expect(flags.hideFieldRuntimeControls).toBe(true);
    expect(flags.allowFieldStop).toBe(false);
  });

  it('cabinet edit lease active for matching device and expiry', () => {
    expect(
      isCabinetEditLeaseActive(
        {
          deviceId,
          holder: 'cabinet',
          sessionId: 's1',
          revision: 1,
          expiresAt: '2026-06-26T12:10:00.000Z',
        },
        deviceId,
        now,
      ),
    ).toBe(true);
    expect(
      isCabinetEditLeaseActive(
        {
          deviceId,
          holder: 'cabinet',
          sessionId: 's1',
          revision: 1,
          expiresAt: '2026-06-26T11:00:00.000Z',
        },
        deviceId,
        now,
      ),
    ).toBe(false);
  });
});
