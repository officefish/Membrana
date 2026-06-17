/**
 * Signal graph — топология dataflow между плагинами.
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §1.2
 */

import type { GraphNodeId, GraphPosition } from './graph-primitives.js';

/** Нода signal graph (плагин из `MembranaRegistry`). */
export interface SignalGraphNode {
  readonly id: GraphNodeId;
  readonly pluginId: string;
  readonly position: GraphPosition;
}

/** Ребро signal graph (подписка на shared-hub). */
export interface SignalGraphEdge {
  readonly source: GraphNodeId;
  readonly sourceHandle: string;
  readonly target: GraphNodeId;
  readonly targetHandle: string;
}

/** Сериализованный signal graph. */
export interface SignalGraph {
  readonly nodes: readonly SignalGraphNode[];
  readonly edges: readonly SignalGraphEdge[];
}

/** Пустой signal graph. */
export function createEmptySignalGraph(): SignalGraph {
  return { nodes: [], edges: [] };
}
