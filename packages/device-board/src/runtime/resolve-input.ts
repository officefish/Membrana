import {
  createReferenceValue,
  type ScenarioGraphNode,
  type ScenarioReferenceValue,
  type ScenarioSubgraph,
  type ScenarioVariable,
  type ScenarioVariableValue,
} from '@membrana/core';

import { EVENT_DEVICE_HANDLE, EVENT_DATETIME_HANDLE, EVENT_DELTATIME_HANDLE, EVENT_SERVER_HANDLE, EVENT_TICK_MS_HANDLE } from '../graph/event-node.js';
import { DEVICE_GLOBAL_DEVICE_HANDLE } from '../graph/device-global-node.js';
import {
  GET_RECORDER_DEVICE_HANDLE,
  GET_RECORDER_OUT_HANDLE,
} from '../graph/get-recorder-node.js';
import {
  GET_SPECTRAL_ANALYSER_DEVICE_HANDLE,
  GET_SPECTRAL_ANALYSER_OUT_HANDLE,
} from '../graph/get-spectral-analyser-node.js';
import {
  GET_AUDIO_STREAM_MIC_HANDLE,
  GET_AUDIO_STREAM_OUT_HANDLE,
  GET_FFT_FRAME_OUT_HANDLE,
  GET_MICROPHONE_DEVICE_HANDLE,
  GET_MICROPHONE_OUT_HANDLE,
  GET_SAMPLE_OUT_HANDLE,
  PRINT_OUT_HANDLE,
  STREAMING_MIC_HANDLE,
} from '../graph/palette-node.js';
import { COLLECT_BATCH_OUT_HANDLE } from '../graph/collect-node-shared.js';
import { VARIABLE_VALUE_HANDLE } from '../graph/variable-node.js';
import { isReferenceValid, resolveEventDateTime, resolveEventReference, resolveEventServerReference, resolveGlobalDeviceReference, resolveLoopTickDeltaTime, resolveLoopTickMs } from './reference-validity.js';

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
  /** Активный AudioStream (host); для get-audio-stream. */
  readonly getActiveAudioStreamRef?: () => ScenarioReferenceValue;
  /** Последний AudioSample по nodeId (host); для get-sample. */
  readonly getCapturedAudioSampleRef?: (nodeId: string) => ScenarioReferenceValue | null;
  /** Последний FftFrame по nodeId (host); для get-fft-frame. */
  readonly getCapturedFftFrameRef?: (nodeId: string) => ScenarioReferenceValue | null;
  /** Singleton RecorderRef по device handle (host, DBC2). */
  readonly getRecorderSessionRef?: (deviceHandle: string) => ScenarioReferenceValue | null;
  /** Singleton SpectralAnalyserRef по device handle (host, DBC2). */
  readonly getSpectralAnalyserSessionRef?: (deviceHandle: string) => ScenarioReferenceValue | null;
  /** Последний batch ref Collect-узла после flush (DBC3). */
  readonly getCollectBatchRef?: (nodeId: string) => ScenarioReferenceValue | null;
  /** Текст последнего Print по nodeId (host/runtime state). */
  readonly getPrintOutputValue?: (nodeId: string) => ScenarioVariableValue | null;
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

function invalidAudioStreamRef(): ScenarioReferenceValue {
  return { kind: 'AudioStreamRef', handle: null, valid: false };
}

function invalidAudioSampleRef(): ScenarioReferenceValue {
  return { kind: 'AudioSampleRef', handle: null, valid: false };
}

function invalidFftFrameRef(): ScenarioReferenceValue {
  return { kind: 'FftFrameRef', handle: null, valid: false };
}

function invalidRecorderRef(): ScenarioReferenceValue {
  return { kind: 'RecorderRef', handle: null, valid: false };
}

function invalidSpectralAnalyserRef(): ScenarioReferenceValue {
  return { kind: 'SpectralAnalyserRef', handle: null, valid: false };
}

