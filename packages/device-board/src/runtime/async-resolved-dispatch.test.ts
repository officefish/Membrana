import { describe, expect, it, vi } from 'vitest';
import {
  createReferenceValue,
  createScenarioVariable,
  type DeviceScenarioDocument,
  type ScenarioFunctionSubgraph,
  type ScenarioSubgraph,
} from '@membrana/core';

import { ASYNC_PROMISE_REF_HANDLE } from '../graph/async-orchestration-nodes.js';
import { COLLECT_EVENT_OUT_HANDLE } from '../graph/collect-node-shared.js';
import { MAKE_REPORT_FROM_TRACK_OUT_HANDLE } from '../graph/make-report-from-track-node.js';
import { AsyncJobStore } from './async-job-store.js';
import { dispatchAsyncResolvedBranches, findAsyncResolvedTargets } from './async-resolved-dispatch.js';
import { executeStartAsyncJob } from './async-promise-executor.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { PromiseRuntimeStore } from './promise-runtime-store.js';
import { ReportRuntimeStore } from './report-runtime-store.js';
import { ScenarioVariableStore } from './variable-store.js';

function buildCollapsedUploadPipelineDocument(): {
  document: DeviceScenarioDocument;
  uploadFunction: ScenarioFunctionSubgraph;
  trackVar: ReturnType<typeof createScenarioVariable>;
  reporterVar: ReturnType<typeof createScenarioVariable>;
} {
  const uploadFunction: ScenarioFunctionSubgraph = {
    id: 'fn-upload-pipeline',
    name: 'Upload pipeline',
    entry: 'fn-upload-input',
    nodes: [
      {
        id: 'fn-upload-input',
        blockKind: 'custom',
        position: { x: 0, y: 0 },
        nodeKind: 'function-input',
        system: true,
      },
      {
        id: 'fn-upload-output',
        blockKind: 'custom',
        position: { x: 520, y: 0 },
        nodeKind: 'function-output',
        system: true,
      },
      {
        id: 'start-async',
        blockKind: 'custom',
        position: { x: 200, y: 0 },
        nodeKind: 'start-async-job',
        asyncJobConfig: { jobKind: 'track-upload', awaitTimeoutMs: 30_000 },
        supportsAsync: true,
      },
      {
        id: 'listener',
        blockKind: 'custom',
        position: { x: 400, y: 0 },
        nodeKind: 'on-async-resolved',
      },
      {
        id: 'make-report',
        blockKind: 'custom',
        position: { x: 600, y: 0 },
        nodeKind: 'make-report-from-track',
      },
    ],
    edges: [
      {
        kind: 'exec',
        source: 'fn-upload-input',
        sourceHandle: 'exec-in',
        target: 'start-async',
        targetHandle: 'exec-in',
      },
      {
        kind: 'data',
        source: 'start-async',
        sourceHandle: ASYNC_PROMISE_REF_HANDLE,
        target: 'listener',
        targetHandle: ASYNC_PROMISE_REF_HANDLE,
        dataType: 'PromiseRef',
      },
      {
        kind: 'event',
        source: 'listener',
        sourceHandle: COLLECT_EVENT_OUT_HANDLE,
        target: 'make-report',
        targetHandle: 'exec-in',
      },
      {
        kind: 'data',
        source: 'fn-upload-input',
        sourceHandle: 'track',
        target: 'make-report',
        targetHandle: 'track',
        dataType: 'TrackRef',
      },
      {
        kind: 'data',
        source: 'fn-upload-input',
        sourceHandle: 'reporter',
        target: 'make-report',
        targetHandle: 'reporter',
        dataType: 'ReporterRef',
      },
      {
        kind: 'data',
        source: 'fn-upload-input',
        sourceHandle: 'track',
        target: 'start-async',
        targetHandle: 'track',
        dataType: 'TrackRef',
      },
      {
        kind: 'data',
        source: 'make-report',
        sourceHandle: MAKE_REPORT_FROM_TRACK_OUT_HANDLE,
        target: 'fn-upload-output',
        targetHandle: 'report',
        dataType: 'ReportRef',
      },
    ],
    inputPins: [
      { id: 'exec-in', name: 'exec-in', kind: 'exec' },
      { id: 'track', name: 'track', kind: 'data', socketType: 'TrackRef' },
      { id: 'reporter', name: 'reporter', kind: 'data', socketType: 'ReporterRef' },
    ],
    outputPins: [
      { id: 'exec-out', name: 'exec-out', kind: 'exec' },
      { id: 'report', name: 'report', kind: 'data', socketType: 'ReportRef' },
    ],
  };

  const trackVar = createScenarioVariable('track-var', 'track1', 'TrackRef');
  const reporterVar = createScenarioVariable('reporter-var', 'reporter1', 'ReporterRef');

  const main: ScenarioSubgraph = {
    entry: 'main-entry',
    nodes: [
      {
        id: 'main-entry',
        blockKind: 'custom',
        position: { x: 0, y: 0 },
        nodeKind: 'event',
        system: true,
      },
      {
        id: 'vg-track',
        blockKind: 'custom',
        position: { x: 0, y: 80 },
        nodeKind: 'variable-get',
        variableId: trackVar.id,
      },
      {
        id: 'vg-reporter',
        blockKind: 'custom',
        position: { x: 0, y: 160 },
        nodeKind: 'variable-get',
        variableId: reporterVar.id,
      },
      {
        id: 'upload-block',
        blockKind: 'subgraph',
        position: { x: 200, y: 0 },
        label: 'Upload pipeline::fn-upload-pipeline::fn-upload-pipeline',
        supportsAsync: true,
      },
    ],
    edges: [
      {
        kind: 'exec',
        source: 'main-entry',
        sourceHandle: 'exec-out',
        target: 'upload-block',
        targetHandle: 'exec-in',
      },
      {
        kind: 'data',
        source: 'vg-track',
        sourceHandle: 'value',
        target: 'upload-block',
        targetHandle: 'track',
        dataType: 'TrackRef',
      },
      {
        kind: 'data',
        source: 'vg-reporter',
        sourceHandle: 'value',
        target: 'upload-block',
        targetHandle: 'reporter',
        dataType: 'ReporterRef',
      },
    ],
  };

  const document: DeviceScenarioDocument = {
    meta: { title: 'collapsed-upload-test' },
    deviceKind: 'microphone',
    scenario: {
      initial: { entry: 'init', nodes: [], edges: [] },
      loops: { main, alarm: { entry: 'alarm', nodes: [], edges: [] } },
      triggers: {
        onStop: { entry: 'onStop', nodes: [], edges: [] },
        onDisconnect: { entry: 'onDisconnect', nodes: [], edges: [] },
      },
      functions: [uploadFunction],
    },
  };

  return {
    document,
    uploadFunction,
    trackVar,
    reporterVar,
  };
}

