import { describe, expect, it, vi } from 'vitest';
import {
  createReferenceValue,
  createScenarioVariable,
  type ScenarioSubgraph,
} from '@membrana/core';

import { PALETTE_VALUE_HANDLE } from '../graph/palette-node.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { runSubgraphOnce } from './exec-subgraph.js';
import { executeScenarioBlock } from './block-executor.js';
import { ScenarioVariableStore } from './variable-store.js';
import { MAX_SUBGRAPH_EXEC_STEPS } from './runtime-timing.js';

function cyclicSubgraph(): ScenarioSubgraph {
  return {
    entry: 'a',
    nodes: [
      { id: 'a', blockKind: 'write-journal', position: { x: 0, y: 0 }, label: 'A' },
      { id: 'b', blockKind: 'write-journal', position: { x: 0, y: 0 }, label: 'B' },
      { id: 'c', blockKind: 'write-journal', position: { x: 0, y: 0 }, label: 'C' },
    ],
    edges: [
      { source: 'a', sourceHandle: 'exec-out', target: 'b', targetHandle: 'exec-in', kind: 'exec' },
      { source: 'b', sourceHandle: 'exec-out', target: 'c', targetHandle: 'exec-in', kind: 'exec' },
      { source: 'c', sourceHandle: 'exec-out', target: 'b', targetHandle: 'exec-in', kind: 'exec' },
    ],
  };
}

describe('runSubgraphOnce', () => {
  it('aborts exec cycle without loop-repeat after step limit', async () => {
    const host = createStubScenarioRuntimeHost({
      writeJournal: vi.fn(async () => undefined),
    });
    const signal = new AbortController().signal;

    await expect(
      runSubgraphOnce(cyclicSubgraph(), host, signal, { branch: 'onConnect' }),
    ).rejects.toThrow(`${MAX_SUBGRAPH_EXEC_STEPS} exec steps`);
  });

  it('skips pure policy constructor on legacy exec chain (transparent passthrough)', async () => {
    const log = vi.fn();
    const printLine = vi.fn();
    const host = createStubScenarioRuntimeHost({ log, printLine });
    const variableStore = new ScenarioVariableStore();
    const subgraph: ScenarioSubgraph = {
      entry: 'evt',
      nodes: [
        { id: 'evt', nodeKind: 'event', blockKind: 'custom', label: 'Tick', eventVariant: 'loopTick' },
        {
          id: 'pol',
          nodeKind: 'make-recording-policy',
          blockKind: 'custom',
          label: 'Policy',
          pure: true,
          recordingPolicy: { windowSec: 3, captureFormat: 'wav' },
        },
        { id: 'pr', nodeKind: 'print', blockKind: 'custom', label: 'Print' },
      ],
      edges: [
        { source: 'evt', sourceHandle: 'exec-out', target: 'pol', targetHandle: 'exec-in', kind: 'exec' },
        { source: 'pol', sourceHandle: 'exec-out', target: 'pr', targetHandle: 'exec-in', kind: 'exec' },
        {
          source: 'evt',
          sourceHandle: 'datetime',
          target: 'pr',
          targetHandle: PALETTE_VALUE_HANDLE,
          kind: 'data',
          dataType: 'DateTime',
        },
      ],
    };

    await runSubgraphOnce(subgraph, host, new AbortController().signal, {
      branch: 'main',
      variableStore,
      resolveContext: {
        loopElapsedMs: 100,
        loopTickMs: 50,
        triggeredAt: '2026-06-21T10:00:00.000Z',
      },
    });

    expect(log).not.toHaveBeenCalledWith('make-recording-policy', expect.anything());
    expect(printLine).toHaveBeenCalledTimes(1);
  });

  it('skips pure variable-get on exec chain; impure getter logs', async () => {
    const log = vi.fn();
    const host = createStubScenarioRuntimeHost({ log });
    const micVar = {
      ...createScenarioVariable('var-mic', 'mic', 'MicrophoneRef'),
      value: createReferenceValue('MicrophoneRef', 'mic-1'),
    };
    const variableStore = new ScenarioVariableStore([micVar]);

    const pureSubgraph: ScenarioSubgraph = {
      entry: 'evt',
      nodes: [
        { id: 'evt', nodeKind: 'event', blockKind: 'custom', label: 'Tick', eventVariant: 'loopTick' },
        {
          id: 'vg',
          nodeKind: 'variable-get',
          blockKind: 'custom',
          variableId: micVar.id,
        },
        { id: 'pr', nodeKind: 'print', blockKind: 'custom', label: 'Print' },
      ],
      edges: [
        { source: 'evt', sourceHandle: 'exec-out', target: 'vg', targetHandle: 'exec-in', kind: 'exec' },
        { source: 'vg', sourceHandle: 'exec-out', target: 'pr', targetHandle: 'exec-in', kind: 'exec' },
      ],
    };

    await runSubgraphOnce(pureSubgraph, host, new AbortController().signal, {
      branch: 'main',
      variableStore,
      resolveContext: {},
    });
    expect(log).not.toHaveBeenCalledWith('variable-get', expect.anything());

    log.mockClear();
    const impureSubgraph: ScenarioSubgraph = {
      ...pureSubgraph,
      nodes: [
        pureSubgraph.nodes[0]!,
        { ...pureSubgraph.nodes[1]!, pure: false },
        pureSubgraph.nodes[2]!,
      ],
    };
    await runSubgraphOnce(impureSubgraph, host, new AbortController().signal, {
      branch: 'main',
      variableStore,
      resolveContext: {},
    });
    expect(log).toHaveBeenCalledWith(
      'variable-get',
      expect.objectContaining({ nodeId: 'vg', variableId: micVar.id }),
    );
  });
});

describe('executeScenarioBlock pure guards', () => {
  it('rejects policy constructor on direct exec invoke', async () => {
    const host = createStubScenarioRuntimeHost();
    await expect(
      executeScenarioBlock({
        host,
        signal: new AbortController().signal,
        branch: 'main',
        subgraph: { entry: 'pol', nodes: [], edges: [] },
        node: {
          id: 'pol',
          nodeKind: 'make-recording-policy',
          blockKind: 'custom',
          pure: true,
        },
        lastDetection: null,
        defaultChunkDurationMs: 5000,
        functions: [],
      }),
    ).rejects.toThrow(/pure and must not run on exec chain/);
  });
});
