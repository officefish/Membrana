import type { Edge, Node } from '@xyflow/react';

import type { ScenarioFunctionDraft } from './collapse-to-function.js';

function isSubgraphBlockForFunction(node: Node, functionId: string): boolean {
  return node.data?.blockKind === 'subgraph' && node.data?.functionId === functionId;
}

/**
 * Удаляет subgraph-блоки функции и связанные рёбра с ветки.
 */
export function stripSubgraphBlocksForFunction(
  nodes: readonly Node[],
  edges: readonly Edge[],
  functionId: string,
): { readonly nodes: Node[]; readonly edges: Edge[] } {
  const removedIds = new Set(
    nodes.filter((node) => isSubgraphBlockForFunction(node, functionId)).map((node) => node.id),
  );
  if (removedIds.size === 0) {
    return { nodes: [...nodes], edges: [...edges] };
  }
  return {
    nodes: nodes.filter((node) => !removedIds.has(node.id)),
    edges: edges.filter(
      (edge) => !removedIds.has(edge.source) && !removedIds.has(edge.target),
    ),
  };
}

export interface RemoveUserFunctionInput {
  readonly functionId: string;
  readonly drafts: readonly ScenarioFunctionDraft[];
}

export interface RemoveUserFunctionResult {
  readonly drafts: ScenarioFunctionDraft[];
  readonly removed: boolean;
}

/** Убирает draft функции из списка. */
export function removeUserFunctionDraft(
  input: RemoveUserFunctionInput,
): RemoveUserFunctionResult {
  const next = input.drafts.filter((draft) => draft.id !== input.functionId);
  return {
    drafts: next,
    removed: next.length !== input.drafts.length,
  };
}
