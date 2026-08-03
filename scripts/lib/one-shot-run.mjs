/**
 * one-shot-run — контракт записи прогона шота и предикат готовности к исполнению.
 *
 * Спринт `one-shot-recut`, блок `shot-run-contract` (Веснин). Исполняет вердикты M2
 * (акт назначения) и часть M1 (три точки записи) заседания `one-shot-manifest` (03.08).
 *
 * ПРОИЗВОДИТЕЛЬ ЖУРНАЛА (#1649): прогон шота создаётся вызовом, не рукой. Носитель —
 * общая лента `docs/procedure-runs/trail/` (schema `procedure-run-journal@1`), своего
 * носителя у шота нет. Три точки записи на прогон: старт `first-frame` → resume гейта
 * `owner-ratify` → закрытие `execute`.
 *
 * СХЕМА НЕ ПОДНИМАЕТСЯ (приговор держателя): валидатор журнала лишние ключи не отвергает
 * и пересчитывает leafHash по всей записи, значит поля M2 в корне остаются в контракте @1.
 * Критерий будущего bump назван: смена алгоритма хеша, требование/запрет нового поля
 * валидатором, поломка чтения старых записей — ни одно не наступает.
 *
 * ШВЫ (ратифицированы нарезкой):
 * - `one-shot-trail` НЕ импортируется, в его журнал не пишем: тот — история шотов для
 *   анти-цепочки, а не журнал прогонов;
 * - ростер персон НЕ чеканится третьей копией: 03.08 вычинен ВТОРОЙ экземпляр устаревшего
 *   ростера (класс #1644), и здесь стоит импорт из единственного источника.
 *
 * Модуль чист: ни fs, ни часов — запись, время и резолв `contextRunRef` приносит
 * вызывающий. Append делает `appendProcedureRunRecord` журнала.
 */
import { leafHash } from './run-ledger/index.mjs';
import { buildProcedureRunRecord } from './procedure-run-journal.mjs';
import { PROCEDURE_PERSONAS } from './validate-procedure.mjs';

/** Единственный законный автор назначения (Т4 шторма 03.08): литерал роли, не PersonaId. */
export const ASSIGNED_BY = 'teamlead';

/** Причины отказа готовности. Закрыт: неразличимые «нет» — болезнь, которую блок лечит. */
export const NOT_READY_REASONS = Object.freeze([
  'missing_assign',
  'missing_context_run',
  'context_not_before_execute',
]);

/** Три точки записи прогона (вердикт M1). Порядок несущий: sequence 1..3 внутри runId. */
export const SHOT_RUN_POINTS = Object.freeze(['first-frame', 'owner-ratify', 'execute']);

/**
 * Проблемы акта назначения. Пусто = назначение валидно.
 *
 * `executor` сверяется с ЕДИНСТВЕННЫМ ростером (`PROCEDURE_PERSONAS`), `assignedBy` —
 * строго литерал роли: PersonaId тимлида здесь был бы второй правдой о том же факте.
 *
 * @param {{shotId?: unknown, executor?: unknown, assignedBy?: unknown, contextRunRef?: unknown}} r
 * @returns {string[]}
 */
export function assignProblems(r) {
  const problems = [];
  if (typeof r?.shotId !== 'string' || r.shotId.trim() === '') problems.push('shotId пуст');
  if (typeof r?.executor !== 'string' || !PROCEDURE_PERSONAS.includes(r.executor)) {
    problems.push(`executor «${String(r?.executor)}» вне ростера (${PROCEDURE_PERSONAS.join('/')})`);
  }
  if (r?.assignedBy !== ASSIGNED_BY) {
    problems.push(`assignedBy «${String(r?.assignedBy)}» — назначает только ${ASSIGNED_BY} (Т4)`);
  }
  if (typeof r?.contextRunRef !== 'string' || r.contextRunRef.trim() === '') {
    problems.push('contextRunRef пуст — след контекста не назван');
  }
  return problems;
}

/**
 * Готовность к исполнению (вердикт M2): назначение валидно И след профильного контекста
 * исполнителя существует И лежит СТРОГО РАНЬШЕ открытия кадра `execute`.
 *
 * Чистая функция: `contextRun` резолвит вызывающий по `record.contextRunRef` — fs здесь
 * нет. Равенство времён — отказ: «одновременно» не есть «раньше».
 *
 * Ложь различима тремя причинами, а не одним «не готов»: слабость honest_pair (#1641) —
 * вердикт, чьё имя обещает больше, чем проверяет предикат, — сюда не переносится.
 *
 * @param {{shotId?: string, executor?: string, assignedBy?: string, contextRunRef?: string}} record
 * @param {{contextRun: {personaId: string, at: string} | null, executeOpenedAt: string}} input — оба времени ISO-8601 в одной форме: сравнение лексикографическое
 * @returns {{ok: true} | {ok: false, reason: string, problems: string[]}}
 */
