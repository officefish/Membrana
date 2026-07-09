import { describe, expect, it, vi } from 'vitest';
import type { ScenarioSubgraph } from '@membrana/core';

import { executeScenarioBlock } from './block-executor.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { FftTrendAnalysisRuntimeStore } from './analysis-runtime-store.js';
import { EnsembleAnalysisRuntimeStore } from './ensemble-runtime-store.js';
import { DetectionFusionRuntimeStore } from './fusion-runtime-store.js';
import { ProximityRuntimeStore } from './proximity-runtime-store.js';
import { ReportRuntimeStore } from './report-runtime-store.js';
import { TrackRuntimeStore } from './track-runtime-store.js';
import { ScenarioVariableStore } from './variable-store.js';
import { isReferenceValid } from './reference-validity.js';
import {
  BRANCH_ON_DETECTION_DETECTED_HANDLE,
} from '../graph/branch-on-detection-node.js';

/**
 * basn-5 (#323): executor MakeCombinedReport — синхронный конструктор единого
 * отчёта (2 анализа + трек → ReportRef) + эпик-smoke полной детекционной цепочки.
 */

function reporterRefValue() {
  return { kind: 'ReporterRef' as const, handle: 'reporter:journal-1', valid: true };
}

function buildCombinedReportSubgraph(): ScenarioSubgraph {
  return {
    nodes: [
      { id: 'an-1', nodeKind: 'make-fft-trends-analysis', blockKind: 'custom', label: 'Trends' },
      { id: 'ens-1', nodeKind: 'make-ensemble-analysis', blockKind: 'custom', label: 'Ensemble' },
      { id: 'track-1', nodeKind: 'make-track', blockKind: 'custom', label: 'Track' },
      { id: 'rep-1', nodeKind: 'make-combined-report', blockKind: 'custom', label: 'Combined' },
      { id: 'vg-rep', nodeKind: 'variable-get', blockKind: 'custom', label: 'reporter', variableId: 'var-rep' },
    ],
    edges: [
      { id: 'e1', kind: 'data', source: 'vg-rep', sourceHandle: 'value', target: 'rep-1', targetHandle: 'reporter', dataType: 'ReporterRef' },
      { id: 'e2', kind: 'data', source: 'an-1', sourceHandle: 'analysis', target: 'rep-1', targetHandle: 'analysis-1', dataType: 'DetectionAnalysisRef' },
      { id: 'e3', kind: 'data', source: 'ens-1', sourceHandle: 'analysis', target: 'rep-1', targetHandle: 'analysis-2', dataType: 'DetectionAnalysisRef' },
      { id: 'e4', kind: 'data', source: 'track-1', sourceHandle: 'track', target: 'rep-1', targetHandle: 'track', dataType: 'TrackRef' },
    ],
  };
}

