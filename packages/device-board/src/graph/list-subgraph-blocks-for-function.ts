import type { Node } from '@xyflow/react';

export interface SubgraphBlockInstance {
  readonly nodeId: string;
  /** 1-based порядок появления на ветке. */
  readonly occurrence: number;
}

function isSubgraphBlockForFunction(node: Node, functionId: string): boolean {
  return node.data?.blockKind === 'subgraph' && node.data?.functionId === functionId;
}

/**
 * Список subgraph-блоков одной функции на ветке (порядок обхода nodes).
 */
export function listSubgraphBlocksForFunction(
  nodes: readonly Node[],
  functionId: string,
): readonly SubgraphBlockInstance[] {
  const result: SubgraphBlockInstance[] = [];
  let occurrence = 0;
  for (const node of nodes) {
    if (!isSubgraphBlockForFunction(node, functionId)) {
      continue;
    }
    occurrence += 1;
    result.push({ nodeId: node.id, occurrence });
  }
  return result;
}
