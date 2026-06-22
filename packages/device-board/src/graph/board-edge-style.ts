import type { Edge, Node } from '@xyflow/react';

import type { BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';
import { resolveHandle } from './handle-catalog.js';
import { resolveVariableSetValuePin } from './resolve-context-port-label.js';
import { VARIABLE_VALUE_HANDLE } from './variable-node.js';
import {
  DATA_EDGE_STROKE_WIDTH,
  EXEC_EDGE_STROKE,
  EXEC_EDGE_STROKE_WIDTH,
  EVENT_EDGE_STROKE,
  EVENT_EDGE_STROKE_WIDTH,
  NULL_SOCKET_STROKE,
  dataSocketStrokeColor,
} from './socket-type-palette.js';

export interface DecorateBoardEdgesOptions {
  /** Пульсация рёбер только во время run. */
  readonly pulseWhenRunning: boolean;
  /** Exec-рёбра на активном runtime-пути (F5). */
  readonly highlightExecEdgeIds?: ReadonlySet<string>;
}

const RUNTIME_EXEC_EDGE_STROKE = 'oklch(var(--su))';
const RUNTIME_EXEC_EDGE_STROKE_WIDTH = EXEC_EDGE_STROKE_WIDTH + 1;

function isExecEdge(edge: Edge, nodes: readonly Node[]): boolean {
  if (edge.sourceHandle === undefined || edge.sourceHandle === null) {
    return false;
  }
  const resolved = resolveHandle(nodes, edge.source, edge.sourceHandle, 'source');
  return resolved?.pinKind === 'exec';
}

function isEventEdge(edge: Edge, nodes: readonly Node[]): boolean {
  if (edge.sourceHandle === undefined || edge.sourceHandle === null) {
    return false;
  }
  const resolved = resolveHandle(nodes, edge.source, edge.sourceHandle, 'source');
  return resolved?.pinKind === 'event';
}

function resolveSourceDataPin(
  edge: Edge,
  edges: readonly Edge[],
  nodes: readonly Node[],
): BoardSocketPin | null {
  if (edge.sourceHandle === undefined || edge.sourceHandle === null) {
    return null;
  }
  const sourceNode = nodes.find((node) => node.id === edge.source);
  if (sourceNode === undefined || !isBoardFlowNodeData(sourceNode.data)) {
    return null;
  }
  const sourcePin = sourceNode.data.outputs?.find((pin) => pin.name === edge.sourceHandle);
  if (sourcePin === undefined) {
    return null;
  }
  if (sourceNode.data.nodeKind === 'variable-set' && edge.sourceHandle === VARIABLE_VALUE_HANDLE) {
    return resolveVariableSetValuePin(edge.source, sourcePin, edges, nodes);
  }
  return sourcePin;
}

function dataEdgeStroke(edge: Edge, edges: readonly Edge[], nodes: readonly Node[]): string {
  const pin = resolveSourceDataPin(edge, edges, nodes);
  if (pin?.nullable === true) {
    return NULL_SOCKET_STROKE;
  }
  if (pin?.socketType !== undefined) {
    return dataSocketStrokeColor(pin.socketType);
  }
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
    const event = isEventEdge(edge, nodes);
    const runtimeHighlight = exec && options.highlightExecEdgeIds?.has(edge.id) === true;
    const stroke = runtimeHighlight
      ? RUNTIME_EXEC_EDGE_STROKE
      : event
        ? EVENT_EDGE_STROKE
        : exec
          ? EXEC_EDGE_STROKE
          : dataEdgeStroke(edge, edges, nodes);
    const strokeWidth = runtimeHighlight
      ? RUNTIME_EXEC_EDGE_STROKE_WIDTH
      : event
        ? EVENT_EDGE_STROKE_WIDTH
        : exec
          ? EXEC_EDGE_STROKE_WIDTH
          : DATA_EDGE_STROKE_WIDTH;
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
