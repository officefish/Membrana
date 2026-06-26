import {
  createRecordingPolicyValue,
  createFftTrendsPolicyValue,
  resolveScenarioFftTrendsPolicy,
  resolveScenarioRecordingPolicy,
  createReferenceValue,
  type ScenarioFunctionSubgraph,
  type ScenarioGraphNode,
  type ScenarioReferenceValue,
  type ScenarioSubgraph,
  type ScenarioVariable,
  type ScenarioVariableValue,
} from '@membrana/core';

import { parseSubgraphFunctionId } from '../graph/subgraph-ref.js';

import { augmentResolveContextForFunctionCall } from './function-call-resolve.js';

import { EVENT_DEVICE_HANDLE, EVENT_DATETIME_HANDLE, EVENT_DELTATIME_HANDLE, EVENT_SERVER_HANDLE, EVENT_TICK_MS_HANDLE } from '../graph/event-node.js';
import { DEVICE_GLOBAL_DEVICE_HANDLE } from '../graph/device-global-node.js';
import {
  GET_JOURNAL_DEVICE_HANDLE,
  GET_JOURNAL_OUT_HANDLE,
  GET_JOURNAL_SERVER_HANDLE,
} from '../graph/get-journal-node.js';
import {
  GET_REPORTER_JOURNAL_HANDLE,
  GET_REPORTER_OUT_HANDLE,
} from '../graph/get-reporter-node.js';
import {
  MAKE_REPORT_FROM_ANALYSIS_OUT_HANDLE,
} from '../graph/make-report-from-analysis-node.js';
import {
  MAKE_REPORT_FROM_TRACK_OUT_HANDLE,
} from '../graph/make-report-from-track-node.js';
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
import {
  MAKE_FFT_TRENDS_ANALYSIS_OUT_HANDLE,
  isMakeFftTrendsAnalysisNodeKind,
} from '../graph/make-fft-trends-analysis-node.js';
import { MAKE_TRACK_OUT_HANDLE, isMakeTrackNodeKind } from '../graph/make-track-node.js';
import {
  ASYNC_PROMISE_REF_HANDLE,
  START_ASYNC_JOB_NODE_KIND,
} from '../graph/async-orchestration-nodes.js';
import {
  START_RECORDING_OUT_RECORDER_HANDLE,
  START_RECORDING_RECORDER_HANDLE,
} from '../graph/start-recording-node.js';
import {
  MAKE_RECORDING_POLICY_OUT_HANDLE,
  isMakeRecordingPolicyNodeKind,
  readMakeRecordingPolicyFromNodeData,
} from '../graph/make-recording-policy-node.js';
import {
  MAKE_FFT_TRENDS_POLICY_OUT_HANDLE,
  isMakeFftTrendsPolicyNodeKind,
  readMakeFftTrendsPolicyFromNodeData,
} from '../graph/make-fft-trends-policy-node.js';
import { STOP_RECORDING_SLICE_HANDLE } from '../graph/stop-recording-node.js';
import { FLUSH_SPECTRAL_FRAMES_HANDLE } from '../graph/flush-spectral-analyser-node.js';
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
  /** JournalRef device scope per deviceId (host, DBJ1). */
  readonly getDeviceJournalRef?: (deviceHandle: string) => ScenarioReferenceValue | null;
  /** JournalRef server scope per deviceId (host, DBJ1). */
  readonly getServerJournalRef?: (deviceHandle: string) => ScenarioReferenceValue | null;
  /** ReporterRef scoped к journal handle (runtime store / host, DBJ2). */
  readonly getReporterRef?: (journalHandle: string) => ScenarioReferenceValue | null;
  /** ReportRef последнего make-report узла (DBJ3). */
  readonly getReportRef?: (nodeId: string) => ScenarioReferenceValue | null;
  /** TrackRef последнего MakeTrack узла. */
  readonly getTrackRef?: (nodeId: string) => ScenarioReferenceValue | null;
  /** RecordingSliceRef последнего StopRecording узла (v0.7). */
  readonly getRecordingSliceRef?: (nodeId: string) => ScenarioReferenceValue | null;
  /** FftTrendAnalysisRef последнего MakeFftTrendsAnalysis узла. */
  readonly getFftTrendAnalysisRef?: (nodeId: string) => ScenarioReferenceValue | null;
  /** Последний batch ref Collect-узла после flush (DBC3). */
  readonly getCollectBatchRef?: (nodeId: string) => ScenarioReferenceValue | null;
  /** AP v1: PromiseRef от Start Async Job. */
  readonly getPromiseRef?: (nodeId: string) => ScenarioReferenceValue | null;
  /** Текст последнего Print по nodeId (host/runtime state). */
  readonly getPrintOutputValue?: (nodeId: string) => ScenarioVariableValue | null;
  /** User function call: resolve data pin from parent branch into function-input. */
  readonly resolveFunctionInputPin?: (pinId: string) => ScenarioVariableValue | null;
  /** Collapsed function blocks available for pure/data-only output pull. */
  readonly scenarioFunctions?: readonly ScenarioFunctionSubgraph[];
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

