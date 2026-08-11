/**
 * Интеграционный smoke коворка `cowork-honest-sprint` — семь шагов §5 контракта.
 *
 * ЧТО ОН ПРОВЕРЯЕТ И ЧТО НЕТ. Зелёный означает «данные прошли швы», а не «механизм честен» —
 * честность проверяют зубы самих блоков (91 штука). Здесь проверяется сборка.
 *
 * ГЛАВНЫЕ ШАГИ — 5, 6 и 7. Они проверяют не работу, а **отказ врать при дырке в резке**: три
 * входа петли опыта не имеют производителя (дефект резки координатора, признан), и правильное
 * поведение — честное «не определено» с названной причиной, а не выдуманный процент.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import test from 'node:test';

import { planToGate } from './lib/sprint-integration/plan-to-gate.mjs';
import { planToForecast } from './lib/sprint-integration/plan-to-forecast.mjs';
import { gateToForecastObserved, leadStopsJournal } from './lib/sprint-integration/gate-to-forecast.mjs';
import { cutDigestOf, cutVerdict } from './lib/sprint-cut/index.mjs';
import { runGate } from './lib/execution-trace/gate.mjs';
import { TRACE_KINDS } from './lib/execution-trace/trace-kinds.mjs';
import { appendTrace, readTrail } from './lib/evidence-trail/trail.mjs';
import { makeForecastRecord } from './lib/sprint-experience/forecast-record.mjs';
import { computeCutAccuracy } from './lib/sprint-experience/cut-accuracy.mjs';
import { computeFalseStopRate } from './lib/sprint-experience/false-stop-rate.mjs';
import { renderMetricLine } from './lib/sprint-experience/absence.mjs';
import { nominateRuns } from './lib/sprint-experience/nominate.mjs';

const VOICES = ['tarasov', 'vesnin', 'ozhegov', 'dynin', 'kuryokhin', 'rodchenko', 'angelina', 'farrell'];
const REASONS = ['mechanical', 'no_profile_owner', 'owner_solo', 'urgent_recovery'];

/** План из двух блоков: первый влезает в проход, второй переполнен. */
function planBody(over = {}) {
  return {
    // Схема обязательна: документ без неё — «другого рода», и блок замыкается накоротко,
    // не пытаясь судить поля. Поймано на первом прогоне этого smoke.
    schema: 'sprint-cut/1',
    sprintId: 'sprint-smoke',
    cutBy: 'tarasov',
    window: { from: '2026-07-30T09:00:00Z', to: '2026-07-31T09:00:00Z' },
    revisionAt: '2026-07-30T09:30:00Z',
    blocks: [
      { blockId: 'alpha-one', persona: 'dynin', context: 'dynin', zone: ['scripts/a/**'], estimate: { changedLines: 200 }, revisionAt: '2026-07-30T09:30:00Z' },
      { blockId: 'beta-two', persona: 'ozhegov', context: 'ozhegov', zone: ['scripts/b/**'], estimate: { changedLines: 900 }, revisionAt: '2026-07-30T09:30:00Z' },
    ],
    ...over,
  };
}

const ratified = (body) => ({ ...body, ratification: { by: 'owner', at: '2026-07-30T10:00:00Z', digest: cutDigestOf(body) } });

const gateArgs = (planRaw, traceRecords) => ({
  planRaw,
  traceRecords,
  knownPersonas: VOICES,
  allowedReasons: REASONS,
  resolveRef: () => ({ resolved: true }),
  now: '2026-07-31T10:00:00Z',
});

// ── Шаг 1 ─────────────────────────────────────────────────────────────────────

test('шаг 1: переполненный блок назван находкой на ПРОХОДЕ, адрес и причина есть', () => {
  const v = cutVerdict(ratified(planBody()), { voices: VOICES });
  const f = v.findings.find((x) => x.toothId === 'block_oversized');
  assert.ok(f, 'переполнение названо');
  // Адрес — путь до поля, а не только id блока: точнее, чем ждал этот smoke на первом прогоне.
  assert.equal(f.where, 'blocks.beta-two.estimate.changedLines', 'находка адресует ПОЛЕ, а не «в плане что-то не так»');
  assert.match(f.reason, /тихая перерезка запрещена/u, 'причина зовёт к управленческому решению');
  assert.ok(String(f.reason).length > 0, 'причина непустая');
  assert.equal(v.verdict, 'findings');
});

// ── Шаг 2 ─────────────────────────────────────────────────────────────────────

test('шаг 2: план БЕЗ окна и ревизии → ошибка входа, вердиктов ноль, «всё свежее» не считается', () => {
  const body = planBody({ window: undefined, revisionAt: undefined });
  const { planRaw } = planToGate(ratified(body));
  const report = runGate(gateArgs(planRaw, []));
  assert.equal(report.exitCode, 2, 'проверка НЕ состоялась — это не то же, что «сказала нет»');
  assert.equal(report.blocks.length, 0, 'ни одного вердикта на непрочитанном входе');
  assert.ok(report.inputErrors.length > 0, 'ошибки входа названы');
});

// ── Шаг 3 ─────────────────────────────────────────────────────────────────────

test('шаг 3: у второго блока вещдока нет → «план соврал», код 1, остановка', () => {
  const { planRaw } = planToGate(ratified(planBody()));
  const traces = [
    { traceId: 'tr-1', blockId: 'alpha-one', kind: TRACE_KINDS.CONTEXT_RUN, subject: 'dynin', at: '2026-07-30T11:00:00Z', ref: 'sha:aaa' },
  ];
  const report = runGate(gateArgs(planRaw, traces));
  const byId = Object.fromEntries(report.blocks.map((b) => [b.blockId, b]));
  assert.equal(byId['beta-two'].verdict, 'plan_lied');
  assert.equal(byId['beta-two'].stopped, true);
  assert.equal(report.exitCode, 1, 'проверка сказала «нет»');
  assert.equal(report.corpusSize, 1, 'корпус НЕ пуст — вердикт получен ИЗ ленты');
});

