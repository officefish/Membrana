/**
 * Code review через LLM procedure channels (anthropic|openrouter chain) +
 * регламент CODE_REVIEW_REGULATION.md
 *
 * **Вечерняя процедура (daily):** утром не запускать — standup читает DAILY_CODE_REVIEW.md.
 * См. docs/DEVELOPER_RHYTHM.md и docs/prompts/CODE_REVIEW_REGULATION.md.
 *
 * Запуск:
 *   yarn code-review
 *   yarn code-review:full
 *   yarn code-review:pr 140
 *   node scripts/code-review.mjs --branch feat/foo
 *   node scripts/code-review.mjs --uncommitted   (git diff HEAD: staged+unstaged)
 *   node scripts/code-review.mjs --staged        (git diff --cached: только staged)
 */
import { resolve } from 'node:path';
import { collectRepositoryContext } from './context-collector.mjs';
import {
  collectDayWorkDiff,
  formatDayReviewHeader,
  formatDayWorkContext,
} from './lib/day-work-diff.mjs';
import {
  buildCodeReviewUserMessage,
  collectReviewContext,
  defaultOutputPath,
  parseCodeReviewCli,
  printCodeReviewHelp,
  readRequiredFile,
  REGULATION_PATH,
  VIRTUAL_TEAM_PATH,
  writeReviewMarkdown,
} from './lib/code-review-ritual.mjs';
import {
  CODE_REVIEW_RAG_QUERY,
  formatRagContextBlock,
  logRagStatus,
  retrieveRagContext,
} from './lib/rag-ritual.mjs';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { formatLeadBlock, resolveReviewLead } from './lib/review-lead.mjs';
import { readPersonaMemory } from './lib/persona-memory.mjs';
import { listActive, loadRegistry } from './lib/task-registry.mjs';
import { invokeProcedureLlm } from './lib/llm-procedure-ritual.mjs';

let cli;
try {
  cli = parseCodeReviewCli(process.argv.slice(2));
} catch (e) {
  console.error(e.message);
  printCodeReviewHelp();
  process.exit(1);
}

if (cli.help) {
  printCodeReviewHelp();
  process.exit(0);
}

const regulation = readRequiredFile(REGULATION_PATH);
const virtualTeam = readRequiredFile(VIRTUAL_TEAM_PATH);

let contextBlock = '';
let dayWorkHeader = '';
if (cli.mode === 'daily') {
  // rt-8 (#539): daily ревьюит КОД ДНЯ (дифф коммитов), а не остаток рабочего дерева.
  // Расследование 16.07: раньше смотрел на чистое после коммитов дерево и объявлял
  // «T0 docs-only». collectRepositoryContext сохранён — но как ГИГИЕНА (untracked,
  // тест/линт), а не как предмет ревью. Решение консилиума code-review-honesty-refactor.
  const dayWork = collectDayWorkDiff();
  dayWorkHeader = formatDayReviewHeader(dayWork);
  const hygiene = collectRepositoryContext({ full: cli.full });
  contextBlock =
    '## Работа дня (дифф коммитов, сегментировано по PR — предмет ревью)\n\n' +
    formatDayWorkContext(dayWork) +
    '\n\n---\n\n## Гигиена рабочего дерева (untracked, тест/линт — не предмет ревью)\n\n' +
    hygiene;
} else {
  const ctx = collectReviewContext(cli);
  contextBlock = ctx.text;
}

let ragBlock = '';
if (!cli.noRag) {
  const rag = await retrieveRagContext(CODE_REVIEW_RAG_QUERY, { topK: 5 });
  ragBlock = formatRagContextBlock(rag, { title: 'RAG + git hybrid (code-review)' });
  logRagStatus(rag, 'code-review');
}

