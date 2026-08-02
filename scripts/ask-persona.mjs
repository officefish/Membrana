/**
 * scripts/ask-persona.mjs
 *
 * «Спросить совета у виртуального члена команды».
 * Шаг 1 — локальный CLI, без интеграции с Linear API.
 *   • Контекст задачи берётся из GitHub Issue (`--gh-issue`) или из markdown-файла (`--ticket-file`).
 *   • Ответ сохраняется в `docs/discussions/<name>.md` (append).
 * Шаг 2 (будущий PR) добавит флаги `--linear MEM-X` и `--post` для работы напрямую с Linear.
 *
 * Запуск:
 *   yarn ask vesnin --gh-issue 12 "стоит ли сейчас вводить отдельный transport-service?"
 *   yarn ask dynin  --gh-issue 10 --save-as TEC-42-fft "какие edge cases точно покрывать?"
 *   yarn ask vesnin --ticket-file ./ticket.md "сформулируй кратко границы"
 *   yarn ask vesnin --no-context "одной фразой: нужен ли ADR сейчас?"
 *   node scripts/ask-persona.mjs --help
 *
 * Что подкладывается в промпт:
 *   1) Системный промпт персонажа (docs/virtual-team/PROMPT_*.md).
 *   2) Стратегический контекст (docs/WHITE_PAPER.md), если не --no-context.
 *   3) Выдержки из docs/ARCHITECTURE.md и docs/SERVICES.md, если не --no-context.
 *   4) Контекст задачи: GitHub Issue (--gh-issue), файл (--ticket-file) или строка (--task).
 *   5) Вопрос пользователя.
 *
 * Канал: панельная цепочка процедуры «ask» (invokeProcedureLlm) — overlay панели,
 * фолбэки по каталогу провайдеров; ключи звеньев в .env / .env.llm-proxy.
 * Для --gh-issue нужен установленный и авторизованный `gh` CLI.
 */
