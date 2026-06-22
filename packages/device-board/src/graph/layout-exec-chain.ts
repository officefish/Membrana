import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';

import {
  BOARD_ALIGN_GAP_PX,
  snapBoardLayoutCoordinate,
} from './align-nodes.js';
import { resolveHandle } from './handle-catalog.js';
import {
  BOARD_NODE_MARQUEE_WIDTH,
  nodeFlowBounds,
} from './marquee-selection.js';
import { SCENARIO_ALARM_ENTRY, SCENARIO_MAIN_ENTRY } from './initial-board-state.js';

export type LoopExecLayoutBranch = 'main' | 'alarm';

/** Конфиг layered exec layout (D-LAYOUT-LR). */
export interface ExecChainLayoutConfig {
  readonly rankSepPx: number;
  readonly nodeSepPx: number;
}

const DEFAULT_EXEC_CHAIN_LAYOUT_CONFIG: ExecChainLayoutConfig = {
  rankSepPx: BOARD_NODE_MARQUEE_WIDTH + BOARD_ALIGN_GAP_PX,
  nodeSepPx: BOARD_ALIGN_GAP_PX,
};

function nodeLayoutSize(node: Node): { readonly width: number; readonly height: number } {
  const bounds = nodeFlowBounds(node);
  return { width: bounds.width, height: bounds.height };
}

/** Exec или event → exec ребро между двумя board-узлами. */
export function isExecFlowBoardEdge(edge: Edge, nodes: readonly Node[]): boolean {
  const sourceHandle = edge.sourceHandle ?? '';
  const targetHandle = edge.targetHandle ?? '';
  const source = resolveHandle(nodes, edge.source, sourceHandle, 'source');
  const target = resolveHandle(nodes, edge.target, targetHandle, 'target');
  if (source === null || target === null) {
    return false;
  }
  const sourceIsFlow = source.pinKind === 'exec' || source.pinKind === 'event';
  return sourceIsFlow && target.pinKind === 'exec';
}

function execEdgesInScope(
  nodes: readonly Node[],
  edges: readonly Edge[],
  scopeNodeIds: ReadonlySet<string>,
): Edge[] {
  return edges.filter(
    (edge) =>
      scopeNodeIds.has(edge.source) &&
      scopeNodeIds.has(edge.target) &&
      isExecFlowBoardEdge(edge, nodes),
  );
}

/** Узлы selection, участвующие хотя бы в одном exec-ребре scope. */
function execParticipatingNodeIds(
  scopeNodeIds: ReadonlySet<string>,
  execEdges: readonly Edge[],
): Set<string> {
  const ids = new Set<string>();
  for (const edge of execEdges) {
    if (scopeNodeIds.has(edge.source)) {
      ids.add(edge.source);
    }
    if (scopeNodeIds.has(edge.target)) {
      ids.add(edge.target);
    }
  }
  return ids;
}

/** True, если exec dagre layout применим к selection. */
export function isExecChainLayoutEnabled(
  nodes: readonly Node[],
  edges: readonly Edge[],
  scopeNodeIds: ReadonlySet<string>,
): boolean {
  if (scopeNodeIds.size < 2) {
    return false;
  }
  const execEdges = execEdgesInScope(nodes, edges, scopeNodeIds);
  return execParticipatingNodeIds(scopeNodeIds, execEdges).size >= 2;
}

/**
 * Layered layout exec-подграфа selection (dagre LR, D-LAYOUT-LR).
 * Сохраняет anchor (min x/y selection) и snap 8 px.
 */
export function computeExecChainLayoutPositions(
  nodes: readonly Node[],
  edges: readonly Edge[],
  scopeNodeIds: ReadonlySet<string>,
  config: ExecChainLayoutConfig = DEFAULT_EXEC_CHAIN_LAYOUT_CONFIG,
): Map<string, { readonly x: number; readonly y: number }> {
  const out = new Map<string, { readonly x: number; readonly y: number }>();
  if (!isExecChainLayoutEnabled(nodes, edges, scopeNodeIds)) {
    return out;
  }

  const execEdges = execEdgesInScope(nodes, edges, scopeNodeIds);
  const layoutNodeIds = execParticipatingNodeIds(scopeNodeIds, execEdges);
  const layoutNodes = nodes.filter((node) => layoutNodeIds.has(node.id));
  if (layoutNodes.length < 2) {
    return out;
  }

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: 'LR',
    acyclicer: 'greedy',
    nodesep: config.nodeSepPx,
    ranksep: config.rankSepPx,
    marginx: 0,
    marginy: 0,
  });

  const sizes = new Map<string, { readonly width: number; readonly height: number }>();
  for (const node of layoutNodes) {
    const size = nodeLayoutSize(node);
    sizes.set(node.id, size);
    graph.setNode(node.id, { width: size.width, height: size.height });
  }

  for (const edge of execEdges) {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(graph);

  const rawPositions = new Map<string, { readonly x: number; readonly y: number }>();
  for (const nodeId of graph.nodes()) {
    const dagreNode = graph.node(nodeId);
    const size = sizes.get(nodeId);
    if (size === undefined || dagreNode === undefined) {
      continue;
    }
    rawPositions.set(nodeId, {
      x: dagreNode.x - size.width / 2,
      y: dagreNode.y - size.height / 2,
    });
  }

  if (rawPositions.size === 0) {
    return out;
  }

  const anchorX = Math.min(
    ...layoutNodes.map((node) => node.position.x),
  );
  const anchorY = Math.min(
    ...layoutNodes.map((node) => node.position.y),
  );
  const layoutMinX = Math.min(...[...rawPositions.values()].map((pos) => pos.x));
  const layoutMinY = Math.min(...[...rawPositions.values()].map((pos) => pos.y));
  const offsetX = anchorX - layoutMinX;
  const offsetY = anchorY - layoutMinY;

  for (const [nodeId, pos] of rawPositions) {
    out.set(nodeId, {
      x: snapBoardLayoutCoordinate(pos.x + offsetX),
      y: snapBoardLayoutCoordinate(pos.y + offsetY),
    });
  }

  return out;
}

