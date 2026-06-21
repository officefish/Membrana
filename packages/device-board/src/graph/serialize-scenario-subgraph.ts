import type { ScenarioGraphEdge, ScenarioGraphNode, ScenarioSubgraph, ScenarioVariable } from '@membrana/core';
import {
  normalizeScenarioGraphNodePure,
  resolveScenarioCollectorConfig,
  resolveScenarioFftTrendsPolicy,
  resolveScenarioRecordingPolicy,
} from '@membrana/core';
import type { Edge, Node } from '@xyflow/react';

import { isBoardFlowNodeData } from './board-node-data.js';
import { D0_SCENARIO_NODE_CATALOG } from './d0-node-catalog.js';
import { resolveHandle } from './handle-catalog.js';
import { createEventBoardNode, createLoopTickEventBoardNode } from './event-node.js';
import { createLoopRepeatBoardNode } from './loop-repeat-node.js';
import { createPaletteBoardNode, isPaletteNodeKind } from './palette-node.js';
import { encodeSubgraphRef, parseSubgraphDisplayLabel, parseSubgraphFunctionId } from './subgraph-ref.js';
import { createVariableBoardNode } from './variable-node.js';
import {
  createFunctionInputBoardNode,
  createFunctionOutputBoardNode,
} from './function-io-node.js';
import { nodesForScenarioSubgraphSerialize } from './comment-group.js';

function finalizeScenarioNode(node: ScenarioGraphNode): ScenarioGraphNode {
  return normalizeScenarioGraphNodePure(node);
}

function readPureFromData(data: Record<string, unknown>): boolean | undefined {
  return typeof data.pure === 'boolean' ? data.pure : undefined;
}

