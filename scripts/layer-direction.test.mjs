import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildImportGraph, checkLayerDirection, layerOf } from './lib/layer-direction.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RULES = JSON.parse(readFileSync(resolve(repoRoot, 'docs/procedures/layer-rules.json'), 'utf8'));

test('layerOf: ранги по файлу правил; вне слоёв — null', () => {
  assert.deepEqual(layerOf('docs/procedures/x/README.md', RULES), { rank: 0, name: 'процедура' });
  assert.deepEqual(layerOf('kits/attribution/manifest.json', RULES), { rank: 1, name: 'кит' });
  assert.deepEqual(layerOf('scripts/lib/foo.mjs', RULES), { rank: 2, name: 'скрипт' });
  assert.equal(layerOf('apps/client/src/x.ts', RULES), null);
});

test('checkLayerDirection: вниз и внутри слоя законно; вверх — нарушение с причиной', () => {
  const ok = checkLayerDirection(
    [
      { from: 'scripts/a.mjs', to: 'scripts/lib/b.mjs' },
      { from: 'kits/k/m.json', to: 'scripts/a.mjs' },
    ],
    RULES,
  );
  assert.deepEqual(ok.violations, []);

  const bad = checkLayerDirection(
    [{ from: 'scripts/a.mjs', to: 'docs/procedures/ritual-evening/MANIFEST.json' }],
    RULES,
  );
  assert.equal(bad.violations.length, 1);
  assert.match(bad.violations[0].reason, /обратное ребро/u);
});

test('рёбра вне объявленных слоёв не судятся (0 ложных тревог)', () => {
  const r = checkLayerDirection([{ from: 'apps/x.ts', to: 'packages/y.ts' }], RULES);
  assert.deepEqual(r.violations, []);
});

test('ЗУБ CI: живой граф scripts/ не содержит обратных рёбер', () => {
  const graph = buildImportGraph(repoRoot, ['scripts']);
  assert.ok(graph.length > 50, 'граф построился (инструментальная ошибка была бы throw)');
  const { violations } = checkLayerDirection(graph, RULES);
  assert.deepEqual(violations, [], violations.map((v) => `${v.from}→${v.to}`).join('; '));
});
