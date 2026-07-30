/**
 * СТАБ приёмника `GateReport` со стороны блока `experience-loop`.
 *
 * Ничего не считает и ничего не решает: единственная его работа — проверить, что МОЙ ВЫХОД
 * сериализуем и САМОДОСТАТОЧЕН. Если приёмнику придётся дочитывать ленту или план, чтобы
 * понять исход, шов B→C протечёт на интеграции — и узнается это поздно.
 *
 * Кода соседа здесь нет и быть не может: до Phase 3 его формы не существует.
 */

import { ALL_VERDICTS, VERDICT_CLASS } from '../gate-exit-codes.mjs';

/**
 * @param {import('../gate.mjs').GateReport} report
 * @returns {{ ok: boolean, problems: string[], stopped: Record<string, boolean> }}
 */
export function acceptGateReport(report) {
  const problems = [];
  const round = JSON.parse(JSON.stringify(report));

  for (const field of ['planId', 'checkedBlocks', 'corpusSize', 'exitCode']) {
    if (round[field] === undefined) problems.push(`нет поля ${field}`);
  }
  if (round.corpusSize === undefined || round.checkedBlocks === undefined) {
    problems.push('итог без знаменателя: corpusSize/checkedBlocks обязательны');
  }
  for (const b of round.blocks ?? []) {
    if (!ALL_VERDICTS.includes(b.verdict)) problems.push(`${b.blockId}: вердикт вне закрытых семи`);
    if (typeof b.reason !== 'string' || b.reason.trim() === '') {
      problems.push(`${b.blockId}: отказ без причины — пустое поле нелегально`);
    }
    if (typeof b.personaId !== 'string' || b.personaId === '') problems.push(`${b.blockId}: нет personaId`);
    if (b.stopped !== (VERDICT_CLASS[b.verdict] === 'stop')) {
      problems.push(`${b.blockId}: признак stopped расходится с таблицей класса вердикта`);
    }
  }
  for (const f of round.findings ?? []) {
    if (typeof f.toothId !== 'string' || f.toothId === '') problems.push('находка без имени (toothId)');
  }

  // C получает ПРИЗНАК остановки, а не право его переопределить.
  const stopped = Object.fromEntries((round.blocks ?? []).map((b) => [b.blockId, b.stopped === true]));
  return { ok: problems.length === 0, problems, stopped };
}
