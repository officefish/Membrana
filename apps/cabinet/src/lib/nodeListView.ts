/** MP7b RT5: достигнут ли лимит узлов на мембрану по тарифу (для UI). */
export function isNodeLimitReachedView(nodeCount: number, maxNodesPerMembrane: number): boolean {
  return nodeCount >= Math.max(0, maxNodesPerMembrane);
}
