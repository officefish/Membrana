import type { Edge, Node } from '@xyflow/react';

import type { ScenarioFunctionDraft } from './collapse-to-function.js';
import { encodeSubgraphRef } from './subgraph-ref.js';

function nextFunctionId(reserved: ReadonlySet<string>): string {
  let seq = 1;
  while (reserved.has(`fn-${seq}`)) {
    seq += 1;
  }
  return `fn-${seq}`;
}

/** Переназначает id функции и io-узлы внутри draft. */
export function remapFunctionDraftId(draft: ScenarioFunctionDraft, newId: string): ScenarioFunctionDraft {
  const oldId = draft.id;
  if (oldId === newId) {
    return draft;
  }
  const idMap = new Map<string, string>([
    [`${oldId}-input`, `${newId}-input`],
    [`${oldId}-output`, `${newId}-output`],
  ]);
  const nodes = draft.nodes.map((node) => {
    const mapped = idMap.get(node.id);
    return mapped !== undefined ? { ...node, id: mapped } : node;
  });
  const edges = draft.edges.map((edge) => ({
    ...edge,
    id: edge.id.replaceAll(oldId, newId),
    source: idMap.get(edge.source) ?? edge.source,
    target: idMap.get(edge.target) ?? edge.target,
  }));
  const entry = idMap.get(draft.entry) ?? draft.entry;
  return { ...draft, id: newId, entry, nodes, edges };
}

type BranchGraph = { nodes: Node[]; edges: Edge[] };

function collectSubgraphBlockRefs(
  branches: readonly BranchGraph[],
): Map<string, { readonly branchIndex: number; readonly nodeIndex: number }[]> {
  const byFunctionId = new Map<string, { branchIndex: number; nodeIndex: number }[]>();
  branches.forEach((branch, branchIndex) => {
    branch.nodes.forEach((node, nodeIndex) => {
      if (node.data?.blockKind !== 'subgraph') {
        return;
      }
      const functionId = node.data.functionId;
      if (typeof functionId !== 'string' || functionId.length === 0) {
        return;
      }
      const list = byFunctionId.get(functionId) ?? [];
      list.push({ branchIndex, nodeIndex });
      byFunctionId.set(functionId, list);
    });
  });
  return byFunctionId;
}

function remapSubgraphBlockNode(
  branch: BranchGraph,
  nodeIndex: number,
  draft: ScenarioFunctionDraft,
  targetId: string,
): void {
  const node = branch.nodes[nodeIndex];
  if (node === undefined) {
    return;
  }
  const oldBlockId = node.id;
  const newBlockId = `${targetId}-block`;
  branch.nodes[nodeIndex] = {
    ...node,
    id: newBlockId,
    data: {
      ...node.data,
      functionId: targetId,
      label: encodeSubgraphRef(draft.name, targetId),
    },
  };
  branch.edges = branch.edges.map((edge) => ({
    ...edge,
    source: edge.source === oldBlockId ? newBlockId : edge.source,
    target: edge.target === oldBlockId ? newBlockId : edge.target,
  }));
}

/**
 * Устраняет коллизии id пользовательских функций (legacy: повторный marquee-collapse → fn-1).
 * Синхронизирует subgraph-блоки на ветках по порядку вхождения.
 */
export function repairDuplicateScenarioFunctionDrafts(
  drafts: readonly ScenarioFunctionDraft[],
  branches: readonly BranchGraph[],
): ScenarioFunctionDraft[] {
  const blockRefsByFunctionId = collectSubgraphBlockRefs(branches);
  const reserved = new Set<string>();
  const occurrenceByOriginalId = new Map<string, number>();
  const repaired: ScenarioFunctionDraft[] = [];

  for (const draft of drafts) {
    const originalId = draft.id;
    const occurrence = occurrenceByOriginalId.get(originalId) ?? 0;
    occurrenceByOriginalId.set(originalId, occurrence + 1);

    let targetId = originalId;
    let nextDraft = draft;
    if (reserved.has(targetId)) {
      targetId = nextFunctionId(reserved);
      nextDraft = remapFunctionDraftId(draft, targetId);
      const blockRef = blockRefsByFunctionId.get(originalId)?.[occurrence];
      if (blockRef !== undefined) {
        const branch = branches[blockRef.branchIndex];
        if (branch !== undefined) {
          remapSubgraphBlockNode(branch, blockRef.nodeIndex, nextDraft, targetId);
        }
      }
    }

    reserved.add(targetId);
    repaired.push(nextDraft);
  }

  return repaired;
}
