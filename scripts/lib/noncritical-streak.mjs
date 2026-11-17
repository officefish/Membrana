/**
 * Серия красных вечеров у НЕКРИТИЧНОГО шага и эскалация по порогу (#2580, спринт
 * office-mongo-credentials-2580, блок b3).
 *
 * Вещдок: `archivarius-evening` (noncritical) падал 8 вечеров подряд (27.09–04.10) — отказ
 * батча после ретраев, exit 1, — и никто не заметил. Конструктивная немота: некритичный
 * отказ получал статус `skipped-noncritical`, а close журнала писал gaps только критичных
 * и трения только находок; в ленте за неделю этот шаг не встречается ни разу как отказ.
 *
 * Решение владельца 04.10 (развилки 2 и 3 плана): счётчик + эскалация, общий механизм для
 * ВСЕХ некритичных шагов вечера; порог — поле шага `escalateAfterConsecutive`, умолчание 2.
 * Находка (exit из findingExitCodes, у archivarius-evening — 3 «office недоступен») серию
 * не продлевает.
 *
 * Носитель серии — лента журнала прогонов `docs/procedure-runs/trail/*.jsonl`, записи
 * close процедуры `ritual-evening`. Отдельного счётчика-файла нет: память серии — то, что
 * вечер уже пишет в журнал, второй источник правды разошёлся бы с ним.
 *
 * Как вечер судится для шага (последний close вечера по `at`; вечер = дата из runId):
 *   red     — трение `noncritical-fail <id> exit N` ИЛИ id в gaps (эскалированный вечер
 *             пишет и то, и другое — серия не рвётся на собственной эскалации);
 *   neutral — трение `<id>: finding exit N`: шаг не смог сделать работу по внешней причине
 *             (office недоступен) — ни продления, ни разрыва, как день без вечера;
 *   green   — ни того, ни другого: шаг отработал — серия сброшена.
 * Дни без прогона вечера (нет close) серию не рвут и не продлевают — их просто нет в ряду.
 * История до этого блока трений `noncritical-fail` не несёт и читается как green: первая
 * эскалация возможна не раньше второго вечера после слияния.
 *
 * Чистые функции + одна функция чтения ленты (fs), ввод проверяется: неизвестный формат
 * записи пропускается, а не роняет вечер.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { criticalityOf } from './step-status.mjs';

export const EVENING_PROCEDURE_ID = 'ritual-evening';
export const NONCRITICAL_FAIL_PREFIX = 'noncritical-fail';
/** Умолчание порога — решение владельца 04.10. */
export const DEFAULT_ESCALATE_AFTER = 2;
/** Сколько последних файлов ленты читать: серия длиннее месяца уже давно эскалирована. */
export const TRAIL_LOOKBACK_FILES = 45;

const TRAIL_REL = 'docs/procedure-runs/trail';
const RUN_DATE_RE = /^ritual-evening-(\d{4}-\d{2}-\d{2})(?:-r\d+)?$/u;
const STEP_ID_RE = /^[a-z0-9][a-z0-9-]*$/u;

/** @typedef {'red'|'green'|'neutral'} EveningVerdict */
/**
 * @typedef {{ runId: string, at: string, procedureId: string, runPhase: string,
 *   coverage?: { gaps?: string[] }, friction?: Array<{ symptom?: string }> }} CloseRecord
 */

function assertStepId(stepId) {
  if (typeof stepId !== 'string' || !STEP_ID_RE.test(stepId)) {
    throw new Error(`noncritical-streak: недопустимый id шага «${String(stepId)}»`);
  }
}

/**
 * Трение некритичного отказа для close журнала. Формат — контракт с `eveningVerdictForStep`.
 * @param {{ id: string, exitCode?: number|null }} f
 * @returns {string}
 */
export function noncriticalFailSymptom(f) {
  assertStepId(f?.id);
  return `${NONCRITICAL_FAIL_PREFIX} ${f.id} exit ${f.exitCode ?? '?'}`;
}

/**
 * Порог эскалации шага: поле манифеста или умолчание 2.
 * @param {{ escalateAfterConsecutive?: number }} step
 * @returns {number}
 */
export function escalationThreshold(step) {
  const v = step?.escalateAfterConsecutive;
  return Number.isInteger(v) && v >= 1 ? v : DEFAULT_ESCALATE_AFTER;
}

