import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FFT_TRENDS_INTERVAL_MS_PRESETS,
  FFT_TRENDS_MEASUREMENT_COUNT_PRESETS,
  resolveScenarioFftTrendsPolicy,
} from '@membrana/core';
import { describe, expect, it } from 'vitest';

import { parseBranchScenarioExportJson } from './import-branch-scenario.js';
import { formatFftTrendsPolicyBadge } from './fft-trends-policy-ui.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const v08ScenarioPath = join(
  repoRoot,
  'docs/device-board-scripts/device-scenario-microphone-main-v08-policy-constructor.json',
);

/** Автоматическая часть B3 smoke matrix (6 count × 5 interval presets). */
const SMOKE_MATRIX = FFT_TRENDS_MEASUREMENT_COUNT_PRESETS.flatMap((measurementsCount) =>
  FFT_TRENDS_INTERVAL_MS_PRESETS.map((intervalMs) => ({ measurementsCount, intervalMs })),
);

describe('trends FFT parity smoke matrix (B3)', () => {
  it('covers 6×5 = 30 count×interval combinations', () => {
    expect(SMOKE_MATRIX.length).toBe(30);
    expect(FFT_TRENDS_MEASUREMENT_COUNT_PRESETS).toEqual([5, 20, 50, 100, 180, 300]);
    expect(FFT_TRENDS_INTERVAL_MS_PRESETS).toEqual([50, 100, 200, 500, 1000]);
  });

  it.each(SMOKE_MATRIX)(
    'resolves policy measurementsCount=$measurementsCount intervalMs=$intervalMs',
    ({ measurementsCount, intervalMs }) => {
      const policy = resolveScenarioFftTrendsPolicy({ measurementsCount, intervalMs });
      expect(policy.measurementsCount).toBe(measurementsCount);
      expect(policy.intervalMs).toBe(intervalMs);
      expect(formatFftTrendsPolicyBadge(policy)).toContain(`${measurementsCount}×${intervalMs}ms`);
    },
  );

  it('v08 constructor scenario imports with MakeFftTrendsPolicy wired to analysis', () => {
    const parsed = parseBranchScenarioExportJson(readFileSync(v08ScenarioPath, 'utf8'));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    const policyNode = parsed.export.subgraph.nodes.find((n) => n.nodeKind === 'make-fft-trends-policy');
    const analysisNode = parsed.export.subgraph.nodes.find(
      (n) => n.nodeKind === 'make-fft-trends-analysis',
    );
    const reportNode = parsed.export.subgraph.nodes.find(
      (n) => n.nodeKind === 'make-report-from-analysis',
    );
    const publishNode = parsed.export.subgraph.nodes.find((n) => n.nodeKind === 'publish-report');
    expect(policyNode).toBeDefined();
    expect(analysisNode).toBeDefined();
    expect(reportNode).toBeDefined();
    expect(publishNode).toBeDefined();
    expect(
      parsed.export.subgraph.edges.some(
        (e) =>
          e.source === policyNode?.id &&
          e.target === analysisNode?.id &&
          e.targetHandle === 'policy' &&
          e.dataType === 'FftTrendsPolicy',
      ),
    ).toBe(true);
    const makeTrack = parsed.export.subgraph.nodes.find((n) => n.nodeKind === 'make-track');
    const restartRecording = parsed.export.subgraph.nodes.find(
      (n) => n.id === 'node-start-recording-mqv07-36',
    );
    expect(makeTrack).toBeDefined();
    expect(restartRecording).toBeDefined();
    expect(
      parsed.export.subgraph.edges.some(
        (e) =>
          e.kind === 'exec' &&
          e.source === makeTrack?.id &&
          e.target === restartRecording?.id,
      ),
    ).toBe(true);
    expect(
      parsed.export.subgraph.edges.some(
        (e) =>
          e.kind === 'exec' &&
          e.source === policyNode?.id,
      ),
    ).toBe(false);
    expect(
      parsed.export.subgraph.edges.some(
        (e) =>
          e.source === analysisNode?.id &&
          e.target === reportNode?.id &&
          e.dataType === 'FftTrendAnalysisRef',
      ),
    ).toBe(true);
    expect(
      parsed.export.subgraph.edges.some(
        (e) =>
          e.source === reportNode?.id &&
          e.target === publishNode?.id &&
          e.dataType === 'ReportRef',
      ),
    ).toBe(true);
    const vars = parsed.export.variables ?? [];
    expect(vars.some((v) => v.type === 'FftTrendsPolicy')).toBe(false);
  });
});
