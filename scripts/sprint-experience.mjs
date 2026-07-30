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

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ZONE = join(REPO_ROOT, 'docs', 'sprint', 'experience');
const RECORDS_PATH = join(ZONE, 'forecast-records.jsonl');
const SNAPSHOT_PATH = join(ZONE, 'RUN_NOMINATIONS.md');

function parseArgs(argv) {
  const args = { record: null, nominate: null, now: null, out: null, dryRun: false, listStubs: false, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--record') { args.record = argv[i + 1]; i += 1; }
    else if (a === '--out') { args.out = argv[i + 1]; i += 1; }
    else if (a === '--nominate') { args.nominate = argv[i + 1] === undefined || argv[i + 1].startsWith('--') ? 'rich' : argv[++i]; }
    else if (a === '--now') { args.now = argv[i + 1]; i += 1; }
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
