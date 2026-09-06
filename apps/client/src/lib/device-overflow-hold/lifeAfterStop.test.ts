import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/nodeRealtimeUrl', () => ({
  getCabinetRealtimeWsUrl: () => 'ws://localhost:3020/v1/nodes/realtime',
}));

import { NODE_PRESENCE_HEARTBEAT_INTERVAL_MS } from '@membrana/core';

import { getNodeRealtimeClient, resetNodeRealtimeClientForTests } from '@/lib/nodeRealtimeClient';
import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';

import { resetDeviceOverflowHoldForTests } from './deviceOverflowHold';
import { applyLocalGuardFromQuota } from './localGuard';
import type { DeviceOverflowHold } from './types';
import { OVERFLOW_HOLD_QUOTA_READ_INTERVAL_MS, startOverflowHoldVitals } from './vitals';

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

const MB = 1048576;
const TEN_MINUTES = 10 * 60_000;

const REFUSAL = {
  reason: 'device_buffer_full',
  overflowId: 'ovf-1',
  overflowAt: '2026-09-05T21:40:18.000Z',
  overflowPolicy: 'stop' as const,
  buffer: { usedBytes: 1024 * MB, limitBytes: 1024 * MB },
  userStorage: null,
};

function heartbeatsOf(socket: MockWebSocket): number {
  return socket.sent.map((raw) => JSON.parse(raw)).filter((e) => e.type === 'presence.heartbeat').length;
}

/**
 * M4 (а), #2309: после стопа обязаны жить heartbeat узла (120 с) и чтение квоты (≥ 1/мин).
 * Анти-паттерн ночи 05→06.09 — «остановили не то»: канал умер, пробы стучали.
 */
describe('жизнь после остановки — heartbeat и чтение квоты живут при удержании', () => {
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
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('heartbeat идёт каждые 120 с и после входа в удержание — ни один не пропущен', () => {
    const client = getNodeRealtimeClient();
    client.connectNode(pairing);
    const socket = MockWebSocket.instances[0]!;
    socket.emitOpen();

    vi.advanceTimersByTime(NODE_PRESENCE_HEARTBEAT_INTERVAL_MS);
    const beforeHold = heartbeatsOf(socket);
    expect(beforeHold).toBe(2);

    hold.activateFromServer(REFUSAL);
    expect(hold.isHeld()).toBe(true);

    vi.advanceTimersByTime(TEN_MINUTES);

    // 10 минут / 120 с = 5 новых heartbeat поверх двух — канал живёт.
    expect(heartbeatsOf(socket)).toBe(beforeHold + 5);
    expect(client.getState()).toBe('connected');
  });

  it('квота читается ≥ 1/мин, пока удержание активно; на сбросе чтение останавливается', () => {
    const readQuota = vi.fn();
    const stop = startOverflowHoldVitals({ hold, readQuota });

    vi.advanceTimersByTime(TEN_MINUTES);
    expect(readQuota).toHaveBeenCalledTimes(0); // без удержания читать нечего — штатный поллинг не наш

    hold.activateFromServer(REFUSAL);
    vi.advanceTimersByTime(TEN_MINUTES);

    // Первое чтение — сразу на входе, дальше раз в минуту: ≥ 10 за 10 минут.
    expect(readQuota.mock.calls.length).toBeGreaterThanOrEqual(10);
    expect(OVERFLOW_HOLD_QUOTA_READ_INTERVAL_MS).toBeLessThanOrEqual(60_000);

    const afterHold = readQuota.mock.calls.length;
    hold.release('human');
    vi.advanceTimersByTime(TEN_MINUTES);
    expect(readQuota.mock.calls.length).toBe(afterHold);

    stop();
  });

  it('чтение квоты с уже свободным местом не возобновляет запись само (порча: авто-resume → красный)', () => {
    const readQuota = vi.fn(() => {
      applyLocalGuardFromQuota(hold, { usedBytes: 0, limitBytes: 1024 * MB }, 'stop');
    });
    const stop = startOverflowHoldVitals({ hold, readQuota });
    hold.activateFromServer(REFUSAL);

    vi.advanceTimersByTime(TEN_MINUTES);

    expect(readQuota.mock.calls.length).toBeGreaterThanOrEqual(10);
    expect(hold.isHeld()).toBe(true);
    stop();
  });

  it('vitals стартуют по уже активному (восстановленному) удержанию', () => {
    hold.activateFromServer(REFUSAL);
    const readQuota = vi.fn();
    const stop = startOverflowHoldVitals({ hold, readQuota });
    vi.advanceTimersByTime(60_000 * 3);
    expect(readQuota.mock.calls.length).toBeGreaterThanOrEqual(3);
    stop();
    vi.advanceTimersByTime(60_000 * 3);
    expect(readQuota.mock.calls.length).toBeLessThanOrEqual(4);
  });
});
