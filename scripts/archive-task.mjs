/**
 * Архивирует задачу в docs/tasks/registry.json и создаёт карточку docs/tasks/archive/<id>.md
 *
 * Usage:
 *   yarn task:archive <task-id> [--notes "текст"] [--force]
 */
import {
  archiveCardPath,
  findTask,
  loadRegistry,
  saveRegistry,
  syncTasksReadme,
  validateTaskId,
  writeArchiveCard,
} from './lib/task-registry.mjs';
import { runLeadPersonaGate } from './trace-gate.mjs';

function printHelp() {
  console.log(`Usage: yarn task:archive <task-id> [--notes "…"] [--force]

  <task-id>   Поле id из docs/tasks/registry.json (kebab-case).
  --notes     Заметка в карточке архива (PR, итог).
  --force     Переархивировать, если уже archived.
  --dry-run   Показать, что будет сделано, и НЕ писать.
  --help      Эта справка.

Пример:
  yarn task:archive fft-indices-viz --notes "PR #45, plugin merged"`);
}

/**
 * Известные флаги. Неизвестный — ОТКАЗ, а не молчаливое игнорирование (TF-4, #554).
 *
 * Живой случай 16.07: `--dry-run` не поддерживался и просто отфильтровывался как
 * «что-то с двумя дефисами» → скрипт заархивировал задачу ПО-НАСТОЯЩЕМУ с заметкой
 * «test», пришлось перезархивировать через --force. Флаг, который молча делает
 * вместо того, чтобы показать, — деструктив под видом проверки.
 */
const KNOWN_FLAGS = new Set(['--help', '-h', '--force', '--notes', '--dry-run']);

export function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    return { help: true };
  }
  const positional = [];
  let notes = null;
  let force = false;
  let dryRun = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('-')) {
      if (!KNOWN_FLAGS.has(arg)) {
        throw new Error(
          `Неизвестный флаг: ${arg}. Известные: ${[...KNOWN_FLAGS].join(', ')}`,
        );
      }
      if (arg === '--force') force = true;
      else if (arg === '--dry-run') dryRun = true;
      else if (arg === '--notes') notes = args[++i] ?? null;
      continue;
    }
    positional.push(arg);
  }
  return { help: false, id: positional[0], notes, force, dryRun };
}

let opts;
try {
  opts = parseArgs(process.argv);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
if (opts.help) {
  printHelp();
  process.exit(opts.id === undefined && process.argv.length <= 3 ? 0 : 0);
}

if (!opts.id) {
  console.error('Укажите <task-id>. См. yarn task:archive --help');
  process.exit(1);
}

try {
  validateTaskId(opts.id);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const registry = loadRegistry();
const task = findTask(registry, opts.id);

if (!task) {
  console.error(`Задача не найдена в реестре: "${opts.id}"`);
  console.error('Добавь запись в docs/tasks/registry.json (status: active).');
  process.exit(1);
}

if (task.status === 'archived' && !opts.force) {
  console.error(`Задача "${opts.id}" уже в архиве (${task.archivedAt}). Используй --force.`);
  process.exit(1);
}

// Отказ-I «ответственный не назначен» (cowork-execution-registry, контракт §2/§6-б):
// архивировать карточку без leadPersona нельзя — жёсткий вердикт 22 сразу,
// exit = вердикт-коду. Гейт срабатывает и на --dry-run: отказ — вердикт, не запись.
const leadGate = runLeadPersonaGate([task]);
if (leadGate.code !== 0) {
  for (const failure of leadGate.failures) {
    console.error(`trace-gate: отказ-I [код ${failure.code}] — ${failure.reason}`);
  }
  console.error('Назначь leadPersona в docs/tasks/registry.json и повтори.');
  process.exit(leadGate.code);
}

const today = new Date().toISOString().slice(0, 10);
task.status = 'archived';
task.archivedAt = today;
if (opts.notes) {
  task.archiveNotes = opts.notes;
}
if (task.githubIssue != null && task.githubIssueClosedAt === undefined) {
  task.githubIssueClosedAt = null;
}

// TF-4 (#554): dry-run ПОКАЗЫВАЕТ и ничего не пишет. Раньше флага не было и он
// молча игнорировался — «проверка» архивировала по-настоящему.
if (opts.dryRun) {
  console.log(`dry-run: ${opts.id} был бы архивирован (${today})`);
  console.log('  status: active → archived');
  if (opts.notes) console.log('  archiveNotes:', opts.notes);
  console.log('\nНичего не записано. Убери --dry-run, чтобы применить.');
  process.exit(0);
}

saveRegistry(registry);
const cardPath = writeArchiveCard(task);
const readme = syncTasksReadme(registry);

console.log(`Архивировано: ${opts.id}`);
console.log('Карточка:', cardPath);
if (readme.written) console.log('Реестр:', readme.path);
else console.error(`⚠ README НЕ обновлён — ${readme.reason}`);
