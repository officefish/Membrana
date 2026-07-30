/**
 * Рендер отчёта гейта + ТЕКСТУАЛЬНЫЙ ЗУБ на запрет «чисто при пустом корпусе».
 *
 * Ратифицированный вердикт M5 (30.07): если следов нет вовсе, гейт НЕ ИМЕЕТ ПРАВА сказать
 * «нарушений 0». Итог печатается всегда со знаменателем: остановки — из числа блоков,
 * корпус — числом следов. Зуб ниже проверяет отсутствие запрещённой формулировки
 * механически и валит рендер, а не «просит быть аккуратным».
 */

import { VERDICT_CLASS } from './gate-exit-codes.mjs';

/** «Ноль нарушений/остановок/замечаний» — форма, запрещённая при пустом корпусе. */
export const BANNED_EMPTY_CLEAN_RE =
  /(нарушени\p{L}*|остановок|остановки|замечани\p{L}*|нарекани\p{L}*|проблем\p{L}*|чисто)\s*[:—–-]?\s*0(?!\d)/iu;

/**
 * @param {import('./gate.mjs').GateReport} report
 * @returns {string}
 */
export function renderReport(report) {
  const L = [];
  L.push(`execution-gate · план ${report.planId}`);
  L.push(`now: ${report.now ?? 'не задан (в предикаты не попадает)'}`);
  L.push(`корпус: следов ${report.corpusSize} · блоков проверено: ${report.checkedBlocks}`);

  if (report.inputErrors.length > 0) {
    L.push('', 'ошибки входа — ПРОВЕРКА НЕ СОСТОЯЛАСЬ, вердиктов нет:');
    for (const e of report.inputErrors) L.push(`  ${e.code} · ${e.subject} — ${e.detail}`);
  }

  if (report.blocks.length > 0) {
    L.push('', 'вердикты:');
    for (const b of report.blocks) {
      L.push(`  ${b.blockId} · ${b.personaId} · ${b.verdict} — ${b.reason}`);
      if (b.evidenceRefs.length > 0) L.push(`      вещдоки: ${b.evidenceRefs.join(', ')}`);
    }
  }

  if (report.disqualified.length > 0) {
    L.push('', 'дисквалифицированные следы (в вещдоки не входят):');
    for (const d of report.disqualified) {
      L.push(`  ${d.toothId} · ${d.blockId} · ${d.traceId} — ${d.reason}`);
    }
  }

  if (report.findings.length > 0) {
    L.push('', 'находки (вердикта не меняют):');
    for (const f of report.findings) L.push(`  ${f.toothId} · ${f.blockId} — ${f.reason}`);
  }

  const stops = report.blocks.filter((b) => b.stopped).length;
  const green = report.blocks.filter((b) => VERDICT_CLASS[b.verdict] === 'pass').length;
  const refused = report.blocks.filter((b) => VERDICT_CLASS[b.verdict] === 'pass_not_green').length;
  L.push('');
  if (report.corpusSize === 0 && report.inputErrors.length === 0) {
    L.push(
      `итог: КОРПУСА НЕТ — лента вещдоков пуста (следов ${report.corpusSize}); ` +
        `вердикт о честности не выносится по ${report.checkedBlocks} блокам`,
    );
  } else if (report.inputErrors.length > 0) {
    L.push(
      `итог: проверка не состоялась — ошибок входа ${report.inputErrors.length}; ` +
        `блоков проверено ${report.checkedBlocks} из ${report.checkedBlocks}`,
    );
  } else {
    L.push(
      `итог: остановок ${stops} из ${report.checkedBlocks} блоков · зелёных ${green} · ` +
        `вторая дверь ${refused} · корпус: следов ${report.corpusSize} · находок ${report.findings.length}`,
    );
  }
  L.push(`код возврата: ${report.exitCode}`);

  const text = `${L.join('\n')}\n`;
  assertNoEmptyCleanClaim(text, report.corpusSize);
  return text;
}

/**
 * Зуб: при пустом корпусе в тексте не может быть формы «X: 0» из запрещённого набора.
 * Fail-closed — бросает, а не предупреждает: молчаливое «нарушений 0» и есть тот класс,
 * на котором 30.07 был пойман `meeting:audit`.
 *
 * @param {string} text
 * @param {number} corpusSize
 */
export function assertNoEmptyCleanClaim(text, corpusSize) {
  if (corpusSize > 0) return;
  const m = text.match(BANNED_EMPTY_CLEAN_RE);
  if (m !== null) {
    throw new Error(
      `Запрет M5: при пустом корпусе отчёт не может утверждать «${m[0]}» — «чисто» при пустом корпусе это «корпуса нет»`,
    );
  }
}
