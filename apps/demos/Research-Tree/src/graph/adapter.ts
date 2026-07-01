import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { KnowledgeGraph, KnowledgeNode, NodeState, Epoch } from './types.js';

export const NODE_W = 220;
export const NODE_H = 72;

export const GENESIS_DATE = '2026-05-12';
export const NOW_DATE = '2026-07-01';

export function computeStatesAt(
  graph: KnowledgeGraph,
  date: string,
): Record<string, NodeState> {
  const explicit: Record<string, NodeState> = {};
  for (const t of graph.transitions ?? []) {
    if (t.date <= date) {
      explicit[t.nodeId] = t.to;
    }
  }
  const established = new Set(
    Object.entries(explicit)
      .filter(([, s]) => s === 'established')
      .map(([id]) => id),
  );
  const result: Record<string, NodeState> = {};
  for (const node of graph.nodes) {
    if (node.id in explicit) {
      result[node.id] = explicit[node.id]!;
    } else {
      result[node.id] = node.requires.every((r) => established.has(r)) ? 'available' : 'fog';
    }
  }
  return result;
}

export const STATE_COLORS: Record<NodeState, string> = {
  fog:         '#6b7280',
  available:   '#3b82f6',
  exploring:   '#f59e0b',
  established: '#10b981',
};

export interface KnowledgeNodeData extends Record<string, unknown> {
  node: KnowledgeNode;
  artifactCounts: { collected: number; total: number };
}

export type KnowledgeFlowNode = Node<KnowledgeNodeData, 'knowledgeNode'>;

export function buildFlowGraph(
  graph: KnowledgeGraph,
  playhead?: string,
): {
  nodes: KnowledgeFlowNode[];
  edges: Edge[];
} {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const stateAt = playhead ? computeStatesAt(graph, playhead) : null;
  const effectiveState = (n: KnowledgeNode): NodeState =>
    stateAt ? stateAt[n.id] ?? n.state : n.state;

  const artCounts = new Map<string, { collected: number; total: number }>();
  for (const a of graph.artifacts) {
    const targets = [a.node, ...(a.also ?? [])];
    for (const nid of targets) {
      const cur = artCounts.get(nid) ?? { collected: 0, total: 0 };
      cur.total++;
      if (a.status === 'collected') cur.collected++;
      artCounts.set(nid, cur);
    }
  }

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 32, ranksep: 56, marginx: 24, marginy: 24 });

  for (const n of graph.nodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  }
  for (const n of graph.nodes) {
    for (const req of n.requires) {
      if (nodeMap.has(req)) g.setEdge(req, n.id);
    }
  }
  dagre.layout(g);

  const nodes: KnowledgeFlowNode[] = graph.nodes.map((n) => {
    const state = effectiveState(n);
    const pos = g.node(n.id);
    return {
      id: n.id,
      type: 'knowledgeNode' as const,
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
      data: {
        node: state === n.state ? n : { ...n, state },
        artifactCounts: artCounts.get(n.id) ?? { collected: 0, total: 0 },
      },
    };
  });

  const edges: Edge[] = graph.nodes.flatMap((n) => {
    const state = effectiveState(n);
    return n.requires
      .filter((req) => nodeMap.has(req))
      .map((req) => ({
        id: `${req}->${n.id}`,
        source: req,
        target: n.id,
        animated: state === 'exploring',
        style: { stroke: STATE_COLORS[state], strokeWidth: 1.5, opacity: 0.6 },
      }));
  });

  return { nodes, edges };
}

export function isOnFrontier(node: KnowledgeNode): boolean {
  return node.state === 'exploring' && (node.gate?.status === 'open' || !node.gate);
}

export function matchesFilters(
  node: KnowledgeNode,
  stateFilter: NodeState[],
  epochFilter: Epoch[],
): boolean {
  if (stateFilter.length > 0 && !stateFilter.includes(node.state)) return false;
  if (epochFilter.length > 0 && !epochFilter.includes(node.epoch)) return false;
  return true;
}
