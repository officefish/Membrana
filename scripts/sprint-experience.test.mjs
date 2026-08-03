/**
 * Зубы блока `experience-loop` (Cowork Sprint `cowork-honest-sprint`, Phase 2).
 *
 * Файл лежит в `scripts/*.test.mjs` СПЕЦИАЛЬНО: корневой прогон его подхватывает, а тест внутри
 * пакета с узким `include` не побежит (грабля `AGENTS.md`).
 *
 * Проверяются оба пути, а не только счастливый: крайние случаи собственного DoD (ноль остановок ·
 * все остановки ложные · нарезка полностью точная · нарезка полностью промахнувшаяся), запрет
 * `?? 0` в метриках (зуб `no-nullish-zero-in-metrics`), запрет процента рядом с `defined:false`,
 * детерминизм отбора и честное «корпус тонкий» без добора.
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { OVERSIZED_CHANGED_LINES } from './lib/day-work-diff.mjs';
import {
  ABSENCE_REASONS, absent, present, renderCorpusVerdict, renderMetricLine, renderMetricValue,
} from './lib/sprint-experience/absence.mjs';
import { changedLines, computeCutAccuracy, verdictFor } from './lib/sprint-experience/cut-accuracy.mjs';
import { computeFalseStopRate } from './lib/sprint-experience/false-stop-rate.mjs';
import {
  checkAppendOnly, isLegalNo, makeForecastRecord, validateForecastRecord,
} from './lib/sprint-experience/forecast-record.mjs';
import {
  CHANGE_FEEDS, CUT_PLANS, LEADS, REVIEW_SEGMENTS, STOP_JOURNALS, STUB_SETS,
  cutRecordFrom, resolveStubSet, resolverBroken, runsFixture, stopRecordsFrom,
} from './lib/sprint-experience/fixtures.mjs';
import { nominateRuns } from './lib/sprint-experience/nominate.mjs';
import { renderNominations } from './lib/sprint-experience/render-nominations.mjs';

const SCRIPTS = dirname(fileURLToPath(import.meta.url));
const CLI = join(SCRIPTS, 'sprint-experience.mjs');
const LIB = join(SCRIPTS, 'lib', 'sprint-experience');

// ─── схема рода ───────────────────────────────────────────────────────────────────────────────

test('род: валидная запись cut проходит без находок', () => {
  const rec = cutRecordFrom(CUT_PLANS.exact, REVIEW_SEGMENTS.aroundThreshold);
  assert.deepEqual(validateForecastRecord(rec).problems, []);
  assert.equal(rec.class, 'forecast');
  assert.equal(rec.id, 'vesnin-sprint-fixture-1-cut-1');
});

test('род: predictedAt < observedAt — инвариант существования, а не гигиена', () => {
  const rec = cutRecordFrom(CUT_PLANS.exact, REVIEW_SEGMENTS.aroundThreshold);
  const broken = { ...rec, predictedAt: '2026-07-30T19:00:00Z' };
  const v = validateForecastRecord(broken);
  assert.equal(v.ok, false);
  assert.ok(v.problems.some((p) => p.includes('predictedAt < observedAt нарушен')));
});

test('род: predicted неизменяем после фиксации — правка падает, а не «не рекомендуется»', () => {
  const rec = cutRecordFrom(CUT_PLANS.exact, REVIEW_SEGMENTS.aroundThreshold);
  assert.throws(() => { rec.predicted.blocks[0].claim = 'does-not-fit'; }, TypeError);
  assert.throws(() => { rec.predicted.blocks.push({ cutBlockId: 'x' }); }, TypeError);
});

test('род: append-only ловит исчезновение записи, правку предсказания и дубль id', () => {
  const a = cutRecordFrom(CUT_PLANS.exact, REVIEW_SEGMENTS.aroundThreshold);
  const b = { ...cutRecordFrom(CUT_PLANS.allMissed, REVIEW_SEGMENTS.aroundThreshold), id: 'vesnin-sprint-fixture-2-cut-1' };
  assert.equal(checkAppendOnly([a], [a, b]).ok, true);
  assert.ok(checkAppendOnly([a], [a, a]).problems.some((p) => p.includes('повторяется')));
  assert.equal(checkAppendOnly([a, b], [a]).ok, false);
  const rewritten = { ...a, predicted: { blocks: [] } };
  const v = checkAppendOnly([a], [rewritten]);
  assert.equal(v.ok, false);
  assert.ok(v.problems.some((p) => p.includes('predicted изменён')));
});

test('род: остановка без objectRef — дефект записи, не «неизвестный исход»', () => {
  const bad = makeForecastRecord({
    personaId: 'angelina', sprintId: 's', subject: 'stop', seq: 1,
    predicted: { stopId: 's-x', stageId: 'st', objectRef: null, claim: 'stage-not-passed', stoppedAt: '2026-07-30T09:00:00Z' },
    predictedAt: '2026-07-30T09:00:00Z', ratifiedBy: { none: 'не требуется' },
    observed: { none: 'не разрешена' }, observedAt: null, outcome: 'not-observed',
    evidence: [], provenance: { planRef: 'p' },
  });
  const v = validateForecastRecord(bad);
  assert.equal(v.ok, false);
  assert.ok(v.problems.some((p) => p.includes('НЕВЫЧИСЛИМА')));
});

test('род: отсутствие — форма { none: причина }; null отказом не является', () => {
  assert.equal(isLegalNo({ none: 'причина' }), true);
  assert.equal(isLegalNo({ none: '' }), false);
  assert.equal(isLegalNo(null), false);
  const rec = cutRecordFrom(CUT_PLANS.exact, REVIEW_SEGMENTS.aroundThreshold);
  const v = validateForecastRecord({ ...rec, observed: null });
  assert.ok(v.problems.some((p) => p.includes('null отказом не является')));
});

// ─── точность нарезки ─────────────────────────────────────────────────────────────────────────

test('объём: мерка не изобретена — changedLines = insertions + deletions, порог 400 импортом', () => {
  assert.equal(changedLines({ insertions: 250, deletions: 150 }), 400);
  assert.throws(() => changedLines({ insertions: 1 }), /подстановка нуля запрещена/u);
  assert.equal(OVERSIZED_CHANGED_LINES, 400);
});

test('порог: 399 и 400 влезли, 401 переполнился (сравнение строгое, как в ревью)', () => {
  assert.equal(verdictFor(399, OVERSIZED_CHANGED_LINES), 'fitted');
  assert.equal(verdictFor(400, OVERSIZED_CHANGED_LINES), 'fitted');
  assert.equal(verdictFor(401, OVERSIZED_CHANGED_LINES), 'overflowed');
});

test('крайний случай DoD: нарезка полностью точная → 3/3, пары рядом', () => {
  const rec = cutRecordFrom(CUT_PLANS.exact, REVIEW_SEGMENTS.aroundThreshold);
  const m = computeCutAccuracy([rec]);
  assert.equal(m.defined, true);
  assert.equal(m.value, 1);
  assert.deepEqual([m.numerator, m.denominator], [3, 3]);
  assert.equal(m.pair.blocksCount, 3);
  assert.deepEqual([m.pair.overflowRate.numerator, m.pair.overflowRate.denominator], [1, 3]);
});

test('крайний случай DoD: нарезка полностью промахнувшаяся → 0/2, оба направления названы', () => {
  const rec = cutRecordFrom(CUT_PLANS.allMissed, REVIEW_SEGMENTS.aroundThreshold);
  const m = computeCutAccuracy([rec]);
  assert.equal(m.value, 0);
  assert.deepEqual([m.numerator, m.denominator], [0, 2]);
  assert.equal(m.pair.missOverflow, 1);
  assert.equal(m.pair.missOverCut, 1);
});

test('порог — параметр: тот же исход при threshold 300 даёт другой вердикт', () => {
  const rec = cutRecordFrom(CUT_PLANS.exact, REVIEW_SEGMENTS.aroundThreshold, { threshold: 300 });
  const m = computeCutAccuracy([rec], { threshold: 300 });
  assert.equal(m.value, 1 / 3);
});

test('cutAccuracy: пустота даёт ИМЕНОВАННОЕ отсутствие, а не 100%', () => {
  assert.deepEqual(computeCutAccuracy([]), { defined: false, reason: 'no-cut-forecast' });
  const unratified = cutRecordFrom(CUT_PLANS.unratified, REVIEW_SEGMENTS.aroundThreshold);
  assert.equal(computeCutAccuracy([unratified]).reason, 'forecast-not-ratified');
  const noOutcome = cutRecordFrom(CUT_PLANS.exact, REVIEW_SEGMENTS.none);
  assert.equal(computeCutAccuracy([noOutcome]).reason, 'no-observed-outcome');
});

test('cutAccuracy: нет привязки сегмента к cutBlockId → no-attribution, а НЕ 0', () => {
  const rec = cutRecordFrom(CUT_PLANS.exact, REVIEW_SEGMENTS.noAttribution);
  const m = computeCutAccuracy([rec]);
  assert.equal(m.defined, false);
  assert.equal(m.reason, 'no-attribution');
});

// ─── доля ложных остановок ────────────────────────────────────────────────────────────────────

test('крайний случай DoD: ноль остановок → метрика НЕ определена (не 0%)', () => {
  const m = computeFalseStopRate(STOP_JOURNALS.none, CHANGE_FEEDS.none, { lead: LEADS.appointed });
  assert.deepEqual(m, { defined: false, reason: 'no-stops-recorded' });
  assert.ok(!renderMetricValue(m).includes('%'));
});

test('крайний случай DoD: все остановки ложные → 100% при непустом знаменателе', () => {
  const m = computeFalseStopRate(STOP_JOURNALS.allFalse, CHANGE_FEEDS.onlyBeforeStops, { lead: LEADS.appointed });
  assert.equal(m.value, 1);
  assert.deepEqual([m.numerator, m.denominator], [2, 2]);
  assert.equal(m.pair.stopsCount, 2);
  assert.equal(m.pair.unresolvedCount, 0);
});

test('falseStopRate: смешанный журнал → 1/2, неразрешённая в знаменатель не входит', () => {
  const m = computeFalseStopRate(STOP_JOURNALS.mixed, CHANGE_FEEDS.oneUseful, { lead: LEADS.appointed });
  assert.equal(m.value, 0.5);
  assert.deepEqual([m.numerator, m.denominator], [1, 2]);
  assert.equal(m.pair.stopsCount, 3);
  assert.equal(m.pair.unresolvedCount, 1);
});

test('falseStopRate: изменение ДО остановки её не оправдывает — окно (stoppedAt, resolvedAt]', () => {
  const useful = computeFalseStopRate(STOP_JOURNALS.allFalse, CHANGE_FEEDS.oneUseful, { lead: LEADS.appointed });
  const before = computeFalseStopRate(STOP_JOURNALS.allFalse, CHANGE_FEEDS.onlyBeforeStops, { lead: LEADS.appointed });
  assert.equal(useful.value, 0.5);
  assert.equal(before.value, 1);
});

test('falseStopRate: «без ведения» (M6) и «все не разрешены» — свои причины, не хорошая цифра', () => {
  assert.equal(computeFalseStopRate(STOP_JOURNALS.mixed, CHANGE_FEEDS.oneUseful, { lead: LEADS.none }).reason, 'no-lead-appointed');
  assert.equal(computeFalseStopRate(STOP_JOURNALS.allUnresolved, CHANGE_FEEDS.none, { lead: LEADS.appointed }).reason, 'stops-unresolved');
});

test('falseStopRate: остановка без objectRef и род изменения вне списка — ошибка входа', () => {
  assert.throws(
    () => computeFalseStopRate(STOP_JOURNALS.noObjectRef, CHANGE_FEEDS.none, { lead: LEADS.appointed }),
    /дефект записи/u,
  );
  assert.throws(
    () => computeFalseStopRate(STOP_JOURNALS.allFalse, CHANGE_FEEDS.badKind, { lead: LEADS.appointed }),
    /вне закрытого перечня/u,
  );
});

// ─── честность отсутствия ─────────────────────────────────────────────────────────────────────

test('вывод: рядом с defined:false НИ ОДНОЙ цифры процента — правило проверяется машинно', () => {
  for (const reason of Object.keys(ABSENCE_REASONS)) {
    const rendered = renderMetricLine('мерка', absent(reason));
    assert.ok(!rendered.includes('%'), `«${reason}»: в строке появился процент`);
    // Строже процента: у неопределённой метрики в графе значения не должно быть НИ ОДНОЙ цифры —
    // любая цифра рядом с «не определена» немедленно читается как значение.
    assert.ok(!/\d/u.test(rendered), `«${reason}»: в строке появилась цифра`);
    assert.ok(rendered.includes('не определена'));
  }
});

test('вывод: причина вне алфавита и denominator = 0 — ошибки, а не «прочее»', () => {
  assert.throws(() => absent('всё-хорошо'), /вне закрытого алфавита/u);
  assert.throws(() => present({ value: 0, numerator: 0, denominator: 0, pair: {} }), /НЕ определена/u);
});

test('вывод: обе метрики неопределены → «КОРПУСА ОПЫТА НЕТ», не «всё хорошо» и не молчание', () => {
  const verdict = renderCorpusVerdict(absent('no-cut-forecast'), absent('no-stops-recorded'));
  assert.match(verdict, /КОРПУСА ОПЫТА НЕТ/u);
});

/** Только исполняемый код: комментарии и строковые литералы обсуждают запреты и не нарушают их. */
function codeOf(path) {
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/\/\/[^\n]*/gu, '')
    .replace(/'(?:[^'\\\n]|\\.)*'/gu, "''")
    .replace(/`(?:[^`\\]|\\.)*`/gu, '``');
}

test('зуб no-nullish-zero-in-metrics: `?? 0` и `|| 0` в метриках отсутствуют', () => {
  for (const file of ['absence.mjs', 'cut-accuracy.mjs', 'false-stop-rate.mjs', 'nominate.mjs']) {
    const code = codeOf(join(LIB, file));
    assert.ok(!/\?\?\s*0\b/u.test(code), `${file}: подстановка нуля через ?? — «не наблюдали» стало «наблюдали ноль»`);
    assert.ok(!/\|\|\s*0\b/u.test(code), `${file}: подстановка нуля через ||`);
  }
});

test('зуб детерминизма: Date.now / Math.random в блоке отсутствуют полностью', () => {
  const files = ['absence.mjs', 'cut-accuracy.mjs', 'false-stop-rate.mjs', 'forecast-record.mjs',
    'nominate.mjs', 'render-nominations.mjs', 'fixtures.mjs'].map((f) => join(LIB, f));
  files.push(CLI, fileURLToPath(import.meta.url));
  for (const f of files) {
    const code = codeOf(f);
    assert.ok(!/Date\.now\s*\(/u.test(code), `${f}: системные часы в коде блока`);
    assert.ok(!/Math\.random\s*\(/u.test(code), `${f}: недетерминированный источник в коде блока`);
  }
});

test('зуб «только номинация»: отбор не умеет писать файлы — в модуле нет fs', () => {
  const src = readFileSync(join(LIB, 'nominate.mjs'), 'utf8');
  assert.ok(!/node:fs/u.test(src));
  assert.ok(!/writeFileSync/u.test(src));
  assert.ok(!/docs\/cases/u.test(src.replace(/^\s*\*.*$/gmu, '')));
});

// ─── отбор ────────────────────────────────────────────────────────────────────────────────────

test('отбор: окно 7 — восьмой не выбрасывается молча, а получает beyond-read-budget', () => {
  const n = nominateRuns(runsFixture('rich'));
  assert.equal(n.ready.length, 7);
  assert.equal(n.thin, null);
  assert.deepEqual(n.ready.map((r) => r.runId), [
    'run-stop-1', 'run-cut-1', 'run-cut-2', 'run-cut-3', 'run-cut-4', 'run-stop-2', 'run-stop-3',
  ]);
  assert.deepEqual(n.waiting, [{ runId: 'run-stop-4', subject: 'stop', reason: 'beyond-read-budget', why: n.waiting[0].why }]);
});

test('отбор: порога по доле ложных остановок НЕТ — прогон с 50% номинируется (решение владельца 30.07)', () => {
  const n = nominateRuns(runsFixture('rich'));
  const half = n.ready.find((r) => r.runId === 'run-stop-3');
  assert.ok(half !== undefined, 'прогон с falseStopRate 0.5 отсечён — вернулась выдуманная граница');
  // Метрика печатается РЯДОМ с номинацией — это и заменяет отсечку.
  assert.equal(half.metric.defined, true);
  assert.equal(half.metric.value, 0.5);
  assert.match(renderMetricLine('доля ложных остановок', half.metric), /50\.0% \(2\/4\)/u);
});

test('отбор детерминирован: перевёрнутый вход даёт бит-в-бит тот же снимок', () => {
  const straight = nominateRuns(runsFixture('rich'));
  const reversed = nominateRuns([...runsFixture('rich')].reverse());
  assert.equal(JSON.stringify(reversed), JSON.stringify(straight));
});

test('отбор: тонкий корпус называется тонким — добора неточными прогонами нет', () => {
  const n = nominateRuns(runsFixture('thin'));
  assert.equal(n.ready.length, 2);
  assert.equal(n.thin, 'корпус тонкий: 2 из 5');
  assert.deepEqual(
    n.waiting.map((w) => w.reason).sort(),
    ['forecast-not-ratified', 'metric-undefined', 'not-accurate', 'not-substantive'],
  );
});

test('отбор: неразрешимый вещдок → waiting с причиной, а не молчаливый выброс', () => {
  const n = nominateRuns(runsFixture('rich'), { resolveRef: resolverBroken });
  assert.equal(n.ready.length, 0);
  assert.equal(n.waiting.length, 8);
  assert.ok(n.waiting.every((w) => w.reason === 'evidence-unresolved'));
  assert.ok(n.waiting[0].why.includes('не найден в индексе'));
});

test('снимок: шапка несёт «Только номинация» и «Руками не править», проценты — только у определённых', () => {
  const md = renderNominations(nominateRuns(runsFixture('thin')), {
    sprintId: 'cowork-honest-sprint', generatedAt: '2026-07-30T19:00:00Z', command: 'node scripts/sprint-experience.mjs --nominate thin',
  });
  assert.match(md, /\*\*Только номинация\*\*/u);
  assert.match(md, /Руками не править/u);
  assert.match(md, /корпус тонкий: 2 из 5/u);
  assert.match(md, /metric-undefined/u);
  assert.ok(!/не определена[^\n]*%/u.test(md));
});

// ─── CLI (собственный DoD) ────────────────────────────────────────────────────────────────────

const cli = (args) => execFileSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

test('DoD: --record cut-exact считает ОБЕ метрики на стабах и пишет записи рода', () => {
  const out = cli(['--record', 'cut-exact', '--dry-run']);
  assert.match(out, /Записей рода «предсказание ↔ исход»: 4 \(валидны все\)/u);
  assert.match(out, /точность нарезки: 100\.0% \(3\/3\)/u);
  assert.match(out, /доля ложных остановок: 50\.0% \(1\/2\)/u);
  assert.match(out, /--dry-run: журнал не тронут/u);
});

test('DoD: --record no-stops печатает словами, а не 0% (ноль остановок)', () => {
  const out = cli(['--record', 'no-stops', '--dry-run']);
  assert.match(out, /доля ложных остановок: не определена: остановок ноль/u);
  assert.ok(!/доля ложных остановок[^\n]*%/u.test(out));
});

test('DoD: --record all-false-stops → 100%, --record empty-corpus → «КОРПУСА ОПЫТА НЕТ»', () => {
  assert.match(cli(['--record', 'all-false-stops', '--dry-run']), /доля ложных остановок: 100\.0% \(2\/2\)/u);
  const empty = cli(['--record', 'empty-corpus', '--dry-run']);
  assert.match(empty, /КОРПУСА ОПЫТА НЕТ/u);
  assert.ok(!/%/u.test(empty.split('\n').filter((l) => l.includes('нарезки') || l.includes('остановок')).join('\n')));
});

test('CLI: все именованные наборы стабов проходят валидацию рода', () => {
  for (const name of Object.keys(STUB_SETS)) {
    const set = resolveStubSet(name);
    for (const rec of set.records) {
      const v = validateForecastRecord(rec);
      assert.deepEqual(v.problems, [], `${name}/${rec.id}`);
    }
  }
  assert.throws(() => resolveStubSet('нет-такого'), /неизвестный набор стабов/u);
});

test('CLI: неизвестный аргумент и пустой вызов — ненулевой код, а не тихий успех', () => {
  assert.throws(() => cli(['--выдумка']));
  assert.throws(() => cli([]));
});

test('DoD: --record пишет журнал рода и второй прогон его не дублирует (append-only)', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'forecast-')), 'records.jsonl');
  const first = cli(['--record', 'cut-exact', '--out', out]);
  assert.match(first, /добавлено 4, уже было 0, всего 4/u);
  const second = cli(['--record', 'cut-exact', '--out', out]);
  assert.match(second, /добавлено 0, уже было 4, всего 4/u);
  const written = readFileSync(out, 'utf8').split('\n').filter((l) => l.trim().length > 0).map((l) => JSON.parse(l));
  assert.equal(written.length, 4);
  assert.ok(written.every((r) => r.class === 'forecast'));
  assert.deepEqual(written.map((r) => r.subject), ['cut', 'stop', 'stop', 'stop']);
  for (const r of written) assert.deepEqual(validateForecastRecord(r).problems, []);
});

test('стабы: записи остановок собираются из журнала и ленты, useful — из следов', () => {
  const recs = stopRecordsFrom(STOP_JOURNALS.mixed, CHANGE_FEEDS.oneUseful);
  assert.deepEqual(recs.map((r) => r.outcome), ['hit', 'miss', 'not-observed']);
  assert.equal(recs[0].observed.useful, true);
  assert.equal(recs[2].observedAt, null);
  assert.ok(isLegalNo(recs[2].observed));
});

// ── Разговор с оператором: справка и ошибка входа ─────────────────────────────────────────
//
// Находки P1/P2 точечного ревью PR #1515 (02.08): `--help` выбрасывал необработанное исключение
// и оператор получал трассу вызовов, а коды возврата не были объявлены и расходились с
// соседними глаголами той же поставки. Зубы бьют по ПОВЕДЕНИЮ процесса, а не по разбору строки:
// именно наружу, в лицо оператору, дефект и выходил.

/** Прогон CLI с полным исходом: код возврата и оба потока, без исключения на ненулевом коде. */
function run(args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout ?? '', err: r.stderr ?? '' };
}

test('--help печатает справку и уходит нулём, а не стеком', () => {
  const r = run(['--help']);
  assert.equal(r.code, 0);
  assert.match(r.out, /Usage: yarn sprint:experience/u);
  assert.doesNotMatch(r.err, /at .*sprint-experience\.mjs:\d+/u, 'трассы вызовов в выводе нет');
});

test('-h равносилен --help — оператор ищет справку обоими', () => {
  const short = run(['-h']);
  const long = run(['--help']);
  assert.equal(short.code, 0);
  assert.equal(short.out, long.out);
});

test('неизвестный аргумент: одна строка причины, справка и код 2 — без исключения', () => {
  const r = run(['--такого-нет']);
  assert.equal(r.code, 2, 'ошибка входа — код 2, как у соседних глаголов поставки');
  assert.match(r.err, /ошибка входа: неизвестный аргумент/u);
  assert.match(r.err, /Usage: yarn sprint:experience/u, 'вместе с причиной показано, как звать верно');
  assert.doesNotMatch(r.err, /^\s+at .*:\d+:\d+/mu, 'стек наружу не выходит');
});

test('справка перечисляет коды возврата — они объявлены, а не подразумеваются', () => {
  const { out } = run(['--help']);
  assert.match(out, /Exit:.*0.*1.*2/su);
});

test('вызов без режима — тоже код 2, а не тихий ноль', () => {
  const r = run([]);
  assert.equal(r.code, 2);
});
