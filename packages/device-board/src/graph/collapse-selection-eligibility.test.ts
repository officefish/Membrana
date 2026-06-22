import { describe, expect, it } from 'vitest';

import { createEventBoardNode } from './event-node.js';
import { createLoopRepeatBoardNode } from './loop-repeat-node.js';
import { createScenarioBoardNode } from './board-node-factory.js';
import {
  isCollapseToFunctionEnabled,
  isCollapseToGroupEnabled,
  pickCollapseEligibleNodeIds,
  isCollapseToFunctionEligibleNode,
} from './collapse-selection-eligibility.js';

describe('collapse-selection-eligibility', () => {
  it('ignores system nodes in marquee when enough custom nodes remain', () => {
    const tick = createEventBoardNode({ id: 'tick', position: { x: 0, y: 0 } });
    const loop = createLoopRepeatBoardNode({ id: 'loop', position: { x: 0, y: 80 } });
    const a = createScenarioBoardNode('write-journal', { id: 'a', position: { x: 200, y: 0 } });
    const b = createScenarioBoardNode('write-journal', { id: 'b', position: { x: 400, y: 0 } });
    const nodes = [tick, loop, a, b];
    const selected = [tick.id, loop.id, a.id, b.id];
    expect(isCollapseToFunctionEnabled(nodes, selected)).toBe(true);
    expect(isCollapseToGroupEnabled(nodes, selected)).toBe(true);
    expect(
      pickCollapseEligibleNodeIds(nodes, selected, isCollapseToFunctionEligibleNode),
    ).toEqual(['a', 'b']);
  });

  it('disabled when fewer than two eligible nodes', () => {
    const tick = createEventBoardNode({ id: 'tick', position: { x: 0, y: 0 } });
    const a = createScenarioBoardNode('write-journal', { id: 'a', position: { x: 200, y: 0 } });
    expect(isCollapseToFunctionEnabled([tick, a], [tick.id, a.id])).toBe(false);
  });
});
