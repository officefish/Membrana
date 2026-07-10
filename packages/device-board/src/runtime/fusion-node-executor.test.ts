import { describe, expect, it, vi } from 'vitest';
import type { ScenarioSubgraph } from '@membrana/core';

import { executeScenarioBlock } from './block-executor.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { FftTrendAnalysisRuntimeStore } from './analysis-runtime-store.js';
import { CollectRuntimeStore } from './collect-runtime-store.js';
import { DetectionFusionRuntimeStore } from './fusion-runtime-store.js';
import { ScenarioVariableStore } from './variable-store.js';
import type { ScenarioDetectionResult } from './types.js';

/**
 * basn-2 (#323): executor MakeDetectionFusion — слияние 2–4 анализов во value
 * DetectionFusion через core fuseDetectorConfidences. Матрица консилиума:
 * согласие → высокий score; расхождение → середина; молчащий вход → present:false.
 */

function detection(confidence: number, detected = confidence >= 0.5): ScenarioDetectionResult {
  return { detected, confidence, isDrone: detected };
}

/** Граф: два make-fft-trends-analysis → make-detection-fusion (порты analysis-1/2). */
function buildFusionSubgraph(fusionNodeId: string, inputCount?: number): ScenarioSubgraph {
  return {
    nodes: [
      { id: 'an-1', nodeKind: 'make-fft-trends-analysis', blockKind: 'custom', label: 'A1' },
      { id: 'an-2', nodeKind: 'make-fft-trends-analysis', blockKind: 'custom', label: 'A2' },
      {
        id: fusionNodeId,
        nodeKind: 'make-detection-fusion',
        blockKind: 'custom',
        label: 'Fusion',
        ...(inputCount !== undefined ? { detectionFusionInputCount: inputCount } : {}),
      },
    ],
    edges: [
      {
        id: 'd1',
        kind: 'data',
        source: 'an-1',
        sourceHandle: 'analysis',
        target: fusionNodeId,
        targetHandle: 'analysis-1',
        dataType: 'DetectionAnalysisRef',
      },
      {
        id: 'd2',
        kind: 'data',
        source: 'an-2',
        sourceHandle: 'analysis',
        target: fusionNodeId,
        targetHandle: 'analysis-2',
        dataType: 'DetectionAnalysisRef',
      },
    ],
  };
}

interface RunOptions {
  readonly detections: readonly (ScenarioDetectionResult | null)[];
  readonly inputCount?: number;
}

async function runFusion({ detections, inputCount }: RunOptions) {
  const host = createStubScenarioRuntimeHost({});
  const analysisStore = new FftTrendAnalysisRuntimeStore();
  const fusionStore = new DetectionFusionRuntimeStore();
  detections.forEach((det, i) => {
    if (det !== null) {
      analysisStore.setNodeAnalysis(`an-${i + 1}`, `analysis-${i + 1}`, det);
    }
  });
  const subgraph = buildFusionSubgraph('fusion-1', inputCount);
  const node = subgraph.nodes.find((n) => n.id === 'fusion-1');
  if (node === undefined) throw new Error('fusion node missing');

  await executeScenarioBlock({
    host,
    signal: new AbortController().signal,
    branch: 'main',
    subgraph,
    node,
    lastDetection: null,
    defaultChunkDurationMs: 5000,
    functions: [],
    variableStore: new ScenarioVariableStore(),
    analysisStore,
    fusionStore,
    resolveContext: {
      getFftTrendAnalysisRef: (nodeId) => analysisStore.getAnalysisRef(nodeId),
      getDetectionFusionValue: (nodeId) => fusionStore.getFusionValue(nodeId),
    },
  });

  const value = fusionStore.getFusionValue('fusion-1');
  if (value === null) throw new Error('fusion value missing after execute');
  return value;
}

