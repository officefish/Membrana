/**
 * Еженедельный «радар» внешних аналайзеров: модели и работы, которые могли
 * бы пополнить каталог §4 в `docs/INTEGRATIONS_STRATEGY.md`.
 *
 * Читает: docs/INTEGRATIONS_STRATEGY.md + HuggingFace Hub API + arXiv API.
 * Через Anthropic генерирует отчёт `docs/WEEKLY_ANALYZERS_RESEARCH.md`
 * (файл перезаписывается; история — в git).
 *
 * Документ НЕ участвует в ежедневном code-review, но учитывается
 * недельным планировщиком (`yarn plan:week`).
 *
 * Запуск:
 *   yarn analyzers:research:week
 *   yarn analyzers:research:week --dry-run         # без вызова Anthropic
 *   node scripts/analyzers-research-week.mjs --since-days=14
 */
import { resolve } from 'node:path';
import { parseResearchArgs, runAnalyzersResearch } from './_analyzers-research.mjs';

const COMMAND_NAME = 'analyzers-research-week';

const { dryRun, sinceDays } = parseResearchArgs(process.argv.slice(2), {
  commandName: COMMAND_NAME,
});

await runAnalyzersResearch({
  outputPath: resolve(process.cwd(), 'docs/WEEKLY_ANALYZERS_RESEARCH.md'),
  commandName: `yarn analyzers:research:week${dryRun ? ' --dry-run' : ''}`,
  dryRun,
  sinceDays,
});
