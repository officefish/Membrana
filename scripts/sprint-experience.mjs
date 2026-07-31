#!/usr/bin/env node
/**
 * sprint-experience — CLI четвёртого рода записи памяти «моё предсказание ↔ его исход».
 *
 * Phase 2 (изолированная сборка): работает ЦЕЛИКОМ на своих стабах, кода соседей не касается.
 * Запуск — `node scripts/sprint-experience.mjs …`; записи в `package.json` вносятся на интеграции.
 *
 *   node scripts/sprint-experience.mjs --list-stubs
 *   node scripts/sprint-experience.mjs --record cut-exact
 *   node scripts/sprint-experience.mjs --record no-stops --dry-run
 *   node scripts/sprint-experience.mjs --nominate rich --now 2026-07-30T19:00:00Z
 *
 * Детерминизм: `Date.now()` и `Math.random()` отсутствуют. `--now` — ПАРАМЕТР; без него берётся
 * фикстурный литерал, и об этом сказано в выводе, а не умолчано.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderCorpusVerdict, renderMetricLine } from './lib/sprint-experience/absence.mjs';
import { computeCutAccuracy, renderWithoutOutcome } from './lib/sprint-experience/cut-accuracy.mjs';
import { computeFalseStopRate, renderUnresolved } from './lib/sprint-experience/false-stop-rate.mjs';
import { checkAppendOnly, validateForecastRecord } from './lib/sprint-experience/forecast-record.mjs';
import { NOW, STUB_SETS, resolveStubSet, runsFixture } from './lib/sprint-experience/fixtures.mjs';
import { nominateRuns } from './lib/sprint-experience/nominate.mjs';
import { renderNominations } from './lib/sprint-experience/render-nominations.mjs';
import { makeForecastRecord } from './lib/sprint-experience/forecast-record.mjs';
import { planToForecast } from './lib/sprint-integration/plan-to-forecast.mjs';
import { planToGate } from './lib/sprint-integration/plan-to-gate.mjs';
import { gateToForecastObserved } from './lib/sprint-integration/gate-to-forecast.mjs';
import { runGate } from './lib/execution-trace/gate.mjs';
import { loadKnownPersonas } from './lib/execution-trace/personas.mjs';
import { RESPONSIBILITY_WAIVER_REASONS } from './lib/execution-trace/stubs/stub-responsibility-modes.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ZONE = join(REPO_ROOT, 'docs', 'sprint', 'experience');
const RECORDS_PATH = join(ZONE, 'forecast-records.jsonl');
const SNAPSHOT_PATH = join(ZONE, 'RUN_NOMINATIONS.md');

function parseArgs(argv) {
  const args = { record: null, nominate: null, now: null, out: null, dryRun: false, listStubs: false, json: false, plan: null, traces: null, segments: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--record') { args.record = argv[i + 1]; i += 1; }
    else if (a === '--out') { args.out = argv[i + 1]; i += 1; }
    else if (a === '--nominate') { args.nominate = argv[i + 1] === undefined || argv[i + 1].startsWith('--') ? 'rich' : argv[++i]; }
    else if (a === '--now') { args.now = argv[i + 1]; i += 1; }
    else if (a === '--plan') { args.plan = argv[i + 1]; i += 1; }
    else if (a === '--traces') { args.traces = argv[i + 1]; i += 1; }
    else if (a === '--segments') { args.segments = argv[i + 1]; i += 1; }
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--list-stubs') args.listStubs = true;
    else if (a === '--json') args.json = true;
    else throw new Error(`неизвестный аргумент «${a}»`);
  }
  return args;
}

/** Прочитать журнал рода. Отсутствие файла — пустой журнал, не ошибка. */
function readRecords(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').split('\n').filter((l) => l.trim().length > 0).map((l) => JSON.parse(l));
}

