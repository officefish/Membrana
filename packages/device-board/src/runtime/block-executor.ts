import type {
  FusionSourceInput,
  ScenarioFunctionSubgraph,
  ScenarioGraphNode,
  ScenarioReferenceValue,
  ScenarioSubgraph,
  ScenarioVariableValue,
} from '@membrana/core';
import {
  createDetectionFusionValue,
  fuseDetectorConfidences,
  isPolicyConstructorScenarioNodeKind,
  isRecordingGateScenarioNodeKind,
  isScenarioReferenceValue,
  resolveScenarioGraphNodePure,
} from '@membrana/core';

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
import {
  PUBLISH_REPORT_JOURNAL_HANDLE,
  PUBLISH_REPORT_REPORT_HANDLE,
} from '../graph/publish-report-node.js';
import { GET_SPECTRAL_ANALYSER_DEVICE_HANDLE } from '../graph/get-spectral-analyser-node.js';
import {
  isMakeFftTrendsAnalysisNodeKind,
  MAKE_FFT_TRENDS_ANALYSER_HANDLE,
  MAKE_FFT_TRENDS_FRAMES_HANDLE,
} from '../graph/make-fft-trends-analysis-node.js';
import {
  clampDetectionFusionInputCount,
  detectionFusionAnalysisHandle,
  isMakeDetectionFusionNodeKind,
} from '../graph/make-detection-fusion-node.js';
import {
  MAKE_ENSEMBLE_ANALYSIS_SAMPLES_HANDLE,
  isMakeEnsembleAnalysisNodeKind,
} from '../graph/make-ensemble-analysis-node.js';
import {
  MAKE_PROXIMITY_TREND_FUSION_HANDLE,
  isMakeProximityTrendNodeKind,
} from '../graph/make-proximity-trend-node.js';
import {
  MAKE_COMBINED_REPORT_ANALYSIS_1_HANDLE,
  MAKE_COMBINED_REPORT_ANALYSIS_2_HANDLE,
  MAKE_COMBINED_REPORT_REPORTER_HANDLE,
  MAKE_COMBINED_REPORT_TRACK_HANDLE,
  isMakeCombinedReportNodeKind,
} from '../graph/make-combined-report-node.js';
import {
  BRANCH_ON_DETECTION_DETECTED_HANDLE,
  BRANCH_ON_DETECTION_FUSION_HANDLE,
  BRANCH_ON_DETECTION_NOT_DETECTED_HANDLE,
  clampDetectionThreshold,
  isBranchOnDetectionNodeKind,
} from '../graph/branch-on-detection-node.js';
import {
  isMakeTrackNodeKind,
  MAKE_TRACK_RECORDER_HANDLE,
  MAKE_TRACK_SAMPLES_HANDLE,
  MAKE_TRACK_SLICE_HANDLE,
} from '../graph/make-track-node.js';
import { resolveFftTrendsPolicyForNode } from './resolve-fft-trends-policy.js';
import type { RecordingSliceRuntimeStore } from './recording-slice-runtime-store.js';
import type { AsyncJobStore } from './async-job-store.js';
import type { PromiseRuntimeStore } from './promise-runtime-store.js';
import { executeAsyncOrchestrationNode } from './async-promise-executor.js';
import { parseSubgraphFunctionId } from '../graph/subgraph-ref.js';
import { runSubgraphOnce } from './exec-subgraph.js';
import { formatVariableValueForPrintRuntime } from './format-reference.js';
import type { ScenarioRuntimeHost } from './host.js';
import { executeCollectNode } from './collect-node-executor.js';
import { executeRecordingGateNode } from './recording-gate-executor.js';
import type { CollectRuntimeStore } from './collect-runtime-store.js';
import type { ReportRuntimeStore } from './report-runtime-store.js';
import type { TrackRuntimeStore } from './track-runtime-store.js';
import type { FftTrendAnalysisRuntimeStore } from './analysis-runtime-store.js';
import type { DetectionFusionRuntimeStore } from './fusion-runtime-store.js';
import type { EnsembleAnalysisRuntimeStore } from './ensemble-runtime-store.js';
import type { ProximityRuntimeStore } from './proximity-runtime-store.js';
import { resolveRefListMembers } from './resolve-ref-list.js';
import { resolveInput, type ResolveInputContext } from './resolve-input.js';
import { augmentResolveContextForFunctionCall } from './function-call-resolve.js';
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
  /** v0.7 PauseRuntime: заморозка без onStop. */
  readonly onPauseRuntime?: () => void;
  /** v0.7: ждать снятия пользовательской паузы (toolbar Resume). */
  readonly awaitUnpaused?: () => Promise<void>;
  /** v0.5 DBC3: in-memory flush/batch state Collect-узлов. */
  readonly collectStore?: CollectRuntimeStore;
  /** v0.6 DBJ3: in-memory ReportRef payloads от make-report узлов. */
  readonly reportStore?: ReportRuntimeStore;
  /** v0.6: TrackRef от NewTrack. */
  readonly trackStore?: TrackRuntimeStore;
  /** v0.6: FftTrendAnalysisRef от NewFftTrendsAnalysis. */
  readonly analysisStore?: FftTrendAnalysisRuntimeStore;
  /** basn-2: value DetectionFusion от MakeDetectionFusion. */
  readonly fusionStore?: DetectionFusionRuntimeStore;
  /** basn-1: EnsembleAnalysisRef от MakeEnsembleAnalysis. */
  readonly ensembleStore?: EnsembleAnalysisRuntimeStore;
  /** basn-4: ProximityRef от MakeProximityTrend (lost → invalid). */
  readonly proximityStore?: ProximityRuntimeStore;
  /** v0.7: RecordingSliceRef от StopRecording. */
  readonly recordingSliceStore?: RecordingSliceRuntimeStore;
  /** AP v1: async job registry. */
  readonly asyncJobStore?: AsyncJobStore;
  /** AP v1: PromiseRef per start-async-job node. */
  readonly promiseRuntimeStore?: PromiseRuntimeStore;
  /** Correlation run id (scenario-runtime). */
  readonly runId?: string | null;
  /** Main/alarm loop tick for async job correlation. */
  readonly loopTick?: number;
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
    onPauseRuntime,
    awaitUnpaused,
    collectStore,
    reportStore,
    trackStore,
    analysisStore,
    fusionStore,
    ensembleStore,
    proximityStore,
    recordingSliceStore,
    asyncJobStore,
    promiseRuntimeStore,
    runId,
    loopTick,
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
    if (!resolveScenarioGraphNodePure(node)) {
      host.log('variable-get', { nodeId: node.id, branch, variableId: node.variableId });
    }
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
    if (!resolveScenarioGraphNodePure(node)) {
      host.log('get-recorder', { nodeId: node.id, branch, device: deviceHandle });
    }
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
    if (!resolveScenarioGraphNodePure(node)) {
      host.log('get-spectral-analyser', { nodeId: node.id, branch, device: deviceHandle });
    }
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
    let skipReason: string | null = null;
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
      } else {
        skipReason = 'makeReportFromTrack-returned-null';
      }
    } else {
      skipReason = 'invalid-inputs';
    }
    host.log('make-report-from-track', {
      nodeId: node.id,
      branch,
      track:
        trackRef !== null && trackRef.kind === 'TrackRef' && isReferenceValid(trackRef)
          ? trackRef.handle
          : null,
      reporterValid:
        reporterRef !== null && reporterRef.kind === 'ReporterRef' && isReferenceValid(reporterRef),
      reportId,
      skipReason,
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

  if (node.nodeKind === 'publish-report') {
    if (variableStore === undefined || resolveContext === undefined || reportStore === undefined) {
      throw new Error('publish-report requires variableStore, resolveContext and reportStore');
    }
    const journalRef = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      PUBLISH_REPORT_JOURNAL_HANDLE,
      resolveContext,
    );
    const reportRef = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      PUBLISH_REPORT_REPORT_HANDLE,
      resolveContext,
    );
    let published = false;
    let skipReason: string | null = null;
    if (
      journalRef !== null &&
      journalRef.kind === 'JournalRef' &&
      isReferenceValid(journalRef) &&
      reportRef !== null &&
      reportRef.kind === 'ReportRef' &&
      isReferenceValid(reportRef) &&
      reportRef.handle !== null &&
      host.publishReport !== undefined
    ) {
      const payload = reportStore.getPayload(reportRef.handle);
      if (payload !== null) {
        published = await host.publishReport(journalRef, payload);
        if (!published) {
          skipReason = 'publishReport-returned-false';
        }
      } else {
        skipReason = 'report-payload-missing';
      }
    } else {
      skipReason = 'invalid-inputs';
    }
    host.log('publish-report', {
      nodeId: node.id,
      branch,
      journal:
        journalRef !== null && journalRef.kind === 'JournalRef' && isReferenceValid(journalRef)
          ? journalRef.handle
          : null,
      report:
        reportRef !== null && reportRef.kind === 'ReportRef' && isReferenceValid(reportRef)
          ? reportRef.handle
          : null,
      published,
      skipReason,
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

  if (
    node.nodeKind === 'start-async-job' ||
    node.nodeKind === 'await-promise' ||
    node.nodeKind === 'cancel-async-jobs'
  ) {
    if (runId === undefined || runId === null) {
      throw new Error(`${node.nodeKind} requires runId`);
    }
    await executeAsyncOrchestrationNode({
      host,
      signal,
      branch,
      subgraph,
      node,
      runId,
      loopTick,
      variableStore,
      resolveContext,
      asyncJobStore,
      promiseRuntimeStore,
    });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind === 'pause-runtime') {
    onPauseRuntime?.();
    host.log('pause-runtime PauseRuntime', { nodeId: node.id, branch });
    if (awaitUnpaused !== undefined) {
      await awaitUnpaused();
    }
    return { lastDetection, stopRequested: false };
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
    const capturedRef = host.getCapturedAudioSampleRef?.(node.id);
    const capturedMeta =
      capturedRef !== undefined &&
      capturedRef !== null &&
      capturedRef.valid &&
      capturedRef.handle !== null
        ? await host.getResourceMetadata?.(capturedRef)
        : null;
    host.log('get-sample', {
      nodeId: node.id,
      branch,
      streamHandle: streamRef?.kind === 'AudioStreamRef' ? streamRef.handle : null,
      streamValid: streamRef !== null && isReferenceValid(streamRef),
      capturedValid: capturedRef?.valid ?? false,
      capturedHandle: capturedRef?.handle ?? null,
      capturedRms: capturedMeta?.fields.rms ?? null,
      capturedDurationMs: capturedMeta?.fields.durationMs ?? null,
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
    const frameRef = host.getCapturedFftFrameRef?.(node.id);
    const frameMeta =
      frameRef !== undefined &&
      frameRef !== null &&
      frameRef.valid &&
      frameRef.handle !== null
        ? await host.getResourceMetadata?.(frameRef)
        : null;
    host.log('get-fft-frame', {
      nodeId: node.id,
      branch,
      sampleHandle: sampleRef?.kind === 'AudioSampleRef' ? sampleRef.handle : null,
      sampleValid: sampleRef !== null && isReferenceValid(sampleRef),
      frameValid: frameRef?.valid ?? false,
      frameHandle: frameRef?.handle ?? null,
      frameRms: frameMeta?.fields.rms ?? null,
      dominantHz: frameMeta?.fields.dominantHz ?? null,
    });
    return { lastDetection, stopRequested: false };
  }

  if (node.nodeKind !== undefined && isPolicyConstructorScenarioNodeKind(node.nodeKind)) {
    throw new Error(
      `${node.nodeKind} "${node.id}" is pure and must not run on exec chain (use data-edge only)`,
    );
  }

  if (node.nodeKind !== undefined && isRecordingGateScenarioNodeKind(node.nodeKind)) {
    if (variableStore === undefined || resolveContext === undefined) {
      throw new Error(`${node.nodeKind} requires variableStore and resolveContext`);
    }
    const gateResult = await executeRecordingGateNode({
      host,
      subgraph,
      node,
      variableStore,
      resolveContext,
      collectStore,
      recordingSliceStore,
    });
    return {
      lastDetection,
      stopRequested: false,
      ...(gateResult.execOutHandle !== undefined
        ? { execOutHandle: gateResult.execOutHandle }
        : {}),
    };
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

  if (isMakeTrackNodeKind(node.nodeKind)) {
    if (variableStore === undefined || resolveContext === undefined || trackStore === undefined) {
      throw new Error('make-track requires variableStore, resolveContext and trackStore');
    }
    const recorderRef = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      MAKE_TRACK_RECORDER_HANDLE,
      resolveContext,
    );
    if (
      recorderRef === null ||
      recorderRef.kind !== 'RecorderRef' ||
      !isReferenceValid(recorderRef)
    ) {
      throw new Error(
        `MakeTrack "${node.id}": missing or invalid RecorderRef on port "${MAKE_TRACK_RECORDER_HANDLE}"`,
      );
    }
    const listRef = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      MAKE_TRACK_SAMPLES_HANDLE,
      resolveContext,
    );
    const sliceRef = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      MAKE_TRACK_SLICE_HANDLE,
      resolveContext,
    );
    const hasSlice =
      sliceRef !== null &&
      sliceRef.kind === 'RecordingSliceRef' &&
      isReferenceValid(sliceRef);
    const sampleRefs = resolveRefListMembers(listRef, 'AudioSampleRefList', collectStore);
    let trackHandle: string | null = null;
    if (hasSlice && host.createTrackFromRecordingSliceRef !== undefined) {
      const result = await host.createTrackFromRecordingSliceRef(node.id, sliceRef);
      if (result !== null) {
        const trackRef = trackStore.setNodeTrack(node.id, result.trackId);
        trackHandle = trackRef.handle;
      }
    } else if (sampleRefs.length > 0 && host.createTrackFromSampleRefs !== undefined) {
      const result = await host.createTrackFromSampleRefs(node.id, sampleRefs);
      if (result !== null) {
        const trackRef = trackStore.setNodeTrack(node.id, result.trackId);
        trackHandle = trackRef.handle;
      }
    } else {
      throw new Error(
        `MakeTrack "${node.id}": provide RecordingSliceRef or non-empty AudioSampleRefList`,
      );
    }
    host.log('make-track', {
      nodeId: node.id,
      branch,
      recorder: recorderRef.handle,
      sampleCount: sampleRefs.length,
      slice: hasSlice ? sliceRef.handle : null,
      track: trackHandle,
    });
    return { lastDetection, stopRequested: false };
  }

  if (isMakeFftTrendsAnalysisNodeKind(node.nodeKind)) {
    if (variableStore === undefined || resolveContext === undefined || analysisStore === undefined) {
      throw new Error(
        'make-fft-trends-analysis requires variableStore, resolveContext and analysisStore',
      );
    }
    const analyserRef = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      MAKE_FFT_TRENDS_ANALYSER_HANDLE,
      resolveContext,
    );
    if (
      analyserRef === null ||
      analyserRef.kind !== 'SpectralAnalyserRef' ||
      !isReferenceValid(analyserRef)
    ) {
      throw new Error(
        `MakeFftTrendsAnalysis "${node.id}": missing or invalid SpectralAnalyserRef on port "${MAKE_FFT_TRENDS_ANALYSER_HANDLE}"`,
      );
    }
    const listRef = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      MAKE_FFT_TRENDS_FRAMES_HANDLE,
      resolveContext,
    );
    const frameRefs = resolveRefListMembers(listRef, 'FftFrameRefList', collectStore);
    if (frameRefs.length === 0) {
      throw new Error(
        `MakeFftTrendsAnalysis "${node.id}": empty FftFrameRefList on port "${MAKE_FFT_TRENDS_FRAMES_HANDLE}"`,
      );
    }
    let detection = lastDetection;
    let analysisHandle: string | null = null;
    const fftTrendsPolicy = resolveFftTrendsPolicyForNode(
      subgraph,
      variableStore,
      node,
      resolveContext,
    );
    if (host.analyzeFftTrendsFromFrameRefs !== undefined) {
      const result = await host.analyzeFftTrendsFromFrameRefs(node.id, frameRefs, fftTrendsPolicy);
      if (result !== null) {
        const analysisRef = analysisStore.setNodeAnalysis(node.id, result.analysisId, result.detection);
        analysisHandle = analysisRef.handle;
        detection = result.detection;
      }
    }
    host.log('make-fft-trends-analysis', {
      nodeId: node.id,
      branch,
      analyser: analyserRef.handle,
      frameCount: frameRefs.length,
      analysis: analysisHandle,
      detected: detection?.detected ?? false,
      measurementsCount: fftTrendsPolicy.measurementsCount,
      intervalMs: fftTrendsPolicy.intervalMs,
    });
    return { lastDetection: detection, stopRequested: false };
  }

  if (isMakeEnsembleAnalysisNodeKind(node.nodeKind)) {
    if (variableStore === undefined || resolveContext === undefined || ensembleStore === undefined) {
      throw new Error(
        'make-ensemble-analysis requires variableStore, resolveContext and ensembleStore',
      );
    }
    const listRef = resolveInput(
      subgraph,
      variableStore.getAll(),
      node.id,
      MAKE_ENSEMBLE_ANALYSIS_SAMPLES_HANDLE,
      resolveContext,
    );
    const sampleRefs = resolveRefListMembers(listRef, 'AudioSampleRefList', collectStore);
    if (sampleRefs.length === 0) {
      throw new Error(
        `MakeEnsembleAnalysis "${node.id}": empty AudioSampleRefList on port "${MAKE_ENSEMBLE_ANALYSIS_SAMPLES_HANDLE}"`,
      );
    }
    let analysisHandle: string | null = null;
    let detected = false;
    if (host.makeEnsembleAnalysisFromSampleRefs !== undefined) {
      const result = await host.makeEnsembleAnalysisFromSampleRefs(node.id, sampleRefs);
      if (result !== null) {
        const analysisRef = ensembleStore.setNodeAnalysis(node.id, result.analysisId, result.detection);
        analysisHandle = analysisRef.handle;
        detected = result.detection.detected;
      }
    }
    host.log('make-ensemble-analysis', {
      nodeId: node.id,
      branch,
      sampleCount: sampleRefs.length,
      analysis: analysisHandle,
      detected,
    });
    return { lastDetection, stopRequested: false };
  }

  if (isMakeCombinedReportNodeKind(node.nodeKind)) {
    if (
      variableStore === undefined ||
      resolveContext === undefined ||
      reportStore === undefined ||
      analysisStore === undefined
    ) {
      throw new Error(
        'make-combined-report requires variableStore, resolveContext, reportStore and analysisStore',
      );
    }
    let reporterRef: ScenarioVariableValue | null = null;
    try {
      reporterRef = resolveInput(
        subgraph,
        variableStore.getAll(),
        node.id,
        MAKE_COMBINED_REPORT_REPORTER_HANDLE,
        resolveContext,
      );
    } catch {
      // Неподключённый/битый reporter → skip (invalid-reporter), не рушим сценарий.
      reporterRef = null;
    }
    const analyses: { handle: string; kind: string; detection: ScenarioDetectionResult }[] = [];
    for (const port of [MAKE_COMBINED_REPORT_ANALYSIS_1_HANDLE, MAKE_COMBINED_REPORT_ANALYSIS_2_HANDLE]) {
      let ref: ScenarioVariableValue | null = null;
      try {
        ref = resolveInput(subgraph, variableStore.getAll(), node.id, port, resolveContext);
      } catch {
        ref = null;
      }
      if (ref === null || !isScenarioReferenceValue(ref) || ref.handle === null || !isReferenceValid(ref)) {
        continue;
      }
      const detection =
        ref.kind === 'EnsembleAnalysisRef'
          ? ensembleStore?.getDetectionByHandle(ref.handle) ?? null
          : analysisStore.getDetectionByHandle(ref.handle);
      if (detection !== null) {
        analyses.push({ handle: ref.handle, kind: ref.kind, detection });
      }
    }
    let trackHandle: string | null = null;
    try {
      const trackRef = resolveInput(
        subgraph,
        variableStore.getAll(),
        node.id,
        MAKE_COMBINED_REPORT_TRACK_HANDLE,
        resolveContext,
      );
      if (
        trackRef !== null &&
        isScenarioReferenceValue(trackRef) &&
        trackRef.kind === 'TrackRef' &&
        isReferenceValid(trackRef)
      ) {
        trackHandle = trackRef.handle;
      }
    } catch {
      trackHandle = null;
    }
    let reportId: string | null = null;
    let skipReason: string | null = null;
    if (
      reporterRef === null ||
      !isScenarioReferenceValue(reporterRef) ||
      reporterRef.kind !== 'ReporterRef' ||
      !isReferenceValid(reporterRef)
    ) {
      skipReason = 'invalid-reporter';
    } else if (analyses.length === 0) {
      skipReason = 'no-analyses';
    } else if (host.makeCombinedReport !== undefined) {
      const payload = await host.makeCombinedReport(reporterRef, { analyses, trackHandle });
      if (payload !== null) {
        reportStore.setNodeReport(node.id, payload);
        reportId = payload.reportId;
      }
    }
    host.log('make-combined-report', {
      nodeId: node.id,
      branch,
      analyses: analyses.map((a) => a.handle),
      track: trackHandle,
      reportId,
      skipReason,
    });
    return { lastDetection, stopRequested: false };
  }

  if (isMakeProximityTrendNodeKind(node.nodeKind)) {
    if (variableStore === undefined || resolveContext === undefined || proximityStore === undefined) {
      throw new Error('make-proximity-trend requires variableStore, resolveContext and proximityStore');
    }
    let combinedScore: number | null = null;
    try {
      const fusionInput = resolveInput(
        subgraph,
        variableStore.getAll(),
        node.id,
        MAKE_PROXIMITY_TREND_FUSION_HANDLE,
        resolveContext,
      );
      if (fusionInput !== null && fusionInput.kind === 'DetectionFusion') {
        combinedScore = fusionInput.presentCount > 0 ? fusionInput.combinedScore : null;
      }
    } catch {
      combinedScore = null;
    }
    let proximityHandle: string | null = null;
    let trend = 'stable';
    let ready = false;
    if (host.evaluateProximityTrend !== undefined) {
      const result = await host.evaluateProximityTrend(node.id, { combinedScore });
      if (result !== null) {
        const ref = proximityStore.setNodeResult(node.id, result);
        proximityHandle = ref.handle;
        trend = result.trend;
        ready = result.ready;
      }
    }
    host.log('make-proximity-trend', {
      nodeId: node.id,
      branch,
      combinedScore,
      trend,
      ready,
      proximity: proximityHandle,
    });
    return { lastDetection, stopRequested: false };
  }

  if (isMakeDetectionFusionNodeKind(node.nodeKind)) {
    if (
      variableStore === undefined ||
      resolveContext === undefined ||
      analysisStore === undefined ||
      fusionStore === undefined
    ) {
      throw new Error(
        'make-detection-fusion requires variableStore, resolveContext, analysisStore and fusionStore',
      );
    }
    const inputCount = clampDetectionFusionInputCount(node.detectionFusionInputCount);
    const sources: FusionSourceInput[] = [];
    for (let i = 1; i <= inputCount; i += 1) {
      const port = detectionFusionAnalysisHandle(i);
      let ref: ScenarioVariableValue | null = null;
      try {
        ref = resolveInput(subgraph, variableStore.getAll(), node.id, port, resolveContext);
      } catch {
        // Неподключённый опциональный вход (сверх минимума) → молчащий источник.
        ref = null;
      }
      if (
        ref === null ||
        !isScenarioReferenceValue(ref) ||
        ref.handle === null ||
        !isReferenceValid(ref)
      ) {
        sources.push({ name: port, family: 'unknown', confidence: 0, isDrone: false, present: false });
        continue;
      }
      const detection =
        ref.kind === 'EnsembleAnalysisRef'
          ? ensembleStore?.getDetectionByHandle(ref.handle) ?? null
          : analysisStore.getDetectionByHandle(ref.handle);
      if (detection === null) {
        sources.push({ name: ref.handle, family: 'unknown', confidence: 0, isDrone: false, present: false });
        continue;
      }
      sources.push({
        name: ref.handle,
        // trends-анализ — DSP-семейство; ансамбль (basn-1) — метка ensemble.
        family: ref.kind === 'FftTrendAnalysisRef' ? 'dsp' : 'ensemble',
        confidence: detection.confidence,
        isDrone: detection.isDrone ?? detection.detected,
        present: true,
      });
    }
    const fusion = fuseDetectorConfidences(sources);
    const fusionValue = createDetectionFusionValue({
      combinedScore: fusion.combinedScore,
      agreement: fusion.agreement,
      presentCount: fusion.presentCount,
    });
    fusionStore.setNodeFusion(node.id, fusionValue);
    host.log('make-detection-fusion', {
      nodeId: node.id,
      branch,
      inputCount,
      presentCount: fusionValue.presentCount,
      combinedScore: fusionValue.combinedScore,
      agreement: fusionValue.agreement,
    });
    return { lastDetection, stopRequested: false };
  }

  if (isBranchOnDetectionNodeKind(node.nodeKind)) {
    if (variableStore === undefined || resolveContext === undefined) {
      throw new Error('branch-on-detection requires variableStore and resolveContext');
    }
    const threshold = clampDetectionThreshold(node.detectionThreshold);
    let fusionInput: ScenarioVariableValue | null = null;
    try {
      fusionInput = resolveInput(
        subgraph,
        variableStore.getAll(),
        node.id,
        BRANCH_ON_DETECTION_FUSION_HANDLE,
        resolveContext,
      );
    } catch {
      // Неподключённый/битый вход → not-detected, alarm-цепочка не рушится.
      fusionInput = null;
    }
    const fusion =
      fusionInput !== null && fusionInput.kind === 'DetectionFusion' ? fusionInput : null;
    const detected =
      fusion !== null && fusion.presentCount > 0 && fusion.combinedScore >= threshold;
    host.log('branch-on-detection', {
      nodeId: node.id,
      branch,
      threshold,
      combinedScore: fusion?.combinedScore ?? null,
      presentCount: fusion?.presentCount ?? 0,
      detected,
    });
    return {
      lastDetection,
      stopRequested: false,
      execOutHandle: detected
        ? BRANCH_ON_DETECTION_DETECTED_HANDLE
        : BRANCH_ON_DETECTION_NOT_DETECTED_HANDLE,
    };
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
      const callContext =
        resolveContext !== undefined
          ? augmentResolveContextForFunctionCall({
              parentSubgraph: subgraph,
              blockNodeId: node.id,
              variables: variableStore?.getAll() ?? [],
              baseContext: resolveContext,
            })
          : resolveContext;
      const subgraphResult = await runSubgraphOnce(fn, host, signal, {
        branch,
        defaultChunkDurationMs,
        functions: [],
        variableStore,
        resolveContext: callContext,
        onPrintOutput,
        onStopRuntime,
        onPauseRuntime,
        awaitUnpaused,
        collectStore,
        reportStore,
        trackStore,
        analysisStore,
        recordingSliceStore,
        asyncJobStore,
        promiseRuntimeStore,
        runId,
        loopTick,
      });
      host.log('subgraph', { nodeId: node.id, functionId: fn.id, branch });
      return {
        lastDetection: subgraphResult.lastDetection,
        stopRequested: false,
        ...(subgraphResult.execOutHandle !== undefined
          ? { execOutHandle: subgraphResult.execOutHandle }
          : {}),
      };
    }

    default:
      throw new Error(`Unsupported scenario block: ${node.blockKind}`);
  }
}
