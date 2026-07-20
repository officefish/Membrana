/**
 * Движок «ежедневного стендапа» виртуальной команды.
 *
 * Синтезирует уже существующие артефакты (вчерашнее вечернее code-review, план дня, issues, наброски
 * в packages/temp) в один согласованный план работы на сегодня.
 *
 * Используется обёрткой `daily-standup.mjs` → `yarn standup`.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  anthropicPost,
  defaultModel,
  getAnthropicKey,
  loadDotEnv,
  printAnthropicHttpError,
} from './_anthropic-env.mjs';

const MAX_BUFFER = 8 * 1024 * 1024;
const MAX_CONTEXT_CHARS = 95_000;
const MAX_DOC_CHARS = 28_000;
const MAX_TEMP_FILE_CHARS = 12_000;
const MAX_TEMP_TOTAL_CHARS = 36_000;
const MAX_ISSUE_BODY_CHARS = 1_200;

import { assertReviewInputFresh } from './lib/artifact-freshness.mjs';
import {
  buildDetectionPlanningConstraintsBullets,
  FFT_METRICS_POTENTIAL_AND_LIMITS_REL,
} from './lib/detection-planning-priorities.mjs';
import { buildDriftSectionFromDisk } from './lib/drift-digest-section.mjs';
import { headRevision } from './lib/git-day-context.mjs';
import { provenanceHeader, readEntry, gitFsIo } from './lib/angelina-adapter.mjs';
import { readDated } from './lib/read-dated.mjs';
import { CONSILIUM_ROLE_KEY_TO_SLUG, readPersonaMemory } from './lib/persona-memory.mjs';
import { loadRegistry } from './lib/task-registry.mjs';
import {
  buildStandupRouting,
  findInventedTaskIds,
  formatStandupRouting,
  formatStandupSection,
} from './lib/standup-routing.mjs';
import {
  STANDUP_RAG_QUERY,
  formatRagContextBlock,
  logRagStatus,
  retrieveRagContext,
} from './lib/rag-ritual.mjs';

const DOC_INPUTS = [
  { rel: 'docs/VIRTUAL_TEAM_PROMPT.md', required: true, label: 'Промпт виртуальной команды' },
  {
    rel: FFT_METRICS_POTENTIAL_AND_LIMITS_REL,
    required: false,
    label: 'FFT/trends: потолок эшелона 0 и приоритеты планирования (эпик #84)',
  },
  { rel: 'docs/STRATEGY_DAY.md', required: false, label: 'Горизонт дня (генератор #592)' },
  {
    rel: 'docs/DAILY_CODE_REVIEW.md',
    required: false,
    label: 'Вчерашнее вечернее code-review (не генерировать утром)',
    // Кросс-дневное ребро: стендап законно читает ревью ПРОШЛОГО вечера.
    maxAgeDays: 1,
  },
  {
    rel: 'docs/MAIN_DAY_ISSUE.md',
    required: false,
    label: 'Предыдущий MAIN_DAY_ISSUE (канон)',
    // Стендап идёт ДО main-day-issue в цепочке ritual:day, значит читает
    // вчерашний выпуск — это норма, а не протухание.
    maxAgeDays: 1,
  },
  {
    rel: 'docs/CURRENT_TASK.md',
    required: false,
    label: 'Буфер CURRENT_TASK (черновики; может содержать шум — не канон)',
  },
];

const TEMP_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.md']);

function captureError(e) {
  const err = e.stderr?.toString?.() ?? '';
  const out = e.stdout?.toString?.() ?? '';
  return (err || out || e.message || '').trim() || '(команда завершилась с ошибкой)';
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
    return captureError(e);
  }
}

/** @param {string} absPath @param {number} maxChars */
export function readBounded(absPath, maxChars) {
  if (!existsSync(absPath)) return null;
  let text = readFileSync(absPath, 'utf8');
  if (text.length > maxChars) {
    text =
      text.slice(0, maxChars) +
      `\n\n[… обрезано до ${maxChars} символов для запроса …]\n`;
  }
  return text;
}

