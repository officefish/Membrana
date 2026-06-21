import {
  isScenarioIntegerValue,
  isScenarioRecordingPolicyValue,
  resolveScenarioRecordingPolicy,
  nearestRecordingWindowPreset,
  type ScenarioGraphNode,
  type ScenarioRecordingWindowSec,
  type ScenarioSubgraph,
} from '@membrana/core';

import { deviceHandleFromAnalyserSessionRef, deviceHandleFromRecorderSessionRef } from '../graph/collect-node-shared.js';
import { FLUSH_SPECTRAL_ANALYSER_HANDLE, FLUSH_SPECTRAL_FRAMES_HANDLE } from '../graph/flush-spectral-analyser-node.js';
import {
  IS_RECORDING_WINDOW_FULL_FALSE_HANDLE,
  IS_RECORDING_WINDOW_FULL_RECORDER_HANDLE,
  IS_RECORDING_WINDOW_FULL_TRUE_HANDLE,
  IS_RECORDING_WINDOW_FULL_WINDOW_SEC_HANDLE,
} from '../graph/is-recording-window-full-node.js';
import {
  START_RECORDING_POLICY_HANDLE,
  START_RECORDING_RECORDER_HANDLE,
  START_RECORDING_STREAM_HANDLE,
} from '../graph/start-recording-node.js';
import { STOP_RECORDING_RECORDER_HANDLE } from '../graph/stop-recording-node.js';
import type { CollectRuntimeStore } from './collect-runtime-store.js';
import type { ScenarioRuntimeHost } from './host.js';
import type { RecordingSliceRuntimeStore } from './recording-slice-runtime-store.js';
import { resolveInput, type ResolveInputContext } from './resolve-input.js';
import { isReferenceValid } from './reference-validity.js';
import type { ScenarioVariableStore } from './variable-store.js';

function readRecordingPolicy(
  node: ScenarioGraphNode,
): ReturnType<typeof resolveScenarioRecordingPolicy> {
  const raw = (node as ScenarioGraphNode & { recordingPolicy?: { windowSec?: number } })
    .recordingPolicy;
  return resolveScenarioRecordingPolicy(raw);
}

function resolveRecorderDeviceHandle(
  subgraph: ScenarioSubgraph,
  variables: ReturnType<ScenarioVariableStore['getAll']>,
  node: ScenarioGraphNode,
  resolveContext: ResolveInputContext,
  port: string,
): string | null {
  const recorderRef = resolveInput(subgraph, variables, node.id, port, resolveContext);
  if (
    recorderRef === null ||
    recorderRef.kind !== 'RecorderRef' ||
    !isReferenceValid(recorderRef)
  ) {
    return null;
  }
  return deviceHandleFromRecorderSessionRef(recorderRef.handle);
}

export interface ExecuteRecordingGateInput {
  readonly host: ScenarioRuntimeHost;
  readonly subgraph: ScenarioSubgraph;
  readonly node: ScenarioGraphNode;
  readonly variableStore: ScenarioVariableStore;
  readonly resolveContext: ResolveInputContext;
  readonly collectStore?: CollectRuntimeStore;
  readonly recordingSliceStore?: RecordingSliceRuntimeStore;
}

export interface ExecuteRecordingGateResult {
  readonly execOutHandle?: string;
}

