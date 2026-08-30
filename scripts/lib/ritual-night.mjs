/**
 * ritual-night — чистое ядро ночной цепочки: РИТМ и ВЕРДИКТ. Без fs, без сети, без spawn.
 *
 * ПОЧЕМУ ОТДЕЛЬНО ОТ CLI. Ровно по образцу вечера: решения живут функциями, проверяемыми без
 * запуска процессов, а CLI остаётся тонким. Вчерашний урок этого спринта — обратный пример:
 * разбор аргументов жил в CLI, зуба на него не было, и отказ на неизвестный флаг молча не работал.
 *
 * СЕМАНТИКА ОТКАЗА НЕ ИЗОБРЕТАЕТСЯ ЗАНОВО. Критичность, статусы и объяснения берутся у вечера
 * (`step-status.mjs`): критичный падает ГРОМКО и блокирует зависимых, независимые идут дальше,
 * прогон отдаёт не-ноль, если упал хоть один критичный. Второй словарь статусов на одну механику
 * означал бы два несводимых языка про одно и то же.
 */

/** Ритмы, которые ночь умеет. Закрытый словарь: незнакомый ритм — поломка манифеста, не «наверное ежедневно». */
export const NIGHT_CADENCES = Object.freeze(['daily', 'weekly-monday']);

/**
 * Шаг сегодня к исполнению?
 *
 * ЗАЧЕМ РИТМ ВООБЩЕ. Пять процессов ночи жили по РАЗНЫМ расписаниям: пробы сети и полный корпус
 * тестов — каждую ночь, корпус Vitest и недельный план — по понедельникам, охота — по будням.
 * Склеить их в одну частоту значило бы соврать о процессе: недельный план погнало бы каждые сутки.
 *
 * @param {{cadence?: string}} step
 * @param {number} weekday 0=воскресенье … 1=понедельник
 */
export function stepDueOn(step, weekday) {
  const cadence = step?.cadence ?? 'daily';
  if (cadence === 'daily') return true;
  if (cadence === 'weekly-monday') return weekday === 1;
  // Незнакомый ритм НЕ исполняется молча и НЕ пропускается молча — он поломка манифеста.
  throw new Error(`ritual-night: шаг «${step?.id}» несёт незнакомый ритм «${cadence}» (знаем: ${NIGHT_CADENCES.join(', ')})`);
}

/**
 * План прогона: что идёт, что отложено ритмом, что не выбрано `--only`.
 *
 * ОТЛОЖЕННОЕ РИТМОМ НЕ ПРЯЧЕТСЯ. Шаг, чья ночь не сегодня, попадает в план со словом `не сегодня`,
 * а не исчезает: сводка обязана отличать «не запускался, потому что вторник» от «не запускался,
 * потому что упал предшественник». Молчание об отложенном — это ровно та слепота, из-за которой
 * пять механизмов умерли незамеченными.
 *
 * @param {readonly {id:string, cadence?:string}[]} steps
 * @param {{weekday:number, only?:Set<string>|null, all?:boolean}} opts
 */
export function planNight(steps, opts) {
  const { weekday, only = null, all = false } = opts ?? {};
  return (steps ?? []).map((step) => {
    if (only && !only.has(step.id)) return { step, run: false, why: 'не выбран --only' };
    if (!all && !stepDueOn(step, weekday)) {
      return { step, run: false, why: `не сегодня — ритм «${step.cadence}»` };
    }
    return { step, run: true, why: null };
  });
}

/**
 * Вердикт прогона по статусам шагов.
 *
 * `preflightOk === false` — это НЕ «ноль шагов упало». Ночь, не начавшаяся из-за проводов, и ночь,
 * прошедшая пустой, — разные события, и сводка обязана их различать.
 *
 * @param {{preflightOk:boolean, statuses?: readonly {id:string, status:string}[]}} run
 */
export function nightVerdict(run) {
  const statuses = run?.statuses ?? [];
  if (run?.preflightOk === false) {
    return { ok: false, stopped: 'preflight', failed: [], findings: [], exitCode: 1 };
  }
  const failed = statuses.filter((s) => s.status === 'failed-critical').map((s) => s.id);
  const findings = statuses.filter((s) => s.status === 'skipped-noncritical').map((s) => s.id);
  return { ok: failed.length === 0, stopped: null, failed, findings, exitCode: failed.length === 0 ? 0 : 1 };
}

/** Слова вердикта. Молчания нет ни в одной ветке — это требование, а не украшение. */
export function nightWords(verdict) {
  if (verdict.stopped === 'preflight') {
    return 'ночь НЕ НАЧАЛАСЬ: preflight красный — провода или ствол; ни один шаг не запускался';
  }
  const tail = verdict.findings.length > 0 ? ` (находки: ${verdict.findings.join(', ')})` : '';
  return verdict.ok
    ? `ночь пройдена${tail}`
    : `ночь НЕ ПРОЙДЕНА — упали критичные: ${verdict.failed.join(', ')}${tail}`;
}
