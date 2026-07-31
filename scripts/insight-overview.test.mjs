import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const insightCli = join(here, 'insight.mjs');

test('overview lists legacy artifact records when lifecycle store is empty', () => {
  const root = mkdtempSync(join(tmpdir(), 'insight-overview-empty-'));
  try {
    mkdirSync(join(root, 'docs/insights'), { recursive: true });
    writeFileSync(
      join(root, 'docs/insights/registry.json'),
      JSON.stringify({
        version: 1,
        insights: [
          {
            id: 'insight-alpha',
            title: 'Alpha idea',
            status: 'adopted',
            weight: 7.2,
            createdAt: '2026-07-30',
            sprintPhase: 'alpha-sprint',
          },
          {
            id: 'insight-beta',
            title: 'Beta idea',
            status: 'draft',
            createdAt: '2026-07-30',
          },
        ],
      }),
      'utf8',
    );

    const out = execFileSync(process.execPath, [insightCli, 'overview', '--json'], {
      cwd: root,
      encoding: 'utf8',
    });
    const report = JSON.parse(out);
    assert.equal(report.ok, true);
    assert.equal(report.counts.insights, 2);
    assert.equal(report.insights[0].visibilityGroup, 'unclassified');
    assert.equal(report.insights[0].D[0].kind, 'None');
    assert.equal(report.insights[0].L[0].kind, 'None');
    assert.equal(report.insights[0].O[0].kind, 'None');
    assert.equal(report.insights[0].V[0].kind, 'None');
    assert.equal(report.insights[0].artifactHint.status, 'adopted');
    assert.equal(report.objectiveCandidate, null);
    assert.equal(report.artifactFallback.count, 2);
    assert.ok(report.diagnostics.some((item) => item.code === 'LIFECYCLE_EMPTY_ARTIFACTS_PRESENT'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
