import {
  isConstructorAlwaysPureScenarioNodeKind,
  isPureEligibleScenarioNodeKind,
  resolveScenarioGraphNodePure,
  type ScenarioNodeKind,
  type ScenarioVariable,
} from '@membrana/core';
import type { Edge, Node } from '@xyflow/react';

import { isBoardFlowNodeData } from './board-node-data.js';
import { getJournalNodePins } from './get-journal-node.js';
import { getReporterNodePins } from './get-reporter-node.js';
import { makeFftTrendsPolicyNodePins } from './make-fft-trends-policy-node.js';
import { makeRecordingPolicyNodePins } from './make-recording-policy-node.js';
import { variableNodePins } from './variable-node.js';

/** Exec-ребро scenario graph (линейная цепочка exec-out → exec-in). */
export function isScenarioExecEdge(edge: Pick<Edge, 'sourceHandle' | 'targetHandle'>): boolean {
  return edge.sourceHandle === 'exec-out' && edge.targetHandle === 'exec-in';
}

const EXEC_FLOW_SOURCE_HANDLES = new Set(['exec-out', 'exec-true-out', 'exec-false-out']);

/** Любое exec-flow ребро (ветвление is-valid и линейный exec-out). */
export function isScenarioExecFlowEdge(
  edge: Pick<Edge, 'sourceHandle' | 'targetHandle'>,
): boolean {
  if (edge.targetHandle !== 'exec-in') {
    return false;
  }
  const sourceHandle = edge.sourceHandle ?? 'exec-out';
  return EXEC_FLOW_SOURCE_HANDLES.has(sourceHandle);
}

function nodeHasExecPin(
  pins: readonly { readonly name: string; readonly kind: string }[] | undefined,
  handleId: string,
): boolean {
  return pins?.some((pin) => pin.name === handleId && pin.kind === 'exec') ?? false;
}

/** Удаляет exec-flow рёбра без matching exec pins на концах (legacy после pure sync). */
export function stripOrphanExecEdges(nodes: readonly Node[], edges: readonly Edge[]): Edge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  return edges.filter((edge) => {
    if (!isScenarioExecFlowEdge(edge)) {
      return true;
    }
    const sourceHandle = edge.sourceHandle ?? 'exec-out';
    const targetHandle = edge.targetHandle ?? 'exec-in';
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (target !== undefined && isBoardFlowNodeData(target.data)) {
      if (!nodeHasExecPin(target.data.inputs, targetHandle)) {
        return false;
      }
    }
    if (source !== undefined && isBoardFlowNodeData(source.data)) {
      if (!nodeHasExecPin(source.data.outputs, sourceHandle)) {
        return false;
      }
    }
    return true;
  });
}

/** Удаляет exec-flow рёбра, инцидентные любому из `nodeIds`. */
export function stripExecEdgesForNodes(edges: readonly Edge[], nodeIds: ReadonlySet<string>): Edge[] {
  return edges.filter((edge) => {
    if (!isScenarioExecFlowEdge(edge)) {
      return true;
    }
    return !nodeIds.has(edge.source) && !nodeIds.has(edge.target);
  });
}

function resolveNodePureFromBoard(node: Node): boolean {
  if (!isBoardFlowNodeData(node.data)) {
    return false;
  }
  const kind = node.data.nodeKind;
  if (kind === undefined) {
    return false;
  }
  return resolveScenarioGraphNodePure({
    nodeKind: kind as ScenarioNodeKind,
    pure: node.data.pure,
  });
}

/** Синхронизирует pins и флаг `pure` для eligible / constructor узлов. */
export function syncPureNodePins(
  nodes: readonly Node[],
  variables: readonly ScenarioVariable[],
): Node[] {
  return nodes.map((node) => {
    if (!isBoardFlowNodeData(node.data)) {
      return node;
    }
    const kind = node.data.nodeKind;
    if (kind === 'variable-get' || kind === 'variable-set') {
      const variableId = node.data.variableId;
      if (variableId === undefined) {
        return node;
      }
      const variable = variables.find((item) => item.id === variableId);
      if (variable === undefined) {
        return node;
      }
      const pureGetter =
        kind === 'variable-get'
          ? resolveScenarioGraphNodePure({ nodeKind: kind, pure: node.data.pure })
          : false;
      const { inputs, outputs } = variableNodePins(kind, variable.type, pureGetter);
      const nextData = { ...node.data, inputs, outputs };
      if (kind === 'variable-get') {
        if (pureGetter) {
          if ('pure' in nextData) {
            const { pure: _omit, ...rest } = nextData;
            return { ...node, data: rest };
          }
        } else {
          return { ...node, data: { ...nextData, pure: false } };
        }
      }
      return { ...node, data: nextData };
    }

    if (kind === 'make-recording-policy') {
      const { inputs, outputs } = makeRecordingPolicyNodePins();
      return { ...node, data: { ...node.data, inputs, outputs, pure: true } };
    }

    if (kind === 'make-fft-trends-policy') {
      const { inputs, outputs } = makeFftTrendsPolicyNodePins();
      return { ...node, data: { ...node.data, inputs, outputs, pure: true } };
    }

    if (kind === 'get-journal' || kind === 'get-reporter') {
      const pure = resolveScenarioGraphNodePure({ nodeKind: kind, pure: node.data.pure });
      const { inputs, outputs } =
        kind === 'get-journal' ? getJournalNodePins(pure) : getReporterNodePins(pure);
      const nextData = { ...node.data, inputs, outputs };
      if (pure) {
        if ('pure' in nextData) {
          const { pure: _omit, ...rest } = nextData;
          return { ...node, data: rest };
        }
        return { ...node, data: nextData };
      }
      return { ...node, data: { ...nextData, pure: false } };
    }

    return node;
  });
}

/** Pins + strip legacy exec edges для pure / constructor узлов. */
export function applyPureGraphHygiene(
  nodes: readonly Node[],
  edges: readonly Edge[],
  variables: readonly ScenarioVariable[],
): { nodes: Node[]; edges: Edge[] } {
  const syncedNodes = syncPureNodePins(nodes, variables);
  const pureIds = new Set<string>();
  for (const node of syncedNodes) {
    if (resolveNodePureFromBoard(node)) {
      pureIds.add(node.id);
    }
  }
  const stripped = stripExecEdgesForNodes(edges, pureIds);
  return {
    nodes: syncedNodes,
    edges: stripOrphanExecEdges(syncedNodes, stripped),
  };
}

/** True, если узел поддерживает toggle Pure в inspector. */
export function isPureToggleEligibleBoardNode(node: Node): boolean {
  if (!isBoardFlowNodeData(node.data)) {
    return false;
  }
  const kind = node.data.nodeKind;
  return kind !== undefined && isPureEligibleScenarioNodeKind(kind);
}

/** True, если constructor always pure (toggle disabled). */
export function isAlwaysPureBoardNode(node: Node): boolean {
  if (!isBoardFlowNodeData(node.data)) {
    return false;
  }
  const kind = node.data.nodeKind;
  return kind !== undefined && isConstructorAlwaysPureScenarioNodeKind(kind);
}
