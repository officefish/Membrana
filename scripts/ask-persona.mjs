/**
 * scripts/ask-persona.mjs
 *
 * «Спросить совета у виртуального члена команды».
 * Шаг 1 — локальный CLI, без интеграции с Linear API.
 *   • Контекст задачи берётся из GitHub Issue (`--gh-issue`) или из markdown-файла (`--ticket-file`).
 *   • Каждый вызов (кроме --no-save) пишет в `docs/discussions/<id>.md` (append).
 *     Явный id: `--discussion <id>` или `--save-as <id>`. Без них — авто id `discussion-…`.
 *     Если файл треда уже есть, его содержимое читается в промпт как история переписки.
 * Шаг 2 (будущий PR) добавит флаги `--linear MEM-X` и `--post` для работы напрямую с Linear.
 *
 * Запуск:
 *   yarn ask vesnin --gh-issue 12 "стоит ли сейчас вводить отдельный transport-service?"
 *   yarn ask dynin   --gh-issue 10 --save-as TEC-42-fft "какие edge cases точно покрывать?"
 *   yarn ask ozhegov --gh-issue 11 --save-as MEM-88-registry "как разбить тесты agenda?"
 *   yarn ask vesnin --ticket-file ./ticket.md "сформулируй кратко границы"
 *   yarn ask vesnin --discussion TEC-42 "уточни по прошлому ответу"
 *   yarn ask vesnin --no-context "одной фразой: нужен ли ADR сейчас?"   # всё равно пишет в discussion-… .md
 *   yarn ask vesnin --no-save --no-context "черновик без файла"
 *   node scripts/ask-persona.mjs --help
 *
 * Что подкладывается в промпт:
 *   1) Системный промпт персонажа (docs/virtual-team/PROMPT_*.md).
 *   2) Стратегический контекст (docs/WHITE_PAPER.md), если не --no-context.
 *   3) Выдержки из docs/ARCHITECTURE.md и docs/SERVICES.md, если не --no-context.
 *   4) Контекст задачи: GitHub Issue (--gh-issue), файл (--ticket-file) или строка (--task).
 *   5) История треда из docs/discussions/<id>.md, если файл существует.
 *   6) Вопрос пользователя.
 *
 * Требуется ANTHROPIC_API_KEY в .env. Опционально ANTHROPIC_MODEL.
 * Для --gh-issue нужен установленный и авторизованный `gh` CLI.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, appendFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { spawnSync } from 'node:child_process';

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
  ozhegov: {
    role: 'Структурщик',
    promptFile: 'docs/virtual-team/PROMPT_STRUCTURER.md',
    description:
      'Ozhegov — Структурщик. Сервисы, сторы, фасады, слабая связанность (образ: С. И. Ожегов, лексикограф).',
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
const MAX_DISCUSSION_HISTORY_CHARS = 35_000;

const DISCUSSIONS_DIR = 'docs/discussions';

// ---------------------------------------------------------------------------
// CLI

function printHelp() {
  const personasList = Object.entries(PERSONAS)
    .map(([name, p]) => `  ${name.padEnd(8)} ${p.description}`)
    .join('\n');
  console.log(`Usage: yarn ask <persona> [options] "<question>"

Persona-aware CLI для совета у виртуального члена команды.
Шаг 1: контекст из GitHub Issue или файла; ответ в stdout + запись в docs/discussions/<id>.md
  (кроме --no-save). Без явного id файла задаётся автоматически (см. stderr после ответа).
  Если файл треда уже есть — его содержимое подмешивается в промпт (память переписки).
Шаг 2 (позже): --linear MEM-X и --post для работы напрямую с тикетами Linear.

Personas:
${personasList}

Options:
  --gh-issue <N>            Подгрузить тело и комментарии GitHub Issue #N через gh CLI.
  --ticket-file <path>      Прочитать тело задачи из markdown-файла.
  --task "<text>"           Текст задачи строкой (можно вместо файла).
  --discussion <id>         Id треда: docs/discussions/<id>.md (append). Если файл есть — читается история.
  --save-as <id>            То же, что --discussion (синоним для совместимости).
  --no-save                 Не писать в docs/discussions и не подгружать историю из файла.
  --no-context              Не подгружать WHITE_PAPER / ARCHITECTURE / SERVICES.
  --help, -h                Эта справка.

Среда:
  ANTHROPIC_API_KEY (обязательно)   — в .env или окружении.
  ANTHROPIC_MODEL   (опционально)   — переопределение модели.
  Для --gh-issue: gh CLI установлен и авторизован для текущего репо.
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
  let ghIssue = '';
  let saveAs = '';
  let discussion = '';
  let noSave = false;
  let noContext = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--task') { task = argv[++i] ?? ''; continue; }
    if (arg.startsWith('--task=')) { task = arg.slice('--task='.length); continue; }
    if (arg === '--ticket-file') { ticketFile = argv[++i] ?? ''; continue; }
    if (arg.startsWith('--ticket-file=')) { ticketFile = arg.slice('--ticket-file='.length); continue; }
    if (arg === '--gh-issue') { ghIssue = argv[++i] ?? ''; continue; }
    if (arg.startsWith('--gh-issue=')) { ghIssue = arg.slice('--gh-issue='.length); continue; }
    if (arg === '--save-as') { saveAs = argv[++i] ?? ''; continue; }
    if (arg.startsWith('--save-as=')) { saveAs = arg.slice('--save-as='.length); continue; }
    if (arg === '--discussion') { discussion = argv[++i] ?? ''; continue; }
    if (arg.startsWith('--discussion=')) { discussion = arg.slice('--discussion='.length); continue; }
    if (arg === '--no-save') { noSave = true; continue; }
    if (arg === '--no-context') { noContext = true; continue; }
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

  if (ghIssue && ticketFile) {
    console.error('--gh-issue и --ticket-file взаимно исключают друг друга. Выбери что-то одно.');
    process.exit(1);
  }

  const d = discussion.trim();
  const s = saveAs.trim();
  if (d && s && d !== s) {
    console.error('--discussion и --save-as заданы разными значениями. Оставь один флаг.');
    process.exit(1);
  }

  return { persona, question, task, ticketFile, ghIssue, saveAs, discussion, noSave, noContext };
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

function sanitizeDiscussionStem(raw) {
  let s = String(raw ?? '').trim();
  if (!s) {
    console.error('Пустой id переписки.');
    process.exit(1);
  }
  if (s.toLowerCase().endsWith('.md')) s = s.slice(0, -3).trim();
  if (!s) {
    console.error('Пустой id переписки после удаления .md.');
    process.exit(1);
  }
  if (/[/\\]/.test(s) || s.includes('..')) {
    console.error('id переписки: не используй путь, слэши или «..».');
    process.exit(1);
  }
  if (s.length > 120) s = s.slice(0, 120);
  return s;
}

function generateAutoDiscussionStem() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  const sec = String(d.getUTCSeconds()).padStart(2, '0');
  const hex = randomBytes(4).toString('hex');
  return `discussion-${y}${mo}${day}-${h}${mi}${sec}-${hex}`;
}

/** Явный id из --discussion / --save-as (уже проверен на конфликт в parseArgs). */
function explicitDiscussionStem(cli) {
  const raw = (cli.discussion || '').trim() || (cli.saveAs || '').trim();
  return raw ? sanitizeDiscussionStem(raw) : '';
}

