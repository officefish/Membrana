import assert from 'node:assert/strict';
import test from 'node:test';

import { buildNightlyFullReport, renderNightlyFullMarkdown } from './lib/tests-nightly-full.mjs';

const repoRoot = process.cwd();
const HEAD = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

test('nightly full report uses tests-master pin and full setup with honest not-run section', () => {
  const report = buildNightlyFullReport({
    repoRoot,
    generatedAt: '2026-07-27T00:00:00.000Z',
    dryRun: true,
    revision: HEAD,
  });
  assert.equal(report.carrier.frame, 'night-report');
  assert.equal(report.git.revision, HEAD);
  assert.equal(report.kit.id, 'tests-master');
  assert.equal(report.setup.name, 'full');
  assert.equal(report.setup.notRun.length, 0);
  const md = renderNightlyFullMarkdown(report);
  assert.match(md, new RegExp(`Revision: ${HEAD}`, 'u'));
  assert.match(md, /What Did Not Run/u);
  assert.match(md, /0 files/u);
});
