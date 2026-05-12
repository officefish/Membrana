/**
 * Реальная задача через Messages API: передать содержимое файла + вопрос, получить ответ.
 *
 * Примеры:
 *   yarn anthropic:task
 *   yarn anthropic:task docs/ARCHITECTURE.md
 *   yarn anthropic:task docs/DESIGN.md "Что обязан соблюдать верстальщик?"
 *
 * Переменные: ANTHROPIC_API_KEY (и опционально ANTHROPIC_MODEL) в `.env`.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  anthropicPost,
  defaultModel,
  getAnthropicKey,
  loadDotEnv,
  printAnthropicHttpError,
} from './_anthropic-env.mjs';

loadDotEnv();

let key;
try {
  key = getAnthropicKey();
} catch (e) {
  console.error(e.message);
  console.error('См. .env.example и команду: yarn anthropic:task');
  process.exit(1);
}

const MAX_CHARS = 100_000;

const fileArg = process.argv[2];
const promptParts = process.argv.slice(3);
const filePath = resolve(process.cwd(), fileArg || 'docs/ARCHITECTURE.md');
const userQuestion =
  promptParts.join(' ').trim() ||
  'Ты ревьюер Teamlead. По ТОЛЬКО этому тексту выпиши 6–8 коротких правил для PR (границы пакетов, плагины, слои). Без общих фраз — только то, что явно следует из документа. Язык ответа: русский.';

if (!existsSync(filePath)) {
  console.error('Файл не найден:', filePath);
  process.exit(1);
}

let doc = readFileSync(filePath, 'utf8');
if (doc.length > MAX_CHARS) {
  doc =
    doc.slice(0, MAX_CHARS) +
    '\n\n[… текст обрезан до ' +
    MAX_CHARS +
    ' символов …]\n';
}

const model = defaultModel();

const bodyJson = {
  model,
  max_tokens: 2048,
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text:
            'Ниже содержимое файла репозитория Membrana. Ответь на вопрос после блока.\n\n---\n' +
            doc +
            '\n---\n\nВопрос:\n' +
            userQuestion,
        },
      ],
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
    try {
      const json = JSON.parse(text);
      const parts = json?.content ?? [];
      const out = parts
        .filter((b) => b?.type === 'text')
        .map((b) => b.text)
        .join('\n');
      console.log(out || JSON.stringify(parts, null, 2));
    } catch {
      console.log(text);
    }
  }
} catch (e) {
  console.error(e);
  exitCode = 1;
}

if (exitCode === 0) {
  // См. anthropic-smoke.mjs: задержка после close() dispatcher на Windows.
  await new Promise((r) => setTimeout(r, 150));
}
process.exit(exitCode);
