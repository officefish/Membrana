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

  it('rejects duplicate function on same branch', () => {
    const first = insertFunctionSubgraphBlock({
      draft: {
        id: 'fn-2',
        name: 'Twice',
        inputPins: [createDefaultFunctionExecInputPin()],
        outputPins: [createDefaultFunctionExecOutputPin()],
      },
      branchNodes: [],
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const second = insertFunctionSubgraphBlock({
      draft: {
        id: 'fn-2',
        name: 'Twice',
        inputPins: [createDefaultFunctionExecInputPin()],
        outputPins: [createDefaultFunctionExecOutputPin()],
      },
      branchNodes: [first.node],
    });
    assert.equal(second.ok, false);
    if (second.ok) return;
    assert.equal(second.code, 'duplicate-block');
  });
});
