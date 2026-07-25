/**
 * membrana-leveling — wires: dirty-paths → gate snapshot (ctx-порты).
 *
 * Без LLM. `dirty` из git porcelain; `isTempOrScratch` — heuristic/infer;
 * `registered` / `inActiveSession` / `leadStamp` — только явный overlay или флаги
 * (mtime → inActiveSession запрещён).
 *
 * @see docs/procedures/membrana-leveling/DISPOSITION.md
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { inferTempOrScratch } from './membrana-leveling-disposition.mjs';

/**
 * @typedef {import('./membrana-leveling-disposition.mjs').DispositionCtx} DispositionCtx
 */

/**
 * @typedef {object} SnapshotItem
 * @property {string} path
 * @property {DispositionCtx} ctx
 * @property {string} [unitId]
 */

/**
 * @typedef {object} LevelingSnapshot
 * @property {string} builtAt
 * @property {SnapshotItem[]} items
 * @property {Record<string, { action: 'dispose'|'ignore', reason: string }>} namedTrash
 * @property {Record<string, object>} unfinishedCards
 * @property {{ source: string, overlayPath: string|null }} meta
 */

/**
 * Разбор строки `git status --porcelain` / `--porcelain=v1`.
 * @param {string} line
 * @returns {string | null}
 */
export function parsePorcelainPath(line) {
  if (!line || line.length < 4) return null;
  // XY␠path  |  XY␠old -> new (rename)
  const body = line.slice(3);
  if (body.includes(' -> ')) {
    const parts = body.split(' -> ');
    return parts[parts.length - 1]?.trim() || null;
  }
  // quoted path
  if (body.startsWith('"') && body.endsWith('"')) {
    try {
      return JSON.parse(body);
    } catch {
      return body.slice(1, -1);
    }
  }
  return body.trim() || null;
}

/**
 * @param {string} porcelain
 * @returns {string[]}
 */
export function dirtyPathsFromPorcelain(porcelain) {
  const out = [];
  const seen = new Set();
  for (const raw of String(porcelain ?? '').split(/\r?\n/u)) {
    const line = raw.trimEnd();
    if (!line) continue;
    const p = parsePorcelainPath(line);
    if (!p || seen.has(p)) continue;
    seen.add(p);
    out.push(p.replace(/\\/gu, '/'));
  }
  return out;
}

/**
 * @param {string} cwd
 * @returns {string[]}
 */
export function readDirtyPathsFromGit(cwd) {
  let porcelain = '';
  try {
    porcelain = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`snapshot: git status failed: ${msg}`);
  }
  return dirtyPathsFromPorcelain(porcelain);
}

/**
 * @param {string | null | undefined} overlayPath
 * @param {string} cwd
 * @returns {{
 *   pathCtx: Record<string, DispositionCtx & { unitId?: string }>,
 *   namedTrash: Record<string, { action: 'dispose'|'ignore', reason: string }>,
 *   unfinishedCards: Record<string, object>,
 * }}
 */
export function loadCtxOverlay(overlayPath, cwd) {
  /** @type {Record<string, DispositionCtx & { unitId?: string }>} */
  const pathCtx = {};
  /** @type {Record<string, { action: 'dispose'|'ignore', reason: string }>} */
  let namedTrash = {};
  /** @type {Record<string, object>} */
  let unfinishedCards = {};
  if (!overlayPath) return { pathCtx, namedTrash, unfinishedCards };
  const abs = resolve(cwd, overlayPath);
  if (!existsSync(abs)) {
    throw new Error(`snapshot: overlay не найден: ${overlayPath}`);
  }
  const raw = JSON.parse(readFileSync(abs, 'utf8'));
  const paths = raw.paths ?? raw.pathCtx ?? {};
  for (const [p, ctx] of Object.entries(paths)) {
    if (!p || !ctx || typeof ctx !== 'object') continue;
    pathCtx[p.replace(/\\/gu, '/')] = /** @type {DispositionCtx & { unitId?: string }} */ (ctx);
  }
  if (raw.namedTrash && typeof raw.namedTrash === 'object') namedTrash = raw.namedTrash;
  if (raw.unfinishedCards && typeof raw.unfinishedCards === 'object') {
    unfinishedCards = raw.unfinishedCards;
  }
  return { pathCtx, namedTrash, unfinishedCards };
}

