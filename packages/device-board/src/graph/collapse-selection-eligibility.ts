import type { Node } from '@xyflow/react';

import { isBoardGroupNode } from './comment-group.js';
import { isSystemNode, isEventNode } from './event-node.js';
import { isFunctionIoNode } from './function-io-node.js';

export const MIN_COLLAPSE_SELECTION = 2;

/** Узел можно упаковать в пользовательскую функцию. */
export function isCollapseToFunctionEligibleNode(node: Node): boolean {
  return !isSystemNode(node) && !isEventNode(node) && !isFunctionIoNode(node);
}

/** Узел можно обернуть в comment group. */
export function isCollapseToGroupEligibleNode(node: Node): boolean {
  if (isBoardGroupNode(node)) {
    return false;
  }
  if (node.parentId !== undefined) {
    return false;
  }
  return isCollapseToFunctionEligibleNode(node);
}

/**
 * Из marquee-выделения оставляет только узлы, пригодные для collapse.
 * Системные Event / loop-repeat не блокируют действие, если рядом ≥2 обычных узла.
 */
export function pickCollapseEligibleNodeIds(
  branchNodes: readonly Node[],
  selectedNodeIds: readonly string[],
  isEligible: (node: Node) => boolean,
): readonly string[] {
  const selected = new Set(selectedNodeIds);
  return branchNodes.filter((node) => selected.has(node.id) && isEligible(node)).map((node) => node.id);
}

export function isCollapseToFunctionEnabled(
  branchNodes: readonly Node[],
  selectedNodeIds: readonly string[],
): boolean {
  return (
    pickCollapseEligibleNodeIds(branchNodes, selectedNodeIds, isCollapseToFunctionEligibleNode).length >=
    MIN_COLLAPSE_SELECTION
  );
}

export function isCollapseToGroupEnabled(
  branchNodes: readonly Node[],
  selectedNodeIds: readonly string[],
): boolean {
  return (
    pickCollapseEligibleNodeIds(branchNodes, selectedNodeIds, isCollapseToGroupEligibleNode).length >=
    MIN_COLLAPSE_SELECTION
  );
}
