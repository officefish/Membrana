/**
 * captain-notebook — тетрадь наблюдений капитана (M6, #1352). Свободный контур:
 * append-only журнал по сессии, у записи ОДИН флаг uttered («озвучено на мостике»).
 *
 * Законы M6 (красные линии):
 *  - БЕЗ машины погашения: у наблюдения нет status-machine, оно не «гасится»;
 *  - БЕЗ стоп-гейтов: тетрадь не входит в антецедент gate.parrot_live_if_debts,
 *    close НЕ требует all-uttered — в квитанцию идут только счётчики;
 *  - наблюдение само НЕ становится долгом: этот модуль не импортирует debt-engine
 *    и не порождает debt-событий; мост в долг — только явный жест капитана
 *    через yarn bridge:debt birth (запрет auto obs → debt.birth, DoD п.3);
 *  - пусто — норма («наблюдения: 0» — честная строка, не заглушка).
 *
 * Home: docs/bridge/<session>/observations.jsonl (session tree, append-only).
 * Чистая свёртка — без ФС; ФС в фасадах и CLI.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** @typedef {{id:string, body:string, sessionId:string, uttered:boolean, at:string, utteredAt:string|null}} CaptainObservation */

export function notebookRel(sessionId) {
  return `docs/bridge/${sessionId}/observations.jsonl`;
}

/**
 * Свёртка журнала: append + mark_uttered. Правка задним числом невозможна —
 * только событие поверх.
 * @param {object[]} events
 * @returns {Map<string, CaptainObservation>}
 */
export function foldNotebook(events) {
  const state = new Map();
  for (const e of events ?? []) {
    if (!e || typeof e !== 'object') continue;
    if (e.verb === 'append' && e.id && String(e.body ?? '').trim()) {
      if (state.has(e.id)) continue; // id не переписывается
      state.set(e.id, { id: e.id, body: e.body, sessionId: e.sessionId ?? '', uttered: false, at: e.at ?? '', utteredAt: null });
    } else if (e.verb === 'uttered') {
      const o = state.get(e.id);
      if (!o || o.uttered) continue; // идемпотентно
      state.set(e.id, { ...o, uttered: true, utteredAt: e.at ?? '' });
    }
  }
  return state;
}

/** Счётчики для квитанции закрытия (close_receipt, M6 DoD п.5) — факт, не принуждение. */
export function notebookCounts(state) {
  let uttered = 0;
  for (const o of state.values()) if (o.uttered) uttered += 1;
  return { total: state.size, uttered, unuttered: state.size - uttered };
}

export function readNotebook(repoRoot, sessionId) {
  const p = join(repoRoot, notebookRel(sessionId));
  const events = [];
  if (!existsSync(p)) return events;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/u)) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      /* битая строка — находка CLI при list */
    }
  }
  return events;
}

export function appendNotebookEvent(repoRoot, sessionId, event) {
  const p = join(repoRoot, notebookRel(sessionId));
  mkdirSync(dirname(p), { recursive: true });
  appendFileSync(p, JSON.stringify(event) + '\n', 'utf8');
}