function invalidAudioSampleRefList(): ScenarioReferenceValue {
  return { kind: 'AudioSampleRefList', handle: null, valid: false };
}

function invalidFftFrameRefList(): ScenarioReferenceValue {
  return { kind: 'FftFrameRefList', handle: null, valid: false };
}

function resolveGetAudioStreamOutput(
  subgraph: ScenarioSubgraph,
  variables: readonly ScenarioVariable[],
  node: ScenarioGraphNode,
  context: ResolveInputContext,
  visiting: Set<string>,
  microphonePort: string = GET_AUDIO_STREAM_MIC_HANDLE,
): ScenarioReferenceValue {
  const resolver = context.getActiveAudioStreamRef;
  if (resolver === undefined) {
    return invalidAudioStreamRef();
  }
  const active = resolver();
  if (!active.valid || active.handle === null) {
    return invalidAudioStreamRef();
  }

  const micRef = resolveInput(
    subgraph,
    variables,
    node.id,
    microphonePort,
    context,
    visiting,
  );
  if (micRef !== null && micRef.kind === 'MicrophoneRef') {
    if (!isReferenceValid(micRef) || micRef.handle === null) {
      return invalidAudioStreamRef();
    }
    const expectedHandle = `stream:${micRef.handle}`;
    if (active.handle !== expectedHandle) {
      return invalidAudioStreamRef();
    }
  }

  return active;
}

function resolveGetSampleOutput(
  node: ScenarioGraphNode,
  context: ResolveInputContext,
): ScenarioReferenceValue {
  const resolver = context.getCapturedAudioSampleRef;
  if (resolver === undefined) {
    return invalidAudioSampleRef();
  }
  return resolver(node.id) ?? invalidAudioSampleRef();
}

function resolveGetFftFrameOutput(
  node: ScenarioGraphNode,
  context: ResolveInputContext,
): ScenarioReferenceValue {
  const resolver = context.getCapturedFftFrameRef;
  if (resolver === undefined) {
    return invalidFftFrameRef();
  }
  return resolver(node.id) ?? invalidFftFrameRef();
}

function resolveGetRecorderOutput(
  subgraph: ScenarioSubgraph,
  variables: readonly ScenarioVariable[],
  node: ScenarioGraphNode,
  context: ResolveInputContext,
  visiting: Set<string>,
): ScenarioReferenceValue {
  const deviceRef = resolveInput(
    subgraph,
    variables,
    node.id,
    GET_RECORDER_DEVICE_HANDLE,
    context,
    visiting,
  );
  if (!isReferenceValid(deviceRef) || deviceRef === null || deviceRef.kind !== 'DeviceRef') {
    return invalidRecorderRef();
  }
  if (deviceRef.handle === null) {
    return invalidRecorderRef();
  }
  const resolver = context.getRecorderSessionRef;
  if (resolver === undefined) {
    return invalidRecorderRef();
  }
  return resolver(deviceRef.handle) ?? invalidRecorderRef();
}

