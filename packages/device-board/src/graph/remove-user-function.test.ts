import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import {
  createDefaultFunctionExecInputPin,
  createDefaultFunctionExecOutputPin,
} from '@membrana/core';

import { removeUserFunctionDraft, stripSubgraphBlocksForFunction } from './remove-user-function.js';

describe('stripSubgraphBlocksForFunction', () => {
  it('removes subgraph node and dangling edges', () => {
    const nodes = [
      {
        id: 'fn-1-block',
        type: 'board',
        position: { x: 0, y: 0 },
        data: { blockKind: 'subgraph', functionId: 'fn-1' },
      },
      { id: 'other', type: 'board', position: { x: 0, y: 0 }, data: {} },
    ];
    const edges = [
      { id: 'e1', source: 'a', target: 'fn-1-block' },
      { id: 'e2', source: 'other', target: 'b' },
    ];
    const result = stripSubgraphBlocksForFunction(nodes, edges, 'fn-1');
    assert.equal(result.nodes.length, 1);
    assert.equal(result.nodes[0]?.id, 'other');
    assert.equal(result.edges.length, 1);
    assert.equal(result.edges[0]?.id, 'e2');
  });
});

describe('removeUserFunctionDraft', () => {
  it('filters draft by id', () => {
    const draft = {
      id: 'fn-1',
      name: 'A',
      entry: 'fn-input',
      inputPins: [createDefaultFunctionExecInputPin()],
      outputPins: [createDefaultFunctionExecOutputPin()],
      nodes: [],
      edges: [],
    };
    const result = removeUserFunctionDraft({ functionId: 'fn-1', drafts: [draft] });
    assert.equal(result.drafts.length, 0);
    assert.equal(result.removed, true);
  });
});
