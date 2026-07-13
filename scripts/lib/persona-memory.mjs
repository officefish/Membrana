/**
 * persona-memory.mjs — контракт «журнал субъектного опыта персоны» для загрузчиков.
 *
 * Фаза 1 инсайта insight-persona-persistent-memory (спринт persona-memory-phase1).
 * Единственная точка сопряжения слоёв — файл `docs/virtual-team/memory/<slug>.md`:
 * extractor (scripts/persona-memory-extract.mjs) его ПИШЕТ, загрузчики ask/consilium
 * через этот модуль его ЧИТАЮТ. Загрузчик не знает про формат протоколов,
 * extractor не знает про промпты персон (Структурщик, review 2026-07-12).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Слаг персоны → метка роли в протоколах/REVIEW (тег реплики `[Метка]:`). */
export const PERSONA_ROLE_LABELS = {
  vesnin: 'Teamlead',
  ozhegov: 'Структурщик',
  dynin: 'Математик',
  kuryokhin: 'Музыкант',
  rodchenko: 'Верстальщик',
};

/** role.key консилиума → слаг персоны (для маппинга PERSONA_FILES → журнал). */
export const CONSILIUM_ROLE_KEY_TO_SLUG = {
  teamlead: 'vesnin',
  structurer: 'ozhegov',
  mathematician: 'dynin',
  musician: 'kuryokhin',
  layout: 'rodchenko',
};

export const MEMORY_DIR = 'docs/virtual-team/memory';

/** Относительный путь журнала персоны. */
export function personaMemoryPath(slug) {
  return `${MEMORY_DIR}/${slug}.md`;
}

/**
 * Прочитать журнал персоны для инъекции в промпт. Graceful: нет файла / не читается →
 * `null` (загрузчик просто не подмешивает блок). Обрезка по maxChars — страховка
 * загрузчика; сам журнал уже держит токен-бюджет на стороне extractor.
 */
export function readPersonaMemory(slug, { cwd = process.cwd(), maxChars = 20_000 } = {}) {
  if (!PERSONA_ROLE_LABELS[slug]) return null;
  let text;
  try {
    text = readFileSync(path.resolve(cwd, personaMemoryPath(slug)), 'utf8');
  } catch {
    return null;
  }
  if (!text.trim()) return null;
  if (text.length > maxChars) {
    text = text.slice(0, maxChars) + `\n\n[… журнал обрезан до ${maxChars} символов …]\n`;
  }
  return text;
}