describe('async-resolved-dispatch collapsed function bridge (L19)', () => {
  it('findAsyncResolvedTargets resolves promise inside collapsed upload function', async () => {
    const { document, uploadFunction, trackVar, reporterVar } =
      buildCollapsedUploadPipelineDocument();
    const asyncJobStore = new AsyncJobStore();
    const promiseRuntimeStore = new PromiseRuntimeStore();
    const variableStore = new ScenarioVariableStore([
      {
        ...trackVar,
        value: createReferenceValue('TrackRef', 'track:gate-1'),
      },
      {
        ...reporterVar,
        value: createReferenceValue('ReporterRef', 'reporter:journal:dev-1'),
      },
    ]);
    const host = createStubScenarioRuntimeHost({ log: vi.fn() });
    const signal = new AbortController().signal;

    await executeStartAsyncJob({
      host,
      signal,
      branch: 'main',
      subgraph: uploadFunction,
      node: uploadFunction.nodes.find((node) => node.id === 'start-async')!,
      runId: 'run-l19',
      asyncJobStore,
      promiseRuntimeStore,
    });

    const promiseId = asyncJobStore.listPending()[0]!.promiseId;
    const record = asyncJobStore.resolve(promiseId);
    expect(record).not.toBeNull();

    const targets = findAsyncResolvedTargets(
      document,
      'track-upload',
      promiseId,
      variableStore,
      promiseRuntimeStore,
      () => ({ scenarioFunctions: document.scenario.functions }),
    );

    expect(targets).toHaveLength(1);
    expect(targets[0]?.nodeId).toBe('listener');
  });

  it('dispatchAsyncResolvedBranches runs make-report without detached error', async () => {
    const { document, uploadFunction, trackVar, reporterVar } =
      buildCollapsedUploadPipelineDocument();
    const log = vi.fn();
    const makeReportFromTrack = vi.fn(async () => ({
      schema: 'drone-detection-report/v1',
      reportId: 'rep-l19',
      trackId: 'track:gate-1',
      isDetected: true,
      summaryText: 'ok',
      payload: {},
    }));
    const host = createStubScenarioRuntimeHost({ log, makeReportFromTrack });
    const asyncJobStore = new AsyncJobStore();
    const promiseRuntimeStore = new PromiseRuntimeStore();
    const variableStore = new ScenarioVariableStore([
      {
        ...trackVar,
        value: createReferenceValue('TrackRef', 'track:gate-1'),
      },
      {
        ...reporterVar,
        value: createReferenceValue('ReporterRef', 'reporter:journal:dev-1'),
      },
    ]);
    const reportStore = new ReportRuntimeStore();
    const signal = new AbortController().signal;

    await executeStartAsyncJob({
      host,
      signal,
      branch: 'main',
      subgraph: uploadFunction,
      node: uploadFunction.nodes.find((node) => node.id === 'start-async')!,
      runId: 'run-l19-dispatch',
      asyncJobStore,
      promiseRuntimeStore,
    });

    const promiseId = asyncJobStore.listPending()[0]!.promiseId;
    const record = asyncJobStore.resolve(promiseId);
    expect(record).not.toBeNull();

    const trackRef = createReferenceValue('TrackRef', 'track:gate-1');

    await dispatchAsyncResolvedBranches({
      document,
      record: record!,
      host,
      signal,
      variableStore,
      promiseRuntimeStore,
      execOptions: (branch) => ({
        branch,
        variableStore,
        reportStore,
        functions: document.scenario.functions,
        resolveContext: {
          scenarioFunctions: document.scenario.functions,
          getPromiseRef: (nodeId) => promiseRuntimeStore.getPromiseRef(nodeId),
          getTrackRef: () => trackRef,
        },
        asyncJobStore,
        promiseRuntimeStore,
        runId: 'run-l19-dispatch',
      }),
    });

    await vi.waitFor(() => {
      expect(makeReportFromTrack).toHaveBeenCalled();
    });

    const detachedErrors = log.mock.calls.filter(
      (call) => call[0] === 'event-dispatch-detached-error',
    );
    expect(detachedErrors).toHaveLength(0);
    expect(log).toHaveBeenCalledWith(
      'async-resolved-dispatch-done',
      expect.objectContaining({ promiseId }),
    );
  });
});
