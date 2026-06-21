import { describe, expect, it } from 'vitest';
import type { ScenarioSubgraph } from '@membrana/core';

import { findExecSuccessor } from './exec-successor.js';
import { runSubgraphOnce } from './exec-subgraph.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { ScenarioVariableStore } from './variable-store.js';

describe('findExecSuccessor', () => {
  it('follows standard exec-out to exec-in', () => {
    const subgraph: ScenarioSubgraph = {
      entry: 'first',
      nodes: [
        { id: 'first', nodeKind: 'is-valid', blockKind: 'custom', label: 'Check' },
        { id: 'second', nodeKind: 'stop-runtime', blockKind: 'custom', label: 'Stop' },
      ],
      edges: [
        {
          source: 'first',
          sourceHandle: 'exec-out',
          target: 'second',
          targetHandle: 'exec-in',
          kind: 'exec',
        },
      ],
    };

    expect(findExecSuccessor(subgraph, 'first', 'exec-out')).toBe('second');
  });

  it('follows exec-false-out into function-output boundary pin', () => {
    const subgraph: ScenarioSubgraph = {
      entry: 'branch',
      nodes: [
        { id: 'branch', nodeKind: 'is-recording-window-full', blockKind: 'custom', label: 'Gate' },
        { id: 'out', nodeKind: 'function-output', blockKind: 'custom', label: 'Output' },
      ],
      edges: [
        {
          source: 'branch',
          sourceHandle: 'exec-false-out',
          target: 'out',
          targetHandle: 'exec-false-out',
          kind: 'exec',
        },
      ],
    };

    expect(findExecSuccessor(subgraph, 'branch', 'exec-false-out')).toBe('out');
    expect(findExecSuccessor(subgraph, 'branch', 'exec-out')).toBeNull();
  });
});

describe('runSubgraphOnce function-output exec pin', () => {
  it('returns exec-false-out when branch exits through function-output', async () => {
    const host = createStubScenarioRuntimeHost({
      isRecorderWindowFull: () => false,
    });
    const subgraph: ScenarioSubgraph = {
      entry: 'fn-in',
      nodes: [
        { id: 'fn-in', nodeKind: 'function-input', blockKind: 'custom', label: 'Input' },
        {
          id: 'gate',
          nodeKind: 'is-recording-window-full',
          blockKind: 'custom',
          label: 'Gate',
          recordingPolicy: { windowSec: 5, captureFormat: 'wav' },
        },
        { id: 'fn-out', nodeKind: 'function-output', blockKind: 'custom', label: 'Output' },
      ],
      edges: [
        {
          source: 'fn-in',
          sourceHandle: 'exec-in',
          target: 'gate',
          targetHandle: 'exec-in',
          kind: 'exec',
        },
        {
          source: 'gate',
          sourceHandle: 'exec-false-out',
          target: 'fn-out',
          targetHandle: 'exec-false-out',
          kind: 'exec',
        },
      ],
    };

    const result = await runSubgraphOnce(subgraph, host, new AbortController().signal, {
      branch: 'main',
      variableStore: new ScenarioVariableStore(),
      resolveContext: {},
    });

    expect(result.execOutHandle).toBe('exec-false-out');
  });
});
