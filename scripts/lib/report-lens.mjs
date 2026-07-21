/**
 * Доклад наружу (компонент R эпика ritual-refactor, вердикт M4). Линза Ожегова — строгий
 * REPHRASER: переписывает СЛОВА при изоморфизме дерева (структура каркаса плана
 * сохраняется), НЕ redactor (не удаляет узлы, не смягчает статус). Плюс защита фактов и
 * предикат выпуска `canPublish`. Чистые функции; сетевой чек ссылок — снаружи (адаптер).
 */

import { createHash } from 'node:crypto';

/** Тип строки для скелета структуры — без содержания текста. */
function lineType(line) {
  const l = line.replace(/\s+$/u, '');
  if (l.trim() === '') return '';
  const h = l.match(/^(#{1,6})\s/u);
  if (h) return `H${h[1].length}`;
  if (/^\s*[-*•]\s/u.test(l)) return 'B'; // буллет
  if (/^\s*\|/u.test(l)) return 'R'; // строка таблицы
  return 't'; // прозаический текст
}

/**
 * Структурный скелет документа — последовательность типов строк (заголовки/буллеты/таблица/
 * текст) БЕЗ содержания. Линза, переписывая слова внутри строк, скелет не меняет.
 * @param {string} md
 * @returns {string}
 */
export function structuralSkeleton(md) {
  return String(md ?? '').split(/\r?\n/).map(lineType).join('|');
}

/** Структурный хэш — sha256 скелета. Равенство = изоморфизм структуры. */
export function structuralHash(md) {
  return createHash('sha256').update(structuralSkeleton(md)).digest('hex');
}

/**
 * Изоморфизм структуры плана и доклада (M4): `structuralHash` совпал И число узлов равно.
 * @param {string} planMd
 * @param {string} reportMd
 * @returns {boolean}
 */
export function structuralIsomorphic(planMd, reportMd) {
  return structuralHash(planMd) === structuralHash(reportMd);
}

/**
 * Защищаемые токены документа: числа, статус-метки из enum, ссылки (markdown/URL/#N/GHSA).
 * Они обязаны дожить до доклада ДОСЛОВНО (M4). Возвращается мультимножество (массив).
 * @param {string} text
 * @returns {string[]}
 */
export function protectedTokens(text) {
  const s = String(text ?? '');
  const toks = [];
  for (const re of [
    /#\d+/gu, // ссылки на Issue/PR
    /GHSA-[\w-]+/gu, // адвайзори
    /https?:\/\/\S+/gu, // URL
    /\b\d+(?:[.,]\d+)?\b/gu, // числа
    /\b(?:MERGED|OPEN|CLOSED|Done|stale|fresh|unknown|БЛОК)\b/gu, // статус-метки
  ]) {
    for (const m of s.matchAll(re)) toks.push(m[0]);
  }
  return toks.sort();
}

/**
 * Защита фактов: каждый защищаемый токен плана присутствует в докладе (мультимножество
 * ⊆). Линза чистит слова, но числа/статусы/ссылки терять/искажать нельзя.
 * @param {string} planText
 * @param {string} reportText
 * @returns {boolean}
 */
export function protectedTokensKept(planText, reportText) {
  const need = protectedTokens(planText);
  const have = protectedTokens(reportText);
  const pool = [...have];
  for (const t of need) {
    const i = pool.indexOf(t);
    if (i === -1) return false;
    pool.splice(i, 1);
  }
  return true;
}

/** Статус ссылки: внутренняя — бинарно, внешняя — тернарно (M4). */
export const LINK_STATUS = Object.freeze({ ALIVE: 'alive', DEAD: 'dead', UNVERIFIABLE: 'unverifiable' });

/**
 * Классификация результата проверки ссылки (чистая; сам fetch — снаружи). Внутренняя
 * (путь+якорь в дереве) — только `alive`/`dead`. Внешняя (URL) — `dead` на семантический
 * 4xx/410 после ретраев, `unverifiable` на устойчивый таймаут/сетевой шум.
 * @param {'internal'|'external'} kind
 * @param {{exists?: boolean, status?: number|null, timedOut?: boolean}} probe
 * @returns {'alive'|'dead'|'unverifiable'}
 */
export function classifyLinkStatus(kind, probe) {
  if (kind === 'internal') return probe?.exists ? LINK_STATUS.ALIVE : LINK_STATUS.DEAD;
  if (probe?.timedOut || probe?.status == null) return LINK_STATUS.UNVERIFIABLE;
  if (probe.status === 410 || (probe.status >= 400 && probe.status < 500)) return LINK_STATUS.DEAD;
  return LINK_STATUS.ALIVE;
}

/**
 * Предикат выпуска (M4): `canPublish = structuralIntact ∧ protectedTokensKept ∧
 * noInternalDead ∧ noExternalDead`. `unverifiable` НЕ блокирует, но считается.
 * @param {{structuralIntact: boolean, protectedTokensKept: boolean, linkStatuses: Array<{kind: string, status: string}>}} checks
 * @returns {{ok: boolean, reasons: string[], unverifiable: number}}
 */
export function canPublish(checks) {
  const reasons = [];
  if (!checks?.structuralIntact) reasons.push('структура разошлась с планом');
  if (!checks?.protectedTokensKept) reasons.push('потерян/искажён защищаемый токен');
  const dead = (checks?.linkStatuses ?? []).filter((l) => l.status === LINK_STATUS.DEAD);
  if (dead.length > 0) reasons.push(`мёртвых ссылок: ${dead.length}`);
  const unverifiable = (checks?.linkStatuses ?? []).filter((l) => l.status === LINK_STATUS.UNVERIFIABLE).length;
  return { ok: reasons.length === 0, reasons, unverifiable };
}