/** @param {string} remoteUrl */
export function parseGitHubRemote(remoteUrl) {
  const trimmed = remoteUrl.trim();
  const ssh = /^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i.exec(trimmed);
  if (ssh) return { owner: ssh[1], repo: ssh[2].replace(/\.git$/i, '') };
  const https = /^https?:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?\/?$/i.exec(trimmed);
  if (https) return { owner: https[1], repo: https[2].replace(/\.git$/i, '') };
  return null;
}

export function resolveGitHubRepo() {
  const envOwner = process.env.GITHUB_OWNER?.trim();
  const envRepo = process.env.GITHUB_REPO?.trim();
  if (envOwner && envRepo) return { owner: envOwner, repo: envRepo };

  const remote = runGit(['remote', 'get-url', 'origin']);
  if (!remote || remote.startsWith('(')) return null;
  return parseGitHubRemote(remote);
}

function summarizeIssue(issue) {
  const labels = (issue.labels ?? [])
    .map((l) => (typeof l === 'string' ? l : l?.name))
    .filter(Boolean)
    .join(', ');
  let body = (issue.body ?? '').trim();
  if (body.length > MAX_ISSUE_BODY_CHARS) {
    body = body.slice(0, MAX_ISSUE_BODY_CHARS) + '\n[… тело issue обрезано …]';
  }
  return [
    `### #${issue.number} — ${issue.title}`,
    labels ? `Метки: ${labels}` : null,
    body ? body : '(пустое описание)',
  ]
    .filter(Boolean)
    .join('\n');
}

function fetchIssuesViaGh(limit) {
  try {
    const raw = execFileSync(
      'gh',
      [
        'issue',
        'list',
        '--state',
        'open',
        '--limit',
        String(limit),
        '--json',
        'number,title,labels,body',
      ],
      { encoding: 'utf8', cwd: process.cwd(), maxBuffer: MAX_BUFFER },
    );
    const items = JSON.parse(raw);
    return { source: 'gh CLI', items };
  } catch {
    return null;
  }
}

async function fetchIssuesViaApi({ owner, repo, limit }) {
  const token =
    process.env.GITHUB_TOKEN?.trim() ||
    process.env.GH_TOKEN?.trim() ||
    '';
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'membrana-daily-standup',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=${limit}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    return {
      source: 'GitHub API',
      error: `HTTP ${res.status}: ${text.slice(0, 300)}`,
      items: [],
    };
  }
  const items = await res.json();
  const openOnly = items.filter((i) => !i.pull_request);
  return { source: token ? 'GitHub API (authenticated)' : 'GitHub API (public)', items: openOnly };
}

/** @param {{ limit: number }} opts */
export async function collectOpenIssues({ limit }) {
  const gh = fetchIssuesViaGh(limit);
  if (gh?.items?.length) {
    return {
      source: gh.source,
      text: gh.items.map(summarizeIssue).join('\n\n'),
      count: gh.items.length,
    };
  }

  const repo = resolveGitHubRepo();
  if (!repo) {
    return {
      source: null,
      text:
        '(не удалось определить репозиторий: нет `gh`, нет GITHUB_OWNER/GITHUB_REPO, origin не распознан)',
      count: 0,
    };
  }

  const api = await fetchIssuesViaApi({ owner: repo.owner, repo: repo.repo, limit });
  if (api.error) {
    return {
      source: api.source,
      text: `(ошибка загрузки issues: ${api.error})`,
      count: 0,
    };
  }
  return {
    source: `${api.source} (${repo.owner}/${repo.repo})`,
    text: api.items.length ? api.items.map(summarizeIssue).join('\n\n') : '(открытых issues не найдено)',
    count: api.items.length,
  };
}

/** @param {string} dir @param {string[]} acc */
function walkTempFiles(dir, acc) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const abs = join(dir, ent.name);
    if (ent.isDirectory()) {
      walkTempFiles(abs, acc);
      continue;
    }
    const ext = ent.name.slice(ent.name.lastIndexOf('.'));
    if (TEMP_EXTENSIONS.has(ext)) acc.push(abs);
  }
}