describe('executeScenarioBlock make-detection-fusion (basn-2)', () => {
  it('согласие high↔high → высокий combinedScore, agreement ≈ 1', async () => {
    const value = await runFusion({ detections: [detection(0.9), detection(0.85)] });
    expect(value.combinedScore).toBeCloseTo(0.875, 5);
    expect(value.agreement).toBeGreaterThan(0.9);
    expect(value.presentCount).toBe(2);
  });

  it('расхождение high↔low → середина, низкий agreement', async () => {
    const value = await runFusion({ detections: [detection(0.95), detection(0.05)] });
    expect(value.combinedScore).toBeCloseTo(0.5, 5);
    expect(value.agreement).toBeLessThan(0.2);
  });

  it('молчащий вход (анализ не считался) → present:false, не ломает узел', async () => {
    const value = await runFusion({ detections: [detection(0.8), null] });
    expect(value.presentCount).toBe(1);
    expect(value.combinedScore).toBeCloseTo(0.8, 5);
  });

  it('все входы молчат → combinedScore 0, presentCount 0', async () => {
    const value = await runFusion({ detections: [null, null] });
    expect(value.combinedScore).toBe(0);
    expect(value.presentCount).toBe(0);
  });

  it('downstream data-pull: getDetectionFusionValue отдаёт последний расчёт', async () => {
    const host = createStubScenarioRuntimeHost({});
    const analysisStore = new FftTrendAnalysisRuntimeStore();
    const fusionStore = new DetectionFusionRuntimeStore();
    analysisStore.setNodeAnalysis('an-1', 'analysis-1', detection(0.6));
    analysisStore.setNodeAnalysis('an-2', 'analysis-2', detection(0.6));
    const subgraph = buildFusionSubgraph('fusion-1');
    const node = subgraph.nodes.find((n) => n.id === 'fusion-1');
    if (node === undefined) throw new Error('fusion node missing');
    await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'main',
      subgraph,
      node,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore: new ScenarioVariableStore(),
      analysisStore,
      fusionStore,
      resolveContext: {
        getFftTrendAnalysisRef: (nodeId) => analysisStore.getAnalysisRef(nodeId),
      },
    });
    const pulled = fusionStore.getFusionValue('fusion-1');
    expect(pulled?.kind).toBe('DetectionFusion');
    expect(pulled?.combinedScore).toBeCloseTo(0.6, 5);
  });
});

describe('fusion → lastDetection (консилиум #340, т.2)', () => {
  it('combined выше порога → lastDetection detected с DRONE_FUSION (вход в alarm по fusion)', async () => {
    const host = createStubScenarioRuntimeHost({});
    const analysisStore = new FftTrendAnalysisRuntimeStore();
    const fusionStore = new DetectionFusionRuntimeStore();
    analysisStore.setNodeAnalysis('an-1', 'a1', { detected: true, confidence: 0.9, isDrone: true });
    analysisStore.setNodeAnalysis('an-2', 'a2', { detected: true, confidence: 0.7, isDrone: true });
    const subgraph = buildFusionSubgraph('fusion-1');
    const node = subgraph.nodes.find((n) => n.id === 'fusion-1');
    if (node === undefined) throw new Error('missing');
    const result = await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'main',
      subgraph,
      node,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore: new ScenarioVariableStore(),
      analysisStore,
      fusionStore,
      resolveContext: {
        getFftTrendAnalysisRef: (nodeId) => analysisStore.getAnalysisRef(nodeId),
      },
    });
    expect(result.lastDetection?.detected).toBe(true);
    expect(result.lastDetection?.confidence).toBeCloseTo(0.8, 5);
    expect(result.lastDetection?.templateId).toBe('DRONE_FUSION');
  });

  it('combined ниже порога → lastDetection not detected (alarm не стартует от trends-соло)', async () => {
    const host = createStubScenarioRuntimeHost({});
    const analysisStore = new FftTrendAnalysisRuntimeStore();
    const fusionStore = new DetectionFusionRuntimeStore();
    // trends-соло кричит 0.9, но ансамбль молчит → combined 0.45 < 0.5.
    analysisStore.setNodeAnalysis('an-1', 'a1', { detected: true, confidence: 0.9, isDrone: true });
    analysisStore.setNodeAnalysis('an-2', 'a2', { detected: false, confidence: 0.0, isDrone: false });
    const subgraph = buildFusionSubgraph('fusion-1');
    const node = subgraph.nodes.find((n) => n.id === 'fusion-1');
    if (node === undefined) throw new Error('missing');
    const result = await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'main',
      subgraph,
      node,
      lastDetection: { detected: true, confidence: 0.9, isDrone: true, templateId: 'DRONE_TIGHT' },
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore: new ScenarioVariableStore(),
      analysisStore,
      fusionStore,
      resolveContext: {
        getFftTrendAnalysisRef: (nodeId) => analysisStore.getAnalysisRef(nodeId),
      },
    });
    expect(result.lastDetection?.detected).toBe(false);
    expect(result.lastDetection?.templateId).toBeUndefined();
  });
});

