/**
 * Снимок-контракт (Р2, вердикт M2 registry-relocation, 2026-07-19).
 *
 * Вход гейтов — снимок, не сеть: живой запрос дисквалифицирован
 * (`gate(fetch()) ≠ gate(fetch())`). Снимок — адресуемый, версионированный
 * артефакт с провенансом `(capturedAt, sourceRevision)`; его молчаливое
 * устаревание — нарушение контракта, а не потеря производительности.
 *
 * Кодовое пространство блока snapshot-cold-migration (CONCEPT §4):
 *   0      — чисто;
 *   1–19   — мягкий диапазон (замечание: вердикт валиден, работа не встаёт);
 *   ≥ 20   — жёсткий диапазон (отказ: вход не определён / инвариант нарушен).
 * Отказ отличается от замечания кодом, не тоном.
 */
import { existsSync, readFileSync } from 'node:fs';

export const SNAPSHOT_FORMAT = 'linear-snapshot@1';

/** Единая таблица exit-кодов блока. `LEGALITY_MIGRATING` назван блоком:
 * комната M4 задала коды только мягкого (0) и жёсткого (≠0) режимов. */
export const EXIT_CODES = Object.freeze({
  OK: 0,
  SNAPSHOT_STALE: 10, // мягкий: снимок валиден, источник ушёл вперёд (M2)
  LEGALITY_MIGRATING: 11, // мягкий: миграционный режим, N_illegal > 0 (код назначен блоком)
  SNAPSHOT_NO_INPUT: 20, // жёсткий: вход не определён (M2)
  LEGALITY_HARD: 21, // жёсткий: инвариант законности в hard-режиме (M4: «≠ 0»)
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
 * Структурная валидация снимка. Чистая функция: тот же вход → тот же выход.
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
    if (!isNonEmptyString(h.source)) {
      problems.push('header.source пуст');
    }
    if (!Number.isInteger(h.recordCount) || Number(h.recordCount) < 0) {
      problems.push('header.recordCount не целое ≥ 0');
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
 * Загрузка снимка с диска. Офлайн: сети нет по конструкции.
 * Нет файла / битый JSON / битый провенанс → SNAPSHOT_NO_INPUT (жёсткий):
 * вход не определён.
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
 * Итоговый код по снимку: вход не определён → жёсткий; протух → мягкий; иначе 0.
 * Свежесть — аннотация вердикта, не его валидность (M2).
 *
 * @param {{ ok: boolean } | { code: number }} validationOrLoad
 * @param {boolean | null} fresh null = свежесть не проверялась (тело гейта офлайн)
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
