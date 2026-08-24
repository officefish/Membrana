/**
 * Порча-тесты предиката #2107: протокол фидбека засчитан только с полным readAt.
 *
 * Предикат чистый (без ФС/часов/сети) — проверяем порчей каждого рода:
 * убрать вход → красный; подменить отпечаток → красный; вчерашняя версия → красный;
 * файл отсутствовал при генерации → красный; всё на месте → зелёный.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  EVENING_REQUIRED_KEYS,
  eveningFeedbackInputs,
  parseEveningFeedbackGuard,
  validateEveningFeedbackReadAt,
} from './lib/team-evening-feedback-ritual.mjs';

const rec = (v, d) => ({ version: v, digest: d });

function greenPair() {
  const readAt = {};
  const current = {};
  for (const key of EVENING_REQUIRED_KEYS) {
    readAt[key] = rec(`sha-${key}`, `digest-${key}`);
    current[key] = rec(`sha-${key}`, `digest-${key}`);
  }
  return { readAt, current };
}

test('всё на месте → зелёный', () => {
  const { readAt, current } = greenPair();
  const r = validateEveningFeedbackReadAt({ readAt, current });
  assert.equal(r.ok, true);
  assert.deepEqual(r.failures, []);
});

test('порча: убрать один вход из readAt → красный', () => {
  const { readAt, current } = greenPair();
  delete readAt.DAY_MEMO;
  const r = validateEveningFeedbackReadAt({ readAt, current });
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => f.startsWith('DAY_MEMO:')));
});

test('порча: подменить отпечаток → красный', () => {
  const { readAt, current } = greenPair();
  readAt.DAILY_AUDIT = rec(readAt.DAILY_AUDIT.version, 'digest-forged');
  const r = validateEveningFeedbackReadAt({ readAt, current });
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => f.includes('DAILY_AUDIT') && f.includes('отпечаток')));
});

test('порча: подсунуть вчерашний вход → красный по версии', () => {
  const { readAt, current } = greenPair();
  // содержимое совпало (digest тот же), но git-версия другая — вход другого дня
  readAt.DAILY_CODE_REVIEW = rec('sha-yesterday', readAt.DAILY_CODE_REVIEW.digest);
  const r = validateEveningFeedbackReadAt({ readAt, current });
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => f.includes('DAILY_CODE_REVIEW') && f.includes('версия')));
});

test('файл отсутствовал при генерации (digest=null) → красный', () => {
  const { readAt, current } = greenPair();
  readAt.DAY_MEMO = rec(null, null);
  const r = validateEveningFeedbackReadAt({ readAt, current });
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => f.includes('DAY_MEMO') && f.includes('пуст')));
});

test('readAt отсутствует целиком → красный, не исключение', () => {
  const r = validateEveningFeedbackReadAt({ readAt: undefined, current: {} });
  assert.equal(r.ok, false);
  assert.equal(r.failures.length, 1);
});

test('вход исчез после генерации → красный', () => {
  const { readAt, current } = greenPair();
  delete current.DAILY_AUDIT;
  const r = validateEveningFeedbackReadAt({ readAt, current });
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => f.includes('DAILY_AUDIT') && f.includes('исчез')));
});

test('eveningFeedbackInputs несёт мемо дня с датой в пути', () => {
  const inputs = eveningFeedbackInputs('2026-08-24');
  const memo = inputs.find((d) => d.key === 'DAY_MEMO');
  assert.ok(memo);
  assert.equal(memo.rel, 'docs/memos/2026-08-24.md');
  assert.equal(memo.evening, true);
  // все обязательные ключи предиката существуют во входах
  for (const key of EVENING_REQUIRED_KEYS) {
    assert.ok(inputs.some((d) => d.key === key), `входа ${key} нет в списке`);
  }
});

test('parseEveningFeedbackGuard: круговой проход через шапку', () => {
  const guard = { day: '2026-08-24', magistral: { id: 'x', author: 'human' }, readAt: { DAY_MEMO: rec('a', 'b') } };
  const content = `<!-- Сгенерировано: ... -->\n<!-- evening-feedback ${JSON.stringify(guard)} -->\n\n# Протокол`;
  const parsed = parseEveningFeedbackGuard(content);
  assert.deepEqual(parsed, guard);
});

test('parseEveningFeedbackGuard: битый JSON → null, не исключение', () => {
  assert.equal(parseEveningFeedbackGuard('<!-- evening-feedback {oops} -->'), null);
  assert.equal(parseEveningFeedbackGuard('нет шапки вовсе'), null);
});
