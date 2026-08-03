/**
 * СТАБ ленты вещдоков окна (M4): дома у неё в репозитории сегодня НЕТ.
 *
 * Лента — ВХОД гейта, а не его собственность. Здесь только загрузчик фикстур: JSONL-файлы
 * лежат рядом, в `../fixtures/`. Носители двух родов из четырёх (`contract_signature`,
 * `session_prep`) отсутствуют — они помечены `//provisional` в enum и читаются только через
 * этот стаб. Носитель не выдумывается.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseJsonl } from '../trace-corpus.mjs';

export const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

/** @type {readonly string[]} Фикстуры Phase 2: по одной на вердикт, на ошибку входа и на находку. */
export const FIXTURE_NAMES = Object.freeze([
  'plan-lied',
  'empty-corpus',
  'wrong-performer',
  'stale-trace',
  'stale-partial',
  'unresolvable-ref',
  'honest-both',
  'incomplete-trace',
  'unknown-kind',
  'unknown-persona',
  'late-close',
  'order-review-early',
  'run-before-signature',
  'duplicate-and-extra',
]);

/**
 * @param {string} name имя фикстуры без расширения
 * @returns {{ records: unknown[], errors: {code:string,subject:string,detail:string}[] }}
 */
export function loadFixture(name) {
  if (!FIXTURE_NAMES.includes(name)) {
    throw new Error(`Фикстуры «${name}» нет. Есть: ${FIXTURE_NAMES.join(', ')}`);
  }
  return parseJsonl(readFileSync(resolve(FIXTURES_DIR, `${name}.jsonl`), 'utf8'));
}

/**
 * @param {string} path
 * @returns {{ records: unknown[], errors: {code:string,subject:string,detail:string}[] }}
 */
export function loadJsonlFile(path) {
  return parseJsonl(readFileSync(path, 'utf8'));
}
