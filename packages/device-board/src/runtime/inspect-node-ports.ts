import type { ScenarioVariable } from '@membrana/core';
import type { Edge, Node } from '@xyflow/react';

import type { BoardSocketPin } from '../graph/board-node-data.js';
import { isBoardFlowNodeData } from '../graph/board-node-data.js';
import { serializeScenarioSubgraph } from '../graph/serialize-scenario-subgraph.js';
import { formatSocketPortLabel } from '../graph/socket-port-label.js';
import { formatVariableValueForPrint } from './format-reference.js';
import { ResolveInputError, resolveInput, resolveNodeOutput, type ResolveInputContext } from './resolve-input.js';

/** Снимок порта узла для runtime-инспекции в сайдбарах. */
export interface RuntimePortInspection {
  readonly handle: string;
  readonly label: string;
  readonly kind: BoardSocketPin['kind'];
  readonly socketType?: BoardSocketPin['socketType'];
  readonly nullable?: boolean;
  /** Отформатированное значение; для exec — `null`. */
  readonly valueText: string | null;
  readonly error?: string;
}

export interface NodePortInspectionResult {
  readonly nodeLabel: string;
  readonly inputs: readonly RuntimePortInspection[];
  readonly outputs: readonly RuntimePortInspection[];
}

function readPins(node: Node): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  if (!isBoardFlowNodeData(node.data)) {
    return { inputs: [], outputs: [] };
  }
  return {
    inputs: node.data.inputs ?? [],
    outputs: node.data.outputs ?? [],
  };
}

function inspectDataPort(
  pin: BoardSocketPin,
  role: 'input' | 'output',
  subgraph: ReturnType<typeof serializeScenarioSubgraph>,
  variables: readonly ScenarioVariable[],
  context: ResolveInputContext | undefined,
  nodeId: string,
): RuntimePortInspection {
  const base = {
    handle: pin.name,
    label: formatSocketPortLabel(pin),
    kind: pin.kind,
    socketType: pin.socketType,
    nullable: pin.nullable,
    valueText: null as string | null,
  };

  const effectiveContext = context ?? {};

  if (pin.kind === 'exec') {
    return base;
  }

  try {
    const scenarioNode = subgraph.nodes.find((item) => item.id === nodeId);
    if (scenarioNode === undefined) {
      return { ...base, error: 'node not in subgraph' };
    }
    const value =
      role === 'input'
        ? resolveInput(subgraph, variables, nodeId, pin.name, effectiveContext)
        : resolveNodeOutput(subgraph, variables, scenarioNode, pin.name, effectiveContext, new Set());
    return { ...base, valueText: formatVariableValueForPrint(value) };
  } catch (error: unknown) {
    const message =
      error instanceof ResolveInputError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'resolve error';
    return { ...base, error: message };
  }
}

/**
 * Инспекция входов/выходов узла в runtime: значения data-портов и схема пинов.
 * Чистая функция — контекст и переменные передаёт вызывающий (ScenarioRuntime).
 */
export function inspectNodePorts(
  nodeId: string,
  nodes: readonly Node[],
  edges: readonly Edge[],
  variables: readonly ScenarioVariable[],
  context: ResolveInputContext | undefined,
): NodePortInspectionResult | null {
  const node = nodes.find((item) => item.id === nodeId);
  if (node === undefined || !isBoardFlowNodeData(node.data)) {
    return null;
  }

  const entry = nodes.find((item) => isBoardFlowNodeData(item.data) && item.data.nodeKind === 'event')?.id ?? nodeId;
  const subgraph = serializeScenarioSubgraph(entry, nodes, edges);
  const { inputs, outputs } = readPins(node);

  return {
    nodeLabel: node.data.label,
    inputs: inputs.map((pin) => inspectDataPort(pin, 'input', subgraph, variables, context, nodeId)),
    outputs: outputs.map((pin) => inspectDataPort(pin, 'output', subgraph, variables, context, nodeId)),
  };
}