describe('executeScenarioBlock make-combined-report (basn-5)', () => {
  it('host получает оба анализа + track; payload сохраняется в reportStore', async () => {
    const makeCombinedReport = vi.fn(async () => ({
      schema: 'combined-detection/v1',
      reportId: 'combined-1',
      trackId: 't-1',
      isDetected: true,
      payload: {},
    }));
    const host = createStubScenarioRuntimeHost({ makeCombinedReport });
    const analysisStore = new FftTrendAnalysisRuntimeStore();
    const ensembleStore = new EnsembleAnalysisRuntimeStore();
    const reportStore = new ReportRuntimeStore();
    const trackStore = new TrackRuntimeStore();
    analysisStore.setNodeAnalysis('an-1', 'trends-1', { detected: true, confidence: 0.9, isDrone: true });
    ensembleStore.setNodeAnalysis('ens-1', 'ens-1', { detected: true, confidence: 0.7, isDrone: true });
    trackStore.setNodeTrack('track-1', 't-1');
    const variableStore = new ScenarioVariableStore([
      { id: 'var-rep', name: 'reporter', type: 'ReporterRef', value: reporterRefValue() },
    ]);
    const subgraph = buildCombinedReportSubgraph();
    const node = subgraph.nodes.find((n) => n.id === 'rep-1');
    if (node === undefined) throw new Error('node missing');

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
      analysisStore,
      ensembleStore,
      reportStore,
      trackStore,
      resolveContext: {
        getFftTrendAnalysisRef: (nodeId) => analysisStore.getAnalysisRef(nodeId),
        getEnsembleAnalysisRef: (nodeId) => ensembleStore.getAnalysisRef(nodeId),
        getTrackRef: (nodeId) => trackStore.getTrackRef(nodeId),
        getReportRef: (nodeId) => reportStore.getReportRef(nodeId),
      },
    });

    expect(makeCombinedReport).toHaveBeenCalledTimes(1);
    const [reporterArg, inputArg] = makeCombinedReport.mock.calls[0]!;
    expect(reporterArg.handle).toBe('reporter:journal-1');
    expect(inputArg.analyses.map((a: { handle: string }) => a.handle)).toEqual([
      'analysis:trends-1',
      'ensemble-analysis:ens-1',
    ]);
    expect(inputArg.trackHandle).toBe('track:t-1');
    expect(reportStore.getReportRef('rep-1').valid).toBe(true);
  });

  it('невалидный reporter → skip (no throw), отчёт не создаётся', async () => {
    const makeCombinedReport = vi.fn(async () => null);
    const host = createStubScenarioRuntimeHost({ makeCombinedReport });
    const analysisStore = new FftTrendAnalysisRuntimeStore();
    analysisStore.setNodeAnalysis('an-1', 'trends-1', { detected: true, confidence: 0.9 });
    const subgraph = buildCombinedReportSubgraph();
    const node = subgraph.nodes.find((n) => n.id === 'rep-1');
    if (node === undefined) throw new Error('node missing');
    await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'main',
      subgraph,
      node,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore: new ScenarioVariableStore(), // reporter-переменная не задана
      analysisStore,
      ensembleStore: new EnsembleAnalysisRuntimeStore(),
      reportStore: new ReportRuntimeStore(),
      trackStore: new TrackRuntimeStore(),
      resolveContext: {
        getFftTrendAnalysisRef: (nodeId) => analysisStore.getAnalysisRef(nodeId),
      },
    });
    expect(makeCombinedReport).not.toHaveBeenCalled();
  });
});

