import assert from 'node:assert/strict';
import test from 'node:test';

import { formatSetupReport, selectTestSetup } from './lib/tests-container.mjs';

const repoRoot = process.cwd();

test('smoke — выборочный набор с честным not run отчетом', () => {
  const plan = selectTestSetup({ repoRoot, setup: 'smoke' });
  assert.ok(plan.run.length > 0);
  assert.ok(plan.notRun.length > 0, 'smoke обязан назвать непокрытую часть full-набора');
  const report = formatSetupReport(plan);
  assert.match(report, /not run=/u);
  assert.match(report, /not run:/u);
});

test('gate включает smoke и тесты, зависящие от измененного файла', () => {
  const plan = selectTestSetup({
    repoRoot,
    setup: 'gate',
    changedFiles: ['scripts/lib/test-scripts-plan.mjs'],
  });
  assert.ok(plan.run.includes('scripts/test-list-coverage.test.mjs'));
  assert.ok(plan.run.includes('scripts/lib/test-scripts-plan.test.mjs'));
  assert.ok(plan.notRun.length > 0);
});

test('full — весь набор без not run', () => {
  const plan = selectTestSetup({ repoRoot, setup: 'full' });
  assert.equal(plan.notRun.length, 0);
  assert.equal(plan.run.length, plan.total);
});
