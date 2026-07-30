/**
 * Идентификатор персоны = `id` из `docs/virtual-team/voices.registry.json`.
 *
 * Это НЕ стаб: реестр голосов существует и уже носит нагрузку — единственный носитель, где
 * «объявленный обязан быть вызываемым» проверяется машиной (`yarn verify:voices`). Человеческое
 * имя, модель, `Co-Authored-By` и ник агента идентификаторами НЕ являются: `Co-Authored-By`
 * одинаков у всех агентов, различающей силы ноль.
 *
 * Чтение файла живёт здесь, а не в предикатах: предикаты получают готовый список.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const VOICES_PATH = resolve(REPO_ROOT, 'docs/virtual-team/voices.registry.json');

/**
 * @param {string} path
 * @returns {readonly string[]} personaId
 */
export function loadKnownPersonas(path = VOICES_PATH) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const voices = Array.isArray(raw?.voices) ? raw.voices : [];
  return Object.freeze(voices.map((v) => String(v?.id ?? '')).filter((id) => id !== ''));
}
