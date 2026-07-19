import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  NON_CRITICAL_EVENING_STEPS,
  ageDays,
  assertReviewInputFresh,
  dateOf,
  isAcceptableReviewAge,
  isFresh,
} from './lib/artifact-freshness.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function sample(stamp) {
  return `<!-- Сгенерировано: ${stamp}T20:00:00.000Z (yarn code-review) -->\n\n# Review\n`;
}

test('dateOf читает штамп фронтматтера, не выдумывает', () => {
  assert.equal(dateOf(sample('2026-07-18')), '2026-07-18');
  assert.equal(dateOf('# без штампа\n'), null);
});

test('isFresh: сегодня true, вчера false (инъекция today)', () => {
  assert.equal(isFresh(sample('2026-07-19'), '2026-07-19'), true);
  assert.equal(isFresh(sample('2026-07-18'), '2026-07-19'), false);
});

test('isAcceptableReviewAge: сегодня и вчера ок; старше — нет', () => {
  assert.equal(isAcceptableReviewAge(sample('2026-07-19'), '2026-07-19'), true);
  assert.equal(isAcceptableReviewAge(sample('2026-07-18'), '2026-07-19'), true);
  assert.equal(isAcceptableReviewAge(sample('2026-07-17'), '2026-07-19'), false);
});

test('ageDays / assertReviewInputFresh: устарел на N дн.', () => {
  assert.equal(ageDays(sample('2026-07-17'), '2026-07-19'), 2);
  assert.throws(
    () => assertReviewInputFresh(sample('2026-07-17'), { today: '2026-07-19', label: 'docs/DAILY_CODE_REVIEW.md' }),
    (err) => {
      assert.match(String(err.message), /устарел на 2 дн/);
      assert.equal(err.exitCode, 2);
      return true;
    },
  );
  assert.doesNotThrow(() =>
    assertReviewInputFresh(sample('2026-07-18'), { today: '2026-07-19', label: 'docs/DAILY_CODE_REVIEW.md' }),
  );
});

test('ritual:evening — code-review не под || true; soft-fail только NON_CRITICAL', () => {
  const chain = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')).scripts['ritual:evening'];
  assert.ok(chain, 'ritual:evening отсутствует');
  const steps = chain.split(/\s*&&\s*/);
  const reviewStep = steps.find((s) => s.includes('code-review.mjs'));
  assert.ok(reviewStep, 'code-review.mjs нет в ritual:evening');
  assert.doesNotMatch(
    reviewStep,
    /\|\|\s*true/u,
    'code-review под || true — RT-9 нарушен (критичный сбой молчит)',
  );
  for (const step of steps) {
    if (!/\|\|\s*true/u.test(step)) continue;
    const allowed = NON_CRITICAL_EVENING_STEPS.some((id) => step.includes(id));
    assert.ok(allowed, `soft-fail вне NON_CRITICAL_EVENING_STEPS: ${step}`);
  }
});
