/**
 * Стратегический LLM-план на текущий горизонт (ретроспектива работы за сутки).
 *
 * Читает WHITE_PAPER.md + git log за последние 24 часа и через Anthropic генерирует
 * обзор. Результат: docs/STRATEGIC_PLAN_DAY.md (перезаписывается).
 *
 * #592 S2: календарный горизонт «следующий день» ВЫРЕЗАН — он протекал (утром 17.07
 * произвёл «План на 18.07», и _main-day-issue взял оттуда завтрашнюю дату). Горизонт
 * меряется вехой, а не датой; дальние границы дня теперь считает детерминированный
 * scripts/strategy-day.mjs (yarn strategy:day). Этот план — вторичный ретро-обзор.
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
// Не «следующий день»: горизонт-веха, не календарная дата (S2). Метка описывает ПЕРИОД
// ретроспективы, а не будущую дату — иначе LLM снова напишет «План на <завтра>».
const HORIZON_LABEL = 'текущий горизонт (ретроспектива суток)';
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
  includeDriftDigest: true,
});
