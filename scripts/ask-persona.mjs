/**
 * scripts/ask-persona.mjs
 *
 * «Спросить совета у виртуального члена команды».
 * Шаг 1 (этот файл) — локальный CLI, без интеграции с Linear.
 * Шаг 2 (будущий PR) — добавит флаги `--linear MEM-X` и `--post` для работы
 * с Linear-тикетами и постом ответа в комментарий.
 *
 * Запуск:
 *   yarn ask vesnin "стоит ли вводить отдельный transport-service сейчас?"
 *   yarn ask dynin --task "тестировать FFT на маленьких буферах?" "как ловить edge cases?"
 *   yarn ask vesnin --ticket-file ./ticket.md "сформулируй кратко границы"
 *   yarn ask vesnin --no-context "одной фразой: имеет смысл сейчас вводить ADR?"
 *   node scripts/ask-persona.mjs --help
 *
 * Что подкладывается в промпт:
 *   1) Системный промпт персонажа (docs/virtual-team/PROMPT_*.md).
 *   2) Стратегический контекст (docs/WHITE_PAPER.md), если не --no-context.
 *   3) Выдержки из docs/ARCHITECTURE.md и docs/SERVICES.md, если не --no-context.
 *   4) Контекст задачи: текст из --task или содержимое --ticket-file (если задано).
 *   5) Вопрос пользователя.
 *
 * Требуется ANTHROPIC_API_KEY в .env. Опционально ANTHROPIC_MODEL.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  anthropicPost,
  defaultModel,
  getAnthropicKey,
  loadDotEnv,
  printAnthropicHttpError,
} from './_anthropic-env.mjs';

// ---------------------------------------------------------------------------
// Персонажи. Чтобы добавить нового — пиши сюда + создавай PROMPT_*.md.

const PERSONAS = {
  vesnin: {
    role: 'Teamlead',
    promptFile: 'docs/virtual-team/PROMPT_TEAMLEAD.md',
    description: 'Vesnin — Teamlead. Архитектура, стратегия, границы модулей.',
  },
  dynin: {
    role: 'Математик',
    promptFile: 'docs/virtual-team/PROMPT_MATHEMATICIAN.md',
    description: 'Dynin — Математик. Чистые функции, спектр, статистика.',
  },
};

const MAX_CONTEXT_CHARS = 90_000;
const MAX_PROMPT_CHARS = 16_000;
const MAX_WHITE_PAPER_CHARS = 30_000;
const MAX_ARCH_CHARS = 6_000;
const MAX_TICKET_CHARS = 20_000;
const MAX_TASK_TEXT_CHARS = 8_000;

// ---------------------------------------------------------------------------
// CLI

function printHelp() {
  const personasList = Object.entries(PERSONAS)
    .map(([name, p]) => `  ${name.padEnd(8)} ${p.description}`)
    .join('\n');
  console.log(`Usage: yarn ask <persona> [options] "<question>"

Persona-aware CLI для совета у виртуального члена команды.
Шаг 1: только локальный вывод; ответ печатается в stdout.
Шаг 2 (позже): --linear MEM-X и --post для работы с тикетами Linear.

Personas:
${personasList}

Options:
  --task "<text>"           Текст задачи как строка (вместо --ticket-file).
  --ticket-file <path>      Прочитать тело задачи из markdown-файла.
  --no-context              Не подгружать WHITE_PAPER / ARCHITECTURE / SERVICES.
  --help, -h                Эта справка.

Среда:
  ANTHROPIC_API_KEY (обязательно)   — в .env или окружении.
  ANTHROPIC_MODEL   (опционально)   — переопределение модели.
`);
}

function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const rest = [];
  let task = '';
  let ticketFile = '';
  let noContext = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--task') {
      task = argv[++i] ?? '';
      continue;
    }
    if (arg.startsWith('--task=')) {
      task = arg.slice('--task='.length);
      continue;
    }
    if (arg === '--ticket-file') {
      ticketFile = argv[++i] ?? '';
      continue;
    }
    if (arg.startsWith('--ticket-file=')) {
      ticketFile = arg.slice('--ticket-file='.length);
      continue;
    }
    if (arg === '--no-context') {
      noContext = true;
      continue;
    }
    rest.push(arg);
  }

  const [personaArg, ...questionParts] = rest;
  if (!personaArg) {
    console.error('Не указан персонаж. См. yarn ask --help.');
    process.exit(1);
  }
  const persona = personaArg.toLowerCase();
  if (!PERSONAS[persona]) {
    console.error(`Неизвестный персонаж "${persona}". Доступные: ${Object.keys(PERSONAS).join(', ')}.`);
    process.exit(1);
  }
  const question = questionParts.join(' ').trim();
  if (!question) {
    console.error('Не задан вопрос. Пример: yarn ask vesnin "стоит ли...?".');
    process.exit(1);
  }

  return { persona, question, task, ticketFile, noContext };
}

// ---------------------------------------------------------------------------
// IO helpers

function readBounded(absPath, maxChars, optional = false) {
  if (!existsSync(absPath)) {
    if (optional) return null;
    console.error(`Файл не найден: ${absPath}`);
    process.exit(1);
  }
  let text = readFileSync(absPath, 'utf8');
  if (text.length > maxChars) {
    text = text.slice(0, maxChars) + `\n\n[… документ обрезан до ${maxChars} символов …]\n`;
  }
  return text;
}

// ---------------------------------------------------------------------------
// Сборка промпта

function buildPrompt({ persona, question, task, ticketFile, noContext }) {
  const cwd = process.cwd();
  const personaCfg = PERSONAS[persona];

  const personaPrompt = readBounded(resolve(cwd, personaCfg.promptFile), MAX_PROMPT_CHARS);

  const ticketBody = ticketFile
    ? readBounded(resolve(cwd, ticketFile), MAX_TICKET_CHARS)
    : null;
  const taskInline = task ? task.slice(0, MAX_TASK_TEXT_CHARS) : '';

  let strategicContext = '';
  let architecture = '';
  let services = '';
  if (!noContext) {
    strategicContext = readBounded(resolve(cwd, 'docs/WHITE_PAPER.md'), MAX_WHITE_PAPER_CHARS, true) ?? '';
    architecture = readBounded(resolve(cwd, 'docs/ARCHITECTURE.md'), MAX_ARCH_CHARS, true) ?? '';
    services = readBounded(resolve(cwd, 'docs/SERVICES.md'), MAX_ARCH_CHARS, true) ?? '';
  }

  const parts = [];

  parts.push(
    `Ты отвечаешь в роли персонажа «${persona}» (${personaCfg.role}) виртуальной команды Membrana.`,
    `Ниже — твой системный промпт, контекст проекта и сама задача с вопросом.`,
    `Отвечай по существу, в характере персонажа, без пересказа, что такое Membrana или как зовут роль.`,
    `Ответ — на русском, в свободной форме, но кратко: 4–12 строк, при необходимости список.`,
    `Если данных не хватает — задай 1–2 уточняющих вопроса, не выдумывай факты.`,
    '',
    '---',
    `## Системный промпт персонажа (${personaCfg.promptFile})`,
    '',
    personaPrompt,
    '',
  );

  if (!noContext) {
    if (strategicContext) {
      parts.push('---', '## Стратегический контекст (docs/WHITE_PAPER.md)', '', strategicContext, '');
    }
    if (architecture) {
      parts.push('---', '## Архитектура (docs/ARCHITECTURE.md — выдержка)', '', architecture, '');
    }
    if (services) {
      parts.push('---', '## Сервисы (docs/SERVICES.md — выдержка)', '', services, '');
    }
  }

  if (ticketBody || taskInline) {
    parts.push('---', '## Контекст задачи', '');
    if (ticketBody) {
      parts.push(`Источник: ${ticketFile}`, '', ticketBody, '');
    }
    if (taskInline) {
      parts.push(taskInline, '');
    }
  }

  parts.push('---', '## Вопрос', '', question, '');

  const assembled = parts.join('\n');
  if (assembled.length > MAX_CONTEXT_CHARS) {
    return assembled.slice(0, MAX_CONTEXT_CHARS) +
      `\n\n[… общий контекст обрезан до ${MAX_CONTEXT_CHARS} символов …]\n`;
  }
  return assembled;
}

// ---------------------------------------------------------------------------
// Запуск

async function main() {
  loadDotEnv();

  const cli = parseArgs(process.argv.slice(2));

  let key;
  try {
    key = getAnthropicKey();
  } catch (e) {
    console.error(e.message);
    console.error('См. .env.example.');
    process.exit(1);
  }

  const bodyText = buildPrompt(cli);
  const model = defaultModel();

  if (process.stderr.isTTY) {
    console.error(`→ ${cli.persona} (${PERSONAS[cli.persona].role}) · model: ${model}`);
  }

  const bodyJson = {
    model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: [{ type: 'text', text: bodyText }] }],
  };

  try {
    const { ok, status, text } = await anthropicPost(
      'https://api.anthropic.com/v1/messages',
      {
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        bodyJson,
      },
    );

    if (!ok) {
      printAnthropicHttpError(status, text);
      process.exit(1);
    }

    let out = '';
    try {
      const json = JSON.parse(text);
      const parts = json?.content ?? [];
      out = parts.filter((b) => b?.type === 'text').map((b) => b.text).join('\n');
      if (!out) out = JSON.stringify(parts, null, 2);
    } catch {
      out = text;
    }
    console.log(out);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

  await new Promise((r) => setTimeout(r, 150));
}

main();
