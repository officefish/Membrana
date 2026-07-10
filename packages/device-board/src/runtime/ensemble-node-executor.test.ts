import { describe, expect, it, vi } from 'vitest';
import type { ScenarioSubgraph } from '@membrana/core';

import { executeScenarioBlock } from './block-executor.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { CollectRuntimeStore } from './collect-runtime-store.js';
import { FftTrendAnalysisRuntimeStore } from './analysis-runtime-store.js';
import { DetectionFusionRuntimeStore } from './fusion-runtime-store.js';
import { EnsembleAnalysisRuntimeStore } from './ensemble-runtime-store.js';
import { ScenarioVariableStore } from './variable-store.js';

/**
 * basn-1 (#323): executor MakeEnsembleAnalysis — второй детектор через host-мост
 * makeEnsembleAnalysisFromSampleRefs; детекция сохраняется по handle для fusion.
 */

function buildEnsembleSubgraph(): ScenarioSubgraph {
  return {
    nodes: [
      { id: 'collect-1', nodeKind: 'collect-samples', blockKind: 'custom', label: 'Collect' },
      { id: 'ens-1', nodeKind: 'make-ensemble-analysis', blockKind: 'custom', label: 'Ensemble' },
    ],
    edges: [
      {
        id: 'd1',
        kind: 'data',
        source: 'collect-1',
        sourceHandle: 'batches',
        target: 'ens-1',
        targetHandle: 'samples',
        dataType: 'AudioSampleRefList',
      },
    ],
  };
}

describe('executeScenarioBlock make-ensemble-analysis (basn-1)', () => {
  it('host-мост вызывается с sample refs; ref+детекция сохраняются в store', async () => {
    const makeEnsembleAnalysisFromSampleRefs = vi.fn(async () => ({
      analysisId: 'ens-abc',
      detection: { detected: true, confidence: 0.72, isDrone: true },
    }));
    const host = createStubScenarioRuntimeHost({ makeEnsembleAnalysisFromSampleRefs });
    const collectStore = new CollectRuntimeStore();
    const ensembleStore = new EnsembleAnalysisRuntimeStore();
    const sampleA = { kind: 'AudioSampleRef' as const, handle: 's-1', valid: true };
    const sampleB = { kind: 'AudioSampleRef' as const, handle: 's-2', valid: true };
    collectStore.setLastBatch('collect-1', [sampleA, sampleB], 'AudioSampleRefList');
    const subgraph = buildEnsembleSubgraph();
    const node = subgraph.nodes.find((n) => n.id === 'ens-1');
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
      variableStore: new ScenarioVariableStore(),
      collectStore,
      ensembleStore,
      resolveContext: {
        getCollectBatchRef: (nodeId) => collectStore.getLastBatchRef(nodeId),
        getEnsembleAnalysisRef: (nodeId) => ensembleStore.getAnalysisRef(nodeId),
      },
    });

    expect(makeEnsembleAnalysisFromSampleRefs).toHaveBeenCalledWith('ens-1', [sampleA, sampleB]);
    const ref = ensembleStore.getAnalysisRef('ens-1');
    expect(ref.kind).toBe('EnsembleAnalysisRef');
    expect(ref.handle).toBe('ensemble-analysis:ens-abc');
    expect(ref.valid).toBe(true);
    expect(ensembleStore.getDetectionByHandle(ref.handle as string)?.confidence).toBeCloseTo(
      0.72,
      5,
    );
  });

  it('пустой batch → молчащий skip, exec продолжается (#340: transient холодного старта)', async () => {
    const host = createStubScenarioRuntimeHost({});
    const collectStore = new CollectRuntimeStore();
    const subgraph = buildEnsembleSubgraph();
    const node = subgraph.nodes.find((n) => n.id === 'ens-1');
    if (node === undefined) throw new Error('node missing');
    const ensembleStore = new EnsembleAnalysisRuntimeStore();
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
        collectStore,
        ensembleStore,
        resolveContext: {
          getCollectBatchRef: (nodeId) => collectStore.getLastBatchRef(nodeId),
        },
      });
    // Store не тронут: ref остаётся invalid с целевым kind.
    const ref = ensembleStore.getAnalysisRef('ens-1');
    expect(ref.valid).toBe(false);
    expect(ref.kind).toBe('EnsembleAnalysisRef');
  });

  it('fusion сливает trends + ensemble (интеграция basn-1 ↔ basn-2)', async () => {
    const host = createStubScenarioRuntimeHost({});
    const analysisStore = new FftTrendAnalysisRuntimeStore();
    const ensembleStore = new EnsembleAnalysisRuntimeStore();
    const fusionStore = new DetectionFusionRuntimeStore();
    analysisStore.setNodeAnalysis('an-1', 'trends-1', {
      detected: true,
      confidence: 0.9,
      isDrone: true,
    });
    ensembleStore.setNodeAnalysis('ens-1', 'ens-1', {
      detected: true,
      confidence: 0.7,
      isDrone: true,
    });
    const subgraph: ScenarioSubgraph = {
      nodes: [
        { id: 'an-1', nodeKind: 'make-fft-trends-analysis', blockKind: 'custom', label: 'Trends' },
        { id: 'ens-1', nodeKind: 'make-ensemble-analysis', blockKind: 'custom', label: 'Ensemble' },
        { id: 'fusion-1', nodeKind: 'make-detection-fusion', blockKind: 'custom', label: 'Fusion' },
      ],
      edges: [
        {
          id: 'd1',
          kind: 'data',
          source: 'an-1',
          sourceHandle: 'analysis',
          target: 'fusion-1',
          targetHandle: 'analysis-1',
          dataType: 'DetectionAnalysisRef',
        },
        {
          id: 'd2',
          kind: 'data',
          source: 'ens-1',
          sourceHandle: 'analysis',
          target: 'fusion-1',
          targetHandle: 'analysis-2',
          dataType: 'DetectionAnalysisRef',
        },
      ],
    };
    const node = subgraph.nodes.find((n) => n.id === 'fusion-1');
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
      variableStore: new ScenarioVariableStore(),
      analysisStore,
      ensembleStore,
      fusionStore,
      resolveContext: {
        getFftTrendAnalysisRef: (nodeId) => analysisStore.getAnalysisRef(nodeId),
        getEnsembleAnalysisRef: (nodeId) => ensembleStore.getAnalysisRef(nodeId),
      },
    });
    const value = fusionStore.getFusionValue('fusion-1');
    expect(value?.presentCount).toBe(2);
    expect(value?.combinedScore).toBeCloseTo(0.8, 5); // (0.9 + 0.7) / 2
  });
});
