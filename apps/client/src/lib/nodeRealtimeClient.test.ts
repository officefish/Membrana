import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/nodeRealtimeUrl', () => ({
  getCabinetRealtimeWsUrl: () => 'ws://localhost:3020/v1/nodes/realtime',
}));

import { getNodeRealtimeClient, resetNodeRealtimeClientForTests } from './nodeRealtimeClient';
import type { PairedNodeCredentials } from './nodeConnectionMode';

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
  emitClose(code: number): void {
    this.readyState = MockWebSocket.CLOSED;
    (this.listeners.close ?? []).forEach((h) => h({ code, reason: '' }));
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

describe('NodeRealtimeClient (PCB2/PCB3)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.stubGlobal('window', { setTimeout, clearTimeout, setInterval, clearInterval });
    resetNodeRealtimeClientForTests();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('PCB3: повторный connectNode с той же парой не пересоздаёт CONNECTING сокет', () => {
    const client = getNodeRealtimeClient();
    client.connectNode(pairing);
    client.connectNode(pairing);
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('PCB2: onAuthFailed срабатывает на close 4401', () => {
    const client = getNodeRealtimeClient();
    const onAuth = vi.fn();
    client.onAuthFailed(onAuth);
    client.connectNode(pairing);
    MockWebSocket.instances[0]!.emitClose(4401);
    expect(onAuth).toHaveBeenCalledTimes(1);
  });

  it('PCB2: onAuthFailed НЕ срабатывает на сетевой close 1006', () => {
    const client = getNodeRealtimeClient();
    const onAuth = vi.fn();
    client.onAuthFailed(onAuth);
    client.connectNode(pairing);
    MockWebSocket.instances[0]!.emitClose(1006);
    expect(onAuth).not.toHaveBeenCalled();
  });

  it('PL2b: heartbeat отправляется при open и каждые 120 секунд', () => {
    const client = getNodeRealtimeClient();
    client.connectNode(pairing);
    const socket = MockWebSocket.instances[0]!;

    socket.emitOpen();
    vi.advanceTimersByTime(120_000);

    const heartbeats = socket.sent
      .map((raw) => JSON.parse(raw))
      .filter((envelope) => envelope.type === 'presence.heartbeat');
    expect(heartbeats).toHaveLength(2);
    expect(heartbeats[0].payload.deviceId).toBe('dev-1');
  });

  it('PL2b: close останавливает heartbeat до reconnect', () => {
    const client = getNodeRealtimeClient();
    client.connectNode(pairing);
    const socket = MockWebSocket.instances[0]!;
    socket.emitOpen();
    socket.emitClose(1006);

    vi.advanceTimersByTime(120_000);

    const heartbeats = socket.sent
      .map((raw) => JSON.parse(raw))
      .filter((envelope) => envelope.type === 'presence.heartbeat');
    expect(heartbeats).toHaveLength(1);
  });
});
