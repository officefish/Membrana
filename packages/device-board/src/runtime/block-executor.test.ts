import { describe, expect, it, vi } from 'vitest';
import { createReferenceValue, createScenarioVariable, type ScenarioSubgraph, type ScenarioVariable } from '@membrana/core';

import { PALETTE_VALUE_HANDLE } from '../graph/palette-node.js';
import { VARIABLE_VALUE_HANDLE } from '../graph/variable-node.js';
import { executeScenarioBlock } from './block-executor.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { CollectRuntimeStore } from './collect-runtime-store.js';
import { ReportRuntimeStore } from './report-runtime-store.js';
import { TrackRuntimeStore } from './track-runtime-store.js';
import { FftTrendAnalysisRuntimeStore } from './analysis-runtime-store.js';
import { ScenarioVariableStore } from './variable-store.js';

describe('executeScenarioBlock print', () => {
  const variableStore = new ScenarioVariableStore();
  const subgraph: ScenarioSubgraph = {
    nodes: [
      {
        id: 'print-1',
        nodeKind: 'print',
        blockKind: 'custom',
        label: 'Print',
      },
    ],
    edges: [],
  };

  it('prints datetime to printLine when value input resolves DateTime', async () => {
    const printLine = vi.fn();
    const host = createStubScenarioRuntimeHost({ printLine, variableStore });
    const subgraphWithEdge: ScenarioSubgraph = {
      nodes: [
        { id: 'evt', nodeKind: 'event', blockKind: 'custom', label: 'On connect' },
        subgraph.nodes[0]!,
      ],
      edges: [
        {
          id: 'd1',
          kind: 'data',
          source: 'evt',
          sourceHandle: 'datetime',
          target: 'print-1',
          targetHandle: PALETTE_VALUE_HANDLE,
          dataType: 'DateTime',
        },
      ],
    };

    await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'onConnect',
      subgraph: subgraphWithEdge,
      node: subgraphWithEdge.nodes[1]!,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore,
      resolveContext: {
        handlerBranch: 'onConnect',
        deviceHandle: 'dev-1',
        serverHandle: 'srv-1',
        triggeredAt: '2026-06-18T12:00:00.000Z',
      },
    });

    expect(printLine).toHaveBeenCalledWith('2026-06-18T12:00:00.000Z');
  });

  it('invokes onPrintOutput with formatted message', async () => {
    const onPrintOutput = vi.fn();
    const host = createStubScenarioRuntimeHost({ variableStore });
    const subgraphWithEdge: ScenarioSubgraph = {
      nodes: [
        { id: 'evt', nodeKind: 'event', blockKind: 'custom', label: 'On connect' },
        subgraph.nodes[0]!,
      ],
      edges: [
        {
          id: 'd1',
          kind: 'data',
          source: 'evt',
          sourceHandle: 'datetime',
          target: 'print-1',
          targetHandle: PALETTE_VALUE_HANDLE,
          dataType: 'DateTime',
        },
      ],
    };

    await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'onConnect',
      subgraph: subgraphWithEdge,
      node: subgraphWithEdge.nodes[1]!,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore,
      resolveContext: {
        handlerBranch: 'onConnect',
        triggeredAt: '2026-06-18T12:00:00.000Z',
      },
      onPrintOutput,
    });

    expect(onPrintOutput).toHaveBeenCalledWith('print-1', '2026-06-18T12:00:00.000Z');
  });

  it('prints server metadata on onConnect', async () => {
    const printLine = vi.fn();
    const host = createStubScenarioRuntimeHost({
      printLine,
      variableStore,
      getResourceMetadata: () => ({
        fields: { mediaApiUrl: 'http://localhost:3010', membraneId: 'mem-1' },
      }),
    });
    const subgraphWithEdge: ScenarioSubgraph = {
      nodes: [
        { id: 'evt', nodeKind: 'event', blockKind: 'custom', label: 'On connect' },
        subgraph.nodes[0]!,
      ],
      edges: [
        {
          id: 'd1',
          kind: 'data',
          source: 'evt',
          sourceHandle: 'server',
          target: 'print-1',
          targetHandle: PALETTE_VALUE_HANDLE,
          dataType: 'ServerRef',
        },
      ],
    };

    await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'onConnect',
      subgraph: subgraphWithEdge,
      node: subgraphWithEdge.nodes[1]!,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore,
      resolveContext: {
        handlerBranch: 'onConnect',
        deviceHandle: 'dev-1',
        serverHandle: 'mem-1',
        triggeredAt: '2026-06-18T12:00:00.000Z',
      },
    });

    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('mediaApiUrl: http://localhost:3010'));
  });

  it('prints device metadata on initial branch', async () => {
    const printLine = vi.fn();
    const host = createStubScenarioRuntimeHost({
      printLine,
      variableStore,
      getResourceMetadata: (ref) => ({
        fields: { deviceId: ref.handle ?? 'null', platform: 'Win32' },
      }),
    });
    const subgraphWithEdge: ScenarioSubgraph = {
      nodes: [
        { id: 'evt', nodeKind: 'event', blockKind: 'custom', label: 'On start' },
        subgraph.nodes[0]!,
      ],
      edges: [
        {
          id: 'd1',
          kind: 'data',
          source: 'evt',
          sourceHandle: 'device',
          target: 'print-1',
          targetHandle: PALETTE_VALUE_HANDLE,
          dataType: 'DeviceRef',
        },
      ],
    };

    await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'initial',
      subgraph: subgraphWithEdge,
      node: subgraphWithEdge.nodes[1]!,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore,
      resolveContext: {
        handlerBranch: 'initial',
        deviceHandle: 'field-node-7',
        triggeredAt: '2026-06-18T12:05:00.000Z',
      },
    });

    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('platform: Win32'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('field-node-7'));
  });
});

