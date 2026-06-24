import { describe, expect, it } from 'vitest';
import type { Edge, Node } from '@xyflow/react';

import { createPaletteBoardNode } from './palette-node.js';
import { createSequenceBoardNode } from './sequence-node.js';
import {
  findSequenceAsyncGateIssues,
  findSequenceAsyncPreRunIssues,
  SEQUENCE_ASYNC_GATE_MESSAGE,
} from './validate-sequence-async.js';

function execEdge(
  source: string,
  sourceHandle: string,
  target: string,
  id?: string,
): Edge {
  return {
    id: id ?? `${source}-${sourceHandle}-${target}`,
    source,
    sourceHandle,
    target,
    targetHandle: 'exec-in',
  };
}

describe('validate-sequence-async', () => {
  it('reports print on parallel async Then branch', () => {
    const seq = createSequenceBoardNode({
      id: 'seq',
      sequenceConfig: { thenCount: 2, parallelAsync: true },
    });
    const pause = createPaletteBoardNode('pause-runtime', { id: 'pause' });
    const print = createPaletteBoardNode('print', { id: 'print' });
    const nodes: Node[] = [seq, pause, print];
    const edges: Edge[] = [
      execEdge('seq', 'then-0', 'pause'),
      execEdge('pause', 'exec-out', 'print'),
    ];

    const issues = findSequenceAsyncGateIssues(nodes, edges);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      sequenceNodeId: 'seq',
      thenIndex: 0,
      nodeId: 'print',
      nodeKind: 'print',
    });
    expect(findSequenceAsyncPreRunIssues(nodes, edges, 'scenario.main.edges')[0]).toMatchObject({
      code: 'sequence-async-unsupported-node',
      message: expect.stringContaining(SEQUENCE_ASYNC_GATE_MESSAGE),
    });
  });

  it('allows pause-runtime on parallel async Then branch', () => {
    const seq = createSequenceBoardNode({
      id: 'seq',
      sequenceConfig: { thenCount: 1, parallelAsync: true },
    });
    const pause = createPaletteBoardNode('pause-runtime', { id: 'pause' });
    const nodes: Node[] = [seq, pause];
    const edges: Edge[] = [execEdge('seq', 'then-0', 'pause')];

    expect(findSequenceAsyncGateIssues(nodes, edges)).toHaveLength(0);
  });

  it('ignores sync Sequence (parallelAsync false)', () => {
    const seq = createSequenceBoardNode({
      id: 'seq',
      sequenceConfig: { thenCount: 1, parallelAsync: false },
    });
    const print = createPaletteBoardNode('print', { id: 'print' });
    const nodes: Node[] = [seq, print];
    const edges: Edge[] = [execEdge('seq', 'then-0', 'print')];

    expect(findSequenceAsyncGateIssues(nodes, edges)).toHaveLength(0);
  });
});
