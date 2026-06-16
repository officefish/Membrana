/**
 * Стратегический план на следующий день.
 *
 * Читает WHITE_PAPER.md + git log за последние 24 часа и через Anthropic
 * генерирует план следующего дня. Результат: docs/STRATEGIC_PLAN_DAY.md
 * (файл перезаписывается).
 *
 * Запуск:
 *   yarn plan:day
 *   yarn plan:day --full
 *   node scripts/strategic-plan-day.mjs --since="midnight"
 */
import { resolve } from 'node:path';
import { parseCommonArgs, runStrategicPlan } from './_strategic-plan.mjs';

const COMMAND_NAME = 'strategic-plan-day';
const DEFAULT_SINCE = '1 day ago';
const HORIZON_LABEL = 'следующий день';
const RANGE_LABEL_TEMPLATE = (since) => `последние сутки (since="${since}")`;

const { full, since } = parseCommonArgs(process.argv.slice(2), {
  commandName: COMMAND_NAME,
  defaultSince: DEFAULT_SINCE,
  defaultHorizon: HORIZON_LABEL,
});

await runStrategicPlan({
  since,
  rangeLabel: RANGE_LABEL_TEMPLATE(since),
  horizonLabel: HORIZON_LABEL,
  outputPath: resolve(process.cwd(), 'docs/STRATEGIC_PLAN_DAY.md'),
  commandName: `yarn plan:day${full ? ' --full' : ''}`,
  full,
  includeDetectionPriorities: true,
});
