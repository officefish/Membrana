/**
 * Append в архив подсознания — P1 стройки (вердикт C1, ратифицирован 28.07).
 *
 * ЕДИНСТВЕННАЯ операция записи контура: append. Модуль сознательно не экспортирует
 * ни erase, ни rewrite, ни truncate — «ничто не умирает» держится отсутствием
 * оператора (зуб проверяет экспорты). Валидация — схема P0; дубль id — отказ.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { HOMES, parseArchive, recordProblems } from './archive-schema.mjs';

/**
 * Дописать запись в архив персоны. Возвращает {ok, problems} — не бросает на
 * невалидной записи (вызывающий решает, что делать с отказом; тихого пропуска нет).
 * @param {string} repoRoot
 * @param {Record<string, unknown>} record
 * @returns {{ok: boolean, problems: string[]}}
 */
export function appendArchive(repoRoot, record) {
  const problems = recordProblems(record);
  if (problems.length) return { ok: false, problems };

  const abs = join(repoRoot, HOMES.archive(String(record.personaId)));
  if (existsSync(abs)) {
    const { records, problems: parseProblems } = parseArchive(readFileSync(abs, 'utf8'));
    // Битые строки существующей ленты — находка, но append они не блокируют:
    // лента чинится отдельным разбором, новая запись не заложник старых ошибок.
    if (records.some((r) => r.id === record.id)) {
      return { ok: false, problems: [`дубль id «${record.id}» — append-only не значит дважды`, ...parseProblems] };
    }
  } else {
    mkdirSync(dirname(abs), { recursive: true });
  }
  appendFileSync(abs, JSON.stringify(record) + '\n', 'utf8');
  return { ok: true, problems: [] };
}

/**
 * Прочитать архив персоны (лента + проблемы разбора). Отсутствие файла —
 * честная пустота: {records: [], problems: [], exists: false}.
 * @param {string} repoRoot
 * @param {string} personaId
 */
export function readArchive(repoRoot, personaId) {
  const abs = join(repoRoot, HOMES.archive(personaId));
  if (!existsSync(abs)) return { records: [], problems: [], exists: false };
  return { ...parseArchive(readFileSync(abs, 'utf8')), exists: true };
}
