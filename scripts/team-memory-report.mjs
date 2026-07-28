#!/usr/bin/env node
/**
 * yarn team-memory:report — вечерний отчёт памяти команды (#1366 ч.1, token 121).
 *
 * Детерминированный: git diff журналов docs/virtual-team/memory/ за диапазон →
 * три строки на персону. Без LLM, без сети. Вытеснение — поимённо (вещдок-мотив:
 * 27.07 семь позиций Дынина исчезли молча).
 *
 *   yarn team-memory:report                  # с полуночи прошлых суток до HEAD+рабочее дерево
 *   yarn team-memory:report --since <ref>    # явная база сравнения (ref или дата git)
 *
 * Выход: stdout + docs/seanses/team-memory-report-<дата>.md (повторный прогон дня
 * ДОПИСЫВАЕТ секцию с меткой времени — перезапись дня недопустима).
 * Exit: 0 — чисто · 3 — есть вытеснение (находка, не отказ; по образцу leveling).
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseMemoryDiff, renderMemoryReport } from './lib/team-memory-report.mjs';
import { opLogRel, parseOpLog } from './persona-memory/lib/op-log.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const MEMORY_DIR = 'docs/virtual-team/memory';

const argv = process.argv.slice(2);
const argOf = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : null;
};

function baseRef() {
  const since = argOf('since');
  if (since) return since;
  // База по умолчанию: последний коммит ДО сегодняшней полуночи — «что помнили вчера».
  const today = new Date().toISOString().slice(0, 10);
  const sha = execFileSync(
    'git', ['log', '-1', '--format=%H', `--before=${today}T00:00:00`, '--', MEMORY_DIR],
    { cwd: repoRoot, encoding: 'utf8' },
  ).trim();
  return sha || null;
}

function main() {
  const base = baseRef();
  if (!base) {
    console.log('[team-memory] базы для сравнения нет (журналы моложе суток?) — отчёт пуст, это честно.');
    return;
  }
  const diff = execFileSync('git', ['diff', base, 'HEAD', '--', MEMORY_DIR], {
    cwd: repoRoot, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  });
  const dirty = execFileSync('git', ['diff', '--', MEMORY_DIR], {
    cwd: repoRoot, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  });

  const byPersona = parseMemoryDiff(diff + '\n' + dirty);
  const date = new Date().toISOString().slice(0, 10);
  // Полный список персон из каталога: «изменений нет» видно по каждой, не молчанием.
  const personas = readdirSync(join(repoRoot, MEMORY_DIR))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/u, ''))
    .sort();
  // Межа №5: причины перетока из сегодняшнего op-log (transfer ≠ потеря).
  const reasonsByPersona = {};
  for (const p of personas) {
    const logAbs = join(repoRoot, opLogRel(p, date));
    if (!existsSync(logAbs)) continue;
    const { entries } = parseOpLog(readFileSync(logAbs, 'utf8'));
    const map = new Map();
    for (const e of entries ?? []) {
      if (e.verb === 'transfer_to_archive' && e.ref && e.reason) map.set(e.ref, e.reason);
    }
    if (map.size) reasonsByPersona[p] = map;
  }

  const { markdown, totals, regression } = renderMemoryReport(byPersona, { date, personas, reasonsByPersona });

  console.log(markdown);

  const outPath = join(repoRoot, `docs/seanses/team-memory-report-${date}.md`);
  if (existsSync(outPath)) {
    appendFileSync(outPath, `\n---\n<!-- повторный прогон ${new Date().toISOString()} -->\n\n${markdown}`, 'utf8');
  } else {
    writeFileSync(outPath, `<!-- канал: код — yarn team-memory:report (детерминированный, без LLM); база: ${base.slice(0, 12)} -->\n\n${markdown}`, 'utf8');
  }
  console.error(`→ отчёт: docs/seanses/team-memory-report-${date}.md (записано ${totals.added} · вытеснено ${totals.evicted})`);
  if (totals.evicted > 0) process.exitCode = 3; // находка, не отказ
  if (regression) console.error('⚠ регрессия: вытеснено больше, чем записано.');
}

main();
