import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { rankOneShotCandidates } from './lib/one-shot-rank.mjs';
import {
  SCORE_LEVEL_STEP,
  applyOneShotPenalty,
  applyTrailScorePenalty,
  buildTrailBrief,
  checkShotHistory,
  forecastHolds,
  loadShotHistory,
  parseDiffShortstat,
  parseTrailLine,
  pathsAdjacentByFolderLcp,
  planRecordOneShot,
  recordOneShot,
} from './lib/one-shot-trail.mjs';
import { parseOneShotTrailArgs, runOneShotTrail } from './one-shot-trail.mjs';

test('pathsAdjacentByFolderLcp: LCP folders ≥ 2', () => {
  assert.equal(
    pathsAdjacentByFolderLcp('docs/procedures/device-board/a.md', 'docs/procedures/angelina/b.md'),
    true,
  );
  assert.equal(pathsAdjacentByFolderLcp('docs/tasks/a.md', 'docs/prompts/b.md'), false);
  assert.equal(pathsAdjacentByFolderLcp('docs/a.md', 'docs/b.md'), false);
});

test('applyOneShotPenalty: −1 when shotCount≥1, floor 0', () => {
  assert.equal(applyOneShotPenalty(3, 0), 3);
  assert.equal(applyOneShotPenalty(3, 1), 2);
  assert.equal(applyOneShotPenalty(0, 5), 0);
  assert.equal(applyOneShotPenalty(1, 2), 0);
});

test('applyTrailScorePenalty + risk-override', () => {
  const base = SCORE_LEVEL_STEP * 4;
  const pen = applyTrailScorePenalty(base, 2, false);
  assert.equal(pen.chained, true);
  assert.ok(Math.abs(pen.score - SCORE_LEVEL_STEP * 3) < 1e-9);

  const ov = applyTrailScorePenalty(base, 2, true);
  assert.equal(ov.overridden, true);
  assert.equal(ov.marker, '[risk-override]');
  assert.equal(ov.score, base);
});

test('loadShotHistory: window + adjacency', () => {
  const now = Date.parse('2026-07-24T12:00:00Z');
  const records = [
    {
      timestamp: '2026-07-20T10:00:00Z',
      path: 'docs/procedures/one-shot/a.md',
      slug: 'a',
      headRev: 'aaa',
      status: /** @type {'merged'} */ ('merged'),
    },
    {
      timestamp: '2026-07-10T10:00:00Z',
      path: 'docs/procedures/one-shot/old.md',
      slug: 'old',
      headRev: 'bbb',
      status: /** @type {'merged'} */ ('merged'),
    },
    {
      timestamp: '2026-07-22T10:00:00Z',
      path: 'docs/tasks/x.md',
      slug: 'x',
      headRev: 'ccc',
      status: /** @type {'cancelled'} */ ('cancelled'),
    },
  ];
  const hit = loadShotHistory(records, 'docs/procedures/one-shot/new.md', { now });
  assert.equal(hit.length, 1);
  assert.equal(hit[0].slug, 'a');
});

test('planRecordOneShot idempotent on path|slug|headRev', () => {
  const input = {
    path: 'docs/foo/bar.md',
    slug: 'fix',
    headRev: 'deadbeef',
    status: /** @type {'merged'} */ ('merged'),
  };
  const a = planRecordOneShot([], input, { now: new Date('2026-07-24T00:00:00Z') });
  assert.equal(a.appended, true);
  const b = planRecordOneShot(a.records, input);
  assert.equal(b.appended, false);
  assert.equal(b.records.length, 1);
});

test('checkShotHistory rejects bad JSON and decreasing timestamps', () => {
  const bad = checkShotHistory('{"timestamp":"2026-07-24T00:00:00Z"}\nnot-json\n');
  assert.equal(bad.ok, false);

  const order = checkShotHistory(
    [
      JSON.stringify({
        timestamp: '2026-07-24T02:00:00Z',
        path: 'docs/a/b.md',
        slug: 'x',
        headRev: '1',
        status: 'merged',
      }),
      JSON.stringify({
        timestamp: '2026-07-24T01:00:00Z',
        path: 'docs/a/c.md',
        slug: 'y',
        headRev: '2',
        status: 'merged',
      }),
    ].join('\n'),
  );
  assert.equal(order.ok, false);
  assert.ok(order.errors.some((e) => e.includes('non-decreasing')));
});

