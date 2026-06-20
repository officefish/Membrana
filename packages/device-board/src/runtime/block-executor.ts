import type { ScenarioFunctionSubgraph, ScenarioGraphNode, ScenarioReferenceValue, ScenarioSubgraph } from '@membrana/core';

import { VARIABLE_VALUE_HANDLE } from '../graph/variable-node.js';
import {
  GET_AUDIO_STREAM_MIC_HANDLE,
  GET_FFT_FRAME_SAMPLE_HANDLE,
  GET_SAMPLE_STREAM_HANDLE,
  PALETTE_VALUE_HANDLE,
  IS_VALID_FALSE_HANDLE,
  IS_VALID_TRUE_HANDLE,
  STOP_STREAMING_MIC_HANDLE,
  STREAMING_MIC_HANDLE,
} from '../graph/palette-node.js';
import { STOP_RUNTIME_DEVICE_HANDLE } from '../graph/stop-runtime-node.js';
import { GET_RECORDER_DEVICE_HANDLE } from '../graph/get-recorder-node.js';
import { GET_JOURNAL_DEVICE_HANDLE } from '../graph/get-journal-node.js';
import { GET_REPORTER_JOURNAL_HANDLE } from '../graph/get-reporter-node.js';
import {
  MAKE_REPORT_FROM_ANALYSIS_ANALYSIS_HANDLE,
  MAKE_REPORT_FROM_ANALYSIS_REPORTER_HANDLE,
} from '../graph/make-report-from-analysis-node.js';
import {
  MAKE_REPORT_FROM_TRACK_REPORTER_HANDLE,
  MAKE_REPORT_FROM_TRACK_TRACK_HANDLE,
} from '../graph/make-report-from-track-node.js';
import { GET_SPECTRAL_ANALYSER_DEVICE_HANDLE } from '../graph/get-spectral-analyser-node.js';
import { NEW_TRACK_SAMPLES_HANDLE } from '../graph/new-track-node.js';
import { NEW_FFT_TRENDS_FRAMES_HANDLE } from '../graph/new-fft-trends-analysis-node.js';
import { parseSubgraphFunctionId } from '../graph/subgraph-ref.js';
import { runSubgraphOnce } from './exec-subgraph.js';
import { formatVariableValueForPrintRuntime } from './format-reference.js';
import type { ScenarioRuntimeHost } from './host.js';
import { executeCollectNode } from './collect-node-executor.js';
import type { CollectRuntimeStore } from './collect-runtime-store.js';
import type { ReportRuntimeStore } from './report-runtime-store.js';
import { resolveRefListMembers } from './resolve-ref-list.js';
import { resolveInput, type ResolveInputContext } from './resolve-input.js';
import { isReferenceValid } from './reference-validity.js';
import type { ScenarioDetectionResult } from './types.js';
import type { ScenarioRuntimeBranch } from './types.js';
import type { ScenarioVariableStore } from './variable-store.js';

export interface BlockExecutionInput {
  readonly host: ScenarioRuntimeHost;
  readonly signal: AbortSignal;
  readonly branch: ScenarioRuntimeBranch;
  readonly subgraph: ScenarioSubgraph;
  readonly node: ScenarioGraphNode;
  readonly lastDetection: ScenarioDetectionResult | null;
  readonly defaultChunkDurationMs: number;
  readonly functions: readonly ScenarioFunctionSubgraph[];
  readonly variableStore?: ScenarioVariableStore;
  readonly resolveContext?: ResolveInputContext;
  /** Колбэк после успешного Print (для UI-инспектора). */
  readonly onPrintOutput?: (nodeId: string, message: string) => void;
  /** v0.4 StopRuntime: выход из runtime в режим редактирования (требует DeviceRef). */
  readonly onStopRuntime?: () => void;
  /** v0.5 DBC3: in-memory flush/batch state Collect-узлов. */
  readonly collectStore?: CollectRuntimeStore;
  /** v0.6 DBJ3: in-memory ReportRef payloads от make-report узлов. */
  readonly reportStore?: ReportRuntimeStore;
}