describe('executeScenarioBlock stop-runtime', () => {
  it('StopRuntime skips when device input is missing', async () => {
    const onStopRuntime = vi.fn();
    const host = createStubScenarioRuntimeHost();
    const variableStore = new ScenarioVariableStore();
    const node = {
      id: 'sr-1',
      nodeKind: 'stop-runtime' as const,
      blockKind: 'custom' as const,
      label: 'StopRuntime',
    };
    const subgraph: ScenarioSubgraph = { nodes: [node], edges: [] };

    const result = await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'main',
      subgraph,
      node,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore,
      resolveContext: {
        handlerBranch: 'main',
        deviceHandle: 'dev-1',
        triggeredAt: '2026-06-18T12:00:00.000Z',
      },
      onStopRuntime,
    });

    expect(onStopRuntime).not.toHaveBeenCalled();
    expect(result.stopRequested).toBe(false);
  });

  it('StopRuntime invokes onStopRuntime when device ref is valid', async () => {
    const onStopRuntime = vi.fn();
    const host = createStubScenarioRuntimeHost();
    const variableStore = new ScenarioVariableStore();
    const node = {
      id: 'sr-1',
      nodeKind: 'stop-runtime' as const,
      blockKind: 'custom' as const,
      label: 'StopRuntime',
    };
    const subgraph: ScenarioSubgraph = {
      nodes: [
        { id: 'dg', nodeKind: 'device-global', blockKind: 'custom', label: 'GetDevice' },
        node,
      ],
      edges: [
        {
          id: 'd1',
          kind: 'data',
          source: 'dg',
          sourceHandle: 'device',
          target: 'sr-1',
          targetHandle: 'device',
          dataType: 'DeviceRef',
        },
      ],
    };

    const result = await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'main',
      subgraph,
      node,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore,
      resolveContext: {
        handlerBranch: 'main',
        deviceHandle: 'dev-1',
        triggeredAt: '2026-06-18T12:00:00.000Z',
      },
      onStopRuntime,
    });

    expect(onStopRuntime).toHaveBeenCalledOnce();
    expect(result.stopRequested).toBe(true);
  });
});

