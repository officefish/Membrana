/**
 * Shared team evening feedback ritual: inputs, paths, message assembly.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

import { slugify } from './consilium-paths.mjs';
import { parseRagCliFlags } from './rag-ritual.mjs';
import { todaysCommits, todaysChangedFiles } from './git-day-context.mjs';

export const REGULATION_PATH = 'docs/prompts/TEAM_EVENING_FEEDBACK_REGULATION.md';
export const PROMPT_PATH = 'docs/prompts/TEAM_EVENING_FEEDBACK.md';
export const VIRTUAL_TEAM_PATH = 'docs/VIRTUAL_TEAM_PROMPT.md';
export const SEANSES_DIR = 'docs/seanses';
export const DEFAULT_SAVE_AS = 'team-evening-feedback';

const MAX_BUFFER = 8 * 1024 * 1024;
const MAX_DOC_CHARS = 24_000;
const MAX_CONTEXT_CHARS = 90_000;
const MAX_GIT_LOG_CHARS = 12_000;

/** @type {readonly { readonly rel: string; readonly label: string; readonly required?: boolean }[]} */
export const DAY_DOC_INPUTS = [
  { rel: 'docs/STRATEGIC_PLAN_DAY.md', label: 'Стратегический план на день' },
  { rel: 'docs/DAILY_STANDUP.md', label: 'Утренний стендап' },
  { rel: 'docs/MAIN_DAY_ISSUE.md', label: 'MAIN_DAY_ISSUE (канон дня)' },
  // Конвейер (владелец, 18.07): генератор-аудитор считает сухие факты → рефлексия
  // работает ПОСЛЕ него и НА нём → из неё растут дайджест партнёрам и фидбек владельцу.
  // Порядок в цепочке был верен (audit-evening стоит до фидбека), а вход отсутствовал:
  // 18.07 рефлексия обсуждала oversized из ревью и не назвала разрез 60/33/4 — самое
  // информативное число дня, — потому что не видела хронику.
  { rel: 'docs/DAILY_AUDIT.md', label: 'Хроника дня — сухие факты (ADR-0013)' },
  { rel: 'docs/DAILY_CODE_REVIEW.md', label: 'Вечернее code-review (сгенерировано сегодня)' },
  { rel: 'docs/CURRENT_TASK.md', label: 'Буфер CURRENT_TASK' },
];

export const EVENING_FEEDBACK_RAG_QUERY =
  'evening team feedback strategic plan main day issue code review developer rhythm';

export function printTeamEveningFeedbackHelp() {
  console.log(`Usage: yarn team-evening-feedback [options]

Вечерняя ретроспектива виртуальной команды → docs/seanses/team-evening-feedback-<date>.md
Промпт: ${PROMPT_PATH}
Регламент: ${REGULATION_PATH}

Options:
  --save-as <slug>   Имя файла (по умолчанию: team-evening-feedback)
  --out <path>       Явный путь вывода
  --no-rag           Без RAG context
  --no-save          Только stdout
  --dry-run          Собрать промпт, не вызывать API
  --help, -h         Справка

Требуется ANTHROPIC_API_KEY в .env.
Запускать после yarn code-review (входит в yarn ritual:evening).`);
}

/**
 * @param {string[]} argv
 */
export function parseTeamEveningFeedbackCli(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    return { help: true };
  }

  const rag = parseRagCliFlags(argv);
  let saveAs = DEFAULT_SAVE_AS;
  let out = '';
  let noSave = false;
  let dryRun = false;

  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--no-rag' || arg === '--rag' || arg === '--full-rag') continue;
    if (arg === '--no-save') {
      noSave = true;
      continue;
    }
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--save-as') {
      saveAs = argv[++i] ?? saveAs;
      continue;
    }
    if (arg.startsWith('--save-as=')) {
      saveAs = arg.slice('--save-as='.length);
      continue;
    }
    if (arg === '--out') {
      out = argv[++i] ?? '';
      continue;
    }
    if (arg.startsWith('--out=')) {
      out = arg.slice('--out='.length);
      continue;
    }
    rest.push(arg);
  }

  const focusNote = rest.join(' ').trim();

  return { help: false, saveAs, out, noSave, dryRun, focusNote, ...rag };
}

/**
 * @param {string} absPath
 * @param {number} maxChars
 */
export function readBoundedFile(absPath, maxChars) {
  if (!existsSync(absPath)) {
    return null;
  }
  let text = readFileSync(absPath, 'utf8');
  if (text.length > maxChars) {
    text = text.slice(0, maxChars) + `\n\n[… обрезано до ${maxChars} символов …]\n`;
  }
  return text;
}

function runGit(args) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      cwd: process.cwd(),
      maxBuffer: MAX_BUFFER,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trimEnd();
  } catch (e) {
    const err = e.stderr?.toString?.() ?? '';
    const out = e.stdout?.toString?.() ?? '';
    return (err || out || e.message || '').trim() || '(git недоступен)';
  }
}

