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
  checkShotHistory,
  loadShotHistory,
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
