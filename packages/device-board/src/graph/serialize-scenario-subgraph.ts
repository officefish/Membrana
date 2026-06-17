import type { ScenarioGraphEdge, ScenarioGraphNode, ScenarioSubgraph } from '@membrana/core';
import type { Edge, Node } from '@xyflow/react';

import { isBoardFlowNodeData } from './board-node-data.js';
import { D0_SCENARIO_NODE_CATALOG } from './d0-node-catalog.js';
import { resolveHandle } from './handle-catalog.js';
import { encodeSubgraphRef, parseSubgraphDisplayLabel, parseSubgraphFunctionId } from './subgraph-ref.js';

function toScenarioNode(node: Node): ScenarioGraphNode | null {
  if (!isBoardFlowNodeData(node.data) || node.data.layer !== 'scenario') {
    return null;
  }
  const blockKind = node.data.blockKind;
  if (typeof blockKind !== 'string') {
    return null;
  }
  return {
    id: node.id,
    blockKind,
    position: { x: node.position.x, y: node.position.y },
    label:
      blockKind === 'subgraph' && typeof node.data.functionId === 'string'
        ? encodeSubgraphRef(
            typeof node.data.label === 'string' ? node.data.label : blockKind,
            node.data.functionId,
          )
        : node.data.label,
  };
}

function toScenarioEdge(edge: Edge, nodes: readonly Node[]): ScenarioGraphEdge | null {
  const { sourceHandle, targetHandle } = edge;
  if (sourceHandle === undefined || sourceHandle === null || targetHandle === undefined || targetHandle === null) {
    return null;
  }

  const sourceResolved = resolveHandle(nodes, edge.source, sourceHandle, 'source');
  const targetResolved = resolveHandle(nodes, edge.target, targetHandle, 'target');
  if (sourceResolved === null || targetResolved === null) {
    return null;
  }

  const kind = sourceResolved.pinKind === 'exec' ? 'exec' : 'data';
  return {
    source: edge.source,
    sourceHandle,
    target: edge.target,
    targetHandle,
    kind,
    dataType: kind === 'data' ? sourceResolved.socketType : undefined,
  };
}

/** XYFlow state → `ScenarioSubgraph` (main loop / initial и т.д.). */
export function serializeScenarioSubgraph(
  entry: string,
  nodes: readonly Node[],
  edges: readonly Edge[],
): ScenarioSubgraph {
  return {
    entry,
    nodes: nodes
      .map(toScenarioNode)
      .filter((node): node is ScenarioGraphNode => node !== null),
    edges: edges
      .map((edge) => toScenarioEdge(edge, nodes))
      .filter((edge): edge is ScenarioGraphEdge => edge !== null),
  };
}

function buildScenarioNodeData(blockKind: string): Node['data'] | null {
  const template = D0_SCENARIO_NODE_CATALOG[blockKind as keyof typeof D0_SCENARIO_NODE_CATALOG];
  if (template === undefined) {
    return null;
  }
  return {
    label: template.label,
    layer: 'scenario',
    status: 'active',
    blockKind: template.blockKind,
    inputs: template.inputs,
    outputs: template.outputs,
  };
}

/** `ScenarioSubgraph` → XYFlow nodes/edges. */
export function deserializeScenarioSubgraph(subgraph: ScenarioSubgraph): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  for (const item of subgraph.nodes) {
    const data = buildScenarioNodeData(item.blockKind);
    if (data === null) {
      continue;
    }
    nodes.push({
      id: item.id,
      type: 'board',
      position: { x: item.position.x, y: item.position.y },
      data: {
        ...data,
        label: item.blockKind === 'subgraph' ? parseSubgraphDisplayLabel(item) : (item.label ?? data.label),
        ...(item.blockKind === 'subgraph'
          ? { functionId: parseSubgraphFunctionId(item) ?? undefined }
          : {}),
      },
    });
  }

  const edges: Edge[] = subgraph.edges.map((item) => ({
    id: `${item.source}:${item.sourceHandle}->${item.target}:${item.targetHandle}`,
    source: item.source,
    sourceHandle: item.sourceHandle,
    target: item.target,
    targetHandle: item.targetHandle,
    animated: item.kind === 'exec',
  }));

  return { nodes, edges };
}
