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
  send(): void {}
}

describe('CabinetNodeRealtimeClient.connect идемпотентность (PCB3)', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.stubGlobal('window', { setTimeout, clearTimeout });
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
