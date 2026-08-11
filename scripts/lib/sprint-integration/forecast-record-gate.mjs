/**
 * forecast-record-gate — третий провод жгута sprint-integration (ADR-0026, блок b3
 * спринта `s-queue-tail-2026-08-10`): обязательность записи «предсказание ↔ исход»
 * при закрытии прогона `membrana-local-sprint`.
 *
 * Долг мостика `#forecast-record-step-optional`: провод plan-to-forecast построен,
 * по нему ходили 01–03.08 и перестали — ни один гейт записи не требовал. Здесь гейт
 * ЧИТАЕТ флаг open-записи (`forecastRequiredOf`, амнистия @1 по построению) и требует
 * существующей валидной записи прогноза. Ставить флаг — дело держателя прогона
 * (`ensureSprintRunOpen`), не этого провода: ответственности не смешиваются.
 *
 * Причины отказа — закрытое множество (просьба Дынина на прогоне контекста b3):
 * свободный текст в problems расползается по тестам.
 *
 * Связка прогноза с планом — по множеству блоков (`cutBlockId` ≡ blockId ратифицированного
 * плана), а не по planDigest: носитель прогнозов поля digest сегодня не несёт, а заводить
 * его — правка forecast-record.mjs вне зоны блока. Отступление от буквы Дынина названо
 * здесь и в следе исполнения; сила та же по существу — прогноз по устаревшей нарезке
 * (иной состав блоков) не засчитывается, перерезка требует нового прогноза.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { FORECAST_RECORDS_REL_PATH, validateForecastRecord } from '../sprint-experience/forecast-record.mjs';

/**
 * Носитель записей рода — константа переехала К РОДУ (b2 s-queue-2026-08-11):
 * вторая правда пути здесь расходилась с писателем молча. Реэкспорт держит
 * живых потребителей (execution-gate.mjs).
 */
export { FORECAST_RECORDS_REL_PATH };

/** Закрытое множество причин отказа. Род вне списка — ошибка кода, не «прочее». */
export const FORECAST_GATE_REASONS = Object.freeze({
  MISSING_FORECAST: 'missing_forecast',
  INVALID_FORECAST_RECORD: 'invalid_forecast_record',
  PLAN_BLOCKS_MISMATCH: 'plan_blocks_mismatch',
});

/**
 * Прочитать ленту прогнозов. Файла нет → пустой список записей (лента могла ещё не
 * родиться), битая строка — проблема входа, а не молчаливый пропуск.
 *
 * @param {string} repoRoot
 * @returns {{records: any[], problems: string[]}}
 */
export function loadForecastRecords(repoRoot) {
  const abs = resolve(repoRoot, FORECAST_RECORDS_REL_PATH);
  if (!existsSync(abs)) return { records: [], problems: [] };
  const records = [];
  const problems = [];
  const lines = readFileSync(abs, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const s = lines[i].trim();
    if (!s) continue;
    try {
      records.push(JSON.parse(s));
    } catch {
      problems.push(`${FORECAST_RECORDS_REL_PATH}:${i + 1} — строка не парсится`);
    }
  }
  return { records, problems };
}

/**
 * Чистая проверка обязательности прогноза для закрываемого прогона.
 *
 * `required` — по формуле ADR-0026 (вычисляет вызывающий через `forecastRequiredOf`
 * над ПОСЛЕДНЕЙ незакрытой open-записью — тот же инвариант, что у `closeProcedureRun`).
 * `satisfied` ⇔ ∃ запись: `sprintId === runId` ∧ валидна ∧ состав `cutBlockId`
 * совпадает с множеством блоков ратифицированного плана.
 *
 * @param {{required: boolean, runId: string, planBlockIds: string[], forecastRecords: any[]}} input
 * @returns {{required: boolean, satisfied: boolean, matching: number, reasons: string[]}}
 */
export function checkForecastRequirement({ required, runId, planBlockIds, forecastRecords }) {
  if (!required) return { required: false, satisfied: true, matching: 0, reasons: [] };
  const candidates = (forecastRecords ?? []).filter((r) => r?.sprintId === runId);
  if (candidates.length === 0) {
    return { required: true, satisfied: false, matching: 0, reasons: [FORECAST_GATE_REASONS.MISSING_FORECAST] };
  }
  const wanted = new Set(planBlockIds ?? []);
  const reasons = new Set();
  let matching = 0;
  for (const rec of candidates) {
    if (!validateForecastRecord(rec).ok) {
      reasons.add(FORECAST_GATE_REASONS.INVALID_FORECAST_RECORD);
      continue;
    }
    const got = new Set((rec.predicted?.blocks ?? []).map((b) => b?.cutBlockId).filter(Boolean));
    const sameSize = got.size === wanted.size;
    const covers = sameSize && [...wanted].every((id) => got.has(id));
    if (!covers) {
      reasons.add(FORECAST_GATE_REASONS.PLAN_BLOCKS_MISMATCH);
      continue;
    }
    matching += 1;
  }
  if (matching > 0) return { required: true, satisfied: true, matching, reasons: [] };
  return { required: true, satisfied: false, matching: 0, reasons: [...reasons] };
}
