import { describe, expect, it, vi } from 'vitest';
import type { ScenarioSubgraph } from '@membrana/core';

import { runSubgraphOnce } from './exec-subgraph.js';
import { createStubScenarioRuntimeHost } from './host.js';

describe('exec-sequence runtime', () => {
  it('runs Then branches in index order then continues exec-out', async () => {
    const subgraph: ScenarioSubgraph = {
      entry: 'seq',
      nodes: [
        { id: 'seq', blockKind: 'custom', position: { x: 0, y: 0 }, nodeKind: 'sequence', sequenceConfig: { thenCount: 2, parallelAsync: false } },
        { id: 'p0', blockKind: 'custom', position: { x: 0, y: 0 }, nodeKind: 'pause-runtime' },
        { id: 'p1', blockKind: 'custom', position: { x: 0, y: 0 }, nodeKind: 'pause-runtime' },
        { id: 'tail', blockKind: 'custom', position: { x: 0, y: 0 }, nodeKind: 'pause-runtime' },
      ],
      edges: [
        { id: 't0', source: 'seq', sourceHandle: 'then-0', target: 'p0', targetHandle: 'exec-in', kind: 'exec' },
        { id: 't1', source: 'seq', sourceHandle: 'then-1', target: 'p1', targetHandle: 'exec-in', kind: 'exec' },
        { id: 'out', source: 'seq', sourceHandle: 'exec-out', target: 'tail', targetHandle: 'exec-in', kind: 'exec' },
      ],
    };
    const host = createStubScenarioRuntimeHost({ log: vi.fn() });
    const order: string[] = [];
    await runSubgraphOnce(
      subgraph,
      host,
      new AbortController().signal,
      { branch: 'initial' },
      { onNodeEnter: (node) => order.push(`enter:${node.id}`) },
    );
    expect(order.filter((item) => item.startsWith('enter:'))).toEqual([
      'enter:seq',
      'enter:p0',
      'enter:p1',
      'enter:tail',
    ]);
  });

  it('skips empty Then and still reaches exec-out', async () => {
    const subgraph: ScenarioSubgraph = {
      entry: 'seq',
      nodes: [
        { id: 'seq', blockKind: 'custom', position: { x: 0, y: 0 }, nodeKind: 'sequence', sequenceConfig: { thenCount: 2, parallelAsync: false } },
        { id: 'p1', blockKind: 'custom', position: { x: 0, y: 0 }, nodeKind: 'pause-runtime' },
        { id: 'tail', blockKind: 'custom', position: { x: 0, y: 0 }, nodeKind: 'pause-runtime' },
      ],
      edges: [
        { id: 't1', source: 'seq', sourceHandle: 'then-1', target: 'p1', targetHandle: 'exec-in', kind: 'exec' },
        { id: 'out', source: 'seq', sourceHandle: 'exec-out', target: 'tail', targetHandle: 'exec-in', kind: 'exec' },
      ],
    };
    const host = createStubScenarioRuntimeHost({ log: vi.fn() });
    const order: string[] = [];
    await runSubgraphOnce(
      subgraph,
      host,
      new AbortController().signal,
      { branch: 'initial' },
      { onNodeEnter: (node) => order.push(`enter:${node.id}`) },
    );
    expect(order.filter((item) => item.startsWith('enter:'))).toEqual([
      'enter:seq',
      'enter:p1',
      'enter:tail',
    ]);
  });
});
