import type { Node } from '@xyflow/react';

import { snapBoardLayoutCoordinate } from './align-nodes.js';
import { nodeFlowBounds } from './marquee-selection.js';

/** Порог прилипания к guide (px flow), Figma-like (NAA L3). */
export const SNAP_GUIDE_THRESHOLD_PX = 6;

export type FlowGuideOrientation = 'horizontal' | 'vertical';

/** Линия guide в flow space. */
export interface FlowGuideLine {
  readonly orientation: FlowGuideOrientation;
  /** x для vertical, y для horizontal. */
  readonly value: number;
}

export interface FlowNodeSnapRect {
  readonly id: string;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly width: number;
  readonly height: number;
}

/** Bounding rect узла для snap (optional position override при drag). */
export function flowNodeSnapRect(
  node: Pick<Node, 'id' | 'position' | 'measured'>,
  position?: { readonly x: number; readonly y: number },
): FlowNodeSnapRect {
  const box = nodeFlowBounds({
    position: position ?? node.position,
    measured: node.measured,
  });
  return {
    id: node.id,
    left: box.x,
    right: box.x + box.width,
    top: box.y,
    bottom: box.y + box.height,
    centerX: box.x + box.width / 2,
    centerY: box.y + box.height / 2,
    width: box.width,
    height: box.height,
  };
}

function snapOnAxis(
  rawOrigin: number,
  size: number,
  otherValues: readonly number[],
  threshold: number,
): { readonly origin: number; readonly guide: number | null } {
  let alignOrigin = snapBoardLayoutCoordinate(rawOrigin);
  let alignGuide: number | null = null;
  let alignDelta = Infinity;

  const anchors: readonly { readonly point: number; readonly offset: number }[] = [
    { point: rawOrigin, offset: 0 },
    { point: rawOrigin + size / 2, offset: size / 2 },
    { point: rawOrigin + size, offset: size },
  ];

  for (const target of otherValues) {
    for (const { point, offset } of anchors) {
      const delta = Math.abs(point - target);
      if (delta <= threshold && delta < alignDelta) {
        alignDelta = delta;
        alignOrigin = snapBoardLayoutCoordinate(target - offset);
        alignGuide = target;
      }
    }
  }

  if (alignGuide !== null) {
    return { origin: alignOrigin, guide: alignGuide };
  }

  return { origin: snapBoardLayoutCoordinate(rawOrigin), guide: null };
}

function axisTargets(rects: readonly FlowNodeSnapRect[], axis: 'x' | 'y'): number[] {
  const values: number[] = [];
  for (const rect of rects) {
    if (axis === 'x') {
      values.push(rect.left, rect.centerX, rect.right);
    } else {
      values.push(rect.top, rect.centerY, rect.bottom);
    }
  }
  return values;
}

export interface SnapNodePositionInput {
  readonly width: number;
  readonly height: number;
  readonly rawX: number;
  readonly rawY: number;
  readonly otherRects: readonly FlowNodeSnapRect[];
  readonly thresholdPx?: number;
}

export interface SnapNodePositionResult {
  readonly x: number;
  readonly y: number;
  readonly guides: readonly FlowGuideLine[];
}

/** Snap узла к сетке 8 px и к краям/центрам соседей (NAA L3). */
export function computeSnappedNodePosition(input: SnapNodePositionInput): SnapNodePositionResult {
  const thresholdPx = input.thresholdPx ?? SNAP_GUIDE_THRESHOLD_PX;

  const snapX = snapOnAxis(
    input.rawX,
    input.width,
    axisTargets(input.otherRects, 'x'),
    thresholdPx,
  );
  const snapY = snapOnAxis(
    input.rawY,
    input.height,
    axisTargets(input.otherRects, 'y'),
    thresholdPx,
  );

  const guides: FlowGuideLine[] = [];
  if (snapX.guide !== null) {
    guides.push({ orientation: 'vertical', value: snapX.guide });
  }
  if (snapY.guide !== null) {
    guides.push({ orientation: 'horizontal', value: snapY.guide });
  }

  return { x: snapX.origin, y: snapY.origin, guides };
}

/** Применяет snap к XYFlow position change (только при dragging). */
export function snapBoardNodePositionChange(
  nodes: readonly Node[],
  change: { readonly id: string; readonly position?: { readonly x: number; readonly y: number } },
): SnapNodePositionResult | null {
  if (change.position === undefined) {
    return null;
  }
  const node = nodes.find((item) => item.id === change.id);
  if (node === undefined || change.id.startsWith('layout-ghost-')) {
    return null;
  }

  const dragged = flowNodeSnapRect(node, change.position);
  const others = nodes
    .filter((item) => item.id !== change.id && !item.id.startsWith('layout-ghost-'))
    .map((item) => flowNodeSnapRect(item));

  return computeSnappedNodePosition({
    width: dragged.width,
    height: dragged.height,
    rawX: change.position.x,
    rawY: change.position.y,
    otherRects: others,
  });
}
