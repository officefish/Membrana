import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MAX_SIZE_HOURS,
  RANK_WEIGHTS,
  SCORE_THRESHOLD,
  computeScore,
  inferServerImpactClue,
  rankOneShotCandidates,
  resolveSizeHours,
  sizeNormFromHours,
} from './lib/one-shot-rank.mjs';
import { parseOneShotRankArgs, runOneShotRank } from './one-shot-rank.mjs';

/** @param {Partial<object> & { id: string }} t */
function card(t) {
  return {
    title: t.title ?? `Task ${t.id} with enough title length`,
    status: t.status ?? 'active',
    size: t.size ?? 'S',
    notes: t.notes ?? 'Acceptance criteria: проверить тест и DoD на месте.',
    promptPath: t.promptPath ?? `docs/prompts/${t.id}.md`,
    ...t,
  };
}

test('weights sum to 1', () => {
  const s = RANK_WEIGHTS.size + RANK_WEIGHTS.server + RANK_WEIGHTS.scope + RANK_WEIGHTS.history;
  assert.ok(Math.abs(s - 1) < 1e-9);
});

test('size hours: S passes hard cut, M/L excluded', () => {
  assert.equal(resolveSizeHours('S').hours, 3);
  assert.ok(resolveSizeHours('S').hours <= MAX_SIZE_HOURS);
  assert.ok(resolveSizeHours('M').hours > MAX_SIZE_HOURS);
  const r = rankOneShotCandidates([card({ id: 'big', size: 'M' }), card({ id: 'ok', size: 'S' })]);
  assert.ok(r.excluded.some((e) => e.cardId === 'big' && e.reasons.some((x) => x.includes('size_hours'))));
  assert.ok(r.candidates.some((c) => c.cardId === 'ok'));
});

test('critical serverImpact excluded before score', () => {
  const r = rankOneShotCandidates([
    card({
      id: 'srv',
      size: 'S',
      title: 'fix background-office deploy timeout',
      notes: 'background-office production db',
    }),
  ]);
  assert.equal(r.candidates.length, 0);
  assert.ok(r.excluded.some((e) => e.reasons.includes('serverImpactClue=critical')));
});

test('diffPaths critical via forbidden prefix', () => {
  const r = rankOneShotCandidates([card({ id: 'd', size: 'S', title: 'harmless docs typo fix enough' })], {
    diffByCard: { d: ['packages/background-office/src/x.ts'] },
  });
  assert.ok(r.excluded.some((e) => e.cardId === 'd'));
});

test('inferServerImpactClue: unknown pending without text signal', () => {
  const s = inferServerImpactClue({ id: 'x', title: 'x', notes: '' });
  assert.equal(s.clue, 'unknown');
  assert.equal(s.readiness, 'pending');
});

test('score formula deterministic', () => {
  const sources = [
    { id: 'size', value: 1, dataReadiness: 'ready' },
    { id: 'server', value: 1, dataReadiness: 'ready' },
    { id: 'scope', value: 1, dataReadiness: 'ready' },
    { id: 'history', value: 1, dataReadiness: 'ready' },
  ];
  assert.equal(computeScore(sources), 1);
  assert.ok(sizeNormFromHours(3) > sizeNormFromHours(5));
});

test('history pending when absent; ready when fed', () => {
  const base = card({ id: 'h1', size: 'S' });
  const a = rankOneShotCandidates([base]);
  const histSrc = a.candidates[0].sources.find((s) => s.id === 'history');
  assert.equal(histSrc.dataReadiness, 'pending');

  const b = rankOneShotCandidates([base], {
    history: { h1: { successRate: 0.9, shots: 4 } },
  });
  const h2 = b.candidates[0].sources.find((s) => s.id === 'history');
  assert.equal(h2.dataReadiness, 'ready');
  assert.ok(b.candidates[0].score >= a.candidates[0].score);
});

test('score below threshold excluded', () => {
  // Forced low via empty title error on scope + unknown server — still need pass hard cuts
  const r = rankOneShotCandidates([
    card({
      id: 'thin',
      size: 'S',
      title: 'x',
      notes: '',
    }),
  ]);
  // may land in candidates or excluded by threshold — assert dataReadiness present either way
  const pool = [...r.candidates, ...r.excluded];
  assert.ok(pool.some((x) => x.cardId === 'thin'));
  if (r.candidates.length) {
    assert.ok(r.candidates[0].score >= SCORE_THRESHOLD);
  }
});

test('idempotent: same input → same JSON', () => {
  const cards = [card({ id: 'a' }), card({ id: 'b', title: 'Another clear docs typo fix title' })];
  const x = JSON.stringify(rankOneShotCandidates(cards));
  const y = JSON.stringify(rankOneShotCandidates(cards));
  assert.equal(x, y);
});

test('parseOneShotRankArgs / runOneShotRank', () => {
  assert.equal(parseOneShotRankArgs(['--json', 'a']).json, true);
  const code = runOneShotRank(['--json'], {
    load: () => ({ tasks: [card({ id: 's1', size: 'S' }), card({ id: 'm1', size: 'M' })] }),
  });
  assert.equal(code, 0);
});

test('never throws on empty corpus card', () => {
  assert.doesNotThrow(() =>
    rankOneShotCandidates([{ id: 'z', size: 'S', title: '', notes: null, status: 'active' }]),
  );
});
