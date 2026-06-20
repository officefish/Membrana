import type {
  ScenarioCollectorConfig,
  ScenarioGraphNode,
  ScenarioSubgraph,
} from '@membrana/core';

import {
  COLLECT_EVENT_OUT_HANDLE,
  deviceHandleFromAnalyserSessionRef,
  deviceHandleFromRecorderSessionRef,
  recordCollectAppend,
  shouldFlushCollect,
} from '../graph/collect-node-shared.js';
import {
  COLLECT_FFT_ANALYSER_HANDLE,
  COLLECT_FFT_FRAME_HANDLE,
} from '../graph/collect-fft-frames-node.js';
import {
  COLLECT_SAMPLES_RECORDER_HANDLE,
  COLLECT_SAMPLES_SAMPLE_HANDLE,
} from '../graph/collect-samples-node.js';
import type { CollectRuntimeStore } from './collect-runtime-store.js';
import type { ScenarioRuntimeHost } from './host.js';
import { resolveInput, type ResolveInputContext } from './resolve-input.js';
import { isReferenceValid } from './reference-validity.js';
import type { ScenarioVariableStore } from './variable-store.js';

function readCollectorConfig(
  node: ScenarioGraphNode,
): Partial<ScenarioCollectorConfig> | undefined {
  return (node as ScenarioGraphNode & { collectorConfig?: Partial<ScenarioCollectorConfig> })
    .collectorConfig;
}

export interface ExecuteCollectNodeInput {
  readonly host: ScenarioRuntimeHost;
  readonly subgraph: ScenarioSubgraph;
  readonly node: ScenarioGraphNode;
  readonly variableStore: ScenarioVariableStore;
  readonly resolveContext: ResolveInputContext;
  readonly collectStore: CollectRuntimeStore;
  readonly mode: 'samples' | 'fft-frames';
}

export interface ExecuteCollectNodeResult {
  readonly flushed: boolean;
  readonly eventOutHandle?: string;
}

/** Append + optional flush для CollectSamples / CollectFftFrames (DBC3). Event dispatch — DBC5. */
export function executeCollectNode(input: ExecuteCollectNodeInput): ExecuteCollectNodeResult {
  const { host, subgraph, node, variableStore, resolveContext, collectStore, mode } = input;
  const variables = variableStore.getAll();
  const config = readCollectorConfig(node);
  const nowMs = Date.now();

  if (mode === 'samples') {
    const recorderRef = resolveInput(
      subgraph,
      variables,
      node.id,
      COLLECT_SAMPLES_RECORDER_HANDLE,
      resolveContext,
    );
    const sampleRef = resolveInput(
      subgraph,
      variables,
      node.id,
      COLLECT_SAMPLES_SAMPLE_HANDLE,
      resolveContext,
    );
    if (
      !isReferenceValid(recorderRef) ||
      recorderRef === null ||
      recorderRef.kind !== 'RecorderRef'
    ) {
      return { flushed: false };
    }
    if (!isReferenceValid(sampleRef) || sampleRef === null || sampleRef.kind !== 'AudioSampleRef') {
      return { flushed: false };
    }

    const deviceHandle = deviceHandleFromRecorderSessionRef(recorderRef.handle);
    if (deviceHandle === null) {
      return { flushed: false };
    }

    host.subscribeRecorderCollect?.(deviceHandle, node.id);
    if (host.appendRecorderSample?.(deviceHandle, sampleRef) !== true) {
      return { flushed: false };
    }

    const tickState = recordCollectAppend(collectStore.getTickState(node.id), nowMs);
    if (!shouldFlushCollect(tickState, config, nowMs)) {
      collectStore.setTickState(node.id, tickState);
      return { flushed: false };
    }

    const snapshot = host.flushRecorderSession?.(deviceHandle);
    collectStore.resetAfterFlush(node.id);
    if (snapshot === null || snapshot === undefined || snapshot.refs.length === 0) {
      return { flushed: false };
    }
    collectStore.setLastBatch(node.id, snapshot.refs, 'AudioSampleRefList');
    return { flushed: true, eventOutHandle: COLLECT_EVENT_OUT_HANDLE };
  }

  const analyserRef = resolveInput(
    subgraph,
    variables,
    node.id,
    COLLECT_FFT_ANALYSER_HANDLE,
    resolveContext,
  );
  const frameRef = resolveInput(
    subgraph,
    variables,
    node.id,
    COLLECT_FFT_FRAME_HANDLE,
    resolveContext,
  );
  if (
    !isReferenceValid(analyserRef) ||
    analyserRef === null ||
    analyserRef.kind !== 'SpectralAnalyserRef'
  ) {
    return { flushed: false };
  }
  if (!isReferenceValid(frameRef) || frameRef === null || frameRef.kind !== 'FftFrameRef') {
    return { flushed: false };
  }

  const deviceHandle = deviceHandleFromAnalyserSessionRef(analyserRef.handle);
  if (deviceHandle === null) {
    return { flushed: false };
  }

  host.subscribeSpectralAnalyserCollect?.(deviceHandle, node.id);
  if (host.appendSpectralAnalyserFrame?.(deviceHandle, frameRef) !== true) {
    return { flushed: false };
  }

  const tickState = recordCollectAppend(collectStore.getTickState(node.id), nowMs);
  if (!shouldFlushCollect(tickState, config, nowMs)) {
    collectStore.setTickState(node.id, tickState);
    return { flushed: false };
  }

  const snapshot = host.flushSpectralAnalyserSession?.(deviceHandle);
  collectStore.resetAfterFlush(node.id);
  if (snapshot === null || snapshot === undefined || snapshot.refs.length === 0) {
    return { flushed: false };
  }
  collectStore.setLastBatch(node.id, snapshot.refs, 'FftFrameRefList');
  return { flushed: true, eventOutHandle: COLLECT_EVENT_OUT_HANDLE };
}
