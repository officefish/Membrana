import { describe, expect, it, vi } from 'vitest';
import type { ScenarioSubgraph } from '@membrana/core';

import { createStubScenarioRuntimeHost } from './host.js';
import { runSubgraphOnce } from './exec-subgraph.js';
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
      runSubgraphOnce(cyclicSubgraph(), host, signal, { branch: 'main' }),
    ).rejects.toThrow(`${MAX_SUBGRAPH_EXEC_STEPS} exec steps`);
  });
});