function trimBlock(text, maxChars, label) {
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars) + `\n\n[… блок «${label}» обрезан …]\n`;
}

/**
 * @param {{ readonly cwd?: string; readonly date?: Date }} [opts]
 */
export function collectGitDaySummary(opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const date = opts.date ?? new Date();
  const day = date.toISOString().slice(0, 10);

  const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
  // NB7: через общий git-day-context (без --author; sort+cap 120 — не отсекать файлы
  // РАННИХ коммитов дня, иначе фидбэк не видит утреннюю работу).
  const oneline = todaysCommits({ format: '%h %s', limit: 30 });
  const { files, more: filesMore } = todaysChangedFiles(120);

  let block =
    `## Git за ${day}\n\n` +
    `**Ветка:** ${branch}\n\n` +
    `### Коммиты (since midnight)\n\n` +
    (oneline || '(нет коммитов за календарный день)') +
    `\n\n### Затронутые файлы (уникальные, до 120${filesMore > 0 ? `, +${filesMore} ещё` : ''})\n\n` +
    (files.length > 0 ? files.map((f) => `- ${f}`).join('\n') : '(нет)');

  if (block.length > MAX_GIT_LOG_CHARS) {
    block = block.slice(0, MAX_GIT_LOG_CHARS) + '\n\n[… git log обрезан …]\n';
  }

  return { block, cwd };
}

/**
 * @param {{ readonly cwd?: string }} [opts]
 */
export function collectDayDocumentsContext(opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const sections = [];

  for (const doc of DAY_DOC_INPUTS) {
    const abs = resolve(cwd, doc.rel);
    const text = readBoundedFile(abs, MAX_DOC_CHARS);
    if (text === null) {
      sections.push(`### ${doc.label}\n\n(файл отсутствует: \`${doc.rel}\`)\n`);
      continue;
    }
    sections.push(`### ${doc.label}\n\n\`${doc.rel}\`\n\n${text}\n`);
  }

  return trimBlock(sections.join('\n'), MAX_CONTEXT_CHARS, 'документы дня');
}

/**
 * @param {{ readonly saveAs: string; readonly date?: Date; readonly out?: string; readonly cwd?: string }} opts
 */
export function resolveEveningFeedbackOutputPath(opts) {
  if (opts.out) {
    return resolve(opts.cwd ?? process.cwd(), opts.out);
  }
  const day = (opts.date ?? new Date()).toISOString().slice(0, 10);
  const slug = slugify(opts.saveAs || DEFAULT_SAVE_AS, 64);
  return resolve(opts.cwd ?? process.cwd(), SEANSES_DIR, `${slug}-${day}.md`);
}

/**
 * @param {{
 *   readonly regulation: string;
 *   readonly prompt: string;
 *   readonly virtualTeam: string;
 *   readonly dayDocs: string;
 *   readonly gitSummary: string;
 *   readonly ragBlock?: string;
 *   readonly focusNote?: string;
 *   readonly date?: Date;
 * }} p
 */
export function buildEveningFeedbackUserMessage(p) {
  const day = (p.date ?? new Date()).toISOString().slice(0, 10);
  const assignment = p.focusNote
    ? `Дополнительная пометка координатора: ${p.focusNote}`
    : `Проведи Team Evening Feedback за ${day}. Соблюдай формат из промпта. Опирайся на приложенные документы дня и git.`;

  return (
    '## Регламент Team Evening Feedback\n\n' +
    p.regulation +
    '\n\n---\n\n## Промпт сеанса\n\n' +
    p.prompt +
    '\n\n---\n\n## Промпт виртуальной команды\n\n' +
    p.virtualTeam +
    '\n\n---\n\n' +
    (p.ragBlock ? `## RAG context\n\n${p.ragBlock}\n\n---\n\n` : '') +
    '## Документы дня\n\n' +
    p.dayDocs +
    '\n\n---\n\n## Git\n\n' +
    p.gitSummary +
    '\n\n---\n\n## Задание\n\n' +
    assignment
  );
}

/**
 * @param {{ readonly path: string; readonly body: string; readonly saveAs?: string }} opts
 */
export function writeEveningFeedbackMarkdown(opts) {
  const stamp = new Date().toISOString();
  const slug = opts.saveAs ?? DEFAULT_SAVE_AS;
  const header =
    `<!-- Сгенерировано: ${stamp} (yarn team-evening-feedback; ${slug}) -->\n\n`;
  mkdirSync(dirname(opts.path), { recursive: true });
  writeFileSync(opts.path, header + opts.body, 'utf8');
}

export function readRequiredFile(relPath) {
  const abs = resolve(process.cwd(), relPath);
  if (!existsSync(abs)) {
    throw new Error(`Файл не найден: ${relPath}`);
  }
  return readFileSync(abs, 'utf8');
}
