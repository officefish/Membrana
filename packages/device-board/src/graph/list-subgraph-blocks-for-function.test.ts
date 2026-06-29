import type { Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { listSubgraphBlocksForFunction } from './list-subgraph-blocks-for-function.js';

function subgraphNode(id: string, functionId: string): Node {
  return {
    id,
    type: 'scenarioNode',
    position: { x: 0, y: 0 },
    data: { blockKind: 'subgraph', functionId, label: 'Fn' },
  };
}

describe('listSubgraphBlocksForFunction', () => {
  it('returns empty for unknown function', () => {
    expect(listSubgraphBlocksForFunction([], 'fn-1')).toEqual([]);
  });

  it('lists multiple blocks in node order with 1-based occurrence', () => {
    const nodes = [
      subgraphNode('fn-1-block', 'fn-1'),
      subgraphNode('other', 'fn-2'),
      subgraphNode('fn-1-block-2', 'fn-1'),
    ];
    expect(listSubgraphBlocksForFunction(nodes, 'fn-1')).toEqual([
      { nodeId: 'fn-1-block', occurrence: 1 },
      { nodeId: 'fn-1-block-2', occurrence: 2 },
    ]);
  });
});
