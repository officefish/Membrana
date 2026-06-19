import {
  createReferenceValue,
  type ScenarioGraphNode,
  type ScenarioReferenceValue,
  type ScenarioSubgraph,
  type ScenarioVariable,
  type ScenarioVariableValue,
} from '@membrana/core';

import { EVENT_DEVICE_HANDLE, EVENT_DATETIME_HANDLE, EVENT_DELTATIME_HANDLE, EVENT_SERVER_HANDLE, EVENT_TICK_MS_HANDLE } from '../graph/event-node.js';
import {
  GET_MICROPHONE_DEVICE_HANDLE,
  GET_MICROPHONE_OUT_HANDLE,
} from '../graph/palette-node.js';
import { VARIABLE_VALUE_HANDLE } from '../graph/variable-node.js';
import { isReferenceValid, resolveEventDateTime, resolveEventReference, resolveEventServerReference, resolveLoopTickDeltaTime, resolveLoopTickMs } from './reference-validity.js';

/** Ветви-обработчики событий, где Event-узел является источником data. */
export type ScenarioHandlerBranch = 'onConnect' | 'initial' | 'onStop' | 'onDisconnect';

/** Контекст pull-резолюции data-входа (ветвь + handle подключённого устройства). */
export interface ResolveInputContext {
  /** Ветвь-обработчик (onConnect/initial/…); не задана в main/alarm loop. */
  readonly handlerBranch?: ScenarioHandlerBranch;
  /** Handle подключённого устройства; `null` если offline или onDisconnect. */
  readonly deviceHandle?: string | null;
  /** ISO-время срабатывания Event-триггера (для `DateTime` value). */
  readonly triggeredAt?: string;
  /** Handle связанного сервера (cabinet/media); только onConnect. */
  readonly serverHandle?: string | null;
  /** onTick: миллисекунды с начала сценария (для `deltatime`). */
  readonly loopElapsedMs?: number;
  /** onTick: миллисекунды с предыдущего тика лупа (для `tickMs`). */
  readonly loopTickMs?: number;
}

export type ResolveInputErrorCode =
  | 'missing-source-node'
  | 'unsupported-source'
  | 'type-mismatch'
  | 'cycle'
  | 'missing-variable';

/** Ошибка dataflow-резолюции (типовая несовместимость, цикл, неизвестный источник). */
export class ResolveInputError extends Error {
  readonly code: ResolveInputErrorCode;

  constructor(code: ResolveInputErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ResolveInputError';
    this.code = code;
  }
}

function findNode(subgraph: ScenarioSubgraph, nodeId: string): ScenarioGraphNode | undefined {
  return subgraph.nodes.find((node) => node.id === nodeId);
}

function findDataEdge(
  subgraph: ScenarioSubgraph,
  targetNodeId: string,
  targetPort: string,
): ScenarioSubgraph['edges'][number] | undefined {
  return subgraph.edges.find(
    (edge) =>
      edge.kind === 'data' && edge.target === targetNodeId && edge.targetHandle === targetPort,
  );
}

function assertTypeCompatible(
  edge: ScenarioSubgraph['edges'][number],
  value: ScenarioVariableValue | null,
): void {
  if (value === null || edge.dataType === undefined) {
    return;
  }
  if (value.kind !== edge.dataType) {
    throw new ResolveInputError(
      'type-mismatch',
      `Expected ${edge.dataType}, got ${value.kind}`,
    );
  }
}

function readMicrophoneId(node: ScenarioGraphNode): string | undefined {
  return (node as ScenarioGraphNode & { microphoneId?: string }).microphoneId;
}

function resolveGetMicrophoneOutput(
  subgraph: ScenarioSubgraph,
  variables: readonly ScenarioVariable[],
  node: ScenarioGraphNode,
  context: ResolveInputContext,
  visiting: Set<string>,
): ScenarioReferenceValue | null {
  const deviceRef = resolveInput(
    subgraph,
    variables,
    node.id,
    GET_MICROPHONE_DEVICE_HANDLE,
    context,
    visiting,
  );
  if (!isReferenceValid(deviceRef)) {
    return { kind: 'MicrophoneRef', handle: null, valid: false };
  }
  const microphoneId = readMicrophoneId(node);
  if (microphoneId === undefined || microphoneId.length === 0) {
    return null;
  }
  return createReferenceValue('MicrophoneRef', microphoneId);
}

