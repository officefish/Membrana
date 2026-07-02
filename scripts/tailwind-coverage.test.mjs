import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findMissingCoverage,
  readmeTailwindContent,
  requiredContentForApp,
  scanMembranaPackages,
  toAppRelativeGlob,
  TAILWIND_APPS,
} from './lib/tailwind-coverage.mjs';

test('readmeTailwindContent parses the frontmatter block', () => {
  assert.deepEqual(readmeTailwindContent('packages/device-board'), ['./src/**/*.{ts,tsx}']);
  // A package with no README frontmatter → null
  assert.equal(readmeTailwindContent('packages/core'), null);
});

test('toAppRelativeGlob maps a package glob to an app-relative POSIX path', () => {
  assert.equal(
    toAppRelativeGlob('apps/cabinet', 'packages/device-board', './src/**/*.{ts,tsx}'),
    '../../packages/device-board/src/**/*.{ts,tsx}',
  );
});

test('requiredContentForApp derives non-empty globs from transitive UI deps', () => {
  const pkgMap = scanMembranaPackages();
  const cabinet = requiredContentForApp('apps/cabinet', pkgMap);
  assert.ok(cabinet.length > 0, 'cabinet must require at least one UI package');
  assert.ok(
    cabinet.includes('../../packages/device-board/src/**/*.{ts,tsx}'),
    'cabinet renders device-board → must scan it',
  );
});

// The CI gate: every app's tailwind.config must cover its transitive UI deps, or a
// board/minimap renders unstyled in that app (the cabinet regression this epic fixed).
test('all apps fully cover their UI packages in tailwind content', () => {
  const report = findMissingCoverage();
  for (const app of TAILWIND_APPS) {
    assert.deepEqual(
      report[app],
      [],
      `${app} is missing tailwind content globs (run \`yarn tailwind:configs:fix\`): ${report[app].join(', ')}`,
    );
  }
});
