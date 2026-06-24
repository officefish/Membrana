import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RECORDING_WINDOW_SEC_PRESETS,
  SCENARIO_CAPTURE_FORMATS,
  resolveScenarioRecordingPolicy,
} from '@membrana/core';
import { describe, expect, it } from 'vitest';

import { parseBranchScenarioExportJson } from './import-branch-scenario.js';
import { formatRecordingPolicyBadge } from './recording-policy-ui.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const v08ScenarioPath = join(
  repoRoot,
  'docs/device-board-scripts/device-scenario-microphone-main-v08-policy-constructor.json',
);

/** Автоматическая часть A4 smoke matrix (6 windowSec × 3 captureFormat). */
const SMOKE_MATRIX = RECORDING_WINDOW_SEC_PRESETS.flatMap((windowSec) =>
  SCENARIO_CAPTURE_FORMATS.map((captureFormat) => ({ windowSec, captureFormat })),
);

describe('recording parity smoke matrix (A4)', () => {
  it('covers 6×3 = 18 preset×format combinations', () => {
    expect(SMOKE_MATRIX.length).toBe(18);
    expect(RECORDING_WINDOW_SEC_PRESETS).toEqual([3, 5, 7, 10, 15, 30]);
    expect(SCENARIO_CAPTURE_FORMATS).toEqual(['wav', 'webm', 'mp4']);
  });

  it.each(SMOKE_MATRIX)('resolves policy windowSec=$windowSec captureFormat=$captureFormat', ({
    windowSec,
    captureFormat,
  }) => {
    const policy = resolveScenarioRecordingPolicy({ windowSec, captureFormat });
    expect(policy.windowSec).toBe(windowSec);
    expect(policy.captureFormat).toBe(captureFormat);
    expect(formatRecordingPolicyBadge(policy)).toBe(`${windowSec}s · ${captureFormat.toUpperCase()}`);
  });

  it('v08 constructor scenario JSON imports with MakeRecordingPolicy wired', () => {
    const parsed = parseBranchScenarioExportJson(readFileSync(v08ScenarioPath, 'utf8'));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    const policyNode = parsed.export.subgraph.nodes.find((n) => n.nodeKind === 'make-recording-policy');
    expect(policyNode).toBeDefined();
    expect(parsed.export.subgraph.nodes.some((n) => n.nodeKind === 'start-recording')).toBe(true);
    expect(
      parsed.export.subgraph.nodes.some((n) => n.id === 'node-start-recording-bootstrap-v08-2'),
    ).toBe(false);
    expect(
      parsed.export.subgraph.edges.some(
        (e) =>
          e.source === 'node-get-recorder-mqmo3mba-31' &&
          e.target === 'node-is-recording-window-full-mqmo40ie-32' &&
          e.kind === 'exec',
      ),
    ).toBe(true);
    expect(
      parsed.export.subgraph.edges.some(
        (e) =>
          e.source === policyNode?.id &&
          e.targetHandle === 'policy' &&
          e.dataType === 'RecordingPolicy',
      ),
    ).toBe(true);
    const vars = parsed.export.variables ?? [];
    expect(vars.some((v) => v.type === 'RecordingPolicy')).toBe(false);
  });
});