/**
 * Имя файла треда без .md. null при --no-save.
 * Приоритет: явный id → gh-issue-N → basename тикета → авто discussion-…
 */
function deriveDiscussionStem(cli) {
  if (cli.noSave) return null;
  const explicit = explicitDiscussionStem(cli);
  if (explicit) return explicit;
  if (cli.ghIssue) return sanitizeDiscussionStem(`gh-issue-${cli.ghIssue}`);
  if (cli.ticketFile) {
    const base = basename(cli.ticketFile).replace(/\.md$/i, '');
    return sanitizeDiscussionStem(base || 'ticket');
  }
  return generateAutoDiscussionStem();
}

function discussionFilePath(stem) {
  return resolve(process.cwd(), DISCUSSIONS_DIR, `${stem}.md`);
}

/** Текст существующего треда для промпта; пустая строка если файла нет. */
function loadDiscussionHistory(stem) {
  const abs = discussionFilePath(stem);
  if (!existsSync(abs)) return '';
  let text = readFileSync(abs, 'utf8');
  if (text.length > MAX_DISCUSSION_HISTORY_CHARS) {
    text =
      text.slice(0, MAX_DISCUSSION_HISTORY_CHARS) +
      `\n\n[… история переписки обрезана до ${MAX_DISCUSSION_HISTORY_CHARS} символов …]\n`;
  }
  return text;
}

