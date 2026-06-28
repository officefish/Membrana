/**
 * Консилиум через experimental proxy (OpenRouter / FreeModel) — не прямой Anthropic.
 *
 * yarn opencode:consilium --save-as opencode-proxy-processes "вопрос"
 * yarn opencode:consilium --openrouter --sonnet-4 --topic-file docs/experiments/agenda.md "…"
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadLlmProxyDotEnv, executeLlmRequest, printLlmProxyHttpError } from '../_llm-proxy-env.mjs';
import { loadProviderRegistry, parseLlmProxyArgs } from './llm-proxy-parse.mjs';
import {
  buildConsiliumPrompt,
  wrapConsiliumSeanseFile,
} from '../lib/consilium-prompt.mjs';
import {
  CONSILIUM_ROLES,
  formatRoleOrderLine,
  resolveSeansePath,
  shuffleRoles,
} from '../lib/consilium-paths.mjs';
import {
  formatRagContextBlock,
  logRagStatus,
  retrieveRagContext,
} from '../lib/rag-ritual.mjs';

const MIN_REPLIES_DEFAULT = 20;
const MIN_REPLIES_COMPACT = 12;
const DEFAULT_FLAGS = ['--openrouter', '--haiku-4-5', '--max-tokens=4096'];

function printHelp() {
  console.log(`Usage: yarn opencode:consilium [proxy flags] [options] "<question>"

Консилиум пяти ролей через .env.llm-proxy (OpenRouter / FreeModel). НЕ использует ANTHROPIC_API_KEY.

Proxy flags (default: ${DEFAULT_FLAGS.join(' ')}):
  --openrouter | --freemodel-dev
  --haiku-4-5 | --sonnet-4 | --opus-4-7
  --max-tokens=N

Options:
  --save-as <slug>       Имя файла в docs/seanses/
  --topic-file <path>    Повестка markdown
  --min-replies <N>      По умолчанию ${MIN_REPLIES_DEFAULT}
  --seed <N>
  --no-context
  --no-rag
  --compact            Укороченный промпт (proxy / малый баланс OpenRouter)
  --no-save
  --dry-run
  --help
`);
}

function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const registry = loadProviderRegistry();
  const providerIds = new Set(Object.keys(registry.providers));
  const modelIds = new Set(Object.keys(registry.models));

  /** @type {string[]} */
  const proxyFlags = [];
  /** @type {string[]} */
  const rest = [];
  let saveAs = '';
  let topicFile = '';
  let seed;
  let minReplies = MIN_REPLIES_DEFAULT;
  let noContext = false;
  let noRag = false;
  let compact = false;
  let noSave = false;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--save-as') { saveAs = argv[++i] ?? ''; continue; }
    if (arg.startsWith('--save-as=')) { saveAs = arg.slice('--save-as='.length); continue; }
    if (arg === '--topic-file') { topicFile = argv[++i] ?? ''; continue; }
    if (arg.startsWith('--topic-file=')) { topicFile = arg.slice('--topic-file='.length); continue; }
    if (arg === '--seed') { seed = Number(argv[++i]); continue; }
    if (arg.startsWith('--seed=')) { seed = Number(arg.slice('--seed='.length)); continue; }
    if (arg === '--min-replies') { minReplies = Number(argv[++i]); continue; }
    if (arg.startsWith('--min-replies=')) { minReplies = Number(arg.slice('--min-replies='.length)); continue; }
    if (arg === '--no-context') { noContext = true; continue; }
    if (arg === '--no-rag') { noRag = true; continue; }
    if (arg === '--compact') { compact = true; continue; }
    if (arg === '--no-save') { noSave = true; continue; }
    if (arg === '--dry-run') { dryRun = true; continue; }

    if (arg.startsWith('--')) {
      const flag = arg.slice(2);
      if (providerIds.has(flag) || modelIds.has(flag) || arg.startsWith('--max-tokens=')) {
        proxyFlags.push(arg);
        continue;
      }
    }
    rest.push(arg);
  }

  const question = rest.join(' ').trim();
  if (!question) {
    console.error('Не задан вопрос.');
    process.exit(1);
  }

  const flags = proxyFlags.length ? proxyFlags : [...DEFAULT_FLAGS];

  return {
    question,
    saveAs,
    topicFile,
    seed,
    minReplies,
    noContext,
    noRag,
    compact,
    noSave,
    dryRun,
    proxyFlags: flags,
  };
}

