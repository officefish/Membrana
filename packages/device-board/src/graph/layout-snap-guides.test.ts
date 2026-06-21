import { describe, expect, it } from 'vitest';

import { BOARD_LAYOUT_GRID_PX } from './align-nodes.js';
import { computeSnappedNodePosition, flowNodeSnapRect } from './layout-snap-guides.js';

describe('layout-snap-guides', () => {
  it('snaps to 8px grid when no neighbors', () => {
    const result = computeSnappedNodePosition({
      width: 220,
      height: 100,
      rawX: 13,
      rawY: 27,
      otherRects: [],
    });
    expect(result.x).toBe(16);
    expect(result.y).toBe(24);
    expect(result.guides).toHaveLength(0);
  });

  it('snaps left edge to neighbor left within threshold', () => {
    const neighbor = flowNodeSnapRect({
      id: 'b',
      position: { x: 240, y: 160 },
      measured: { width: 220, height: 100 },
    });
    const result = computeSnappedNodePosition({
      width: 220,
      height: 100,
      rawX: 243,
      rawY: 165,
      otherRects: [neighbor],
      thresholdPx: 6,
    });
    expect(result.x).toBe(240);
    expect(result.guides).toContainEqual({ orientation: 'vertical', value: 240 });
  });

  it('does not snap to neighbor when beyond threshold', () => {
    const neighbor = flowNodeSnapRect({
      id: 'b',
      position: { x: 240, y: 160 },
      measured: { width: 220, height: 100 },
    });
    const result = computeSnappedNodePosition({
      width: 220,
      height: 100,
      rawX: 280,
      rawY: 200,
      otherRects: [neighbor],
      thresholdPx: 6,
    });
    expect(result.x).toBe(280);
    expect(result.guides.filter((guide) => guide.orientation === 'vertical')).toHaveLength(0);
  });

  it('snaps center-y to neighbor center-y', () => {
    const neighbor = flowNodeSnapRect({
      id: 'b',
      position: { x: 400, y: 200 },
      measured: { width: 220, height: 100 },
    });
    const result = computeSnappedNodePosition({
      width: 220,
      height: 100,
      rawX: 100,
      rawY: 203,
      otherRects: [neighbor],
      thresholdPx: 6,
    });
    expect(result.y).toBe(200);
    expect(result.guides.some((guide) => guide.orientation === 'horizontal')).toBe(true);
  });

  it('uses BOARD_LAYOUT_GRID_PX default grid', () => {
    expect(BOARD_LAYOUT_GRID_PX).toBe(8);
  });
});
