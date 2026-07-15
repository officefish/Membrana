/**
 * Code review через Anthropic + регламент CODE_REVIEW_REGULATION.md
 *
 * **Вечерняя процедура (daily):** утром не запускать — standup читает DAILY_CODE_REVIEW.md.
 * См. docs/DEVELOPER_RHYTHM.md и docs/prompts/CODE_REVIEW_REGULATION.md.
 *
 * Запуск:
 *   yarn code-review
 *   yarn code-review:full
 *   yarn code-review:pr -- 140
 *   node scripts/code-review.mjs --branch feat/foo
 *   node scripts/code-review.mjs --uncommitted   (git diff HEAD: staged+unstaged)
 *   node scripts/code-review.mjs --staged        (git diff --cached: только staged)
 */
import { resolve } from 'node:path';
import { collectRepositoryContext } from './context-collector.mjs';
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
import {
  anthropicPost,
  defaultModel,
  getAnthropicKey,
  loadDotEnv,
  printAnthropicHttpError,
} from './_anthropic-env.mjs';

loadDotEnv();

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

let key;
try {
  key = getAnthropicKey();
} catch (e) {
  console.error(e.message);
  console.error('См. .env.example и команды: yarn code-review');
  process.exit(1);
}

const regulation = readRequiredFile(REGULATION_PATH);
const virtualTeam = readRequiredFile(VIRTUAL_TEAM_PATH);

let contextBlock = '';
if (cli.mode === 'daily') {
  contextBlock = collectRepositoryContext({ full: cli.full });
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

const bodyText = buildCodeReviewUserMessage({
  mode: cli.mode,
  focusQuestion: cli.focusQuestion,
  regulation,
  virtualTeam,
  contextBlock,
  ragBlock,
});

const outputPath = cli.out ? resolve(process.cwd(), cli.out) : defaultOutputPath(cli);

const model = defaultModel();
const bodyJson = {
  model,
  max_tokens: 4096,
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
    writeReviewMarkdown({
      path: outputPath,
      body: out,
      meta: { mode: cli.mode, full: cli.full, pr: cli.pr },
    });
    console.log(out);
    console.error('Записано:', outputPath);
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
