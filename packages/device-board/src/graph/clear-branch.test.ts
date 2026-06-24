import { describe, expect, it } from 'vitest';

import {
  INITIAL_SCENARIO_INITIAL_EDGES,
  INITIAL_SCENARIO_INITIAL_NODES,
  INITIAL_SCENARIO_MAIN_NODES,
  SCENARIO_INITIAL_ENTRY,
  SCENARIO_MAIN_ENTRY,
  SCENARIO_MAIN_INFINITY,
} from './initial-board-state.js';
import {
  clearBranchState,
  shouldPreserveLockedNodes,
} from './clear-branch.js';
import { createEventBoardNode, isEventNode, isLoopTickEventNode } from './event-node.js';
import { createEmptyFunctionDraft } from './collapse-to-function.js';
import { createScenarioBoardNode } from './board-node-factory.js';

describe('clear-branch (device-board)', () => {
  it('preserves Event entry when clearing an event-handler branch', () => {
    const { nodes, edges } = clearBranchState(
      INITIAL_SCENARIO_INITIAL_NODES,
      INITIAL_SCENARIO_INITIAL_EDGES,
      true,
    );
    expect(nodes).toHaveLength(1);
    expect(isEventNode(nodes[0]!)).toBe(true);
    expect(nodes[0]!.id).toBe(SCENARIO_INITIAL_ENTRY);
    expect(edges).toHaveLength(0);
  });

  it('preserves onTick and ∞ entries when clearing a loop branch (main)', () => {
    const { nodes, edges } = clearBranchState(INITIAL_SCENARIO_MAIN_NODES, [], true);
    expect(nodes).toHaveLength(2);
    expect(isLoopTickEventNode(nodes[0]!) || isLoopTickEventNode(nodes[1]!)).toBe(true);
    expect(nodes.some((node) => node.id === SCENARIO_MAIN_ENTRY)).toBe(true);
    expect(nodes.some((node) => node.id === SCENARIO_MAIN_INFINITY)).toBe(true);
    expect(edges).toHaveLength(0);
  });

  it('clears all nodes in a loop branch when preserveLocked is false', () => {
    const { nodes, edges } = clearBranchState(INITIAL_SCENARIO_MAIN_NODES, [], false);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it('clears all edges when clearing a branch', () => {
    const event = createEventBoardNode({ id: 'evt' });
    const { edges } = clearBranchState(
      [event, { id: 'user', type: 'board', position: { x: 0, y: 0 }, data: {} }],
      [{ id: 'e1', source: 'evt', target: 'user' }],
      true,
    );
    expect(edges).toHaveLength(0);
  });

  it('shouldPreserveLockedNodes is true for event handlers and loop branches on scenario layer', () => {
    expect(shouldPreserveLockedNodes('scenario', 'initial')).toBe(true);
    expect(shouldPreserveLockedNodes('scenario', 'onConnect')).toBe(true);
    expect(shouldPreserveLockedNodes('scenario', 'main')).toBe(true);
    expect(shouldPreserveLockedNodes('scenario', 'alarm')).toBe(true);
    expect(shouldPreserveLockedNodes('scenario', 'function')).toBe(true);
    expect(shouldPreserveLockedNodes('signal', 'initial')).toBe(false);
  });

  it('preserves function-io nodes when clearing function branch', () => {
    const draft = createEmptyFunctionDraft('fn-test', 'Test');
    const user = createScenarioBoardNode('write-journal', {
      id: 'user-1',
      position: { x: 300, y: 100 },
    });
    const nodes = [...draft.nodes, user];
    const { nodes: kept, edges } = clearBranchState(nodes, [], true);
    expect(kept).toHaveLength(2);
    expect(kept.some((node) => node.data?.nodeKind === 'function-input')).toBe(true);
    expect(kept.some((node) => node.data?.nodeKind === 'function-output')).toBe(true);
    expect(edges).toHaveLength(0);
  });
});