/**
 * Close-записи вечера, по одной на вечер (последняя по `at`), в порядке дат.
 * @param {Array<Record<string, any>>} records записи ленты (любые процедуры)
 * @param {{ excludeDate?: string }} [opts] дата сегодняшнего вечера — его close ещё не судится
 * @returns {Array<{ date: string, record: CloseRecord }>}
 */
export function eveningCloses(records, opts = {}) {
  const byDate = new Map();
  for (const r of Array.isArray(records) ? records : []) {
    if (r?.procedureId !== EVENING_PROCEDURE_ID || r?.runPhase !== 'close') continue;
    const m = RUN_DATE_RE.exec(String(r.runId ?? ''));
    if (!m || typeof r.at !== 'string') continue;
    const date = m[1];
    if (date === opts.excludeDate) continue;
    const prev = byDate.get(date);
    if (!prev || prev.at < r.at) byDate.set(date, r);
  }
  return [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, record]) => ({ date, record }));
}

/**
 * Вердикт одного вечера для шага.
 * @param {CloseRecord} record
 * @param {string} stepId
 * @returns {EveningVerdict}
 */
export function eveningVerdictForStep(record, stepId) {
  assertStepId(stepId);
  const symptoms = (Array.isArray(record?.friction) ? record.friction : []).map((f) => String(f?.symptom ?? ''));
  const gaps = Array.isArray(record?.coverage?.gaps) ? record.coverage.gaps : [];
  if (gaps.includes(stepId) || symptoms.some((s) => s.startsWith(`${NONCRITICAL_FAIL_PREFIX} ${stepId} `))) return 'red';
  if (symptoms.some((s) => s.startsWith(`${stepId}: finding exit `))) return 'neutral';
  return 'green';
}

/**
 * Красных вечеров подряд ДО сегодняшнего: с конца ряда, neutral пропускается, green рвёт.
 * @param {Array<{ record: CloseRecord }>} closes результат eveningCloses
 * @param {string} stepId
 * @returns {number}
 */
export function priorRedStreak(closes, stepId) {
  let n = 0;
  for (let i = closes.length - 1; i >= 0; i -= 1) {
    const v = eveningVerdictForStep(closes[i].record, stepId);
    if (v === 'green') break;
    if (v === 'red') n += 1;
  }
  return n;
}

/**
 * Итог сегодняшнего вечера для шага: серия и эскалация.
 *
 * Только некритичный шаг со статусом `skipped-noncritical` продлевает серию; находка уже
 * имеет статус `ok` (step-status.isFinding) и сюда приходит как не-красная — серия 0
 * сегодня, но прежняя серия не сжигается (neutral решается при чтении ленты завтра).
 *
 * @param {{ id: string, criticality?: string, escalateAfterConsecutive?: number }} step
 * @param {'ok'|'failed-critical'|'skipped-noncritical'} status статус по step-status
 * @param {number} prior результат priorRedStreak
 * @returns {{ status: 'ok'|'failed-critical'|'skipped-noncritical', streak: number, threshold: number, escalated: boolean }}
 */
export function applyNoncriticalEscalation(step, status, prior) {
  const threshold = escalationThreshold(step);
  if (criticalityOf(step) !== 'noncritical' || status !== 'skipped-noncritical') {
    return { status, streak: 0, threshold, escalated: false };
  }
  const streak = (Number.isInteger(prior) && prior > 0 ? prior : 0) + 1;
  const escalated = streak >= threshold;
  return { status: escalated ? 'failed-critical' : status, streak, threshold, escalated };
}

/**
 * Прочитать close-записи вечера из последних файлов ленты. Нечитаемая строка пропускается
 * (вечер не заложник порчи журнала — её ловит validateProcedureRunTrail), счёт пропусков
 * возвращается.
 * @param {string} repoRoot
 * @param {{ lookback?: number }} [opts]
 * @returns {{ records: Array<Record<string, any>>, skippedLines: number }}
 */
export function readEveningTrail(repoRoot, opts = {}) {
  const dir = resolve(repoRoot, TRAIL_REL);
  if (!existsSync(dir)) return { records: [], skippedLines: 0 };
  const files = readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/u.test(f))
    .sort()
    .slice(-(opts.lookback ?? TRAIL_LOOKBACK_FILES));
  const records = [];
  let skippedLines = 0;
  for (const f of files) {
    for (const line of readFileSync(join(dir, f), 'utf8').split(/\r?\n/u)) {
      if (!line.includes(`"${EVENING_PROCEDURE_ID}"`)) continue;
      try {
        records.push(JSON.parse(line));
      } catch {
        skippedLines += 1;
      }
    }
  }
  return { records, skippedLines };
}