export interface BlockExecutionResult {
  readonly lastDetection: ScenarioDetectionResult | null;
  readonly stopRequested: boolean;
  /** v0.4 DBR5: exec-выход для условных узлов (`is-valid`). */
  readonly execOutHandle?: string;
  /** v0.5 DBC3/5: event-out при flush Collect; dispatch в exec-subgraph (DBC5). */
  readonly eventOutHandle?: string;
  /** Достигнут системный loop-repeat (∞) — завершить итерацию лупа. */
  readonly loopRepeatRequested?: boolean;
}

function assertNotAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException('Scenario aborted', 'AbortError');
  }
}

function journalPayload(
  branch: ScenarioRuntimeBranch,
  lastDetection: ScenarioDetectionResult | null,
  rawLevel?: number,
): Record<string, unknown> | undefined {
  if (branch === 'alarm') {
    return rawLevel !== undefined ? { rawLevel, phase: 'alarm' } : { phase: 'alarm' };
  }
  if (branch === 'onStop') {
    return { phase: 'onStop' };
  }
  if (branch === 'onDisconnect') {
    return { phase: 'onDisconnect' };
  }
  if (lastDetection === null) {
    return undefined;
  }
  return {
    detected: lastDetection.detected,
    confidence: lastDetection.confidence,
    templateId: lastDetection.templateId,
    rawLevel: lastDetection.rawLevel,
  };
}