function detectRepoSlug() {
  const res = spawnSync('git', ['config', '--get', 'remote.origin.url'], { encoding: 'utf8' });
  if (res.status !== 0) return null;
  const url = (res.stdout || '').trim();
  // git@github.com:owner/repo.git  или  https://github.com/owner/repo[.git]
  let m = url.match(/git@github\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/);
  if (!m) m = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

function fetchGhIssue(num) {
  const slug = detectRepoSlug();
  if (!slug) {
    console.error('Не удалось определить slug репо из remote.origin.url. Запусти в корне Membrana.');
    process.exit(1);
  }
  const res = spawnSync(
    'gh',
    ['issue', 'view', String(num), '--repo', slug,
      '--json', 'number,title,body,url,labels,comments,state'],
    { encoding: 'utf8' },
  );
  if (res.status !== 0) {
    console.error(`Не удалось прочитать GitHub Issue #${num} в ${slug}.`);
    console.error(res.stderr || '');
    console.error('Проверь: установлен ли gh, авторизован ли (gh auth status), существует ли Issue.');
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(res.stdout);
  } catch {
    console.error('gh вернул не JSON. Возможно, обновлён формат вывода.');
    console.error(res.stdout);
    process.exit(1);
  }
  return parsed;
}

function formatGhIssueAsTicket(issue) {
  const lines = [];
  lines.push(`# GitHub Issue #${issue.number}: ${issue.title}`);
  lines.push(`URL: ${issue.url}`);
  lines.push(`State: ${issue.state}`);
  if (Array.isArray(issue.labels) && issue.labels.length) {
    lines.push(`Labels: ${issue.labels.map((l) => l.name).join(', ')}`);
  }
  lines.push('');
  lines.push('## Body');
  lines.push('');
  lines.push((issue.body || '').trim() || '(пусто)');
  if (Array.isArray(issue.comments) && issue.comments.length) {
    for (const c of issue.comments) {
      lines.push('');
      lines.push(`## Комментарий от ${c.author?.login ?? '?'} (${c.createdAt ?? ''})`);
      lines.push('');
      lines.push((c.body || '').trim());
    }
  }
  let text = lines.join('\n');
  if (text.length > MAX_TICKET_CHARS) {
    text = text.slice(0, MAX_TICKET_CHARS) + `\n\n[… тикет обрезан до ${MAX_TICKET_CHARS} символов …]\n`;
  }
  return text;
}

// ---------------------------------------------------------------------------
// Сборка промпта

function buildPrompt({
  persona,
  question,
  task,
  ticketFile,
  noContext,
  ghIssueData,
  discussionHistory,
  discussionStem,
}) {
  const cwd = process.cwd();
  const personaCfg = PERSONAS[persona];

  const personaPrompt = readBounded(resolve(cwd, personaCfg.promptFile), MAX_PROMPT_CHARS);

  let ticketBlock = '';
  let ticketSourceLabel = '';
  if (ghIssueData) {
    ticketBlock = formatGhIssueAsTicket(ghIssueData);
    ticketSourceLabel = `GitHub Issue #${ghIssueData.number}: «${ghIssueData.title}»`;
  } else if (ticketFile) {
    ticketBlock = readBounded(resolve(cwd, ticketFile), MAX_TICKET_CHARS);
    ticketSourceLabel = ticketFile;
  }
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
    `Ответ — на русском, в свободной форме, но кратко: 4–14 строк, при необходимости список.`,
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

  if (ticketBlock || taskInline) {
    parts.push('---', '## Контекст задачи', '');
    if (ticketBlock) {
      parts.push(`Источник: ${ticketSourceLabel}`, '', ticketBlock, '');
    }
    if (taskInline) {
      parts.push(taskInline, '');
    }
  }

  if (discussionHistory && discussionStem) {
    const label = `${DISCUSSIONS_DIR}/${discussionStem}.md`;
    parts.push(
      '---',
      '## История переписки в этом треде',
      '',
      `Файл: ${label}. Ниже предыдущие обмены (вопросы и ответы). Учти уже согласованное; не повторяй без необходимости; продолжай линию рассуждения.`,
      '',
      discussionHistory,
      '',
    );
  }

  parts.push('---', '## Вопрос', '', question, '');

  const assembled = parts.join('\n');
  if (assembled.length > MAX_CONTEXT_CHARS) {
    return {
      text: assembled.slice(0, MAX_CONTEXT_CHARS) +
        `\n\n[… общий контекст обрезан до ${MAX_CONTEXT_CHARS} символов …]\n`,
      ticketSourceLabel,
    };
  }
  return { text: assembled, ticketSourceLabel };
}

// ---------------------------------------------------------------------------
// Сохранение обсуждения

function saveExchange({ name, persona, question, answer, ticketSourceLabel }) {
  const dir = resolve(process.cwd(), DISCUSSIONS_DIR);
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, `${name}.md`);
  const isNew = !existsSync(file);

  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

  const lines = [];
  if (isNew) {
    lines.push(`# Обсуждение: ${name}`);
    lines.push('');
    lines.push('<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->');
    lines.push('');
  }
  lines.push(`## ${stamp} · ${persona}`);
  lines.push('');
  if (ticketSourceLabel) lines.push(`**Контекст:** ${ticketSourceLabel}`);
  lines.push(`**Вопрос:** ${question}`);
  lines.push('');
  lines.push('**Ответ:**');
  lines.push('');
  lines.push((answer || '').trim());
  lines.push('');
  lines.push('---');
  lines.push('');

  appendFileSync(file, lines.join('\n'), 'utf8');
  return file;
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

  // Сначала подтягиваем gh-issue (если попросили) — чтобы при ошибке не дёргать API.
  let ghIssueData = null;
  if (cli.ghIssue) {
    if (process.stderr.isTTY) console.error(`→ читаю GitHub Issue #${cli.ghIssue}…`);
    ghIssueData = fetchGhIssue(cli.ghIssue);
  }

  const discussionStem = deriveDiscussionStem(cli);
  let discussionHistory = '';
  if (discussionStem) {
    discussionHistory = loadDiscussionHistory(discussionStem);
    if (discussionHistory && process.stderr.isTTY) {
      console.error(
        `→ подмешана история переписки (${discussionHistory.length} символов): ${DISCUSSIONS_DIR}/${discussionStem}.md`,
      );
    }
  }

  const { text: bodyText, ticketSourceLabel } = buildPrompt({
    ...cli,
    ghIssueData,
    discussionHistory,
    discussionStem: discussionStem || '',
  });
  const model = defaultModel();

  if (process.stderr.isTTY) {
    console.error(`→ ${cli.persona} (${PERSONAS[cli.persona].role}) · model: ${model}`);
  }

  const bodyJson = {
    model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: [{ type: 'text', text: bodyText }] }],
  };

  let answer = '';
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

    try {
      const json = JSON.parse(text);
      const parts = json?.content ?? [];
      answer = parts.filter((b) => b?.type === 'text').map((b) => b.text).join('\n');
      if (!answer) answer = JSON.stringify(parts, null, 2);
    } catch {
      answer = text;
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

  console.log(answer);

  if (discussionStem && !cli.noSave) {
    const file = saveExchange({
      name: discussionStem,
      persona: cli.persona,
      question: cli.question,
      answer,
      ticketSourceLabel,
    });
    console.error(`→ сохранено: ${file}`);
    if (process.stderr.isTTY) {
      console.error(`→ id переписки: ${discussionStem}  (продолжить: --discussion ${discussionStem})`);
    }
  } else if (process.stderr.isTTY && cli.noSave) {
    console.error('→ без записи в docs/discussions (--no-save).');
  }

  await new Promise((r) => setTimeout(r, 150));
}

main();
