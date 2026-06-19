import type { Edge, Node } from '@xyflow/react';

import { resolveHandle } from './handle-catalog.js';
import {
  DATA_EDGE_STROKE_WIDTH,
  EXEC_EDGE_STROKE,
  EXEC_EDGE_STROKE_WIDTH,
  dataSocketStrokeColor,
} from './socket-type-palette.js';

export interface DecorateBoardEdgesOptions {
  /** Пульсация рёбер только во время run. */
  readonly pulseWhenRunning: boolean;
}

function isExecEdge(edge: Edge, nodes: readonly Node[]): boolean {
  if (edge.sourceHandle === undefined || edge.sourceHandle === null) {
    return false;
  }
  const resolved = resolveHandle(nodes, edge.source, edge.sourceHandle, 'source');
  return resolved?.pinKind === 'exec';
}

function dataEdgeStroke(edge: Edge, nodes: readonly Node[]): string {
  if (edge.sourceHandle === undefined || edge.sourceHandle === null) {
    return dataSocketStrokeColor();
  }
  const resolved = resolveHandle(nodes, edge.source, edge.sourceHandle, 'source');
  return dataSocketStrokeColor(resolved?.socketType);
}

/** Применяет толщину, цвет и анимацию к рёбрам канваса (чистая функция). */
export function decorateBoardEdges(
  edges: readonly Edge[],
  nodes: readonly Node[],
  options: DecorateBoardEdgesOptions,
): Edge[] {
  return edges.map((edge) => {
    const exec = isExecEdge(edge, nodes);
    const stroke = exec ? EXEC_EDGE_STROKE : dataEdgeStroke(edge, nodes);
    const strokeWidth = exec ? EXEC_EDGE_STROKE_WIDTH : DATA_EDGE_STROKE_WIDTH;
    return {
      ...edge,
      animated: options.pulseWhenRunning && exec,
      style: {
        ...edge.style,
        stroke,
        strokeWidth,
      },
    };
  });
}
