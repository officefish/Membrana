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

  it('capture v2 soft: run/stop разрешены, edit/пауза заблокированы, controls видимы (CT5)', () => {
    const flags = resolveServerFirstFlags({
      deviceId,
      editLease: null,
      captureState: null,
      capture: { mode: 'soft', sessionId: 's1', expiresAt: '2026-06-26T12:05:00.000Z' },
      nowMs: now,
    });
    expect(flags.capturedByCabinet).toBe(true);
    expect(flags.captureMode).toBe('soft');
    expect(flags.blockLocalRun).toBe(false);
    expect(flags.allowFieldStop).toBe(true);
    expect(flags.allowFieldPause).toBe(false);
    expect(flags.allowFieldSetMode).toBe(false);
    expect(flags.blockStructureEdit).toBe(true);
    expect(flags.hideFieldRuntimeControls).toBe(false);
  });

  it('capture v2 hard: только emergency stop, controls видимы но run заблокирован', () => {
    const flags = resolveServerFirstFlags({
      deviceId,
      editLease: null,
      captureState: null,
      capture: { mode: 'hard', sessionId: 's1', expiresAt: '2026-06-26T12:05:00.000Z' },
      captureConnectionLost: true,
      nowMs: now,
    });
    expect(flags.captureMode).toBe('hard');
    expect(flags.blockLocalRun).toBe(true);
    expect(flags.allowFieldStop).toBe(true);
    expect(flags.captureConnectionLost).toBe(true);
    expect(flags.hideFieldRuntimeControls).toBe(false);
  });

  it('capture v2 приоритетнее v1 legacy captureState', () => {
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
      capture: { mode: 'soft', sessionId: 's1', expiresAt: '2026-06-26T12:05:00.000Z' },
      nowMs: now,
    });
    // v2 soft побеждает v1 strict: run разрешён, controls видимы.
    expect(flags.blockLocalRun).toBe(false);
    expect(flags.hideFieldRuntimeControls).toBe(false);
  });

  it('протухший capture v2 = отпущено; lastCaptureRelease даёт recentlyReleased', () => {
    const flags = resolveServerFirstFlags({
      deviceId,
      editLease: null,
      captureState: null,
      capture: { mode: 'hard', sessionId: 's1', expiresAt: '2026-06-26T11:59:00.000Z' },
      lastCaptureRelease: 'ttl-expired',
      nowMs: now,
    });
    expect(flags.capturedByCabinet).toBe(false);
    expect(flags.recentlyReleased).toBe(true);
    expect(flags.blockStructureEdit).toBe(false);
    expect(flags.blockLocalRun).toBe(false);
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
