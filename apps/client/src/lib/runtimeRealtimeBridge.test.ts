import {
  NODE_REALTIME_EVENT_TYPES,
  createNodeRealtimeEnvelope,
  type RuntimeCommandPayload,
} from '@membrana/core';
import { createIdleScenarioRuntimeState } from '@membrana/device-board';
import { describe, expect, it, vi } from 'vitest';

import {
  applyRuntimeCommand,
  isRuntimeCommandEnvelope,
  runtimeStateToPayload,
  type RuntimeBridgeController,
} from './runtimeRealtimeBridge';

function fakeController(): RuntimeBridgeController & {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  setMode: ReturnType<typeof vi.fn>;
} {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    setMode: vi.fn(),
  };
}

describe('runtimeRealtimeBridge helpers', () => {
  it('runtimeStateToPayload projects scalars + mode', () => {
    const state = {
      ...createIdleScenarioRuntimeState(),
      phase: 'main' as const,
      isRunning: true,
      activeBranch: 'main' as const,
      mainLoopIteration: 3,
    };
    const payload = runtimeStateToPayload(state, 'alarm');
    expect(payload).toEqual({
      phase: 'main',
      isRunning: true,
      isPaused: false,
      mode: 'alarm',
      activeBranch: 'main',
      activeNodeId: null,
      mainLoopIteration: 3,
      alarmLoopIteration: 0,
      lastError: null,
    });
  });

  it('isRuntimeCommandEnvelope detects runtime.command only', () => {
    const cmd = createNodeRealtimeEnvelope('runtime', NODE_REALTIME_EVENT_TYPES.runtime.command, {
      action: 'run',
    } satisfies RuntimeCommandPayload);
    const state = createNodeRealtimeEnvelope('runtime', NODE_REALTIME_EVENT_TYPES.runtime.state, {});
    const journal = createNodeRealtimeEnvelope('journal', NODE_REALTIME_EVENT_TYPES.journal.append, {});
    expect(isRuntimeCommandEnvelope(cmd)).toBe(true);
    expect(isRuntimeCommandEnvelope(state)).toBe(false);
    expect(isRuntimeCommandEnvelope(journal)).toBe(false);
  });

  it('applyRuntimeCommand routes run/stop/setMode', () => {
    const controller = fakeController();

    expect(applyRuntimeCommand(controller, { action: 'run' })).toBe(true);
    expect(controller.start).toHaveBeenCalledTimes(1);

    expect(applyRuntimeCommand(controller, { action: 'stop' })).toBe(true);
    expect(controller.stop).toHaveBeenCalledTimes(1);

    expect(applyRuntimeCommand(controller, { action: 'setMode', mode: 'alarm' })).toBe(true);
    expect(controller.setMode).toHaveBeenCalledWith('alarm');

    expect(applyRuntimeCommand(controller, { action: 'pause' })).toBe(true);
    expect(controller.pause).toHaveBeenCalledTimes(1);

    expect(applyRuntimeCommand(controller, { action: 'resume' })).toBe(true);
    expect(controller.resume).toHaveBeenCalledTimes(1);
  });
});
