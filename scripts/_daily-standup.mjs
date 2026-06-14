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

const DOC_INPUTS = [
  { rel: 'docs/VIRTUAL_TEAM_PROMPT.md', required: true, label: 'Промпт виртуальной команды' },
  { rel: 'docs/STRATEGIC_PLAN_DAY.md', required: false, label: 'Стратегический план на день' },
  {
    rel: 'docs/DAILY_CODE_REVIEW.md',
    required: false,
    label: 'Вчерашнее вечернее code-review (не генерировать утром)',
  },
  { rel: 'docs/MAIN_DAY_ISSUE.md', required: false, label: 'Предыдущий MAIN_DAY_ISSUE (канон)' },
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

function collectDocInputs() {
  const blocks = [];
  const missingRequired = [];

  for (const { rel, required, label } of DOC_INPUTS) {
    const abs = resolve(process.cwd(), rel);
    const text = readBounded(abs, MAX_DOC_CHARS);
    if (!text) {
      if (required) missingRequired.push(rel);
      blocks.push(`### ${label}\n\n(файл ${rel} не найден — пропущен)\n`);
      continue;
    }
    blocks.push(`### ${label} (\`${rel}\`)\n\n${text}\n`);
  }

  return { blocks: blocks.join('\n'), missingRequired };
}

function buildTaskPrompt({ outputRel, issueCount, tempFileCount }) {
  const today = new Date().toISOString().slice(0, 10);
  return [
    '# Задание',
    '',
    `Сформируй markdown-документ **«Ежедневный стендап виртуальной команды»** на **${today}**.`,
    'Это синхронизационное «собрание» (daily standup / daily sync): не повторяй дословно входные',
    'документы, а **сведи их в один согласованный план работы на сегодня**.',
    '',
    '## Обязательная структура (заголовки ## и ### — без отклонений)',
    '',
    '## Резюме дня',
    '- 3–5 предложений: главный фокус, главный риск, критерий успеха к вечеру.',
    '',
    '## Входные артефакты',
    '- Таблица: источник | актуальность | что из него берём сегодня.',
    `- Упомяни: STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, открытые GitHub Issues (${issueCount}), наброски packages/temp (${tempFileCount} файл(ов)).`,
    '',
    '## Порядок работы',
    '- Краткая цепочка ролей (кто первый, кто ревьюит).',
    '',
    '## [Teamlead]',
    '- Стратегический фокус, LGTM-границы, что сознательно **не** делаем сегодня.',
    '- Приоритизация GitHub Issues (номера #N) — что в скоупе дня, что отложить.',
    '',
    '## [Структурщик]',
    '- Пакеты, интеграция, слабая связанность, agenda/telemetry.',
    '',
    '## [Математик]',
    '- Чистые функции, тесты, контракты данных (FFT / классификатор).',
    '',
    '## [Музыкант]',
    '- Поток audio-engine (sample rate, буфер), полевые сэмплы.',
    '',
    '## [Верстальщик]',
    '- UI по DESIGN.md; что переносим из packages/temp, что **не** переносим (anti-patterns).',
    '',
    '## План на сегодня',
    'Таблица: | Блок | Размер S/M/L | Задача | DoD | Issues |',
    '3–6 строк с проверяемым Definition of Done.',
    '',
    '## Матрица Issues ↔ задачи дня',
    '| Задача дня | GitHub Issues |',
    '',
    '## Итоговый артефакт',
    '- Список файлов/пакетов, которые должны появиться или измениться.',
    '',
    '## Definition of Done (день)',
    '- 5–8 чекбоксов `- [ ] …`.',
    '',
    '## Риски',
    '- 2–4 пункта; если план перегружен — явно назови, что срезать первым.',
    '',
    'Ограничения:',
    '- Язык — русский.',
    '- Соблюдай формат ролей из VIRTUAL_TEAM_PROMPT (блоки `[Teamlead]:` и т.д. внутри соответствующих ##-разделов).',
    '- Не выдумывай закрытые issues и несуществующие пакеты.',
    '- Если набросок в packages/temp противоречит ARCHITECTURE/SERVICES — предпочти архитектуру, temp пометь как reference-only.',
    '- Не предлагай сроки в часах/днях — только размер S/M/L и зависимости.',
    `- Документ предназначен для файла \`${outputRel}\` и должен быть самодостаточен.`,
  ].join('\n');
}

/**
 * @param {{ full: boolean, dryRun: boolean, issueLimit: number, outputPath: string, commandName: string }} options
 */
export async function runDailyStandup(options) {
  loadDotEnv();

  const { blocks: docBlocks, missingRequired } = collectDocInputs();
  if (missingRequired.length > 0) {
    console.error('Обязательные файлы не найдены:', missingRequired.join(', '));
    process.exit(1);
  }

  const virtualTeamPath = resolve(process.cwd(), 'docs/VIRTUAL_TEAM_PROMPT.md');
  const virtualTeamPrompt = readFileSync(virtualTeamPath, 'utf8');

  const issues = await collectOpenIssues({ limit: options.issueLimit });
  const temp = collectTempDrafts({ full: options.full });
  const status = collectStatusSnapshot();
  const outputRel = relative(process.cwd(), options.outputPath).replace(/\\/g, '/');

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
    buildTaskPrompt({
      outputRel,
      issueCount: issues.count,
      tempFileCount: temp.fileCount,
    }),
  ];

  const assembled = sections.join('\n');
  const bodyText =
    assembled.length > MAX_CONTEXT_CHARS
      ? assembled.slice(0, MAX_CONTEXT_CHARS) +
        `\n\n[… контекст обрезан до ${MAX_CONTEXT_CHARS} символов; для набросков используйте yarn standup:full …]\n`
      : assembled;

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
    process.exit(1);
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

  process.exit(exitCode);
}

function writeStandupFile({ outputPath, commandName, body, meta }) {
  const stamp = new Date().toISOString();
  const header =
    `<!-- Сгенерировано: ${stamp} (${commandName}) -->\n` +
    `<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->\n` +
    `<!-- Входы: VIRTUAL_TEAM_PROMPT, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (${meta.issues}), packages/temp (${meta.tempFiles} файлов) -->\n` +
    `<!-- Issues: ${meta.issueSource ?? 'n/a'} -->\n\n`;
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, header + body, 'utf8');
}

export function parseStandupArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`Usage: node scripts/daily-standup.mjs [--full] [--dry-run] [--issues=<N>] [--help]

  Ежедневный стендап (daily standup): синтез плана работы виртуальной команды.

  --full        Больше текста из packages/temp (наброски UI/плагинов).
  --dry-run     Собрать контекст и вывести в stdout, без вызова Anthropic API.
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
  let issueLimit = full ? 40 : 25;
  for (const a of argv) {
    if (a.startsWith('--issues=')) {
      const n = Number(a.slice('--issues='.length));
      if (Number.isFinite(n) && n > 0) issueLimit = Math.min(100, Math.floor(n));
    }
  }
  return { full, dryRun, issueLimit };
}
