/**
 * Отказ-I «ответственный не назначен» — зубы регламента, вердикт M2.
 *
 * Носитель следа-ответственности — карточка реестра, поле `leadPersona`.
 * Предикат наблюдаем O(1), precision = 1: `leadPersona == null` → hard-отказ
 * сразу (цена ноль: 212 из 213 активных карточек поле имеют).
 *
 * Чистая функция: вход — карточка из СНИМКА реестра (не сеть, не gh, не git),
 * внутри нет Date.now(). Вшивание в pre-push / task:archive — адаптер интеграции;
 * этот модуль хуков не знает.
 *
 * Коммит-сообщение и тело PR как носитель следа НЕ читаются (вердикт M2:
 * обезличенные каналы авторства, уязвимы к сборке чужой рукой — инцидент 19.07).
 */

import { traceResult } from './trace-exit-codes.mjs';

/**
 * @typedef {import('./trace-exit-codes.mjs').TraceResult} TraceResult
 *
 * @typedef {object} CardLike карточка единицы работы из снимка реестра
 * @property {string} id
 * @property {string | null | undefined} [leadPersona] персона, принявшая выход
 */

/**
 * Проверка следа-ответственности одной карточки.
 * @param {CardLike} card
 * @returns {TraceResult}
 */
export function checkLeadPersona(card) {
  if (!card || typeof card !== 'object') {
    return traceResult('hard', 'карточка отсутствует — след-ответственность проверить не на чем');
  }
  const persona = typeof card.leadPersona === 'string' ? card.leadPersona.trim() : card.leadPersona;
  if (persona === null || persona === undefined || persona === '') {
    return traceResult('hard', `карточка ${card.id ?? '<без id>'}: leadPersona пуст — ответственный не назначен`);
  }
  return traceResult('pass', `карточка ${card.id}: ответственность есть (${persona})`);
}

/**
 * Гейт по множеству карточек (например, все затронутые push-ем).
 * Отказ множества = отказ хотя бы одной: код max по карточкам.
 * @param {CardLike[]} cards
 * @returns {{ code: number, verdict: 'pass' | 'hard', failures: TraceResult[], checked: number }}
 */
export function checkLeadPersonaBatch(cards) {
  if (!Array.isArray(cards)) {
    const failure = traceResult('hard', 'вход гейта — не массив карточек');
    return { code: failure.code, verdict: 'hard', failures: [failure], checked: 0 };
  }
  const failures = cards.map(checkLeadPersona).filter((r) => r.verdict === 'hard');
  return {
    code: failures.length > 0 ? failures[0].code : 0,
    verdict: failures.length > 0 ? 'hard' : 'pass',
    failures,
    checked: cards.length,
  };
}