test('rankOneShotCandidates applies trail chain penalty', () => {
  const card = {
    id: 'tw-demo',
    title: 'Clear docs typo fix with enough title length',
    size: 'S',
    notes: 'Acceptance criteria: проверить тест и DoD на месте.',
    promptPath: 'docs/procedures/one-shot/fix.md',
  };
  const now = Date.parse('2026-07-24T12:00:00Z');
  const trail = [
    {
      timestamp: '2026-07-22T10:00:00Z',
      path: 'docs/procedures/one-shot/prev.md',
      slug: 'prev',
      headRev: 'abc',
      status: /** @type {'merged'} */ ('merged'),
    },
  ];
  // history: null — изолируем штраф цепочки от reputation feed из trail
  const plain = rankOneShotCandidates([card], { now, history: null });
  const chained = rankOneShotCandidates([card], {
    trailRecords: trail,
    now,
    history: null,
  });
  assert.ok(plain.candidates[0]);
  assert.ok(chained.candidates[0]);
  assert.equal(chained.candidates[0].shotChain, true);
  assert.ok(chained.candidates[0].score < plain.candidates[0].score);

  const overridden = rankOneShotCandidates([card], {
    trailRecords: trail,
    now,
    history: null,
    riskOverride: true,
  });
  assert.equal(overridden.candidates[0].riskOverride, true);
  assert.equal(overridden.candidates[0].score, plain.candidates[0].score);
  assert.ok(overridden.candidates[0].reasoning.includes('[risk-override]'));
});

test('recordOneShot writes once; CLI check OK', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tw-trail-'));
  mkdirSync(join(dir, 'docs', 'audit'), { recursive: true });
  writeFileSync(join(dir, 'docs', 'audit', 'one-shot-trail.jsonl'), '# header\n', 'utf8');

  const r1 = recordOneShot(dir, {
    path: 'docs/procedures/x/a.md',
    slug: 'a',
    headRev: '111',
    status: 'merged',
    timestamp: '2026-07-24T01:00:00.000Z',
  });
  assert.equal(r1.appended, true);
  const r2 = recordOneShot(dir, {
    path: 'docs/procedures/x/a.md',
    slug: 'a',
    headRev: '111',
    status: 'merged',
  });
  assert.equal(r2.appended, false);

  const code = runOneShotTrail(['check'], { cwd: dir });
  assert.equal(code, 0);
  assert.ok(readFileSync(r1.path, 'utf8').includes('"slug":"a"'));
});

test('parseTrailLine: старые записи валидны, новые поля читаются, кривая форма — нет', () => {
  const legacy = parseTrailLine(
    '{"timestamp":"2026-08-01T00:00:00Z","path":"docs/a/b.md","slug":"x","headRev":"1","status":"merged"}',
  );
  assert.ok(legacy);
  assert.equal(legacy.executor, undefined);
  assert.equal(legacy.forecast, undefined);

  const rich = parseTrailLine(
    JSON.stringify({
      timestamp: '2026-08-01T00:00:00Z',
      path: 'docs/a/b.md',
      slug: 'x',
      headRev: '1',
      status: 'open',
      executor: 'dynin',
      forecast: { files: 2, lines: 70 },
    }),
  );
  assert.ok(rich);
  assert.equal(rich.status, 'open');
  assert.equal(rich.executor, 'dynin');
  assert.deepEqual(rich.forecast, { files: 2, lines: 70 });

  // кривой forecast — запись невалидна, check краснеет, а не молчит
  const broken = parseTrailLine(
    '{"timestamp":"2026-08-01T00:00:00Z","path":"docs/a/b.md","headRev":"1","status":"merged","forecast":{"files":-1}}',
  );
  assert.equal(broken, null);
});

