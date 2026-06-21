import type { ScenarioGraphEdge, ScenarioSubgraph } from '@membrana/core';

function findNode(
  subgraph: ScenarioSubgraph,
  nodeId: string,
): ScenarioSubgraph['nodes'][number] | undefined {
  return subgraph.nodes.find((node) => node.id === nodeId);
}

function isExecSuccessorEdge(subgraph: ScenarioSubgraph, edge: ScenarioGraphEdge): boolean {
  if (edge.kind !== 'exec') {
    return false;
  }
  if (edge.targetHandle === 'exec-in') {
    return true;
  }
  const target = findNode(subgraph, edge.target);
  return (
    target?.nodeKind === 'function-output' && edge.sourceHandle === edge.targetHandle
  );
}

/** Следующая exec-нода по `sourceHandle`; учитывает function-output с именованными exec-пинами. */
export function findExecSuccessor(
  subgraph: ScenarioSubgraph,
  nodeId: string,
  sourceHandle = 'exec-out',
): string | null {
  const edge = subgraph.edges.find(
    (item) =>
      item.source === nodeId &&
      item.kind === 'exec' &&
      item.sourceHandle === sourceHandle &&
      isExecSuccessorEdge(subgraph, item),
  );
  return edge?.target ?? null;
}
