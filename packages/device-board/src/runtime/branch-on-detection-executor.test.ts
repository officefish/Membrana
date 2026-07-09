import { describe, expect, it } from 'vitest';
import type { ScenarioSubgraph } from '@membrana/core';

import { executeScenarioBlock } from './block-executor.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { FftTrendAnalysisRuntimeStore } from './analysis-runtime-store.js';
import { DetectionFusionRuntimeStore } from './fusion-runtime-store.js';
import { ScenarioVariableStore } from './variable-store.js';
import {
  BRANCH_ON_DETECTION_DETECTED_HANDLE,
  BRANCH_ON_DETECTION_NOT_DETECTED_HANDLE,
  DEFAULT_DETECTION_THRESHOLD,
  clampDetectionThreshold,
} from '../graph/branch-on-detection-node.js';

/**
 * basn-3 (#323): executor BranchOnDetection — exec-ветвление по
 * combinedScore >= threshold. Матрица: выше/ниже/грань/invalid-вход/пустой fusion.
 */

/** Граф: make-detection-fusion → branch-on-detection (порт fusion). */
function buildBranchSubgraph(threshold?: number): ScenarioSubgraph {
  return {
    nodes: [
      { id: 'fusion-1', nodeKind: 'make-detection-fusion', blockKind: 'custom', label: 'Fusion' },
      {
        id: 'branch-1',
        nodeKind: 'branch-on-detection',
        blockKind: 'custom',
        label: 'Branch',
        ...(threshold !== undefined ? { detectionThreshold: threshold } : {}),
      },
    ],
    edges: [
      {
        id: 'd1',
        kind: 'data',
        source: 'fusion-1',
        sourceHandle: 'fusion',
        target: 'branch-1',
        targetHandle: 'fusion',
        dataType: 'DetectionFusion',
      },
    ],
  };
}

async function runBranch(options: {
  readonly fusion: { combinedScore: number; agreement: number; presentCount: number } | null;
  readonly threshold?: number;
  readonly wireFusion?: boolean;
}) {
  const host = createStubScenarioRuntimeHost({});
  const fusionStore = new DetectionFusionRuntimeStore();
  if (options.fusion !== null) {
    fusionStore.setNodeFusion('fusion-1', { kind: 'DetectionFusion', ...options.fusion });
  }
  const subgraph = buildBranchSubgraph(options.threshold);
  if (options.wireFusion === false) {
    subgraph.edges.length = 0;
  }
  const node = subgraph.nodes.find((n) => n.id === 'branch-1');
  if (node === undefined) throw new Error('branch node missing');

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
    analysisStore: new FftTrendAnalysisRuntimeStore(),
    fusionStore,
    resolveContext: {
      getDetectionFusionValue: (nodeId) => fusionStore.getFusionValue(nodeId),
    },
  });
  return result.execOutHandle;
}

describe('executeScenarioBlock branch-on-detection (basn-3)', () => {
  it('clampDetectionThreshold: NaN/undefined → 0.5, кламп в [0..1]', () => {
    expect(clampDetectionThreshold(undefined)).toBe(DEFAULT_DETECTION_THRESHOLD);
    expect(clampDetectionThreshold(Number.NaN)).toBe(DEFAULT_DETECTION_THRESHOLD);
    expect(clampDetectionThreshold(-1)).toBe(0);
    expect(clampDetectionThreshold(2)).toBe(1);
    expect(clampDetectionThreshold(0.7)).toBe(0.7);
  });

  it('score выше порога → detected', async () => {
    const out = await runBranch({
      fusion: { combinedScore: 0.8, agreement: 0.9, presentCount: 2 },
    });
    expect(out).toBe(BRANCH_ON_DETECTION_DETECTED_HANDLE);
  });

  it('score ниже порога → not-detected', async () => {
    const out = await runBranch({
      fusion: { combinedScore: 0.3, agreement: 0.9, presentCount: 2 },
    });
    expect(out).toBe(BRANCH_ON_DETECTION_NOT_DETECTED_HANDLE);
  });

  it('грань: score == threshold → detected (>=)', async () => {
    const out = await runBranch({
      fusion: { combinedScore: 0.5, agreement: 1, presentCount: 2 },
    });
    expect(out).toBe(BRANCH_ON_DETECTION_DETECTED_HANDLE);
  });

  it('кастомный порог с узла применяется', async () => {
    const out = await runBranch({
      fusion: { combinedScore: 0.6, agreement: 1, presentCount: 2 },
      threshold: 0.75,
    });
    expect(out).toBe(BRANCH_ON_DETECTION_NOT_DETECTED_HANDLE);
  });

  it('fusion без присутствующих источников (presentCount 0) → not-detected', async () => {
    const out = await runBranch({
      fusion: { combinedScore: 0, agreement: 1, presentCount: 0 },
      threshold: 0,
    });
    expect(out).toBe(BRANCH_ON_DETECTION_NOT_DETECTED_HANDLE);
  });

  it('неподключённый вход → not-detected, не throw', async () => {
    const out = await runBranch({ fusion: null, wireFusion: false });
    expect(out).toBe(BRANCH_ON_DETECTION_NOT_DETECTED_HANDLE);
  });
});
