/**
 * Team Evening Feedback — вечерняя ретроспектива виртуальной команды.
 *
 * yarn team-evening-feedback
 * yarn team-evening-feedback:dry
 *
 * Промпт: docs/prompts/TEAM_EVENING_FEEDBACK.md
 * Регламент: docs/prompts/TEAM_EVENING_FEEDBACK_REGULATION.md
 * Выход: docs/seanses/team-evening-feedback-<YYYY-MM-DD>.md
 */
import {
  anthropicPost,
  defaultModel,
  getAnthropicKey,
  loadDotEnv,
  printAnthropicHttpError,
} from './_anthropic-env.mjs';
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

let key;
try {
  key = getAnthropicKey();
} catch (e) {
  console.error(e.message);
  console.error('См. .env.example и: yarn team-evening-feedback:dry');
  process.exit(1);
}

const model = defaultModel();
const bodyJson = {
  model,
  max_tokens: 8192,
  messages: [{ role: 'user', content: [{ type: 'text', text: bodyText }] }],
};

let exitCode = 0;
try {
  const { ok, status, text } = await anthropicPost('https://api.anthropic.com/v1/messages', {
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    bodyJson,
  });

  if (!ok) {
    printAnthropicHttpError(status, text);
    exitCode = 1;
  } else {
    let out = '';
    try {
      const json = JSON.parse(text);
      const parts = json?.content ?? [];
      out = parts
        .filter((b) => b?.type === 'text')
        .map((b) => b.text)
        .join('\n');
      if (!out) out = JSON.stringify(parts, null, 2);
    } catch {
      out = text;
    }

    console.log(out);

    if (!cli.noSave) {
      writeEveningFeedbackMarkdown({
        path: outputPath,
        body: out,
        saveAs: cli.saveAs,
      });
      console.error('Записано:', outputPath);
    } else {
      console.error('--no-save: файл не записан');
    }
  }
} catch (e) {
  console.error(e);
  exitCode = 1;
}

process.exit(exitCode);
