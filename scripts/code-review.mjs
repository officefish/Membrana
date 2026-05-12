/**
 * Code review через Anthropic: контекст из context-collector + docs/VIRTUAL_TEAM_PROMPT.md
 * Запуск: yarn code-review или yarn code-review:full
 * Успешный ответ записывается в docs/DAILY_CODE_REVIEW.md (файл перезаписывается).
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { collectRepositoryContext } from './context-collector.mjs';
import {
  anthropicPost,
  defaultModel,
  getAnthropicKey,
  loadDotEnv,
  printAnthropicHttpError,
} from './_anthropic-env.mjs';

loadDotEnv();

const full = process.argv.includes('--full');
const promptPath = resolve(process.cwd(), 'docs/VIRTUAL_TEAM_PROMPT.md');
const dailyReviewPath = resolve(process.cwd(), 'docs/DAILY_CODE_REVIEW.md');

function writeDailyReviewFile(body) {
  const stamp = new Date().toISOString();
  const header = `<!-- Сгенерировано: ${stamp} (yarn code-review${full ? ':full' : ''}) -->\n\n`;
  mkdirSync(dirname(dailyReviewPath), { recursive: true });
  writeFileSync(dailyReviewPath, header + body, 'utf8');
}

let key;
try {
  key = getAnthropicKey();
} catch (e) {
  console.error(e.message);
  console.error('См. .env.example и команды: yarn code-review');
  process.exit(1);
}

if (!existsSync(promptPath)) {
  console.error('Файл не найден:', promptPath);
  process.exit(1);
}

const virtualTeamPrompt = readFileSync(promptPath, 'utf8');
const context = collectRepositoryContext({ full });

const userQuestion = `Ты координатор виртуальной команды (см. блок «Промпт» ниже). По блоку «Контекст репозитория» дай структурированный code review текущего состояния: что сделано сегодня, риски, возможные нарушения границ пакетов и слоёв, что стоит проверить в тестах и линтере. Соблюдай формат ответа координатора из промпта. Язык: русский.`;

const MAX_CONTEXT = 80_000;
const contextTrimmed =
  context.length > MAX_CONTEXT
    ? context.slice(0, MAX_CONTEXT) +
      `\n\n[… контекст обрезан до ${MAX_CONTEXT} символов …]\n`
    : context;

const bodyText =
  '## Промпт (виртуальная команда)\n\n' +
  virtualTeamPrompt +
  '\n\n---\n\n## Контекст репозитория\n\n' +
  contextTrimmed +
  '\n\n---\n\n## Задание\n\n' +
  userQuestion;

const model = defaultModel();
const bodyJson = {
  model,
  max_tokens: 4096,
  messages: [
    {
      role: 'user',
      content: [{ type: 'text', text: bodyText }],
    },
  ],
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
    writeDailyReviewFile(out);
    console.log(out);
    console.error('Записано:', dailyReviewPath);
  }
} catch (e) {
  console.error(e);
  exitCode = 1;
}

if (exitCode === 0) {
  await new Promise((r) => setTimeout(r, 150));
}
process.exit(exitCode);
