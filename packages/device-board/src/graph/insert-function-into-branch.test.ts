import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import {
  createDefaultFunctionExecInputPin,
  createDefaultFunctionExecOutputPin,
} from '@membrana/core';

import { insertFunctionSubgraphBlock } from './insert-function-into-branch.js';

describe('insertFunctionSubgraphBlock', () => {
  it('creates subgraph block with pins', () => {
    const result = insertFunctionSubgraphBlock({
      draft: {
        id: 'fn-1',
        name: 'Capture',
        inputPins: [createDefaultFunctionExecInputPin()],
        outputPins: [createDefaultFunctionExecOutputPin()],
      },
      branchNodes: [],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.node.data?.blockKind, 'subgraph');
    assert.equal(result.node.data?.functionId, 'fn-1');
    assert.match(String(result.node.data?.label), /Capture/);
  });

  it('places block at explicit position when provided', () => {
    const result = insertFunctionSubgraphBlock({
      draft: {
        id: 'fn-pos',
        name: 'Centered',
        inputPins: [createDefaultFunctionExecInputPin()],
        outputPins: [createDefaultFunctionExecOutputPin()],
      },
      branchNodes: [{ id: 'other', type: 'board', position: { x: 0, y: 0 }, data: {} }],
      position: { x: 420, y: 280 },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.node.position, { x: 420, y: 280 });
  });

  it('allows multiple subgraph blocks for the same function on one branch', () => {
    const draft = {
      id: 'fn-2',
      name: 'Twice',
      inputPins: [createDefaultFunctionExecInputPin()],
      outputPins: [createDefaultFunctionExecOutputPin()],
    };
    const first = insertFunctionSubgraphBlock({ draft, branchNodes: [] });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const second = insertFunctionSubgraphBlock({ draft, branchNodes: [first.node] });
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal(first.node.data?.functionId, 'fn-2');
    assert.equal(second.node.data?.functionId, 'fn-2');
    assert.notEqual(first.node.id, second.node.id);
    assert.equal(second.node.id, 'fn-2-block-2');
  });
});
