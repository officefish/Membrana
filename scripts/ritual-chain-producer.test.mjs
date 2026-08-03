/**
 * Зубы блока ritual-wiring (спринт run-journal-producer, 03.08): прогоны ритуалов
 * рождаются ВЫЗОВОМ процедуры, не рукой. Болезнь-вещдок: 47 версий документа дня,
 * ноль записей в журнале.
 *
 * Утро (ritual:day) — шелл-цепочка в package.json: open первым шагом, close после
 * deliver; сверка ПО ФАКТУ глагола, разбором шагов по && (прецедент
 * prepush-env-guard: «проверка идёт по факту, а не по догадке»).
 *
 * Вечер (ritual:evening) ведётся МАНИФЕСТОМ (гард step-status.test.mjs) — глагол
 * обязан остаться чистым раннером, а open/close живут В РАННЕРЕ: только он видит
 * итог прогона, close-шаг манифеста написал бы pass при упавшем критичном.
 * Сверка — по факту исходника раннера, как зуб prepush-env-guard читает хук.
 *
 * Обрыв цепочки/раннера здесь не проверяется: его ловит ленивое закрытие со
 * следующего утра — зубы кросс-файлового закрытия в procedure-run-record.test.mjs.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scripts = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')).scripts;
const runnerSrc = readFileSync(resolve(repoRoot, 'scripts/ritual-evening-run.mjs'), 'utf8');

const OPEN = 'node scripts/procedure-run-record.mjs open --procedure ritual-day';
const CLOSE = 'node scripts/procedure-run-record.mjs close --procedure ritual-day --status pass';

// ── утро: шелл-цепочка ────────────────────────────────────────────────────────

test('ritual:day: open — первый шаг цепочки, до всякой работы', () => {
  const steps = scripts['ritual:day'].split('&&').map((s) => s.trim());
  assert.ok(steps[0].startsWith(OPEN), 'цепочка начинается с open --procedure ritual-day');
  assert.match(steps[0], /--evidence \S+/u, 'open несёт --evidence');
});

test('ritual:day: close — последний шаг, после deliver: запись о доставленном, не о начатом', () => {
  const steps = scripts['ritual:day'].split('&&').map((s) => s.trim());
  assert.ok(steps.at(-1).startsWith(CLOSE), 'close — последний шаг цепочки');
  assert.match(steps.at(-1), /--evidence \S+/u, 'close несёт --evidence');
  assert.ok(steps.at(-2).includes('scripts/ritual-deliver-to-main.mjs'), 'предпоследний — кадр доставки');
  assert.equal(
    steps.filter((s) => s.includes('procedure-run-record.mjs close')).length,
    1,
    'close один — вторая запись была бы второй правдой',
  );
});

test('ritual:day: сторожа не глушат — open и close без || true', () => {
  const steps = scripts['ritual:day'].split('&&').map((s) => s.trim());
  for (const step of [steps.at(0), steps.at(-1)]) {
    assert.ok(!step.includes('|| true'), `шаг «${step.slice(0, 60)}…» не глушится: молчаливый пропуск записи — болезнь спринта`);
  }
});

// ── вечер: раннер по манифесту ────────────────────────────────────────────────

test('ritual:evening: глагол — чистый раннер (зеркало гарда «ведётся манифестом»)', () => {
  assert.equal(scripts['ritual:evening'], 'node scripts/ritual-evening-run.mjs');
});

test('ritual:evening: раннер открывает прогон в журнале до шагов', () => {
  assert.match(
    runnerSrc,
    /'open',\s*'--procedure',\s*'ritual-evening'/u,
    'open --procedure ritual-evening в раннере',
  );
});

test('ritual:evening: close в раннере — статус ПО ФАКТУ прогона, не зашитый pass', () => {
  assert.match(
    runnerSrc,
    /failed\.length > 0 \? 'fail' : 'pass'/u,
    'статус close вычисляется из упавших критичных, а не зашит',
  );
  assert.match(
    runnerSrc,
    /'close',\s*'--procedure',\s*'ritual-evening'/u,
    'close --procedure ritual-evening в раннере',
  );
  assert.match(runnerSrc, /'--gap', f\.id/u, 'gaps называют упавшие критичные шаги');
});

test('ritual:evening: сухой и частичный прогоны в журнал не пишутся', () => {
  assert.match(runnerSrc, /const fullRun = !dry && !only/u, '--dry и --only — не вечер, записи не оставляют');
});

test('процедуры различимы: ritual-day ≠ ritual-evening', () => {
  assert.ok(!scripts['ritual:day'].includes('--procedure ritual-evening'));
  assert.ok(!runnerSrc.includes("'--procedure', 'ritual-day'"));
});
