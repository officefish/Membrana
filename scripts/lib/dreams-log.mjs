/**
 * Append-only лог снов v2 (M5). Единственный писатель на уровне контракта —
 * вызывающий (office). 24 сна/сутки лежат все; 6 победителей — derived через
 * `digest`/`select` из dreams-select, не мутация записей.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { digest, select } from './dreams-select.mjs';

export const DREAM_MASTER_AUTHOR = 'Мастер снов';

/**
 * Версия автора = промпт: читает `DREAM_MASTER_VERSION` из файла промпта,
 * иначе короткий sha1 содержимого (анти-«молчун» — версия всегда есть).
 * @param {string} promptMd
 * @returns {string}
 */
export function dreamMasterVersion(promptMd) {
  const m = String(promptMd ?? '').match(/##\s*DREAM_MASTER_VERSION\s*\n+`([^`]+)`/u);
  if (m?.[1]?.trim()) return m[1].trim();
  const h = createHash('sha1').update(String(promptMd ?? '')).digest('hex').slice(0, 8);
  return `sha1:${h}`;
}

/**
 * Ключ слота суток: day + hour. Дедуп: один час — одна запись в логе дня.
 * @param {{day: string, hour: number}} e
 */
export function slotKey(e) {
  return `${e.day}#${Number(e.hour)}`;
}

/**
 * Валидация события перед append. Нет пары (кроме skipped) → отказ громко.
 * @param {object} event
 * @returns {{ok: true, event: object} | {ok: false, reason: string}}
 */
export function validateDreamEvent(event) {
  if (!event || typeof event !== 'object') return { ok: false, reason: 'event missing' };
  const day = String(event.day ?? '');
  const hour = Number(event.hour);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(day)) return { ok: false, reason: 'day YYYY-MM-DD required' };
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return { ok: false, reason: 'hour 0..23 required' };
  const status = event.status;
  if (!['synthesized', 'synthesisFailed', 'skipped'].includes(status)) {
    return { ok: false, reason: 'status must be synthesized|synthesisFailed|skipped' };
  }
  if (status !== 'skipped') {
    const pair = event.pair;
    if (!Array.isArray(pair) || pair.length !== 2 || !pair[0] || !pair[1]) {
      return { ok: false, reason: 'pair [ThesisRef, ThesisRef] required (анти-молчун)' };
    }
    if (!Array.isArray(event.attempts)) {
      return { ok: false, reason: 'attempts[] required in provenance' };
    }
  }
  const author = event.author ?? DREAM_MASTER_AUTHOR;
  const version = event.version;
  if (!version) return { ok: false, reason: 'version (prompt) required' };
  return {
    ok: true,
    event: {
      ...event,
      day,
      hour,
      author,
      version,
      id: event.id ?? `${day}-h${String(hour).padStart(2, '0')}`,
      recordedAt: event.recordedAt ?? new Date().toISOString(),
    },
  };
}

/**
 * In-memory / file JSONL store. File backend — append-only; rewrite только при
 * compact (тесты), прод пишет appendFileSync.
 */
export class DreamsLog {
  /**
   * @param {{ path?: string, events?: object[] }} [opts]
   */
  constructor(opts = {}) {
    this.path = opts.path ?? null;
    /** @type {object[]} */
    this._events = Array.isArray(opts.events) ? [...opts.events] : [];
    if (this.path && existsSync(this.path)) {
      this._events = readJsonl(this.path);
    }
  }

  /** @returns {readonly object[]} */
  all() {
    return this._events;
  }

  /**
   * @param {string} day
   * @returns {object[]}
   */
  readDay(day) {
    return this._events.filter((e) => e.day === day);
  }

  /**
   * Есть ли уже запись слота (day, hour).
   * @param {string} day
   * @param {number} hour
   */
  hasSlot(day, hour) {
    const k = slotKey({ day, hour });
    return this._events.some((e) => slotKey(e) === k);
  }

  /**
   * Append. Дубликат слота → отказ (не перезаписываем — append-only + дедуп).
   * @param {object} raw
   * @returns {{ok: true, event: object} | {ok: false, reason: string}}
   */
  append(raw) {
    const v = validateDreamEvent(raw);
    if (!v.ok) return v;
    if (this.hasSlot(v.event.day, v.event.hour)) {
      return { ok: false, reason: `slot already committed: ${slotKey(v.event)}` };
    }
    this._events.push(v.event);
    if (this.path) {
      mkdirSync(dirname(this.path), { recursive: true });
      appendFileSync(this.path, `${JSON.stringify(v.event)}\n`, 'utf8');
    }
    return { ok: true, event: v.event };
  }

  /**
   * Derived: select/digest за день. Победители не пишутся в лог.
   * @param {string} day
   */
  projectDay(day) {
    const dreams = this.readDay(day);
    const heats = select(dreams);
    const winners = digest(dreams);
    const noWinnerHeats = heats.filter((h) => h.winner == null).map((h) => h.heat);
    return {
      day,
      dreams,
      heats,
      winners,
      winnerCount: winners.length,
      noWinnerHeats,
    };
  }
}

/**
 * Reducer won/lost: метки над committed-логом дня (тотален, I4). Не мутирует стор.
 * @param {object[]} dreams
 * @returns {Array<{id: string, outcome: 'won'|'lost'|'no-winner-slot'|'failed'|'skipped'}>}
 */
export function reduceOutcomes(dreams) {
  const heats = select(dreams ?? []);
  const winnerIds = new Set(heats.filter((h) => h.winner).map((h) => h.winner.id));
  return (dreams ?? []).map((d) => {
    if (d.status === 'skipped') return { id: d.id, outcome: 'skipped' };
    if (d.status === 'synthesisFailed') return { id: d.id, outcome: 'failed' };
    if (d.status === 'synthesized' && winnerIds.has(d.id)) return { id: d.id, outcome: 'won' };
    if (d.status === 'synthesized') return { id: d.id, outcome: 'lost' };
    return { id: d.id, outcome: 'no-winner-slot' };
  });
}

/** @param {string} path */
function readJsonl(path) {
  const text = readFileSync(path, 'utf8');
  const out = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    out.push(JSON.parse(t));
  }
  return out;
}

/**
 * Путь лога на office-volume: `<root>/dreams/<day>.jsonl`.
 * @param {string} volumeRoot
 * @param {string} day
 */
export function dayLogPath(volumeRoot, day) {
  return join(volumeRoot, 'dreams', `${day}.jsonl`);
}

/** Тестовый хелпер: перезаписать файл целиком (не для прод-писателя). */
export function rewriteLogForTests(path, events) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, events.map((e) => JSON.stringify(e)).join('\n') + (events.length ? '\n' : ''), 'utf8');
}
