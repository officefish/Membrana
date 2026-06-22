import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { computeRuntimeExecHighlight } from './runtime-exec-highlight.js';

function scenarioNode(id: string): Node {
  return {
    id,
    type: 'board',
    position: { x: 0, y: 0 },
    data: {
      layer: 'scenario',
      nodeKind: 'print',
      label: id,
      inputs: [{ name: 'exec-in', kind: 'exec' }],
      outputs: [{ name: 'exec-out', kind: 'exec' }],
    },
  };
}

function execEdge(id: string, source: string, target: string): Edge {
  return {
    id,
    source,
    target,
    sourceHandle: 'exec-out',
    targetHandle: 'exec-in',
  };
}

describe('computeRuntimeExecHighlight', () => {
  it('returns empty highlight when idle', () => {
    const nodes = [scenarioNode('a'), scenarioNode('b')];
    const edges = [execEdge('e1', 'a', 'b')];
    const highlight = computeRuntimeExecHighlight(nodes, edges, null);
    expect(highlight.nodeIds.size).toBe(0);
    expect(highlight.edgeIds.size).toBe(0);
  });

  it('highlights upstream exec chain to active node', () => {
    const nodes = [scenarioNode('a'), scenarioNode('b'), scenarioNode('c')];
    const edges = [execEdge('e1', 'a', 'b'), execEdge('e2', 'b', 'c')];
    const highlight = computeRuntimeExecHighlight(nodes, edges, 'c');
    expect([...highlight.nodeIds].sort()).toEqual(['a', 'b', 'c']);
    expect([...highlight.edgeIds].sort()).toEqual(['e1', 'e2']);
  });
});
