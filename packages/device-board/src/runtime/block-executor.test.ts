import { describe, expect, it, vi } from 'vitest';

import { PALETTE_VALUE_HANDLE } from '../graph/palette-node.js';
import { executeScenarioBlock } from './block-executor.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { ScenarioVariableStore } from './variable-store.js';
import type { ScenarioSubgraph } from '@membrana/core';

describe('executeScenarioBlock print', () => {
  const variableStore = new ScenarioVariableStore();
  const subgraph: ScenarioSubgraph = {
    nodes: [
      {
        id: 'print-1',
        nodeKind: 'print',
        blockKind: 'custom',
        label: 'Print',
      },
    ],
    edges: [],
  };

  it('prints datetime to printLine when value input resolves DateTime', async () => {
    const printLine = vi.fn();
    const host = createStubScenarioRuntimeHost({ printLine, variableStore });
    const subgraphWithEdge: ScenarioSubgraph = {
      nodes: [
        { id: 'evt', nodeKind: 'event', blockKind: 'custom', label: 'On connect' },
        subgraph.nodes[0]!,
      ],
      edges: [
        {
          id: 'd1',
          kind: 'data',
          source: 'evt',
          sourceHandle: 'datetime',
          target: 'print-1',
          targetHandle: PALETTE_VALUE_HANDLE,
          dataType: 'DateTime',
        },
      ],
    };

    await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'onConnect',
      subgraph: subgraphWithEdge,
      node: subgraphWithEdge.nodes[1]!,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore,
      resolveContext: {
        handlerBranch: 'onConnect',
        deviceHandle: 'dev-1',
        serverHandle: 'srv-1',
        triggeredAt: '2026-06-18T12:00:00.000Z',
      },
    });

    expect(printLine).toHaveBeenCalledWith('2026-06-18T12:00:00.000Z');
  });

  it('invokes onPrintOutput with formatted message', async () => {
    const onPrintOutput = vi.fn();
    const host = createStubScenarioRuntimeHost({ variableStore });
    const subgraphWithEdge: ScenarioSubgraph = {
      nodes: [
        { id: 'evt', nodeKind: 'event', blockKind: 'custom', label: 'On connect' },
        subgraph.nodes[0]!,
      ],
      edges: [
        {
          id: 'd1',
          kind: 'data',
          source: 'evt',
          sourceHandle: 'datetime',
          target: 'print-1',
          targetHandle: PALETTE_VALUE_HANDLE,
          dataType: 'DateTime',
        },
      ],
    };

    await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'onConnect',
      subgraph: subgraphWithEdge,
      node: subgraphWithEdge.nodes[1]!,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore,
      resolveContext: {
        handlerBranch: 'onConnect',
        triggeredAt: '2026-06-18T12:00:00.000Z',
      },
      onPrintOutput,
    });

    expect(onPrintOutput).toHaveBeenCalledWith('print-1', '2026-06-18T12:00:00.000Z');
  });

  it('prints server metadata on onConnect', async () => {
    const printLine = vi.fn();
    const host = createStubScenarioRuntimeHost({
      printLine,
      variableStore,
      getResourceMetadata: () => ({
        fields: { mediaApiUrl: 'http://localhost:3010', membraneId: 'mem-1' },
      }),
    });
    const subgraphWithEdge: ScenarioSubgraph = {
      nodes: [
        { id: 'evt', nodeKind: 'event', blockKind: 'custom', label: 'On connect' },
        subgraph.nodes[0]!,
      ],
      edges: [
        {
          id: 'd1',
          kind: 'data',
          source: 'evt',
          sourceHandle: 'server',
          target: 'print-1',
          targetHandle: PALETTE_VALUE_HANDLE,
          dataType: 'ServerRef',
        },
      ],
    };

    await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'onConnect',
      subgraph: subgraphWithEdge,
      node: subgraphWithEdge.nodes[1]!,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore,
      resolveContext: {
        handlerBranch: 'onConnect',
        deviceHandle: 'dev-1',
        serverHandle: 'mem-1',
        triggeredAt: '2026-06-18T12:00:00.000Z',
      },
    });

    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('mediaApiUrl: http://localhost:3010'));
  });

  it('prints device metadata on initial branch', async () => {
    const printLine = vi.fn();
    const host = createStubScenarioRuntimeHost({
      printLine,
      variableStore,
      getResourceMetadata: (ref) => ({
        fields: { deviceId: ref.handle ?? 'null', platform: 'Win32' },
      }),
    });
    const subgraphWithEdge: ScenarioSubgraph = {
      nodes: [
        { id: 'evt', nodeKind: 'event', blockKind: 'custom', label: 'On start' },
        subgraph.nodes[0]!,
      ],
      edges: [
        {
          id: 'd1',
          kind: 'data',
          source: 'evt',
          sourceHandle: 'device',
          target: 'print-1',
          targetHandle: PALETTE_VALUE_HANDLE,
          dataType: 'DeviceRef',
        },
      ],
    };

    await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'initial',
      subgraph: subgraphWithEdge,
      node: subgraphWithEdge.nodes[1]!,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore,
      resolveContext: {
        handlerBranch: 'initial',
        deviceHandle: 'field-node-7',
        triggeredAt: '2026-06-18T12:05:00.000Z',
      },
    });

    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('platform: Win32'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('field-node-7'));
  });
});

describe('executeScenarioBlock stop-runtime', () => {
  it('StopRuntime invokes onStopRuntime and requests stop', async () => {
    const onStopRuntime = vi.fn();
    const host = createStubScenarioRuntimeHost();
    const node = {
      id: 'sr-1',
      nodeKind: 'stop-runtime' as const,
      blockKind: 'custom' as const,
      label: 'StopRuntime',
    };
    const subgraph: ScenarioSubgraph = { nodes: [node], edges: [] };

    const result = await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'main',
      subgraph,
      node,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      onStopRuntime,
    });

    expect(onStopRuntime).toHaveBeenCalledOnce();
    expect(result.stopRequested).toBe(true);
  });
});
