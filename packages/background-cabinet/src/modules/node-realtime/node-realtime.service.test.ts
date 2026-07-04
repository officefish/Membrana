import { describe, expect, it, vi } from 'vitest';

import { NODE_REALTIME_EVENT_TYPES } from '../../domain/node-realtime-wire';

import { NodeRealtimeService } from './node-realtime.service.js';

function mockSocket() {
  return {
    readyState: 1,
    OPEN: 1,
    send: vi.fn(),
    close: vi.fn(),
    ping: vi.fn(),
  } as unknown as import('ws').WebSocket;
}

describe('NodeRealtimeService', () => {
  it('fanOutToCabinet sends envelope to subscribers', () => {
    const service = new NodeRealtimeService();
    const cabinetSocket = mockSocket();
    const nodeSocket = mockSocket();

    service.registerCabinet(
      {
        role: 'cabinet',
        userId: 'u1',
        membraneId: 'm1',
        nodeId: 'n1',
        mediaDeviceId: 'd1',
      },
      cabinetSocket,
    );

    service.registerNode(
      {
        role: 'node',
        userId: 'u1',
        membraneId: 'm1',
        nodeId: 'n1',
        mediaDeviceId: 'd1',
      },
      nodeSocket,
    );

    (cabinetSocket.send as ReturnType<typeof vi.fn>).mockClear();

    service.fanOutToCabinet('m1', {
      v: 1,
      channel: 'journal',
      type: NODE_REALTIME_EVENT_TYPES.journal.append,
      ts: '2026-06-17T12:00:00.000Z',
      payload: { clientEntryId: 'c1' },
    });

    expect(cabinetSocket.send).toHaveBeenCalledTimes(1);
  });

  it('registerCabinet отправляет presence.snapshot с онлайн-узлами своей membrane (PL1)', () => {
    const service = new NodeRealtimeService();

    // Узел membrane m1 онлайн до подключения кабинета — корневой сценарий бага.
    service.registerNode(
      { role: 'node', userId: 'u1', membraneId: 'm1', nodeId: 'n1', mediaDeviceId: 'd1' },
      mockSocket(),
    );
    // Узел чужой membrane не должен попасть в снапшот.
    service.registerNode(
      { role: 'node', userId: 'u2', membraneId: 'm2', nodeId: 'n2', mediaDeviceId: 'd2' },
      mockSocket(),
    );

    const cabinetSocket = mockSocket();
    service.registerCabinet(
      { role: 'cabinet', userId: 'u1', membraneId: 'm1', nodeId: 'n1', mediaDeviceId: 'd1' },
      cabinetSocket,
    );

    const sent = (cabinetSocket.send as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => JSON.parse(c[0] as string))
      .find((e) => e.type === NODE_REALTIME_EVENT_TYPES.presence.snapshot);
    expect(sent).toBeDefined();
    expect(sent.payload.onlineDeviceIds).toEqual(['d1']);
    expect(typeof sent.payload.timestampMs).toBe('number');
  });

  it('registerCabinet без онлайн-узлов шлёт пустой снапшот (PL1)', () => {
    const service = new NodeRealtimeService();
    const cabinetSocket = mockSocket();
    service.registerCabinet(
      { role: 'cabinet', userId: 'u1', membraneId: 'm1', nodeId: 'n1', mediaDeviceId: 'd1' },
      cabinetSocket,
    );
    const sent = (cabinetSocket.send as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => JSON.parse(c[0] as string))
      .find((e) => e.type === NODE_REALTIME_EVENT_TYPES.presence.snapshot);
    expect(sent).toBeDefined();
    expect(sent.payload.onlineDeviceIds).toEqual([]);
  });

  it('ackJournalAppend sends cursor to node socket', () => {
    const service = new NodeRealtimeService();
    const nodeSocket = mockSocket();

    service.registerNode(
      {
        role: 'node',
        userId: 'u1',
        membraneId: 'm1',
        nodeId: 'n1',
        mediaDeviceId: 'd1',
      },
      nodeSocket,
    );

    const ack = service.ackJournalAppend('d1', 'entry-1');
    expect(ack.clientEntryId).toBe('entry-1');
    expect(nodeSocket.send).toHaveBeenCalled();
  });

  describe('pingNode (PCB6)', () => {
    function registerNodeSocket(service: NodeRealtimeService) {
      const nodeSocket = mockSocket();
      service.registerNode(
        { role: 'node', userId: 'u1', membraneId: 'm1', nodeId: 'n1', mediaDeviceId: 'd1' },
        nodeSocket,
      );
      (nodeSocket.send as ReturnType<typeof vi.fn>).mockClear();
      return nodeSocket;
    }

    function sentPingId(nodeSocket: import('ws').WebSocket): string {
      const call = (nodeSocket.send as ReturnType<typeof vi.fn>).mock.calls
        .map((c) => JSON.parse(c[0] as string))
        .find((e) => e.type === NODE_REALTIME_EVENT_TYPES.presence.healthPing);
      return call.payload.pingId as string;
    }

    it('узел не live (нет сокета) → reachable:false без ожидания', async () => {
      const service = new NodeRealtimeService();
      await expect(service.pingNode('nope')).resolves.toEqual({
        reachable: false,
        latencyMs: null,
      });
    });

    it('pong с тем же pingId → reachable:true + latencyMs', async () => {
      const service = new NodeRealtimeService();
      const nodeSocket = registerNodeSocket(service);
      const pending = service.pingNode('d1');
      const pingId = sentPingId(nodeSocket);
      service.handleHealthPong(pingId);
      const result = await pending;
      expect(result.reachable).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('нет pong до таймаута → reachable:false', async () => {
      vi.useFakeTimers();
      try {
        const service = new NodeRealtimeService();
        registerNodeSocket(service);
        const pending = service.pingNode('d1', 3000);
        await vi.advanceTimersByTimeAsync(3000);
        await expect(pending).resolves.toEqual({ reachable: false, latencyMs: null });
      } finally {
        vi.useRealTimers();
      }
    });

    it('поздний pong после таймаута игнорируется (нет висящего промиса)', async () => {
      const service = new NodeRealtimeService();
      const nodeSocket = registerNodeSocket(service);
      const pending = service.pingNode('d1', 3000);
      const pingId = sentPingId(nodeSocket);
      service.handleHealthPong(pingId);
      await pending;
      // Повторный pong — no-op, не бросает.
      expect(() => service.handleHealthPong(pingId)).not.toThrow();
    });
  });
});
