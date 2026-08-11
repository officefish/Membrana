/**
 * ФИКСТУР-МОСТ зубов формы cut-плана к ЖИВЫМ модулям (блок t1 спринта
 * `sprint-cut-teeth-live-2026-08-11`, карточка-долг #1855).
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ДОМ, а не обвязка внутри теста. До 11.08 зубы формы читали
 * тестовых дублёров `sprint-cut/stubs/*` — зелёный тест на дублёре молчит о
 * расхождении с живым исполнением (вердикт Веснина 03.08). Прямой переход на
 * живые модули заносит в тест формы их обвязку — ISO→epoch ms, реестр персон,
 * закрытые роды следов, — и зуб формы незаметно становится интеграционным
 * тестом соседа. Мост держит обвязку у себя: тест обращается к живому модулю
 * через один узкий вход и по-прежнему проверяет ФОРМУ.
 *
 * Здесь нет ФС, сети и часов: время приходит ISO-строками от вызывающего,
 * реестр персон — списком. Живые модули читаются как контракты и не правятся.
 */
import { readTraceCorpus } from '../../execution-trace/trace-corpus.mjs';
import { TRACE_KINDS } from '../../execution-trace/trace-kinds.mjs';
import { changedLines, verdictFor } from '../../sprint-experience/cut-accuracy.mjs';
import { OVERSIZED_CHANGED_LINES } from '../cut-plan.mjs';

/** Персоны фикстур: тем же списком, что живой гейт получает из voices.registry.json. */
export const FIXTURE_PERSONAS = Object.freeze(['vesnin', 'dynin', 'ozhegov', 'tarasov', 'rodchenko', 'kuryokhin', 'angelina']);

/**
 * Лента вещдоков блока через ЖИВОЙ `readTraceCorpus`.
 *
 * Возвращает то и только то, что нужно форме: акты блока в порядке времени и
 * ошибки входа. Порядок — по нормализованному `at` (epoch ms): сортировку
 * делаем ЗДЕСЬ, потому что она и есть проверяемый инвариант зуба, а корпус
 * порядка не обещает. При РАВНЫХ `at` порядок стабилен — сохраняется порядок
 * появления в ленте (Array.sort стабилен с ES2019; инвариант закреплён зубом).
 *
 * Ошибки входа отдаются РЯДОМ с актами, а не вместо них: корпус устроен на
 * частичный успех — испорченная строка ленты не должна делать невидимыми
 * здоровые акты соседних блоков (разбор Дынина 11.08).
 *
 * @param {ReadonlyArray<{traceId?: string, blockId?: string, kind?: string, subject?: string, at?: string, ref?: string}>} acts
 * @param {{personas?: readonly string[]}} [opts]
 * @returns {{actsForBlock: (blockId: string) => ReadonlyArray<object>, errors: ReadonlyArray<object>}}
 */
export function liveTrail(acts, opts = {}) {
  const { traces, errors } = readTraceCorpus(acts, {
    knownPersonas: opts.personas ?? FIXTURE_PERSONAS,
  });
  const sorted = [...traces].sort((a, b) => a.at - b.at);
  return Object.freeze({
    actsForBlock: (blockId) => Object.freeze(sorted.filter((t) => t.blockId === blockId)),
    errors: Object.freeze(errors),
  });
}

/**
 * Факт объёма блока: `null` = «факта нет», и это НЕ ноль. Ноль — законное
 * наблюдение (блок не изменил строк), отсутствие наблюдения — не наблюдение;
 * различение несёт зуб, поэтому подстановки по умолчанию здесь нет.
 *
 * @param {Record<string, {insertions: number, deletions: number}|number>} facts
 * @param {string} blockId
 * @returns {number|null}
 */
export function liveActualChangedLines(facts, blockId) {
  const fact = facts?.[blockId];
  if (fact === undefined || fact === null) return null;
  // ТРИ исхода, а не два (разбор Дынина 11.08): «факта нет» (null), «факт есть,
  // ноль строк» (0) и «факт БИТЫЙ» — бросок. Смешивать битое с отсутствующим
  // значит терять информацию: молчаливый null сказал бы «наблюдения не было»
  // там, где наблюдение было и оно испорчено.
  if (typeof fact === 'number') {
    if (!Number.isInteger(fact)) throw new Error(`liveActualChangedLines: факт блока «${blockId}» не целое — битое наблюдение, а не отсутствие`);
    return fact;
  }
  // Единицу объёма считает живой модуль: insertions + deletions, с запретом
  // подстановки нуля вместо отсутствующего слагаемого (бросает сам).
  return changedLines(fact);
}

/**
 * Приёмник исхода «предсказание ↔ факт» поверх ЖИВОГО `verdictFor`.
 * Порог — числом В ЗАПИСИ (запись обязана остаться читаемой после смены
 * порога); времени исхода здесь нет: его ставит владелец записи, не приёмник.
 *
 * @param {{sprintId?: string, blockId: string, personaId?: string|null,
 *          predictedChangedLines?: number|null, actualChangedLines: number|null,
 *          threshold?: number}} v
 * @returns {{ok: true, record: object}|{ok: false, reason: string}}
 */
export function liveOutcome(v) {
  if (typeof v?.actualChangedLines !== 'number') {
    return { ok: false, reason: 'факта объёма нет — исход не наступил; ноль вместо факта не подставляется' };
  }
  // Порог обязан быть числом В записи: `null`/`undefined` дали бы вердикт
  // `verdictFor` по сравнению с не-числом и рассинхрон fit ↔ threshold
  // (разбор Дынина 11.08). Явный отказ вместо тихого NaN-сравнения.
  const threshold = v.threshold === undefined || v.threshold === null
    ? OVERSIZED_CHANGED_LINES
    : v.threshold;
  if (!Number.isInteger(threshold)) {
    return { ok: false, reason: 'порог не целое число — вердикт по нечисловому порогу не выносится' };
  }
  return {
    ok: true,
    record: Object.freeze({
      sprintId: v.sprintId ?? null,
      blockId: v.blockId,
      personaId: v.personaId ?? null,
      predictedChangedLines: v.predictedChangedLines ?? null,
      actualChangedLines: v.actualChangedLines,
      fit: verdictFor(v.actualChangedLines, threshold),
      threshold,
    }),
  };
}

/** Роды следов — реэкспорт закрытого списка живого модуля, своего словаря мост не заводит. */
export { TRACE_KINDS };
