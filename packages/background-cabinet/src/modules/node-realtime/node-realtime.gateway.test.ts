import { describe, expect, it, vi } from 'vitest';

import { NODE_REALTIME_EVENT_TYPES, type NodeRealtimeEnvelope } from '../../domain/node-realtime-wire';
import { deviceCaptureExpiresAt } from '../../domain/device-capture';
import { DeviceCaptureRegistry } from './device-capture.registry';
import { NodeRealtimeGateway } from './node-realtime.gateway';
import type { NodeRealtimeService } from './node-realtime.service';
import type { NodeRealtimeJournalHandler } from './node-realtime-journal.handler';
import type { NodeRealtimeSocketMeta } from './node-realtime.service';

function buildGateway() {
  const realtimeService = {
    fanOutToCabinet: vi.fn(),
    sendToNode: vi.fn(),
    recordPresenceHeartbeat: vi.fn().mockResolvedValue(undefined),
  } as unknown as NodeRealtimeService;
  const journalHandler = {
    handleIncoming: vi.fn().mockResolvedValue(undefined),
  } as unknown as NodeRealtimeJournalHandler;
  const captureRegistry = new DeviceCaptureRegistry();

  const gateway = new NodeRealtimeGateway(
    { NODE_REALTIME_ENABLED: true } as never,
    {} as never,
    realtimeService,
    journalHandler,
    captureRegistry,
  );
  gateway.onModuleDestroy();
  return { gateway, realtimeService, journalHandler, captureRegistry };
}

