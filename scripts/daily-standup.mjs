/**
 * Ежедневный стендап виртуальной команды (daily standup / daily sync).
 *
 * Сводит в один план:
 *   - docs/VIRTUAL_TEAM_PROMPT.md
 *   - docs/STRATEGIC_PLAN_DAY.md
 *   - docs/DAILY_CODE_REVIEW.md
 *   - docs/CURRENT_TASK.md (фрагмент)
 *   - открытые GitHub Issues
 *   - наброски packages/temp/*
 *
 * Результат: docs/DAILY_STANDUP.md (перезапись).
 *
 * Запуск:
 *   yarn standup
 *   yarn standup:full
 *   yarn standup:dry
 */
import { resolve } from 'node:path';
import { parseStandupArgs, runDailyStandup } from './_daily-standup.mjs';

const { full, dryRun, issueLimit } = parseStandupArgs(process.argv.slice(2));

const commandName = `yarn standup${full ? ':full' : ''}${dryRun ? ':dry' : ''}`;

await runDailyStandup({
  full,
  dryRun,
  issueLimit,
  outputPath: resolve(process.cwd(), 'docs/DAILY_STANDUP.md'),
  commandName,
});