/**
 * @param {{ full: boolean }} opts
 */
export function collectTempDrafts({ full }) {
  const tempRoot = resolve(process.cwd(), 'packages/temp');
  if (!existsSync(tempRoot)) {
    return { text: '(каталог packages/temp отсутствует)', fileCount: 0 };
  }

  const files = [];
  walkTempFiles(tempRoot, files);
  files.sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    return { text: '(в packages/temp нет файлов-набросков)', fileCount: 0 };
  }

  const perFileLimit = full ? MAX_TEMP_FILE_CHARS : 6_000;
  const totalLimit = full ? MAX_TEMP_TOTAL_CHARS : 18_000;
  const blocks = [];
  let used = 0;

  for (const abs of files) {
    if (used >= totalLimit) {
      blocks.push(`\n[… ещё ${files.length - blocks.length} файл(ов) опущено — запустите yarn standup:full …]`);
      break;
    }
    const rel = relative(process.cwd(), abs).replace(/\\/g, '/');
    let content = readFileSync(abs, 'utf8');
    const budget = Math.min(perFileLimit, totalLimit - used);
    if (content.length > budget) {
      content = content.slice(0, budget) + `\n[… файл обрезан …]`;
    }
    used += content.length;
    const size = statSync(abs).size;
    blocks.push(`#### ${rel} (${size} bytes)\n\n\`\`\`\n${content}\n\`\`\``);
  }

  return {
    text: blocks.join('\n\n'),
    fileCount: files.length,
  };
}

export function collectStatusSnapshot() {
  const branch = runGit(['branch', '--show-current']) || 'detached';
  const last = runGit(['log', '-1', '--format=%h - %s (%an, %ar)']) || 'no commits';
  const status = runGit(['status', '--short']) || '(чистое рабочее дерево)';
  return [`Branch: ${branch}`, `Last commit: ${last}`, '--- working tree ---', status].join('\n');
}

/** Локальный календарный день — «сегодня» для гейта свежести входов. */
function localDayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function collectDocInputs() {
  const blocks = [];
  const missingRequired = [];
  const staleInputs = [];
  const today = localDayKey();

  for (const { rel, required, label, maxAgeDays } of DOC_INPUTS) {
    const abs = resolve(process.cwd(), rel);
    const text = readBounded(abs, MAX_DOC_CHARS);
    if (!text) {
      if (required) missingRequired.push(rel);
      blocks.push(`### ${label}\n\n(файл ${rel} не найден — пропущен)\n`);
      continue;
    }

    // ГЕЙТ СВЕЖЕСТИ ВХОДА (узел F, спринт ritual-step-manifest-sf). Стендап НЕ
    // блокируем, но протухший вход обязан стать видимым В САМОМ АРТЕФАКТЕ:
    // читатель стендапа должен знать, что тот собран на трёхдневном ревью.
    // Гейт ставится ТОЛЬКО там, где вход реально датирован — на артефакте без
    // провенанса он давал бы вечный ложный варнинг, т.е. шум вместо сигнала.
    const stale = Number.isInteger(maxAgeDays) ? readDated(rel, { today, maxAgeDays, label }).why : null;
    if (stale) {
      staleInputs.push(stale);
      console.warn(`[standup] ⚠ ${stale}`);
      blocks.push(`### ${label} (\`${rel}\`)\n\n> ⚠ **ВХОД НЕСВЕЖ:** ${stale}\n\n${text}\n`);
      continue;
    }

    blocks.push(`### ${label} (\`${rel}\`)\n\n${text}\n`);
  }

  return { blocks: blocks.join('\n'), missingRequired, staleInputs };
}

/**
 * Склейка промпта: обрезается КОНТЕКСТ, задание защищено.
 *
 * Баг, найденный 16.07 (пре­существовал): `buildTaskPrompt` шёл последним внутри
 * общей склейки, и обрезка по `MAX_CONTEXT_CHARS` съедала его ЦЕЛИКОМ. При 25
 * открытых issues в промпт уходили роли + доки + issues и **ни одной инструкции** —
 * модель импровизировала, а выход выглядел нормально. Тихий класс: скрипт печатал
 * успех, стендап генерировался, задание модель не видела.
 *
 * @param {{ context: string, assignment: string, maxChars: number }} p
 */
