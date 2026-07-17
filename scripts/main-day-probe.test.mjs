/**
 * Тесты препроцессора-гейта посылок MAIN_DAY_ISSUE (#533).
 *
 * Главное — гейт обязан ловить СВОЙ ЖЕ кейс 16.07: план назначил написать
 * `fuseDetectorConfidences`, слитый 13.07. Гейт, не воспроизводящий инцидент,
 * ради которого построен, — декоративен (PG3 промпта).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  countIndependentSources,
  dedupeByOrigin,
  formatOriginSummary,
  formatProbeReport,
  hasViolatedAssertion,
  originHash,
  probeAssertion,
  probeAssertions,
} from './lib/main-day-probe.mjs';
import { collectEvidence, parseMainDayProbeArgs } from './main-day-probe.mjs';

const fusionAssertion = {
  claim: 'fusion в коде ещё не живёт — написать чистую функцию объединения confidence',
  marker: { kind: 'symbol', value: 'fuseDetectorConfidences' },
  issue: 415,
};

// ─── вердикты ─────────────────────────────────────────────────────────────────────

test('маркера нет → holds: посылка подтверждена, план вправе назначить работу', () => {
  const r = probeAssertion(fusionAssertion, { markerExists: false, issueState: 'open' });
  assert.equal(r.verdict, 'holds');
  assert.match(r.evidence, /отсутствует/u);
  assert.equal(r.staleRegistry, false);
});

test('маркер есть → violated (живой кейс 16.07: план звал писать готовое ядро)', () => {
  const r = probeAssertion(fusionAssertion, { markerExists: true, issueState: 'open' });
  assert.equal(r.verdict, 'violated');
  assert.match(r.evidence, /fuseDetectorConfidences/u);
  assert.match(r.evidence, /СУЩЕСТВУЕТ/u);
});

test('маркер есть + issue open → находка «реестр протух», а не шум', () => {
  // Ровно #415: код слит 13.07 (PR #417), но «(#415)» не закрыл issue.
  const r = probeAssertion(fusionAssertion, { markerExists: true, issueState: 'open' });
  assert.equal(r.staleRegistry, true);
  assert.match(r.evidence, /РЕЕСТР ПРОТУХ/u);
  assert.match(r.evidence, /#415 open/u);
});

test('маркер есть + issue closed → violated, но реестр в порядке', () => {
  const r = probeAssertion(fusionAssertion, { markerExists: true, issueState: 'closed' });
  assert.equal(r.verdict, 'violated');
  assert.equal(r.staleRegistry, false, 'issue закрыт — протухания нет');
});

test('данных нет → unknown, а не ложный алерт (нет gh / нет сети)', () => {
  const r = probeAssertion(fusionAssertion, { markerExists: null });
  assert.equal(r.verdict, 'unknown');
  assert.match(r.evidence, /проверить не удалось/u);
  assert.equal(r.staleRegistry, false);
});

test('sha попадает в доказательство (провенанс)', () => {
  const r = probeAssertion(fusionAssertion, {
    markerExists: true,
    issueState: 'closed',
    sha: '5e42c937aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  });
  assert.match(r.evidence, /@5e42c937aaaa/u);
});

test('ядро тотально: кривой вход не роняет', () => {
  assert.equal(probeAssertion(undefined, undefined).verdict, 'unknown');
  assert.equal(probeAssertion({}, {}).verdict, 'unknown');
});

// ─── PG3: демонстрация на кейсе 16.07 ─────────────────────────────────────────────

test('кейс 16.07: ОБЕ посылки развилки → violated', () => {
  // Ветка A: «fusion не живёт» — fuseDetectorConfidences в @membrana/core с 13.07.
  // Ветка B: «три пустых UC-каркаса» — все четыре наполнены и зарегистрированы.
  const results = probeAssertions([
    { assertion: fusionAssertion, evidence: { markerExists: true, issueState: 'open' } },
    {
      assertion: {
        claim: 'три пустых UC-каркаса — налить спектр/нейро/библиотеку',
        marker: { kind: 'file', value: 'packages/device-board/src/graph/usercase-free-spectrum-live.ts' },
      },
      evidence: { markerExists: true },
    },
  ]);
  assert.equal(results.length, 2);
  assert.ok(results.every((r) => r.verdict === 'violated'), 'обе посылки должны пасть');
  assert.equal(hasViolatedAssertion(results), true, 'генерация плана обязана быть заблокирована');
});

test('чистый день: посылки держатся → генерация не блокируется', () => {
  const results = probeAssertions([
    { assertion: fusionAssertion, evidence: { markerExists: false, issueState: 'open' } },
  ]);
  assert.equal(hasViolatedAssertion(results), false);
});

test('unknown НЕ блокирует генерацию (отсутствие данных не алерт)', () => {
  const results = probeAssertions([{ assertion: fusionAssertion, evidence: { markerExists: null } }]);
  assert.equal(hasViolatedAssertion(results), false, 'нет данных — не повод ронять ритуал');
});

// ─── обвязка: сбор фактов из живого дерева ────────────────────────────────────────
// Ядро было зелёным (12 тестов), а гейт всё равно соврал: pathspec `packages/*/src`
// git трактует не как shell-glob и молча находит ноль → «символа нет». Поймал только
// живой прогон. Эти тесты закрывают именно обвязку.

test('collectEvidence находит реальный символ в исходниках (регрессия pathspec)', () => {
  const evidence = collectEvidence({ marker: { kind: 'symbol', value: 'fuseDetectorConfidences' } });
  assert.equal(evidence.markerExists, true, 'символ живёт в packages/core/src/contracts/detection-fusion.ts');
});

test('collectEvidence: несуществующий символ → false, а не null', () => {
  const evidence = collectEvidence({ marker: { kind: 'symbol', value: 'zzzNoSuchSymbolZzz' } });
  assert.equal(evidence.markerExists, false, 'git grep exit 1 — это факт «нет», а не «не знаю»');
});

test('collectEvidence: file-маркер проверяется по файловой системе', () => {
  assert.equal(
    collectEvidence({ marker: { kind: 'file', value: 'scripts/lib/main-day-probe.mjs' } }).markerExists,
    true,
  );
  assert.equal(
    collectEvidence({ marker: { kind: 'file', value: 'scripts/nope-does-not-exist.mjs' } }).markerExists,
    false,
  );
});

test('collectEvidence: без маркера → null (unknown), а не ложный вердикт', () => {
  assert.equal(collectEvidence({}).markerExists, null);
});

test('CLI: --assertions и --json', () => {
  assert.equal(parseMainDayProbeArgs(['--assertions', 'x.json']).assertions, 'x.json');
  assert.equal(parseMainDayProbeArgs(['--json']).json, true);
  assert.equal(parseMainDayProbeArgs([]).assertions, 'docs/tasks/main-day-assertions.json');
});

// ─── эхо-камера: голоса считаются по первоисточникам ──────────────────────────────
// Консилиум ritual-inputs-echo-and-extracts: источники, производные от одного снимка,
// коррелированы полностью — их суммарный вес равен весу одного (диагноз Музыканта:
// та же болезнь, что коррелированность детекторов в ансамбле).

/** Реальная таблица «Почему это магистраль» 16.07: три строки, один первоисточник. */
const ECHO_16_07 = [
  {
    claim: 'STRATEGIC_PLAN_DAY (16.07): магистраль = S2 combined UC',
    origin: 'detection-planning-priorities.mjs@2026-07-06',
  },
  {
    claim: 'Форсайт 2026-07-06: S2 первый в цепочке',
    origin: 'detection-planning-priorities.mjs@2026-07-06',
  },
  {
    claim: 'DAILY_STANDUP (16.07): магистраль = S2',
    origin: 'detection-planning-priorities.mjs@2026-07-06',
  },
];

test('originHash детерминирован и различает первоисточники', () => {
  assert.equal(originHash('a@1'), originHash('a@1'), 'одинаковый вход → тот же хэш');
  assert.notEqual(originHash('a@1'), originHash('a@2'), 'другая ревизия → другой источник');
  assert.equal(originHash('a@1').length, 7);
  assert.equal(originHash(''), '0000000', 'пустой источник не роняет');
  assert.equal(originHash(undefined), '0000000');
});

test('эхо-камера 16.07: три строки таблицы → ОДИН независимый источник', () => {
  assert.equal(countIndependentSources(ECHO_16_07), 1, '«консенсус» был отражением одного снимка');
  const deduped = dedupeByOrigin(ECHO_16_07);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].reflections, 3, 'три отражения одного первоисточника');
});

test('несогласный голос из ДРУГОГО первоисточника считается отдельно', () => {
  // Вчерашний MAIN_DAY_ISSUE опирался на факт мёржа — независимый источник,
  // и он был единственным правым. Дедуп обязан его сохранить.
  const withDissent = [
    ...ECHO_16_07,
    { claim: 'MAIN_DAY_ISSUE (15.07): S2 слит, остаток — упаковка', origin: 'git-merge-fact@5e42c937' },
  ];
  assert.equal(countIndependentSources(withDissent), 2, 'эхо + независимый факт = два голоса, не четыре');
});

test('dedupeByOrigin сохраняет порядок: первое вхождение выигрывает', () => {
  const deduped = dedupeByOrigin([
    { claim: 'первый', origin: 'x@1' },
    { claim: 'второй', origin: 'y@1' },
    { claim: 'третий', origin: 'x@1' },
  ]);
  assert.deepEqual(deduped.map((d) => d.claim), ['первый', 'второй']);
  assert.equal(deduped[0].reflections, 2);
});

test('formatOriginSummary помечает эхо ТЕКСТОМ, а не цветом', () => {
  const summary = formatOriginSummary(ECHO_16_07);
  assert.match(summary, /подтверждена 1 независимыми источниками/u);
  assert.match(summary, /строк в таблице: 3/u, 'разрыв 1 против 3 обязан быть виден');
  assert.match(summary, /1 источник, 3 отражений/u);
});

test('формат без эха не кричит', () => {
  const summary = formatOriginSummary([{ claim: 'a', origin: 'x@1' }, { claim: 'b', origin: 'y@1' }]);
  assert.match(summary, /2 независимыми/u);
  assert.doesNotMatch(summary, /ЭХО/u);
});

test('пустой список источников — честная строка', () => {
  assert.match(formatOriginSummary([]), /источников нет/u);
  assert.equal(countIndependentSources([]), 0);
});

// ─── формат отчёта (Rodchenko) ────────────────────────────────────────────────────

test('нарушенные сверху и помечены ТЕКСТОМ, а не только цветом', () => {
  const report = formatProbeReport(
    probeAssertions([
      { assertion: { claim: 'ok', marker: { kind: 'symbol', value: 'a' } }, evidence: { markerExists: false } },
      { assertion: fusionAssertion, evidence: { markerExists: true, issueState: 'open' } },
    ]),
  );
  const lines = report.split('\n');
  const violatedRow = lines.findIndex((l) => l.includes('ПОСЫЛКА НАРУШЕНА'));
  const holdsRow = lines.findIndex((l) => l.includes('подтверждена'));
  assert.ok(violatedRow > 0, 'нарушенная посылка обязана быть помечена текстом');
  assert.ok(violatedRow < holdsRow, 'нарушенные — сверху');
});

test('пустой набор — честная строка, а не пустой отчёт', () => {
  assert.match(formatProbeReport([]), /Посылок для проверки нет/u);
});

// ─── позиция гейта в цепочке (C1 из #572) ─────────────────────────────────────────

/**
 * C1: до 17.07 гейт стоял ШЕСТЫМ, генератор — пятым, и текст ошибки «Генерация
 * магистрали заблокирована» был ложью: план уже лежал на диске, а `&&` останавливал
 * лишь дайджест. Порядок был не замыслом, а следом истории мёржа (гейт смёржен
 * 16.07 в 09:46, план сгенерирован в 05:01).
 *
 * Тест здесь, а не в графе правды: `truth:verify` НЕ выполняет `predicates[].cmd`
 * (execFileSync в truth.mjs зовётся только для `git log`), а протухание считает по
 * дате касания — правка package.json в день проверки предиката не протухает
 * (`isAfter` сравнивает по дате: 2026-07-17 > 2026-07-17 = false). Значит откат
 * порядка граф не поймал бы. Ловит этот тест.
 */
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Шаги цепочки `ritual:day` из живого package.json. */
function ritualDaySteps() {
  const chain = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')).scripts['ritual:day'];
  return chain.split('&&').map((s) => s.trim());
}

test('гейт посылок стоит ПЕРЕД генератором плана (C1 #572)', () => {
  const steps = ritualDaySteps();

  const probeAt = steps.findIndex((s) => s.includes('main-day-probe.mjs'));
  const generatorAt = steps.findIndex((s) => s.includes('main-day-issue.mjs'));

  assert.ok(probeAt >= 0, 'main-day-probe обязан быть в цепочке ritual:day');
  assert.ok(generatorAt >= 0, 'main-day-issue обязан быть в цепочке ritual:day');
  assert.ok(
    probeAt < generatorAt,
    `гейт обязан стоять ДО генератора: иначе его «генерация заблокирована» — ложь ` +
      `(сейчас пробник ${probeAt + 1}-й, генератор ${generatorAt + 1}-й)`,
  );
});

test('гейт не обёрнут `|| true` — иначе нарушенная посылка не остановит день', () => {
  const probeStep = ritualDaySteps().find((s) => s.includes('main-day-probe.mjs'));
  assert.doesNotMatch(
    probeStep,
    /\|\|\s*true/u,
    'блокирующий гейт под `|| true` — формальность: exit 2 будет проглочен (урок B1 #572)',
  );
});
