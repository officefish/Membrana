#!/usr/bin/env node
/**
 * yarn procedure-runs:digest [--days N] [--date YYYY-MM-DD] [--pillars a,b] [--json] [--daily]
 *
 * Первый читатель ленты журнала прогонов (#1861, п.1 #1626): ленты за окно →
 * сводка по пяти опорам. --daily пишет датированный артефакт в docs/seanses/
 * (шаг вечерней цепочки; артефакт уезжает автозабором ritual-artifacts).
 * Читатель ничего не чинит и не мутирует ленту.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FIVE_PILLARS,
  buildProcedureRunsDigest,
  renderProcedureRunsDigest,
} from './lib/procedure-runs-digest.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const TRAIL_DIR_REL = join('docs', 'procedure-runs', 'trail');

/**
 * @param {string[]} argv
 */
export function parseDigestArgs(argv) {
  const out = { days: 7, date: null, pillars: null, json: false, daily: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--days') {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n < 1) throw new Error('--days: целое ≥ 1');
      out.days = n;
    } else if (a === '--date') {
      const next = argv[++i];
      if (!/^\d{4}-\d{2}-\d{2}$/u.test(next ?? '')) throw new Error('--date: YYYY-MM-DD');
      out.date = next;
    } else if (a === '--pillars') {
      const next = argv[++i];
      if (!next) throw new Error('--pillars требует csv-список');
      out.pillars = next.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (a === '--json') out.json = true;
    else if (a === '--daily') out.daily = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`неизвестный флаг: ${a}`);
  }
  return out;
}

/**
 * Прочитать записи лент за окно дней. Файлы выбираются по имени
 * (`YYYY-MM-DD.jsonl`), нечитаемые строки — в problems, не молча.
 *
 * @param {string} cwd
 * @param {{ sinceDay: string, untilDay: string }} range дни включительно
 * @returns {{ records: object[], problems: string[] }}
 */
export function readTrailWindow(cwd, { sinceDay, untilDay }) {
  const dir = join(cwd, TRAIL_DIR_REL);
  /** @type {object[]} */
  const records = [];
  /** @type {string[]} */
  const problems = [];
  if (!existsSync(dir)) {
    problems.push(`ленты нет: ${TRAIL_DIR_REL}`);
    return { records, problems };
  }
  const files = readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/u.test(f))
    .filter((f) => {
      const day = f.slice(0, 10);
      return day >= sinceDay && day <= untilDay;
    })
    .sort();
  for (const file of files) {
    const text = readFileSync(join(dir, file), 'utf8');
    const lines = text.split(/\r?\n/u);
    lines.forEach((line, i) => {
      const s = line.trim();
      if (!s || s.startsWith('#')) return;
      try {
        records.push(JSON.parse(s));
      } catch {
        problems.push(`${file}:${i + 1}: не JSON — строка пропущена`);
      }
    });
  }
  return { records, problems };
}

/** @param {Date} d */
function dayOf(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string, now?: Date, log?: (s: string) => void }} [deps]
 * @returns {number}
 */
export function runProcedureRunsDigest(argv, deps = {}) {
  const cwd = deps.cwd ?? root;
  const log = deps.log ?? console.log;
  let args;
  try {
    args = parseDigestArgs(argv);
  } catch (e) {
    console.error(`procedure-runs:digest: ${e instanceof Error ? e.message : e}`);
    return 2;
  }
  if (args.help) {
    log(`Usage:
  yarn procedure-runs:digest [--days N] [--date YYYY-MM-DD] [--pillars a,b] [--json] [--daily]

  Сводка ленты журнала прогонов (${TRAIL_DIR_REL}) по пяти опорам за окно.
  --date — правая граница окна (для повторяемых прогонов), по умолчанию сегодня.
  --daily — записать артефакт docs/seanses/procedure-runs-digest-<date>.md.
  Дисциплина: читатель, ленты не мутирует; нулевая опора — «0 прогонов», не молчание.`);
    return 0;
  }

  const now = deps.now ?? new Date();
  const untilDay = args.date ?? dayOf(now);
  const untilMs = Date.parse(`${untilDay}T23:59:59.999Z`);
  const sinceMs = untilMs - (args.days - 1) * 24 * 60 * 60 * 1000;
  const sinceDay = dayOf(new Date(sinceMs)).slice(0, 10);

  const { records, problems: readProblems } = readTrailWindow(cwd, { sinceDay, untilDay });
  const digest = buildProcedureRunsDigest(records, {
    pillars: args.pillars ?? FIVE_PILLARS,
    since: `${sinceDay}T00:00:00.000Z`,
    until: new Date(untilMs).toISOString(),
  });
  digest.problems.unshift(...readProblems);

  if (args.json) {
    log(JSON.stringify(digest, null, 2));
  } else {
    log(renderProcedureRunsDigest(digest, {
      title: `Витрина пяти опор — прогоны процедур за ${args.days} дн. (по ${untilDay})`,
    }));
  }

  if (args.daily) {
    const outRel = join('docs', 'seanses', `procedure-runs-digest-${untilDay}.md`);
    writeFileSync(join(cwd, outRel), renderProcedureRunsDigest(digest, {
      title: `Витрина пяти опор — прогоны процедур за ${args.days} дн. (по ${untilDay})`,
    }), 'utf8');
    console.error(`[procedure-runs:digest] артефакт: ${outRel}`);
  }
  return 0;
}

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('/procedure-runs-digest.mjs')) {
  process.exitCode = runProcedureRunsDigest(process.argv.slice(2));
}