async function main() {
  const cwd = process.cwd();
  loadLlmProxyDotEnv(cwd);

  if (!process.env.OPENROUTER_API_KEY?.trim() && !process.env.FREEMODEL_DEV_API_KEY?.trim()) {
    console.error('Нужен OPENROUTER_API_KEY или FREEMODEL_DEV_API_KEY в .env.llm-proxy');
    process.exit(1);
  }

  const cli = parseArgs(process.argv.slice(2));
  const registry = loadProviderRegistry();
  const orderedRoles = shuffleRoles(CONSILIUM_ROLES, cli.seed);

  if (process.stderr.isTTY) {
    console.error(`→ порядок ролей: ${formatRoleOrderLine(orderedRoles)}`);
  }

  let ragBlock = '';
  if (!cli.noRag) {
    const rag = await retrieveRagContext(cli.question, { useLongTerm: true, topK: 6 });
    ragBlock = formatRagContextBlock(rag, { title: 'RAG archive (opencode consilium)', maxChars: 8_000 });
    logRagStatus(rag, 'opencode-consilium');
  }

  const agendaPath = cli.topicFile || 'docs/experiments/opencode-consilium-agenda.md';
  const minReplies = cli.compact ? Math.min(cli.minReplies, MIN_REPLIES_COMPACT) : cli.minReplies;

  const promptText = buildConsiliumPrompt({
    cwd,
    question: cli.question,
    topicFile: existsSync(resolve(cwd, agendaPath)) ? agendaPath : cli.topicFile || undefined,
    noContext: cli.noContext || cli.compact,
    compact: cli.compact,
    orderedRoles,
    minReplies,
    ragBlock,
    extraBlocks: [
      {
        title: 'Ограничение сеанса',
        body:
          'Этот консилиум проводится в рамках эксперимента opencode proxy. ' +
          'В итоговой таблице явно пометь для каждого процесса канал: proxy | direct | local | запрет. ' +
          'Учти нестабильность FreeModel (502, 403 на cc.*) и рабочий OpenRouter.',
      },
    ],
  });

  const relPath = resolveSeansePath({
    cwd,
    saveAs: cli.saveAs || 'opencode-proxy-processes',
    question: cli.question,
  });

  let llmReq;
  try {
    llmReq = parseLlmProxyArgs([...cli.proxyFlags, promptText], registry);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  const modelLabel = `${llmReq.provider.id}/${llmReq.modelId}`;

  if (cli.dryRun) {
    console.error(`→ промпт: ${promptText.length} символов`);
    console.error(`→ модель: ${modelLabel}`);
    console.error(`→ сохранение: ${cli.noSave ? '(отключено)' : relPath}`);
    process.exit(0);
  }

  if (process.stderr.isTTY) {
    console.error(`→ opencode:consilium · ${llmReq.provider.label} · ${llmReq.modelId}`);
  }

  let answer = '';
  try {
    const { ok, status, text, extract } = await executeLlmRequest({
      ...llmReq,
      prompt: promptText,
      smoke: false,
    });
    if (!ok) {
      printLlmProxyHttpError(status, text);
      process.exit(1);
    }
    answer = extract(text);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

  console.log(answer);

  if (!cli.noSave) {
    mkdirSync(resolve(cwd, 'docs/seanses'), { recursive: true });
    const fileBody = wrapConsiliumSeanseFile({
      body: answer,
      question: cli.question,
      orderedRoles,
      model: modelLabel,
      channel: 'yarn opencode:consilium',
      topicFile: agendaPath,
      relPath,
    });
    writeFileSync(resolve(cwd, relPath), fileBody, 'utf8');
    console.error(`→ протокол: ${relPath}`);
  }

  await new Promise((r) => setTimeout(r, 150));
}

main();
