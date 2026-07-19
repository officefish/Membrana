/**
 * Холодный контур: офлайн-читатель `archive.jsonl` (Р3, вердикт M3).
 *
 * Линейный скан без сети. Критерий перехода на генерируемый индекс (ступень 3)
 * фальсифицируем: `scan_time(archive.jsonl) > T_gate` — индекс генерируется из
 * jsonl, источник не заменяет. До того — читаем сканом.
 */
import { existsSync, readFileSync } from 'node:fs';

/**
 * Прочитать все записи холода. Битые строки не валят чтение — возвращаются
 * отдельно (append-only файл не чинится молча, брак виден читателю).
 *
 * @param {string} archivePath
 * @returns {{ records: object[], corrupt: { lineNumber: number, error: string }[] }}
 */
export function readColdRecords(archivePath) {
  if (!existsSync(archivePath)) {
    return { records: [], corrupt: [] };
  }
  const records = [];
  const corrupt = [];
  const lines = readFileSync(archivePath, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) {
      continue;
    }
    try {
      records.push(JSON.parse(line));
    } catch (error) {
      corrupt.push({ lineNumber: i + 1, error: error.message });
    }
  }
  return { records, corrupt };
}

/**
 * Множество id карточек, находящихся в холоде — вход предиката `inCold`
 * критерия `wellArchived` (Р4).
 *
 * @param {{ records?: object[] } | object[] | string} source записи, результат
 *   readColdRecords или путь к archive.jsonl
 * @returns {Set<string>}
 */
export function coldIds(source) {
  let records;
  if (typeof source === 'string') {
    records = readColdRecords(source).records;
  } else if (Array.isArray(source)) {
    records = source;
  } else {
    records = source.records ?? [];
  }
  const ids = new Set();
  for (const record of records) {
    const id = record?.card?.id;
    if (typeof id === 'string' && id.length > 0) {
      ids.add(id);
    }
  }
  return ids;
}

/**
 * @param {object[]} records
 * @param {string} cardId
 */
export function findById(records, cardId) {
  return records.find((r) => r?.card?.id === cardId) ?? null;
}

/**
 * Офлайн-выборка по доменному полю (leadPersona / strategicWave / dependsOn).
 *
 * @param {object[]} records
 * @param {'leadPersona' | 'strategicWave'} field
 * @param {string} value
 */
export function selectByDomain(records, field, value) {
  return records.filter((r) => r?.domain?.[field] === value);
}

/**
 * Кто зависит от данной карточки (обход графа dependsOn по холоду).
 *
 * @param {object[]} records
 * @param {string} cardId
 */
export function dependents(records, cardId) {
  return records.filter((r) => Array.isArray(r?.domain?.dependsOn) && r.domain.dependsOn.includes(cardId));
}
