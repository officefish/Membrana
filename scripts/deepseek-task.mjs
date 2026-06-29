/**
 * Задача через DeepSeek API: файл(ы) + вопрос → ответ в stdout или --out.
 *
 *   yarn deepseek:task docs/foo.md "вопрос"
 *   yarn deepseek:task --out docs/out.md docs/a.md docs/b.md "вопрос"
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  deepseekChat,
  defaultDeepSeekModel,
  extractChatCompletionText,
  loadDotEnv,
  printDeepSeekHttpError,
} from './_deepseek-env.mjs';

loadDotEnv();

const MAX_CHARS_PER_FILE = 80_000;
const argv = process.argv.slice(2);

let outPath = '';
let promptFile = '';
const filePaths = [];
const promptParts = [];

for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i];
  if (arg === '--out' && argv[i + 1]) {
    outPath = resolve(process.cwd(), argv[i + 1]);
    i += 1;
    continue;
  }
  if (arg === '--prompt-file' && argv[i + 1]) {
    promptFile = resolve(process.cwd(), argv[i + 1]);
    i += 1;
    continue;
  }
  if (!arg.startsWith('--') && existsSync(resolve(process.cwd(), arg))) {
    filePaths.push(resolve(process.cwd(), arg));
  } else if (!arg.startsWith('--')) {
    promptParts.push(arg);
  }
}

let userQuestion = promptParts.join(' ').trim();
if (promptFile) {
  if (!existsSync(promptFile)) {
    console.error('prompt-file не найден:', promptFile);
    process.exit(1);
  }
  userQuestion = readFileSync(promptFile, 'utf8').trim();
}
if (!userQuestion) {
  userQuestion = 'Кратко резюмируй документ на русском (5–8 абзацев).';
}

if (filePaths.length === 0) {
  console.error('Укажите хотя бы один файл.');
  process.exit(1);
}

const blocks = [];
for (const filePath of filePaths) {
  if (!existsSync(filePath)) {
    console.error('Файл не найден:', filePath);
    process.exit(1);
  }
  let doc = readFileSync(filePath, 'utf8');
  if (doc.length > MAX_CHARS_PER_FILE) {
    doc = `${doc.slice(0, MAX_CHARS_PER_FILE)}\n\n[… обрезано …]\n`;
  }
  blocks.push(`### ${filePath}\n\n${doc}`);
}

const system =
  'Ты технический писатель и архитектор продукта Membrana (device-board UserCase). Пиши по-русски, ясно и структурированно, без воды. Используй markdown.';

const userContent =
  'Ниже материалы репозитория Membrana.\n\n' +
  blocks.join('\n\n---\n\n') +
  '\n\n---\n\nЗадание:\n' +
  userQuestion;

const model = defaultDeepSeekModel();
console.error(`[deepseek:task] model=${model} files=${filePaths.length}`);

const { ok, status, text } = await deepseekChat({
  model,
  messages: [
    { role: 'system', content: system },
    { role: 'user', content: userContent },
  ],
  temperature: 0.4,
  max_tokens: 8192,
});

if (!ok) {
  printDeepSeekHttpError(status, text);
  process.exit(1);
}

let answer;
try {
  answer = extractChatCompletionText(text);
} catch {
  console.error('Не удалось разобрать ответ DeepSeek');
  console.log(text);
  process.exit(1);
}

if (outPath) {
  writeFileSync(outPath, `${answer.trim()}\n`, 'utf8');
  console.error(`[deepseek:task] записано: ${outPath}`);
} else {
  console.log(answer);
}
