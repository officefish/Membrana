import type { Edge, Node } from '@xyflow/react';

import { isLockedBoardNode } from './event-node.js';
import type { BoardLayerTab, ScenarioBranchTab } from '../types/board-ui.js';

/** Ветки-обработчики событий: при очистке сохраняем системный Event-entry. */
export const EVENT_HANDLER_BRANCHES: ReadonlySet<ScenarioBranchTab> = new Set([
  'initial',
  'onConnect',
  'onStop',
  'onDisconnect',
]);

export function shouldPreserveLockedNodes(
  layer: BoardLayerTab,
  branch: ScenarioBranchTab,
): boolean {
  return layer === 'scenario' && EVENT_HANDLER_BRANCHES.has(branch);
}

/** Удаляет пользовательские узлы ветки; при `preserveLocked` оставляет Event/system. */
export function nodesAfterBranchClear(
  nodes: readonly Node[],
  preserveLocked: boolean,
): Node[] {
  if (!preserveLocked) {
    return [];
  }
  return nodes.filter(isLockedBoardNode);
}

/** Оставляет рёбра только между узлами, оставшимися после очистки. */
export function edgesAfterBranchClear(
  edges: readonly Edge[],
  keptNodes: readonly Node[],
): Edge[] {
  const keptIds = new Set(keptNodes.map((node) => node.id));
  return edges.filter((edge) => keptIds.has(edge.source) && keptIds.has(edge.target));
}

/** Следующее состояние одной ветки после «Очистить». */
export function clearBranchState(
  nodes: readonly Node[],
  _edges: readonly Edge[],
  preserveLocked: boolean,
): { readonly nodes: Node[]; readonly edges: Edge[] } {
  const nextNodes = nodesAfterBranchClear(nodes, preserveLocked);
  // Тело ветки очищается вместе со всеми связями; Event-entry остаётся изолированным.
  return { nodes: nextNodes, edges: [] };
}