export function readyToExecute(record, { contextRun, executeOpenedAt }) {
  const problems = assignProblems(record);
  if (problems.length > 0) return { ok: false, reason: 'missing_assign', problems };

  if (
    contextRun === null ||
    typeof contextRun?.at !== 'string' ||
    contextRun.personaId !== record.executor
  ) {
    return {
      ok: false,
      reason: 'missing_context_run',
      problems: [
        contextRun === null
          ? `след по адресу ${record.contextRunRef} не разрешился`
          : `след принадлежит «${String(contextRun?.personaId)}», исполнитель — «${record.executor}»`,
      ],
    };
  }

  if (!(contextRun.at < String(executeOpenedAt))) {
    return {
      ok: false,
      reason: 'context_not_before_execute',
      problems: [
        `след контекста ${contextRun.at} не РАНЬШЕ открытия execute ${String(executeOpenedAt)} — равенство тоже отказ`,
      ],
    };
  }

  return { ok: true };
}

/**
 * Запись одной точки прогона шота: база журнала + поля M2 в корне, leafHash пересчитан
 * по ПОЛНОЙ записи тем же алгоритмом — валидатор журнала проходит без bump схемы.
 *
 * `pass` без вещдока бросает сам строитель журнала — здесь это не дублируется.
 *
 * @param {object} input
 * @param {string} input.runId
 * @param {number} input.sequence 1..3 внутри runId (не глобальный по ленте)
 * @param {'first-frame'|'owner-ratify'|'execute'} input.point
 * @param {'pass'|'fail'|'blocked'|'skipped'} input.status
 * @param {string} input.subject
 * @param {string} input.at ISO-8601 в ОДНОЙ форме на весь прогон (та же зона, та же точность) — сравнение времён в модуле лексикографическое, договор на вызывающем; часы тоже у него
 * @param {string[]} input.evidence
 * @param {string[]} [input.gaps]
 * @param {{shotId: string, executor: string, assignedBy: string, contextRunRef: string}} input.assign
 * @returns {Record<string, unknown>}
 */
export function buildShotRunRecord({ runId, sequence, point, status, subject, at, evidence, gaps = [], assign }) {
  if (!SHOT_RUN_POINTS.includes(point)) {
    throw new Error(`точка «${String(point)}» вне трёх точек прогона (${SHOT_RUN_POINTS.join(' · ')})`);
  }
  const problems = assignProblems(assign);
  if (problems.length > 0) {
    throw new Error(`назначение невалидно: ${problems.join('; ')}`);
  }
  const base = buildProcedureRunRecord({
    procedureId: 'one-shot',
    runId,
    sequence,
    status,
    subject,
    at,
    evidence,
    gaps,
    frameId: point,
  });
  const extended = {
    ...base,
    shotId: assign.shotId,
    executor: assign.executor,
    assignedBy: assign.assignedBy,
    contextRunRef: assign.contextRunRef,
  };
  delete extended.ledger;
  extended.ledger = { algorithm: 'run-ledger.leafHash@1', leafHash: leafHash(extended) };
  return extended;
}

/**
 * Связность прогона по трём записям: общий runId, sequence ровно 1..3, точки в порядке
 * M1, время монотонно, назначение не меняется между точками (исполнитель один — Т3).
 *
 * Закрытие со статусом `fail` и gap `oversize` — ЗАКОННЫЙ исход (M3: красный факт
 * сохраняет запись, а не стирает её), связность он не рвёт.
 *
 * @param {Array<Record<string, any>>} records записи одного runId в порядке ленты
 * @returns {string[]} пусто = прогон связен; при неверном ЧИСЛЕ точек проверка обрывается ранним возвратом — прочие инварианты не проверяются осознанно
 */
export function shotRunProblems(records) {
  const problems = [];
  if (!Array.isArray(records) || records.length !== SHOT_RUN_POINTS.length) {
    return [`точек ${Array.isArray(records) ? records.length : 0} из ${SHOT_RUN_POINTS.length}`];
  }
  const runIds = new Set(records.map((r) => r?.runId));
  if (runIds.size !== 1) problems.push(`runId не един: ${[...runIds].join(', ')}`);
  records.forEach((r, i) => {
    if (r?.sequence !== i + 1) problems.push(`точка ${i + 1}: sequence ${String(r?.sequence)}`);
    if (r?.frameId !== SHOT_RUN_POINTS[i]) {
      problems.push(`точка ${i + 1}: кадр «${String(r?.frameId)}», ждали «${SHOT_RUN_POINTS[i]}»`);
    }
    if (i > 0 && !(String(records[i - 1]?.at) < String(r?.at))) {
      problems.push(`точка ${i + 1}: время не монотонно`);
    }
  });
  const keys = ['shotId', 'executor', 'assignedBy', 'contextRunRef'];
  for (const k of keys) {
    if (new Set(records.map((r) => r?.[k])).size !== 1) {
      problems.push(`${k} меняется между точками — исполнитель один на весь шот (Т3)`);
    }
  }
  return problems;
}