describe('executeScenarioBlock recorder/analyser methods (MakeTrack / MakeFftTrendsAnalysis)', () => {
  it('MakeTrack calls createTrackFromSampleRefs when recorder + samples are wired', async () => {
    const createTrackFromSampleRefs = vi.fn(async () => ({ trackId: 'track-abc' }));
    const host = createStubScenarioRuntimeHost({ createTrackFromSampleRefs });
    const collectStore = new CollectRuntimeStore();
    const trackStore = new TrackRuntimeStore();
    const sampleA = { kind: 'AudioSampleRef' as const, handle: 's-1', valid: true };
    const sampleB = { kind: 'AudioSampleRef' as const, handle: 's-2', valid: true };
    const recorderRef = { kind: 'RecorderRef' as const, handle: 'recorder:dev-1', valid: true };
    const recorderVar: ScenarioVariable = {
      ...createScenarioVariable('var-rec', 'recorder1', 'RecorderRef'),
      value: recorderRef,
    };
    collectStore.setLastBatch('collect-1', [sampleA, sampleB], 'AudioSampleRefList');

    const node = {
      id: 'mt-1',
      nodeKind: 'make-track' as const,
      blockKind: 'custom' as const,
      label: 'MakeTrack',
    };
    const subgraph: ScenarioSubgraph = {
      nodes: [
        {
          id: 'vg-rec',
          nodeKind: 'variable-get',
          blockKind: 'custom',
          label: 'recorder1',
          variableId: recorderVar.id,
        },
        { id: 'collect-1', nodeKind: 'collect-samples', blockKind: 'custom', label: 'Collect' },
        node,
      ],
      edges: [
        {
          id: 'd-recorder',
          kind: 'data',
          source: 'vg-rec',
          sourceHandle: VARIABLE_VALUE_HANDLE,
          target: 'mt-1',
          targetHandle: 'recorder',
          dataType: 'RecorderRef',
        },
        {
          id: 'd1',
          kind: 'data',
          source: 'collect-1',
          sourceHandle: 'batches',
          target: 'mt-1',
          targetHandle: 'samples',
          dataType: 'AudioSampleRefList',
        },
      ],
    };

    await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'main',
      subgraph,
      node,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore: new ScenarioVariableStore([recorderVar]),
      collectStore,
      trackStore,
      resolveContext: {
        getCollectBatchRef: (nodeId) => collectStore.getLastBatchRef(nodeId),
        getTrackRef: (nodeId) => trackStore.getTrackRef(nodeId),
      },
    });

    expect(createTrackFromSampleRefs).toHaveBeenCalledWith('mt-1', [sampleA, sampleB]);
    expect(trackStore.getTrackRef('mt-1').handle).toBe('track:track-abc');
  });

  it('MakeTrack throws when RecorderRef port is unwired', async () => {
    const host = createStubScenarioRuntimeHost({});
    const variableStore = new ScenarioVariableStore();
    const collectStore = new CollectRuntimeStore();
    const trackStore = new TrackRuntimeStore();
    collectStore.setLastBatch(
      'collect-1',
      [{ kind: 'AudioSampleRef', handle: 's-1', valid: true }],
      'AudioSampleRefList',
    );
    const node = {
      id: 'mt-1',
      nodeKind: 'make-track' as const,
      blockKind: 'custom' as const,
      label: 'MakeTrack',
    };
    const subgraph: ScenarioSubgraph = {
      nodes: [
        { id: 'collect-1', nodeKind: 'collect-samples', blockKind: 'custom', label: 'Collect' },
        node,
      ],
      edges: [
        {
          id: 'd1',
          kind: 'data',
          source: 'collect-1',
          sourceHandle: 'batches',
          target: 'mt-1',
          targetHandle: 'samples',
          dataType: 'AudioSampleRefList',
        },
      ],
    };

    await expect(
      executeScenarioBlock({
        host,
        signal: new AbortController().signal,
        branch: 'main',
        subgraph,
        node,
        lastDetection: null,
        defaultChunkDurationMs: 5000,
        functions: [],
        variableStore,
        collectStore,
        trackStore,
        resolveContext: {
          getCollectBatchRef: (nodeId) => collectStore.getLastBatchRef(nodeId),
          getTrackRef: (nodeId) => trackStore.getTrackRef(nodeId),
        },
      }),
    ).rejects.toThrow(/RecorderRef/);
  });

  it('MakeFftTrendsAnalysis stores FftTrendAnalysisRef when analyser + frames are wired', async () => {
    const analyzeFftTrendsFromFrameRefs = vi.fn(async () => ({
      analysisId: 'analysis-xyz',
      detection: {
        detected: true,
        confidence: 88,
        templateId: 'DRONE_TIGHT',
      },
    }));
    const host = createStubScenarioRuntimeHost({ analyzeFftTrendsFromFrameRefs });
    const collectStore = new CollectRuntimeStore();
    const analysisStore = new FftTrendAnalysisRuntimeStore();
    const frameA = { kind: 'FftFrameRef' as const, handle: 'f-1', valid: true };
    collectStore.setLastBatch('collect-fft', [frameA], 'FftFrameRefList');

    const analyserRef = {
      kind: 'SpectralAnalyserRef' as const,
      handle: 'analyser:dev-1',
      valid: true,
    };
    const analyserVar: ScenarioVariable = {
      ...createScenarioVariable('var-analyser', 'analyser1', 'SpectralAnalyserRef'),
      value: analyserRef,
    };
    const node = {
      id: 'mft-1',
      nodeKind: 'make-fft-trends-analysis' as const,
      blockKind: 'custom' as const,
      label: 'MakeFftTrendsAnalysis',
    };
    const subgraph: ScenarioSubgraph = {
      nodes: [
        {
          id: 'vg-analyser',
          nodeKind: 'variable-get',
          blockKind: 'custom',
          label: 'analyser1',
          variableId: analyserVar.id,
        },
        {
          id: 'collect-fft',
          nodeKind: 'collect-fft-frames',
          blockKind: 'custom',
          label: 'CollectFft',
        },
        node,
      ],
      edges: [
        {
          id: 'd-analyser',
          kind: 'data',
          source: 'vg-analyser',
          sourceHandle: VARIABLE_VALUE_HANDLE,
          target: 'mft-1',
          targetHandle: 'analyser',
          dataType: 'SpectralAnalyserRef',
        },
        {
          id: 'd1',
          kind: 'data',
          source: 'collect-fft',
          sourceHandle: 'batches',
          target: 'mft-1',
          targetHandle: 'frames',
          dataType: 'FftFrameRefList',
        },
      ],
    };

    const result = await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'main',
      subgraph,
      node,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore: new ScenarioVariableStore([analyserVar]),
      collectStore,
      analysisStore,
      resolveContext: {
        getCollectBatchRef: (nodeId) => collectStore.getLastBatchRef(nodeId),
        getFftTrendAnalysisRef: (nodeId) => analysisStore.getAnalysisRef(nodeId),
      },
    });

    expect(analyzeFftTrendsFromFrameRefs).toHaveBeenCalledWith('mft-1', [frameA]);
    expect(result.lastDetection?.detected).toBe(true);
    expect(analysisStore.getAnalysisRef('mft-1').handle).toBe('analysis:analysis-xyz');
  });

  it('MakeReportFromTrack calls makeReportFromTrack and stores ReportRef (DBJ3)', async () => {
    const makeReportFromTrack = vi.fn(async () => ({
      schema: 'drone-detection-report/v1',
      reportId: 'rep-track-1',
      trackId: 'track-abc',
      isDetected: true,
      payload: { ok: true },
    }));
    const host = createStubScenarioRuntimeHost({ makeReportFromTrack });
    const reporterVar: ScenarioVariable = {
      ...createScenarioVariable('var-reporter', 'reporter1', 'ReporterRef'),
      value: createReferenceValue('ReporterRef', 'reporter:journal:device:dev-1'),
    };
    const trackVar: ScenarioVariable = {
      ...createScenarioVariable('var-track', 'track1', 'TrackRef'),
      value: createReferenceValue('TrackRef', 'track:track-abc'),
    };
    const variableStore = new ScenarioVariableStore([reporterVar, trackVar]);
    const reportStore = new ReportRuntimeStore();
    const node = {
      id: 'mrt-1',
      nodeKind: 'make-report-from-track' as const,
      blockKind: 'custom' as const,
      label: 'MakeReportFromTrack',
    };
    const subgraph: ScenarioSubgraph = {
      nodes: [
        { id: 'vg-reporter', nodeKind: 'variable-get', blockKind: 'custom', label: 'Get reporter', variableId: reporterVar.id },
        { id: 'vg-track', nodeKind: 'variable-get', blockKind: 'custom', label: 'Get track', variableId: trackVar.id },
        node,
      ],
      edges: [
        {
          id: 'd-reporter',
          kind: 'data',
          source: 'vg-reporter',
          sourceHandle: VARIABLE_VALUE_HANDLE,
          target: 'mrt-1',
          targetHandle: 'reporter',
          dataType: 'ReporterRef',
        },
        {
          id: 'd-track',
          kind: 'data',
          source: 'vg-track',
          sourceHandle: VARIABLE_VALUE_HANDLE,
          target: 'mrt-1',
          targetHandle: 'track',
          dataType: 'TrackRef',
        },
      ],
    };

    await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'main',
      subgraph,
      node,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore,
      reportStore,
      resolveContext: {
        getReportRef: (nodeId) => reportStore.getReportRef(nodeId),
      },
    });

    expect(makeReportFromTrack).toHaveBeenCalledWith(
      reporterVar.value,
      trackVar.value,
    );
    const reportRef = reportStore.getReportRef('mrt-1');
    expect(reportRef.valid).toBe(true);
    expect(reportRef.handle).toBe('report:rep-track-1');
  });

  it('PublishReport calls publishReport with payload from ReportRuntimeStore (DBJ4)', async () => {
    const publishReport = vi.fn(async () => true);
    const host = createStubScenarioRuntimeHost({ publishReport });
    const reportStore = new ReportRuntimeStore();
    reportStore.setNodeReport('mrt-src', {
      schema: 'trends-fft-report/v1',
      reportId: 'rep-pub-1',
      trackId: 'track-x',
      isDetected: false,
      payload: { ok: true },
    });
    const journalVar: ScenarioVariable = {
      ...createScenarioVariable('var-journal', 'journal1', 'JournalRef'),
      value: createReferenceValue('JournalRef', 'journal:device:dev-1'),
    };
    const reportVar: ScenarioVariable = {
      ...createScenarioVariable('var-report', 'report1', 'ReportRef'),
      value: reportStore.getReportRef('mrt-src'),
    };
    const variableStore = new ScenarioVariableStore([journalVar, reportVar]);
    const node = {
      id: 'pr-1',
      nodeKind: 'publish-report' as const,
      blockKind: 'custom' as const,
      label: 'PublishReport',
    };
    const subgraph: ScenarioSubgraph = {
      nodes: [
        {
          id: 'vg-journal',
          nodeKind: 'variable-get',
          blockKind: 'custom',
          label: 'Journal',
          variableId: journalVar.id,
        },
        {
          id: 'vg-report',
          nodeKind: 'variable-get',
          blockKind: 'custom',
          label: 'Report',
          variableId: reportVar.id,
        },
        node,
      ],
      edges: [
        {
          id: 'd1',
          kind: 'data',
          source: 'vg-journal',
          sourceHandle: VARIABLE_VALUE_HANDLE,
          target: 'pr-1',
          targetHandle: 'journal',
          dataType: 'JournalRef',
        },
        {
          id: 'd2',
          kind: 'data',
          source: 'vg-report',
          sourceHandle: VARIABLE_VALUE_HANDLE,
          target: 'pr-1',
          targetHandle: 'report',
          dataType: 'ReportRef',
        },
      ],
    };

    await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'main',
      subgraph,
      node,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore,
      reportStore,
      resolveContext: {},
    });

    expect(publishReport).toHaveBeenCalledWith(journalVar.value, {
      schema: 'trends-fft-report/v1',
      reportId: 'rep-pub-1',
      trackId: 'track-x',
      isDetected: false,
      payload: { ok: true },
    });
  });
});
