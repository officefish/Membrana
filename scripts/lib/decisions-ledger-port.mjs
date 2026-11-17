/**
 * Порт ведомости решённого: ФС → чистое ядро `decisions-ledger.mjs` (блок b2 спринта
 * `ritual-reads-decisions`). Один порт на трёх читателей — вечер, каркас дня, зуб утверждений;
 * вторая копия чтения планов или лент запрещена нарезкой (синонимы-фасады — тот же класс, что
 * два предиката свежести).
 *
 * Читает: планы `docs/sprint/cut/*.json` (только верхний уровень — `fixtures/` и `trail/` не
 * планы), ленты `docs/procedure-runs/trail/<day>.jsonl` за каждый день окна, реестр
 * `docs/tasks/registry.json`. Все суждения — в ядре.
 *
 * НЕЧИТАЕМОЕ ПЕЧАТАЕТСЯ СЛОВАМИ. Битый план или лента не роняют вечер и не исчезают молча:
 * они перечислены в блоке с причиной, и блок говорит, что о них не судит. Отсутствующая
 * лента дня — не находка (в тот день процедур могло не быть); отсутствующий реестр — находка.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  DECISIONS_WINDOW_DAYS,
  closedSprintRunsOf,
  formatDecisionsBlock,
  joinClosedSprintsWithCards,
  ratifiedDecisionsOf,
} from './decisions-ledger.mjs';
import { readProcedureRunTrail } from './procedure-run-journal.mjs';
import { sinceDayOf } from './review-done-ledger-port.mjs';

export const CUT_DIR_REL = 'docs/sprint/cut';
export const TRAIL_DIR_REL = 'docs/procedure-runs/trail';
export const REGISTRY_REL = 'docs/tasks/registry.json';

/** Дни окна включительно: `[sinceDay … today]`, строками YYYY-MM-DD. */
export function daysOfWindow(sinceDay, today) {
  const out = [];
  const end = new Date(`${today}T00:00:00Z`);
  const d = new Date(`${sinceDay}T00:00:00Z`);
  if (Number.isNaN(end.getTime()) || Number.isNaN(d.getTime())) return out;
  for (; d <= end; d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10));
  return out;
}

const DEFAULT_IO = Object.freeze({
  exists: (p) => existsSync(p),
  readFile: (p) => readFileSync(p, 'utf8'),
  readdir: (p) => readdirSync(p),
  readTrail: (root, rel) => readProcedureRunTrail(root, rel),
});

/**
 * Собрать ведомость решённого за окно.
 *
 * @param {{cwd?: string, today?: string, days?: number, io?: typeof DEFAULT_IO}} [opts]
 * @returns {{
 *   ok: boolean, sinceDay: string, block: string, unreadable: string[],
 *   decisions: ReturnType<typeof ratifiedDecisionsOf>,
 *   closedSprints: ReturnType<typeof joinClosedSprintsWithCards>,
 * }}
 */
export function collectDecisionsLedger(opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const days = opts.days ?? DECISIONS_WINDOW_DAYS;
  const io = { ...DEFAULT_IO, ...(opts.io ?? {}) };
  const sinceDay = sinceDayOf(today, days);
  const unreadable = [];

  // Планы нарезки — верхний уровень каталога, только .json.
  const plans = [];
  const cutDir = join(cwd, CUT_DIR_REL);
  if (io.exists(cutDir)) {
    for (const name of io.readdir(cutDir)) {
      if (!name.endsWith('.json')) continue;
      const rel = `${CUT_DIR_REL}/${name}`;
      try {
        plans.push({ path: rel, plan: JSON.parse(io.readFile(join(cwd, rel))) });
      } catch (e) {
        unreadable.push(`${rel}: ${e?.message ?? e}`);
      }
    }
  } else {
    unreadable.push(`${CUT_DIR_REL}: каталога планов нет`);
  }

  // Ленты прогонов — по дню окна; отсутствие ленты дня — не находка.
  const records = [];
  for (const day of daysOfWindow(sinceDay, today)) {
    const rel = `${TRAIL_DIR_REL}/${day}.jsonl`;
    if (!io.exists(join(cwd, rel))) continue;
    try {
      records.push(...io.readTrail(cwd, rel));
    } catch (e) {
      unreadable.push(`${rel}: ${e?.message ?? e}`);
    }
  }

  // Реестр — обязателен: без него сверка карточек невозможна, и это сказано словами.
  let tasks = [];
  try {
    const raw = JSON.parse(io.readFile(join(cwd, REGISTRY_REL)));
    tasks = Array.isArray(raw) ? raw : (raw?.tasks ?? []);
  } catch (e) {
    unreadable.push(`${REGISTRY_REL}: ${e?.message ?? e} — состояние карточек не сверено`);
  }

  const decisions = ratifiedDecisionsOf(plans, { sinceDay });
  const closedSprints = joinClosedSprintsWithCards(closedSprintRunsOf(records, { sinceDay }), tasks);
  const block = formatDecisionsBlock({ decisions, closedSprints, sinceDay, unreadable });
  return { ok: unreadable.length === 0, sinceDay, block, unreadable, decisions, closedSprints };
}
