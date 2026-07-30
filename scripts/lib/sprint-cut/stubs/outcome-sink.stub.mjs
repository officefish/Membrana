/**
 * СТАБ приёмника записи «моё предсказание ↔ его исход» — замещает `experience-loop`.
 * В память не пишет НИЧЕГО: собирает значения в массив, чтобы форму можно было
 * проверить тестом. В интеграцию не мёржится.
 *
 * Сигнал бинарен: влез (`fitted`) либо переполнился (`overflowed`). Порог назван
 * числом в самой записи, чтобы она осталась читаемой после смены порога.
 * Время исхода — НЕ моё: его ставит владелец записи, поэтому здесь его нет.
 */
import { isSegmentOversized, OVERSIZED_CHANGED_LINES } from '../cut-plan.mjs';

export function makeOutcomeSinkStub() {
  const records = [];
  return Object.freeze({
    records,
    /**
     * @param {{sprintId: string, blockId: string, personaId: string|null,
     *          predictedChangedLines: number|null, actualChangedLines: number|null}} v
     * @returns {{ok: true, record: object} | {ok: false, reason: string}}
     */
    accept(v) {
      if (typeof v?.actualChangedLines !== 'number') {
        return { ok: false, reason: 'факта объёма нет — исход не наступил; ноль вместо факта не подставляется' };
      }
      const record = Object.freeze({
        sprintId: v.sprintId,
        blockId: v.blockId,
        personaId: v.personaId ?? null,
        predictedChangedLines: v.predictedChangedLines ?? null,
        actualChangedLines: v.actualChangedLines,
        fit: isSegmentOversized(v.actualChangedLines) ? 'overflowed' : 'fitted',
        threshold: OVERSIZED_CHANGED_LINES,
      });
      records.push(record);
      return { ok: true, record };
    },
  });
}
