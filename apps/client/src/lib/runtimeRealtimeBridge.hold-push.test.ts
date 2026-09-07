import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/nodeRealtimeUrl', () => ({
  getCabinetRealtimeWsUrl: () => 'ws://localhost:3020/v1/nodes/realtime',
}));

const controllerState = {
  phase: 'main' as const,
  isRunning: true,
  isPaused: false,
  activeBranch: 'main',
  activeNodeId: null,
  mainLoopIteration: 1,
  alarmLoopIteration: 0,
  lastError: null,
};
const controllerListeners = new Set<(state: typeof controllerState) => void>();

vi.mock('@/lib/deviceBoardRuntimeController', () => ({
  getDeviceBoardRuntimeController: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    getState: () => controllerState,
    getMode: () => 'normal',
    subscribe: (listener: (state: typeof controllerState) => void) => {
      controllerListeners.add(listener);
      return () => controllerListeners.delete(listener);
    },
  }),
}));

import { getNodeRealtimeClient, resetNodeRealtimeClientForTests } from '@/lib/nodeRealtimeClient';
import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';
import { resetDeviceOverflowHoldForTests, type DeviceOverflowHold } from '@/lib/device-overflow-hold';

import { startRuntimeRealtimeBridge, stopRuntimeRealtimeBridge } from './runtimeRealtimeBridge';

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  static instances: MockWebSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  private listeners: Record<string, Array<(e: unknown) => void>> = {};
  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }
  addEventListener(type: string, handler: (e: unknown) => void): void {
    (this.listeners[type] ??= []).push(handler);
  }
  emitOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    (this.listeners.open ?? []).forEach((h) => h({}));
  }
  close(): void {
    this.readyState = MockWebSocket.CLOSED;
  }
  send(raw: string): void {
    this.sent.push(raw);
  }
}

const pairing: PairedNodeCredentials = {
  token: 'tok-1',
  expiresAt: '2026-12-31T00:00:00.000Z',
  deviceId: 'dev-1',
  mediaToken: 'mtok',
  mediaApiUrl: 'http://localhost:3010',
  membraneId: 'm1',
  nodeId: 'n1',
  nodeLabel: 'node',
};

const REFUSAL = {
  reason: 'device_buffer_full',
  overflowId: 'ovf-1',
  overflowAt: '2026-09-05T21:40:18.000Z',
  overflowPolicy: 'stop' as const,
  buffer: null,
  userStorage: null,
};

function runtimeStates(socket: MockWebSocket) {
  return socket.sent.map((raw) => JSON.parse(raw)).filter((e) => e.type === 'runtime.state');
}

/** M4 (а)/#2309: push состояния при входе в удержание, повышении id и сбросе. */
describe('runtimeRealtimeBridge — push runtime.state по смене удержания', () => {
  let hold: DeviceOverflowHold;

  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.stubGlobal('window', { setTimeout, clearTimeout, setInterval, clearInterval });
    resetNodeRealtimeClientForTests();
    hold = resetDeviceOverflowHoldForTests();
  });

  afterEach(() => {
    stopRuntimeRealtimeBridge();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('вход → повышение → сброс дают три push, повторные отказы того же id — ни одного', () => {
    const client = getNodeRealtimeClient();
    client.connectNode(pairing);
    const socket = MockWebSocket.instances[0]!;
    socket.emitOpen();
    startRuntimeRealtimeBridge();

    const base = runtimeStates(socket).length;

    hold.activateFromLocalGuard({ reason: 'device_buffer_full', buffer: { usedBytes: 1, limitBytes: 1 }, policy: 'stop' });
    expect(runtimeStates(socket)).toHaveLength(base + 1);
    expect(runtimeStates(socket).at(-1)?.payload.overflowHold).toMatchObject({ phase: 'held_local', overflowId: null });

    hold.activateFromServer(REFUSAL);
    expect(runtimeStates(socket)).toHaveLength(base + 2);
    expect(runtimeStates(socket).at(-1)?.payload.overflowHold).toMatchObject({ phase: 'held', overflowId: 'ovf-1' });
    expect(runtimeStates(socket).at(-1)?.payload.phase).toBe('main');

    for (let i = 0; i < 100; i += 1) hold.activateFromServer(REFUSAL);
    expect(runtimeStates(socket)).toHaveLength(base + 2);

    hold.release('human');
    expect(runtimeStates(socket)).toHaveLength(base + 3);
    expect(runtimeStates(socket).at(-1)?.payload.overflowHold).toBeNull();
  });
});
