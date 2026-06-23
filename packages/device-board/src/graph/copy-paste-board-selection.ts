import type { Edge, Node } from '@xyflow/react';
import { generateId } from '@membrana/core';

import { isBoardGroupNode } from './comment-group.js';
import { isCollapseToFunctionEligibleNode } from './collapse-selection-eligibility.js';
import { BOARD_NODE_LAYOUT_HEIGHT, BOARD_NODE_LAYOUT_WIDTH } from './flow-node-position.js';

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

/** Центр bbox выделения в flow-координатах (для anchor paste). */
export function selectionFlowBBoxCenter(nodes: readonly Node[]): { readonly x: number; readonly y: number } {
  if (nodes.length === 0) {
    return { x: 0, y: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    const width = node.width ?? BOARD_NODE_LAYOUT_WIDTH;
    const height = node.height ?? BOARD_NODE_LAYOUT_HEIGHT;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

/** Вставка: новые id; позиции — под `anchorFlowPosition` или +fixed offset. */
export function cloneBoardSelectionForPaste(
  clipboard: BoardSelectionClipboard,
  anchorFlowPosition?: { readonly x: number; readonly y: number },
): BoardSelectionClipboard {
  const idMap = new Map<string, string>();
  for (const node of clipboard.nodes) {
    idMap.set(node.id, `board-${generateId()}`);
  }

  const center = selectionFlowBBoxCenter(clipboard.nodes);
  const translate = anchorFlowPosition
    ? { dx: anchorFlowPosition.x - center.x, dy: anchorFlowPosition.y - center.y }
    : { dx: BOARD_PASTE_OFFSET.x, dy: BOARD_PASTE_OFFSET.y };

  const nodes = clipboard.nodes.map((node) => ({
    ...cloneNode(node),
    id: idMap.get(node.id) ?? `board-${generateId()}`,
    position: {
      x: node.position.x + translate.dx,
      y: node.position.y + translate.dy,
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
