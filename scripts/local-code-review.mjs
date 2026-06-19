/**
 * Локальный code review через Ollama (Mistral 7B)
 *
 * Запуск: yarn local-code-review [--full] [--check]
 * Результат: docs/DAILY_CODE_REVIEW.md (перезапись)
 *
 * Не требует ANTHROPIC_API_KEY — OLLAMA_HOST (по умолчанию http://127.0.0.1:11434)
 * Модель: OLLAMA_MODEL (по умолчанию mistral:7b)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadDotEnv } from './_anthropic-env.mjs';
import { collectRepositoryContext } from './context-collector.mjs';
import {
  generateOllama,
  getOllamaHost,
  getOllamaModel,
  modelIsAvailable,
  pingOllama,
  printOllamaHelp,
} from './_ollama-client.mjs';

loadDotEnv();

const full = process.argv.includes('--full');
const checkOnly = process.argv.includes('--check');
const help = process.argv.includes('--help') || process.argv.includes('-h');

if (help) {
  console.log(`Usage: node scripts/local-code-review.mjs [--full] [--check] [--help]

  --full   Расширенный context-collector.
  --check  Только проверить Ollama + модель (без генерации).
  --help   Эта справка.

Переменные: OLLAMA_HOST, OLLAMA_MODEL, OLLAMA_MAX_CONTEXT (default 24000), OLLAMA_GENERATE_TIMEOUT_MS (default 900000).
Перед ритуалом: yarn ensure-ollama`);
  process.exit(0);
}

const promptPath = resolve(process.cwd(), 'docs/VIRTUAL_TEAM_PROMPT.md');
const dailyReviewPath = resolve(process.cwd(), 'docs/DAILY_CODE_REVIEW.md');
const host = getOllamaHost();
const model = getOllamaModel();

if (!existsSync(promptPath)) {
  console.error('Файл не найден:', promptPath);
  process.exit(1);
}

const ping = await pingOllama({ host });
if (!ping.ok) {
  console.error(`❌ Ollama недоступен (${host}): ${ping.error}`);
  printOllamaHelp({ host, model, extra: ['  yarn ensure-ollama'] });
  process.exit(1);
}

if (!modelIsAvailable(model, ping.models)) {
  console.error(`❌ Модель «${model}» не установлена в Ollama.`);
  console.error(`   Доступно: ${ping.models.join(', ')}`);
  printOllamaHelp({ host, model });
  process.exit(1);
}

if (checkOnly) {
  console.log(`OK: ${host}, model ${model}`);
  process.exit(0);
}

const virtualTeamPrompt = readFileSync(promptPath, 'utf8');
const context = collectRepositoryContext({ full });

const userQuestion = `Ты координатор виртуальной команды (см. блок «Промпт» ниже). По блоку «Контекст репозитория» дай структурированный code review текущего состояния: что сделано сегодня, риски, возможные нарушения границ пакетов и слоёв, что стоит проверить в тестах и линтере. Соблюдай формат ответа координатора из промпта. Язык: русский.`;

const maxContextRaw = process.env.OLLAMA_MAX_CONTEXT?.trim();
const MAX_CONTEXT =
  maxContextRaw && Number.isFinite(Number.parseInt(maxContextRaw, 10))
    ? Number.parseInt(maxContextRaw, 10)
    : 24_000;
const contextTrimmed =
  context.length > MAX_CONTEXT
    ? context.slice(0, MAX_CONTEXT) + `\n\n[… контекст обрезан до ${MAX_CONTEXT} символов …]\n`
    : context;

const fullPrompt =
  '## Промпт (виртуальная команда)\n\n' +
  virtualTeamPrompt +
  '\n\n---\n\n## Контекст репозитория\n\n' +
  contextTrimmed +
  '\n\n---\n\n## Задание\n\n' +
  userQuestion;

function writeDailyReview(body) {
  const stamp = new Date().toISOString();
  const header = `<!-- Сгенерировано локально: ${stamp} (yarn local-code-review${full ? ':full' : ''}, ${model} @ ${host}) -->\n\n`;
  mkdirSync(dirname(dailyReviewPath), { recursive: true });
  writeFileSync(dailyReviewPath, header + body, 'utf8');
}

let stopProgress = () => {};

try {
  console.error(`📡 Ollama: ${host}, модель ${model}, контекст ≤${MAX_CONTEXT} симв.`);
  console.error('⏳ Генерация code review (stream)… на CPU может занять 5–15 мин');

  let dots = 0;
  let progressStopped = false;
  const progressTimer = setInterval(() => {
    dots = (dots + 1) % 4;
    process.stderr.write(`\r   … генерируется${'.'.repeat(dots)}   `);
  }, 4_000);
  const stopProgressImpl = () => {
    if (progressStopped) return;
    progressStopped = true;
    clearInterval(progressTimer);
    process.stderr.write('\r');
  };
  stopProgress = stopProgressImpl;

  const result = await generateOllama({
    prompt: fullPrompt,
    host,
    model,
    onToken: stopProgressImpl,
  });

  stopProgressImpl();

  if (!result.trim()) {
    throw new Error('пустой ответ от модели');
  }

  writeDailyReview(result);
  console.log(result);
  console.error(`✅ Записано: ${dailyReviewPath}`);
} catch (error) {
  stopProgress();
  console.error('❌ Ошибка при вызове Ollama:', error.message);
  printOllamaHelp({ host, model });
  process.exit(1);
}
