/**
 * Снимок-контракт `linear-snapshot@1` (вердикт M3 linear-egress-gear-wiring / К3).
 *
 * Вход гейтов — снимок, не сеть. Honest-шапка: producedBy/egressRegion/mode
 * вместо устаревшего `source: office-batch`.
 *
 * `pullOk(S)` — чистая функция только от файла; freshness — вне тела гейта.
 */
import { existsSync, readFileSync } from 'node:fs';

export const SNAPSHOT_FORMAT = 'linear-snapshot@1';
export const SNAPSHOT_PRODUCED_BY = 'media-NL';
export const SNAPSHOT_EGRESS_REGION = 'NL';
export const SNAPSHOT_MODE = 'batch-full-pull';

/** Единая таблица exit-кодов блока. */
export const EXIT_CODES = Object.freeze({
  OK: 0,
  SNAPSHOT_STALE: 10,
  LEGALITY_MIGRATING: 11,
  SNAPSHOT_NO_INPUT: 20,
  LEGALITY_HARD: 21,
});

export const SOFT_EXIT_MIN = 1;
export const SOFT_EXIT_MAX = 19;

/** @param {number} code */
export function isSoftCode(code) {
  return code >= SOFT_EXIT_MIN && code <= SOFT_EXIT_MAX;
}

/** @param {number} code */
export function isHardCode(code) {
  return code >= 20;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Структурная валидация снимка (офлайн). Чистая функция.
 *
 * @param {unknown} value
 * @returns {{ ok: boolean, problems: string[] }}
 */
export function validateSnapshot(value) {
  const problems = [];
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, problems: ['снимок не является объектом'] };
  }
  const snapshot = /** @type {Record<string, unknown>} */ (value);
  const header = snapshot.header;
  if (header === null || typeof header !== 'object' || Array.isArray(header)) {
    problems.push('нет header (провенанс обязателен)');
  } else {
    const h = /** @type {Record<string, unknown>} */ (header);
    if (h.format !== SNAPSHOT_FORMAT) {
      problems.push(`header.format ≠ ${SNAPSHOT_FORMAT}`);
    }
    if (!isNonEmptyString(h.capturedAt) || Number.isNaN(Date.parse(String(h.capturedAt)))) {
      problems.push('header.capturedAt пуст или не ISO-дата');
    }
    if (!isNonEmptyString(h.sourceRevision)) {
      problems.push('header.sourceRevision пуст — провенанс битый');
    }
    if (h.producedBy !== SNAPSHOT_PRODUCED_BY) {
      problems.push(`header.producedBy ≠ ${SNAPSHOT_PRODUCED_BY}`);
    }
    if (h.egressRegion !== SNAPSHOT_EGRESS_REGION) {
      problems.push(`header.egressRegion ≠ ${SNAPSHOT_EGRESS_REGION}`);
    }
    if (h.mode !== SNAPSHOT_MODE) {
      problems.push(`header.mode ≠ ${SNAPSHOT_MODE}`);
    }
    if (!isNonEmptyString(h.trigger)) {
      problems.push('header.trigger пуст');
    }
    if (!Number.isInteger(h.recordCount) || Number(h.recordCount) < 0) {
      problems.push('header.recordCount не целое ≥ 0');
    }
    // Legacy literал запрещён в @1 после M3
    if ('source' in h) {
      problems.push('header.source устарел — используйте producedBy + mode');
    }
  }
  if (!Array.isArray(snapshot.records)) {
    problems.push('records не массив');
  } else if (
    header &&
    typeof header === 'object' &&
    Number.isInteger(/** @type {Record<string, unknown>} */ (header).recordCount) &&
    snapshot.records.length !== /** @type {Record<string, unknown>} */ (header).recordCount
  ) {
    problems.push(
      `recordCount (${/** @type {Record<string, unknown>} */ (header).recordCount}) ≠ records.length (${snapshot.records.length})`,
    );
  }
  return { ok: problems.length === 0, problems };
}

/**
 * Предикат боевого pull (M3): чистая функция только от файла.
 * Не вызывает сеть и не читает Date.now().
 *
 * @param {unknown} snapshot
 * @returns {boolean}
 */
export function pullOk(snapshot) {
  return validateSnapshot(snapshot).ok;
}

/**
 * Загрузка снимка с диска. Офлайн: сети нет по конструкции.
 *
 * @param {string} filePath
 * @returns {{ code: number, snapshot: object | null, problems: string[] }}
 */
export function loadSnapshot(filePath) {
  if (!isNonEmptyString(filePath) || !existsSync(filePath)) {
    return {
      code: EXIT_CODES.SNAPSHOT_NO_INPUT,
      snapshot: null,
      problems: [`файл снимка не найден: ${filePath}`],
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    return {
      code: EXIT_CODES.SNAPSHOT_NO_INPUT,
      snapshot: null,
      problems: [`снимок не парсится как JSON: ${error.message}`],
    };
  }
  const { ok, problems } = validateSnapshot(parsed);
  if (!ok) {
    return { code: EXIT_CODES.SNAPSHOT_NO_INPUT, snapshot: null, problems };
  }
  return { code: EXIT_CODES.OK, snapshot: parsed, problems: [] };
}

/**
 * @param {{ ok: boolean } | { code: number }} validationOrLoad
 * @param {boolean | null} fresh
 */
export function resolveSnapshotCode(validationOrLoad, fresh = null) {
  const invalid =
    'ok' in validationOrLoad
      ? !validationOrLoad.ok
      : validationOrLoad.code === EXIT_CODES.SNAPSHOT_NO_INPUT;
  if (invalid) {
    return EXIT_CODES.SNAPSHOT_NO_INPUT;
  }
  if (fresh === false) {
    return EXIT_CODES.SNAPSHOT_STALE;
  }
  return EXIT_CODES.OK;
}