import { existsSync, mkdirSync, readFileSync, appendFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { spawnSync } from 'node:child_process';

import { loadDotEnv } from './_anthropic-env.mjs';
import { invokeProcedureLlm } from './lib/llm-procedure-ritual.mjs';
import {
  formatRagContextBlock,
  logRagStatus,
  retrieveRagContext,
  shouldUsePersonaRag,
} from './lib/rag-ritual.mjs';
import { readPersonaMemory, personaMemoryPath } from './lib/persona-memory.mjs';
import { HOMES } from './persona-memory/lib/archive-schema.mjs';
import {
  LIFT_LAMBDA_V1,
  actOpEvents,
  formatCloudForPersona,
  parseAct,
  shouldLift,
  validateAct,
} from './persona-memory/lib/emerge-act.mjs';
import { emitOp } from './persona-memory/lib/op-log.mjs';
import { buildSubconsciousCloud } from './persona-memory/lib/subconscious-lift.mjs';
import {
  createArchiveRetrieve,
  similarityBetween,
} from './persona-memory/lib/subconscious-retrieval.mjs';

// ---------------------------------------------------------------------------
// Персонажи. Чтобы добавить нового — пиши сюда + создавай PROMPT_*.md.

const PERSONAS = {
  tarasov: {
    role: 'Teamlead',
    promptFile: 'docs/virtual-team/PROMPT_TEAMLEAD.md',
    description: 'Tarasov — Teamlead. Нагрузки, связки ролей, вердикты; исполнение.',
  },
  vesnin: {
    role: 'Архитектор',
    promptFile: 'docs/virtual-team/PROMPT_ARCHITECT.md',
    description: 'Vesnin — Архитектор. Границы модулей, контракты, форма решения (с 27.07 не тимлид).',
  },
  angelina: {
    role: 'Секретарь · мастер процедур',
    promptFile: 'docs/virtual-team/PROMPT_ANGELINA.md',
    description: 'Angelina — секретарь и мастер процедур. Фиксация, журнал, гейт каскада; кода не пишет.',
  },
  dynin: {
    role: 'Математик',
    promptFile: 'docs/virtual-team/PROMPT_MATHEMATICIAN.md',
    description: 'Dynin — Математик. Чистые функции, спектр, статистика.',
  },
  ozhegov: {
    role: 'Структурщик',
    promptFile: 'docs/virtual-team/PROMPT_STRUCTURER.md',
    description: 'Ozhegov — Структурщик. Термины, границы пакетов, слабая связанность.',
  },
  rodchenko: {
    role: 'Верстальщик',
    promptFile: 'docs/virtual-team/PROMPT_LAYOUT_DEVELOPER.md',
    description: 'Rodchenko — Верстальщик. DESIGN.md, конструктивизм, a11y.',
  },
  kuryokhin: {
    role: 'Музыкант',
    promptFile: 'docs/virtual-team/PROMPT_MUSICIAN.md',
    description: 'Kuryokhin — Музыкант. Смелые аудио-гипотезы, Web Audio, риск со структурой.',
  },
};

const MAX_CONTEXT_CHARS = 90_000;
const MAX_PROMPT_CHARS = 16_000;
const MAX_WHITE_PAPER_CHARS = 30_000;
const MAX_ARCH_CHARS = 6_000;
const MAX_TICKET_CHARS = 20_000;
const MAX_TASK_TEXT_CHARS = 8_000;
const MAX_MEMORY_CHARS = 20_000; // страховка поверх токен-бюджета extractor'а (<5K токенов)

const DISCUSSIONS_DIR = 'docs/discussions';

// ---------------------------------------------------------------------------
// CLI

function printHelp() {
  const personasList = Object.entries(PERSONAS)
    .map(([name, p]) => `  ${name.padEnd(8)} ${p.description}`)
    .join('\n');
  console.log(`Usage: yarn ask <persona> [options] "<question>"

Persona-aware CLI для совета у виртуального члена команды.
Шаг 1: контекст из GitHub Issue или файла; ответ в stdout + (опц.) в docs/discussions/<name>.md.
Шаг 2 (позже): --linear MEM-X и --post для работы напрямую с тикетами Linear.

Personas:
${personasList}

Options:
  --gh-issue <N>            Подгрузить тело и комментарии GitHub Issue #N через gh CLI.
  --ticket-file <path>      Прочитать тело задачи из markdown-файла.
  --task "<text>"           Текст задачи строкой (можно вместо файла).
  --save-as <name>          Имя файла обсуждения в docs/discussions/<name>.md (append).
  --no-save                 Принудительно не сохранять (по умолчанию сохраняется при --gh-issue / --ticket-file / --save-as).
  --no-context              Не подгружать WHITE_PAPER / ARCHITECTURE / SERVICES.
  --rag                     Подмешать RAG (operative) по вопросу.
  --lift                    Поднять облако подсознания принудительно (в т.ч. для angelina).
  --no-lift                 Не поднимать облако (по умолчанию поднимается тем, у кого есть
                            архив docs/virtual-team/memory/archive/<persona>.jsonl).
  --no-rag                  Отключить RAG (в т.ч. для vesnin/ozhegov).
  --with-memory             Подмешать журнал субъектного опыта персоны
                            (docs/virtual-team/memory/<persona>.md), по умолчанию ВЫКЛ.
                            Эквивалент: PERSONA_MEMORY_INJECT=1.
  --help, -h                Эта справка.

Среда:
  Канал — панельная цепочка процедуры «ask»: overlay панели + фолбэки каталога
  (ключи звеньев в .env / .env.llm-proxy; см. scripts/lib/llm-provider-catalog.json).
  LLM_NO_OVERLAY=1 — разовый обход overlay, только по слову владельца.
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
  let noSave = false;
  let noContext = false;
  let noRag = false;
  let enableRag = false;
  // Лифт всплытия: по умолчанию поднимается тем, у кого архив есть (см. shouldLift).
  let noLift = false;
  let enableLift = false;
  // Инъекция журнала персоны — строго opt-in (флаг или env), review 2026-07-12.
  let withMemory = process.env.PERSONA_MEMORY_INJECT === '1';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--with-memory') { withMemory = true; continue; }
    if (arg === '--task') { task = argv[++i] ?? ''; continue; }
    if (arg.startsWith('--task=')) { task = arg.slice('--task='.length); continue; }
    if (arg === '--ticket-file') { ticketFile = argv[++i] ?? ''; continue; }
    if (arg.startsWith('--ticket-file=')) { ticketFile = arg.slice('--ticket-file='.length); continue; }
    if (arg === '--gh-issue') { ghIssue = argv[++i] ?? ''; continue; }
    if (arg.startsWith('--gh-issue=')) { ghIssue = arg.slice('--gh-issue='.length); continue; }
    if (arg === '--save-as') { saveAs = argv[++i] ?? ''; continue; }
    if (arg.startsWith('--save-as=')) { saveAs = arg.slice('--save-as='.length); continue; }
    if (arg === '--no-save') { noSave = true; continue; }
    if (arg === '--no-context') { noContext = true; continue; }
    if (arg === '--no-rag') { noRag = true; continue; }
    if (arg === '--rag') { enableRag = true; continue; }
    if (arg === '--no-lift') { noLift = true; continue; }
    if (arg === '--lift') { enableLift = true; continue; }
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

  return { persona, question, task, ticketFile, ghIssue, saveAs, noSave, noContext, noRag, enableRag, noLift, enableLift, withMemory };
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

function buildPrompt({ persona, question, task, ticketFile, noContext, ghIssueData, ragBlock = '', liftBlock = '', withMemory = false }) {
  const cwd = process.cwd();
  const personaCfg = PERSONAS[persona];

  const personaPrompt = readBounded(resolve(cwd, personaCfg.promptFile), MAX_PROMPT_CHARS);
  const memoryBlock = withMemory ? readPersonaMemory(persona, { cwd, maxChars: MAX_MEMORY_CHARS }) : null;

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

  if (memoryBlock) {
    parts.push(
      '---',
      `## Журнал субъектного опыта персоны (${personaMemoryPath(persona)})`,
      '',
      'Это ТВОИ прошлые позиции/голоса с provenance-ссылками. Опирайся на них и ссылайся',
      'на источник; если сегодняшние данные противоречат прошлой позиции — скажи это явно.',
      '',
      memoryBlock,
      '',
    );
  }

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

  // Всплытие идёт ПЕРЕД RAG нарочно: RAG — чужие документы по запросу, лифт — собственная
  // память персоны. Своё она должна увидеть раньше, чем справку.
  if (liftBlock) {
    parts.push('---', liftBlock, '');
  }
  if (ragBlock) {
    parts.push('---', '## RAG context', '', ragBlock, '');
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

function deriveDiscussionName({ saveAs, ghIssue, ticketFile }) {
  if (saveAs) return saveAs;
  if (ghIssue) return `gh-issue-${ghIssue}`;
  if (ticketFile) {
    const base = basename(ticketFile).replace(/\.md$/i, '');
    return base;
  }
  return null;
}

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

  // Сначала подтягиваем gh-issue (если попросили) — чтобы при ошибке не дёргать API.
  let ghIssueData = null;
  if (cli.ghIssue) {
    if (process.stderr.isTTY) console.error(`→ читаю GitHub Issue #${cli.ghIssue}…`);
    ghIssueData = fetchGhIssue(cli.ghIssue);
  }

  let ragBlock = '';
  if (shouldUsePersonaRag(cli)) {
    const rag = await retrieveRagContext(cli.question, { topK: 5 });
    ragBlock = formatRagContextBlock(rag, { title: 'RAG (yarn ask)' });
    logRagStatus(rag, `ask:${cli.persona}`);
  }

  // ── Лифт всплытия (C3, включение по норме #1565) ──────────────────────────
  // Ядро без вызова повторило бы ровно тот дефект, из-за которого контур и стоял
  // непоставленным: комнату спроектировали и не запланировали к постройке.
  let liftBlock = '';
  let cloud = null;
  const archiveAbs = resolve(process.cwd(), HOMES.archive(cli.persona));
  if (shouldLift({ persona: cli.persona, hasArchive: existsSync(archiveAbs), noLift: cli.noLift, enableLift: cli.enableLift })) {
    try {
      cloud = await buildSubconsciousCloud({
        personaId: cli.persona,
        topic: cli.question,
        retrieve: createArchiveRetrieve({
          personaId: cli.persona,
          now: new Date().toISOString().slice(0, 10),
        }),
        // Оперативная проекция — это то, что персона и так помнит. Всплывать ему незачем:
        // иначе «подсознание» окажется эхом свежего стека.
        // `?? ''` — не косметика: `readPersonaMemory` отдаёт `null` для персоны вне
        // `PERSONA_ROLE_LABELS` и для пустого журнала, и прямой `.includes` на нём роняет весь
        // лифт в `catch` (02.08: «всплытие НЕ поднялось — Cannot read properties of null»).
        // Пустая оперативная память означает «ничего не вытеснено, всплывать можно всему» —
        // это законный вход, а не сбой.
        notAlreadyOperational: (id) => !(readPersonaMemory(cli.persona) ?? '').includes(id),
        similarityBetween,
        lambda: LIFT_LAMBDA_V1,
        tauOut: null,
        cloudId: `${cli.persona}-${new Date().toISOString()}`,
      });
      liftBlock = formatCloudForPersona(cloud);
      if (process.stderr.isTTY) {
        console.error(`→ всплытие [${cli.persona}]: ${cloud.items.length} из архива · план ${cloud.queryPlan.health}`);
      }
    } catch (e) {
      // Лифт необязателен для ответа на вопрос: уронить `yarn ask` — инструмент всей
      // команды — из-за своей памяти было бы хуже, чем спросить без неё. Но молчать
      // нельзя: непоказанное облако должно быть видно оператору.
      cloud = null;
      console.error(`→ всплытие [${cli.persona}]: НЕ поднялось — ${e?.message ?? e}`);
    }
  }

  const { text: bodyText, ticketSourceLabel } = buildPrompt({ ...cli, ghIssueData, ragBlock, liftBlock });

  if (process.stderr.isTTY) {
    console.error(`→ ${cli.persona} (${PERSONAS[cli.persona].role})`);
  }

  // Панельная цепочка процедуры «ask»: overlay панели — рука владельца, фасад сам
  // печатает действующую цепочку и перебирает звенья. Прямой anthropicPost здесь
  // был прибит намертво и падал при исчерпанном канале (27.07, req_011CdSzFaXRY…).
  let answer = '';
  let res;
  try {
    res = await invokeProcedureLlm({
      procedureId: 'ask',
      prompt: bodyText,
      maxTokens: 4096,
    });
  } catch (e) {
    console.error(e);
    // exitCode + return, а не process.exit(): сокеты HTTP-вызова ещё живы, и обрыв
    // процесса роняет libuv на Windows ассертом UV_HANDLE_CLOSING → 127 вместо 1.
    process.exitCode = 1;
    return;
  }
  if (!res.ok) {
    // Фасад уже отчитался по каждому звену в stderr; здесь — итог по норме панели.
    console.error('ПАНЕЛЬНАЯ ЦЕПОЧКА НЕ ОТДАЛА КОНТЕНТ (процедура ask) — сообщить владельцу; разовый обход LLM_NO_OVERLAY=1 только по его слову.');
    process.exitCode = 1;
    return;
  }
  answer = res.text;
  if (process.stderr.isTTY) {
    console.error(`→ ответило звено: ${res.provider}/${res.model}`);
  }

  console.log(answer);

  // ── Акт персоны над облаком ───────────────────────────────────────────────
  // Разбирается ТОЛЬКО сказанное персоной. Не нашлось акта — это не отказ и не пустота,
  // а третье состояние: облако показали, суждения не получили. Оно называется вслух.
  if (cloud !== null) {
    const act = validateAct(parseAct(answer), cloud);
    for (const problem of act.problems) console.error(`→ акт [${cli.persona}]: ${problem}`);
    if (act.outcome === 'silent' && cloud.items.length > 0) {
      console.error(`→ акт [${cli.persona}]: облако показано, акт не совершён — ни всплытия, ни отказа`);
    }
    for (const ev of actOpEvents(act, { persona: cli.persona, cloud })) {
      emitOp(process.cwd(), ev);
    }
    if (process.stderr.isTTY) {
      console.error(`→ акт [${cli.persona}]: ${act.outcome} · всплыло ${act.emerged.length}`);
    }
  }

  // Сохраняем, если есть имя обсуждения и не отключено явно --no-save.
  const discussionName = deriveDiscussionName(cli);
  if (discussionName && !cli.noSave) {
    const file = saveExchange({
      name: discussionName,
      persona: cli.persona,
      question: cli.question,
      answer,
      ticketSourceLabel,
    });
    console.error(`→ сохранено: ${file}`);
  } else if (process.stderr.isTTY && !cli.noSave) {
    console.error('→ не сохранено (нет --gh-issue / --ticket-file / --save-as).');
  }

}

main();
