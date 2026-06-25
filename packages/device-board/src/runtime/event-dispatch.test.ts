import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SCENARIO_COLLECTOR_CONFIG,
  createReferenceValue,
  type ScenarioSubgraph,
} from '@membrana/core';

import { COLLECT_EVENT_OUT_HANDLE } from '../graph/collect-node-shared.js';
import { CollectRuntimeStore } from './collect-runtime-store.js';
import { TrackRuntimeStore } from './track-runtime-store.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { runSubgraphOnce } from './exec-subgraph.js';
import {
  dispatchCollectEventBranches,
  findEventBranchTargets,
  shouldDetachEventDispatch,
} from './event-dispatch.js';
import { ScenarioVariableStore } from './variable-store.js';

describe('findEventBranchTargets (DBC5)', () => {
  it('returns downstream exec-in targets for event-out edges', () => {
    const subgraph: ScenarioSubgraph = {
      entry: 'cs',
      nodes: [
        { id: 'cs', nodeKind: 'collect-samples', blockKind: 'custom', label: 'Collect' },
        { id: 'nt', nodeKind: 'make-track', blockKind: 'custom', label: 'MakeTrack' },
        { id: 'p', nodeKind: 'print', blockKind: 'custom', label: 'Print' },
      ],
      edges: [
        {
          id: 'ev1',
          kind: 'event',
          source: 'cs',
          sourceHandle: COLLECT_EVENT_OUT_HANDLE,
          target: 'nt',
          targetHandle: 'exec-in',
        },
        {
          id: 'ev2',
          kind: 'event',
          source: 'cs',
          sourceHandle: COLLECT_EVENT_OUT_HANDLE,
          target: 'p',
          targetHandle: 'exec-in',
        },
      ],
    };

    expect(findEventBranchTargets(subgraph, 'cs', COLLECT_EVENT_OUT_HANDLE)).toEqual(['nt', 'p']);
    expect(findEventBranchTargets(subgraph, 'cs', 'missing')).toEqual([]);
  });
});

describe('runSubgraphOnce collect event dispatch (DBC5 E2E)', () => {
  it('dispatches MakeTrack on CollectSamples flush and continues exec-out', async () => {
    const sampleRef = createReferenceValue('AudioSampleRef', 'sample-1');
    const streamRef = createReferenceValue('AudioStreamRef', 'stream:dev-1');
    const createTrackFromSampleRefs = vi.fn(async () => ({ trackId: 'track-1' }));
    const printLine = vi.fn();

    const host = createStubScenarioRuntimeHost({
      getDeviceHandle: () => 'dev-1',
      printLine,
      getActiveAudioStreamRef: () => streamRef,
      captureAudioSample: vi.fn(async () => undefined),
      getCapturedAudioSampleRef: (nodeId) => (nodeId === 'gs' ? sampleRef : null),
      appendRecorderSample: vi.fn(() => true),
      flushRecorderSession: vi.fn(() => ({
        deviceHandle: 'dev-1',
        sessionHandle: 'recorder:dev-1',
        refs: [sampleRef],
        flushedAtIso: new Date().toISOString(),
      })),
      createTrackFromSampleRefs,
    });

    const subgraph: ScenarioSubgraph = {
      entry: 'dg',
      nodes: [
        { id: 'dg', nodeKind: 'device-global', blockKind: 'custom', label: 'GetDevice' },
        { id: 'gr', nodeKind: 'get-recorder', blockKind: 'custom', label: 'GetRecorder' },
        { id: 'gas', nodeKind: 'get-audio-stream', blockKind: 'custom', label: 'GetAudioStream' },
        { id: 'gs', nodeKind: 'get-sample', blockKind: 'custom', label: 'GetSample' },
        {
          id: 'cs',
          nodeKind: 'collect-samples',
          blockKind: 'custom',
          label: 'CollectSamples',
          collectorConfig: {
            ...DEFAULT_SCENARIO_COLLECTOR_CONFIG,
            queueCapacity: 1,
            windowSec: 999,
          },
        },
        { id: 'nt', nodeKind: 'make-track', blockKind: 'custom', label: 'MakeTrack' },
        { id: 'tail', nodeKind: 'print', blockKind: 'custom', label: 'TailPrint' },
      ],
      edges: [
        { id: 'x1', kind: 'exec', source: 'dg', sourceHandle: 'exec-out', target: 'gr', targetHandle: 'exec-in' },
        { id: 'x2', kind: 'exec', source: 'gr', sourceHandle: 'exec-out', target: 'gas', targetHandle: 'exec-in' },
        { id: 'x3', kind: 'exec', source: 'gas', sourceHandle: 'exec-out', target: 'gs', targetHandle: 'exec-in' },
        { id: 'x4', kind: 'exec', source: 'gs', sourceHandle: 'exec-out', target: 'cs', targetHandle: 'exec-in' },
        { id: 'x5', kind: 'exec', source: 'cs', sourceHandle: 'exec-out', target: 'tail', targetHandle: 'exec-in' },
        { id: 'd1', kind: 'data', source: 'dg', sourceHandle: 'device', target: 'gr', targetHandle: 'device', dataType: 'DeviceRef' },
        { id: 'd2', kind: 'data', source: 'gr', sourceHandle: 'recorder', target: 'cs', targetHandle: 'recorder', dataType: 'RecorderRef' },
        { id: 'd3', kind: 'data', source: 'gas', sourceHandle: 'stream', target: 'gs', targetHandle: 'stream', dataType: 'AudioStreamRef' },
        { id: 'd4', kind: 'data', source: 'gs', sourceHandle: 'sample', target: 'cs', targetHandle: 'sample', dataType: 'AudioSampleRef' },
        { id: 'd5', kind: 'data', source: 'cs', sourceHandle: 'batches', target: 'nt', targetHandle: 'samples', dataType: 'AudioSampleRefList' },
        { id: 'd6', kind: 'data', source: 'gr', sourceHandle: 'recorder', target: 'nt', targetHandle: 'recorder', dataType: 'RecorderRef' },
        {
          id: 'ev1',
          kind: 'event',
          source: 'cs',
          sourceHandle: COLLECT_EVENT_OUT_HANDLE,
          target: 'nt',
          targetHandle: 'exec-in',
        },
      ],
    };

    const variableStore = new ScenarioVariableStore();
    const collectStore = new CollectRuntimeStore();
    const trackStore = new TrackRuntimeStore();

    await runSubgraphOnce(subgraph, host, new AbortController().signal, {
      branch: 'main',
      variableStore,
      collectStore,
      trackStore,
      resolveContext: {
        deviceHandle: 'dev-1',
        getActiveAudioStreamRef: () => streamRef,
        getRecorderSessionRef: (deviceHandle) =>
          createReferenceValue('RecorderRef', `recorder:${deviceHandle}`),
        getCapturedAudioSampleRef: (nodeId) => (nodeId === 'gs' ? sampleRef : null),
        getCollectBatchRef: (nodeId) => collectStore.getLastBatchRef(nodeId),
      },
    });

    expect(createTrackFromSampleRefs).toHaveBeenCalledWith('nt', [sampleRef]);
    expect(printLine).toHaveBeenCalled();
  });
});

