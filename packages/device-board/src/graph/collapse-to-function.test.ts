import { describe, expect, it } from 'vitest';

import { createEventBoardNode } from '../graph/event-node.js';
import { collapseSelectionToFunction, createEmptyFunctionDraft } from './collapse-to-function.js';
import { createScenarioBoardNode } from './board-node-factory.js';
import { createMakeRecordingPolicyBoardNode } from './make-recording-policy-node.js';
import { createStartRecordingBoardNode } from './start-recording-node.js';
import { createFunctionInputBoardNode, createFunctionOutputBoardNode } from './function-io-node.js';

describe('collapse-to-function', () => {
  it('rejects selection with system nodes', () => {
    const event = createEventBoardNode({ id: 'ev', position: { x: 0, y: 0 } });
    const a = createScenarioBoardNode('write-journal', { id: 'a', position: { x: 100, y: 0 } });
    const result = collapseSelectionToFunction({
      selectedNodeIds: [event.id, a.id],
      branchNodes: [event, a],
      branchEdges: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('system-node-selected');
    }
  });

  it('collapses two connected nodes into function draft', () => {
    const a = createScenarioBoardNode('record-chunk', { id: 'a', position: { x: 200, y: 100 } });
    const b = createScenarioBoardNode('trends-fft-detect', { id: 'b', position: { x: 400, y: 100 } });
    const tick = createScenarioBoardNode('write-journal', { id: 'tick', position: { x: 0, y: 100 } });
    const edges = [
      {
        id: 'e1',
        source: 'tick',
        sourceHandle: 'exec-out',
        target: 'a',
        targetHandle: 'exec-in',
      },
      {
        id: 'e2',
        source: 'a',
        sourceHandle: 'exec-out',
        target: 'b',
        targetHandle: 'exec-in',
      },
    ];
    const result = collapseSelectionToFunction({
      selectedNodeIds: ['a', 'b'],
      branchNodes: [tick, a, b],
      branchEdges: edges,
      functionId: 'fn-test',
      functionName: 'TestFn',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.branchNodes.some((node) => node.id === 'fn-test-block')).toBe(true);
      expect(result.functionDraft.nodes.some((node) => node.id === 'fn-test-input')).toBe(true);
      expect(result.functionDraft.nodes.some((node) => node.id === 'a')).toBe(true);
      expect(result.branchEdges.some((edge) => edge.source === 'tick' && edge.target === 'fn-test-block')).toBe(
        true,
      );
    }
  });

  it('createEmptyFunctionDraft includes IO nodes', () => {
    const draft = createEmptyFunctionDraft('fn-new', 'New');
    expect(draft.nodes).toHaveLength(2);
    expect(draft.entry).toBe('fn-new-input');
  });

  it('picks next function id when existingFunctionIds is set', () => {
    const a = createScenarioBoardNode('record-chunk', { id: 'a', position: { x: 200, y: 100 } });
    const b = createScenarioBoardNode('trends-fft-detect', { id: 'b', position: { x: 400, y: 100 } });
    const first = collapseSelectionToFunction({
      selectedNodeIds: ['a', 'b'],
      branchNodes: [a, b],
      branchEdges: [],
      existingFunctionIds: [],
    });
    const second = collapseSelectionToFunction({
      selectedNodeIds: ['a', 'b'],
      branchNodes: [a, b],
      branchEdges: [],
      existingFunctionIds: first.ok ? [first.functionDraft.id] : [],
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.functionDraft.id).toBe('fn-1');
      expect(second.functionDraft.id).toBe('fn-2');
      expect(second.functionDraft.name).toBe('Function 2');
    }
  });

  it('dedupes fan-in boundary pins (same handle from outside)', () => {
    const policy = createMakeRecordingPolicyBoardNode({ id: 'policy', position: { x: 0, y: 0 } });
    const startA = createStartRecordingBoardNode({ id: 'start-a', position: { x: 200, y: 0 } });
    const startB = createStartRecordingBoardNode({ id: 'start-b', position: { x: 400, y: 0 } });
    const edges = [
      {
        id: 'e-policy-a',
        source: 'policy',
        sourceHandle: 'policy',
        target: 'start-a',
        targetHandle: 'policy',
      },
      {
        id: 'e-policy-b',
        source: 'policy',
        sourceHandle: 'policy',
        target: 'start-b',
        targetHandle: 'policy',
      },
    ];
    const result = collapseSelectionToFunction({
      selectedNodeIds: ['start-a', 'start-b'],
      branchNodes: [policy, startA, startB],
      branchEdges: edges,
      functionId: 'fn-fan-in',
      functionName: 'FanIn',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const policyPins = result.functionDraft.inputPins.filter((pin) => pin.name === 'policy');
      expect(policyPins).toHaveLength(1);
      const policyToBlock = result.branchEdges.filter(
        (edge) => edge.source === 'policy' && edge.target === 'fn-fan-in-block',
      );
      expect(policyToBlock).toHaveLength(1);
    }
  });
});

describe('function-io-node', () => {
  it('creates system IO nodes', () => {
    expect(createFunctionInputBoardNode().data.nodeKind).toBe('function-input');
    expect(createFunctionOutputBoardNode().data.system).toBe(true);
  });
});
