import { describe, expect, it } from 'vitest';
import type { NodeChange } from '@xyflow/react';

import { createDefaultFunctionExecInputPin, createDefaultFunctionExecOutputPin } from '@membrana/core';

import { rejectSystemNodeRemovals } from './event-node.js';
import {
  createFunctionInputBoardNode,
  createFunctionOutputBoardNode,
  ensureFunctionIoNodes,
  isFunctionInputNode,
  isFunctionOutputNode,
} from './function-io-node.js';
import { createScenarioBoardNode } from './board-node-factory.js';

describe('function-io-node', () => {
  it('createFunctionInputBoardNode is not deletable', () => {
    expect(createFunctionInputBoardNode().deletable).toBe(false);
    expect(createFunctionOutputBoardNode().deletable).toBe(false);
  });

  it('rejectSystemNodeRemovals blocks delete of function-io nodes', () => {
    const input = createFunctionInputBoardNode({ id: 'fn-a-input' });
    const output = createFunctionOutputBoardNode({ id: 'fn-a-output' });
    const user = createScenarioBoardNode('write-journal', { id: 'u1', position: { x: 200, y: 0 } });
    const changes: NodeChange[] = [
      { type: 'remove', id: input.id },
      { type: 'remove', id: user.id },
    ];
    const filtered = rejectSystemNodeRemovals(changes, [input, output, user]);
    expect(filtered).toEqual([{ type: 'remove', id: user.id }]);
  });

  it('ensureFunctionIoNodes recreates missing input and output', () => {
    const user = createScenarioBoardNode('write-journal', { id: 'u1', position: { x: 200, y: 0 } });
    const inputPins = [createDefaultFunctionExecInputPin()];
    const outputPins = [createDefaultFunctionExecOutputPin()];
    const result = ensureFunctionIoNodes([user], inputPins, outputPins, 'fn-a', 'fn-a-input');
    expect(result.nodes.some(isFunctionInputNode)).toBe(true);
    expect(result.nodes.some(isFunctionOutputNode)).toBe(true);
    expect(result.entry).toBe('fn-a-input');
  });
});
