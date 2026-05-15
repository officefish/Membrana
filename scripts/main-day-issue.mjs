/**
 * Центральная задача дня → docs/MAIN_DAY_ISSUE.md
 *
 * Последний шаг утреннего ритуала (после standup):
 *   yarn morning-care && yarn plan:day && yarn standup && yarn main-day-issue
 */
import { resolve } from 'node:path';
import { MAIN_DAY_ISSUE_REL } from './lib/main-day-issue-paths.mjs';
import { parseMainDayIssueArgs, runMainDayIssue } from './_main-day-issue.mjs';

const cli = parseMainDayIssueArgs(process.argv.slice(2));
const commandName = `yarn main-day-issue${cli.full ? ':full' : ''}${cli.dryRun ? ':dry' : ''}`;

await runMainDayIssue({
  ...cli,
  outputPath: resolve(process.cwd(), MAIN_DAY_ISSUE_REL),
  commandName,
});
