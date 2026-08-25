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
/** id процедуры-канала (реестр `scripts/lib/llm-procedures.json`, цепочка в defaults). */
export const EVENING_FEEDBACK_PROCEDURE_ID = 'team-evening-feedback';

const MAX_BUFFER = 8 * 1024 * 1024;
const MAX_DOC_CHARS = 24_000;
const MAX_CONTEXT_CHARS = 90_000;
const MAX_GIT_LOG_CHARS = 12_000;

/** @type {readonly { readonly key: string; readonly rel: string; readonly label: string; readonly evening?: boolean }[]} */
export const DAY_DOC_INPUTS = [
  { key: 'STRATEGIC_PLAN_DAY', rel: 'docs/STRATEGIC_PLAN_DAY.md', label: 'Стратегический план на день' },
  { key: 'DAILY_STANDUP', rel: 'docs/DAILY_STANDUP.md', label: 'Утренний стендап' },
  { key: 'MAIN_DAY_ISSUE', rel: 'docs/MAIN_DAY_ISSUE.md', label: 'MAIN_DAY_ISSUE (канон дня)' },
  // Конвейер (владелец, 18.07): генератор-аудитор считает сухие факты → рефлексия
  // работает ПОСЛЕ него и НА нём → из неё растут дайджест партнёрам и фидбек владельцу.
  // Порядок в цепочке был верен (audit-evening стоит до фидбека), а вход отсутствовал:
  // 18.07 рефлексия обсуждала oversized из ревью и не назвала разрез 60/33/4 — самое
  // информативное число дня, — потому что не видела хронику.
  { key: 'DAILY_AUDIT', rel: 'docs/DAILY_AUDIT.md', label: 'Хроника дня — сухие факты (ADR-0013)', evening: true },
  { key: 'DAILY_CODE_REVIEW', rel: 'docs/DAILY_CODE_REVIEW.md', label: 'Вечернее code-review (сгенерировано сегодня)', evening: true },
  { key: 'CURRENT_TASK', rel: 'docs/CURRENT_TASK.md', label: 'Буфер CURRENT_TASK' },
];

/**
 * Полный список входов дня: статические DAY_DOC_INPUTS + мемо дня (путь зависит от даты).
 * Мемо — третий вечерний документ (#2107): без него команда судит план, а не прожитое
 * (живая цена 23.08 — 5.7/10 за день, закрытый по настоящей магистрали).
 *
 * @param {string} day — YYYY-MM-DD
 */
export function eveningFeedbackInputs(day) {
  return [
    ...DAY_DOC_INPUTS,
    { key: 'DAY_MEMO', rel: `docs/memos/${day}.md`, label: 'Мемо дня (факты и решения к вечеру)', evening: true },
  ];
}

/** Ключи, без которых протокол фидбека не засчитывается (#2107): три вечерних документа. */
export const EVENING_REQUIRED_KEYS = Object.freeze(['DAILY_AUDIT', 'DAILY_CODE_REVIEW', 'DAY_MEMO']);

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
 * @param {{ readonly cwd?: string; readonly day?: string }} [opts]
 */
