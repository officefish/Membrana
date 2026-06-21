import type { Node } from '@xyflow/react';

/** Прямоугольник в координатах flow (XYFlow). */
export interface FlowRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Минимальный размер drag-rect (px flow), иначе считаем кликом. */
export const MARQUEE_MIN_DRAG_PX = 4;

export const BOARD_NODE_MARQUEE_WIDTH = 220;
export const BOARD_NODE_MARQUEE_HEIGHT = 100;

/** Нормализует два угла в `{ x, y, width, height }`. */
export function normalizeFlowRect(
  cornerA: { readonly x: number; readonly y: number },
  cornerB: { readonly x: number; readonly y: number },
): FlowRect {
  const x = Math.min(cornerA.x, cornerB.x);
  const y = Math.min(cornerA.y, cornerB.y);
  return {
    x,
    y,
    width: Math.abs(cornerA.x - cornerB.x),
    height: Math.abs(cornerA.y - cornerB.y),
  };
}

/** Bounding box узла в flow space (measured или эвристика board-flow-node). */
export function nodeFlowBounds(
  node: Pick<Node, 'position' | 'measured'>,
): FlowRect {
  return {
    x: node.position.x,
    y: node.position.y,
    width: node.measured?.width ?? BOARD_NODE_MARQUEE_WIDTH,
    height: node.measured?.height ?? BOARD_NODE_MARQUEE_HEIGHT,
  };
}

/** True, если прямоугольники пересекаются (включая касание). */
export function flowRectsIntersect(left: FlowRect, right: FlowRect): boolean {
  return !(
    left.x + left.width < right.x ||
    right.x + right.width < left.x ||
    left.y + left.height < right.y ||
    right.y + right.height < left.y
  );
}

/** Узлы, чей bbox пересекает `rect` (partial selection). */
export function nodesInFlowRect(nodes: readonly Node[], rect: FlowRect): Node[] {
  if (rect.width < MARQUEE_MIN_DRAG_PX && rect.height < MARQUEE_MIN_DRAG_PX) {
    return [];
  }
  return nodes.filter((node) => flowRectsIntersect(rect, nodeFlowBounds(node)));
}

/** Screen rect относительно контейнера канваса. */
export interface ScreenRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export function normalizeScreenRect(
  origin: { readonly x: number; readonly y: number },
  current: { readonly x: number; readonly y: number },
): ScreenRect {
  const left = Math.min(origin.x, current.x);
  const top = Math.min(origin.y, current.y);
  return {
    left,
    top,
    width: Math.abs(origin.x - current.x),
    height: Math.abs(origin.y - current.y),
  };
}