describe('эпик-smoke #323: полная детекционная цепочка (мок-host)', () => {
  it('trends+ensemble → fusion → branch(detected) → combined-report; lost → выход alarm', async () => {
    const analysisStore = new FftTrendAnalysisRuntimeStore();
    const ensembleStore = new EnsembleAnalysisRuntimeStore();
    const fusionStore = new DetectionFusionRuntimeStore();
    const proximityStore = new ProximityRuntimeStore();
    const reportStore = new ReportRuntimeStore();
    const trackStore = new TrackRuntimeStore();
    const host = createStubScenarioRuntimeHost({});
    const variableStore = new ScenarioVariableStore([
      { id: 'var-rep', name: 'reporter', type: 'ReporterRef', value: reporterRefValue() },
    ]);

    // 1) Анализы двух детекторов готовы (согласие high).
    analysisStore.setNodeAnalysis('an-1', 'trends-1', { detected: true, confidence: 0.9, isDrone: true });
    ensembleStore.setNodeAnalysis('ens-1', 'ens-1', { detected: true, confidence: 0.7, isDrone: true });
    trackStore.setNodeTrack('track-1', 't-1');

    const subgraph: ScenarioSubgraph = {
      nodes: [
        { id: 'an-1', nodeKind: 'make-fft-trends-analysis', blockKind: 'custom', label: 'Trends' },
        { id: 'ens-1', nodeKind: 'make-ensemble-analysis', blockKind: 'custom', label: 'Ensemble' },
        { id: 'fusion-1', nodeKind: 'make-detection-fusion', blockKind: 'custom', label: 'Fusion' },
        { id: 'branch-1', nodeKind: 'branch-on-detection', blockKind: 'custom', label: 'Branch' },
        { id: 'prox-1', nodeKind: 'make-proximity-trend', blockKind: 'custom', label: 'Prox' },
        { id: 'track-1', nodeKind: 'make-track', blockKind: 'custom', label: 'Track' },
        { id: 'rep-1', nodeKind: 'make-combined-report', blockKind: 'custom', label: 'Combined' },
        { id: 'vg-rep', nodeKind: 'variable-get', blockKind: 'custom', label: 'reporter', variableId: 'var-rep' },
      ],
      edges: [
        { id: 'e1', kind: 'data', source: 'an-1', sourceHandle: 'analysis', target: 'fusion-1', targetHandle: 'analysis-1', dataType: 'DetectionAnalysisRef' },
        { id: 'e2', kind: 'data', source: 'ens-1', sourceHandle: 'analysis', target: 'fusion-1', targetHandle: 'analysis-2', dataType: 'DetectionAnalysisRef' },
        { id: 'e3', kind: 'data', source: 'fusion-1', sourceHandle: 'fusion', target: 'branch-1', targetHandle: 'fusion', dataType: 'DetectionFusion' },
        { id: 'e4', kind: 'data', source: 'fusion-1', sourceHandle: 'fusion', target: 'prox-1', targetHandle: 'fusion', dataType: 'DetectionFusion' },
        { id: 'e5', kind: 'data', source: 'vg-rep', sourceHandle: 'value', target: 'rep-1', targetHandle: 'reporter', dataType: 'ReporterRef' },
        { id: 'e6', kind: 'data', source: 'an-1', sourceHandle: 'analysis', target: 'rep-1', targetHandle: 'analysis-1', dataType: 'DetectionAnalysisRef' },
        { id: 'e7', kind: 'data', source: 'ens-1', sourceHandle: 'analysis', target: 'rep-1', targetHandle: 'analysis-2', dataType: 'DetectionAnalysisRef' },
        { id: 'e8', kind: 'data', source: 'track-1', sourceHandle: 'track', target: 'rep-1', targetHandle: 'track', dataType: 'TrackRef' },
      ],
    };

    const stores = {
      variableStore,
      analysisStore,
      ensembleStore,
      fusionStore,
      proximityStore,
      reportStore,
      trackStore,
    };
    const resolveContext = {
      getFftTrendAnalysisRef: (nodeId: string) => analysisStore.getAnalysisRef(nodeId),
      getEnsembleAnalysisRef: (nodeId: string) => ensembleStore.getAnalysisRef(nodeId),
      getDetectionFusionValue: (nodeId: string) => fusionStore.getFusionValue(nodeId),
      getProximityRef: (nodeId: string) => proximityStore.getProximityRef(nodeId),
      getTrackRef: (nodeId: string) => trackStore.getTrackRef(nodeId),
      getReportRef: (nodeId: string) => reportStore.getReportRef(nodeId),
    };
    const base = {
      host,
      signal: new AbortController().signal,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      resolveContext,
      ...stores,
    };
    const nodeById = (id: string) => {
      const n = subgraph.nodes.find((x) => x.id === id);
      if (n === undefined) throw new Error(`node ${id} missing`);
      return n;
    };

    // 2) fusion → combinedScore 0.8
    await executeScenarioBlock({ ...base, branch: 'main', subgraph, node: nodeById('fusion-1') });
    expect(fusionStore.getFusionValue('fusion-1')?.combinedScore).toBeCloseTo(0.8, 5);

    // 3) branch → detected
    const branchResult = await executeScenarioBlock({
      ...base,
      branch: 'main',
      subgraph,
      node: nodeById('branch-1'),
    });
    expect(branchResult.execOutHandle).toBe(BRANCH_ON_DETECTION_DETECTED_HANDLE);

    // 4) combined-report → единый отчёт с обоими анализами и треком (stub host)
    await executeScenarioBlock({ ...base, branch: 'main', subgraph, node: nodeById('rep-1') });
    const reportRef = reportStore.getReportRef('rep-1');
    expect(reportRef.valid).toBe(true);

    // 5) alarm: proximity жив (approaching) → ref valid → loop продолжается
    const hostAlive = createStubScenarioRuntimeHost({
      evaluateProximityTrend: async () => ({ trend: 'approaching', ready: true, deltaRatio: 0.3 }),
    });
    await executeScenarioBlock({ ...base, host: hostAlive, branch: 'alarm', subgraph, node: nodeById('prox-1') });
    expect(isReferenceValid(proximityStore.getProximityRef('prox-1'))).toBe(true);

    // 6) alarm: дистанция потеряна (lost) → ref INVALID → is-valid выведет из лупа
    const hostLost = createStubScenarioRuntimeHost({
      evaluateProximityTrend: async () => ({ trend: 'lost', ready: true, deltaRatio: 0 }),
    });
    await executeScenarioBlock({ ...base, host: hostLost, branch: 'alarm', subgraph, node: nodeById('prox-1') });
    expect(isReferenceValid(proximityStore.getProximityRef('prox-1'))).toBe(false);
  });
});
