import { describe, expect, it } from 'vitest';

import {
  INITIAL_SCENARIO_INITIAL_EDGES,
  INITIAL_SCENARIO_INITIAL_NODES,
  INITIAL_SCENARIO_MAIN_NODES,
  SCENARIO_INITIAL_ENTRY,
} from './initial-board-state.js';
import {
  clearBranchState,
  shouldPreserveLockedNodes,
} from './clear-branch.js';
import { createEventBoardNode, isEventNode } from './event-node.js';

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

  it('clears all nodes in a loop branch (main)', () => {
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

  it('shouldPreserveLockedNodes is true only for event handlers on scenario layer', () => {
    expect(shouldPreserveLockedNodes('scenario', 'initial')).toBe(true);
    expect(shouldPreserveLockedNodes('scenario', 'onConnect')).toBe(true);
    expect(shouldPreserveLockedNodes('scenario', 'main')).toBe(false);
    expect(shouldPreserveLockedNodes('signal', 'initial')).toBe(false);
  });
});
