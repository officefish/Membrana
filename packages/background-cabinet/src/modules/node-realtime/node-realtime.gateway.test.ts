import { describe, expect, it, vi } from 'vitest';

import { NODE_REALTIME_EVENT_TYPES, type NodeRealtimeEnvelope } from '../../domain/node-realtime-wire';
import { NodeRealtimeGateway } from './node-realtime.gateway';
import type { NodeRealtimeService } from './node-realtime.service';
import type { NodeRealtimeJournalHandler } from './node-realtime-journal.handler';
import type { NodeRealtimeSocketMeta } from './node-realtime.service';

function buildGateway() {
  const realtimeService = {
    fanOutToCabinet: vi.fn(),
    sendToNode: vi.fn(),
  } as unknown as NodeRealtimeService;
  const journalHandler = {
    handleIncoming: vi.fn().mockResolvedValue(undefined),
  } as unknown as NodeRealtimeJournalHandler;

  const gateway = new NodeRealtimeGateway(
    { NODE_REALTIME_ENABLED: true } as never,
    {} as never,
    realtimeService,
    journalHandler,
  );
  gateway.onModuleDestroy();
  return { gateway, realtimeService, journalHandler };
}

const nodeMeta: NodeRealtimeSocketMeta = {
  role: 'node',
  userId: 'u1',
  membraneId: 'm1',
  nodeId: 'n1',
  mediaDeviceId: 'd1',
};

const cabinetMeta: NodeRealtimeSocketMeta = {
  role: 'cabinet',
  userId: 'u1',
  membraneId: 'm1',
  nodeId: 'n1',
  mediaDeviceId: 'd1',
};

describe('NodeRealtimeGateway runtime channel (MP7b)', () => {
  it('fans out runtime.state from node to cabinet subscribers', async () => {
    const { gateway, realtimeService, journalHandler } = buildGateway();
    const envelope: NodeRealtimeEnvelope = {
      v: 1,
      channel: 'runtime',
      type: NODE_REALTIME_EVENT_TYPES.runtime.state,
      ts: '2026-06-18T09:00:00.000Z',
      payload: { phase: 'main', isRunning: true, mode: 'normal' },
    };

    await gateway.dispatchEnvelope(nodeMeta, envelope);

    expect(realtimeService.fanOutToCabinet).toHaveBeenCalledWith('m1', envelope);
    expect(journalHandler.handleIncoming).not.toHaveBeenCalled();
  });

  it('routes runtime.command from cabinet to the node socket', async () => {
    const { gateway, realtimeService } = buildGateway();
    const envelope: NodeRealtimeEnvelope = {
      v: 1,
      channel: 'runtime',
      type: NODE_REALTIME_EVENT_TYPES.runtime.command,
      ts: '2026-06-18T09:00:00.000Z',
      payload: { action: 'setMode', mode: 'alarm' },
    };

    await gateway.dispatchEnvelope(cabinetMeta, envelope);

    expect(realtimeService.sendToNode).toHaveBeenCalledWith('d1', envelope);
  });

  it('routes runtime.command to the target deviceId from payload (multi-node)', async () => {
    const { gateway, realtimeService } = buildGateway();
    const envelope: NodeRealtimeEnvelope = {
      v: 1,
      channel: 'runtime',
      type: NODE_REALTIME_EVENT_TYPES.runtime.command,
      ts: '2026-06-18T09:00:00.000Z',
      payload: { action: 'run', deviceId: 'd2' },
    };

    await gateway.dispatchEnvelope(cabinetMeta, envelope);

    // payload.deviceId перебивает привязанный к подключению meta.mediaDeviceId ('d1')
    expect(realtimeService.sendToNode).toHaveBeenCalledWith('d2', envelope);
  });

  it('still delegates journal envelopes from node to the journal handler', async () => {
    const { gateway, journalHandler } = buildGateway();
    const envelope: NodeRealtimeEnvelope = {
      v: 1,
      channel: 'journal',
      type: NODE_REALTIME_EVENT_TYPES.journal.append,
      ts: '2026-06-18T09:00:00.000Z',
      payload: { clientEntryId: 'c1' },
    };

    await gateway.dispatchEnvelope(nodeMeta, envelope);

    expect(journalHandler.handleIncoming).toHaveBeenCalledWith(nodeMeta, envelope);
  });
});