export function assembleStandupPrompt({ context, assignment, maxChars }) {
  // Бюджет учитывает и задание, и саму пометку об обрезке: иначе итог вылезает за
  // maxChars ровно на длину пометки (поймано строгим тестом ≤ maxChars).
  const note = '\n\n[… контекст обрезан (задание защищено от обрезки); полнее — yarn standup:full …]\n';
  const budget = maxChars - assignment.length - note.length - 1;
  if (budget <= 0) return assignment; // задание длиннее бюджета — оно важнее контекста
  const trimmed = context.length > budget ? context.slice(0, budget) + note : context;
  return `${trimmed}\n${assignment}`;
}

function buildTaskPrompt({ outputRel, issueCount, tempFileCount, routingBlock }) {
  const today = new Date().toISOString().slice(0, 10);
  return [
    '# Задание',
    '',
    `Дай **фокус дня** для стендапа виртуальной команды Membrana на **${today}**.`,
    '',
    'Это НЕ отчёт и НЕ пересказ входов. Стендап смотрит ВПЕРЁД: вечерний',
    'code-review смотрит назад, дублировать его не нужно (консилиум',
    '`standup-charge-2026-07-16`: стендап — заряжающее утреннее собрание,',
    'питаемое вечерним feedback-loop\'ом; это слои, а не одно и то же).',
    '',
    '## Обязательная структура — РОВНО два раздела, без отклонений',
    '',
    '## Фокус дня',
    '- **Одна строка** — что одно главное делаем сегодня.',
    '- 2–3 предложения: почему именно это, главный риск, критерий успеха к вечеру.',
    '',
    '## Что сознательно не делаем',
    '- 2–4 буллета: что откладываем, чтобы не расползтись.',
    '',
    '## Роутинг персон — НЕ ПИШИ ЕГО',
    '',
    'Строки «кто на какой задаче» **вычислены детерминированно** из реестра задач',
    '(`leadPersona`/`supportPersonas`) и подставляются скриптом ПОСЛЕ твоего ответа.',
    'Ты их не пишешь и не повторяешь. Вот что будет подставлено — используй как',
    'контекст для фокуса дня, но не копируй:',
    '',
    routingBlock || '(роутинг недоступен)',
    '',
    'Ограничения:',
    '- Язык — русский.',
    '- **Не выдумывай task-id, issues и пакеты.** Задача существует, только если она',
    '  есть в реестре или в открытых Issues выше. Скрипт проверяет это гейтом.',
    '- Не пересказывай входные документы — только решение «что одно главное сейчас».',
    '- Не предлагай сроки в часах/днях — только размер S/M/L и зависимости.',
    '- Не пиши мотивирующих лозунгов: заряд — это конкретная задача под сильную',
    '  сторону, а не тон. Каждое утверждение должно быть проверяемым (фальсифицируемым).',
    ...buildDetectionPlanningConstraintsBullets(),
    `- Документ предназначен для файла \`${outputRel}\`; контекст: открытых Issues ${issueCount}, набросков temp ${tempFileCount}.`,
  ].join('\n');
}

/**
 * @param {{ full: boolean, dryRun: boolean, issueLimit: number, outputPath: string, commandName: string }} options
 */
/** RT-9: если вчерашнее ревью на диске — штамп не старше 1 дня. Отсутствие файла — ок (optional). */
export function guardDailyCodeReviewInput(today = new Date().toISOString().slice(0, 10)) {
  const rel = 'docs/DAILY_CODE_REVIEW.md';
  const abs = resolve(process.cwd(), rel);
  if (!existsSync(abs)) return;
  assertReviewInputFresh(readFileSync(abs, 'utf8'), { today, label: rel, maxAgeDays: 1 });
}

