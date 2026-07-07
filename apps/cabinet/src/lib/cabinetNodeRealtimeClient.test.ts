import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/auth', () => ({ getStoredToken: () => 'tok-1' }));
vi.mock('@/lib/nodeRealtimeUrl', () => ({
  getCabinetRealtimeWsUrl: () => 'ws://localhost:3000/v1/nodes/realtime',
}));

import {
  getCabinetNodeRealtimeClient,
  resetCabinetNodeRealtimeClientForTests,
} from './cabinetNodeRealtimeClient';

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  static instances: MockWebSocket[] = [];
  readyState = 0;
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
    (this.listeners.close ?? []).forEach((h) => h({ code: 1000, reason: '' }));
  }
  sent: string[] = [];
  send(data?: string): void {
    if (typeof data === 'string') this.sent.push(data);
  }
}

describe('CabinetNodeRealtimeClient.connect идемпотентность (PCB3)', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.stubGlobal('window', { setTimeout, clearTimeout, setInterval, clearInterval });
    resetCabinetNodeRealtimeClientForTests();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('повторный connect с той же membrane не пересоздаёт CONNECTING сокет', () => {
    const client = getCabinetNodeRealtimeClient();
    client.connect('m1');
    expect(MockWebSocket.instances).toHaveLength(1);

    // Сокет ещё CONNECTING — повторный connect (StrictMode/ре-рендер) = no-op.
    client.connect('m1');
    client.connect('m1');
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('после open повторный connect той же membrane тоже no-op', () => {
    const client = getCabinetNodeRealtimeClient();
    client.connect('m1');
    MockWebSocket.instances[0]!.emitOpen();
    expect(client.getState()).toBe('connected');

    client.connect('m1');
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('смена membrane пересоздаёт сокет', () => {
    const client = getCabinetNodeRealtimeClient();
    client.connect('m1');
    MockWebSocket.instances[0]!.emitOpen();
    client.connect('m2');
    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it('закрытие вытесненного сокета не даёт реконнект-петли', () => {
    const client = getCabinetNodeRealtimeClient();
    client.connect('m1');
    const first = MockWebSocket.instances[0]!;
    client.connect('m2'); // вытесняет first (openSocket закрыл его)
    const before = MockWebSocket.instances.length;
    // Запоздалое закрытие старого сокета не должно плодить реконнекты.
    first.close();
    expect(MockWebSocket.instances.length).toBe(before);
  });
});

describe('NB2: keepalive кабинетной линии (анти-idle)', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.stubGlobal('window', {
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      setInterval: (fn: () => void, ms: number) => setInterval(fn, ms),
      clearInterval: (id: ReturnType<typeof setInterval>) => clearInterval(id),
    });
    resetCabinetNodeRealtimeClientForTests();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('после open шлёт presence.heartbeat периодически', () => {
    const client = getCabinetNodeRealtimeClient();
    client.connect('m1');
    const ws = MockWebSocket.instances[0]!;
    ws.emitOpen();
    expect(ws.sent).toHaveLength(0);

    vi.advanceTimersByTime(46_000);
    expect(ws.sent).toHaveLength(1);
    const frame = JSON.parse(ws.sent[0]!) as { channel: string; type: string };
    expect(frame.channel).toBe('presence');
    expect(frame.type).toBe('presence.heartbeat');

    vi.advanceTimersByTime(46_000);
    expect(ws.sent).toHaveLength(2);
  });

  it('после close keepalive останавливается', () => {
    const client = getCabinetNodeRealtimeClient();
    client.connect('m1');
    const ws = MockWebSocket.instances[0]!;
    ws.emitOpen();
    client.disconnect();
    const sentBefore = ws.sent.length;
    vi.advanceTimersByTime(120_000);
    expect(ws.sent.length).toBe(sentBefore);
  });
});
