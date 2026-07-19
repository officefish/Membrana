/**
 * Холодный контур: писатель `archive.jsonl` (Р3, вердикт M3 registry-relocation).
 *
 * - Append-only: писатель ТОЛЬКО дописывает строки, никогда не переписывает файл.
 * - Одна строка = одна запись = снимок карточки с обязательной honest-шапкой
 *   (дата снимка, ревизия head, источник). УСЛОВИЕ ПРИЁМКИ: запись без шапки
 *   холод не принимает — писатель отвергает её жёстко.
 * - Единственный производитель — office-батч по триггеру; вечерняя архивация
 *   редуцирована до сигнала триггера, своей дорожки записи не ведёт.
 * - Хранится содержание + доменные поля (`dependsOn` — обязателен: граф — наш
 *   актив, внешний источник его не знает). Движение статуса не дублируется.
 *
 * Спека формата: docs/tasks/archive/ARCHIVE_FORMAT.md.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** Единственный законный производитель холода (M3). */
export const COLD_SOURCE_PREFIX = 'office-batch';

/** Поля движения, которые холод НЕ дублирует (живут во внешнем аудите). */
const MOVEMENT_FIELDS = Object.freeze(['state', 'stateType', 'transitions', 'history']);

export class ColdRecordRejectedError extends Error {
  /** @param {string[]} problems */
  constructor(problems) {
    super(`холод отверг запись: ${problems.join('; ')}`);
    this.name = 'ColdRecordRejectedError';
    this.problems = problems;
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Валидация записи холода. Чистая функция.
 *
 * @param {unknown} record
 * @returns {{ ok: boolean, problems: string[] }}
 */
export function validateColdRecord(record) {
  const problems = [];
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    return { ok: false, problems: ['запись не является объектом'] };
  }
  const r = /** @type {Record<string, unknown>} */ (record);

  const header = r.snapshot;
  if (header === null || typeof header !== 'object' || Array.isArray(header)) {
    problems.push('нет honest-шапки `snapshot` — условие приёмки M3');
  } else {
    const h = /** @type {Record<string, unknown>} */ (header);
    if (!isNonEmptyString(h.capturedAt) || Number.isNaN(Date.parse(String(h.capturedAt)))) {
      problems.push('шапка: capturedAt (дата снимка) пуст или не ISO-дата');
    }
    if (!isNonEmptyString(h.headRevision)) {
      problems.push('шапка: headRevision (ревизия head) пуст');
    }
    if (!isNonEmptyString(h.source)) {
      problems.push('шапка: source пуст');
    } else if (String(h.source) !== COLD_SOURCE_PREFIX && !String(h.source).startsWith(`${COLD_SOURCE_PREFIX}/`)) {
      problems.push(
        `шапка: source «${String(h.source)}» — не office-батч; производитель холода один (M3)`,
      );
    }
  }

  const card = r.card;
  if (card === null || typeof card !== 'object' || Array.isArray(card)) {
    problems.push('нет `card` (содержание карточки)');
  } else if (!isNonEmptyString(/** @type {Record<string, unknown>} */ (card).id)) {
    problems.push('card.id пуст — запись неадресуема');
  }

  const domain = r.domain;
  if (domain === null || typeof domain !== 'object' || Array.isArray(domain)) {
    problems.push('нет `domain` (доменные поля)');
  } else if (!Array.isArray(/** @type {Record<string, unknown>} */ (domain).dependsOn)) {
    problems.push('domain.dependsOn не массив — граф зависимостей обязателен');
  }

  for (const field of MOVEMENT_FIELDS) {
    if (card && typeof card === 'object' && field in /** @type {object} */ (card)) {
      problems.push(`card.${field}: движение не дублируется — оно живёт во внешнем аудите (M3)`);
    }
  }

  return { ok: problems.length === 0, problems };
}

/**
 * Дописать запись в archive.jsonl. Запись без honest-шапки ОТВЕРГАЕТСЯ.
 *
 * @param {string} archivePath
 * @param {unknown} record
 * @returns {{ appended: true, line: string }}
 * @throws {ColdRecordRejectedError}
 */
export function appendColdRecord(archivePath, record) {
  const { ok, problems } = validateColdRecord(record);
  if (!ok) {
    throw new ColdRecordRejectedError(problems);
  }
  const line = JSON.stringify(record);
  if (line.includes('\n')) {
    throw new ColdRecordRejectedError(['запись содержит перевод строки — ломает jsonl']);
  }
  const dir = dirname(archivePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  let prefix = '';
  if (existsSync(archivePath)) {
    const existing = readFileSync(archivePath, 'utf8');
    if (existing.length > 0 && !existing.endsWith('\n')) {
      prefix = '\n';
    }
  }
  appendFileSync(archivePath, `${prefix}${line}\n`, 'utf8');
  return { appended: true, line };
}
