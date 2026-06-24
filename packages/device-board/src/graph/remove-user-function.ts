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
  /** Индекс в списке — при дублирующихся id удаляется только выбранная функция. */
  readonly draftIndex?: number;
}

export interface RemoveUserFunctionResult {
  readonly drafts: ScenarioFunctionDraft[];
  readonly removed: boolean;
}

/** Убирает draft функции из списка (по индексу или по id). */
export function removeUserFunctionDraft(
  input: RemoveUserFunctionInput,
): RemoveUserFunctionResult {
  if (input.draftIndex !== undefined) {
    const index = input.draftIndex;
    if (index < 0 || index >= input.drafts.length) {
      return { drafts: [...input.drafts], removed: false };
    }
    const draft = input.drafts[index];
    if (draft === undefined || draft.id !== input.functionId) {
      return { drafts: [...input.drafts], removed: false };
    }
    return {
      drafts: input.drafts.filter((_, itemIndex) => itemIndex !== index),
      removed: true,
    };
  }
  const next = input.drafts.filter((draft) => draft.id !== input.functionId);
  return {
    drafts: next,
    removed: next.length !== input.drafts.length,
  };
}

/**
 * Удаляет один subgraph-блок функции: при occurrence удаляется n-й блок с данным functionId
 * (обход веток в порядке initial → onConnect → main → alarm → onStop → onDisconnect).
 */
export function stripSubgraphBlocksForFunctionOccurrence(
  branchGraphs: readonly { nodes: Node[]; edges: Edge[] }[],
  functionId: string,
  occurrence: number,
): void {
  let seen = 0;
  for (const branch of branchGraphs) {
    for (let nodeIndex = 0; nodeIndex < branch.nodes.length; nodeIndex += 1) {
      const node = branch.nodes[nodeIndex];
      if (node === undefined || !isSubgraphBlockForFunction(node, functionId)) {
        continue;
      }
      if (seen !== occurrence) {
        seen += 1;
        continue;
      }
      const removedId = node.id;
      branch.nodes.splice(nodeIndex, 1);
      branch.edges = branch.edges.filter(
        (edge) => edge.source !== removedId && edge.target !== removedId,
      );
      return;
    }
  }
}
