import { describe, expect, it } from 'vitest';

import { runEventBranchFromNode } from './event-dispatch.js';
import { runSubgraphOnce } from './exec-subgraph.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { CollectRuntimeStore } from './collect-runtime-store.js';
import { FftTrendAnalysisRuntimeStore } from './analysis-runtime-store.js';
import { EnsembleAnalysisRuntimeStore } from './ensemble-runtime-store.js';
import { DetectionFusionRuntimeStore } from './fusion-runtime-store.js';
import { ProximityRuntimeStore } from './proximity-runtime-store.js';
import { ScenarioVariableStore } from './variable-store.js';
import type { ScenarioSubgraph } from '@membrana/core';

/**
 * L33 (#340, live run 21a7fb2f): event-dispatch не пробрасывал basn-stores в
 * latent/event-ветки → ensemble бросал 'requires ensembleStore', exec-sequence
 * глотал молча (L31). Регрессия: ветка с ensemble работает; ошибка ветки видима.
 */

const ENSEMBLE_BRANCH: ScenarioSubgraph = {
  entry: 'e-ens',
  nodes: [
    { id: 'e-collect', nodeKind: 'collect-samples', blockKind: 'custom', label: 'C' },
    { id: 'e-ens', nodeKind: 'make-ensemble-analysis', blockKind: 'custom', label: 'E' },
  ],
  edges: [
    {
      id: 'd1',
      kind: 'data',
      source: 'e-collect',
      sourceHandle: 'batches',
      target: 'e-ens',
      targetHandle: 'samples',
      dataType: 'AudioSampleRefList',
    },
  ],
};

describe('L33: basn-stores в event/latent-ветках', () => {
  it('runEventBranchFromNode с ensemble-узлом НЕ падает (store проброшен, empty-window skip)', async () => {
    const logs: string[] = [];
    const host = createStubScenarioRuntimeHost({
      log: (m, c) => logs.push(`${m}:${String((c as Record<string, unknown>)?.skipReason ?? '')}`),
    });
    const collectStore = new CollectRuntimeStore();
    const detection = await runEventBranchFromNode(
      ENSEMBLE_BRANCH,
      'e-ens',
      host,
      new AbortController().signal,
      {
        branch: 'main',
        defaultChunkDurationMs: 5000,
        functions: [],
        variableStore: new ScenarioVariableStore(),
        collectStore,
        analysisStore: new FftTrendAnalysisRuntimeStore(),
        fusionStore: new DetectionFusionRuntimeStore(),
        ensembleStore: new EnsembleAnalysisRuntimeStore(),
        proximityStore: new ProximityRuntimeStore(),
        resolveContext: {
          getCollectBatchRef: (nodeId) => collectStore.getLastBatchRef(nodeId),
        },
      },
      {},
      null,
    );
    expect(detection).toBeNull();
    expect(
      logs.some((l) => l.includes('empty-window')),
      `ensemble обязан отработать skip, got: ${JSON.stringify(logs)}`,
    ).toBe(true);
  });

  it('L31: ошибка latent-ветки логируется sequence-latent-then-error, не глотается', async () => {
    const logs: Array<{ m: string; err?: unknown }> = [];
    const host = createStubScenarioRuntimeHost({
      log: (m, c) => logs.push({ m, err: (c as Record<string, unknown>)?.error }),
    });
    // Sequence latent → ветка с ensemble-узлом, но ensembleStore НЕ передан → throw в ветке.
    const subgraph: ScenarioSubgraph = {
      entry: 'ev',
      nodes: [
        { id: 'ev', nodeKind: 'event', blockKind: 'custom', label: 'Tick', eventVariant: 'loopTick' },
        {
          id: 'seq',
          nodeKind: 'sequence',
          blockKind: 'custom',
          label: 'Seq',
          sequenceConfig: { thenCount: 1, latentThen: true },
        },
        { id: 'e-ens', nodeKind: 'make-ensemble-analysis', blockKind: 'custom', label: 'E' },
      ],
      edges: [
        { id: 'x0', kind: 'exec', source: 'ev', sourceHandle: 'exec-out', target: 'seq', targetHandle: 'exec-in' },
        { id: 'x1', kind: 'exec', source: 'seq', sourceHandle: 'then-0', target: 'e-ens', targetHandle: 'exec-in' },
      ],
    };
    await runSubgraphOnce(subgraph, host, new AbortController().signal, {
      branch: 'main',
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore: new ScenarioVariableStore(),
      collectStore: new CollectRuntimeStore(),
      // ensembleStore СОЗНАТЕЛЬНО не передан — воспроизводим смерть ветки.
      resolveContext: {},
    });
    await new Promise((r) => setTimeout(r, 10)); // дать latent-ветке завершиться
    const errorLog = logs.find((l) => l.m === 'sequence-latent-then-error');
    expect(errorLog, `ошибка ветки должна логироваться, got: ${JSON.stringify(logs.map((l) => l.m))}`).toBeDefined();
    expect(String(errorLog?.err)).toMatch(/ensembleStore/);
  });
});