test('checkShotHistory: живой формат с новыми полями идемпотентен по path|slug|headRev', () => {
  const rec = {
    timestamp: '2026-08-01T00:00:00Z',
    path: 'docs/a/b.md',
    slug: 'x',
    headRev: '1',
    status: /** @type {'merged'} */ ('merged'),
    executor: 'dynin',
    forecast: { files: 2, lines: 70 },
    actual: { files: 2, lines: 64 },
  };
  const a = planRecordOneShot([], rec);
  assert.equal(a.appended, true);
  // повтор с другими объёмами, но тем же ключом — скип, не дубль
  const b = planRecordOneShot(a.records, { ...rec, actual: { files: 9, lines: 999 } });
  assert.equal(b.appended, false);
  const text = a.records.map((r) => JSON.stringify(r)).join('\n');
  assert.equal(checkShotHistory(text).ok, true);
});

test('parseDiffShortstat: варианты git и пустота', () => {
  assert.deepEqual(parseDiffShortstat(' 3 files changed, 120 insertions(+), 30 deletions(-)'), {
    files: 3,
    lines: 150,
  });
  assert.deepEqual(parseDiffShortstat('1 file changed, 2 insertions(+)'), { files: 1, lines: 2 });
  assert.deepEqual(parseDiffShortstat('2 files changed, 5 deletions(-)'), { files: 2, lines: 5 });
  assert.equal(parseDiffShortstat(''), null);
  assert.equal(parseDiffShortstat('fatal: bad revision'), null);
});

test('forecastHolds: да/нет, отсутствие любого из двух — null, не false', () => {
  assert.equal(forecastHolds({ files: 3, lines: 100 }, { files: 3, lines: 100 }), true);
  assert.equal(forecastHolds({ files: 3, lines: 100 }, { files: 4, lines: 50 }), false);
  assert.equal(forecastHolds({ files: 3, lines: 100 }, { files: 2, lines: 101 }), false);
  assert.equal(forecastHolds({ files: 3, lines: 100 }, undefined), null);
  assert.equal(forecastHolds(undefined, { files: 1, lines: 1 }), null);
});

test('buildTrailBrief: 5 строк сетки Тарасова, open→merged — один шот', () => {
  const now = Date.parse('2026-08-10T12:00:00Z');
  const records = [
    // вне окна — только в «лента всего» и покрытие
    { timestamp: '2026-07-20T10:00:00Z', path: 'docs/old/x.md', slug: 'old', headRev: 'o', status: 'merged' },
    // open, позже закрыт merged той же парой path|slug — один шот, статус merged
    {
      timestamp: '2026-08-08T10:00:00Z',
      path: 'scripts/lib/a.mjs',
      slug: 'pair',
      headRev: 'stamp1',
      status: 'open',
      executor: 'dynin',
      forecast: { files: 2, lines: 70 },
    },
    {
      timestamp: '2026-08-09T10:00:00Z',
      path: 'scripts/lib/a.mjs',
      slug: 'pair',
      headRev: 'merge1',
      status: 'merged',
      actual: { files: 2, lines: 64 },
    },
    // незакрытый open — in-flight
    {
      timestamp: '2026-08-09T11:00:00Z',
      path: 'scripts/lib/b.mjs',
      slug: 'flying',
      headRev: 'stamp2',
      status: 'open',
      executor: 'tarasov',
      forecast: { files: 1, lines: 30 },
    },
    // merged без новых полей — «без executor», форкаста нет
    { timestamp: '2026-08-09T12:00:00Z', path: 'docs/tasks/c.md', slug: 'bare', headRev: 'm2', status: 'merged' },
    // merged с форкастом и фактом, факт превысил — не держится
    {
      timestamp: '2026-08-10T09:00:00Z',
      path: 'scripts/lib/d.mjs',
      slug: 'burst',
      headRev: 'm3',
      status: 'merged',
      executor: 'dynin',
      forecast: { files: 1, lines: 40 },
      actual: { files: 3, lines: 90 },
    },
  ];
  const lines = buildTrailBrief(records, { now });
  assert.equal(lines.length, 5);
  assert.equal(lines[0], 'шоты 7д: 4 (merged 3 · cancelled 0 · in-flight 1) · лента всего 6');
  assert.equal(lines[1], 'зоны 7д: 2 — scripts/lib (3) · docs/tasks (1)');
  assert.equal(lines[2], 'исполнители 7д: dynin (2) · tarasov (1) · без executor 1');
  // форкасты: заявлено у 3 шотов из 4; факт есть у 2 из 3; держится 1 из 2
  assert.equal(lines[3], 'форкасты 7д: с форкастом 3/4 · факт есть 2/3 · держатся 1/2');
  assert.equal(lines[4], 'покрытие ленты: executor 3/6 · forecast 3/6 · actual 2/6');
});

