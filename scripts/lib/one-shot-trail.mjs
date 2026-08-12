/**
 * one-shot-trail — журнал анти-дробления (M5B / #1065 / EPIC V9).
 *
 * Единственный источник истории шотов (реестр не смотрим: one-shot отменяет карточку).
 * Окно 7 дней; смежность — LCP папок ≥ 2; штраф ранга −1 уровень; override → [risk-override].
 *
 * Канон: docs/seanses/tasks-workshop-m5b-chaining-2026-07-23.md
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { normalizeRepoPath } from './one-shot-s-predicate.mjs';

/** @typedef {'merged' | 'cancelled' | 'open'} ShotStatus */

/** @typedef {{ files: number, lines: number }} ShotVolume */

/**
 * @typedef {object} ShotRecord
 * @property {string} timestamp ISO8601
 * @property {string} path primary path
 * @property {string} [slug]
 * @property {string} headRev
 * @property {ShotStatus} status
 * @property {string[]} [paths] optional multi-file
 * @property {string} [executor] кто играл шот (personaId, вердикт M2)
 * @property {ShotVolume} [forecast] обещание штампа S (файлы/строки)
 * @property {ShotVolume} [actual] факт из диффа мердж-коммита; отсутствие мерджа → поля нет
 */

export const TRAIL_REL = join('docs', 'audit', 'one-shot-trail.jsonl');
export const TRAIL_WINDOW_DAYS = 7;
export const TRAIL_WINDOW_MS = TRAIL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
/** Один «уровень» ранга в шкале score [0,1] (V8). */
export const SCORE_LEVEL_STEP = 0.15;

/**
 * Папки пути как кортеж (без имени файла).
 * @param {string} p
 * @returns {string[]}
 */
export function pathFolders(p) {
  const n = normalizeRepoPath(p);
  const parts = n.split('/').filter(Boolean);
  if (parts.length === 0) return [];
  // последний сегмент с точкой — файл
  if (parts.length >= 1 && parts[parts.length - 1].includes('.')) {
    return parts.slice(0, -1);
  }
  return parts;
}

/**
 * LCP папок длиной ≥ 2 → смежны (M5B).
 * @param {string} a
 * @param {string} b
 */
export function pathsAdjacentByFolderLcp(a, b) {
  const fa = pathFolders(a);
  const fb = pathFolders(b);
  let i = 0;
  while (i < fa.length && i < fb.length && fa[i] === fb[i]) i += 1;
  return i >= 2;
}

/**
 * @param {string[]} pathsA
 * @param {string[]} pathsB
 */
export function pathSetsAdjacent(pathsA, pathsB) {
  for (const a of pathsA ?? []) {
    for (const b of pathsB ?? []) {
      if (pathsAdjacentByFolderLcp(a, b)) return true;
    }
  }
  return false;
}

/**
 * @param {ShotRecord} rec
 * @returns {string[]}
 */
export function recordPaths(rec) {
  if (Array.isArray(rec?.paths) && rec.paths.length) {
    return [...new Set(rec.paths.map(normalizeRepoPath).filter(Boolean))];
  }
  if (rec?.path) return [normalizeRepoPath(rec.path)].filter(Boolean);
  return [];
}

/**
 * applyOneShotPenalty(rank, shotCount) — детерминированно.
 * При shotCount ≥ 1 (есть смежные шоты в окне) ранг −1, не ниже 0.
 * Для дискретного ранга (1..N) и для «уровней» score (передавай score/STEP).
 *
 * @param {number} rank
 * @param {number} shotCount
 * @returns {number}
 */
export function applyOneShotPenalty(rank, shotCount) {
  const r = Number(rank);
  const n = Number(shotCount);
  if (!Number.isFinite(r)) return 0;
  if (!Number.isFinite(n) || n < 1) return Math.max(0, r);
  return Math.max(0, r - 1);
}

