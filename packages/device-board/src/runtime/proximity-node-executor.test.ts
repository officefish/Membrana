import { describe, expect, it, vi } from 'vitest';
import type { ProximityTrendResult, ScenarioSubgraph } from '@membrana/core';

import { executeScenarioBlock } from './block-executor.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { DetectionFusionRuntimeStore } from './fusion-runtime-store.js';
import { ProximityRuntimeStore } from './proximity-runtime-store.js';
import { ScenarioVariableStore } from './variable-store.js';
import { isReferenceValid } from './reference-validity.js';

/**
 * basn-4 (#323): executor MakeProximityTrend — host-мост evaluateProximityTrend;
 * ключевой инвариант: trend='lost' → ProximityRef.valid=false → выход из
 * alarm-loop через существующий is-valid (композиция, консилиум т.5).
 */

function buildProximitySubgraph(): ScenarioSubgraph {
  return {
    nodes: [
      { id: 'fusion-1', nodeKind: 'make-detection-fusion', blockKind: 'custom', label: 'Fusion' },
      { id: 'prox-1', nodeKind: 'make-proximity-trend', blockKind: 'custom', label: 'Proximity' },
    ],
    edges: [
      {
        id: 'd1',
        kind: 'data',
        source: 'fusion-1',
        sourceHandle: 'fusion',
        target: 'prox-1',
        targetHandle: 'fusion',
        dataType: 'DetectionFusion',
      },
    ],
  };
}

async function runProximity(options: {
  readonly hostResult: ProximityTrendResult | null;
  readonly fusionScore?: number;
}) {
  const evaluateProximityTrend = vi.fn(async () => options.hostResult);
  const host = createStubScenarioRuntimeHost({ evaluateProximityTrend });
  const fusionStore = new DetectionFusionRuntimeStore();
  const proximityStore = new ProximityRuntimeStore();
  if (options.fusionScore !== undefined) {
    fusionStore.setNodeFusion('fusion-1', {
      kind: 'DetectionFusion',
      combinedScore: options.fusionScore,
      agreement: 1,
      presentCount: 2,
    });
  }
  const subgraph = buildProximitySubgraph();
  const node = subgraph.nodes.find((n) => n.id === 'prox-1');
  if (node === undefined) throw new Error('node missing');
  await executeScenarioBlock({
    host,
    signal: new AbortController().signal,
    branch: 'alarm',
    subgraph,
    node,
    lastDetection: null,
    defaultChunkDurationMs: 5000,
    functions: [],
    variableStore: new ScenarioVariableStore(),
    fusionStore,
    proximityStore,
    resolveContext: {
      getDetectionFusionValue: (nodeId) => fusionStore.getFusionValue(nodeId),
      getProximityRef: (nodeId) => proximityStore.getProximityRef(nodeId),
    },
  });
  return { evaluateProximityTrend, proximityStore };
}

describe('executeScenarioBlock make-proximity-trend (basn-4)', () => {
  it('host-мост получает combinedScore из fusion-входа', async () => {
    const { evaluateProximityTrend } = await runProximity({
      hostResult: { trend: 'approaching', ready: true, deltaRatio: 0.3 },
      fusionScore: 0.7,
    });
    expect(evaluateProximityTrend).toHaveBeenCalledWith('prox-1', { combinedScore: 0.7 });
  });

  it('approaching → ProximityRef valid (alarm-loop живёт)', async () => {
    const { proximityStore } = await runProximity({
      hostResult: { trend: 'approaching', ready: true, deltaRatio: 0.3 },
      fusionScore: 0.7,
    });
    const ref = proximityStore.getProximityRef('prox-1');
    expect(ref.valid).toBe(true);
    expect(isReferenceValid(ref)).toBe(true);
    expect(proximityStore.getResult('prox-1')?.trend).toBe('approaching');
  });

  it("lost → ProximityRef INVALID — выход из alarm-loop через is-valid", async () => {
    const { proximityStore } = await runProximity({
      hostResult: { trend: 'lost', ready: true, deltaRatio: 0 },
      fusionScore: 0.1,
    });
    const ref = proximityStore.getProximityRef('prox-1');
    expect(ref.valid).toBe(false);
    expect(isReferenceValid(ref)).toBe(false);
  });

  it('неподключённый fusion-вход → combinedScore null, не throw', async () => {
    const { evaluateProximityTrend } = await runProximity({
      hostResult: { trend: 'stable', ready: false, deltaRatio: 0 },
    });
    expect(evaluateProximityTrend).toHaveBeenCalledWith('prox-1', { combinedScore: null });
  });

  it('до первой оценки ref invalid (накопление окна)', () => {
    const store = new ProximityRuntimeStore();
    expect(store.getProximityRef('nope').valid).toBe(false);
  });
});
