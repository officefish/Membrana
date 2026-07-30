/**
 * false-stop-rate — доля ложных остановок (автор: ведущая, сигнал НЕ бинарен).
 *
 * Мерка названа отдельно, потому что сигнал у ведущей другой: остановка не «влезла/не влезла»,
 * она **полезна ⟺ после неё что-то изменилось**. Одна мерка на два сигнала была бы либо
 * бинаризацией доли (потеря), либо усреднением бинарного (подгон).
 *
 *   useful(s)     ⇔ ∃ c ∈ changes(objectRef) : stoppedAt < c.at ≤ resolvedAt
 *   falseStopRate = |{ resolved ∧ ¬useful }| / |{ resolved }|
 *
 * Полезность считается ПО ЛЕНТЕ ВЕЩДОКОВ окна, а не по слову ведущей — иначе предикат
 * становится вежливостью, а метрика льстивой. Самозаверение исключено конструкцией:
 * `changes` приходит снаружи, из ленты соседа.
 *
 * Отмена/переделка этапа — тоже изменение, и приходит она сюда как адресуемое событие
 * `kind: 'status'` на том же объекте. Признавать отмену полезной по полю `resolution`
 * (слово ведущей) блок отказывается сознательно: это ровно та лазейка самозаверения.
 *
 * `?? 0` и `|| 0` запрещены — зуб `no-nullish-zero-in-metrics`.
 */
import { absent, present } from './absence.mjs';
import { isLegalNo } from './forecast-record.mjs';

/** Закрытый перечень родов изменения в ленте вещдоков окна. Свободный текст — не изменение. */
export const CHANGE_KINDS = Object.freeze(['new-ref', 'contract-version', 'sha', 'status']);

const sameRef = (a, b) => a.type === b.type && a.value === b.value;

/**
 * Предикат полезности одной остановки. Изменение обязано попасть в окно
 * `(stoppedAt, resolvedAt]` — изменение ДО остановки её не оправдывает.
 */
export function isUsefulStop(stop, changes) {
  if (stop.resolvedAt === null || stop.resolvedAt === undefined) {
    throw new Error(`isUsefulStop: остановка «${String(stop.stopId)}» не разрешена — полезность не наблюдаема`);
  }
  return changes.some((c) => {
    if (!CHANGE_KINDS.includes(c.kind)) {
      throw new Error(`лента вещдоков: kind «${String(c.kind)}» вне закрытого перечня (${CHANGE_KINDS.join(' | ')}) — ошибка входа, а не «прочее»`);
    }
    return sameRef(c.objectRef, stop.objectRef) && stop.stoppedAt < c.at && c.at <= stop.resolvedAt;
  });
}

/**
 * `computeFalseStopRate(stops, changes, { lead })` — чистая функция.
 *
 * @param {readonly object[]} stops журнал остановок ведущей
 *        (`{ stopId, personaId, sprintId, stageId, objectRef, stoppedAt, resolvedAt|null }`)
 * @param {readonly object[]} changes лента вещдоков окна (`{ objectRef, at, kind }`)
 * @param {{ lead?: string | { none: string } }} [opts] признак «окно шло без ведения» (M6)
 * @returns {{defined:true,value:number,numerator:number,denominator:number,pair:object}
 *          |{defined:false,reason:string}}
 */
export function computeFalseStopRate(stops, changes, opts = {}) {
  // M6: за отсутствие ведения хорошая цифра не выдаётся. Проверяется ПЕРВЫМ —
  // «без ведения» описывает всё окно, а не отдельную остановку.
  if (isLegalNo(opts.lead)) return absent('no-lead-appointed');

  const list = Array.isArray(stops) ? stops : [];
  if (list.length === 0) return absent('no-stops-recorded');

  const feed = Array.isArray(changes) ? changes : [];
  for (const s of list) {
    if (s.objectRef === null || typeof s.objectRef !== 'object' || typeof s.objectRef.value !== 'string') {
      throw new Error(`остановка «${String(s.stopId)}» без objectRef — дефект записи, а не запись с неизвестным исходом`);
    }
  }

  const resolved = list.filter((s) => s.resolvedAt !== null && s.resolvedAt !== undefined);
  if (resolved.length === 0) return absent('stops-unresolved');

  let useful = 0;
  for (const s of resolved) if (isUsefulStop(s, feed)) useful += 1;
  const falseStops = resolved.length - useful;

  return present({
    // Направление: ниже — лучше. 0% при НЕПУСТОМ знаменателе — легитимный отличный результат;
    // 0% при пустом знаменателе конструктивно невозможен (выше absent('no-stops-recorded')).
    value: falseStops / resolved.length,
    numerator: falseStops,
    denominator: resolved.length,
    pair: {
      stopsCount: list.length,
      unresolvedCount: list.length - resolved.length,
      usefulCount: useful,
    },
  });
}

/** Строка «не разрешены: k» — без неё ложные остановки навсегда прячутся в «ещё в работе». */
export function renderUnresolved(metric) {
  if (metric.defined === false) return '';
  return `не разрешены: ${metric.pair.unresolvedCount}`;
}
