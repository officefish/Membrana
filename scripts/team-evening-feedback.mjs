/**
 * Team Evening Feedback — вечерняя ретроспектива виртуальной команды.
 *
 * yarn team-evening-feedback
 * yarn team-evening-feedback:dry
 *
 * Промпт: docs/prompts/TEAM_EVENING_FEEDBACK.md
 * Регламент: docs/prompts/TEAM_EVENING_FEEDBACK_REGULATION.md
 * Выход: docs/seanses/team-evening-feedback-<YYYY-MM-DD>.md
 *
 * LLM-канал: процедура `team-evening-feedback` (реестр каналов, эпик #1007) — цепочка
 * с фолбэком вместо прямого вызова Anthropic (#1210). Провенанс звена уходит в шапку протокола.
 */
import { loadDotEnv } from './_anthropic-env.mjs';
import { invokeProcedureLlm } from './lib/llm-procedure-ritual.mjs';
import {
  EVENING_FEEDBACK_RAG_QUERY,
  buildEveningFeedbackUserMessage,
  collectDayDocumentsContext,
  collectGitDaySummary,
  parseTeamEveningFeedbackCli,
  printTeamEveningFeedbackHelp,
  PROMPT_PATH,
  readRequiredFile,
  REGULATION_PATH,
  resolveEveningFeedbackOutputPath,
  runEveningFeedbackLlm,
  VIRTUAL_TEAM_PATH,
  writeEveningFeedbackMarkdown,
} from './lib/team-evening-feedback-ritual.mjs';
import {
  formatRagContextBlock,
  logRagStatus,
  retrieveRagContext,
} from './lib/rag-ritual.mjs';

loadDotEnv();

let cli;
try {
  cli = parseTeamEveningFeedbackCli(process.argv.slice(2));
} catch (e) {
  console.error(e.message);
  printTeamEveningFeedbackHelp();
  process.exit(1);
}

if (cli.help) {
  printTeamEveningFeedbackHelp();
  process.exit(0);
}

const regulation = readRequiredFile(REGULATION_PATH);
const prompt = readRequiredFile(PROMPT_PATH);
const virtualTeam = readRequiredFile(VIRTUAL_TEAM_PATH);

const dayDocs = collectDayDocumentsContext();
const { block: gitSummary } = collectGitDaySummary();

let ragBlock = '';
if (!cli.noRag) {
  const rag = await retrieveRagContext(EVENING_FEEDBACK_RAG_QUERY, { topK: 5 });
  ragBlock = formatRagContextBlock(rag, { title: 'RAG (team-evening-feedback)' });
  logRagStatus(rag, 'team-evening-feedback');
}

const bodyText = buildEveningFeedbackUserMessage({
  regulation,
  prompt,
  virtualTeam,
  dayDocs,
  gitSummary,
  ragBlock,
  focusNote: cli.focusNote,
});

const outputPath = resolveEveningFeedbackOutputPath({
  saveAs: cli.saveAs,
  out: cli.out,
});

if (cli.dryRun) {
  console.log(bodyText);
  console.error('dry-run: API не вызывался. Выход:', outputPath);
  process.exit(0);
}

// Канал процедуры, а не прямой вызов Anthropic (#1210): шаг обязателен по CLAUDE.md, а
// единственное звено без фолбэка умирает вместе с лимитом провайдера — вечер 25.07 остался
// без протокола вообще. Ключи и порядок звеньев решает резолвер каналов (эпик #1007).
let exitCode = 0;
try {
  const run = await runEveningFeedbackLlm({
    prompt: bodyText,
    outputPath,
    saveAs: cli.saveAs,
    noSave: cli.noSave,
    invoke: invokeProcedureLlm,
    write: writeEveningFeedbackMarkdown,
    log: (line) => console.error(line),
    emit: (body) => console.log(body),
  });
  exitCode = run.exitCode;
} catch (e) {
  console.error(e);
  exitCode = 1;
}

// exitCode, а не process.exit(): обрыв процесса при живых сокетах от HTTP-вызова роняет
// libuv на Windows ассертом UV_HANDLE_CLOSING и подменяет код возврата на 127 (см.
// code-review.mjs — тот же класс). Для этого шага цена особенно высока: team-evening-feedback
// обязателен в конце дня по CLAUDE.md и штатно упирается в исчерпанную цепочку —
// честная единица отличает «ни одно звено не ответило» от «скрипт сломался».
process.exitCode = exitCode;