function toScenarioNode(node: Node): ScenarioGraphNode | null {
  if (!isBoardFlowNodeData(node.data) || node.data.layer !== 'scenario') {
    return null;
  }
  const blockKind = node.data.blockKind;
  if (typeof blockKind !== 'string') {
    return null;
  }

  // v0.4: системный Event-узел — entry ветви-обработчика.
  const nodeKind = node.data.nodeKind;
  if (nodeKind === 'loop-repeat') {
    return {
      id: node.id,
      blockKind,
      position: { x: node.position.x, y: node.position.y },
      label: node.data.label,
      nodeKind,
      system: true,
    };
  }

  if (nodeKind === 'function-input' || nodeKind === 'function-output') {
    return {
      id: node.id,
      blockKind,
      position: { x: node.position.x, y: node.position.y },
      label: node.data.label,
      nodeKind,
      system: true,
    };
  }

  if (nodeKind === 'event') {
    const eventVariant =
      node.data.eventVariant === 'loopTick' ? ('loopTick' as const) : ('handler' as const);
    return {
      id: node.id,
      blockKind,
      position: { x: node.position.x, y: node.position.y },
      label: node.data.label,
      nodeKind,
      system: true,
      eventVariant,
    };
  }

  // v0.4: узлы переменных несут смысл в nodeKind + variableId, blockKind — носитель.
  if (nodeKind === 'variable-get' || nodeKind === 'variable-set') {
    return finalizeScenarioNode({
      id: node.id,
      blockKind,
      position: { x: node.position.x, y: node.position.y },
      label: node.data.label,
      nodeKind,
      ...(typeof node.data.variableId === 'string' ? { variableId: node.data.variableId } : {}),
      ...(readPureFromData(node.data) !== undefined ? { pure: readPureFromData(node.data) } : {}),
    });
  }

  // v0.4: узлы палитры (print / is-valid / get-microphone / streaming / fft / collect).
  if (nodeKind !== undefined && isPaletteNodeKind(nodeKind)) {
    const collectorConfig =
      node.data.collectorConfig !== undefined
        ? resolveScenarioCollectorConfig(node.data.collectorConfig)
        : undefined;
    const recordingPolicy =
      node.data.recordingPolicy !== undefined
        ? resolveScenarioRecordingPolicy(node.data.recordingPolicy)
        : undefined;
    const fftTrendsPolicy =
      node.data.fftTrendsPolicy !== undefined
        ? resolveScenarioFftTrendsPolicy(node.data.fftTrendsPolicy)
        : undefined;
    return finalizeScenarioNode({
      id: node.id,
      blockKind,
      position: { x: node.position.x, y: node.position.y },
      label: node.data.label,
      nodeKind,
      ...(typeof node.data.microphoneId === 'string' ? { microphoneId: node.data.microphoneId } : {}),
      ...(collectorConfig !== undefined ? { collectorConfig } : {}),
      ...(recordingPolicy !== undefined ? { recordingPolicy } : {}),
      ...(fftTrendsPolicy !== undefined ? { fftTrendsPolicy } : {}),
      ...(readPureFromData(node.data) !== undefined ? { pure: readPureFromData(node.data) } : {}),
    } as ScenarioGraphNode);
  }

  return finalizeScenarioNode({
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
  });
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

  const kind =
    sourceResolved.pinKind === 'event'
      ? 'event'
      : sourceResolved.pinKind === 'exec'
        ? 'exec'
        : 'data';
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
  const serializableNodes = nodesForScenarioSubgraphSerialize(nodes);
  return {
    entry,
    nodes: serializableNodes
      .map(toScenarioNode)
      .filter((node): node is ScenarioGraphNode => node !== null),
    edges: edges
      .map((edge) => toScenarioEdge(edge, serializableNodes))
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

/** `ScenarioSubgraph` → XYFlow nodes/edges. Переменные нужны для гидратации узлов get/set. */
export function deserializeScenarioSubgraph(
  subgraph: ScenarioSubgraph,
  variables: readonly ScenarioVariable[] = [],
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  for (const item of subgraph.nodes) {
    // v0.4: системный Event-узел восстанавливается фабрикой (фикс-id, DeviceRef out).
    if (item.nodeKind === 'loop-repeat') {
      nodes.push(
        createLoopRepeatBoardNode({
          id: item.id,
          label: typeof item.label === 'string' ? item.label : undefined,
          position: { x: item.position.x, y: item.position.y },
        }),
      );
      continue;
    }

    if (item.nodeKind === 'event') {
      const label = typeof item.label === 'string' ? item.label : undefined;
      const position = { x: item.position.x, y: item.position.y };
      if (item.eventVariant === 'loopTick') {
        nodes.push(
          createLoopTickEventBoardNode({
            id: item.id,
            label,
            position,
          }),
        );
      } else {
        nodes.push(
          createEventBoardNode({
            id: item.id,
            label,
            position,
          }),
        );
      }
      continue;
    }

    // v0.4: узлы переменных восстанавливаются из variableId + типа переменной.
    if (item.nodeKind === 'variable-get' || item.nodeKind === 'variable-set') {
      const variable = variables.find((candidate) => candidate.id === item.variableId);
      if (variable === undefined) {
        continue;
      }
      const node = createVariableBoardNode(item.nodeKind, variable, {
        id: item.id,
        position: { x: item.position.x, y: item.position.y },
      });
      if (typeof item.label === 'string') {
        node.data = { ...node.data, label: item.label };
      }
      if (item.pure === false) {
        node.data = { ...node.data, pure: false };
      }
      nodes.push(node);
      continue;
    }

    if (item.nodeKind === 'function-input') {
      nodes.push(
        createFunctionInputBoardNode({
          id: item.id,
          position: { x: item.position.x, y: item.position.y },
        }),
      );
      continue;
    }

    if (item.nodeKind === 'function-output') {
      nodes.push(
        createFunctionOutputBoardNode({
          id: item.id,
          position: { x: item.position.x, y: item.position.y },
        }),
      );
      continue;
    }

    if (item.nodeKind !== undefined && isPaletteNodeKind(item.nodeKind)) {
      const micId = (item as { microphoneId?: string }).microphoneId;
      const collectorConfig = (item as { collectorConfig?: ScenarioGraphNode['collectorConfig'] })
        .collectorConfig;
      const recordingPolicy = (item as { recordingPolicy?: ScenarioGraphNode['recordingPolicy'] })
        .recordingPolicy;
      const fftTrendsPolicy = (item as { fftTrendsPolicy?: ScenarioGraphNode['fftTrendsPolicy'] })
        .fftTrendsPolicy;
      nodes.push(
        createPaletteBoardNode(item.nodeKind, {
          id: item.id,
          position: { x: item.position.x, y: item.position.y },
          ...(typeof micId === 'string' ? { microphoneId: micId } : {}),
          ...(collectorConfig !== undefined ? { collectorConfig } : {}),
          ...(recordingPolicy !== undefined ? { recordingPolicy } : {}),
          ...(fftTrendsPolicy !== undefined ? { fftTrendsPolicy } : {}),
        }),
      );
      if (typeof item.label === 'string') {
        const last = nodes.at(-1);
        if (last !== undefined) {
          last.data = {
            ...last.data,
            label: item.label,
            ...(item.pure === true ? { pure: true } : {}),
          };
        }
      } else if (item.pure === true) {
        const last = nodes.at(-1);
        if (last !== undefined) {
          last.data = { ...last.data, pure: true };
        }
      }
      continue;
    }

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
  }));

  return { nodes, edges };
}