/**
 * @param {{
 *   dirtyPaths: string[],
 *   pathCtx?: Record<string, DispositionCtx & { unitId?: string }>,
 *   sessionPaths?: string[],
 *   registeredPaths?: string[],
 *   leadStampPaths?: string[],
 *   namedTrash?: Record<string, { action: 'dispose'|'ignore', reason: string }>,
 *   unfinishedCards?: Record<string, object>,
 *   overlayPath?: string | null,
 *   now?: string,
 * }} input
 * @returns {LevelingSnapshot}
 */
export function buildLevelingSnapshot(input) {
  const pathCtx = input.pathCtx ?? {};
  const session = new Set((input.sessionPaths ?? []).map((p) => p.replace(/\\/gu, '/')));
  const registered = new Set((input.registeredPaths ?? []).map((p) => p.replace(/\\/gu, '/')));
  const leadStamp = new Set((input.leadStampPaths ?? []).map((p) => p.replace(/\\/gu, '/')));

  /** @type {SnapshotItem[]} */
  const items = [];
  for (const rawPath of input.dirtyPaths ?? []) {
    const path = String(rawPath).replace(/\\/gu, '/');
    if (!path) continue;
    const o = pathCtx[path] ?? {};
    /** @type {DispositionCtx} */
    const ctx = {
      dirty: true,
      registered: typeof o.registered === 'boolean' ? o.registered : registered.has(path),
      inActiveSession:
        typeof o.inActiveSession === 'boolean' ? o.inActiveSession : session.has(path),
      leadStamp: typeof o.leadStamp === 'boolean' ? o.leadStamp : leadStamp.has(path),
      ciGreen: typeof o.ciGreen === 'boolean' ? o.ciGreen : undefined,
      conflictsMain: typeof o.conflictsMain === 'boolean' ? o.conflictsMain : undefined,
      prApproved: typeof o.prApproved === 'boolean' ? o.prApproved : undefined,
      unitOf: o.unitOf ?? undefined,
      isTempOrScratch:
        typeof o.isTempOrScratch === 'boolean' ? o.isTempOrScratch : inferTempOrScratch(path),
    };
    /** @type {SnapshotItem} */
    const item = { path, ctx };
    if (typeof o.unitId === 'string' && o.unitId) item.unitId = o.unitId;
    else if (o.unitOf != null) item.unitId = String(o.unitOf);
    items.push(item);
  }

  return {
    builtAt: input.now ?? new Date().toISOString(),
    items,
    namedTrash: input.namedTrash ?? {},
    unfinishedCards: input.unfinishedCards ?? {},
    meta: {
      source: 'git-status-porcelain',
      overlayPath: input.overlayPath ?? null,
    },
  };
}

/**
 * @param {string} cwd
 * @param {{
 *   overlayPath?: string | null,
 *   sessionPaths?: string[],
 *   registeredPaths?: string[],
 *   leadStampPaths?: string[],
 *   dirtyPaths?: string[],
 * }} [opts]
 * @returns {LevelingSnapshot}
 */
export function snapshotWorkspace(cwd, opts = {}) {
  const dirtyPaths = opts.dirtyPaths ?? readDirtyPathsFromGit(cwd);
  const overlay = loadCtxOverlay(opts.overlayPath ?? null, cwd);
  return buildLevelingSnapshot({
    dirtyPaths,
    pathCtx: overlay.pathCtx,
    namedTrash: overlay.namedTrash,
    unfinishedCards: overlay.unfinishedCards,
    sessionPaths: opts.sessionPaths,
    registeredPaths: opts.registeredPaths,
    leadStampPaths: opts.leadStampPaths,
    overlayPath: opts.overlayPath ?? null,
  });
}
