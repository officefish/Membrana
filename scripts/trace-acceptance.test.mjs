import assert from 'node:assert/strict';
import test from 'node:test';

import { EXIT_OK, EXIT_REFUSAL } from './lib/trace-exit-codes.mjs';
import { ACCEPTANCE_MODES, checkAcceptance, traceState } from './lib/trace-acceptance.mjs';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

/** Фикстурный артефакт закрытия по мотивам схемы docs/reviews/<id>/manifest.json. */
function artifact(overrides = {}) {
  return {
    taskId: 'task-1',
    acceptance: { acceptedBy: 'vesnin', headRev: SHA_A },
    ...overrides,
  };
}

test('mode обязателен: без него — ошибка постановки, не молчаливый дефолт', () => {
  assert.throws(() => checkAcceptance(artifact()), /mode обязателен/);
  assert.deepEqual(ACCEPTANCE_MODES, ['soft', 'hard']);
});

test('приёмка подтверждена → pass в обоих режимах', () => {
  for (const mode of ACCEPTANCE_MODES) {
    const r = checkAcceptance(artifact(), { mode });
    assert.equal(r.code, EXIT_OK);
    assert.equal(r.verdict, 'pass');
  }
});

test('отказ-II soft: поле приёмки отсутствует → замечание, exit 0 + строка в отчёт', () => {
  const r = checkAcceptance(artifact({ acceptance: null }), { mode: 'soft' });
  assert.equal(r.code, EXIT_OK, 'soft пропускает: exit 0');
  assert.equal(r.verdict, 'soft');
  assert.match(r.reason, /поле приёмки отсутствует/);
});

test('отказ-II hard: поле приёмки отсутствует → отказ, exit ≠ 0', () => {
  const r = checkAcceptance(artifact({ acceptance: null }), { mode: 'hard' });
  assert.equal(r.code, EXIT_REFUSAL);
  assert.equal(r.verdict, 'hard');
});

test('acceptedBy пуст → нарушение (LGTM никем не дан)', () => {
  for (const acceptedBy of [null, undefined, '', '  ']) {
    const r = checkAcceptance(artifact({ acceptance: { acceptedBy, headRev: SHA_A } }), { mode: 'hard' });
    assert.equal(r.code, EXIT_REFUSAL, `acceptedBy=${JSON.stringify(acceptedBy)}`);
    assert.match(r.reason, /acceptedBy пуст/);
  }
});

test('headRev отсутствует или не ревизия → нарушение (подтверждение не привязано к факту)', () => {
  for (const headRev of [null, '', 'не-sha', 'XYZ123']) {
    const r = checkAcceptance(artifact({ acceptance: { acceptedBy: 'vesnin', headRev } }), { mode: 'hard' });
    assert.equal(r.code, EXIT_REFUSAL, `headRev=${JSON.stringify(headRev)}`);
  }
});

test('ложное подтверждение: LGTM не на той ревизии → нарушение', () => {
  const r = checkAcceptance(artifact(), { mode: 'hard', expectedHeadRev: SHA_B });
  assert.equal(r.code, EXIT_REFUSAL);
  assert.match(r.reason, /подтверждение ложно/);

  const ok = checkAcceptance(artifact(), { mode: 'hard', expectedHeadRev: SHA_A });
  assert.equal(ok.code, EXIT_OK);
});

test('артефакт отсутствует целиком → нарушение по режиму, не исключение', () => {
  assert.equal(checkAcceptance(null, { mode: 'soft' }).verdict, 'soft');
  assert.equal(checkAcceptance(null, { mode: 'hard' }).verdict, 'hard');
});

test('три честных состояния: green / yellow / red', () => {
  assert.equal(traceState(checkAcceptance(artifact(), { mode: 'soft' })), 'green');
  assert.equal(traceState(checkAcceptance(artifact({ acceptance: null }), { mode: 'soft' })), 'yellow');
  assert.equal(traceState(checkAcceptance(artifact({ acceptance: null }), { mode: 'hard' })), 'red');
});

test('детерминизм: тот же вход — тот же результат бит-в-бит', () => {
  const a = artifact({ acceptance: { acceptedBy: 'dynin', headRev: SHA_A } });
  assert.deepEqual(
    checkAcceptance(a, { mode: 'soft', expectedHeadRev: SHA_A }),
    checkAcceptance(a, { mode: 'soft', expectedHeadRev: SHA_A }),
  );
});