// ── Шаг 4 ─────────────────────────────────────────────────────────────────────

test('шаг 4: пустая лента → no_corpus на ОБА блока, и строки «нарушений 0» нет нигде', () => {
  const { planRaw } = planToGate(ratified(planBody()));
  const report = runGate(gateArgs(planRaw, []));
  assert.deepEqual(report.blocks.map((b) => b.verdict), ['no_corpus', 'no_corpus']);
  assert.equal(report.exitCode, 1);
  assert.ok(!JSON.stringify(report).includes('нарушений 0'), 'ратифицированный M5: пустой корпус — не чистота');
});

test('шаги 3+4 вместе: «план соврал» получен ИЗ ленты, а не из её отсутствия', () => {
  // Пара нужна целиком — по отдельности каждый шаг доказуем ошибочно.
  const { planRaw } = planToGate(ratified(planBody()));
  const withTrace = runGate(gateArgs(planRaw, [
    { traceId: 'tr-1', blockId: 'alpha-one', kind: TRACE_KINDS.CONTEXT_RUN, subject: 'dynin', at: '2026-07-30T11:00:00Z', ref: 'sha:aaa' },
  ]));
  const empty = runGate(gateArgs(planRaw, []));
  assert.notDeepEqual(
    withTrace.blocks.map((b) => b.verdict),
    empty.blocks.map((b) => b.verdict),
    'непустой и пустой корпус дают РАЗНЫЕ вердикты',
  );
});

// ── Живая лента: носитель N3 доезжает до гейта без адаптера ───────────────────

test('лента на диске → гейт: носитель N3 работает в связке, без переходника', () => {
  const root = mkdtempSync(tmpdir() + '/smoke-');
  try {
    appendTrace(root, 'sprint-smoke', {
      traceId: 'tr-1', blockId: 'alpha-one', kind: TRACE_KINDS.CONTEXT_RUN,
      subject: 'dynin', at: '2026-07-30T11:00:00Z', ref: 'sha:aaa',
    });
    const { traces, totalLines } = readTrail(root, 'sprint-smoke');
    assert.equal(totalLines, 1);
    const { planRaw } = planToGate(ratified(planBody()));
    const report = runGate(gateArgs(planRaw, traces));
    assert.equal(report.corpusSize, 1, 'записи ленты приняты гейтом как есть');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── Шаг 5 — ГЛАВНЫЙ: отказ врать при отсутствии носителя N1 ───────────────────

test('шаг 5: привязки сегментов нет → cutAccuracy не определена, НИ ОДНОГО процента в выводе', () => {
  const { planRaw } = planToGate(ratified(planBody()));
  const report = runGate(gateArgs(planRaw, [
    { traceId: 'tr-1', blockId: 'alpha-one', kind: TRACE_KINDS.CONTEXT_RUN, subject: 'dynin', at: '2026-07-30T11:00:00Z', ref: 'sha:aaa' },
  ]));
  const forecast = planToForecast(ratified(planBody()));
  const observed = gateToForecastObserved(report); // N1 отсутствует — сегментов нет
  const record = makeForecastRecord({
    ...forecast,
    seq: 1, // b2 s-queue-2026-08-11: дефолт снят, смоук называет seq явно

    observed,
    observedAt: '2026-07-31T10:00:00Z',
    outcome: 'miss',
    evidence: [{ type: 'sha', value: 'aaa' }],
    provenance: { planRef: 'docs/sprint/cut/sprint-smoke.json', sessionId: 'smoke' },
  });

  const metric = computeCutAccuracy([record]);
  assert.equal(metric.defined, false, 'метрика честно не определена');
  assert.equal(metric.reason, 'no-attribution', 'причина названа: привязки нет, а не «ноль»');
  const line = renderMetricLine('точность нарезки', metric);
  assert.ok(!/\d+([.,]\d+)?\s*%/u.test(line), `процент не напечатан: «${line}»`);
});

// ── Шаг 6 — ГЛАВНЫЙ: отказ врать при отсутствии носителя N2 ───────────────────

test('шаг 6: журнала остановок ведущей нет → falseStopRate не определена, «ложных нет» не говорится', () => {
  const metric = computeFalseStopRate(leadStopsJournal(), [], { lead: 'angelina' });
  assert.equal(metric.defined, false);
  assert.equal(metric.reason, 'no-stops-recorded', 'остановок не записано ≠ ложных нет');
  const line = renderMetricLine('доля ложных остановок', metric);
  assert.ok(!/\d+([.,]\d+)?\s*%/u.test(line), `процент не напечатан: «${line}»`);
});

test('шаг 6b: окно без ведения перебивает всё — хорошая цифра не выдаётся (M6)', () => {
  const metric = computeFalseStopRate([], [], { lead: { none: 'ведущая не назначена' } });
  assert.equal(metric.reason, 'no-lead-appointed');
});

// ── Шаг 7 — ГЛАВНЫЙ: тонкий корпус не добирается неточными прогонами ──────────

test('шаг 7: при неопределённых метриках прогон не номинируется, корпус честно тонкий', () => {
  const r = nominateRuns([], { min: 5, max: 7 });
  assert.deepEqual(r.ready, [], 'образцовых прогонов нет');
  assert.match(String(r.thin), /0 из 5/u, 'сказано сколько есть, а не добрано до пяти');
});
