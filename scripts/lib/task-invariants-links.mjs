/**
 * Грязный слой слепка apiCache для checkCardIntegrity (M4C / #1062).
 *
 * GitHub — через `gh`. Linear — через снимок media-NL (`linear-snapshot@1`),
 * не live GraphQL из РФ (403). Недоступность → `unknown`, не throw.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { validateSnapshot } from './snapshot-contract.mjs';
import {
  INVARIANTS_CACHE_TTL_MS,
  isInvariantsCacheFresh,
  normalizeGithubLiveState,
  normalizeLinearLiveState,
} from './task-invariants.mjs';

export const DEFAULT_LINEAR_SNAPSHOT = join(
  'docs',
  'tasks',
  'snapshots',
  'linear-snapshot-live-ref.json',
);

export const DEFAULT_CACHE_REL = join('scripts', 'cache', 'task-invariants-api.json');

/**
 * @param {string} cwd
 * @param {string} [rel]
 */
export function cachePath(cwd, rel = DEFAULT_CACHE_REL) {
  return join(cwd, rel);
}

/**
 * @param {string} cwd
 * @param {string} [rel]
 * @returns {import('./task-invariants.mjs').InvariantsApiCache | null}
 */
export function loadInvariantsCache(cwd, rel = DEFAULT_CACHE_REL) {
  const abs = cachePath(cwd, rel);
  if (!existsSync(abs)) return null;
  try {
    const raw = JSON.parse(readFileSync(abs, 'utf8'));
    if (!raw || typeof raw !== 'object') return null;
    return {
      linear: raw.linear && typeof raw.linear === 'object' ? raw.linear : {},
      github: raw.github && typeof raw.github === 'object' ? raw.github : {},
      fetchedAt: typeof raw.fetchedAt === 'string' ? raw.fetchedAt : null,
      source: raw.source === 'full' || raw.source === 'fast' ? raw.source : 'none',
    };
  } catch {
    return null;
  }
}

/**
 * @param {string} cwd
 * @param {import('./task-invariants.mjs').InvariantsApiCache} cache
 * @param {string} [rel]
 */