function resolveSubgraphBlockOutput(
  parentSubgraph: ScenarioSubgraph,
  functions: readonly ScenarioFunctionSubgraph[],
  blockNode: ScenarioGraphNode,
  outputPort: string,
  variables: readonly ScenarioVariable[],
  context: ResolveInputContext,
  visiting: Set<string>,
): ScenarioVariableValue | null {
  if (visiting.has(blockNode.id)) {
    throw new ResolveInputError('cycle', `Cycle at subgraph block "${blockNode.id}"`);
  }
  visiting.add(blockNode.id);

  const functionId = parseSubgraphFunctionId(blockNode);
  if (functionId === null) {
    throw new ResolveInputError(
      'unsupported-source',
      `Subgraph block "${blockNode.id}" missing function id`,
    );
  }
  const fn = functions.find((item) => item.id === functionId);
  if (fn === undefined) {
    throw new ResolveInputError(
      'unsupported-source',
      `Unknown function "${functionId}" for block "${blockNode.id}"`,
    );
  }

  const outputNode = fn.nodes.find((node) => node.nodeKind === 'function-output');
  if (outputNode === undefined) {
    throw new ResolveInputError(
      'unsupported-source',
      `Function "${functionId}" has no function-output`,
    );
  }

  const outboundEdge = fn.edges.find(
    (edge) =>
      edge.kind === 'data' &&
      edge.target === outputNode.id &&
      edge.targetHandle === outputPort,
  );
  if (outboundEdge === undefined || outboundEdge.sourceHandle === undefined) {
    throw new ResolveInputError(
      'unsupported-source',
      `Function "${functionId}" has no output pin "${outputPort}"`,
    );
  }

  const sourceNode = fn.nodes.find((node) => node.id === outboundEdge.source);
  if (sourceNode === undefined) {
    throw new ResolveInputError(
      'missing-source-node',
      `Missing source for function "${functionId}" output "${outputPort}"`,
    );
  }

  const callContext = augmentResolveContextForFunctionCall({
    parentSubgraph,
    blockNodeId: blockNode.id,
    variables,
    baseContext: context,
  });

  return resolveNodeOutput(
    fn,
    variables,
    sourceNode,
    outboundEdge.sourceHandle,
    callContext,
    visiting,
  );
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

function invalidJournalRef(): ScenarioReferenceValue {
  return { kind: 'JournalRef', handle: null, valid: false };
}

function invalidReporterRef(): ScenarioReferenceValue {
  return { kind: 'ReporterRef', handle: null, valid: false };
}

function invalidReportRef(): ScenarioReferenceValue {
  return { kind: 'ReportRef', handle: null, valid: false };
}

function invalidTrackRef(): ScenarioReferenceValue {
  return { kind: 'TrackRef', handle: null, valid: false };
}

function invalidRecordingSliceRef(): ScenarioReferenceValue {
  return { kind: 'RecordingSliceRef', handle: null, valid: false };
}

function invalidFftTrendAnalysisRef(): ScenarioReferenceValue {
  return { kind: 'FftTrendAnalysisRef', handle: null, valid: false };
}

function invalidPromiseRef(): ScenarioReferenceValue {
  return { kind: 'PromiseRef', handle: null, valid: false };
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
      // Preset graph microphoneId may be stale (host switch, Electron fallback to default).
      // Active capture stream from audio-engine is authoritative once streaming started.
      return active;
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

function resolveGetJournalOutput(
  subgraph: ScenarioSubgraph,
  variables: readonly ScenarioVariable[],
  node: ScenarioGraphNode,
  context: ResolveInputContext,
  visiting: Set<string>,
): ScenarioReferenceValue {
  const deviceEdge = findDataEdge(subgraph, node.id, GET_JOURNAL_DEVICE_HANDLE);
  if (deviceEdge !== undefined) {
    const deviceRef = resolveInput(
      subgraph,
      variables,
      node.id,
      GET_JOURNAL_DEVICE_HANDLE,
      context,
      visiting,
    );
    if (
      !isReferenceValid(deviceRef) ||
      deviceRef === null ||
      deviceRef.kind !== 'DeviceRef' ||
      deviceRef.handle === null
    ) {
      return invalidJournalRef();
    }
    const resolver = context.getDeviceJournalRef;
    if (resolver === undefined) {
      return invalidJournalRef();
    }
    return resolver(deviceRef.handle) ?? invalidJournalRef();
  }

  const serverEdge = findDataEdge(subgraph, node.id, GET_JOURNAL_SERVER_HANDLE);
  if (serverEdge !== undefined) {
    const serverRef = resolveInput(
      subgraph,
      variables,
      node.id,
      GET_JOURNAL_SERVER_HANDLE,
      context,
      visiting,
    );
    if (
      !isReferenceValid(serverRef) ||
      serverRef === null ||
      serverRef.kind !== 'ServerRef'
    ) {
      return invalidJournalRef();
    }
    const deviceId = context.deviceHandle;
    if (deviceId === null || deviceId === undefined || deviceId.length === 0) {
      return invalidJournalRef();
    }
    const resolver = context.getServerJournalRef;
    if (resolver === undefined) {
      return invalidJournalRef();
    }
    return resolver(deviceId) ?? invalidJournalRef();
  }

  return invalidJournalRef();
}

function resolveGetReporterOutput(
  subgraph: ScenarioSubgraph,
  variables: readonly ScenarioVariable[],
  node: ScenarioGraphNode,
  context: ResolveInputContext,
  visiting: Set<string>,
): ScenarioReferenceValue {
  const journalRef = resolveInput(
    subgraph,
    variables,
    node.id,
    GET_REPORTER_JOURNAL_HANDLE,
    context,
    visiting,
  );
  if (
    !isReferenceValid(journalRef) ||
    journalRef === null ||
    journalRef.kind !== 'JournalRef' ||
    journalRef.handle === null
  ) {
    return invalidReporterRef();
  }
  const resolver = context.getReporterRef;
  if (resolver === undefined) {
    return invalidReporterRef();
  }
  return resolver(journalRef.handle) ?? invalidReporterRef();
}

/** Резолв data-выхода узла (для runtime-инспекции и pull-цепочки). */
export function resolveNodeOutput(
  subgraph: ScenarioSubgraph,
  variables: readonly ScenarioVariable[],
  node: ScenarioGraphNode,
  outputPort: string,
  context: ResolveInputContext,
  visiting: Set<string> = new Set(),
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

  if (node.nodeKind === 'get-journal') {
    if (outputPort !== GET_JOURNAL_OUT_HANDLE) {
      throw new ResolveInputError('unsupported-source', `Unknown get-journal output: ${outputPort}`);
    }
    return resolveGetJournalOutput(subgraph, variables, node, context, visiting);
  }

  if (node.nodeKind === 'get-reporter') {
    if (outputPort !== GET_REPORTER_OUT_HANDLE) {
      throw new ResolveInputError('unsupported-source', `Unknown get-reporter output: ${outputPort}`);
    }
    return resolveGetReporterOutput(subgraph, variables, node, context, visiting);
  }

  if (node.nodeKind === 'make-report-from-track') {
    if (outputPort !== MAKE_REPORT_FROM_TRACK_OUT_HANDLE) {
      throw new ResolveInputError(
        'unsupported-source',
        `Unknown make-report-from-track output: ${outputPort}`,
      );
    }
    const resolver = context.getReportRef;
    if (resolver === undefined) {
      return invalidReportRef();
    }
    return resolver(node.id) ?? invalidReportRef();
  }

  if (node.nodeKind === 'make-report-from-analysis') {
    if (outputPort !== MAKE_REPORT_FROM_ANALYSIS_OUT_HANDLE) {
      throw new ResolveInputError(
        'unsupported-source',
        `Unknown make-report-from-analysis output: ${outputPort}`,
      );
    }
    const resolver = context.getReportRef;
    if (resolver === undefined) {
      return invalidReportRef();
    }
    return resolver(node.id) ?? invalidReportRef();
  }

  if (isMakeRecordingPolicyNodeKind(node.nodeKind)) {
    if (outputPort !== MAKE_RECORDING_POLICY_OUT_HANDLE) {
      throw new ResolveInputError(
        'unsupported-source',
        `Unknown make-recording-policy output: ${outputPort}`,
      );
    }
    const raw = readMakeRecordingPolicyFromNodeData(node as unknown as Record<string, unknown>);
    const resolved = resolveScenarioRecordingPolicy(raw);
    return createRecordingPolicyValue(resolved.windowSec, resolved.captureFormat);
  }

  if (isMakeFftTrendsPolicyNodeKind(node.nodeKind)) {
    if (outputPort !== MAKE_FFT_TRENDS_POLICY_OUT_HANDLE) {
      throw new ResolveInputError(
        'unsupported-source',
        `Unknown make-fft-trends-policy output: ${outputPort}`,
      );
    }
    const raw = readMakeFftTrendsPolicyFromNodeData(node as unknown as Record<string, unknown>);
    const resolved = resolveScenarioFftTrendsPolicy(raw);
    return createFftTrendsPolicyValue({
      detectionMode: resolved.detectionMode,
      measurementsCount: resolved.measurementsCount,
      intervalMs: resolved.intervalMs,
      minConfidence: resolved.minConfidence,
      minRms: resolved.minRms,
      enabledTemplateKeys: resolved.enabledTemplateKeys,
    });
  }

  if (isMakeTrackNodeKind(node.nodeKind)) {
    if (outputPort !== MAKE_TRACK_OUT_HANDLE) {
      throw new ResolveInputError('unsupported-source', `Unknown make-track output: ${outputPort}`);
    }
    const resolver = context.getTrackRef;
    if (resolver === undefined) {
      return invalidTrackRef();
    }
    return resolver(node.id) ?? invalidTrackRef();
  }

  if (node.nodeKind === START_ASYNC_JOB_NODE_KIND) {
    if (outputPort !== ASYNC_PROMISE_REF_HANDLE) {
      throw new ResolveInputError(
        'unsupported-source',
        `Unknown start-async-job output: ${outputPort}`,
      );
    }
    const resolver = context.getPromiseRef;
    if (resolver === undefined) {
      return invalidPromiseRef();
    }
    return resolver(node.id) ?? invalidPromiseRef();
  }

  if (isMakeFftTrendsAnalysisNodeKind(node.nodeKind)) {
    if (outputPort !== MAKE_FFT_TRENDS_ANALYSIS_OUT_HANDLE) {
      throw new ResolveInputError(
        'unsupported-source',
        `Unknown make-fft-trends-analysis output: ${outputPort}`,
      );
    }
    const resolver = context.getFftTrendAnalysisRef;
    if (resolver === undefined) {
      return invalidFftTrendAnalysisRef();
    }
    return resolver(node.id) ?? invalidFftTrendAnalysisRef();
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

  if (node.nodeKind === 'flush-spectral-analyser') {
    if (outputPort !== FLUSH_SPECTRAL_FRAMES_HANDLE) {
      throw new ResolveInputError(
        'unsupported-source',
        `Unknown flush-spectral-analyser output: ${outputPort}`,
      );
    }
    const resolver = context.getCollectBatchRef;
    if (resolver === undefined) {
      return invalidFftFrameRefList();
    }
    return resolver(node.id) ?? invalidFftFrameRefList();
  }

  if (node.nodeKind === 'start-recording') {
    if (outputPort !== START_RECORDING_OUT_RECORDER_HANDLE) {
      throw new ResolveInputError(
        'unsupported-source',
        `Unknown start-recording output: ${outputPort}`,
      );
    }
    const passthrough = resolveInput(
      subgraph,
      variables,
      node.id,
      START_RECORDING_RECORDER_HANDLE,
      context,
      visiting,
    );
    if (passthrough === null || passthrough.kind !== 'RecorderRef') {
      return invalidRecorderRef();
    }
    return passthrough;
  }

  if (node.nodeKind === 'stop-recording') {
    if (outputPort !== STOP_RECORDING_SLICE_HANDLE) {
      throw new ResolveInputError(
        'unsupported-source',
        `Unknown stop-recording output: ${outputPort}`,
      );
    }
    const resolver = context.getRecordingSliceRef;
    if (resolver === undefined) {
      return invalidRecordingSliceRef();
    }
    return resolver(node.id) ?? invalidRecordingSliceRef();
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

  if (node.nodeKind === 'function-input') {
    const resolver = context.resolveFunctionInputPin;
    if (resolver === undefined) {
      throw new ResolveInputError(
        'unsupported-source',
        `Node "${node.id}" (kind=function-input) is not a data source`,
      );
    }
    return resolver(outputPort);
  }

  if (node.blockKind === 'subgraph') {
    const functions = context.scenarioFunctions;
    if (functions === undefined || functions.length === 0) {
      throw new ResolveInputError(
        'unsupported-source',
        `Node "${node.id}" (kind=subgraph) is not a data source`,
      );
    }
    return resolveSubgraphBlockOutput(
      subgraph,
      functions,
      node,
      outputPort,
      variables,
      context,
      visiting,
    );
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