/** Entry id для exec layout на loop-ветках (D-LAYOUT-SCOPE). */
export function resolveLoopBranchExecEntryId(branch: LoopExecLayoutBranch): string {
  return branch === 'main' ? SCENARIO_MAIN_ENTRY : SCENARIO_ALARM_ENTRY;
}

/** Exec-reachable узлы от entry (BFS по exec/event→exec). */
export function collectExecReachableNodeIds(
  nodes: readonly Node[],
  edges: readonly Edge[],
  entryNodeId: string,
): Set<string> {
  const reachable = new Set<string>();
  if (!nodes.some((node) => node.id === entryNodeId)) {
    return reachable;
  }
  const queue: string[] = [entryNodeId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || reachable.has(current)) {
      continue;
    }
    reachable.add(current);
    for (const edge of edges) {
      if (edge.source === current && isExecFlowBoardEdge(edge, nodes)) {
        queue.push(edge.target);
      }
    }
  }
  return reachable;
}

/** Layout всей exec-цепочки от entry (branch scope). */
export function computeExecChainLayoutFromEntry(
  nodes: readonly Node[],
  edges: readonly Edge[],
  entryNodeId: string,
  config: ExecChainLayoutConfig = DEFAULT_EXEC_CHAIN_LAYOUT_CONFIG,
): Map<string, { readonly x: number; readonly y: number }> {
  const scope = collectExecReachableNodeIds(nodes, edges, entryNodeId);
  return computeExecChainLayoutPositions(nodes, edges, scope, config);
}

/** True, если на loop-ветке можно упорядочить exec от entry. */
export function isLoopBranchExecLayoutEnabled(
  nodes: readonly Node[],
  edges: readonly Edge[],
  branch: LoopExecLayoutBranch,
): boolean {
  const entryId = resolveLoopBranchExecEntryId(branch);
  const scope = collectExecReachableNodeIds(nodes, edges, entryId);
  return isExecChainLayoutEnabled(nodes, edges, scope);
}

/**
 * True, если узлы exec-цепочки от entry уже стоят на позициях dagre LR layout.
 * Используется для деактивации «Упорядочить цепочку» до следующего редактирования.
 */
export function isExecChainLayoutAtCanonicalPositions(
  nodes: readonly Node[],
  edges: readonly Edge[],
  entryNodeId: string,
): boolean {
  const canonical = computeExecChainLayoutFromEntry(nodes, edges, entryNodeId);
  if (canonical.size < 2) {
    return false;
  }
  for (const [nodeId, expected] of canonical) {
    const node = nodes.find((item) => item.id === nodeId);
    if (node === undefined) {
      return false;
    }
    if (node.position.x !== expected.x || node.position.y !== expected.y) {
      return false;
    }
  }
  return true;
}

/** True, если loop-ветка уже упорядочена (кнопка branch exec layout не нужна). */
export function isLoopBranchExecLayoutCanonical(
  nodes: readonly Node[],
  edges: readonly Edge[],
  branch: LoopExecLayoutBranch,
): boolean {
  if (!isLoopBranchExecLayoutEnabled(nodes, edges, branch)) {
    return false;
  }
  const entryId = resolveLoopBranchExecEntryId(branch);
  return isExecChainLayoutAtCanonicalPositions(nodes, edges, entryId);
}

/** Ghost-ноды для preview (NAA L2): полупрозрачные копии на целевых позициях. */
export function buildLayoutGhostNodes(
  nodes: readonly Node[],
  previewPositions: ReadonlyMap<string, { readonly x: number; readonly y: number }>,
): Node[] {
  const ghosts: Node[] = [];
  for (const node of nodes) {
    const next = previewPositions.get(node.id);
    if (next === undefined) {
      continue;
    }
    if (next.x === node.position.x && next.y === node.position.y) {
      continue;
    }
    const bounds = nodeFlowBounds(node);
    ghosts.push({
      id: `layout-ghost-${node.id}`,
      type: 'boardLayoutGhost',
      position: { x: next.x, y: next.y },
      draggable: false,
      selectable: false,
      focusable: false,
      data: {
        label:
          typeof node.data === 'object' &&
          node.data !== null &&
          'label' in node.data &&
          typeof node.data.label === 'string'
            ? node.data.label
            : node.id,
        width: bounds.width,
        height: bounds.height,
      },
    });
  }
  return ghosts;
}