/** Исполняет один блок scenario graph через host-порты. */
export async function executeScenarioBlock(input: BlockExecutionInput): Promise<BlockExecutionResult> {
  const {
    host,
    signal,
    branch,
    subgraph,
    node,
    lastDetection,
    defaultChunkDurationMs,
    functions,
    variableStore,
    resolveContext,
    onPrintOutput,
    onStopRuntime,
    collectStore,
    reportStore,
  } = input;

  assertNotAborted(signal);

  if (node.nodeKind === 'event') {
    host.log('event', { nodeId: node.id, branch });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'loop-repeat') {
    host.log('loop-repeat', { nodeId: node.id, branch });
    return { lastDetection, stopRequested: false, loopRepeatRequested: true };
  }

  if (node.nodeKind === 'variable-get') {
    host.log('variable-get', { nodeId: node.id, branch, variableId: node.variableId });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'variable-set') {
    const variableId = node.variableId;
    if (variableId === undefined) {
      throw new Error(`variable-set node "${node.id}" missing variableId`);
    }
    if (variableStore === undefined || resolveContext === undefined) {
      throw new Error('variable-set requires variableStore and resolveContext');
    }

    const incoming = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      VARIABLE_VALUE_HANDLE,
      resolveContext,
    );
    variableStore.setValue(variableId, incoming);
    host.setScenarioVariable?.(variableId, variableStore.getValue(variableId));
    host.log('variable-set', { nodeId: node.id, branch, variableId, incoming });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'print') {
    if (variableStore === undefined || resolveContext === undefined) {
      throw new Error('print requires variableStore and resolveContext');
    }
    const ref = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      PALETTE_VALUE_HANDLE,
      resolveContext,
    );
    const message = await formatVariableValueForPrintRuntime(ref, host);
    onPrintOutput?.(node.id, message);
    if (host.printLine !== undefined) {
      host.printLine(message);
    } else {
      host.log(`print: ${message}`, { nodeId: node.id, branch, ref });
    }
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'is-valid') {
    if (variableStore === undefined || resolveContext === undefined) {
      throw new Error('is-valid requires variableStore and resolveContext');
    }
    const ref = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      PALETTE_VALUE_HANDLE,
      resolveContext,
    );
    const valid = isReferenceValid(ref);
    host.log('is-valid', { nodeId: node.id, branch, valid, ref });
    return {
      lastDetection,
      stopRequested: false,
      execOutHandle: valid ? IS_VALID_TRUE_HANDLE : IS_VALID_FALSE_HANDLE,
    };
  }

  if (node.nodeKind === 'get-microphone') {
    host.log('get-microphone', {
      nodeId: node.id,
      branch,
      microphoneId: (node as { microphoneId?: string }).microphoneId,
    });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'get-recorder') {
    let deviceHandle: string | null = null;
    if (variableStore !== undefined && resolveContext !== undefined) {
      const deviceRef = resolveInput(
        subgraph,
        variableStore.getAll(),
        node.id,
        GET_RECORDER_DEVICE_HANDLE,
        resolveContext,
      );
      if (
        deviceRef !== null &&
        deviceRef.kind === 'DeviceRef' &&
        isReferenceValid(deviceRef)
      ) {
        deviceHandle = deviceRef.handle;
      }
    }
    host.log('get-recorder', { nodeId: node.id, branch, device: deviceHandle });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'get-spectral-analyser') {
    let deviceHandle: string | null = null;
    if (variableStore !== undefined && resolveContext !== undefined) {
      const deviceRef = resolveInput(
        subgraph,
        variableStore.getAll(),
        node.id,
        GET_SPECTRAL_ANALYSER_DEVICE_HANDLE,
        resolveContext,
      );
      if (
        deviceRef !== null &&
        deviceRef.kind === 'DeviceRef' &&
        isReferenceValid(deviceRef)
      ) {
        deviceHandle = deviceRef.handle;
      }
    }
    host.log('get-spectral-analyser', { nodeId: node.id, branch, device: deviceHandle });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'get-journal') {
    let scope: 'device' | 'server' | null = null;
    let deviceHandle: string | null = null;
    if (variableStore !== undefined && resolveContext !== undefined) {
      const hasDeviceEdge = subgraph.edges.some(
        (edge) =>
          edge.kind === 'data' &&
          edge.target === node.id &&
          edge.targetHandle === GET_JOURNAL_DEVICE_HANDLE,
      );
      if (hasDeviceEdge) {
        scope = 'device';
        const deviceRef = resolveInput(
          subgraph,
          variableStore.getAll(),
          node.id,
          GET_JOURNAL_DEVICE_HANDLE,
          resolveContext,
        );
        if (
          deviceRef !== null &&
          deviceRef.kind === 'DeviceRef' &&
          isReferenceValid(deviceRef)
        ) {
          deviceHandle = deviceRef.handle;
        }
      } else {
        scope = 'server';
        deviceHandle = resolveContext.deviceHandle ?? null;
      }
    }
    host.log('get-journal', { nodeId: node.id, branch, scope, device: deviceHandle });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'get-reporter') {
    let journalHandle: string | null = null;
    if (variableStore !== undefined && resolveContext !== undefined) {
      const journalRef = resolveInput(
        subgraph,
        variableStore.getAll(),
        node.id,
        GET_REPORTER_JOURNAL_HANDLE,
        resolveContext,
      );
      if (
        journalRef !== null &&
        journalRef.kind === 'JournalRef' &&
        isReferenceValid(journalRef)
      ) {
        journalHandle = journalRef.handle;
      }
    }
    host.log('get-reporter', { nodeId: node.id, branch, journal: journalHandle });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'make-report-from-track') {
    if (variableStore === undefined || resolveContext === undefined || reportStore === undefined) {
      throw new Error('make-report-from-track requires variableStore, resolveContext and reportStore');
    }
    const reporterRef = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      MAKE_REPORT_FROM_TRACK_REPORTER_HANDLE,
      resolveContext,
    );
    const trackRef = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      MAKE_REPORT_FROM_TRACK_TRACK_HANDLE,
      resolveContext,
    );
    let reportId: string | null = null;
    if (
      reporterRef !== null &&
      reporterRef.kind === 'ReporterRef' &&
      isReferenceValid(reporterRef) &&
      trackRef !== null &&
      trackRef.kind === 'TrackRef' &&
      isReferenceValid(trackRef) &&
      host.makeReportFromTrack !== undefined
    ) {
      const payload = await host.makeReportFromTrack(reporterRef, trackRef);
      if (payload !== null) {
        reportStore.setNodeReport(node.id, payload);
        reportId = payload.reportId;
      }
    }
    host.log('make-report-from-track', {
      nodeId: node.id,
      branch,
      track:
        trackRef !== null && trackRef.kind === 'TrackRef' && isReferenceValid(trackRef)
          ? trackRef.handle
          : null,
      reportId,
    });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'make-report-from-analysis') {
    if (variableStore === undefined || resolveContext === undefined || reportStore === undefined) {
      throw new Error(
        'make-report-from-analysis requires variableStore, resolveContext and reportStore',
      );
    }
    const reporterRef = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      MAKE_REPORT_FROM_ANALYSIS_REPORTER_HANDLE,
      resolveContext,
    );
    const analysisRef = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      MAKE_REPORT_FROM_ANALYSIS_ANALYSIS_HANDLE,
      resolveContext,
    );
    let reportId: string | null = null;
    if (
      reporterRef !== null &&
      reporterRef.kind === 'ReporterRef' &&
      isReferenceValid(reporterRef) &&
      analysisRef !== null &&
      analysisRef.kind === 'FftTrendAnalysisRef' &&
      isReferenceValid(analysisRef) &&
      host.makeReportFromAnalysis !== undefined
    ) {
      const payload = await host.makeReportFromAnalysis(reporterRef, analysisRef);
      if (payload !== null) {
        reportStore.setNodeReport(node.id, payload);
        reportId = payload.reportId;
      }
    }
    host.log('make-report-from-analysis', {
      nodeId: node.id,
      branch,
      analysis:
        analysisRef !== null &&
        analysisRef.kind === 'FftTrendAnalysisRef' &&
        isReferenceValid(analysisRef)
          ? analysisRef.handle
          : null,
      reportId,
    });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'device-global') {
    host.log('device-global is data-only (GetDevice)', { nodeId: node.id, branch });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'stop-runtime') {
    if (variableStore === undefined || resolveContext === undefined) {
      throw new Error('stop-runtime requires variableStore and resolveContext');
    }
    const deviceRef = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      STOP_RUNTIME_DEVICE_HANDLE,
      resolveContext,
    );
    if (
      deviceRef === null ||
      deviceRef.kind !== 'DeviceRef' ||
      !isReferenceValid(deviceRef)
    ) {
      host.log('stop-runtime skipped: missing or invalid device ref', {
        nodeId: node.id,
        branch,
      });
      return { lastDetection, stopRequested: false };
    }
    onStopRuntime?.();
    host.log('stop-runtime StopRuntime', {
      nodeId: node.id,
      branch,
      device: deviceRef.handle,
    });
    return { lastDetection, stopRequested: true };
  }

  if (node.nodeKind === 'start-streaming') {
    let microphone: ScenarioReferenceValue | null = null;
    if (variableStore !== undefined && resolveContext !== undefined) {
      const resolved = resolveInput(
        subgraph,
        variableStore.getAll(),
        node.id,
        STREAMING_MIC_HANDLE,
        resolveContext,
      );
      microphone =
        resolved !== null && resolved.kind === 'MicrophoneRef' ? resolved : null;
    }
    if (host.startAudioStreaming !== undefined) {
      await host.startAudioStreaming(microphone);
    } else {
      await host.startStream();
    }
    host.log('start-streaming', { nodeId: node.id, branch, microphone: microphone?.handle });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'stop-streaming') {
    let microphone: ScenarioReferenceValue | null = null;
    if (variableStore !== undefined && resolveContext !== undefined) {
      const resolved = resolveInput(
        subgraph,
        variableStore.getAll(),
        node.id,
        STOP_STREAMING_MIC_HANDLE,
        resolveContext,
      );
      microphone =
        resolved !== null && resolved.kind === 'MicrophoneRef' ? resolved : null;
    }
    if (host.stopAudioStreaming !== undefined) {
      await host.stopAudioStreaming(microphone);
    } else {
      await host.stopStream();
    }
    host.log('stop-streaming', { nodeId: node.id, branch, microphone: microphone?.handle });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'get-audio-stream') {
    let microphone: ScenarioReferenceValue | null = null;
    if (variableStore !== undefined && resolveContext !== undefined) {
      const resolved = resolveInput(
        subgraph,
        variableStore.getAll(),
        node.id,
        GET_AUDIO_STREAM_MIC_HANDLE,
        resolveContext,
      );
      microphone =
        resolved !== null && resolved.kind === 'MicrophoneRef' ? resolved : null;
    }
    host.log('get-audio-stream', {
      nodeId: node.id,
      branch,
      microphone: microphone?.handle,
    });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'get-sample') {
    if (variableStore === undefined || resolveContext === undefined) {
      throw new Error('get-sample requires variableStore and resolveContext');
    }
    const streamRef = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      GET_SAMPLE_STREAM_HANDLE,
      resolveContext,
    );
    if (
      host.captureAudioSample !== undefined &&
      streamRef !== null &&
      streamRef.kind === 'AudioStreamRef'
    ) {
      await host.captureAudioSample(node.id, streamRef);
    }
    host.log('get-sample', {
      nodeId: node.id,
      branch,
      streamHandle: streamRef?.kind === 'AudioStreamRef' ? streamRef.handle : null,
    });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'get-fft-frame') {
    if (variableStore === undefined || resolveContext === undefined) {
      throw new Error('get-fft-frame requires variableStore and resolveContext');
    }
    const sampleRef = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      GET_FFT_FRAME_SAMPLE_HANDLE,
      resolveContext,
    );
    if (
      host.computeFftFrame !== undefined &&
      sampleRef !== null &&
      sampleRef.kind === 'AudioSampleRef'
    ) {
      await host.computeFftFrame(node.id, sampleRef);
    }
    host.log('get-fft-frame', {
      nodeId: node.id,
      branch,
      sampleHandle: sampleRef?.kind === 'AudioSampleRef' ? sampleRef.handle : null,
    });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'collect-samples' || node.nodeKind === 'collect-fft-frames') {
    if (variableStore === undefined || resolveContext === undefined || collectStore === undefined) {
      throw new Error(`${node.nodeKind} requires variableStore, resolveContext and collectStore`);
    }
    const collectResult = executeCollectNode({
      host,
      subgraph,
      node,
      variableStore,
      resolveContext,
      collectStore,
      mode: node.nodeKind === 'collect-samples' ? 'samples' : 'fft-frames',
    });
    host.log(node.nodeKind, {
      nodeId: node.id,
      branch,
      flushed: collectResult.flushed,
    });
    return {
      lastDetection,
      stopRequested: false,
      ...(collectResult.eventOutHandle !== undefined
        ? { eventOutHandle: collectResult.eventOutHandle }
        : {}),
    };
  }

  if (node.nodeKind === 'new-track') {
    if (variableStore === undefined || resolveContext === undefined) {
      throw new Error('new-track requires variableStore and resolveContext');
    }
    const listRef = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      NEW_TRACK_SAMPLES_HANDLE,
      resolveContext,
    );
    const sampleRefs = resolveRefListMembers(listRef, 'AudioSampleRefList', collectStore);
    let trackId: string | null = null;
    if (sampleRefs.length > 0 && host.createTrackFromSampleRefs !== undefined) {
      const result = await host.createTrackFromSampleRefs(node.id, sampleRefs);
      trackId = result?.trackId ?? null;
    }
    host.log('new-track', {
      nodeId: node.id,
      branch,
      sampleCount: sampleRefs.length,
      trackId,
    });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'new-fft-trends-analysis') {
    if (variableStore === undefined || resolveContext === undefined) {
      throw new Error('new-fft-trends-analysis requires variableStore and resolveContext');
    }
    const listRef = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      NEW_FFT_TRENDS_FRAMES_HANDLE,
      resolveContext,
    );
    const frameRefs = resolveRefListMembers(listRef, 'FftFrameRefList', collectStore);
    let detection = lastDetection;
    if (frameRefs.length > 0 && host.analyzeFftTrendsFromFrameRefs !== undefined) {
      detection = await host.analyzeFftTrendsFromFrameRefs(node.id, frameRefs);
    }
    host.log('new-fft-trends-analysis', {
      nodeId: node.id,
      branch,
      frameCount: frameRefs.length,
      detected: detection?.detected ?? false,
    });
    return { lastDetection: detection, stopRequested: false };
  }

  switch (node.blockKind) {
    case 'select-microphone':
      await host.selectMicrophone();
      host.log('select-microphone', { nodeId: node.id, branch });
      return { lastDetection, stopRequested: false };

    case 'start-stream':
      await host.startStream();
      host.log('start-stream', { nodeId: node.id, branch });
      return { lastDetection, stopRequested: false };

    case 'write-journal': {
      let rawLevel: number | undefined;
      if (branch === 'alarm') {
        const level = await host.evaluateSoundLevel();
        rawLevel = level.rawLevel;
      }
      await host.writeJournal({
        branch,
        blockKind: node.blockKind,
        nodeId: node.id,
        message: `${branch}: ${node.label ?? node.blockKind}`,
        payload: journalPayload(branch, lastDetection, rawLevel),
      });
      return { lastDetection, stopRequested: false };
    }

    case 'record-chunk': {
      const chunk = await host.recordChunk({ durationMs: defaultChunkDurationMs });
      host.log('record-chunk', { nodeId: node.id, clipId: chunk.clipId, branch });
      return { lastDetection, stopRequested: false };
    }

    case 'trends-fft-detect': {
      const detection = await host.trendsFftDetect();
      host.log('trends-fft-detect', {
        nodeId: node.id,
        detected: detection.detected,
        confidence: detection.confidence,
        branch,
      });
      return { lastDetection: detection, stopRequested: false };
    }

    case 'evaluate-sound-level': {
      const level = await host.evaluateSoundLevel();
      host.log('evaluate-sound-level', {
        nodeId: node.id,
        rawLevel: level.rawLevel,
        isQuietEnough: level.isQuietEnough,
        branch,
      });
      return { lastDetection, stopRequested: false };
    }

    case 'branch-on-detection':
      host.log('branch-on-detection', {
        nodeId: node.id,
        detected: lastDetection?.detected ?? false,
        branch,
      });
      return { lastDetection, stopRequested: false };

    case 'stop-scenario':
      host.log('stop-scenario', { nodeId: node.id, branch });
      return { lastDetection, stopRequested: true };

    case 'handle-disconnect':
      await host.stopStream();
      host.log('handle-disconnect', { nodeId: node.id, branch });
      return { lastDetection, stopRequested: true };

    case 'subgraph': {
      const functionId = parseSubgraphFunctionId(node);
      const fn = functions.find((item) => item.id === functionId);
      if (fn === undefined) {
        throw new Error(`Unknown scenario function: ${functionId ?? '?'}`);
      }
      const detection = await runSubgraphOnce(fn, host, signal, {
        branch,
        defaultChunkDurationMs,
        functions: [],
        variableStore,
        resolveContext,
      });
      host.log('subgraph', { nodeId: node.id, functionId: fn.id, branch });
      return { lastDetection: detection, stopRequested: false };
    }

    default:
      throw new Error(`Unsupported scenario block: ${node.blockKind}`);
  }
}