/** StartRecording / StopRecording / IsRecordingWindowFull / FlushSpectralAnalyser (v0.7). */
export async function executeRecordingGateNode(
  input: ExecuteRecordingGateInput,
): Promise<ExecuteRecordingGateResult> {
  const { host, subgraph, node, variableStore, resolveContext, collectStore, recordingSliceStore } =
    input;
  const variables = variableStore.getAll();

  if (node.nodeKind === 'start-recording') {
    const deviceHandle = resolveRecorderDeviceHandle(
      subgraph,
      variables,
      node,
      resolveContext,
      START_RECORDING_RECORDER_HANDLE,
    );
    const streamRef = resolveInput(
      subgraph,
      variables,
      node.id,
      START_RECORDING_STREAM_HANDLE,
      resolveContext,
    );
    const policyWire = resolveInput(
      subgraph,
      variables,
      node.id,
      START_RECORDING_POLICY_HANDLE,
      resolveContext,
    );
    let policy = readRecordingPolicy(node);
    if (isScenarioRecordingPolicyValue(policyWire)) {
      policy = resolveScenarioRecordingPolicy({
        windowSec: policyWire.windowSec,
        captureFormat: policyWire.captureFormat,
      });
    }
    if (deviceHandle === null) {
      host.log('start-recording skip', { nodeId: node.id, reason: 'invalid-recorder' });
      return {};
    }
    if (
      streamRef === null ||
      streamRef.kind !== 'AudioStreamRef' ||
      !isReferenceValid(streamRef)
    ) {
      host.log('start-recording skip', { nodeId: node.id, reason: 'invalid-stream' });
      return {};
    }
    const started = host.startRecorderRecording?.(deviceHandle, streamRef, policy) ?? false;
    host.log('start-recording', {
      nodeId: node.id,
      deviceHandle,
      windowSec: policy.windowSec,
      captureFormat: policy.captureFormat,
      started,
    });
    return {};
  }

  if (node.nodeKind === 'stop-recording') {
    const deviceHandle = resolveRecorderDeviceHandle(
      subgraph,
      variables,
      node,
      resolveContext,
      STOP_RECORDING_RECORDER_HANDLE,
    );
    if (deviceHandle === null) {
      host.log('stop-recording skip', { nodeId: node.id, reason: 'invalid-recorder' });
      return {};
    }
    const meta = (await Promise.resolve(host.stopRecorderRecording?.(deviceHandle) ?? null)) ?? null;
    if (meta === null || recordingSliceStore === undefined) {
      host.log('stop-recording empty', { nodeId: node.id, deviceHandle });
      return {};
    }
    recordingSliceStore.setNodeSlice(node.id, meta.handle);
    host.log('stop-recording', {
      nodeId: node.id,
      deviceHandle,
      slice: meta.handle,
      durationSec: meta.durationSec,
      sampleRate: meta.sampleRate,
      captureFormat: meta.captureFormat,
    });
    return {};
  }

  if (node.nodeKind === 'is-recording-window-full') {
    const deviceHandle = resolveRecorderDeviceHandle(
      subgraph,
      variables,
      node,
      resolveContext,
      IS_RECORDING_WINDOW_FULL_RECORDER_HANDLE,
    );
    const windowWire = resolveInput(
      subgraph,
      variables,
      node.id,
      IS_RECORDING_WINDOW_FULL_WINDOW_SEC_HANDLE,
      resolveContext,
    );
    let windowSec: ScenarioRecordingWindowSec = readRecordingPolicy(node).windowSec;
    if (isScenarioIntegerValue(windowWire)) {
      windowSec = nearestRecordingWindowPreset(windowWire.value);
    }
    const full =
      deviceHandle !== null &&
      (host.isRecorderWindowFull?.(deviceHandle, windowSec) ?? false);
    host.log('is-recording-window-full', {
      nodeId: node.id,
      deviceHandle,
      windowSec,
      full,
    });
    return {
      execOutHandle: full
        ? IS_RECORDING_WINDOW_FULL_TRUE_HANDLE
        : IS_RECORDING_WINDOW_FULL_FALSE_HANDLE,
    };
  }

  if (node.nodeKind === 'flush-spectral-analyser') {
    const analyserRef = resolveInput(
      subgraph,
      variables,
      node.id,
      FLUSH_SPECTRAL_ANALYSER_HANDLE,
      resolveContext,
    );
    if (
      analyserRef === null ||
      analyserRef.kind !== 'SpectralAnalyserRef' ||
      !isReferenceValid(analyserRef)
    ) {
      host.log('flush-spectral-analyser skip', { nodeId: node.id, reason: 'invalid-analyser' });
      return {};
    }
    const deviceHandle = deviceHandleFromAnalyserSessionRef(analyserRef.handle);
    if (deviceHandle === null || collectStore === undefined) {
      host.log('flush-spectral-analyser skip', { nodeId: node.id, reason: 'bad-handle' });
      return {};
    }
    const snapshot = host.flushSpectralAnalyserSession?.(deviceHandle);
    if (snapshot === null || snapshot === undefined || snapshot.refs.length === 0) {
      host.log('flush-spectral-analyser empty', { nodeId: node.id, deviceHandle });
      return {};
    }
    collectStore.setLastBatch(node.id, snapshot.refs, 'FftFrameRefList');
    host.log('flush-spectral-analyser', {
      nodeId: node.id,
      deviceHandle,
      batchSize: snapshot.refs.length,
      outputPort: FLUSH_SPECTRAL_FRAMES_HANDLE,
    });
    return {};
  }

  return {};
}