export function saveInvariantsCache(cwd, cache, rel = DEFAULT_CACHE_REL) {
  const abs = cachePath(cwd, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

/**
 * @param {number[]} numbers
 * @param {{ repo?: string, exec?: typeof execFileSync }} [opts]
 * @returns {Record<string, import('./task-invariants.mjs').LinkLiveState>}
 */
export function fetchGithubLiveStates(numbers, opts = {}) {
  /** @type {Record<string, import('./task-invariants.mjs').LinkLiveState>} */
  const out = {};
  const uniq = [...new Set(numbers.filter((n) => Number(n) > 0))];
  if (!uniq.length) return out;

  const repo = opts.repo ?? 'officefish/Membrana';
  const exec = opts.exec ?? execFileSync;

  // Одним list --state all покрываем open+closed; missing — по отсутствию в ответе.
  try {
    const raw = exec(
      'gh',
      [
        'issue',
        'list',
        '--repo',
        repo,
        '--state',
        'all',
        '--limit',
        '600',
        '--json',
        'number,state',
      ],
      { encoding: 'utf8' },
    );
    /** @type {{ number: number, state: string }[]} */
    const list = JSON.parse(raw);
    const map = new Map(list.map((i) => [i.number, i.state]));
    for (const n of uniq) {
      if (!map.has(n)) {
        out[String(n)] = 'missing';
        continue;
      }
      const st = String(map.get(n)).toUpperCase();
      out[String(n)] = normalizeGithubLiveState(st === 'CLOSED' ? 'closed' : 'open') ?? 'unknown';
    }
  } catch {
    for (const n of uniq) out[String(n)] = 'unknown';
  }
  return out;
}

/**
 * Linear live из снимка media-NL (не GraphQL).
 *
 * @param {string[]} linearIds
 * @param {string} snapshotAbs
 * @returns {Record<string, import('./task-invariants.mjs').LinkLiveState>}
 */
export function fetchLinearLiveStatesFromSnapshot(linearIds, snapshotAbs) {
  /** @type {Record<string, import('./task-invariants.mjs').LinkLiveState>} */
  const out = {};
  const uniq = [...new Set(linearIds.filter((id) => typeof id === 'string' && id.trim()))];
  if (!uniq.length) return out;

  if (!existsSync(snapshotAbs)) {
    for (const id of uniq) out[id] = 'unknown';
    return out;
  }

  let snapshot;
  try {
    snapshot = JSON.parse(readFileSync(snapshotAbs, 'utf8'));
  } catch {
    for (const id of uniq) out[id] = 'unknown';
    return out;
  }

  const { ok } = validateSnapshot(snapshot);
  if (!ok) {
    for (const id of uniq) out[id] = 'unknown';
    return out;
  }

  /** @type {Map<string, string>} */
  const byId = new Map();
  let maxDru = 0;
  for (const rec of snapshot.records ?? []) {
    if (!rec?.linearId) continue;
    const id = String(rec.linearId);
    byId.set(id, String(rec.stateType ?? rec.state ?? ''));
    const m = id.match(/^DRU-(\d+)$/i);
    if (m) maxDru = Math.max(maxDru, Number(m[1]));
  }

  for (const id of uniq) {
    if (byId.has(id)) {
      out[id] = normalizeLinearLiveState(byId.get(id)) ?? 'unknown';
      continue;
    }
    // Снимок не покрывает этот номер (устарел / усечён) → unknown, не missing.
    // Иначе ложный HARD_BLOCK на DRU-410+ при snapshot max=DRU-225.
    const m = id.match(/^DRU-(\d+)$/i);
    if (m && maxDru > 0 && Number(m[1]) > maxDru) {
      out[id] = 'unknown';
      continue;
    }
    out[id] = 'missing';
  }
  return out;
}

/**
 * Собирает полный слепок по карточкам реестра.
 *
 * @param {object[]} cards
 * @param {string} cwd
 * @param {{
 *   snapshotRel?: string,
 *   github?: typeof fetchGithubLiveStates,
 *   linear?: typeof fetchLinearLiveStatesFromSnapshot,
 * }} [opts]
 * @returns {import('./task-invariants.mjs').InvariantsApiCache}
 */
export function collectInvariantsApiCache(cards, cwd, opts = {}) {
  const snapshotRel = opts.snapshotRel ?? DEFAULT_LINEAR_SNAPSHOT;
  const snapshotAbs = join(cwd, snapshotRel);
  const fetchGh = opts.github ?? fetchGithubLiveStates;
  const fetchLin = opts.linear ?? fetchLinearLiveStatesFromSnapshot;

  /** @type {number[]} */
  const issues = [];
  /** @type {string[]} */
  const linears = [];
  for (const card of cards ?? []) {
    if (card?.githubIssue != null && Number(card.githubIssue) > 0) {
      issues.push(Number(card.githubIssue));
    }
    if (typeof card?.linearId === 'string' && card.linearId.trim()) {
      linears.push(card.linearId.trim());
    }
  }

  return {
    github: fetchGh(issues),
    linear: fetchLin(linears, snapshotAbs),
    fetchedAt: new Date().toISOString(),
    source: 'full',
  };
}

/**
 * Режим fast: свежий кэш или null (caller сообщает cache-miss).
 *
 * @param {string} cwd
 * @param {{ now?: number, ttlMs?: number, rel?: string }} [opts]
 */
export function resolveFastCache(cwd, opts = {}) {
  const cache = loadInvariantsCache(cwd, opts.rel);
  if (!cache) return { cache: null, reason: 'cache-miss' };
  if (!isInvariantsCacheFresh(cache, opts.now ?? Date.now(), opts.ttlMs ?? INVARIANTS_CACHE_TTL_MS)) {
    return { cache: null, reason: 'cache-stale', stale: cache };
  }
  return { cache: { ...cache, source: 'fast' }, reason: 'ok' };
}

export { INVARIANTS_CACHE_TTL_MS, isInvariantsCacheFresh };