describe('порог fusion→lastDetection из branch-узла + legacy fallback (#340 P1)', () => {
  it('порог берётся из связанного branch-on-detection (0.55): combined 0.52 → not detected', async () => {
    const host = createStubScenarioRuntimeHost({});
    const analysisStore = new FftTrendAnalysisRuntimeStore();
    const fusionStore = new DetectionFusionRuntimeStore();
    analysisStore.setNodeAnalysis('an-1', 'a1', { detected: true, confidence: 0.62, isDrone: true });
    analysisStore.setNodeAnalysis('an-2', 'a2', { detected: false, confidence: 0.42, isDrone: false });
    const subgraph: ScenarioSubgraph = {
      nodes: [
        { id: 'an-1', nodeKind: 'make-fft-trends-analysis', blockKind: 'custom', label: 'A1' },
        { id: 'an-2', nodeKind: 'make-fft-trends-analysis', blockKind: 'custom', label: 'A2' },
        { id: 'fusion-1', nodeKind: 'make-detection-fusion', blockKind: 'custom', label: 'F' },
        { id: 'branch-1', nodeKind: 'branch-on-detection', blockKind: 'custom', label: 'B', detectionThreshold: 0.55 },
      ],
      edges: [
        { id: 'e1', kind: 'data', source: 'an-1', sourceHandle: 'analysis', target: 'fusion-1', targetHandle: 'analysis-1', dataType: 'DetectionAnalysisRef' },
        { id: 'e2', kind: 'data', source: 'an-2', sourceHandle: 'analysis', target: 'fusion-1', targetHandle: 'analysis-2', dataType: 'DetectionAnalysisRef' },
        { id: 'e3', kind: 'data', source: 'fusion-1', sourceHandle: 'fusion', target: 'branch-1', targetHandle: 'fusion', dataType: 'DetectionFusion' },
      ],
    };
    const node = subgraph.nodes.find((n) => n.id === 'fusion-1');
    if (node === undefined) throw new Error('missing');
    const result = await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'main',
      subgraph,
      node,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore: new ScenarioVariableStore(),
      analysisStore,
      fusionStore,
      resolveContext: {
        getFftTrendAnalysisRef: (nodeId) => analysisStore.getAnalysisRef(nodeId),
      },
    });
    // combined = (0.62+0.42)/2 = 0.52: выше дефолта 0.5, но НИЖЕ порога branch 0.55.
    expect(result.lastDetection?.confidence).toBeCloseTo(0.52, 5);
    expect(result.lastDetection?.detected).toBe(false); // рассинхрона с branch нет
  });

  it('legacy fallback: граф без fusion — trends остаётся писателем lastDetection', async () => {
    const analyzeFftTrendsFromFrameRefs = vi.fn(async () => ({
      analysisId: 'legacy-1',
      detection: { detected: true, confidence: 0.9, isDrone: true, templateId: 'DRONE_TIGHT' },
    }));
    const host = createStubScenarioRuntimeHost({ analyzeFftTrendsFromFrameRefs });
    const collectStore = new CollectRuntimeStore();
    const analysisStore = new FftTrendAnalysisRuntimeStore();
    collectStore.setLastBatch('cf-1', [{ kind: 'FftFrameRef', handle: 'f-1', valid: true }], 'FftFrameRefList');
    const analyserRef = { kind: 'SpectralAnalyserRef' as const, handle: 'sa-1', valid: true };
    const subgraph: ScenarioSubgraph = {
      nodes: [
        { id: 'vg-a', nodeKind: 'variable-get', blockKind: 'custom', label: 'analyser', variableId: 'var-a' },
        { id: 'cf-1', nodeKind: 'collect-fft-frames', blockKind: 'custom', label: 'Collect' },
        { id: 'an-1', nodeKind: 'make-fft-trends-analysis', blockKind: 'custom', label: 'Trends' },
      ],
      edges: [
        { id: 'e1', kind: 'data', source: 'vg-a', sourceHandle: 'value', target: 'an-1', targetHandle: 'analyser', dataType: 'SpectralAnalyserRef' },
        { id: 'e2', kind: 'data', source: 'cf-1', sourceHandle: 'batches', target: 'an-1', targetHandle: 'frames', dataType: 'FftFrameRefList' },
      ],
    };
    const node = subgraph.nodes.find((n) => n.id === 'an-1');
    if (node === undefined) throw new Error('missing');
    const result = await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'main',
      subgraph,
      node,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore: new ScenarioVariableStore([
        { id: 'var-a', name: 'analyser', type: 'SpectralAnalyserRef', value: analyserRef },
      ]),
      collectStore,
      analysisStore,
      resolveContext: {
        getCollectBatchRef: (nodeId) => collectStore.getLastBatchRef(nodeId),
      },
    });
    // Без fusion-узла lastDetection пишет trends — legacy-путь жив (bundled MVP).
    expect(result.lastDetection?.detected).toBe(true);
    expect(result.lastDetection?.templateId).toBe('DRONE_TIGHT');
  });
});
