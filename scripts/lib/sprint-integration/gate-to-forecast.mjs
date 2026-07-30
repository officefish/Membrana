/**
 * Адаптер шва **B→C**: вердикт исполнения (`execution-gate`) → исход для петли опыта.
 *
 * Контракт: `INTERFACE_CONTRACT.md` §3, адаптер №3. Этот шов **частично несводим**, и адаптер
 * существует ровно для того, чтобы несводимость проявилась честным отсутствием, а не цифрой.
 *
 * ЧЕГО ЗДЕСЬ НЕТ И НЕ БУДЕТ — объёма. Гейт отказался его считать по существу: две независимых
 * меры объёма в одном контуре дают гарантированное расхождение на шве. Отказ правильный, и
 * адаптер его **уважает**, а не обходит: `observed` без привязки сегментов остаётся пустым, и
 * `computeCutAccuracy` честно отдаёт `no-attribution`.
 *
 * ТРИ ВХОДА C БЕЗ ПРОИЗВОДИТЕЛЯ (дефект резки координатора, признан):
 *   N1 привязка сегментов ревью к блоку → `no-attribution`;
 *   N2 журнал остановок ВЕДУЩЕЙ (`leadStop` ≠ `gateStop`) → `no-stops-recorded`;
 *   N3 лента вещдоков — строится (решение владельца §5), остальные два ждут боевого прогона.
 *
 * Слово «остановка» здесь столкнулось, и столкновение разведено в самих именах: `gateStop` —
 * класс вердикта гейта, `leadStop` — процедурный стоп ведущей. Смешать их значило бы считать
 * долю ложных остановок ведущей по остановкам гейта, то есть мерить одно другим.
 */

/** Остановки ГЕЙТА из отчёта — не остановки ведущей. Отдаются как есть, переопределять нельзя. */
export function gateStops(report) {
  return Object.freeze(
    (report?.blocks ?? [])
      .filter((b) => b.stopped === true)
      .map((b) => Object.freeze({ blockId: b.blockId, personaId: b.personaId, verdict: b.verdict, reason: b.reason })),
  );
}

/**
 * Исход для записи рода. `segments` — привязка сегментов ревью к блокам (N1). Пока носителя
 * нет, сюда приезжает пустой массив, и это **честное отсутствие**, а не ноль строк.
 *
 * @param {object} report `GateReport` блока B
 * @param {readonly {blockId: string, changedLines: number}[]} [segments] N1, по умолчанию пусто
 */
export function gateToForecastObserved(report, segments = []) {
  return Object.freeze({
    // Сквозняком: вердикт, признак остановки, знаменатели. Признак `stopped` C получает, но
    // права его переопределить не имеет — условие блока B, принято контрактом.
    verdicts: Object.freeze(
      (report?.blocks ?? []).map((b) =>
        Object.freeze({ blockId: b.blockId, verdict: b.verdict, stopped: b.stopped === true }),
      ),
    ),
    corpusSize: report?.corpusSize ?? 0,
    checkedBlocks: report?.checkedBlocks ?? 0,
    exitCode: report?.exitCode ?? null,
    disqualified: Object.freeze([...(report?.disqualified ?? [])]),
    inputErrors: Object.freeze([...(report?.inputErrors ?? [])]),
    // N1: объём НЕ берётся из гейта. Пусто → `computeCutAccuracy` даст `no-attribution`.
    blocks: Object.freeze([...segments]),
  });
}

/**
 * Журнал остановок ВЕДУЩЕЙ для `computeFalseStopRate`. Носителя не существует (N2), поэтому
 * возвращается пустой список — и метрика честно скажет `no-stops-recorded`.
 *
 * Функция существует именно для того, чтобы отсутствие носителя было **названным местом в
 * коде**, а не забытой строкой: когда журнал появится, менять придётся одну функцию.
 */
export function leadStopsJournal() {
  return Object.freeze([]);
}