// Ведущий ревью (T3/T4/T5, день-спринт code-review-lead-refactor): один из пяти,
// назначенный по каскаду явное слово → карточка → скоуп диффа; его память и
// бестиарий уходят в промпт. Снимки собираем здесь (ядро чистое).
let leadBlock = '';
try {
  const diffPaths = execFileSync(
    'git',
    cli.mode === 'uncommitted' || cli.mode === 'staged'
      ? ['diff', '--name-only', 'HEAD']
      : ['diff', '--name-only', 'origin/main...HEAD'],
    { encoding: 'utf8', timeout: 15_000 },
  ).split(/\r?\n/u).filter(Boolean);
  const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8', timeout: 15_000 }).trim();
  const lead = resolveReviewLead({
    explicit: cli.lead ?? null,
    branch,
    diffPaths,
    activeTasks: listActive(loadRegistry()),
  });
  if (lead.outOfConvention) console.error(`[review-lead] ⚠ ${lead.basis}`);
  const bestiaryPath = resolve(process.cwd(), 'docs/bestiary/BESTIARY.md');
  leadBlock = formatLeadBlock({
    ...lead,
    memoryExcerpt: readPersonaMemory(lead.persona, { maxChars: 4_000 }) ?? '',
    bestiary: existsSync(bestiaryPath) ? readFileSync(bestiaryPath, 'utf8').slice(0, 6_000) : '',
  });
  console.error(`[review-lead] ведёт ${lead.persona} (${lead.basis})`);
} catch (e) {
  // Ведущий — усилитель ревью, не гейт запуска: без git/памяти ревью не падает.
  console.error(`[review-lead] ⚠ назначение не собралось (${e?.message?.split('\n')[0] ?? e}) — ревью идёт без блока ведущего`);
}

const bodyText = buildCodeReviewUserMessage({
  mode: cli.mode,
  focusQuestion: cli.focusQuestion,
  regulation,
  virtualTeam,
  contextBlock,
  ragBlock,
  leadBlock,
});

const outputPath = cli.out ? resolve(process.cwd(), cli.out) : defaultOutputPath(cli);

let exitCode = 0;
try {
  const result = await invokeProcedureLlm({
    procedureId: 'code-review',
    prompt: bodyText,
    maxTokens: 4096,
    onAttempt: ({ provider, model, attemptIndex, ok, errorClass }) => {
      if (ok) {
        console.error(`[llm] code-review → ${provider}/${model} (attempt ${attemptIndex + 1})`);
      } else {
        console.error(
          `[llm] code-review attempt ${attemptIndex + 1} ${provider}/${model} failed: ${errorClass ?? 'unknown'}`,
        );
      }
    },
  });

  if (!result.ok) {
    console.error(
      `[llm] chain exhausted for code-review after ${result.attempts} attempt(s) (${result.errorClass ?? 'unknown'})`,
    );
    console.error('Проверьте chain в scripts/lib/llm-procedure-defaults.json и ключи (.env / .env.llm-proxy).');
    exitCode = 1;
  } else {
    const out = result.text;
    // Честная шапка в САМ артефакт: режим/precision/период — машиночитаемо downstream
    // (standup, main-day-issue), не зависит от формулировок LLM. Конец молчаливому
    // «T0 docs-only» — если ревьюился остаток дерева, это будет видно в шапке.
    const finalBody = dayWorkHeader
      ? `> Контур ревью (rt-8):\n${dayWorkHeader.split('\n').map((l) => `> ${l}`).join('\n')}\n\n---\n\n${out}`
      : out;
    writeReviewMarkdown({
      path: outputPath,
      body: finalBody,
      meta: {
        mode: cli.mode,
        full: cli.full,
        pr: cli.pr,
        llmProvider: result.provider,
        llmModel: result.model,
        llmSource: result.source,
      },
    });
    console.log(out);
    console.error('Записано:', outputPath);
    console.error(`[llm] source=${result.source}`);
  }
} catch (e) {
  console.error(e);
  exitCode = 1;
}

// exitCode, а не process.exit(): обрыв процесса при живых сокетах от HTTP-вызова
// роняет libuv на Windows ассертом UV_HANDLE_CLOSING и подменяет код возврата на 127.
// Прежний костыль — sleep(150) перед выходом — стоял ТОЛЬКО на успешном пути, поэтому
// падал ровно путь ошибки: 2026-07-15 фолбэк «Anthropic без кредита» отдавал 127 вместо 1,
// и любой CI счёл бы это падением самого скрипта. Node сам завершится, когда сокеты
// закроются, и отдаст этот код.
process.exitCode = exitCode;