/** Дописать журнал рода с проверкой append-only. Молча не перезаписываем никогда. */
function appendRecords(path, fresh) {
  const before = readRecords(path);
  const known = new Set(before.map((r) => r.id));
  const added = fresh.filter((r) => !known.has(r.id));
  const after = [...before, ...added];
  const guard = checkAppendOnly(before, after);
  if (!guard.ok) throw new Error(`append-only нарушен: ${guard.problems.join('; ')}`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${after.map((r) => JSON.stringify(r)).join('\n')}\n`, 'utf8');
  return { added: added.length, skipped: fresh.length - added.length, total: after.length };
}

function reportMetrics(set) {
  const cutAccuracy = computeCutAccuracy(set.records);
  const falseStopRate = computeFalseStopRate(set.stops, set.changes, { lead: set.lead });
  const lines = [
    `Набор стабов: ${set.name} · окно ${set.window.openedAt}..${set.window.closedAt}`,
    `Ожидаемый ответ фикстуры: ${set.expect}`,
    '',
    renderMetricLine('точность нарезки', cutAccuracy),
  ];
  const without = renderWithoutOutcome(cutAccuracy);
  if (without.length > 0) lines.push(`  ${without}`);
  lines.push(renderMetricLine('доля ложных остановок', falseStopRate));
  const unresolved = renderUnresolved(falseStopRate);
  if (unresolved.length > 0) lines.push(`  ${unresolved}`);
  lines.push('', renderCorpusVerdict(cutAccuracy, falseStopRate));
  return { cutAccuracy, falseStopRate, text: lines.join('\n') };
}

/**
 * Собрать запись рода из ЖИВЫХ файлов спринта — третий доживший до прода стаб, снятый.
 *
 * До этого `--record` принимал ТОЛЬКО фикстуры, поэтому петля опыта не видела ни одного
 * настоящего предсказания: тимлид резал, владелец ратифицировал, гейт судил — и ничего из
 * этого в память не попадало. Метрика жила на выдуманных числах и потому не могла сказать
 * ничего о том, кто как режет на самом деле.
 *
 * Адаптеры `planToForecast` и `gateToForecastObserved` существовали и были оттестированы;
 * не было провода. Тот же род дефекта, что у шва плана к гейту, только на выходе контура.
 *
 * ОБЪЁМ НЕ БЕРЁТСЯ ИЗ ГЕЙТА и не выдумывается: гейт объёма не считает вовсе. Замер приходит
 * файлом `--segments`; блок без замера даёт `no-attribution`, а не «уложился».
 */
function buildLiveRecord(args) {
  const problems = [];
  const readJson = (path, what) => {
    if (path === null || path === undefined) return null;
    if (!existsSync(path)) { problems.push(`${what}: файла нет — ${path}`); return null; }
    try { return JSON.parse(readFileSync(path, 'utf8')); } catch (e) { problems.push(`${what}: не разбирается — ${String(e.message ?? e)}`); return null; }
  };

  const plan = readJson(args.plan, 'план');
  if (plan !== null && plan?.schema !== 'sprint-cut/1') {
    problems.push(`план: schema=${plan?.schema === undefined ? '(нет)' : String(plan.schema)} — ожидается «sprint-cut/1»`);
  }
  if (args.traces === null) problems.push('исход не назван: без --traces запись была бы предсказанием без исхода');
  else if (!existsSync(args.traces)) {
    // FAIL-CLOSED. Пустая лента при указанном пути делала бы опечатку в имени файла
    // неотличимой от честного «исполнения не было»: гейт объявил бы plan_lied по всем
    // блокам, и запись рода зафиксировала бы это как наблюдённый исход. Молчаливый
    // зелёный наоборот — молчаливый красный, но врёт он ровно так же.
    problems.push(`лента вещдоков: файла нет — ${args.traces}`);
  }
  if (problems.length > 0) return { record: null, problems, unattributed: [] };

  const forecast = planToForecast(plan);
  const { planRaw } = planToGate(plan);
  const traceLines = readFileSync(args.traces, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '');
  const records = [];
  traceLines.forEach((l, i) => {
    try { records.push(JSON.parse(l)); } catch { problems.push(`лента вещдоков: строка ${i + 1} не разбирается`); }
  });
  const report = runGate({
    planRaw,
    traceRecords: records,
    knownPersonas: loadKnownPersonas(),
    allowedReasons: RESPONSIBILITY_WAIVER_REASONS,
    resolveRef: (ref) => typeof ref === 'string' && ref.trim() !== '' && existsSync(join(REPO_ROOT, ref)),
  });

  const segDoc = readJson(args.segments, 'замер объёма');
  // Второй заслон, а не дубль первого: `readJson` копит дефекты выше по потоку, и без
  // этой проверки они молча тонули — финальный `return` подменял их вердиктом валидатора.
  // Битый `--segments` превращался в «замера нет», то есть в честное на вид `not-observed`.
  if (problems.length > 0) return { record: null, problems, unattributed: [] };
  const segments = (Array.isArray(segDoc?.segments) ? segDoc.segments : [])
    .map((s) => ({ cutBlockId: s.cutBlockId ?? s.blockId, changedLines: s.changedLines }));
  const observed = gateToForecastObserved(report, segments);
  const measured = new Set(segments.map((s) => s.cutBlockId));

  // РАСХОЖДЕНИЕ ИМЕНИ ПОЛЯ, названное и не спрятанное. Контракт интерфейса §G9 разрешил спор
  // в пользу `blockId` («дом поля у автора плана»), и адаптер `planToForecast` его исполняет.
  // Потребитель — валидатор рода и мерка точности — по сей день читает `cutBlockId`: решение
  // ратифицировали, в код стороны C не внесли. Перевод делается ЗДЕСЬ, в шве, а не правкой
  // адаптера: адаптер прав по контракту, неправа сторона C, и переименование её полей —
  // отдельная работа с её фикстурами. Долг записан, не замазан.
  const predicted = {
    blocks: forecast.predicted.blocks.map((b) => ({ ...b, cutBlockId: b.blockId })),
  };
  const unattributed = forecast.predicted.blocks.map((b) => b.blockId).filter((id) => !measured.has(id));

  // Исход ЗАПИСИ выводится из исходов по блокам, а не из факта наличия замера. `hit` при
  // двух промахах внутри был бы агрегатом, который врёт: читатель журнала увидел бы удачное
  // предсказание там, где два блока из семи переполнились. «Почти» в алфавите нет, поэтому
  // хоть один промах делает запись `miss` — точную долю считает `computeCutAccuracy`.
  const missed = predicted.blocks.filter((b) => {
    const observedLines = measured.has(b.cutBlockId)
      ? segments.find((s) => s.cutBlockId === b.cutBlockId).changedLines
      : null;
    if (observedLines === null) return false;
    return (observedLines > b.threshold) !== (b.claim === 'does-not-fit');
  });
  const recordOutcome = segments.length === 0 ? 'not-observed' : missed.length === 0 ? 'hit' : 'miss';

  const record = makeForecastRecord({
    ...forecast,
    predicted,
    observed,
    observedAt: args.now,
    outcome: recordOutcome,
    evidence: [
      { type: 'path', value: args.plan },
      { type: 'path', value: args.traces },
    ],
    provenance: { planRef: args.plan },
  });

  const v = validateForecastRecord(record);
  // Дефекты складываются, а не подменяются: накопленное выше по потоку исчезало, когда
  // валидатор говорил «годно» — и запись уезжала в журнал с потерянной диагностикой.
  return { record, problems: [...problems, ...(v.ok ? [] : v.problems)], unattributed, outcome: recordOutcome };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = args.now === null ? NOW : args.now;
  const nowNote = args.now === null ? ' (фикстурный литерал: --now не задан)' : '';

  if (args.listStubs) {
    for (const [name, s] of Object.entries(STUB_SETS)) console.log(`${name.padEnd(18)} ${s.expect}`);
    return 0;
  }

  if (args.record !== null) {
    const set = resolveStubSet(args.record);
    const problems = [];
    for (const rec of set.records) {
      const v = validateForecastRecord(rec);
      if (!v.ok) problems.push(`${rec.id}: ${v.problems.join('; ')}`);
    }
    if (problems.length > 0) {
      console.error('невалидные записи рода — отвергнуты С ПРИЧИНОЙ:');
      for (const p of problems) console.error(`  - ${p}`);
      return 1;
    }
    const metrics = reportMetrics(set);
    if (args.json) {
      console.log(JSON.stringify({ set: set.name, records: set.records, cutAccuracy: metrics.cutAccuracy, falseStopRate: metrics.falseStopRate }, null, 2));
    } else {
      console.log(`Записей рода «предсказание ↔ исход»: ${set.records.length} (валидны все)`);
      console.log(metrics.text);
      if (args.dryRun) console.log('\n--dry-run: журнал не тронут');
      else {
        // Дом журнала в Phase 2 — своя зона. Настоящий дом рода — `archive/<persona>.jsonl`,
        // и вшивает его адаптер интеграции: провода вне зоны блока не трогаются.
        const path = args.out === null ? RECORDS_PATH : args.out;
        const w = appendRecords(path, set.records);
        console.log(`\nЖурнал: ${path} · добавлено ${w.added}, уже было ${w.skipped}, всего ${w.total}`);
      }
    }
    return 0;
  }

  if (args.plan !== null) {
    const built = buildLiveRecord(args);
    if (built.problems.length > 0) {
      console.error('запись рода НЕ собрана — отвергнута с причиной:');
      for (const p of built.problems) console.error(`  - ${p}`);
      return 2;
    }
    const metrics = computeCutAccuracy([built.record]);
    // При `--json` в stdout идёт ТОЛЬКО запись: машиночитаемая выдача, разбавленная прозой,
    // машиночитаемой не является. Проза уходит в stderr — она нужна человеку и там же видна.
    const say = args.json ? (s) => console.error(s) : (s) => console.log(s);
    say(`Запись рода собрана из ЖИВЫХ файлов: ${built.record.id} · исход записи: ${built.outcome}`);
    say(renderMetricLine('точность нарезки', metrics));
    if (built.unattributed.length > 0) {
      // Блок без замера объёма — это `no-attribution`, а не «уложился». Печатаем поимённо:
      // иначе доля посчиталась бы по неполному множеству, и причина осталась бы невидимой.
      say(`без замера объёма: ${built.unattributed.join(', ')} — в мерку не входят`);
    }
    if (args.json) console.log(JSON.stringify(built.record, null, 2));
    if (args.dryRun) say('\n--dry-run: журнал не тронут');
    else {
      const path = args.out === null ? RECORDS_PATH : args.out;
      mkdirSync(dirname(path), { recursive: true });
      const w = appendRecords(path, [built.record]);
      say(`\nЖурнал: ${path} · добавлено ${w.added}, уже было ${w.skipped}, всего ${w.total}`);
    }
    return 0;
  }

  if (args.nominate !== null) {
    const runs = runsFixture(args.nominate);
    const nomination = nominateRuns(runs);
    const md = renderNominations(nomination, {
      sprintId: `фикстурные прогоны «${args.nominate}» (Phase 2, стабы соседей)`,
      generatedAt: now,
      command: `node scripts/sprint-experience.mjs --nominate ${args.nominate}`,
    });
    if (args.dryRun || args.json) console.log(args.json ? JSON.stringify(nomination, null, 2) : md);
    else {
      mkdirSync(ZONE, { recursive: true });
      writeFileSync(SNAPSHOT_PATH, md, 'utf8');
      console.log(`Снимок номинаций: docs/sprint/experience/RUN_NOMINATIONS.md${nowNote}`);
      console.log(`Готовы: ${nomination.ready.length} · не готовы: ${nomination.waiting.length}${nomination.thin === null ? '' : ` · ${nomination.thin}`}`);
      console.log('Только номинация — запись в канон делает человек по слову владельца.');
    }
    return 0;
  }

  console.error('нужен один из: --record <набор> | --nominate [rich|thin] | --list-stubs');
  return 2;
}

process.exitCode = main();
