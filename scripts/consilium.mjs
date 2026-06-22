/**
 * scripts/consilium.mjs
 *
 * Консилиум виртуальной команды: один вызов Messages API, протокол в docs/seanses/.
 *
 * yarn consilium "нужен ли отдельный пакет брендбука?"
 * yarn consilium --save-as brandbook "…"
 * yarn consilium --gh-issue 12 "уточнить границы"
 * yarn consilium --topic-file ./agenda.md "…"
 * yarn consilium --seed 42 --dry-run "…"
 * yarn consilium --no-save "…"
 *
 * Требуется ANTHROPIC_API_KEY в .env. Промпт: docs/prompts/CONSILIUM_PROMPT.md
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  anthropicPost,
  defaultModel,
  getAnthropicKey,
  loadDotEnv,
  printAnthropicHttpError,
} from './_anthropic-env.mjs';
import {
  CONSILIUM_PROMPT_FILE,
  CONSILIUM_ROLES,
  formatRoleOrderLine,
  resolveSeansePath,
  shuffleRoles,
} from './lib/consilium-paths.mjs';
import {
  formatRagContextBlock,
  logRagStatus,
  retrieveRagContext,
} from './lib/rag-ritual.mjs';

const MAX_PROMPT_SPEC_CHARS = 12_000;
const MAX_VIRTUAL_TEAM_CHARS = 8_000;
const MAX_PERSONA_CHARS = 4_000;
const MAX_CONTEXT_CHARS = 6_000;
const MAX_TOPIC_CHARS = 12_000;
const MAX_TICKET_CHARS = 20_000;
const MAX_ASSEMBLED_CHARS = 95_000;
const MIN_REPLIES_DEFAULT = 20;

const PERSONA_FILES = {
  teamlead: 'docs/virtual-team/PROMPT_TEAMLEAD.md',
  structurer: 'docs/virtual-team/PROMPT_STRUCTURER.md',
  mathematician: 'docs/virtual-team/PROMPT_MATHEMATICIAN.md',
  musician: 'docs/virtual-team/PROMPT_MUSICIAN.md',
  layout: 'docs/virtual-team/PROMPT_LAYOUT_DEVELOPER.md',
};

const CONTEXT_FILES = [
  { path: 'docs/ARCHITECTURE.md', title: 'Архитектура' },
  { path: 'docs/DESIGN.md', title: 'Дизайн' },
  { path: 'docs/SERVICES.md', title: 'Сервисы' },
];

function printHelp() {
  console.log(`Usage: yarn consilium [options] "<question>"

Консилиум пяти ролей виртуальной команды. Протокол → docs/seanses/<slug>-<date>.md
Промпт-спека: ${CONSILIUM_PROMPT_FILE}

Options:
  --save-as <slug>       Базовое имя файла (без даты).
  --gh-issue <N>         Контекст из GitHub Issue #N (gh CLI).
  --topic-file <path>    Доп. повестка / материалы из markdown.
  --min-replies <N>      Минимум реплик (по умолчанию ${MIN_REPLIES_DEFAULT}).
  --seed <N>             Воспроизводимый порядок ролей.
  --no-context           Не подгружать ARCHITECTURE / DESIGN / SERVICES.
  --no-rag               Не подмешивать RAG archive (по умолчанию useLongTerm).
  --no-save              Только stdout.
  --dry-run              Собрать промпт, не вызывать API.
  --help, -h             Справка.

Среда: ANTHROPIC_API_KEY, опционально ANTHROPIC_MODEL.
`);
}

function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const rest = [];
  let saveAs = '';
  let ghIssue = '';
  let topicFile = '';
  let seed;
  let minReplies = MIN_REPLIES_DEFAULT;
  let noContext = false;
  let noRag = false;
  let noSave = false;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--save-as') { saveAs = argv[++i] ?? ''; continue; }
    if (arg.startsWith('--save-as=')) { saveAs = arg.slice('--save-as='.length); continue; }
    if (arg === '--gh-issue') { ghIssue = argv[++i] ?? ''; continue; }
    if (arg.startsWith('--gh-issue=')) { ghIssue = arg.slice('--gh-issue='.length); continue; }
    if (arg === '--topic-file') { topicFile = argv[++i] ?? ''; continue; }
    if (arg.startsWith('--topic-file=')) { topicFile = arg.slice('--topic-file='.length); continue; }
    if (arg === '--seed') { seed = Number(argv[++i]); continue; }
    if (arg.startsWith('--seed=')) { seed = Number(arg.slice('--seed='.length)); continue; }
    if (arg === '--min-replies') { minReplies = Number(argv[++i]); continue; }
    if (arg.startsWith('--min-replies=')) { minReplies = Number(arg.slice('--min-replies='.length)); continue; }
    if (arg === '--no-context') { noContext = true; continue; }
    if (arg === '--no-rag') { noRag = true; continue; }
    if (arg === '--no-save') { noSave = true; continue; }
    if (arg === '--dry-run') { dryRun = true; continue; }
    rest.push(arg);
  }

  const question = rest.join(' ').trim();
  if (!question) {
    console.error('Не задан вопрос. Пример: yarn consilium "нужен ли пакет X?"');
    process.exit(1);
  }
  if (!Number.isFinite(minReplies) || minReplies < 5) {
    console.error('--min-replies должно быть числом ≥ 5.');
    process.exit(1);
  }
  if (seed !== undefined && !Number.isFinite(seed)) {
    console.error('--seed должно быть числом.');
    process.exit(1);
  }

  return { question, saveAs, ghIssue, topicFile, seed, minReplies, noContext, noRag, noSave, dryRun };
}

function readBounded(absPath, maxChars, optional = false) {
  if (!existsSync(absPath)) {
    if (optional) return null;
    console.error(`Файл не найден: ${absPath}`);
    process.exit(1);
  }
  let text = readFileSync(absPath, 'utf8');
  if (text.length > maxChars) {
    text = text.slice(0, maxChars) + `\n\n[… обрезано до ${maxChars} символов …]\n`;
  }
  return text;
}

function detectRepoSlug() {
  const res = spawnSync('git', ['config', '--get', 'remote.origin.url'], { encoding: 'utf8' });
  if (res.status !== 0) return null;
  const url = (res.stdout || '').trim();
  let m = url.match(/git@github\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/);
  if (!m) m = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

function fetchGhIssue(num) {
  const slug = detectRepoSlug();
  if (!slug) {
    console.error('Не удалось определить slug репо. Запусти из корня Membrana.');
    process.exit(1);
  }
  const res = spawnSync(
    'gh',
    ['issue', 'view', String(num), '--repo', slug,
      '--json', 'number,title,body,url,labels,state'],
    { encoding: 'utf8' },
  );
  if (res.status !== 0) {
    console.error(`GitHub Issue #${num}:`, res.stderr || '');
    process.exit(1);
  }
  return JSON.parse(res.stdout);
}

function formatGhIssue(issue) {
  const lines = [
    `# GitHub Issue #${issue.number}: ${issue.title}`,
    `URL: ${issue.url}`,
    `State: ${issue.state}`,
    '',
    (issue.body || '').trim() || '(пусто)',
  ];
  let text = lines.join('\n');
  if (text.length > MAX_TICKET_CHARS) {
    text = text.slice(0, MAX_TICKET_CHARS) + `\n\n[… обрезано …]\n`;
  }
  return text;
}

function buildPrompt({ question, topicFile, ghIssueData, noContext, orderedRoles, minReplies, ragBlock }) {
  const cwd = process.cwd();
  const parts = [];

  const spec = readBounded(resolve(cwd, CONSILIUM_PROMPT_FILE), MAX_PROMPT_SPEC_CHARS);
  const virtualTeam = readBounded(resolve(cwd, 'docs/VIRTUAL_TEAM_PROMPT.md'), MAX_VIRTUAL_TEAM_CHARS, true);

  parts.push(
    '## Инструкция консилиума (docs/prompts/CONSILIUM_PROMPT.md)',
    '',
    spec,
    '',
  );

  if (virtualTeam) {
    parts.push('---', '## Координация ролей (выдержка VIRTUAL_TEAM_PROMPT.md)', '', virtualTeam, '');
  }

  parts.push(
    '---',
    '## Порядок ролей на этот сеанс',
    '',
    `Чередуй реплики в этом порядке (циклически, ≥${minReplies} реплик всего):`,
    '',
    formatRoleOrderLine(orderedRoles),
    '',
    'Метки в протоколе:',
    orderedRoles.map((r) => `${r.tag} — ${r.label}`).join('\n'),
    '',
  );

  parts.push('---', '## Системные промпты ролей (сжато)', '');
  for (const role of CONSILIUM_ROLES) {
    const file = PERSONA_FILES[role.key];
    const text = readBounded(resolve(cwd, file), MAX_PERSONA_CHARS, true);
    if (text) {
      parts.push(`### ${role.label} (${file})`, '', text, '');
    }
  }

  if (!noContext) {
    parts.push('---', '## Контекст репозитория', '');
    for (const { path, title } of CONTEXT_FILES) {
      const text = readBounded(resolve(cwd, path), MAX_CONTEXT_CHARS, true);
      if (text) parts.push(`### ${title} (${path})`, '', text, '');
    }
  }

  if (ragBlock) {
    parts.push('---', '## RAG archive context (useLongTerm)', '', ragBlock, '');
  }

  if (ghIssueData) {
    parts.push('---', '## GitHub Issue', '', formatGhIssue(ghIssueData), '');
  }

  if (topicFile) {
    const text = readBounded(resolve(cwd, topicFile), MAX_TOPIC_CHARS);
    parts.push('---', `## Повестка (${topicFile})`, '', text, '');
  }

  parts.push(
    '---',
    '## Вопрос на консилиум',
    '',
    question,
    '',
    '---',
    'Сгенерируй полный протокол по формату из инструкции. Только протокол, без преамбулы «как модель я…».',
  );

  let assembled = parts.join('\n');
  if (assembled.length > MAX_ASSEMBLED_CHARS) {
    assembled =
      assembled.slice(0, MAX_ASSEMBLED_CHARS) +
      `\n\n[… общий промпт обрезан до ${MAX_ASSEMBLED_CHARS} символов …]\n`;
  }
  return assembled;
}

function wrapSeanseFile({ body, question, orderedRoles, model, ghIssue, topicFile, relPath }) {
  const stamp = new Date().toISOString();
  const meta = [
    '# Метаданные сеанса',
    '',
    '| Поле | Значение |',
    '|------|----------|',
    `| Дата (UTC) | ${stamp} |`,
    `| Команда | \`yarn consilium\` |`,
    `| Модель | ${model} |`,
    `| Файл | \`${relPath}\` |`,
    `| Порядок ролей | ${formatRoleOrderLine(orderedRoles)} |`,
  ];
  if (ghIssue) meta.push(`| GitHub Issue | #${ghIssue} |`);
  if (topicFile) meta.push(`| Повестка | \`${topicFile}\` |`);
  meta.push(
    '',
    '**Вопрос:**',
    '',
    question,
    '',
    '---',
    '',
    body.trim(),
    '',
  );
  return meta.join('\n');
}

async function main() {
  loadDotEnv();
  const cli = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();

  const orderedRoles = shuffleRoles(CONSILIUM_ROLES, cli.seed);
  if (process.stderr.isTTY) {
    console.error(`→ порядок ролей: ${formatRoleOrderLine(orderedRoles)}`);
  }

  let ghIssueData = null;
  if (cli.ghIssue) {
    if (process.stderr.isTTY) console.error(`→ GitHub Issue #${cli.ghIssue}…`);
    ghIssueData = fetchGhIssue(cli.ghIssue);
  }

  let ragBlock = '';
  if (!cli.noRag) {
    const rag = await retrieveRagContext(cli.question, { useLongTerm: true, topK: 8 });
    ragBlock = formatRagContextBlock(rag, {
      title: 'RAG archive (consilium)',
      maxChars: 12_000,
    });
    logRagStatus(rag, 'consilium');
  }

  const promptText = buildPrompt({
    ...cli,
    ghIssueData,
    orderedRoles,
    ragBlock,
  });

  const relPath = resolveSeansePath({
    cwd,
    saveAs: cli.saveAs,
    question: cli.question,
  });
  const absPath = resolve(cwd, relPath);
  const model = defaultModel();

  if (cli.dryRun) {
    console.error(`→ промпт: ${promptText.length} символов`);
    console.error(`→ сохранение: ${cli.noSave ? '(отключено)' : relPath}`);
    console.error(`→ модель: ${model}`);
    process.exit(0);
  }

  let key;
  try {
    key = getAnthropicKey();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  if (process.stderr.isTTY) {
    console.error(`→ консилиум · model: ${model}`);
  }

  const bodyJson = {
    model,
    max_tokens: 16_384,
    messages: [{ role: 'user', content: [{ type: 'text', text: promptText }] }],
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
    const json = JSON.parse(text);
    const parts = json?.content ?? [];
    answer = parts.filter((b) => b?.type === 'text').map((b) => b.text).join('\n');
    if (!answer) answer = JSON.stringify(parts, null, 2);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

  console.log(answer);

  if (!cli.noSave) {
    mkdirSync(resolve(cwd, 'docs/seanses'), { recursive: true });
    const fileBody = wrapSeanseFile({
      body: answer,
      question: cli.question,
      orderedRoles,
      model,
      ghIssue: cli.ghIssue,
      topicFile: cli.topicFile,
      relPath,
    });
    writeFileSync(absPath, fileBody, 'utf8');
    console.error(`→ протокол: ${relPath}`);
  }

  await new Promise((r) => setTimeout(r, 150));
}

main();
