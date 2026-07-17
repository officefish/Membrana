/**
 * Стратегический план на следующую неделю.
 *
 * Читает WHITE_PAPER.md + git log за последние 7 дней и через Anthropic
 * генерирует план следующей недели. Результат: docs/STRATEGIC_PLAN_WEEK.md
 * (файл перезаписывается).
 *
 * Запуск:
 *   yarn plan:week
 *   yarn plan:week --full
 *   node scripts/strategic-plan-week.mjs --since="2 weeks ago"
 */
import { resolve } from 'node:path';
import { parseCommonArgs, runStrategicPlan } from './_strategic-plan.mjs';

const COMMAND_NAME = 'strategic-plan-week';
const DEFAULT_SINCE = '7 days ago';
const HORIZON_LABEL = 'следующая неделя';
const RANGE_LABEL_TEMPLATE = (since) => `последние 7 дней (since="${since}")`;

const { full, since } = parseCommonArgs(process.argv.slice(2), {
  commandName: COMMAND_NAME,
  defaultSince: DEFAULT_SINCE,
  defaultHorizon: HORIZON_LABEL,
});

await runStrategicPlan({
  since,
  rangeLabel: RANGE_LABEL_TEMPLATE(since),
  horizonLabel: HORIZON_LABEL,
  outputPath: resolve(process.cwd(), 'docs/STRATEGIC_PLAN_WEEK.md'),
  commandName: `yarn plan:week${full ? ' --full' : ''}`,
  full,
  includeDetectionPriorities: true,
  // #592 S4/Q5: флаги includeInsights/includeAnalyzersResearch УБРАНЫ из тела недельной.
  // Каналы инсайтов и ресёрча теперь читает горизонт (scripts/lib/strategy-channels.mjs)
  // как ОДИН читатель, параметрами — а не hardcode в замороженной недельной.
});