/**
 * Штраф score: −SCORE_LEVEL_STEP при цепочке; riskOverride отменяет штраф.
 *
 * @param {number} score
 * @param {number} adjacentShotCount
 * @param {boolean} [riskOverride]
 * @returns {{ score: number, chained: boolean, overridden: boolean, marker?: string }}
 */
export function applyTrailScorePenalty(score, adjacentShotCount, riskOverride = false) {
  const chained = Number(adjacentShotCount) >= 1;
  if (!chained) {
    return { score, chained: false, overridden: false };
  }
  if (riskOverride) {
    return {
      score,
      chained: true,
      overridden: true,
      marker: '[risk-override]',
    };
  }
  const levels = score / SCORE_LEVEL_STEP;
  const penalizedLevels = applyOneShotPenalty(levels, adjacentShotCount);
  return {
    score: Math.max(0, penalizedLevels * SCORE_LEVEL_STEP),
    chained: true,
    overridden: false,
  };
}

/**
 * Чистая фильтрация: записи за окно, смежные с probePaths.
 *
 * @param {ShotRecord[]} records
 * @param {string | string[]} pathOrPaths
 * @param {{ windowMs?: number, now?: number }} [opts]
 * @returns {ShotRecord[]}
 */
export function loadShotHistory(records, pathOrPaths, opts = {}) {
  const windowMs = opts.windowMs ?? TRAIL_WINDOW_MS;
  const now = Number.isFinite(opts.now) ? Number(opts.now) : Date.now();
  const probe = Array.isArray(pathOrPaths)
    ? pathOrPaths.map(normalizeRepoPath)
    : [normalizeRepoPath(pathOrPaths)];
  const start = now - windowMs;
  /** @type {ShotRecord[]} */
  const out = [];
  for (const rec of records ?? []) {
    if (!rec || typeof rec !== 'object') continue;
    // open — не исход: анти-цепочка считает только сыгранные шоты (merge/cancel).
    if (rec.status === 'open') continue;
    const t = Date.parse(rec.timestamp);
    if (!Number.isFinite(t) || t < start || t > now) continue;
    const rp = recordPaths(rec);
    if (!rp.length) continue;
    if (pathSetsAdjacent(probe, rp)) out.push(rec);
  }
  return out;
}

/**
 * Объём шота: неотрицательные целые files/lines, иначе null.
 * @param {unknown} v
 * @returns {ShotVolume | null}
 */
export function normalizeShotVolume(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const files = Number(/** @type {{files?: unknown}} */ (v).files);
  const lines = Number(/** @type {{lines?: unknown}} */ (v).lines);
  if (!Number.isInteger(files) || files < 0) return null;
  if (!Number.isInteger(lines) || lines < 0) return null;
  return { files, lines };
}

/**
 * Факт из `git diff --shortstat <parent> <merge>`: строки insertions+deletions.
 * Пустой/нераспознанный вывод → null (факт отсутствует, а не ноль).
 * @param {string} text
 * @returns {ShotVolume | null}
 */
export function parseDiffShortstat(text) {
  const s = String(text ?? '').trim();
  if (!s) return null;
  const files = s.match(/(\d+) files? changed/u);
  if (!files) return null;
  const ins = s.match(/(\d+) insertions?\(\+\)/u);
  const del = s.match(/(\d+) deletions?\(-\)/u);
  return {
    files: Number(files[1]),
    lines: Number(ins?.[1] ?? 0) + Number(del?.[1] ?? 0),
  };
}

/**
 * Сверка да/нет первого шага (review 7.2): держится, если факт не превысил
 * обещание ни по файлам, ни по строкам. Нет форкаста или факта → null, не false.
 * @param {ShotVolume | undefined | null} forecast
 * @param {ShotVolume | undefined | null} actual
 * @returns {boolean | null}
 */
export function forecastHolds(forecast, actual) {
  const f = normalizeShotVolume(forecast);
  const a = normalizeShotVolume(actual);
  if (!f || !a) return null;
  return a.files <= f.files && a.lines <= f.lines;
}

/**
 * @param {string} line
 * @returns {ShotRecord | null}
 */
