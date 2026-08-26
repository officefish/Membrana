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
// #2081 (#2173): сборка аргументов close вынесена в lib — зуб судит раннер ВМЕСТЕ с ней,
// иначе он проверял бы букву исходника, а не инвариант (статус по факту, gap, procedure).
const closeArgsSrc = readFileSync(resolve(repoRoot, 'scripts/lib/ritual-evening-close-args.mjs'), 'utf8');
const closeSrc = `${runnerSrc}\n${closeArgsSrc}`;
const dayRunnerSrc = readFileSync(resolve(repoRoot, 'scripts/ritual-day-run.mjs'), 'utf8');
// #1782: сборка аргументов close вынесена в lib — зуб судит раннер ВМЕСТЕ с ней,
// иначе он проверял бы букву исходника, а не инвариант (статус по факту, named gap).
const dayCloseArgsSrc = readFileSync(resolve(repoRoot, 'scripts/lib/ritual-day-close.mjs'), 'utf8');
const dayCloseSrc = dayRunnerSrc + String.fromCharCode(10) + dayCloseArgsSrc;

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
  assert.match(dayRunnerSrc, /closeRun\('pending-ci'/u, 'pending-ci — свой исход, а не строка статуса на месте');
  assert.match(dayCloseSrc, /'deliver-to-main:pending-ci'/u, 'pending-ci пишет named gap');
  assert.match(dayCloseSrc, /'--status', status/u, 'статус собирается из исхода, не зашит');
  assert.match(dayRunnerSrc, /closeRun\('pass'\)/u, 'pass только после всех шагов');
  // #1782: закрытие гарантировано и на пути обрыва — сирота лжёт следующему прогону.
  assert.match(dayRunnerSrc, /finally \{/u, 'обрыв цепочки не должен терять запись прогона');
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
  assert.match(runnerSrc, /eveningCloseArgs\(\{ failed, findings/u, 'раннер строит close через eveningCloseArgs (lib)');
  assert.match(
    closeSrc,
    /failed\.length > 0 \? 'fail' : 'pass'/u,
    'статус close вычисляется из упавших критичных, а не зашит',
  );
  assert.match(
    closeSrc,
    /'close',\s*'--procedure',\s*'ritual-evening'/u,
    'close --procedure ritual-evening в раннере',
  );
  assert.match(closeSrc, /'--gap', f\.id/u, 'gaps называют упавшие критичные шаги');
  assert.match(closeSrc, /'--friction', `\$\{f\.id\}: finding exit/u, '#2081: находки уходят во friction журнала, не сирота');
});

test('ritual:evening: сухой и частичный прогоны в журнал не пишутся', () => {
  assert.match(runnerSrc, /const fullRun = !dry && !only/u, '--dry и --only — не вечер, записи не оставляют');
});

test('процедуры различимы: ritual-day ≠ ritual-evening', () => {
  assert.ok(!scripts['ritual:day'].includes('--procedure ritual-evening'));
  assert.ok(!runnerSrc.includes("'--procedure', 'ritual-day'"));
});
