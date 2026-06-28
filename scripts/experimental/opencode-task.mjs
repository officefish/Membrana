/**
 * Задача через proxy-провайдер (OpenRouter / FreeModel): файл + вопрос.
 * Аналог yarn anthropic:task, но контур opencode / .env.llm-proxy.
 *
 * Примеры:
 *   yarn opencode:task
 *   yarn opencode:task docs/ARCHITECTURE.md
 *   yarn opencode:task docs/DESIGN.md "Что обязан соблюдать верстальщик?"
 *   yarn opencode:task --openrouter --opus-4-7 docs/ARCHITECTURE.md "краткий аудит"
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  executeLlmRequest,
  loadLlmProxyDotEnv,
  printLlmProxyHttpError,
} from '../_llm-proxy-env.mjs';
import { loadProviderRegistry, parseLlmProxyArgs } from './llm-proxy-parse.mjs';

const MAX_CHARS = 100_000;
const registry = loadProviderRegistry();
loadLlmProxyDotEnv();

const rawArgv = process.argv.slice(2);
/** @type {string[]} */
const flagArgv = [];
/** @type {string[]} */
const positional = [];

for (const arg of rawArgv) {
  if (arg.startsWith('--')) {
    flagArgv.push(arg);
  } else {
    positional.push(arg);
  }
}

if (!flagArgv.some((a) => registry.providers[a.slice(2)])) {
  flagArgv.unshift('--openrouter', '--sonnet-4');
}

const filePath = resolve(process.cwd(), positional[0] || 'docs/ARCHITECTURE.md');
const userQuestion =
  positional.slice(1).join(' ').trim() ||
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

const prompt =
  'Ниже содержимое файла репозитория Membrana. Ответь на вопрос после блока.\n\n---\n' +
  doc +
  '\n---\n\nВопрос:\n' +
  userQuestion;

let req;
try {
  req = parseLlmProxyArgs([...flagArgv, prompt], registry);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

console.error(
  `[opencode:task] ${req.provider.label} / ${req.modelAlias.label} → ${req.modelId}`,
);
console.error(`[opencode:task] файл: ${filePath}`);

let exitCode = 0;
try {
  const { ok, status, text, extract } = await executeLlmRequest(req);
  if (!ok) {
    printLlmProxyHttpError(status, text);
    exitCode = 1;
  } else {
    try {
      console.log(extract(text));
    } catch {
      console.log(text);
    }
  }
} catch (e) {
  console.error(e);
  exitCode = 1;
}

if (exitCode === 0) {
  await new Promise((r) => setTimeout(r, 150));
}
process.exit(exitCode);