export function parseTrailLine(line) {
  const s = String(line ?? '').trim();
  if (!s || s.startsWith('#')) return null;
  try {
    const o = JSON.parse(s);
    if (!o || typeof o !== 'object') return null;
    if (typeof o.timestamp !== 'string' || !o.timestamp) return null;
    if (typeof o.path !== 'string' || !o.path.trim()) return null;
    if (typeof o.headRev !== 'string' || !o.headRev.trim()) return null;
    if (o.status !== 'merged' && o.status !== 'cancelled' && o.status !== 'open') return null;
    // Новые поля опциональны (старые записи валидны), но кривая форма — невалидная запись.
    if (o.executor !== undefined && (typeof o.executor !== 'string' || !o.executor.trim())) {
      return null;
    }
    const forecast = o.forecast !== undefined ? normalizeShotVolume(o.forecast) : undefined;
    if (o.forecast !== undefined && !forecast) return null;
    const actual = o.actual !== undefined ? normalizeShotVolume(o.actual) : undefined;
    if (o.actual !== undefined && !actual) return null;
    return {
      timestamp: o.timestamp,
      path: normalizeRepoPath(o.path),
      slug: typeof o.slug === 'string' ? o.slug : '',
      headRev: String(o.headRev).trim(),
      status: o.status,
      paths: Array.isArray(o.paths) ? o.paths.map(normalizeRepoPath) : undefined,
      executor: o.executor !== undefined ? o.executor.trim() : undefined,
      forecast: forecast ?? undefined,
      actual: actual ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * @param {string} text
 * @returns {{ records: ShotRecord[], errors: string[] }}
 */
export function parseTrailText(text) {
  /** @type {ShotRecord[]} */
  const records = [];
  /** @type {string[]} */
  const errors = [];
  const lines = String(text ?? '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const rec = parseTrailLine(raw);
    if (!rec) {
      errors.push(`line ${i + 1}: invalid JSONL shot record`);
      continue;
    }
    records.push(rec);
  }
  return { records, errors };
}

/**
 * CI-гейт консистентности лога.
 * @param {string} text
 * @returns {{ ok: boolean, errors: string[], records: ShotRecord[] }}
 */
export function checkShotHistory(text) {
  const { records, errors } = parseTrailText(text);
  let prev = -Infinity;
  for (let i = 0; i < records.length; i += 1) {
    const t = Date.parse(records[i].timestamp);
    if (!Number.isFinite(t)) {
      errors.push(`record ${i}: bad timestamp`);
      continue;
    }
    if (t < prev) {
      errors.push(`record ${i}: timestamp not non-decreasing`);
    }
    prev = t;
  }
  return { ok: errors.length === 0, errors, records };
}

/**
 * Ключ идемпотентности.
 * @param {Pick<ShotRecord, 'path' | 'slug' | 'headRev'>} rec
 */
export function shotIdempotencyKey(rec) {
  return `${normalizeRepoPath(rec.path)}|${rec.slug ?? ''}|${rec.headRev}`;
}

/**
 * Чистый план записи: добавляет, если ключа ещё нет.
 *
 * @param {ShotRecord[]} existing
 * @param {Omit<ShotRecord, 'timestamp'> & { timestamp?: string }} input
 * @param {{ now?: Date }} [opts]
 * @returns {{ records: ShotRecord[], appended: boolean, record: ShotRecord }}
 */
export function planRecordOneShot(existing, input, opts = {}) {
  const timestamp =
    typeof input.timestamp === 'string' && input.timestamp
      ? input.timestamp
      : (opts.now ?? new Date()).toISOString();
  const executor =
    typeof input.executor === 'string' && input.executor.trim() ? input.executor.trim() : undefined;
  /** @type {ShotRecord} */
  const record = {
    timestamp,
    path: normalizeRepoPath(input.path),
    slug: input.slug ?? '',
    headRev: String(input.headRev).trim(),
    status: input.status === 'cancelled' || input.status === 'open' ? input.status : 'merged',
    paths: Array.isArray(input.paths) ? input.paths.map(normalizeRepoPath) : undefined,
    executor,
    forecast: normalizeShotVolume(input.forecast) ?? undefined,
    actual: normalizeShotVolume(input.actual) ?? undefined,
  };
  const key = shotIdempotencyKey(record);
  const has = (existing ?? []).some((r) => shotIdempotencyKey(r) === key);
  if (has) {
    return { records: existing ?? [], appended: false, record };
  }
  return { records: [...(existing ?? []), record], appended: true, record };
}

/**
 * @param {ShotRecord[]} records
 * @returns {Record<string, { successRate: number, shots: number }>}
 */
export function historyStatsFromTrail(records) {
  /** @type {Record<string, { merged: number, total: number }>} */
  const acc = {};
  for (const r of records ?? []) {
    if (r.status === 'open') continue; // не исход — в successRate не входит
    const slug = (r.slug || pathFolders(r.path).slice(-1)[0] || r.path).toLowerCase();
    if (!acc[slug]) acc[slug] = { merged: 0, total: 0 };
    acc[slug].total += 1;
    if (r.status === 'merged') acc[slug].merged += 1;
  }
  /** @type {Record<string, { successRate: number, shots: number }>} */
  const out = {};
  for (const [k, v] of Object.entries(acc)) {
    out[k] = { successRate: v.total ? v.merged / v.total : 0, shots: v.total };
  }
  return out;
}

/**
 * Ключ идентичности шота сквозь open→merged/cancelled (headRev меняется между
 * штампом и мерджем, поэтому в паре его нет).
 * @param {ShotRecord} rec
 */
function shotGroupKey(rec) {
  return `${normalizeRepoPath(rec.path)}|${rec.slug ?? ''}`;
}

/**
 * Сводка портфеля — сетка тройного акта Тарасова
 * (docs/discussions/oneshot-trail-brief-format-tarasov.md): ровно 5 строк,
 * одни поля, один порядок; окно = окну анти-цепочки. Тощий портфель печатает
 * те же 5 строк с нулями, не молчит.
 *
 * Шот в окне — группа записей по path|slug; статус и поля берутся из последних
 * записей группы (open, закрытый позже merged/cancelled, считается один раз).
 *
 * @param {ShotRecord[]} records вся лента
 * @param {{ now?: number, windowMs?: number }} [opts]
 * @returns {string[]} ровно 5 строк
 */
export function buildTrailBrief(records, opts = {}) {
  const windowMs = opts.windowMs ?? TRAIL_WINDOW_MS;
  const now = Number.isFinite(opts.now) ? Number(opts.now) : Date.now();
  const start = now - windowMs;
  const days = Math.round(windowMs / (24 * 60 * 60 * 1000));
  const all = (records ?? []).filter((r) => r && typeof r === 'object');

  /** @type {Map<string, { status: ShotStatus, executor?: string, forecast?: ShotVolume | null, actual?: ShotVolume | null, paths: string[] }>} */
  const shots = new Map();
  for (const rec of all) {
    const t = Date.parse(rec.timestamp);
    if (!Number.isFinite(t) || t < start || t > now) continue;
    const key = shotGroupKey(rec);
    const cur = shots.get(key) ?? { status: rec.status, paths: recordPaths(rec) };
    // лента append-only с неубывающими timestamp — поздняя запись новее
    cur.status = rec.status;
    cur.paths = recordPaths(rec);
    if (rec.executor !== undefined) cur.executor = rec.executor;
    if (rec.forecast !== undefined) cur.forecast = rec.forecast;
    if (rec.actual !== undefined) cur.actual = rec.actual;
    shots.set(key, cur);
  }

  const list = [...shots.values()];
  const n = list.length;
  const merged = list.filter((s) => s.status === 'merged').length;
  const cancelled = list.filter((s) => s.status === 'cancelled').length;
  const inFlight = list.filter((s) => s.status === 'open').length;

  /** @type {(pairs: Map<string, number>) => string} */
  const top3 = (pairs) =>
    [...pairs.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([name, count]) => `${name} (${count})`)
      .join(' · ');

  // Зона — первые 2 папки (диалект смежности этой же ленты: pathFolders/LCP≥2).
  /** @type {Map<string, number>} */
  const zones = new Map();
  for (const s of list) {
    for (const fam of new Set(s.paths.map((p) => pathFolders(p).slice(0, 2).join('/')))) {
      if (fam) zones.set(fam, (zones.get(fam) ?? 0) + 1);
    }
  }

  /** @type {Map<string, number>} */
  const executors = new Map();
  let withoutExecutor = 0;
  for (const s of list) {
    if (s.executor) executors.set(s.executor, (executors.get(s.executor) ?? 0) + 1);
    else withoutExecutor += 1;
  }

  const withForecast = list.filter((s) => normalizeShotVolume(s.forecast));
  const withFact = withForecast.filter((s) => normalizeShotVolume(s.actual));
  const held = withFact.filter((s) => forecastHolds(s.forecast, s.actual) === true);

  const m = all.length;
  const covExecutor = all.filter((r) => r.executor !== undefined).length;
  const covForecast = all.filter((r) => r.forecast !== undefined).length;
  const covActual = all.filter((r) => r.actual !== undefined).length;

  return [
    `шоты ${days}д: ${n} (merged ${merged} · cancelled ${cancelled} · in-flight ${inFlight}) · лента всего ${m}`,
    `зоны ${days}д: ${zones.size}${zones.size ? ` — ${top3(zones)}` : ''}`,
    `исполнители ${days}д: ${executors.size ? top3(executors) : '—'} · без executor ${withoutExecutor}`,
    `форкасты ${days}д: с форкастом ${withForecast.length}/${n} · факт есть ${withFact.length}/${withForecast.length} · держатся ${held.length}/${withFact.length}`,
    `покрытие ленты: executor ${covExecutor}/${m} · forecast ${covForecast}/${m} · actual ${covActual}/${m}`,
  ];
}

/**
 * @param {string} cwd
 * @param {string} [rel]
 */
export function trailPath(cwd, rel = TRAIL_REL) {
  return join(cwd, rel);
}

/**
 * @param {string} cwd
 * @param {string} [rel]
 * @returns {ShotRecord[]}
 */
export function readTrailFile(cwd, rel = TRAIL_REL) {
  const abs = trailPath(cwd, rel);
  if (!existsSync(abs)) return [];
  const { records } = parseTrailText(readFileSync(abs, 'utf8'));
  return records;
}

/**
 * Идемпотентная запись на диск.
 *
 * @param {string} cwd
 * @param {Omit<ShotRecord, 'timestamp'> & { timestamp?: string }} input
 * @param {{ rel?: string, now?: Date }} [opts]
 * @returns {{ appended: boolean, record: ShotRecord, path: string }}
 */
export function recordOneShot(cwd, input, opts = {}) {
  const rel = opts.rel ?? TRAIL_REL;
  const abs = trailPath(cwd, rel);
  mkdirSync(dirname(abs), { recursive: true });
  const existing = readTrailFile(cwd, rel);
  const plan = planRecordOneShot(existing, input, { now: opts.now });
  if (plan.appended) {
    appendFileSync(abs, `${JSON.stringify(plan.record)}\n`, 'utf8');
  } else if (!existsSync(abs)) {
    writeFileSync(abs, '', 'utf8');
  }
  return { appended: plan.appended, record: plan.record, path: abs };
}

/**
 * Создать пустой журнал, если нет.
 * @param {string} cwd
 */
export function ensureTrailFile(cwd) {
  const abs = trailPath(cwd);
  mkdirSync(dirname(abs), { recursive: true });
  if (!existsSync(abs)) {
    writeFileSync(
      abs,
      '# one-shot-trail.jsonl — события one-shot (не реестр задач). M5B / #1065\n',
      'utf8',
    );
  }
  return abs;
}