export function collectDayDocumentsContext(opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const day = opts.day ?? new Date().toISOString().slice(0, 10);
  const sections = [];

  for (const doc of eveningFeedbackInputs(day)) {
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

export const GATE_STATE_REL = 'docs/tasks/morning-gates-state.json';

/**
 * Магистраль дня — из состояния гейта, а не из MAIN_DAY_ISSUE (#2107).
 *
 * MAIN_DAY_ISSUE по построению не знает ручной чеканки, сделанной ПОСЛЕ его генерации:
 * 23.08 фидбек судил день по firebat из утреннего документа, тогда как владелец зачеканил
 * chart-list-prod-polish рукой, — и выставил 5.7/10 за «несдвинутую» магистраль, закрытую
 * по настоящей. 24.08 расхождение повторилось бы: документ предлагал #2113, зачеканен
 * logging-observability-contour. Гейт — единственный источник, который знает выбор владельца.
 *
 * @param {{ readonly cwd?: string; readonly day?: string }} [opts]
 * @returns {{ id: string|null, author: string|null, day: string|null, fresh: boolean, block: string }}
 */
export function collectGateMagistral(opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const today = opts.day ?? new Date().toISOString().slice(0, 10);
  const abs = resolve(cwd, GATE_STATE_REL);
  let state = null;
  try {
    state = JSON.parse(readFileSync(abs, 'utf8'));
  } catch {
    /* нет файла / битый JSON — честно скажем ниже */
  }
  const id = state?.magistral ?? null;
  const author = state?.magistralAuthor ?? null;
  const day = state?.day ?? null;
  const fresh = Boolean(id) && day === today;

  const lines = ['## Магистраль дня — состояние гейта (авторитетный источник)', ''];
  if (!state) {
    lines.push(`(состояние гейта недоступно: \`${GATE_STATE_REL}\`)`);
  } else if (!fresh) {
    lines.push(
      `⚠ Состояние гейта НЕ сегодняшнее (day=${day ?? '—'}, сегодня ${today}) — магистраль дня не зачеканена; судить день по магистрали из MAIN_DAY_ISSUE запрещено, назови это расхождение в протоколе.`,
    );
  } else {
    lines.push(
      `Зачеканенная магистраль: **${id}** (author=${author ?? '—'}, момент ${state.magistralChosenAt ?? day}).`,
      '',
      'Судить «сдвинулась ли магистраль» ТОЛЬКО по этому идентификатору. Если MAIN_DAY_ISSUE',
      'предлагает другую магистраль — это вход генератора до слова владельца, а не решение дня.',
    );
    if (Array.isArray(state.magistralOptions) && state.magistralOptions.length) {
      lines.push('', `Снимок топ-3 на момент выбора: ${state.magistralOptions.join(' · ')}.`);
    }
  }
  return { id, author, day, fresh, block: lines.join('\n') };
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
    (p.magistralBlock ? `${p.magistralBlock}\n\n---\n\n` : '') +
    '## Документы дня\n\n' +
    p.dayDocs +
    '\n\n---\n\n## Git\n\n' +
    p.gitSummary +
    '\n\n---\n\n## Задание\n\n' +
    assignment
  );
}

/**
 * @param {{
 *   readonly path: string;
 *   readonly body: string;
 *   readonly saveAs?: string;
 *   readonly meta?: { llmProvider?: string; llmModel?: string; llmSource?: string };
 * }} opts
 */
export function writeEveningFeedbackMarkdown(opts) {
  const stamp = new Date().toISOString();
  const slug = opts.saveAs ?? DEFAULT_SAVE_AS;
  // Провенанс канала — в САМ протокол, а не только в консоль: из файла должно быть видно,
  // какое звено цепочки отвечало (образец — writeReviewMarkdown в code-review-ritual.mjs).
  const flags = [
    slug,
    opts.meta?.llmProvider ? `llm-${opts.meta.llmProvider}` : null,
    opts.meta?.llmModel ? `model-${opts.meta.llmModel}` : null,
    opts.meta?.llmSource ? `source-${opts.meta.llmSource}` : null,
  ]
    .filter(Boolean)
    .join('; ');
  const header = `<!-- Сгенерировано: ${stamp} (yarn team-evening-feedback; ${flags}) -->\n`;
  // #2107: блок readAt — та же форма, что утренний страж Ангелины: не «я прочитал»,
  // а ЧТО ИМЕННО прочитано (версия + отпечаток каждого входа на момент генерации).
  const guardLine = opts.meta?.guard
    ? `<!-- evening-feedback ${JSON.stringify(opts.meta.guard)} -->\n`
    : '';
  mkdirSync(dirname(opts.path), { recursive: true });
  writeFileSync(opts.path, header + guardLine + '\n' + opts.body, 'utf8');
}

/**
 * readAt по входам вечера: версия (git) + отпечаток содержимого каждого входа.
 * io — gitFsIo из angelina-adapter; чтение здесь, суждение — в чистом предикате ниже.
 *
 * @param {{ content: (rel: string) => string|null, version: (rel: string) => string|null }} io
 * @param {string} day — YYYY-MM-DD
 * @returns {Record<string, { version: string|null, digest: string|null }>}
 */
export function buildEveningReadAt(io, day, readEntryFn) {
  const out = {};
  for (const doc of eveningFeedbackInputs(day)) {
    out[doc.key] = readEntryFn(io, doc.rel);
  }
  return out;
}

/**
 * ЧИСТЫЙ предикат #2107: протокол засчитан ⟺ readAt несёт все обязательные входы
 * и отпечатки совпадают с переданным текущим состоянием. Без ФС, без часов, без сети —
 * судит только переданные значения; порча любого поля обязана давать красный.
 *
 * @param {{
 *   readonly readAt: Record<string, { version?: string|null, digest?: string|null }>|null|undefined;
 *   readonly current: Record<string, { version?: string|null, digest?: string|null }>;
 *   readonly requiredKeys?: readonly string[];
 * }} p
 * @returns {{ ok: boolean, failures: string[] }}
 */
export function validateEveningFeedbackReadAt(p) {
  const failures = [];
  const readAt = p.readAt;
  const required = p.requiredKeys ?? EVENING_REQUIRED_KEYS;
  if (!readAt || typeof readAt !== 'object') {
    return { ok: false, failures: ['readAt отсутствует — протокол не доказывает чтения входов'] };
  }
  for (const key of required) {
    const rec = readAt[key];
    if (!rec) {
      failures.push(`${key}: входа нет в readAt`);
      continue;
    }
    if (!rec.digest) {
      failures.push(`${key}: отпечаток пуст (файл отсутствовал при генерации)`);
      continue;
    }
    const cur = p.current[key];
    if (!cur || !cur.digest) {
      failures.push(`${key}: текущего отпечатка нет — вход исчез после генерации`);
      continue;
    }
    if (rec.digest !== cur.digest) {
      // Отпечаток разошёлся — тут версия помогает назвать причину: другой день или правка после чтения.
      const versionNote =
        rec.version != null && cur.version != null && rec.version !== cur.version
          ? ' и версия другая (читан вход другого дня)'
          : '';
      failures.push(`${key}: отпечаток не совпадает (читано не то, что лежит)${versionNote}`);
      continue;
    }
    // Отпечаток совпал — версия НЕ судит: доставка в ствол (deliver-to-main) легитимно
    // меняет git-версию того же содержимого. Первый живой прогон 25.08 покраснел ровно
    // на этом: DAILY_CODE_REVIEW прочитан верно, потом закоммичен цепочкой — ложный красный.
  }
  return { ok: failures.length === 0, failures };
}

/**
 * Разбор машинной строки протокола: `<!-- evening-feedback {...} -->`.
 * @param {string} content
 * @returns {{ readAt?: Record<string, {version?: string|null, digest?: string|null}>, magistral?: object }|null}
 */
export function parseEveningFeedbackGuard(content) {
  // Ленивое `.*?` вложенности НЕ боится: захват обязан кончаться `}` непосредственно
  // перед `-->`, поэтому внутренние `}` пропускаются расширением (ревью PR #2136
  // предположило обратное — опровергнуто прогоном, тест «боевая форма» ниже).
  // Строка `-->` внутри guard невозможна: JSON.stringify наших полей её не порождает.
  const m = content.match(/<!--\s*evening-feedback\s+(\{.*?\})\s*-->/s);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/**
 * Чистое ядро вызова канала процедуры для вечернего фидбека.
 *
 * Сеть и ФС приходят инъекцией (`invoke` / `write`), поэтому оба пути проверяются тестом
 * без сети: фолбэк на второе звено и исчерпанная цепочка. Инвариант — **пустой протокол
 * не пишется**: файл, который выдаёт себя за состоявшийся ритуал, хуже отсутствующего
 * (прецедент 25.07 — протокола нет вообще, и это заметили только на следующий день).
 *
 * @param {{
 *   readonly prompt: string;
 *   readonly outputPath: string;
 *   readonly saveAs?: string;
 *   readonly noSave?: boolean;
 *   readonly maxTokens?: number;
 *   readonly invoke: (args: {
 *     procedureId: string;
 *     prompt: string;
 *     maxTokens?: number;
 *     onAttempt: (a: { provider: string; model: string; attemptIndex: number; ok: boolean; errorClass?: string }) => void;
 *   }) => Promise<{
 *     ok: boolean;
 *     text?: string;
 *     provider?: string;
 *     model?: string;
 *     source?: string;
 *     attempts?: number;
 *     errorClass?: string;
 *   }>;
 *   readonly write: (opts: {
 *     path: string;
 *     body: string;
 *     saveAs?: string;
 *     meta?: { llmProvider?: string; llmModel?: string; llmSource?: string };
 *   }) => void;
 *   readonly log?: (line: string) => void;
 *   readonly emit?: (body: string) => void;
 * }} deps
 * @returns {Promise<{ exitCode: number; wrote: boolean; provider?: string; model?: string; source?: string }>}
 */
export async function runEveningFeedbackLlm(deps) {
  const log = deps.log ?? (() => {});
  const result = await deps.invoke({
    procedureId: EVENING_FEEDBACK_PROCEDURE_ID,
    prompt: deps.prompt,
    maxTokens: deps.maxTokens ?? 8192,
    onAttempt: ({ provider, model, attemptIndex, ok, errorClass }) => {
      log(
        ok
          ? `[llm] ${EVENING_FEEDBACK_PROCEDURE_ID} → ${provider}/${model} (attempt ${attemptIndex + 1})`
          : `[llm] ${EVENING_FEEDBACK_PROCEDURE_ID} attempt ${attemptIndex + 1} ${provider}/${model} failed: ${errorClass ?? 'unknown'}`,
      );
    },
  });

  if (!result.ok) {
    log(
      `[llm] цепочка исчерпана для ${EVENING_FEEDBACK_PROCEDURE_ID}: ${result.attempts ?? 0} попыт(ки) (${result.errorClass ?? 'unknown'})`,
    );
    log('Ни одно звено не ответило. Проверьте chain в scripts/lib/llm-procedure-defaults.json и ключи (.env / .env.llm-proxy).');
    log('Протокол НЕ записан — пустой файл выдал бы себя за состоявшийся ритуал.');
    return { exitCode: 1, wrote: false };
  }

  const body = typeof result.text === 'string' ? result.text : '';
  if (!body.trim()) {
    log(
      `[llm] ${result.provider ?? '?'}/${result.model ?? '?'} ответил пустым телом — протокол НЕ записан.`,
    );
    return { exitCode: 1, wrote: false, provider: result.provider, model: result.model, source: result.source };
  }

  deps.emit?.(body);

  if (deps.noSave) {
    log('--no-save: файл не записан');
    return { exitCode: 0, wrote: false, provider: result.provider, model: result.model, source: result.source };
  }

  deps.write({
    path: deps.outputPath,
    body,
    saveAs: deps.saveAs,
    meta: {
      llmProvider: result.provider,
      llmModel: result.model,
      llmSource: result.source,
      guard: deps.guard,
    },
  });
  log(`Записано: ${deps.outputPath}`);
  log(`[llm] source=${result.source ?? '?'} provider=${result.provider ?? '?'}`);
  return { exitCode: 0, wrote: true, provider: result.provider, model: result.model, source: result.source };
}

export function readRequiredFile(relPath) {
  const abs = resolve(process.cwd(), relPath);
  if (!existsSync(abs)) {
    throw new Error(`Файл не найден: ${relPath}`);
  }
  return readFileSync(abs, 'utf8');
}
