/**
 * Прогон гейта: план + лента → `GateReport` + код возврата. Чистая функция.
 *
 * Порядок жёсткий: сначала РАЗБОР ВХОДА (ошибка входа → вердиктов нет вовсе, код 2),
 * затем ПУСТОЙ КОРПУС (ратифицированный вердикт M5: «чисто» при пустом корпусе — это
 * «корпуса нет»), только затем предикаты по блокам.
 */

import { VERDICT_CLASS, VERDICTS, resolveExitCode } from './gate-exit-codes.mjs';
import { readPlan } from './plan-reader.mjs';
import { judgeBlock } from './predicates.mjs';
import { readTraceCorpus } from './trace-corpus.mjs';

/**
 * @typedef {object} GateReport
 * @property {string} planId
 * @property {string|null} now                       только шапка отчёта; в предикаты не попадает
 * @property {number} checkedBlocks
 * @property {number} corpusSize
 * @property {number} exitCode
 * @property {import('./predicates.mjs').BlockJudgement[]} blocks
 * @property {{toothId:string, blockId:string, reason:string}[]} findings
 * @property {{toothId:string, blockId:string, traceId:string, reason:string}[]} disqualified
 * @property {{code:string, subject:string, detail:string}[]} inputErrors
 */

/**
 * @param {{
 *   planRaw: unknown,
 *   traceRecords: readonly unknown[],
 *   knownPersonas: readonly string[],
 *   allowedReasons: readonly string[],
 *   resolveRef: (ref: string) => boolean,
 *   now?: string|null,
 *   preErrors?: readonly {code:string,subject:string,detail:string}[],
 * }} o
 * @returns {GateReport}
 */
export function runGate({
  planRaw,
  traceRecords,
  knownPersonas,
  allowedReasons,
  resolveRef,
  now = null,
  preErrors = [],
}) {
  const { plan, errors: planErrors } = readPlan(planRaw, { knownPersonas, allowedReasons });
  const { traces, errors: traceErrors } = readTraceCorpus(traceRecords, { knownPersonas });
  const inputErrors = [...preErrors, ...planErrors, ...traceErrors];

  const base = {
    planId: plan?.planId ?? '(план не прочитан)',
    now,
    corpusSize: traces.length,
    inputErrors,
  };

  if (inputErrors.length > 0 || plan === null) {
    // Проверка НЕ СОСТОЯЛАСЬ. Ни одного вердикта: и «ложный красный», и тихий приём хуже отказа.
    return {
      ...base,
      checkedBlocks: 0,
      blocks: [],
      findings: [],
      disqualified: [],
      exitCode: resolveExitCode({ verdicts: [], inputErrors, corpusSize: traces.length, checkedBlocks: 0 }),
    };
  }

  /** @type {import('./predicates.mjs').BlockJudgement[]} */
  let blocks;
  if (traces.length === 0) {
    // Пустая лента → `no_corpus` КАЖДОМУ блоку, включая блоки второй двери: гейт признаёт,
    // что у него нет предмета, а не выносит «не применимо» над несуществующим корпусом.
    blocks = plan.blocks.map((b) => ({
      blockId: b.blockId,
      personaId: b.assigned,
      verdict: VERDICTS.NO_CORPUS,
      evidenceRefs: [],
      reason: 'корпуса нет: лента вещдоков пуста — вопрос о честности неразрешим',
      stopped: true,
      findings: [],
      disqualified: [],
    }));
  } else {
    blocks = plan.blocks.map((b) => judgeBlock(b, traces, { resolveRef }));
  }
  for (const b of blocks) b.stopped = VERDICT_CLASS[b.verdict] === 'stop';

  const findings = blocks.flatMap((b) => b.findings);
  const disqualified = blocks.flatMap((b) => b.disqualified);
  return {
    ...base,
    checkedBlocks: blocks.length,
    blocks,
    findings,
    disqualified,
    exitCode: resolveExitCode({
      verdicts: blocks.map((b) => b.verdict),
      inputErrors,
      corpusSize: traces.length,
      checkedBlocks: blocks.length,
    }),
  };
}
