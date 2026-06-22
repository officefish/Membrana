import type { Edge, Node } from '@xyflow/react';

import { isExecFlowBoardEdge } from './layout-exec-chain.js';

export interface RuntimeExecHighlight {
  readonly nodeIds: ReadonlySet<string>;
  readonly edgeIds: ReadonlySet<string>;
}

const EMPTY_HIGHLIGHT: RuntimeExecHighlight = {
  nodeIds: new Set(),
  edgeIds: new Set(),
};

/**
 * Узлы и exec-рёбра upstream от активного runtime-узла (F5).
 */
export function computeRuntimeExecHighlight(
  nodes: readonly Node[],
  edges: readonly Edge[],
  activeNodeId: string | null,
): RuntimeExecHighlight {
  if (activeNodeId === null || !nodes.some((node) => node.id === activeNodeId)) {
    return EMPTY_HIGHLIGHT;
  }

  const nodeIds = new Set<string>([activeNodeId]);
  const edgeIds = new Set<string>();
  const queue: string[] = [activeNodeId];

  while (queue.length > 0) {
    const targetId = queue.shift();
    if (targetId === undefined) {
      continue;
    }
    for (const edge of edges) {
      if (edge.target !== targetId || !isExecFlowBoardEdge(edge, nodes)) {
        continue;
      }
      edgeIds.add(edge.id);
      if (!nodeIds.has(edge.source)) {
        nodeIds.add(edge.source);
        queue.push(edge.source);
      }
    }
  }

  return { nodeIds, edgeIds };
}
