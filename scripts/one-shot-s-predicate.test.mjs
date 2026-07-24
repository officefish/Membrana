/**
 * Границы предиката S-ности one shot (#1022).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ONE_SHOT_S_DEFAULTS,
  evaluateOneShotS,
  isForbiddenServerPath,
  pathFamily,
  pathsAreAdjacent,
} from './lib/one-shot-s-predicate.mjs';

const NOW = 1_700_000_000_000;

test('пустой дифф → ok=false, empty_diff', () => {
  const r = evaluateOneShotS({ diff: { paths: [], linesChanged: 0 }, now: NOW });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.includes('empty_diff'));
});

test('только серверные пути → touches_server', () => {
  const r = evaluateOneShotS({
    diff: {
      paths: ['packages/background-office/src/app.ts', 'deploy/office-stack.sh'],
      linesChanged: 40,
    },
    now: NOW,
  });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.includes('touches_server'));
  assert.equal(r.details.serverPaths.length, 2);
});

test('смешанный дифф (репо + сервер) → touches_server', () => {
  const r = evaluateOneShotS({
    diff: {
      paths: ['docs/procedures/one-shot/README.md', 'packages/background-media/src/x.ts'],
      linesChanged: 30,
    },
    now: NOW,
  });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.includes('touches_server'));
  assert.deepEqual(r.details.serverPaths, ['packages/background-media/src/x.ts']);
});

test('на пороге размера (maxFiles / maxLines) → ok', () => {
  const paths = Array.from({ length: ONE_SHOT_S_DEFAULTS.maxFiles }, (_, i) => `docs/a/f${i}.md`);
  const r = evaluateOneShotS({
    diff: { paths, linesChanged: ONE_SHOT_S_DEFAULTS.maxLines },
    now: NOW,
  });
  assert.equal(r.ok, true);
  assert.ok(r.reasons.includes('within_file_limit'));
  assert.ok(r.reasons.includes('chain_clear'));
});

test('сверх порога файлов → exceeds_file_count', () => {
  const paths = Array.from({ length: ONE_SHOT_S_DEFAULTS.maxFiles + 1 }, (_, i) => `scripts/x${i}.mjs`);
  const r = evaluateOneShotS({ diff: { paths, linesChanged: 10 }, now: NOW });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.includes('exceeds_file_count'));
});

test('сверх порога строк → exceeds_line_count', () => {
  const r = evaluateOneShotS({
    diff: { paths: ['scripts/lib/one-shot-s-predicate.mjs'], linesChanged: ONE_SHOT_S_DEFAULTS.maxLines + 1 },
    now: NOW,
  });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.includes('exceeds_line_count'));
});

test('prisma migrations — запретный путь', () => {
  assert.equal(isForbiddenServerPath('packages/background-cabinet/prisma/migrations/001/migration.sql'), true);
  const r = evaluateOneShotS({
    diff: {
      paths: ['packages/background-cabinet/prisma/migrations/001/migration.sql'],
      linesChanged: 5,
    },
    now: NOW,
  });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.includes('touches_server'));
});

test('цепочка смежных one shotов → capability_chaining', () => {
  const current = {
    paths: ['scripts/lib/a.mjs', 'scripts/lib/b.mjs'],
    linesChanged: 40,
  };
  const recent = [
    { paths: ['scripts/lib/c.mjs'], linesChanged: 40, at: NOW - 60_000 },
    { paths: ['scripts/lib/d.mjs'], linesChanged: 40, at: NOW - 120_000 },
    { paths: ['scripts/lib/e.mjs'], linesChanged: 40, at: NOW - 180_000 },
  ];
  const r = evaluateOneShotS({ diff: current, recentShots: recent, now: NOW });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.includes('capability_chaining'));
  assert.ok(r.details.chainShots > ONE_SHOT_S_DEFAULTS.chainMaxShots);
});

test('цепочка по сумме строк смежных → capability_chaining', () => {
  const r = evaluateOneShotS({
    diff: { paths: ['docs/procedures/x/README.md'], linesChanged: 100 },
    recentShots: [
      { paths: ['docs/procedures/y/README.md'], linesChanged: 100, at: NOW - 1000 },
      { paths: ['docs/procedures/z/README.md'], linesChanged: 50, at: NOW - 2000 },
    ],
    now: NOW,
  });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.includes('capability_chaining'));
  assert.ok(r.details.chainLines > ONE_SHOT_S_DEFAULTS.chainMaxLines);
});

test('выстрелы вне окна / чужие семейства путей не копят цепочку', () => {
  const r = evaluateOneShotS({
    diff: { paths: ['scripts/lib/fresh.mjs'], linesChanged: 20 },
    recentShots: [
      { paths: ['scripts/lib/old.mjs'], linesChanged: 200, at: NOW - ONE_SHOT_S_DEFAULTS.chainWindowMs - 1 },
      { paths: ['apps/client/src/App.tsx'], linesChanged: 200, at: NOW - 1000 },
    ],
    now: NOW,
  });
  assert.equal(r.ok, true);
  assert.equal(r.details.chainShots, 1);
});

test('pathFamily / adjacency — вспомогательные границы', () => {
  assert.equal(pathFamily('packages/services/fft-analyzer/src/a.ts'), 'packages/services/fft-analyzer');
  assert.equal(pathFamily('scripts/lib/x.mjs'), 'scripts/lib');
  assert.equal(pathsAreAdjacent(['scripts/lib/a.mjs'], ['scripts/lib/b.mjs']), true);
  assert.equal(pathsAreAdjacent(['scripts/lib/a.mjs'], ['docs/a.md']), false);
});
