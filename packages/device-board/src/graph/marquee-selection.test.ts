import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';

import { computeAlignPositions, computeSmartAlignPositions, BOARD_ALIGN_GAP_PX } from './align-nodes.js';
import {
  flowRectsIntersect,
  nodesInFlowRect,
  normalizeFlowRect,
  normalizeScreenRect,
} from './marquee-selection.js';

function node(id: string, x: number, y: number, w = 220, h = 80): Node {
  return {
    id,
    type: 'board',
    position: { x, y },
    data: { label: id, layer: 'scenario' },
    measured: { width: w, height: h },
  };
}

describe('marquee-selection', () => {
  it('normalizeFlowRect builds positive width/height', () => {
    expect(normalizeFlowRect({ x: 10, y: 20 }, { x: 50, y: 5 })).toEqual({
      x: 10,
      y: 5,
      width: 40,
      height: 15,
    });
  });

  it('nodesInFlowRect selects intersecting nodes', () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 };
    const inside = node('a', 10, 10);
    const outside = node('b', 500, 500);
    expect(nodesInFlowRect([inside, outside], rect).map((n) => n.id)).toEqual(['a']);
  });

  it('nodesInFlowRect ignores tiny rect (click)', () => {
    const rect = { x: 0, y: 0, width: 2, height: 2 };
    expect(nodesInFlowRect([node('a', 0, 0)], rect)).toEqual([]);
  });

  it('flowRectsIntersect detects overlap', () => {
    expect(
      flowRectsIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 5, y: 5, width: 10, height: 10 },
      ),
    ).toBe(true);
  });

  it('normalizeScreenRect', () => {
    expect(normalizeScreenRect({ x: 100, y: 50 }, { x: 80, y: 90 })).toEqual({
      left: 80,
      top: 50,
      width: 20,
      height: 40,
    });
  });
});

describe('align-nodes', () => {
  it('alignLeft aligns x to min', () => {
    const nodes = [node('a', 10, 0), node('b', 80, 40)];
    const next = computeAlignPositions(nodes, new Set(['a', 'b']), 'left');
    expect(next.get('a')).toEqual({ x: 10, y: 0 });
    expect(next.get('b')).toEqual({ x: 10, y: 40 });
  });

  it('distributeHorizontally requires at least 3 nodes', () => {
    const nodes = [node('a', 0, 0), node('b', 300, 0)];
    expect(computeAlignPositions(nodes, new Set(['a', 'b']), 'distribute-h').size).toBe(0);
  });

  it('distributeHorizontally spaces nodes across span', () => {
    const nodes = [node('a', 0, 0, 100, 40), node('b', 200, 0, 100, 40), node('c', 400, 0, 100, 40)];
    const next = computeAlignPositions(nodes, new Set(['a', 'b', 'c']), 'distribute-h');
    expect(next.get('a')?.x).toBe(0);
    expect(next.get('c')?.x).toBe(400);
    expect(next.get('b')?.x).toBe(200);
  });

  it('BOARD_ALIGN_GAP_PX is documented constant', () => {
    expect(BOARD_ALIGN_GAP_PX).toBe(24);
  });

  it('computeSmartAlignPositions snaps to 8px grid', () => {
    const nodes = [node('a', 11, 13, 100, 40), node('b', 211, 17, 100, 40)];
    const next = computeSmartAlignPositions(nodes, new Set(['a', 'b']));
    expect(next.get('a')?.x).toBe(8);
    expect(next.get('a')?.y).toBe(16);
    expect(next.get('b')?.x).toBe(208);
    expect(next.get('b')?.y).toBe(16);
  });
});
