import { describe, expect, it } from 'vitest';
import type { ScenarioSubgraph } from '@membrana/core';

import { executeScenarioBlock } from './block-executor.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { FftTrendAnalysisRuntimeStore } from './analysis-runtime-store.js';
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
