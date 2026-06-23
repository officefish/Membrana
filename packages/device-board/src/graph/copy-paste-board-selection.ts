import type { Edge, Node } from '@xyflow/react';
import { generateId } from '@membrana/core';

import { isBoardGroupNode } from './comment-group.js';
import { isCollapseToFunctionEligibleNode } from './collapse-selection-eligibility.js';

/** Clipboard payload for board node copy/paste (in-memory, same tab). */
export interface BoardSelectionClipboard {
  readonly nodes: readonly Node[];
  readonly edges: readonly Edge[];
}

export const BOARD_PASTE_OFFSET = { x: 32, y: 32 } as const;

/** Узел можно копировать (не system/event/function-io/group). */
export function isBoardSelectionCopyEligibleNode(node: Node): boolean {
  if (isBoardGroupNode(node)) {
    return false;
  }
  return isCollapseToFunctionEligibleNode(node);
}

function cloneNode(node: Node): Node {
  return structuredClone(node);
}

function cloneEdge(edge: Edge): Edge {
  return structuredClone(edge);
}

/**
 * Собирает clipboard из выделенных на канвасе узлов и рёбер между ними.
 * @returns null если нет пригодных узлов
 */
export function extractBoardSelectionClipboard(
  branchNodes: readonly Node[],
  branchEdges: readonly Edge[],
): BoardSelectionClipboard | null {
  const selectedIds = new Set(
    branchNodes.filter((node) => node.selected).map((node) => node.id),
  );
  if (selectedIds.size === 0) {
    return null;
  }

  const nodes = branchNodes
    .filter((node) => selectedIds.has(node.id) && isBoardSelectionCopyEligibleNode(node))
    .map(cloneNode);
  if (nodes.length === 0) {
    return null;
  }

  const idSet = new Set(nodes.map((node) => node.id));
  const edges = branchEdges
    .filter((edge) => idSet.has(edge.source) && idSet.has(edge.target))
    .map(cloneEdge);

  return { nodes, edges };
}

/** Вставка: новые id, смещение позиций, remap рёбер. */
export function cloneBoardSelectionForPaste(
  clipboard: BoardSelectionClipboard,
  offset = BOARD_PASTE_OFFSET,
): BoardSelectionClipboard {
  const idMap = new Map<string, string>();
  for (const node of clipboard.nodes) {
    idMap.set(node.id, `board-${generateId()}`);
  }

  const nodes = clipboard.nodes.map((node) => ({
    ...cloneNode(node),
    id: idMap.get(node.id) ?? `board-${generateId()}`,
    position: {
      x: node.position.x + offset.x,
      y: node.position.y + offset.y,
    },
    selected: true,
  }));

  const edges = clipboard.edges.map((edge) => {
    const source = idMap.get(edge.source) ?? edge.source;
    const target = idMap.get(edge.target) ?? edge.target;
    return {
      ...cloneEdge(edge),
      id: `edge-${generateId()}`,
      source,
      target,
    };
  });

  return { nodes, edges };
}
