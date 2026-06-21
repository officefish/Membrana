import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';

import {
  BOARD_ALIGN_GAP_PX,
  computeAlignPositions,
  computeSmartAlignPositions,
  isBoardAlignModeEnabled,
} from './align-nodes.js';
import { createScenarioBoardNode } from './board-node-factory.js';

function node(id: string, x: number, y: number): Node {
  return createScenarioBoardNode('write-journal', { id, position: { x, y } });
}

describe('align-nodes', () => {
  it('isBoardAlignModeEnabled respects min counts', () => {
    expect(isBoardAlignModeEnabled('left', 1)).toBe(false);
    expect(isBoardAlignModeEnabled('left', 2)).toBe(true);
    expect(isBoardAlignModeEnabled('distribute-h', 2)).toBe(false);
    expect(isBoardAlignModeEnabled('distribute-h', 3)).toBe(true);
  });

  it('computeAlignPositions aligns left edge', () => {
    const nodes = [node('a', 100, 40), node('b', 200, 80)];
    const positions = computeAlignPositions(nodes, new Set(['a', 'b']), 'left');
    expect(positions.get('a')?.x).toBe(100);
    expect(positions.get('b')?.x).toBe(100);
  });

  it('computeAlignPositions distributes horizontally with gap span', () => {
    const nodes = [node('a', 0, 0), node('b', 200, 0), node('c', 400, 0)];
    const positions = computeAlignPositions(nodes, new Set(['a', 'b', 'c']), 'distribute-h');
    const xs = [...positions.values()].map((pos) => pos.x).sort((a, b) => a - b);
    expect(xs[0]).toBe(0);
    expect(xs[2]).toBeGreaterThan(xs[1]);
    expect(xs[1] - xs[0]).toBeCloseTo(xs[2] - xs[1], 0);
  });

  it('computeSmartAlignPositions returns positions for two nodes', () => {
    const nodes = [node('a', 0, 0), node('b', 120, 80)];
    const positions = computeSmartAlignPositions(nodes, new Set(['a', 'b']));
    expect(positions.size).toBe(2);
  });

  it('BOARD_ALIGN_GAP_PX is 24', () => {
    expect(BOARD_ALIGN_GAP_PX).toBe(24);
  });
});