function resolveGetSpectralAnalyserOutput(
  subgraph: ScenarioSubgraph,
  variables: readonly ScenarioVariable[],
  node: ScenarioGraphNode,
  context: ResolveInputContext,
  visiting: Set<string>,
): ScenarioReferenceValue {
  const deviceRef = resolveInput(
    subgraph,
    variables,
    node.id,
    GET_SPECTRAL_ANALYSER_DEVICE_HANDLE,
    context,
    visiting,
  );
  if (!isReferenceValid(deviceRef) || deviceRef === null || deviceRef.kind !== 'DeviceRef') {
    return invalidSpectralAnalyserRef();
  }
  if (deviceRef.handle === null) {
    return invalidSpectralAnalyserRef();
  }
  const resolver = context.getSpectralAnalyserSessionRef;
  if (resolver === undefined) {
    return invalidSpectralAnalyserRef();
  }
  return resolver(deviceRef.handle) ?? invalidSpectralAnalyserRef();
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

  if (node.nodeKind === 'device-global') {
    if (outputPort !== DEVICE_GLOBAL_DEVICE_HANDLE) {
      throw new ResolveInputError(
        'unsupported-source',
        `Unknown device-global output: ${outputPort}`,
      );
    }
    return resolveGlobalDeviceReference(context.deviceHandle ?? null);
  }

  if (node.nodeKind === 'get-audio-stream') {
    if (outputPort !== GET_AUDIO_STREAM_OUT_HANDLE) {
      throw new ResolveInputError(
        'unsupported-source',
        `Unknown get-audio-stream output: ${outputPort}`,
      );
    }
    return resolveGetAudioStreamOutput(subgraph, variables, node, context, visiting);
  }

  if (node.nodeKind === 'start-streaming') {
    if (outputPort !== GET_AUDIO_STREAM_OUT_HANDLE) {
      throw new ResolveInputError(
        'unsupported-source',
        `Unknown start-streaming output: ${outputPort}`,
      );
    }
    return resolveGetAudioStreamOutput(
      subgraph,
      variables,
      node,
      context,
      visiting,
      STREAMING_MIC_HANDLE,
    );
  }

  if (node.nodeKind === 'get-sample') {
    if (outputPort !== GET_SAMPLE_OUT_HANDLE) {
      throw new ResolveInputError('unsupported-source', `Unknown get-sample output: ${outputPort}`);
    }
    return resolveGetSampleOutput(node, context);
  }

  if (node.nodeKind === 'get-fft-frame') {
    if (outputPort !== GET_FFT_FRAME_OUT_HANDLE) {
      throw new ResolveInputError('unsupported-source', `Unknown get-fft-frame output: ${outputPort}`);
    }
    return resolveGetFftFrameOutput(node, context);
  }

  if (node.nodeKind === 'get-recorder') {
    if (outputPort !== GET_RECORDER_OUT_HANDLE) {
      throw new ResolveInputError('unsupported-source', `Unknown get-recorder output: ${outputPort}`);
    }
    return resolveGetRecorderOutput(subgraph, variables, node, context, visiting);
  }

  if (node.nodeKind === 'get-spectral-analyser') {
    if (outputPort !== GET_SPECTRAL_ANALYSER_OUT_HANDLE) {
      throw new ResolveInputError(
        'unsupported-source',
        `Unknown get-spectral-analyser output: ${outputPort}`,
      );
    }
    return resolveGetSpectralAnalyserOutput(subgraph, variables, node, context, visiting);
  }

  if (node.nodeKind === 'collect-samples') {
    if (outputPort !== COLLECT_BATCH_OUT_HANDLE) {
      throw new ResolveInputError(
        'unsupported-source',
        `Unknown collect-samples output: ${outputPort}`,
      );
    }
    const resolver = context.getCollectBatchRef;
    if (resolver === undefined) {
      return invalidAudioSampleRefList();
    }
    return resolver(node.id) ?? invalidAudioSampleRefList();
  }

  if (node.nodeKind === 'collect-fft-frames') {
    if (outputPort !== COLLECT_BATCH_OUT_HANDLE) {
      throw new ResolveInputError(
        'unsupported-source',
        `Unknown collect-fft-frames output: ${outputPort}`,
      );
    }
    const resolver = context.getCollectBatchRef;
    if (resolver === undefined) {
      return invalidFftFrameRefList();
    }
    return resolver(node.id) ?? invalidFftFrameRefList();
  }

  if (node.nodeKind === 'print') {
    if (outputPort !== PRINT_OUT_HANDLE) {
      throw new ResolveInputError('unsupported-source', `Unknown print output: ${outputPort}`);
    }
    const resolver = context.getPrintOutputValue;
    if (resolver === undefined) {
      return null;
    }
    return resolver(node.id);
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
