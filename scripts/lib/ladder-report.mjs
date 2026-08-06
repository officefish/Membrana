/**
 * ladder-report — форма отчёта лестницы «прогресс от объёма» (блок g1, Ф2 эпика
 * detector-scoreboard).
 *
 * Зачем отдельный модуль: до Ф2 стенд `lab-learning-curve.mjs` только ПЕЧАТАЛ таблицу,
 * а витрина Ф1 по канону читает версионируемый JSON. Печать нельзя ни свериться, ни
 * показать — «числа видели в консоли» доказательством не является. Ядро чистое: ни ФС,
 * ни wav, ни детекторов — прогон приносит посчитанные ступени значением, и потому форма
 * проверяется зубом без корпуса.
 *
 * Дисциплина витрины наследуется без ослабления (разбор Дынина 06.08):
 *   · штуки первичны — `detected` из `dronesTotal`, `falseAlarms` из `cleanTotal`;
 *   · интервал НЕСЁТ МЕТОД: `wilson@0.95` — интервал без метода это половина смысла;
 *   · `params.threshold` обязателен: без рабочей точки pd/pfa не восстановимы;
 *   · оба метода сборки остаются в отчёте. Отбор «лучшего по тесту» — подгонка на тесте;
 *     правило отбора живёт полем `selection` и судит по train, проигравший не стирается.
 *
 * Честный предел, названный вслух: у `rocAuc` интервала нет. Считать его bootstrap-ом
 * по тесту эта фаза не бралась, и поле `rocAucCi: null` говорит «не мерено», а не «ноль».
 */

export const LADDER_REPORT_SCHEMA = 'spectral-ladder-report@1.0.0';

/** Метод интервала — один на весь отчёт: расхождение сторон читателю не видно. */
export const INTERVAL_METHOD = 'wilson@0.95';

/**
 * Канонизированная строка для хеша: сортировка ключей, LF, без лишних пробелов.
 * Переименование файла манифест ловит, перекодировка — нет; предел назван (разбор Дынина).
 *
 * @param {unknown} value
 * @returns {string}
 */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * Ступень отчёта из посчитанных метрик прогона.
 *
 * @param {object} input
 * @param {number} input.nTrainDrones ступень считается в записях МЕНЬШЕГО класса (решение резчика)
 * @param {number} input.nTrainTotal фактический объём обучающей части обоих классов
 * @param {'envelope'|'percentile'} input.method
 * @param {{minConfidence: number, withCompetitors: boolean}} input.params рабочая точка
 * @param {{tp: number, fp: number, fn: number, tn: number, pdCI: [number, number], pfaCI: [number, number], rocAuc: number|null}} input.metrics
 * @returns {object}
 */
export function ladderStep({ nTrainDrones, nTrainTotal, method, params, metrics }) {
  const { tp, fp, fn, tn } = metrics;
  // Интервал приводится к КОРТЕЖУ [low, high] — той форме, которой уже говорит витрина
  // Ф1 (`pdInterval: readonly [number, number]`). Библиотека метрик отдаёт `{low, high}`;
  // без нормализации отчёт и потребитель говорили бы о том же на двух языках, и это
  // расхождение первый живой прогон 06.08 как раз и показал.
  const pair = (ci) => (Array.isArray(ci) ? [ci[0], ci[1]] : [ci?.low ?? null, ci?.high ?? null]);
  return {
    nTrainDrones,
    nTrainTotal,
    method,
    params: {
      threshold: params.minConfidence,
      withCompetitors: params.withCompetitors,
    },
    test: {
      // Штуки первичны; доли читатель выведет сам и не спутает масштаб.
      detected: tp,
      dronesTotal: tp + fn,
      falseAlarms: fp,
      cleanTotal: fp + tn,
      pdInterval: pair(metrics.pdCI),
      pfaInterval: pair(metrics.pfaCI),
      intervalMethod: INTERVAL_METHOD,
      rocAuc: metrics.rocAuc ?? null,
      rocAucCi: null,
    },
  };
}

/**
 * Собрать отчёт. Знаменатели теста обязаны совпадать на ВСЕХ ступенях: тест неподвижен,
 * и молчаливое смещение знаменателя — ровно тот класс лжи, ради которого фаза и делается.
 *
 * @param {object} input
 * @param {string} input.generatedAt ISO-8601, приносит вызывающий (модуль без часов)
 * @param {{path: string, droneCount: number, cleanCount: number, manifestSha256: string}} input.corpus
 * @param {{size: number, drones: number, groups: number}} input.test
 * @param {object[]} input.steps
 * @returns {object}
 * @throws {Error} если знаменатели ступеней разошлись с тестом
 */
export function buildLadderReport({ generatedAt, corpus, test, steps }) {
  for (const [i, s] of steps.entries()) {
    if (s.test.dronesTotal !== test.drones || s.test.cleanTotal !== test.size - test.drones) {
      throw new Error(
        `ступень ${i} (nTrainDrones=${s.nTrainDrones}): знаменатели теста разошлись — ` +
          `${s.test.dronesTotal}/${s.test.cleanTotal} против ${test.drones}/${test.size - test.drones}. ` +
          'Тест неподвижен по построению; расхождение означает подмену выборки, а не результат',
      );
    }
  }
  return {
    schema: LADDER_REPORT_SCHEMA,
    generatedAt,
    corpus,
    test,
    // Правило отбора названо, а не подразумевается: победитель определяется по обучающей
    // части, проигравший остаётся в отчёте — иначе витрина покажет подогнанное под тест.
    selection: { by: 'f1', split: 'train', note: 'оба метода сборки остаются в steps' },
    steps,
  };
}