export async function runDailyStandup(options) {
  loadDotEnv();

  try {
    guardDailyCodeReviewInput();
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = err && typeof err === 'object' && 'exitCode' in err ? Number(err.exitCode) || 2 : 2;
    return;
  }

  const { blocks: docBlocks, missingRequired } = collectDocInputs();
  if (missingRequired.length > 0) {
    console.error('Обязательные файлы не найдены:', missingRequired.join(', '));
    process.exitCode = 1;
    return;
  }

  const virtualTeamPath = resolve(process.cwd(), 'docs/VIRTUAL_TEAM_PROMPT.md');
  const virtualTeamPrompt = readFileSync(virtualTeamPath, 'utf8');

  const issues = await collectOpenIssues({ limit: options.issueLimit });
  const temp = collectTempDrafts({ full: options.full });
  const status = collectStatusSnapshot();
  const outputRel = relative(process.cwd(), options.outputPath).replace(/\\/g, '/');

  // Роутинг талантов ВЫЧИСЛЯЕТСЯ, а не пишется моделью (консилиум
  // standup-charge-2026-07-16): детерминированно из реестра × компетенций
  // VIRTUAL_TEAM_PROMPT. Что вычислено — то нельзя выдумать.
  const registry = loadRegistry();
  const memories = Object.fromEntries(
    Object.values(CONSILIUM_ROLE_KEY_TO_SLUG).map((slug) => [slug, readPersonaMemory(slug) ?? '']),
  );
  const routing = buildStandupRouting({ registry, virtualTeamMd: virtualTeamPrompt, memories });
  // Гейт против выдуманных задач (паттерн main-day-probe): страхует от того, что
  // роутинг назовёт id, которого нет в реестре.
  const invented = findInventedTaskIds(routing, registry);
  if (invented.length > 0) {
    console.error(`standup: выдуманные task-id — ${invented.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  let ragBlock = '';
  if (!options.noRag) {
    const rag = await retrieveRagContext(STANDUP_RAG_QUERY, { topK: 5 });
    ragBlock = formatRagContextBlock(rag, { title: 'RAG operative (standup)' });
    logRagStatus(rag, 'standup');
  }

  const sections = [
    'Ты — координатор виртуальной команды Membrana (см. промпт ниже).',
    'Проведи «ежедневный стендап»: сведи вчерашнее вечернее code-review, дневной стратегический план,',
    'открытые GitHub Issues и наброски packages/temp в единый план на сегодня.',
    '',
    '---',
    '## Промпт виртуальной команды (полный)',
    '',
    virtualTeamPrompt,
    '',
    '---',
    '## Входные документы',
    '',
    docBlocks,
    '',
    ...(ragBlock
      ? ['---', '## RAG operative context', '', ragBlock, '']
      : []),
    '---',
    `## Открытые GitHub Issues (источник: ${issues.source ?? 'нет'})`,
    '',
    issues.text,
    '',
    '---',
    `## Наброски packages/temp (${temp.fileCount} файл(ов))`,
    '',
    temp.text,
    '',
    '---',
    '## Состояние репозитория',
    '',
    status,
    '',
    '---',
  ];

  const assignment = buildTaskPrompt({
    outputRel,
    issueCount: issues.count,
    tempFileCount: temp.fileCount,
    routingBlock: formatStandupRouting(routing),
  });

  const bodyText = assembleStandupPrompt({
    context: sections.join('\n'),
    assignment,
    maxChars: MAX_CONTEXT_CHARS,
  });

  if (options.dryRun) {
    console.log(bodyText);
    console.error(
      `\n[dry-run] Контекст: ${bodyText.length} символов; issues: ${issues.count}; temp: ${temp.fileCount} файлов.`,
    );
    console.error('[dry-run] API не вызывался. Для генерации: yarn standup');
    return;
  }

  let key;
  try {
    key = getAnthropicKey();
  } catch (e) {
    console.error(e.message);
    console.error('См. .env.example. Для проверки контекста без API: yarn standup:dry');
    process.exitCode = 1;
    return;
  }

  const model = defaultModel();
  const bodyJson = {
    model,
    max_tokens: 8192,
    messages: [{ role: 'user', content: [{ type: 'text', text: bodyText }] }],
  };

  let exitCode = 0;
  try {
    const { ok, status: httpStatus, text } = await anthropicPost(
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
      printAnthropicHttpError(httpStatus, text);
      exitCode = 1;
    } else {
      let out = '';
      try {
        const json = JSON.parse(text);
        out = (json?.content ?? [])
          .filter((b) => b?.type === 'text')
          .map((b) => b.text)
          .join('\n');
        if (!out) out = JSON.stringify(json?.content ?? [], null, 2);
      } catch {
        out = text;
      }
      {
        // Роутинг талантов — детерминированная секция, тот же паттерн, что drift ниже.
        // Подставляется ПОСЛЕ ответа модели: что вычислено, то нельзя выдумать.
        out = `${out}\n\n---\n\n${formatStandupSection(routing)}`;
      }
      {
        // DA5: read-only дрейф-секция из последнего DRIFT_*.json (DA3-раннер).
        // Детерминированный рендер, не LLM; graceful — без дайджеста секции нет.
        const driftSection = buildDriftSectionFromDisk(process.cwd());
        if (driftSection) out = `${out}\n\n---\n\n${driftSection}`;
      }
      writeStandupFile({
        outputPath: options.outputPath,
        commandName: options.commandName,
        body: out,
        meta: { issues: issues.count, tempFiles: temp.fileCount, issueSource: issues.source },
      });
      console.log(out);
      console.error('Записано:', options.outputPath);
    }
  } catch (e) {
    console.error(e);
    exitCode = 1;
  }

  process.exitCode = exitCode;
}

function writeStandupFile({ outputPath, commandName, body, meta }) {
  const stamp = new Date().toISOString();
  const io = gitFsIo(process.cwd(), { execFileSync, readFileSync, existsSync, join });
  const readAt = { STRATEGY_DAY: readEntry(io, 'docs/STRATEGY_DAY.md') };
  const header =
    `<!-- Сгенерировано: ${stamp} (${commandName}@${headRevision()}) -->\n` +
    `<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->\n` +
    `<!-- Входы: VIRTUAL_TEAM_PROMPT, ${FFT_METRICS_POTENTIAL_AND_LIMITS_REL}, STRATEGY_DAY, DAILY_CODE_REVIEW, GitHub Issues (${meta.issues}), packages/temp (${meta.tempFiles} файлов) -->\n` +
    `<!-- Issues: ${meta.issueSource ?? 'n/a'} -->\n` +
    `${provenanceHeader({ author: 'vesnin', readAt })}\n\n`;
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, header + body, 'utf8');
}

