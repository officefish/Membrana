import type { SignalGraph, SignalGraphEdge, SignalGraphNode } from '@membrana/core';
import type { Edge, Node } from '@xyflow/react';

import type { BoardFlowNodeData } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';
import { D0_SIGNAL_NODE_CATALOG } from './d0-node-catalog.js';

function toSignalNode(node: Node): SignalGraphNode | null {
  if (!isBoardFlowNodeData(node.data) || node.data.layer !== 'signal') {
    return null;
  }
  const pluginId = node.data.pluginId;
  if (typeof pluginId !== 'string' || pluginId.length === 0) {
    return null;
  }
  return {
    id: node.id,
    pluginId,
    position: { x: node.position.x, y: node.position.y },
  };
}

function toSignalEdge(edge: Edge): SignalGraphEdge | null {
  const { sourceHandle, targetHandle } = edge;
  if (sourceHandle === undefined || sourceHandle === null || targetHandle === undefined || targetHandle === null) {
    return null;
  }
  return {
    source: edge.source,
    sourceHandle,
    target: edge.target,
    targetHandle,
  };
}

/** XYFlow state → `SignalGraph`. */
export function serializeSignalGraph(nodes: readonly Node[], edges: readonly Edge[]): SignalGraph {
  return {
    nodes: nodes
      .map(toSignalNode)
      .filter((node): node is SignalGraphNode => node !== null),
    edges: edges
      .map(toSignalEdge)
      .filter((edge): edge is SignalGraphEdge => edge !== null),
  };
}

function buildSignalNodeData(templateKey: string): BoardFlowNodeData | null {
  const template = D0_SIGNAL_NODE_CATALOG[templateKey];
  if (template === undefined) {
    return null;
  }
  return {
    label: template.label,
    layer: 'signal',
    status: 'active',
    pluginId: template.pluginId,
    inputs: template.inputs,
    outputs: template.outputs,
  };
}

/** `SignalGraph` → XYFlow nodes/edges (D0 catalog). */
export function deserializeSignalGraph(graph: SignalGraph): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  for (const item of graph.nodes) {
    const data = buildSignalNodeData(item.pluginId);
    if (data === null) {
      continue;
    }
    nodes.push({
      id: item.id,
      type: 'board',
      position: { x: item.position.x, y: item.position.y },
      data,
    });
  }

  const edges: Edge[] = graph.edges.map((item) => ({
    id: `${item.source}:${item.sourceHandle}->${item.target}:${item.targetHandle}`,
    source: item.source,
    sourceHandle: item.sourceHandle,
    target: item.target,
    targetHandle: item.targetHandle,
  }));

  return { nodes, edges };
}
