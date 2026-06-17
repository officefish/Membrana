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
});