export function parseStandupArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`Usage: node scripts/daily-standup.mjs [--full] [--dry-run] [--issues=<N>] [--help]

  Ежедневный стендап (daily standup): синтез плана работы виртуальной команды.

  --full        Больше текста из packages/temp (наброски UI/плагинов).
  --dry-run     Собрать контекст и вывести в stdout, без вызова Anthropic API.
  --no-rag      Не подмешивать operative RAG (git + docs остаются).
  --issues=<N>  Сколько открытых issues подтянуть (по умолчанию 25; в --full: 40).
  --help        Эта справка.

  Требуется ANTHROPIC_API_KEY (кроме --dry-run).
  Результат: docs/DAILY_STANDUP.md (перезапись).

  Issues: сначала gh CLI; иначе GitHub API по origin (GITHUB_TOKEN опционален).
  Рекомендуемый ритуал:
    yarn plan:day && yarn standup && yarn main-day-issue

  Вечером перед сном: yarn code-review (см. DEVELOPER_RHYTHM.md).`);
    process.exit(0);
  }

  const full = argv.includes('--full');
  const dryRun = argv.includes('--dry-run');
  const noRag = argv.includes('--no-rag');
  let issueLimit = full ? 40 : 25;
  for (const a of argv) {
    if (a.startsWith('--issues=')) {
      const n = Number(a.slice('--issues='.length));
      if (Number.isFinite(n) && n > 0) issueLimit = Math.min(100, Math.floor(n));
    }
  }
  return { full, dryRun, issueLimit, noRag };
}