/** Активный захват d-устройства кабинетом m1 (тариф v2). */
function registerCapture(
  registry: DeviceCaptureRegistry,
  mediaDeviceId: string,
  mode: 'soft' | 'hard' = 'soft',
): void {
  registry.set(mediaDeviceId, {
    membraneId: 'm1',
    nodeId: 'n1',
    sessionId: 'sess-1',
    mode,
    expiresAt: deviceCaptureExpiresAt(),
  });
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
  it('PL2b: принимает heartbeat только от аутентифицированного deviceId', async () => {
    const { gateway, realtimeService } = buildGateway();
    const valid: NodeRealtimeEnvelope = {
      v: 1,
      channel: 'presence',
      type: NODE_REALTIME_EVENT_TYPES.presence.heartbeat,
      ts: '2026-07-05T09:00:00.000Z',
      payload: { deviceId: 'd1', timestampMs: 1 },
    };
    const spoofed: NodeRealtimeEnvelope = {
      ...valid,
      payload: { deviceId: 'd2', timestampMs: 2 },
    };

    await gateway.dispatchEnvelope(nodeMeta, valid);
    await gateway.dispatchEnvelope(nodeMeta, spoofed);

    expect(realtimeService.recordPresenceHeartbeat).toHaveBeenCalledTimes(1);
    expect(realtimeService.recordPresenceHeartbeat).toHaveBeenCalledWith('d1');
  });

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

  it('routes runtime.command from cabinet to the node socket when device is captured (CT2)', async () => {
    const { gateway, realtimeService, captureRegistry } = buildGateway();
    registerCapture(captureRegistry, 'd1');
    const envelope: NodeRealtimeEnvelope = {
      v: 1,
      channel: 'runtime',
      type: NODE_REALTIME_EVENT_TYPES.runtime.command,
      ts: '2026-06-18T09:00:00.000Z',
      payload: { action: 'run', scenarioId: 'scn-1' },
    };

    await gateway.dispatchEnvelope(cabinetMeta, envelope);

    expect(realtimeService.sendToNode).toHaveBeenCalledWith('d1', envelope);
  });

  it('routes runtime.command to the target deviceId from payload (multi-node)', async () => {
    const { gateway, realtimeService, captureRegistry } = buildGateway();
    registerCapture(captureRegistry, 'd2');
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

  it('rejects runtime.command without an active capture (канон §1: без захвата нет контроля)', async () => {
    const { gateway, realtimeService } = buildGateway();
    const envelope: NodeRealtimeEnvelope = {
      v: 1,
      channel: 'runtime',
      type: NODE_REALTIME_EVENT_TYPES.runtime.command,
      ts: '2026-07-02T09:00:00.000Z',
      payload: { action: 'run' },
    };

    await gateway.dispatchEnvelope(cabinetMeta, envelope);

    expect(realtimeService.sendToNode).not.toHaveBeenCalled();
  });

  it('rejects runtime.command outside tariff v2 whitelist even with capture (канон §4.1)', async () => {
    const { gateway, realtimeService, captureRegistry } = buildGateway();
    registerCapture(captureRegistry, 'd1');
    for (const payload of [
      { action: 'setMode', mode: 'alarm' },
      { action: 'pause' },
      { action: 'resume' },
    ]) {
      const envelope: NodeRealtimeEnvelope = {
        v: 1,
        channel: 'runtime',
        type: NODE_REALTIME_EVENT_TYPES.runtime.command,
        ts: '2026-07-02T09:00:00.000Z',
        payload,
      };
      await gateway.dispatchEnvelope(cabinetMeta, envelope);
    }

    expect(realtimeService.sendToNode).not.toHaveBeenCalled();
  });

  it('rejects runtime.command when capture belongs to another membrane', async () => {
    const { gateway, realtimeService, captureRegistry } = buildGateway();
    captureRegistry.set('d1', {
      membraneId: 'm-other',
      nodeId: 'n1',
      sessionId: 'sess-9',
      mode: 'soft',
      expiresAt: deviceCaptureExpiresAt(),
    });
    const envelope: NodeRealtimeEnvelope = {
      v: 1,
      channel: 'runtime',
      type: NODE_REALTIME_EVENT_TYPES.runtime.command,
      ts: '2026-07-02T09:00:00.000Z',
      payload: { action: 'stop', fadeOutMs: 0 },
    };

    await gateway.dispatchEnvelope(cabinetMeta, envelope);

    expect(realtimeService.sendToNode).not.toHaveBeenCalled();
  });

  it('forwards selectScenario and stop{fadeOutMs} under capture (tariff v2 whitelist)', async () => {
    const { gateway, realtimeService, captureRegistry } = buildGateway();
    registerCapture(captureRegistry, 'd1', 'hard');
    const select: NodeRealtimeEnvelope = {
      v: 1,
      channel: 'runtime',
      type: NODE_REALTIME_EVENT_TYPES.runtime.command,
      ts: '2026-07-02T09:00:00.000Z',
      payload: { action: 'selectScenario', scenarioId: 'scn-7' },
    };
    const stop: NodeRealtimeEnvelope = {
      v: 1,
      channel: 'runtime',
      type: NODE_REALTIME_EVENT_TYPES.runtime.command,
      ts: '2026-07-02T09:00:01.000Z',
      payload: { action: 'stop', fadeOutMs: 200 },
    };

    await gateway.dispatchEnvelope(cabinetMeta, select);
    await gateway.dispatchEnvelope(cabinetMeta, stop);

    expect(realtimeService.sendToNode).toHaveBeenNthCalledWith(1, 'd1', select);
    expect(realtimeService.sendToNode).toHaveBeenNthCalledWith(2, 'd1', stop);
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

describe('NodeRealtimeGateway board channel (server-first SF2)', () => {
  const editLeasePayload = {
    deviceId: 'd1',
    holder: 'cabinet' as const,
    sessionId: 'sess-1',
    revision: 3,
    expiresAt: '2026-06-26T12:00:00.000Z',
  };

  it('fans out board.edit-lease from node to cabinet subscribers', async () => {
    const { gateway, realtimeService, journalHandler } = buildGateway();
    const envelope: NodeRealtimeEnvelope = {
      v: 1,
      channel: 'board',
      type: NODE_REALTIME_EVENT_TYPES.board.editLease,
      ts: '2026-06-18T09:00:00.000Z',
      payload: editLeasePayload,
    };

    await gateway.dispatchEnvelope(nodeMeta, envelope);

    expect(realtimeService.fanOutToCabinet).toHaveBeenCalledWith('m1', envelope);
    expect(journalHandler.handleIncoming).not.toHaveBeenCalled();
  });

  it('routes board.edit-lease from cabinet to node and fans out to cabinet', async () => {
    const { gateway, realtimeService } = buildGateway();
    const envelope: NodeRealtimeEnvelope = {
      v: 1,
      channel: 'board',
      type: NODE_REALTIME_EVENT_TYPES.board.editLease,
      ts: '2026-06-18T09:00:00.000Z',
      payload: editLeasePayload,
    };

    await gateway.dispatchEnvelope(cabinetMeta, envelope);

    expect(realtimeService.fanOutToCabinet).toHaveBeenCalledWith('m1', envelope);
    expect(realtimeService.sendToNode).toHaveBeenCalledWith('d1', envelope);
  });

  it('routes board.capture-state to target deviceId from payload (multi-node)', async () => {
    const { gateway, realtimeService } = buildGateway();
    const envelope: NodeRealtimeEnvelope = {
      v: 1,
      channel: 'board',
      type: NODE_REALTIME_EVENT_TYPES.board.captureState,
      ts: '2026-06-18T09:00:00.000Z',
      payload: {
        deviceId: 'd2',
        authority: 'cabinet',
        followerMode: 'strict',
        isRunning: true,
        isPaused: false,
      },
    };

    await gateway.dispatchEnvelope(cabinetMeta, envelope);

    expect(realtimeService.fanOutToCabinet).toHaveBeenCalledWith('m1', envelope);
    expect(realtimeService.sendToNode).toHaveBeenCalledWith('d2', envelope);
  });

  it('drops board.capture/heartbeat/release arriving over WS (server-originated only, CT2)', async () => {
    const { gateway, realtimeService } = buildGateway();
    for (const type of [
      NODE_REALTIME_EVENT_TYPES.board.capture,
      NODE_REALTIME_EVENT_TYPES.board.heartbeat,
      NODE_REALTIME_EVENT_TYPES.board.release,
    ]) {
      const envelope: NodeRealtimeEnvelope = {
        v: 1,
        channel: 'board',
        type,
        ts: '2026-07-02T09:00:00.000Z',
        payload: {
          deviceId: 'd1',
          mode: 'hard',
          sessionId: 'sess-1',
          acquiredAt: '2026-07-02T09:00:00.000Z',
          expiresAt: '2026-07-02T09:05:00.000Z',
        },
      };
      await gateway.dispatchEnvelope(cabinetMeta, envelope);
      await gateway.dispatchEnvelope(nodeMeta, envelope);
    }

    expect(realtimeService.fanOutToCabinet).not.toHaveBeenCalled();
    expect(realtimeService.sendToNode).not.toHaveBeenCalled();
  });

  it('drops invalid board.edit-lease payloads', async () => {
    const { gateway, realtimeService } = buildGateway();
    const envelope: NodeRealtimeEnvelope = {
      v: 1,
      channel: 'board',
      type: NODE_REALTIME_EVENT_TYPES.board.editLease,
      ts: '2026-06-18T09:00:00.000Z',
      payload: { deviceId: 'd1', holder: 'cabinet', revision: 1, expiresAt: null },
    };

    await gateway.dispatchEnvelope(cabinetMeta, envelope);

    expect(realtimeService.fanOutToCabinet).not.toHaveBeenCalled();
    expect(realtimeService.sendToNode).not.toHaveBeenCalled();
  });
});
