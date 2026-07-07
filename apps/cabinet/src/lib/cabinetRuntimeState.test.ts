import { describe, expect, it } from 'vitest';

import type { DeviceCaptureView } from '@/api/deviceCapture';
import {
  INITIAL_CABINET_RUNTIME_SNAPSHOT,
  applyBoardCapture,
  applyCaptureHeartbeat,
  applyCaptureRelease,
  applyCapturesBootstrap,
  applyConnection,
  applyPresenceOffline,
  applyPresenceOnline,
  applyPresenceSnapshot,
  applyRuntimeState,
  applyScenarioList,
  type CabinetRuntimeSnapshot,
} from './cabinetRuntimeState';

const initial = INITIAL_CABINET_RUNTIME_SNAPSHOT;

function capture(deviceId: string, overrides: Partial<DeviceCaptureView> = {}): DeviceCaptureView {
  return {
    deviceId,
    mode: 'soft',
    sessionId: 'sess-1',
    acquiredAt: '2026-07-07T10:00:00.000Z',
    expiresAt: '2026-07-07T10:05:00.000Z',
    ...overrides,
  };
}

describe('cabinetRuntimeState (CX6)', () => {
  it('presence.snapshot — авторитетная полная замена набора (PL1)', () => {
    let state: CabinetRuntimeSnapshot = applyPresenceOnline(initial, 'stale-device');
    state = applyPresenceSnapshot(state, { onlineDeviceIds: ['d1', 'd2'], timestampMs: 1 });

    expect([...state.onlineDeviceIds].sort()).toEqual(['d1', 'd2']);
    expect(state.onlineDeviceIds.has('stale-device')).toBe(false);
  });

  it('online/offline — точечные правки, идемпотентные по ссылке', () => {
    const one = applyPresenceOnline(initial, 'd1');
    expect(applyPresenceOnline(one, 'd1')).toBe(one);

    const gone = applyPresenceOffline(one, 'd1');
    expect(gone.onlineDeviceIds.size).toBe(0);
    expect(applyPresenceOffline(gone, 'd1')).toBe(gone);
  });

  it('bootstrap захватов заменяет карту целиком и подтягивает сценарии CX3', () => {
    const seeded = applyBoardCapture(initial, {
      deviceId: 'stale',
      mode: 'soft',
      sessionId: 's0',
      acquiredAt: '2026-07-07T09:00:00.000Z',
      expiresAt: '2026-07-07T09:05:00.000Z',
    });
    const state = applyCapturesBootstrap(seeded, [
      capture('d1', {
        scenarios: [{ id: 'ws-1', title: 'Спектр' }],
        selectedScenarioId: 'ws-1',
      }),
    ]);

    expect(Object.keys(state.captures)).toEqual(['d1']);
    expect(state.scenarioLists['d1']).toEqual({
      scenarios: [{ id: 'ws-1', title: 'Спектр' }],
      selectedScenarioId: 'ws-1',
    });
  });

  it('capture lifecycle: capture → heartbeat той же сессии → release', () => {
    let state = applyBoardCapture(initial, {
      deviceId: 'd1',
      mode: 'hard',
      sessionId: 's1',
      acquiredAt: '2026-07-07T10:00:00.000Z',
      expiresAt: '2026-07-07T10:05:00.000Z',
    });

    state = applyCaptureHeartbeat(state, {
      deviceId: 'd1',
      sessionId: 's1',
      expiresAt: '2026-07-07T10:10:00.000Z',
    });
    expect(state.captures['d1'].expiresAt).toBe('2026-07-07T10:10:00.000Z');

    // heartbeat чужой сессии игнорируется
    const foreign = applyCaptureHeartbeat(state, {
      deviceId: 'd1',
      sessionId: 's-other',
      expiresAt: '2026-07-07T11:00:00.000Z',
    });
    expect(foreign).toBe(state);

    const released = applyCaptureRelease(state, {
      deviceId: 'd1',
      sessionId: 's1',
      reason: 'operator',
    });
    expect('d1' in released.captures).toBe(false);
    expect(applyCaptureRelease(released, { deviceId: 'd1', sessionId: null, reason: 'operator' })).toBe(
      released,
    );
  });

  it('scenario-list — авторитетная замена по deviceId', () => {
    const state = applyScenarioList(initial, {
      deviceId: 'd1',
      scenarios: [
        { id: 'ws-1', title: 'Спектр' },
        { id: 'ws-2', title: 'Нейро' },
      ],
      selectedScenarioId: 'ws-2',
    });

    expect(state.scenarioLists['d1'].selectedScenarioId).toBe('ws-2');
  });

  it('runtime state пишется по deviceId; connection не создаёт новый снимок без изменений', () => {
    const state = applyRuntimeState(initial, {
      deviceId: 'd1',
      phase: 'main',
      isRunning: true,
      mode: 'normal',
      alarmLoopIteration: 0,
      lastError: null,
    });
    expect(state.states['d1'].isRunning).toBe(true);

    expect(applyConnection(initial, 'disconnected')).toBe(initial);
    expect(applyConnection(initial, 'connected').connection).toBe('connected');
  });
});
