/**
 * membrana-leveling — служебный фрейм leveling-scratch (T13 / §8.3).
 *
 * Времянки: вне repo, cleanup, never commit. Убивает WIP-снимок-антипаттерн.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { inferTempOrScratch } from './membrana-leveling-disposition.mjs';

/**
 * Корень времянок прогона (вне working tree).
 * @param {string} [prefix]
 * @returns {string}
 */
export function createScratchRoot(prefix = 'membrana-leveling-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

/**
 * @param {string} root
 * @param {{ force?: boolean }} [opts]
 */
export function cleanupScratchRoot(root, opts = {}) {
  if (!root || typeof root !== 'string') return;
  rmSync(root, { recursive: true, force: opts.force !== false });
}

/**
 * Путь внутри repo, похожий на WIP-снимок (антипаттерн T13) — нельзя коммитить.
 *
 * @param {string} repoRelativePath
 * @returns {boolean}
 */
export function isWipSnapshotAntipattern(repoRelativePath) {
  const n = String(repoRelativePath ?? '')
    .replace(/\\/gu, '/')
    .replace(/^\.\//u, '')
    .toLowerCase();
  if (!n) return false;
  // явные снимки выравнивания / gate WIP в tracked-дереве
  if (/(^|\/)leveling-wip(-|\/)/u.test(n)) return true;
  if (/(^|\/)workspace-level-snap\./u.test(n)) return true;
  if (/(^|\/)gate-output\.partial\./u.test(n)) return true;
  if (n.startsWith('docs/scratchpad/')) return true;
  if (inferTempOrScratch(n) && !n.startsWith('scripts/cache/')) {
    // .tmp в корне/docs — антипаттерн; scripts/cache — канон gitignore-времянок tooling
    return !n.startsWith('scripts/cache/');
  }
  return false;
}

/**
 * Проверка: ни один путь из списка не должен быть WIP-снимком в repo.
 *
 * @param {string[]} paths
 * @returns {{ ok: boolean, offenders: string[] }}
 */
export function assertNoWipSnapshotInRepo(paths) {
  const offenders = (paths ?? []).filter((p) => isWipSnapshotAntipattern(p));
  return { ok: offenders.length === 0, offenders };
}