test('buildTrailBrief: тощий портфель — те же 5 строк с нулями, не молчание', () => {
  const lines = buildTrailBrief([], { now: Date.parse('2026-08-10T12:00:00Z') });
  assert.equal(lines.length, 5);
  assert.equal(lines[0], 'шоты 7д: 0 (merged 0 · cancelled 0 · in-flight 0) · лента всего 0');
  assert.equal(lines[1], 'зоны 7д: 0');
  assert.equal(lines[2], 'исполнители 7д: — · без executor 0');
  assert.equal(lines[3], 'форкасты 7д: с форкастом 0/0 · факт есть 0/0 · держатся 0/0');
  assert.equal(lines[4], 'покрытие ленты: executor 0/0 · forecast 0/0 · actual 0/0');
});

test('CLI record: факт из диффа мерджа; сбой git → actual отсутствует, не ноль', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tw-trail-fact-'));
  mkdirSync(join(dir, 'docs', 'audit'), { recursive: true });
  writeFileSync(join(dir, 'docs', 'audit', 'one-shot-trail.jsonl'), '# header\n', 'utf8');

  const okCode = runOneShotTrail(
    ['record', '--path', 'scripts/lib/a.mjs', '--head-rev', 'm1', '--slug', 's', '--executor', 'dynin', '--forecast-files', '2', '--forecast-lines', '70', '--merge', 'm1'],
    { cwd: dir, gitShortstat: () => ' 2 files changed, 50 insertions(+), 14 deletions(-)' },
  );
  assert.equal(okCode, 0);

  const failCode = runOneShotTrail(
    ['record', '--path', 'scripts/lib/b.mjs', '--head-rev', 'm2', '--slug', 's2', '--merge', 'm2'],
    { cwd: dir, gitShortstat: () => null },
  );
  assert.equal(failCode, 0);

  const text = readFileSync(join(dir, 'docs', 'audit', 'one-shot-trail.jsonl'), 'utf8');
  const [rich, bare] = text
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => JSON.parse(l));
  assert.deepEqual(rich.actual, { files: 2, lines: 64 });
  assert.deepEqual(rich.forecast, { files: 2, lines: 70 });
  assert.equal(rich.executor, 'dynin');
  assert.ok(!('actual' in bare));

  assert.equal(runOneShotTrail(['check'], { cwd: dir }), 0);
});

test('CLI record: границы флагов — форкаст парой, --merge только при merged', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tw-trail-flags-'));
  const half = runOneShotTrail(
    ['record', '--path', 'a.md', '--head-rev', '1', '--forecast-files', '2'],
    { cwd: dir },
  );
  assert.equal(half, 2);
  const openMerge = runOneShotTrail(
    ['record', '--path', 'a.md', '--head-rev', '1', '--status', 'open', '--merge', 'sha'],
    { cwd: dir },
  );
  assert.equal(openMerge, 2);
});

test('parseOneShotTrailArgs', () => {
  const a = parseOneShotTrailArgs([
    'record',
    '--path',
    'docs/x.md',
    '--head-rev',
    'abc',
    '--slug',
    's',
  ]);
  assert.equal(a.cmd, 'record');
  assert.equal(a.path, 'docs/x.md');
  assert.equal(a.headRev, 'abc');
});
