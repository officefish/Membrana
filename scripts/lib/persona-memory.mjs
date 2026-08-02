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
/**
 * Слаг персоны → её МЕТКА В ПРОТОКОЛАХ. Это не подпись для отчёта, а КЛЮЧ СБОРА: по метке
 * извлекатель ищет реплики персоны в протоколах и ревью (`collectSeansesCandidates`).
 *
 * ПОЧЕМУ КАРТА ОБЯЗАНА ПОКРЫВАТЬ ВЕСЬ РЕЕСТР ГОЛОСОВ. У неё две работы сразу: она же —
 * ростер `persona-memory:extract --all` (`Object.keys`), и она же — гейт `readPersonaMemory`,
 * который на незнакомом слаге отдаёт `null`. Отсутствие персоны здесь значит не «нет метки», а
 * «памяти у неё нет вовсе»: журнал не извлекается и не подмешивается.
 *
 * ЧТО БЫЛО ДО 02.08 и чем это стоило. В карте было пятеро, а журналы на диске — у восьми.
 * `tarasov` (тимлид с 27.07), `angelina` и `farrell` отсутствовали, и `readPersonaMemory` для
 * них возвращал `null` при существующих файлах. Влитый 02.08 лифт всплытия зовёт
 * `readPersonaMemory(...).includes(id)` — на `null` это исключение, проглоченное `catch`, и
 * лифт молча не работал для самой вызываемой персоны проекта.
 *
 * МЕТКА ПРИНАДЛЕЖИТ РОЛИ, А НЕ ЧЕЛОВЕКУ, и отсюда следствие, которое надо назвать вслух:
 * `vesnin` носил метку `Teamlead` с тех пор, как перестал им быть (27.07 тимлидом стал
 * Тарасов, Веснин — архитектор). Оставить её и добавить Тарасова значило бы завести КОЛЛИЗИЮ
 * ключа: двое собирали бы одни и те же строки протоколов. Метка исправлена, и цена честная —
 * исторические реплики `[Teamlead — Vesnin]` теперь соберутся в журнал Тарасова, потому что
 * ключом служит роль. Уникальность меток и полноту карты держит зуб
 * `scripts/persona-memory-roster.test.mjs`.
 */
export const PERSONA_ROLE_LABELS = {
  tarasov: 'Teamlead',
  vesnin: 'Архитектор',
  ozhegov: 'Структурщик',
  dynin: 'Математик',
  kuryokhin: 'Музыкант',
  rodchenko: 'Верстальщик',
  angelina: 'Секретарь',
  farrell: 'Свободный голос',
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
