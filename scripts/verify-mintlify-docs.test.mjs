/**
 * Dual-mintlify path / nav invariants (W2 `dmd-w2-wires`).
 * Product verify must not require harness pages under apps/docs.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('atlas mintlify path is apps/docs-harness/tooling/containers.mdx', () => {
  const src = readFileSync(join(root, 'scripts', 'tooling-atlas.mjs'), 'utf8');
  assert.match(src, /['"]apps['"],\s*['"]docs-harness['"],\s*['"]tooling['"],\s*['"]containers\.mdx['"]/);
  assert.doesNotMatch(src, /join\(repoRoot,\s*['"]apps['"],\s*['"]docs['"],\s*['"]tooling['"]/);
  assert.ok(existsSync(join(root, 'apps', 'docs-harness', 'tooling', 'containers.mdx')));
  assert.equal(existsSync(join(root, 'apps', 'docs', 'tooling', 'containers.mdx')), false);
});

test('product docs.json has no harness tooling/bestiary pages', () => {
  const docsJson = JSON.parse(readFileSync(join(root, 'apps', 'docs', 'docs.json'), 'utf8'));
  const blob = JSON.stringify(docsJson.navigation ?? {});
  for (const banned of ['tooling/containers', 'bestiary/', 'llm-calls/', 'git/']) {
    assert.equal(blob.includes(banned), false, `product nav must not include ${banned}`);
  }
});

test('harness docs.json includes tooling/containers', () => {
  const docsJson = JSON.parse(readFileSync(join(root, 'apps', 'docs-harness', 'docs.json'), 'utf8'));
  const blob = JSON.stringify(docsJson.navigation ?? {});
  assert.match(blob, /tooling\/containers/);
});

test('yarn docs:verify:all exits 0 for both roots', () => {
  const r = spawnSync(process.execPath, [join(root, 'scripts', 'verify-mintlify-docs.mjs'), '--all'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /docs:verify\(apps\/docs\) — OK/);
  assert.match(r.stdout, /docs:verify\(apps\/docs-harness\) — OK/);
});