describe('dispatchCollectEventBranches detach (AP v1 R8)', () => {
  const slowSubgraph: ScenarioSubgraph = {
    entry: 'listener',
    nodes: [
      { id: 'listener', nodeKind: 'on-async-resolved', blockKind: 'custom', label: 'Listener' },
      { id: 'print', nodeKind: 'print', blockKind: 'custom', label: 'Print' },
    ],
    edges: [
      {
        id: 'ev1',
        kind: 'event',
        source: 'listener',
        sourceHandle: COLLECT_EVENT_OUT_HANDLE,
        target: 'print',
        targetHandle: 'exec-in',
      },
    ],
  };

  it('shouldDetachEventDispatch is true for on-async-resolved', () => {
    expect(shouldDetachEventDispatch(slowSubgraph, 'listener')).toBe(true);
    expect(shouldDetachEventDispatch(slowSubgraph, 'print')).toBe(false);
  });

  it('detach returns before slow event branch completes', async () => {
    const log = vi.fn();
    let releasePrint: (() => void) | undefined;
    const printGate = new Promise<void>((resolve) => {
      releasePrint = resolve;
    });
    const printLine = vi.fn(async () => {
      await printGate;
    });
    const host = createStubScenarioRuntimeHost({ log, printLine });
    const variableStore = new ScenarioVariableStore();
    const signal = new AbortController().signal;
    const options = {
      branch: 'main' as const,
      variableStore,
      resolveContext: {},
    };

    const dispatchPromise = dispatchCollectEventBranches({
      subgraph: slowSubgraph,
      sourceNodeId: 'listener',
      eventOutHandle: COLLECT_EVENT_OUT_HANDLE,
      host,
      signal,
      options,
      callbacks: {},
      lastDetection: null,
      detach: true,
    });

    const startedAt = performance.now();
    await dispatchPromise;
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(50);
    expect(log).toHaveBeenCalledWith(
      'event-dispatch-detached-start',
      expect.objectContaining({ sourceNodeId: 'listener', targets: ['print'] }),
    );
    expect(log).not.toHaveBeenCalledWith(
      'event-dispatch-detached-done',
      expect.any(Object),
    );

    releasePrint?.();
    await vi.waitFor(() => {
      expect(log).toHaveBeenCalledWith(
        'event-dispatch-detached-done',
        expect.objectContaining({ sourceNodeId: 'listener', targets: ['print'] }),
      );
    });
  });

  it('detach skips branch when signal already aborted', async () => {
    const log = vi.fn();
    const printLine = vi.fn();
    const host = createStubScenarioRuntimeHost({ log, printLine });
    const variableStore = new ScenarioVariableStore();
    const abortController = new AbortController();
    abortController.abort();

    void dispatchCollectEventBranches({
      subgraph: slowSubgraph,
      sourceNodeId: 'listener',
      eventOutHandle: COLLECT_EVENT_OUT_HANDLE,
      host,
      signal: abortController.signal,
      options: {
        branch: 'main',
        variableStore,
        resolveContext: {},
      },
      callbacks: {},
      lastDetection: null,
      detach: true,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(printLine).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('event-dispatch-detached-done', expect.any(Object));
  });
});
