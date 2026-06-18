/**
 * MP7b RT4: лимит узлов на мембрану по тарифу.
 */

/** true, если создавать новый узел нельзя (достигнут лимит тарифа). */
export function isNodeLimitReached(currentNodeCount: number, maxNodesPerMembrane: number): boolean {
  return currentNodeCount >= Math.max(0, maxNodesPerMembrane);
}

/** Дефолтный лейбл для следующего узла (1-based). */
export function nextNodeLabel(currentNodeCount: number): string {
  return `Узел ${currentNodeCount + 1}`;
}
