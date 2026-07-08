import { describe, expect, it, vi } from 'vitest';

import { NODE_REALTIME_EVENT_TYPES } from '../../domain/node-realtime-wire';
import type { PrismaService } from '../../prisma/prisma.service';

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

function mockPrisma(recentDeviceIds: string[] = [], entitledSkus: string[] = []) {
  return {
    device: {
      findMany: vi.fn().mockResolvedValue(
        recentDeviceIds.map((mediaDeviceId) => ({ mediaDeviceId })),
      ),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    membrane: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ tariffId: 'free-v1', tariff: { entitledTariffSkus: entitledSkus } }),
    },
  } as unknown as PrismaService;
}

function buildService(prisma = mockPrisma()): NodeRealtimeService {
  return new NodeRealtimeService(prisma);
}

describe('NodeRealtimeService', () => {
  it('fanOutToCabinet sends envelope to subscribers', async () => {
    const service = buildService();
    const cabinetSocket = mockSocket();
    const nodeSocket = mockSocket();

    await service.registerCabinet(
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

  it('registerNode освежает Device.lastSeenAt в БД на реконнекте (TD2, PCB4 хвост)', async () => {
    const prisma = mockPrisma();
    const service = buildService(prisma);

    service.registerNode(
      { role: 'node', userId: 'u1', membraneId: 'm1', nodeId: 'n1', mediaDeviceId: 'd1' },
      mockSocket(),
    );
    await new Promise((r) => setTimeout(r, 0)); // fire-and-forget

    const updateMany = prisma.device.updateMany as ReturnType<typeof vi.fn>;
    expect(updateMany).toHaveBeenCalledWith({
      where: { mediaDeviceId: 'd1' },
      data: { lastSeenAt: expect.any(Date) },
    });
  });

  it('registerNode шлёт узлу node.entitlements с тарифным контекстом (csp-2/G1)', async () => {
    const prisma = mockPrisma([], ['pro-usercases-v1']);
    const service = buildService(prisma);
    const nodeSocket = mockSocket();

    service.registerNode(
      { role: 'node', userId: 'u1', membraneId: 'm1', nodeId: 'n1', mediaDeviceId: 'd1' },
      nodeSocket,
    );
    await new Promise((r) => setTimeout(r, 0)); // fire-and-forget

    const send = nodeSocket.send as ReturnType<typeof vi.fn>;
    const entitlements = send.mock.calls
      .map((call) => JSON.parse(call[0] as string))
      .find((env) => env.type === 'node.entitlements');
    expect(entitlements).toBeDefined();
    expect(entitlements.payload).toEqual({
      tariffId: 'free-v1',
      entitledTariffSkus: ['pro-usercases-v1'],
    });
  });

  it('registerNode без mediaDeviceId не трогает БД', async () => {
    const prisma = mockPrisma();
    const service = buildService(prisma);
    service.registerNode(
      { role: 'node', userId: 'u1', membraneId: 'm1', nodeId: 'n1', mediaDeviceId: '' },
      mockSocket(),
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(prisma.device.updateMany as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it('registerCabinet отправляет presence.snapshot с онлайн-узлами своей membrane (PL1)', async () => {
    const service = buildService();

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
    await service.registerCabinet(
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

  it('registerCabinet без онлайн-узлов шлёт пустой снапшот (PL1)', async () => {
    const service = buildService();
    const cabinetSocket = mockSocket();
    await service.registerCabinet(
      { role: 'cabinet', userId: 'u1', membraneId: 'm1', nodeId: 'n1', mediaDeviceId: 'd1' },
      cabinetSocket,
    );
    const sent = (cabinetSocket.send as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => JSON.parse(c[0] as string))
      .find((e) => e.type === NODE_REALTIME_EVENT_TYPES.presence.snapshot);
    expect(sent).toBeDefined();
    expect(sent.payload.onlineDeviceIds).toEqual([]);
  });

  it('registerCabinet добавляет recent lastSeenAt устройства после рестарта (PL2b)', async () => {
    const prisma = mockPrisma(['recent-d1']);
    const service = buildService(prisma);
    const cabinetSocket = mockSocket();

    await service.registerCabinet(
      { role: 'cabinet', userId: 'u1', membraneId: 'm1', nodeId: null, mediaDeviceId: null },
      cabinetSocket,
    );

    const sent = (cabinetSocket.send as ReturnType<typeof vi.fn>).mock.calls
      .map((call) => JSON.parse(call[0] as string))
      .find((envelope) => envelope.type === NODE_REALTIME_EVENT_TYPES.presence.snapshot);
    expect(sent.payload.onlineDeviceIds).toEqual(['recent-d1']);
    expect(prisma.device.findMany).toHaveBeenCalledWith({
      where: {
        node: { membraneId: 'm1' },
        pairingStatus: 'paired',
        lastSeenAt: { gt: expect.any(Date) },
      },
      select: { mediaDeviceId: true },
    });
  });

  it('recordPresenceHeartbeat обновляет lastSeenAt по mediaDeviceId серверным временем', async () => {
    const prisma = mockPrisma();
    const service = buildService(prisma);

    await service.recordPresenceHeartbeat('d1');

    expect(prisma.device.updateMany).toHaveBeenCalledWith({
      where: { mediaDeviceId: 'd1' },
      data: { lastSeenAt: expect.any(Date) },
    });
  });

  it('ackJournalAppend sends cursor to node socket', () => {
    const service = buildService();
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
      const service = buildService();
      await expect(service.pingNode('nope')).resolves.toEqual({
        reachable: false,
        latencyMs: null,
      });
    });

    it('pong с тем же pingId → reachable:true + latencyMs', async () => {
      const service = buildService();
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
        const service = buildService();
        registerNodeSocket(service);
        const pending = service.pingNode('d1', 3000);
        await vi.advanceTimersByTimeAsync(3000);
        await expect(pending).resolves.toEqual({ reachable: false, latencyMs: null });
      } finally {
        vi.useRealTimers();
      }
    });

    it('поздний pong после таймаута игнорируется (нет висящего промиса)', async () => {
      const service = buildService();
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
