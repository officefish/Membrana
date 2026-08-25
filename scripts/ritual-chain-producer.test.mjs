/**
 * Зубы блока ritual-wiring (спринт run-journal-producer, 03.08): прогоны ритуалов
 * рождаются ВЫЗОВОМ процедуры, не рукой. Болезнь-вещдок: 47 версий документа дня,
 * ноль записей в журнале.
 *
 * Утро (ritual:day) — раннер: open первым шагом, close после deliver; pending-ci
 * закрывается named gap, а не shell-хвостом pass.
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
const dayRunnerSrc = readFileSync(resolve(repoRoot, 'scripts/ritual-day-run.mjs'), 'utf8');

// ── утро: раннер ──────────────────────────────────────────────────────────────

test('ritual:day: глагол — раннер, а не shell-цепочка с ложным хвостом', () => {
  assert.equal(scripts['ritual:day'], 'node scripts/ritual-day-run.mjs');
});

test('ritual:day: раннер открывает прогон до всякой работы', () => {
  assert.match(dayRunnerSrc, /'open',\s*'--procedure',\s*'ritual-day'/u, 'open --procedure ritual-day в раннере');
  assert.match(dayRunnerSrc, /'--evidence',\s*'docs\/tasks\/morning-ritual-steps\.json'/u, 'open несёт --evidence');
});

test('ritual:day: close пишется по исходу доставки, pending-ci не становится pass', () => {
  assert.match(dayRunnerSrc, /'scripts\/ritual-deliver-to-main\.mjs',\s*'--execute'/u, 'кадр доставки исполняется');
  assert.match(dayRunnerSrc, /code === 3/u, 'pending-ci — отдельная ветка исхода');
  assert.match(dayRunnerSrc, /closeRun\('skipped', \['--gap', 'deliver-to-main:pending-ci'/u, 'pending-ci пишет named gap');
  assert.match(dayRunnerSrc, /closeRun\('pass'\)/u, 'pass только после всех шагов');
});

test('ritual:day: сторожа не глушат — open и close без || true', () => {
  assert.doesNotMatch(scripts['ritual:day'], /\|\| true/u);
  assert.doesNotMatch(dayRunnerSrc, /\|\| true/u);
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
