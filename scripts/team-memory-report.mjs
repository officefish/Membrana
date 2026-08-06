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
import { fileURLToPath, pathToFileURL } from 'node:url';

import { parseMemoryDiff, renderMemoryReport } from './lib/team-memory-report.mjs';
import { opLogRel, parseOpLog } from './persona-memory/lib/op-log.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const MEMORY_DIR = 'docs/virtual-team/memory';

/**
 * Сводка всплытия персоны за день из событий её журнала.
 *
 * Собирает ФАКТЫ и только их — суждение о состоянии («всплыло» против «лифт не звали»)
 * выносит чистый модуль отчёта. Граница та же, что уже держит причины перетока: CLI
 * приносит данные, модуль их именует. Классифицировать здесь значило бы спрятать
 * классификатор за файловой системой и лишить его зуба.
 *
 * `cloud_query` считается отдельно от актов нарочно: без него «архив не дал кандидатов» и
 * «лифт сегодня не звали» неразличимы, а это разные дни персоны.
 *
 * @param {Array<{verb: string, ref?: string, reason?: string}>} entries
 * @returns {{cloudQueries: number, invocations: Array<{outcome: string, ref?: string, reason?: string}>}}
 */
export function summarizeSurfacing(entries) {
  const summary = { cloudQueries: 0, invocations: [] };
  for (const e of entries ?? []) {
    if (e.verb === 'cloud_query') summary.cloudQueries += 1;
    else if (e.verb === 'emerge') summary.invocations.push({ outcome: 'emerge', ref: e.ref, reason: e.reason });
    else if (e.verb === 'reject') summary.invocations.push({ outcome: 'reject', ref: e.ref, reason: e.reason });
  }
  return summary;
}

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
  // Всплытие едет тем же ходом: журнал уже открыт, и второй проход по нему был бы лишним.
  const surfacingByPersona = {};
  for (const p of personas) {
    const logAbs = join(repoRoot, opLogRel(p, date));
    if (!existsSync(logAbs)) continue;
    // `parseOpLog` возвращает `{events, broken}`. Прежде здесь разбиралось `{entries}` —
    // поля с таким именем у разбора НЕТ, поэтому цикл ниже не выполнялся ни разу, и межа
    // №5 («причина отличает переток от потери») молча не работала с самого написания:
    // отчёт печатал «v1 = ПОТЕРЯНО» при существующих причинах. Поймано зубом проводки.
    const { events: entries } = parseOpLog(readFileSync(logAbs, 'utf8'));
    const map = new Map();
    for (const e of entries ?? []) {
      if (e.verb === 'transfer_to_archive' && e.ref && e.reason) map.set(e.ref, e.reason);
    }
    if (map.size) reasonsByPersona[p] = map;
    surfacingByPersona[p] = summarizeSurfacing(entries);
  }

  const { markdown, totals, regression } = renderMemoryReport(byPersona, {
    date,
    personas,
    reasonsByPersona,
    surfacingByPersona,
  });

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

// Прогон только при прямом вызове — образец из `_ssh-cabinet-*.mjs`. Без этой оговорки
// импорт `summarizeSurfacing` зубом дёргал бы git по всему дереву и ДОПИСЫВАЛ отчёт дня в
// docs/seanses: зуб, меняющий состояние репозитория, — не зуб.
if (pathToFileURL(process.argv[1] ?? '').href === import.meta.url) {
  main();
}