/** Резолв data-выхода узла (для runtime-инспекции и pull-цепочки). */
export function resolveNodeOutput(
  subgraph: ScenarioSubgraph,
  variables: readonly ScenarioVariable[],
  node: ScenarioGraphNode,
  outputPort: string,
  context: ResolveInputContext,
  visiting: Set<string>,
): ScenarioVariableValue | null {
  if (node.nodeKind === 'event') {
    if (outputPort === EVENT_DELTATIME_HANDLE) {
      if (context.loopElapsedMs === undefined) {
        throw new ResolveInputError('unsupported-source', 'deltatime requires loop tick context');
      }
      return resolveLoopTickDeltaTime(context.loopElapsedMs);
    }
    if (outputPort === EVENT_TICK_MS_HANDLE) {
      if (context.loopTickMs === undefined) {
        throw new ResolveInputError('unsupported-source', 'tickMs requires loop tick context');
      }
      return resolveLoopTickMs(context.loopTickMs);
    }
    if (outputPort === EVENT_DEVICE_HANDLE) {
      if (context.handlerBranch === undefined) {
        throw new ResolveInputError('unsupported-source', 'device output requires handler branch');
      }
      return resolveEventReference(context.handlerBranch, context.deviceHandle ?? null);
    }
    if (outputPort === EVENT_SERVER_HANDLE) {
      if (context.handlerBranch === undefined) {
        throw new ResolveInputError('unsupported-source', 'server output requires handler branch');
      }
      return resolveEventServerReference(context.handlerBranch, context.serverHandle);
    }
    if (outputPort === EVENT_DATETIME_HANDLE) {
      return resolveEventDateTime(context.triggeredAt);
    }
    throw new ResolveInputError('unsupported-source', `Unknown Event output: ${outputPort}`);
  }

  if (node.nodeKind === 'variable-get') {
    if (outputPort !== VARIABLE_VALUE_HANDLE) {
      throw new ResolveInputError('unsupported-source', `Unknown variable-get output: ${outputPort}`);
    }
    const variableId = node.variableId;
    if (variableId === undefined) {
      throw new ResolveInputError('missing-variable', `variable-get "${node.id}" missing variableId`);
    }
    const variable = variables.find((item) => item.id === variableId);
    if (variable === undefined) {
      throw new ResolveInputError('missing-variable', `Variable "${variableId}" not found`);
    }
    return variable.value;
  }

  if (node.nodeKind === 'variable-set') {
    if (outputPort !== VARIABLE_VALUE_HANDLE) {
      throw new ResolveInputError('unsupported-source', `Unknown variable-set output: ${outputPort}`);
    }
    return resolveInput(subgraph, variables, node.id, VARIABLE_VALUE_HANDLE, context, visiting);
  }

  if (node.nodeKind === 'get-microphone') {
    if (outputPort !== GET_MICROPHONE_OUT_HANDLE) {
      throw new ResolveInputError(
        'unsupported-source',
        `Unknown get-microphone output: ${outputPort}`,
      );
    }
    return resolveGetMicrophoneOutput(subgraph, variables, node, context, visiting);
  }

  throw new ResolveInputError(
    'unsupported-source',
    `Node "${node.id}" (kind=${node.nodeKind ?? node.blockKind}) is not a data source`,
  );
}

/**
 * Pull-резолюция data-входа узла: протягивает значение назад по data-ребру
 * до источника (Event / variable-get). Чистая функция без side-effects.
 */
export function resolveInput(
  subgraph: ScenarioSubgraph,
  variables: readonly ScenarioVariable[],
  nodeId: string,
  port: string,
  context: ResolveInputContext,
  visiting: Set<string> = new Set(),
): ScenarioVariableValue | null {
  const edge = findDataEdge(subgraph, nodeId, port);
  if (edge === undefined) {
    return null;
  }

  const visitKey = `${edge.source}:${edge.sourceHandle}`;
  if (visiting.has(visitKey)) {
    throw new ResolveInputError('cycle', `Dataflow cycle at ${visitKey}`);
  }
  visiting.add(visitKey);

  const sourceNode = findNode(subgraph, edge.source);
  if (sourceNode === undefined) {
    throw new ResolveInputError('missing-source-node', `Source node "${edge.source}" not found`);
  }

  const value = resolveNodeOutput(subgraph, variables, sourceNode, edge.sourceHandle, context, visiting);
  assertTypeCompatible(edge, value);
  return value;
}
